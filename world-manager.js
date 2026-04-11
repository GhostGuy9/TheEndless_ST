/**
 * World registry, selection, and lorebook attachment.
 *
 * Two strategies for world lore activation:
 * 1. Primary: Attach world lorebook to chat via chat_metadata (native ST)
 * 2. Fallback: Read lorebook and inject via setExtensionPrompt
 */

import { getSettings, saveSettings } from './state.js';

/**
 * Get ST's request headers for authenticated API calls.
 * Tries multiple import paths since the depth varies by ST install.
 */
let _getRequestHeaders = null;

async function ensureRequestHeaders() {
    if (_getRequestHeaders) return;

    // Try importing from various relative paths
    const paths = [
        '../../../../script.js',
        '../../../../../script.js',
        '../../../../../../script.js',
        '../../../script.js',
    ];

    for (const path of paths) {
        try {
            const mod = await import(path);
            if (typeof mod.getRequestHeaders === 'function') {
                _getRequestHeaders = mod.getRequestHeaders;
                console.log(`[TheEndless] Found getRequestHeaders at ${path}`);
                return;
            }
        } catch (e) {
            // Try next path
        }
    }

    // Fallback: check global scope
    if (typeof globalThis.getRequestHeaders === 'function') {
        _getRequestHeaders = globalThis.getRequestHeaders;
        console.log('[TheEndless] Found getRequestHeaders on globalThis');
        return;
    }

    console.error('[TheEndless] Could not find getRequestHeaders — API calls will fail');
    _getRequestHeaders = () => ({ 'Content-Type': 'application/json' });
}

function getHeaders() {
    if (!_getRequestHeaders) {
        console.warn('[TheEndless] getRequestHeaders not loaded yet, using fallback');
        return { 'Content-Type': 'application/json' };
    }
    return _getRequestHeaders();
}

// ─── World Registry ─────────────────────────────────────────────────

function getWorlds() {
    return getSettings().worlds || [];
}

function getWorld(worldId) {
    return getWorlds().find(w => w.id === worldId) ?? null;
}

function getWorldName(worldId) {
    if (!worldId) return 'The Manifold';
    return getWorld(worldId)?.name ?? 'Unknown World';
}

function getBookName(worldId) {
    return getWorld(worldId)?.bookName ?? null;
}

function findWorldIdByName(searchName) {
    const lower = searchName.toLowerCase();
    const worlds = getWorlds();
    for (const w of worlds) {
        if (w.name.toLowerCase() === lower || w.id === lower) return w.id;
    }
    for (const w of worlds) {
        if (w.name.toLowerCase().includes(lower) || w.id.includes(lower)) return w.id;
    }
    return null;
}

function selectRandomWorld(excludeWorldId = null) {
    const worlds = getWorlds();
    const available = worlds.filter(w => w.id !== excludeWorldId);
    if (available.length === 0) return worlds[0]?.id ?? null;
    return available[Math.floor(Math.random() * available.length)].id;
}

