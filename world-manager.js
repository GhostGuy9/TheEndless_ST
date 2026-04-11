/**
 * World registry and lorebook reading for The Endless.
 *
 * World lore is injected via setExtensionPrompt (direct injection).
 * The old approach of toggling entry.disable via the API didn't work
 * because ST caches world info entries in memory and never re-reads
 * files at runtime.
 */

import { getSettings, saveSettings } from './state.js';

/**
 * Get ST's request headers for authenticated API calls.
 */
let _getRequestHeaders = null;

async function ensureRequestHeaders() {
    if (_getRequestHeaders) return;

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

// ─── Read World Lore ────────────────────────────────────────────────

const loreCache = new Map();

/**
 * Read ALL entries from a world lorebook for direct injection.
 * Ignores the disable flag — reads everything for setExtensionPrompt.
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
        if (!response.ok) {
            console.warn(`[TheEndless] GET API returned ${response.status} for "${bookName}"`);
            return null;
        }

        const data = await response.json();
        if (!data?.entries) {
            console.warn(`[TheEndless] No entries in "${bookName}"`);
            return null;
        }

        // Collect ALL entries by category — ignore the disable flag because
        // our old API toggle code set disable:true on disk but we're reading
        // for direct injection, not for ST's WI system
        const entries = Object.values(data.entries);
        const overviews = [], npcs = [], naming = [], locations = [], other = [];

        for (const entry of entries) {
            const comment = (entry.comment || '').toLowerCase();
            const content = entry.content || '';
            if (!content.trim()) continue;

            if (comment.includes('[overview]') || comment.includes('[meta]')) overviews.push(content);
            else if (comment.includes('[character]')) npcs.push(content);
            else if (comment.includes('naming')) naming.push(content);
            else if (comment.includes('[location]')) locations.push(content);
            else other.push(content);
        }

        // Build output within token budget — prioritize overview > naming > NPCs > locations > other
        const parts = [];
        let chars = 0;
        const limit = 3000; // ~750 tokens

        for (const t of overviews) { if (chars + t.length > limit) break; parts.push(t); chars += t.length; }
        for (const t of naming) { if (chars + t.length > limit) break; parts.push(t); chars += t.length; }
        let nc = 0;
        for (const t of npcs) { if (nc >= 3 || chars + t.length > limit) break; parts.push(t); chars += t.length; nc++; }
        for (const t of locations) { if (chars + t.length > limit) break; parts.push(t); chars += t.length; }
        for (const t of other) { if (chars + t.length > limit) break; parts.push(t); chars += t.length; }

        const result = parts.length > 0 ? parts.join('\n\n') : null;
        if (result) {
            loreCache.set(bookName, result);
            console.log(`[TheEndless] Read ${parts.length} entries from "${bookName}" (~${chars} chars)`);
        }
        return result;
    } catch (e) {
        console.error(`[TheEndless] Error reading "${bookName}":`, e);
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
    readWorldLore, clearLoreCache,
};
