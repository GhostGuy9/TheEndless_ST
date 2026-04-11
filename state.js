/**
 * State management for The Endless extension.
 * Handles persistent settings, per-chat state, and session-level ephemeral state.
 */

const EXTENSION_NAME = 'theEndless';

// Default worlds shipped with the extension
const DEFAULT_WORLDS = [
    { id: 'manifold',          name: 'The Manifold',         bookName: 'The Manifold',               note: 'The living hub world between all doors' },
    { id: 'night-city',        name: 'Night City',          bookName: 'Night City', note: 'Cyberpunk dystopia' },
    { id: 'stardust-valley',   name: 'Stardust Valley',     bookName: 'Stardust Valley',            note: 'Cozy supernatural valley' },
    { id: 'ashlands',          name: 'The Ashlands',         bookName: 'The Ashlands',               note: 'Dark Souls-adjacent dying kingdom' },
    { id: 'pale-fog',          name: 'Pale Fog',             bookName: 'Pale Fog',                   note: 'Silent Hill-adjacent horror' },
    { id: 'fallout-wastes',    name: 'The Fallout Wastes',   bookName: 'The Fallout Wastes',         note: 'Post-apocalyptic wasteland' },
    { id: 'evergreen-vale',    name: 'Evergreen Vale',       bookName: 'Evergreen Vale',             note: 'Ghibli-esque cozy village' },
    { id: 'endless-library',   name: 'The Endless Library',  bookName: 'The Endless Library',        note: 'Liminal infinite library' },
    { id: 'ironwater-station', name: 'Ironwater Station',    bookName: 'Ironwater Station',          note: 'Abandoned deep space station' },
    { id: 'frontier',          name: 'The Frontier',         bookName: 'The Frontier',               note: 'Wild west' },
    { id: 'dunwater-coast',    name: 'Dunwater Coast',       bookName: 'Dunwater Coast',             note: 'Pirate island chains' },
    { id: 'aldenmoor',         name: 'Aldenmoor',            bookName: 'Aldenmoor',                  note: 'High fantasy continent' },
    { id: 'red-planet',        name: 'The Red Planet',       bookName: 'The Red Planet',             note: 'Glimpse World — rust terrain, white buildings' },
    { id: 'white-forest',      name: 'The White Forest',     bookName: 'The White Forest',           note: 'Glimpse World — identical pale trees, silence' },
    { id: 'lighthouse-world',  name: 'The Lighthouse World', bookName: 'The Lighthouse World',       note: 'Glimpse World — endless ocean, one lighthouse' },
    { id: 'stopped-city',      name: 'The Stopped City',     bookName: 'The Stopped City',           note: 'Glimpse World — frozen mid-morning, no people' },
    { id: 'slow-thing',        name: 'The Slow Thing',       bookName: 'The Slow Thing',             note: 'Glimpse World — black sand, something on the horizon' },
];

const DEFAULT_SETTINGS = {
    enabled: true,
    currentWorldId: null,
    previousWorldId: null,
    visitHistory: [],
    preventRepeatWorld: true,
    showTransitionNotification: true,
    injectionDepth: 4,
    worlds: structuredClone(DEFAULT_WORLDS),
};

// Session state — not persisted, lives only in memory
const sessionState = {
    pendingTransition: null,
    lastDoorDetection: 0,
    isProcessing: false,
};

/**
 * Initialize settings with defaults if not already set.
 */
function initSettings() {
    const context = SillyTavern.getContext();
    if (!context.extensionSettings[EXTENSION_NAME]) {
        context.extensionSettings[EXTENSION_NAME] = structuredClone(DEFAULT_SETTINGS);
    }
    const settings = context.extensionSettings[EXTENSION_NAME];

    // Merge any missing keys from defaults (for upgrades)
    for (const [key, value] of Object.entries(DEFAULT_SETTINGS)) {
        if (!(key in settings)) {
            settings[key] = structuredClone(value);
        }
    }

    // Migrate from old worldBookNames format to new worlds array
    if (settings.worldBookNames && !settings.worlds) {
        settings.worlds = structuredClone(DEFAULT_WORLDS);
        delete settings.worldBookNames;
    }

    // Ensure worlds array exists
    if (!Array.isArray(settings.worlds)) {
        settings.worlds = structuredClone(DEFAULT_WORLDS);
    }

    // Fix known book name mismatches from earlier versions
    const bookNameFixes = {
        'Night City - Cyberpunk Red': 'Night City',
    };
    for (const world of settings.worlds) {
        if (world.bookName in bookNameFixes) {
            console.log(`[TheEndless] Fixed book name: "${world.bookName}" → "${bookNameFixes[world.bookName]}"`);
            world.bookName = bookNameFixes[world.bookName];
        }
    }

    context.saveSettingsDebounced();
}

/**
 * Get the current extension settings.
 */
function getSettings() {
    const context = SillyTavern.getContext();
    return context.extensionSettings[EXTENSION_NAME];
}

/**
 * Save settings to persistent storage.
 */
function saveSettings() {
    const context = SillyTavern.getContext();
    context.saveSettingsDebounced();
}

/**
 * Save the current world state to chat metadata (per-chat persistence).
 */
function saveChatWorldState(worldId) {
    const context = SillyTavern.getContext();
    if (!context.chatMetadata) return;
    context.chatMetadata.theEndless_currentWorld = worldId;
    context.saveMetadata();
}

/**
 * Restore world state from chat metadata.
 */
function getChatWorldState() {
    const context = SillyTavern.getContext();
    if (!context.chatMetadata) return null;
    return context.chatMetadata.theEndless_currentWorld ?? null;
}

/**
 * Get the session state (ephemeral, in-memory).
 */
function getSessionState() {
    return sessionState;
}

export {
    EXTENSION_NAME,
    DEFAULT_SETTINGS,
    DEFAULT_WORLDS,
    initSettings,
    getSettings,
    saveSettings,
    saveChatWorldState,
    getChatWorldState,
    getSessionState,
};
