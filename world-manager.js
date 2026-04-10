/**
 * World registry, random selection, and world lore injection.
 *
 * Instead of toggling World Info entries (which doesn't reliably work),
 * this module reads world lorebook content and provides it for direct
 * injection via setExtensionPrompt.
 */

import { getSettings, saveSettings } from './state.js';

/**
 * Get all worlds from the dynamic registry.
 */
function getWorlds() {
    const settings = getSettings();
    return settings.worlds || [];
}

/**
 * Get a world by its ID.
 */
function getWorld(worldId) {
    return getWorlds().find(w => w.id === worldId) ?? null;
}

/**
 * Get the display name for a world ID, or 'The Manifold' for null.
 */
function getWorldName(worldId) {
    if (!worldId) return 'The Manifold';
    return getWorld(worldId)?.name ?? 'Unknown World';
}

/**
 * Get the lorebook book name for a world ID.
 */
function getBookName(worldId) {
    return getWorld(worldId)?.bookName ?? null;
}

/**
 * Find a world ID by partial name match.
 */
function findWorldIdByName(searchName) {
    const lower = searchName.toLowerCase();
    const worlds = getWorlds();
    for (const world of worlds) {
        if (world.name.toLowerCase() === lower || world.id === lower) return world.id;
    }
    for (const world of worlds) {
        if (world.name.toLowerCase().includes(lower) || world.id.includes(lower)) return world.id;
    }
    return null;
}

/**
 * Select a random world, optionally excluding one.
 */
function selectRandomWorld(excludeWorldId = null) {
    const worlds = getWorlds();
    const available = worlds.filter(w => w.id !== excludeWorldId);
    if (available.length === 0) return worlds[0]?.id ?? null;
    return available[Math.floor(Math.random() * available.length)].id;
}

/**
 * Generate a URL-safe ID from a book name.
 */
function generateWorldId(bookName) {
    return bookName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

/**
 * Add a new world to the registry.
 */
function addWorld(bookName, note = '') {
    const settings = getSettings();
    const id = generateWorldId(bookName);
    if (settings.worlds.some(w => w.id === id || w.bookName === bookName)) return null;
    const world = { id, name: bookName, bookName, note };
    settings.worlds.push(world);
    saveSettings();
    console.log(`[TheEndless] Added world: ${bookName} (${id})`);
    return world;
}

/**
 * Remove a world from the registry by ID.
 */
function removeWorld(worldId) {
    const settings = getSettings();
    const index = settings.worlds.findIndex(w => w.id === worldId);
    if (index === -1) return false;
    const removed = settings.worlds.splice(index, 1)[0];
    saveSettings();
    console.log(`[TheEndless] Removed world: ${removed.name}`);
    return true;
}

/**
 * Update a world's note.
 */
function updateWorldNote(worldId, note) {
    const world = getWorld(worldId);
    if (!world) return false;
    world.note = note;
    saveSettings();
    return true;
}

/**
 * Get available World Info books from ST's DOM.
 */
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

/**
 * Get all available books with registration status.
 */
function getAllBooksWithStatus() {
    const registered = new Set(getWorlds().map(w => w.bookName));
    return getAvailableWorldInfoBooks().map(name => ({ name, registered: registered.has(name) }));
}

/**
 * Get unregistered books.
 */
function getUnregisteredBooks() {
    const registered = new Set(getWorlds().map(w => w.bookName));
    return getAvailableWorldInfoBooks().filter(name => !registered.has(name));
}

/**
 * Read a world lorebook and extract its content for direct injection.
 * Returns a formatted string of the world's key lore entries, or null on failure.
 * Prioritizes: overview, NPC, naming, and location entries. Caps at ~2000 chars to stay lean.
 */
async function readWorldLore(bookName) {
    try {
        const response = await fetch('/api/worldinfo/get', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name: bookName }),
        });
        if (!response.ok) {
            console.warn(`[TheEndless] Could not read world book "${bookName}": ${response.status}`);
            return null;
        }
        const data = await response.json();
        if (!data?.entries) {
            console.warn(`[TheEndless] World book "${bookName}" has no entries`);
            return null;
        }

        const entries = Object.values(data.entries);
        const total = entries.length;

        // Categorize entries by their comment prefix
        const overviews = [];
        const npcs = [];
        const naming = [];
        const locations = [];
        const other = [];

        for (const entry of entries) {
            const comment = (entry.comment || '').toLowerCase();
            const content = entry.content || '';
            if (!content.trim()) continue;

            if (comment.includes('[overview]') || comment.includes('[meta]')) {
                overviews.push(content);
            } else if (comment.includes('[character]')) {
                npcs.push(content);
            } else if (comment.includes('naming')) {
                naming.push(content);
            } else if (comment.includes('[location]')) {
                locations.push(content);
            } else {
                other.push(content);
            }
        }

        // Build injection: overviews first, then naming, then a few key NPCs, then locations
        const parts = [];
        let charCount = 0;
        const charLimit = 2500;

        // Always include overviews
        for (const text of overviews) {
            if (charCount + text.length > charLimit) break;
            parts.push(text);
            charCount += text.length;
        }

        // Include naming convention
        for (const text of naming) {
            if (charCount + text.length > charLimit) break;
            parts.push(text);
            charCount += text.length;
        }

        // Include NPCs (up to 3)
        let npcCount = 0;
        for (const text of npcs) {
            if (npcCount >= 3 || charCount + text.length > charLimit) break;
            parts.push(text);
            charCount += text.length;
            npcCount++;
        }

        // Fill remaining budget with locations
        for (const text of locations) {
            if (charCount + text.length > charLimit) break;
            parts.push(text);
            charCount += text.length;
        }

        if (parts.length === 0) {
            console.warn(`[TheEndless] No usable content in "${bookName}"`);
            return null;
        }

        console.log(`[TheEndless] Read ${parts.length}/${total} entries from "${bookName}" (${charCount} chars)`);
        return parts.join('\n\n');
    } catch (e) {
        console.warn(`[TheEndless] Error reading world book "${bookName}":`, e);
        return null;
    }
}

// Cache for world lore to avoid re-reading on every generation
const loreCache = new Map();

/**
 * Get world lore content, using cache if available.
 */
async function getWorldLore(worldId) {
    if (!worldId) return null;
    const bookName = getBookName(worldId);
    if (!bookName) return null;

    if (loreCache.has(bookName)) {
        return loreCache.get(bookName);
    }

    const lore = await readWorldLore(bookName);
    if (lore) {
        loreCache.set(bookName, lore);
    }
    return lore;
}

/**
 * Clear the lore cache (call when worlds are added/removed).
 */
function clearLoreCache() {
    loreCache.clear();
}

export {
    getWorlds,
    getWorld,
    getWorldName,
    getBookName,
    findWorldIdByName,
    selectRandomWorld,
    generateWorldId,
    addWorld,
    removeWorld,
    updateWorldNote,
    getAvailableWorldInfoBooks,
    getAllBooksWithStatus,
    getUnregisteredBooks,
    getWorldLore,
    clearLoreCache,
};
