/**
 * The Endless - Door Manager Extension for SillyTavern
 *
 * Manages world lore injection based on narrative door events.
 * Uses setExtensionPrompt for direct lore injection (one API call
 * per transition). The old approach of toggling entry.disable via
 * the API was removed because ST caches entries in memory.
 */

import { initSettings, getSettings, saveSettings, saveChatWorldState, getChatWorldState, getSessionState } from './state.js';
import { selectRandomWorld, getWorldName, getWorlds, findWorldIdByName, clearLoreCache } from './world-manager.js';
import { detectDoorEvent } from './door-detector.js';
import { updateWorldPrompt, activateWorldLore, clearTransitionPrompt, createGenerateInterceptor } from './interceptor.js';
import { initUI, updateWorldDisplay } from './ui.js';

const DEBOUNCE_PLAYER_MS = 5000;
const PENDING_CLEAR_MS = 30000;

// ─── Transition Logic ───────────────────────────────────────────────

async function transitionToWorld(worldId) {
    const session = getSessionState();
    if (session.isProcessing) return;
    session.isProcessing = true;

    try {
        const settings = getSettings();

        session.pendingTransition = {
            worldId,
            timestamp: Date.now(),
        };

        await activateWorldLore(worldId);

        settings.previousWorldId = settings.currentWorldId;
        settings.currentWorldId = worldId;
        settings.visitHistory.push({ worldId, timestamp: Date.now() });

        if (settings.visitHistory.length > 100) {
            settings.visitHistory = settings.visitHistory.slice(-50);
        }

        saveSettings();
        saveChatWorldState(worldId);
        updateWorldPrompt(worldId);
        updateWorldDisplay(worldId);

        if (settings.showTransitionNotification) {
            const name = getWorldName(worldId);
            toastr.info(`Door leads to: ${name}`, 'The Endless', { timeOut: 4000 });
        }

        console.log(`[TheEndless] Transitioned to: ${getWorldName(worldId)}`);
    } catch (e) {
        console.error('[TheEndless] Transition failed:', e);
    } finally {
        session.isProcessing = false;
        setTimeout(() => {
            clearTransitionPrompt(worldId);
        }, PENDING_CLEAR_MS);
    }
}

async function transitionToRandomWorld() {
    const settings = getSettings();
    const excludeId = settings.preventRepeatWorld ? settings.currentWorldId : null;
    const worldId = selectRandomWorld(excludeId);
    await transitionToWorld(worldId);
}

async function transitionToManifold() {
    await transitionToWorld('manifold');
}

// ─── Event Handlers ─────────────────────────────────────────────────

function onPlayerMessage(messageIndex) {
    const settings = getSettings();
    if (!settings.enabled) return;

    const context = SillyTavern.getContext();
    const message = context.chat[messageIndex];
    if (!message?.mes) return;

    const session = getSessionState();
    if (Date.now() - session.lastDoorDetection < DEBOUNCE_PLAYER_MS) return;

    const detection = detectDoorEvent(message.mes, 'player');
    if (!detection.detected) return;

    if (settings.currentWorldId && settings.currentWorldId !== 'manifold' && !detection.isManifoldReturn) {
        console.log('[TheEndless] Already in a world, ignoring door event (return to Manifold first)');
        return;
    }

    session.lastDoorDetection = Date.now();

    if (detection.isManifoldReturn) {
        transitionToManifold();
    } else {
        transitionToRandomWorld();
    }
}

function onModelMessage(_messageIndex) {
    // Intentionally empty — model output does not trigger transitions
}

async function onChatChanged() {
    try {
        const settings = getSettings();
        const chatWorldId = getChatWorldState();

        // Clear lore cache on chat switch so we read fresh data
        clearLoreCache();

        if (!chatWorldId) {
            // New chat or no saved world → start in The Manifold
            console.log('[TheEndless] Chat changed → The Manifold (new chat)');
            settings.currentWorldId = 'manifold';
            settings.previousWorldId = null;
            saveSettings();

            await activateWorldLore('manifold');
            updateWorldPrompt('manifold');
            updateWorldDisplay('manifold');
            return;
        }

        // Existing chat with saved world → restore it (one API call)
        console.log(`[TheEndless] Chat changed → restoring ${getWorldName(chatWorldId)}`);
        settings.currentWorldId = chatWorldId;
        saveSettings();

        await activateWorldLore(chatWorldId);
        updateWorldPrompt(chatWorldId);
        updateWorldDisplay(chatWorldId);
    } catch (e) {
        console.error('[TheEndless] onChatChanged failed:', e);
    }
}

