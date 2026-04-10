/**
 * State management for The Endless extension.
 * Handles persistent settings, per-chat state, and session-level ephemeral state.
 */

const EXTENSION_NAME = 'theEndless';

const DEFAULT_SETTINGS = {
    enabled: true,
    currentWorldId: null,
    previousWorldId: null,
    visitHistory: [],
    preventRepeatWorld: true,
    showTransitionNotification: true,
    injectionDepth: 4,
    worldBookNames: {
        'night-city': 'Night City - Cyberpunk Red',
        'stardust-valley': 'Stardust Valley',
        'ashlands': 'The Ashlands',
        'pale-fog': 'Pale Fog',
        'fallout-wastes': 'The Fallout Wastes',
        'evergreen-vale': 'Evergreen Vale',
        'endless-library': 'The Endless Library',
        'ironwater-station': 'Ironwater Station',
        'frontier': 'The Frontier',
        'dunwater-coast': 'Dunwater Coast',
        'aldenmoor': 'Aldenmoor',
    },
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
    // Merge any missing keys from defaults (for upgrades)
    const settings = context.extensionSettings[EXTENSION_NAME];
    for (const [key, value] of Object.entries(DEFAULT_SETTINGS)) {
        if (!(key in settings)) {
            settings[key] = structuredClone(value);
        }
    }
    // Merge any missing book name mappings
    if (settings.worldBookNames) {
        for (const [key, value] of Object.entries(DEFAULT_SETTINGS.worldBookNames)) {
            if (!(key in settings.worldBookNames)) {
                settings.worldBookNames[key] = value;
            }
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
 * Returns the worldId stored in the current chat, or null if none.
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
    initSettings,
    getSettings,
    saveSettings,
    saveChatWorldState,
    getChatWorldState,
    getSessionState,
};
