/**
 * World registry, random selection, and lorebook activation/deactivation.
 */

import { getSettings } from './state.js';

const WORLD_REGISTRY = {
    'night-city':        { name: 'Night City',          defaultBook: 'Night City - Cyberpunk Red' },
    'stardust-valley':   { name: 'Stardust Valley',     defaultBook: 'Stardust Valley' },
    'ashlands':          { name: 'The Ashlands',         defaultBook: 'The Ashlands' },
    'pale-fog':          { name: 'Pale Fog',             defaultBook: 'Pale Fog' },
    'fallout-wastes':    { name: 'The Fallout Wastes',   defaultBook: 'The Fallout Wastes' },
    'evergreen-vale':    { name: 'Evergreen Vale',       defaultBook: 'Evergreen Vale' },
    'endless-library':   { name: 'The Endless Library',  defaultBook: 'The Endless Library' },
    'ironwater-station': { name: 'Ironwater Station',    defaultBook: 'Ironwater Station' },
    'frontier':          { name: 'The Frontier',         defaultBook: 'The Frontier' },
    'dunwater-coast':    { name: 'Dunwater Coast',       defaultBook: 'Dunwater Coast' },
    'aldenmoor':         { name: 'Aldenmoor',            defaultBook: 'Aldenmoor' },
};

/**
 * Get the world registry.
 */
function getWorldRegistry() {
    return WORLD_REGISTRY;
}

/**
 * Get the display name for a world ID, or 'The Manifold' for null.
 */
function getWorldName(worldId) {
    if (!worldId) return 'The Manifold';
    return WORLD_REGISTRY[worldId]?.name ?? 'Unknown World';
}

/**
 * Get the lorebook book name for a world ID, using user-configured overrides.
 */
function getBookName(worldId) {
    const settings = getSettings();
    return settings.worldBookNames?.[worldId] ?? WORLD_REGISTRY[worldId]?.defaultBook ?? null;
}

/**
 * Find a world ID by partial name match (for slash commands).
 */
function findWorldIdByName(searchName) {
    const lower = searchName.toLowerCase();
    for (const [id, world] of Object.entries(WORLD_REGISTRY)) {
        if (world.name.toLowerCase() === lower || id === lower) {
            return id;
        }
    }
    // Partial match
    for (const [id, world] of Object.entries(WORLD_REGISTRY)) {
        if (world.name.toLowerCase().includes(lower) || id.includes(lower)) {
            return id;
        }
    }
    return null;
}

/**
 * Select a random world, optionally excluding one.
 */
function selectRandomWorld(excludeWorldId = null) {
    const available = Object.keys(WORLD_REGISTRY).filter(id => id !== excludeWorldId);
    if (available.length === 0) return Object.keys(WORLD_REGISTRY)[0];
    const index = Math.floor(Math.random() * available.length);
    return available[index];
}

/**
 * Toggle all entries in a world lorebook to enabled or disabled.
 */
async function toggleWorldBook(bookName, disable) {
    const context = SillyTavern.getContext();
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
    // Deactivate ALL world lorebooks
    const deactivatePromises = Object.keys(WORLD_REGISTRY).map(id => {
        const bookName = getBookName(id);
        return bookName ? toggleWorldBook(bookName, true) : Promise.resolve();
    });
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
    WORLD_REGISTRY,
    getWorldRegistry,
    getWorldName,
    getBookName,
    findWorldIdByName,
    selectRandomWorld,
    activateWorld,
};