// ─── Slash Commands ─────────────────────────────────────────────────

function registerSlashCommands() {
    const context = SillyTavern.getContext();
    const { SlashCommandParser, SlashCommand, SlashCommandArgument, ARGUMENT_TYPE } = context;

    if (!SlashCommandParser) {
        console.warn('[TheEndless] SlashCommandParser not available');
        return;
    }

    SlashCommandParser.addCommandObject(SlashCommand.fromProps({
        name: 'endless-world',
        aliases: ['ew'],
        callback: async (_args, value) => {
            if (!value?.trim()) {
                const current = getSettings().currentWorldId;
                return `Current world: ${getWorldName(current)}`;
            }
            const worldId = findWorldIdByName(value.trim());
            if (!worldId) {
                const names = getWorlds().map(w => w.name).join(', ');
                return `Unknown world. Available: ${names}`;
            }
            await transitionToWorld(worldId);
            return `Switched to ${getWorldName(worldId)}`;
        },
        helpString: '<div>Show current world or switch to a specific world.</div>',
        unnamedArgumentList: [
            SlashCommandArgument.fromProps({
                description: 'World name to switch to (leave empty to show current)',
                typeList: [ARGUMENT_TYPE.STRING],
                isRequired: false,
            }),
        ],
    }));

    SlashCommandParser.addCommandObject(SlashCommand.fromProps({
        name: 'endless-door',
        aliases: ['ed'],
        callback: async () => {
            await transitionToRandomWorld();
            const current = getSettings().currentWorldId;
            return `Door opened to: ${getWorldName(current)}`;
        },
        helpString: '<div>Trigger a random door event.</div>',
    }));

    SlashCommandParser.addCommandObject(SlashCommand.fromProps({
        name: 'endless-manifold',
        aliases: ['em'],
        callback: async () => {
            await transitionToManifold();
            return 'Returned to The Manifold';
        },
        helpString: '<div>Return to The Manifold.</div>',
    }));

    SlashCommandParser.addCommandObject(SlashCommand.fromProps({
        name: 'endless-history',
        aliases: ['eh'],
        callback: () => {
            const history = getSettings().visitHistory;
            if (!history.length) return 'No worlds visited yet.';
            return history.slice(-20).map(h =>
                `${getWorldName(h.worldId)} (${new Date(h.timestamp).toLocaleString()})`,
            ).join('\n');
        },
        helpString: '<div>Show world visit history.</div>',
    }));
}

// ─── Lifecycle ──────────────────────────────────────────────────────

let initialized = false;

async function init() {
    if (initialized) return;
    initialized = true;

    console.log('[TheEndless] Initializing...');

    const context = SillyTavern.getContext();

    initSettings();
    createGenerateInterceptor();
    await initUI();
    registerSlashCommands();

    // No API calls during init — just set Manifold prompt
    updateWorldPrompt(null);
    updateWorldDisplay(null);

    // Wire up event handlers
    context.eventSource.on(context.event_types.MESSAGE_SENT, onPlayerMessage);
    context.eventSource.on(context.event_types.MESSAGE_RECEIVED, onModelMessage);
    context.eventSource.on(context.event_types.CHAT_CHANGED, onChatChanged);

    context.eventSource.on(context.event_types.GENERATION_ENDED, () => {
        const session = getSessionState();
        if (session.pendingTransition) {
            clearTransitionPrompt(getSettings().currentWorldId);
        }
    });

    console.log('[TheEndless] Ready — CHAT_CHANGED will initialize world state');
}

export async function onActivate() {
    await init();
}

jQuery(async () => {
    await init();
});
