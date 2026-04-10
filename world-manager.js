/**
 * World registry, random selection, and lorebook activation/deactivation.
 * Registry is dynamic — stored in settings, not hardcoded.
 */

import { getSettings, saveSettings } from './state.js';

/**
 * Get all worlds from the dynamic registry.
 * Returns an array of { id, name, bookName, note }.
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
 * Find a world ID by partial name match (for slash commands).
 */
function findWorldIdByName(searchName) {
    const lower = searchName.toLowerCase();
    const worlds = getWorlds();

    // Exact match first
    for (const world of worlds) {
        if (world.name.toLowerCase() === lower || world.id === lower) {
            return world.id;
        }
    }
    // Partial match
    for (const world of worlds) {
        if (world.name.toLowerCase().includes(lower) || world.id.includes(lower)) {
            return world.id;
        }
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
    const index = Math.floor(Math.random() * available.length);
    return available[index].id;
}

/**
 * Generate a URL-safe ID from a book name.
 */
function generateWorldId(bookName) {
    return bookName
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '');
}

/**
 * Add a new world to the registry.
 * Returns the new world object, or null if it already exists.
 */
function addWorld(bookName, note = '') {
    const settings = getSettings();
    const id = generateWorldId(bookName);

    // Check for duplicate
    if (settings.worlds.some(w => w.id === id || w.bookName === bookName)) {
        return null;
    }

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
    console.log(`[TheEndless] Removed world: ${removed.name} (${worldId})`);
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
 * Get a list of all World Info book names currently loaded in ST.
 * Reads from ST's World Info select elements in the DOM and falls back to API.
 */
function getAvailableWorldInfoBooks() {
    const names = new Set();

    // Method 1: Read from ST's World Info select dropdown in the DOM
    // ST uses #world_info select for the main world info list
    $('#world_info option, #world_editor_select option, [id*="world_info"] option').each(function () {
        const val = $(this).val();
        if (val && val !== '' && val !== 'None' && val !== 'none') {
            names.add(val);
        }
    });

    // Method 2: Try context properties (varies by ST version)
    const context = SillyTavern.getContext();
    for (const prop of ['world_names', 'worldNames']) {
        if (Array.isArray(context[prop])) {
            context[prop].forEach(n => { if (n) names.add(n); });
        }
    }

    // Method 3: Read from any visible World Info book list elements
    $('.world_entry .world_name, .world_info_entry_name').each(function () {
        const text = $(this).text().trim();
        if (text) names.add(text);
    });

    const result = [...names].sort();
    if (result.length === 0) {
        console.warn('[TheEndless] Could not find any World Info books. DOM and context both empty.');
    } else {
        console.log(`[TheEndless] Found ${result.length} World Info books`);
    }
    return result;
}

/**
 * Get all available World Info books (shows everything, including already registered).
 * Returns objects with { name, registered } for UI display.
 */
function getAllBooksWithStatus() {
    const registered = new Set(getWorlds().map(w => w.bookName));
    const allBooks = getAvailableWorldInfoBooks();
    return allBooks.map(name => ({
        name,
        registered: registered.has(name),
    }));
}

/**
 * Get World Info books that are not yet in the registry.
 */
function getUnregisteredBooks() {
    const registered = new Set(getWorlds().map(w => w.bookName));
    return getAvailableWorldInfoBooks().filter(name => !registered.has(name));
}

/**
 * Toggle all entries in a world lorebook to enabled or disabled.
 */
async function toggleWorldBook(bookName, disable) {
    try {
        const response = await fetch('/api/worldinfo/get', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name: bookName }),
        });
        if (!response.ok) {
            console.warn(`[TheEndless] Could not load world book "${bookName}": ${response.status}`);
            return;
        }
        const data = await response.json();
        if (!data?.entries) return;

        let changed = false;
        for (const entry of Object.values(data.entries)) {
            if (entry.disable !== disable) {
                entry.disable = disable;
                changed = true;
            }
        }

        if (changed) {
            await fetch('/api/worldinfo/edit', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name: bookName, data }),
            });
            console.log(`[TheEndless] ${disable ? 'Disabled' : 'Enabled'} world book: ${bookName}`);
        }
    } catch (e) {
        console.warn(`[TheEndless] Error toggling world book "${bookName}":`, e);
    }
}

/**
 * Activate a specific world's lorebook, deactivating all others.
 * Pass null to deactivate all (return to Manifold).
 */
async function activateWorld(worldId) {
    const worlds = getWorlds();

    // Deactivate ALL registered world lorebooks
    const deactivatePromises = worlds.map(w =>
        w.bookName ? toggleWorldBook(w.bookName, true) : Promise.resolve(),
    );
    await Promise.all(deactivatePromises);

    // Activate the selected world's lorebook
    if (worldId) {
        const bookName = getBookName(worldId);
        if (bookName) {
            await toggleWorldBook(bookName, false);
        }
    }
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
    activateWorld,
};