function generateWorldId(bookName) {
    return bookName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

function addWorld(bookName, note = '') {
    const settings = getSettings();
    const id = generateWorldId(bookName);
    if (settings.worlds.some(w => w.id === id || w.bookName === bookName)) return null;
    const world = { id, name: bookName, bookName, note };
    settings.worlds.push(world);
    saveSettings();
    return world;
}

function removeWorld(worldId) {
    const settings = getSettings();
    const idx = settings.worlds.findIndex(w => w.id === worldId);
    if (idx === -1) return false;
    settings.worlds.splice(idx, 1);
    saveSettings();
    return true;
}

function updateWorldNote(worldId, note) {
    const world = getWorld(worldId);
    if (!world) return false;
    world.note = note;
    saveSettings();
    return true;
}

// ─── Available Books (DOM-based) ────────────────────────────────────

function getAvailableWorldInfoBooks() {
    const names = new Set();
    $('#world_info option, #world_editor_select option').each(function () {
        const text = $(this).text().trim();
        if (text && text !== '' && text !== 'None' && text !== 'none' && text !== '--- None ---') {
            names.add(text);
        }
    });
    return [...names].sort();
}

function getAllBooksWithStatus() {
    const registered = new Set(getWorlds().map(w => w.bookName));
    return getAvailableWorldInfoBooks().map(name => ({ name, registered: registered.has(name) }));
}

function getUnregisteredBooks() {
    const registered = new Set(getWorlds().map(w => w.bookName));
    return getAvailableWorldInfoBooks().filter(name => !registered.has(name));
}

// ─── Chat Lorebook Attachment ───────────────────────────────────────

/**
 * Attach a world lorebook to the current chat via chat_metadata.
 * Tries multiple known field names for compatibility.
 */
async function attachWorldToChat(bookName) {
    const context = SillyTavern.getContext();
    if (!context.chatMetadata) {
        console.warn('[TheEndless] No chat metadata available');
        return false;
    }

    // ST uses 'world_info' in chat metadata for chat-attached lorebooks
    // Try setting it as the selected world info for this chat
    // The field may be a string (single book) or array (multiple books)
    const meta = context.chatMetadata;

    // Ensure we have an array of extra books
    if (!Array.isArray(meta.world_info_extra_books)) {
        meta.world_info_extra_books = [];
    }

    // Remove any previously attached world lorebooks (from our registry)
    const registeredBooks = new Set(getWorlds().map(w => w.bookName));
    meta.world_info_extra_books = meta.world_info_extra_books.filter(
        name => !registeredBooks.has(name),
    );

    // Attach the new world's lorebook
    if (bookName && !meta.world_info_extra_books.includes(bookName)) {
        meta.world_info_extra_books.push(bookName);
    }

    // Also try the 'world_info' field directly
    // Some ST versions use this for the primary chat-attached lorebook
    meta.world_info = bookName || '';

    // Persist and refresh
    context.saveMetadata();

    // Try to refresh ST's World Info state
    if (typeof context.updateWorldInfoList === 'function') {
        await context.updateWorldInfoList();
        console.log(`[TheEndless] Attached "${bookName}" to chat via metadata + updateWorldInfoList`);
    }
    if (typeof context.reloadWorldInfoEditor === 'function') {
        await context.reloadWorldInfoEditor();
    }

    return true;
}

/**
 * Detach all world lorebooks from the current chat.
 */
async function detachAllWorldsFromChat() {
    const context = SillyTavern.getContext();
    if (!context.chatMetadata) return;

    const meta = context.chatMetadata;
    const registeredBooks = new Set(getWorlds().map(w => w.bookName));

    // Clean world_info_extra_books
    if (Array.isArray(meta.world_info_extra_books)) {
        meta.world_info_extra_books = meta.world_info_extra_books.filter(
            name => !registeredBooks.has(name),
        );
    }

    // Clear world_info if it's one of our worlds
    if (meta.world_info && registeredBooks.has(meta.world_info)) {
        meta.world_info = '';
    }

    context.saveMetadata();

    if (typeof context.updateWorldInfoList === 'function') {
        await context.updateWorldInfoList();
    }

    console.log('[TheEndless] Detached all world lorebooks from chat');
}

// ─── World Info Entry Toggle (now with proper auth) ─────────────────

/**
 * Toggle all entries in a world lorebook to enabled or disabled.
 */
async function toggleWorldBook(bookName, disable) {
    await ensureRequestHeaders();
    console.log(`[TheEndless] toggleWorldBook("${bookName}", disable=${disable})`);
    try {
        const response = await fetch('/api/worldinfo/get', {
            method: 'POST',
            headers: getHeaders(),
            body: JSON.stringify({ name: bookName }),
        });
        if (!response.ok) {
            console.warn(`[TheEndless] API returned ${response.status} for "${bookName}"`);
            return false;
        }
        const data = await response.json();
        if (!data?.entries) return false;

        let changed = 0;
        const total = Object.keys(data.entries).length;
        for (const entry of Object.values(data.entries)) {
            if (entry.disable !== disable) {
                entry.disable = disable;
                changed++;
            }
        }

        if (changed > 0) {
            await fetch('/api/worldinfo/edit', {
                method: 'POST',
                headers: getHeaders(),
                body: JSON.stringify({ name: bookName, data }),
            });
            console.log(`[TheEndless] ${disable ? 'Disabled' : 'Enabled'} ${changed}/${total} entries in "${bookName}"`);
        }
        return true;
    } catch (e) {
        console.warn(`[TheEndless] Error toggling "${bookName}":`, e);
        return false;
    }
}

/**
 * Activate a world's lorebook entries, disabling all others.
 * Pass null to disable all (return to Manifold).
 */
async function activateWorld(worldId) {
    const worlds = getWorlds();

    // Disable ALL world lorebooks
    await Promise.all(worlds.map(w =>
        w.bookName ? toggleWorldBook(w.bookName, true) : Promise.resolve(),
    ));

    // Enable the selected world
    if (worldId) {
        const bookName = getBookName(worldId);
        if (bookName) {
            const success = await toggleWorldBook(bookName, false);
            if (success) {
                console.log(`[TheEndless] Activated world: ${getWorldName(worldId)}`);
                return true;
            }
        }
    }
    return false;
}

/**
 * Enable all entries in ALL registered world lorebooks.
 * For testing and resetting.
 */
async function enableAllWorldBooks() {
    const worlds = getWorlds();
    console.log(`[TheEndless] Enabling all world lorebook entries (${worlds.length} worlds)...`);
    await Promise.all(worlds.map(w =>
        w.bookName ? toggleWorldBook(w.bookName, false) : Promise.resolve(),
    ));
    console.log('[TheEndless] All world lorebook entries enabled');
}

// ─── Fallback: Direct Lore Injection ────────────────────────────────

const loreCache = new Map();

/**
 * Read world lorebook content for direct injection fallback.
 */
async function readWorldLore(bookName) {
    await ensureRequestHeaders();
    if (loreCache.has(bookName)) return loreCache.get(bookName);

    try {
        const response = await fetch('/api/worldinfo/get', {
            method: 'POST',
            headers: getHeaders(),
            body: JSON.stringify({ name: bookName }),
        });
        if (!response.ok) return null;

        const data = await response.json();
        if (!data?.entries) return null;

        const entries = Object.values(data.entries);
        const overviews = [], npcs = [], naming = [], locations = [];

        for (const entry of entries) {
            const comment = (entry.comment || '').toLowerCase();
            const content = entry.content || '';
            if (!content.trim()) continue;
            if (comment.includes('[overview]') || comment.includes('[meta]')) overviews.push(content);
            else if (comment.includes('[character]')) npcs.push(content);
            else if (comment.includes('naming')) naming.push(content);
            else if (comment.includes('[location]')) locations.push(content);
        }

        const parts = [];
        let chars = 0;
        const limit = 2500;

        for (const t of overviews) { if (chars + t.length > limit) break; parts.push(t); chars += t.length; }
        for (const t of naming) { if (chars + t.length > limit) break; parts.push(t); chars += t.length; }
        let nc = 0;
        for (const t of npcs) { if (nc >= 3 || chars + t.length > limit) break; parts.push(t); chars += t.length; nc++; }
        for (const t of locations) { if (chars + t.length > limit) break; parts.push(t); chars += t.length; }

        const result = parts.length > 0 ? parts.join('\n\n') : null;
        if (result) loreCache.set(bookName, result);
        return result;
    } catch (e) {
        console.warn(`[TheEndless] Error reading "${bookName}":`, e);
        return null;
    }
}

function clearLoreCache() {
    loreCache.clear();
}

export {
    getWorlds, getWorld, getWorldName, getBookName,
    findWorldIdByName, selectRandomWorld,
    generateWorldId, addWorld, removeWorld, updateWorldNote,
    getAvailableWorldInfoBooks, getAllBooksWithStatus, getUnregisteredBooks,
    attachWorldToChat, detachAllWorldsFromChat,
    activateWorld, toggleWorldBook, enableAllWorldBooks,
    readWorldLore, clearLoreCache,
};
