/**
 * The Endless - Door Manager Extension for SillyTavern
 *
 * Dynamically manages world lorebook activation based on narrative door events.
 * Detects when players walk through marble doors, randomly selects a destination
 * world, activates only that world's lorebook, and injects context for the model.
 */

import { initSettings, getSettings, saveSettings, saveChatWorldState, getChatWorldState, getSessionState } from './state.js';
import { selectRandomWorld, getWorldName, getWorlds, findWorldIdByName, disableAllWorldBooks } from './world-manager.js';
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

        // Set pending transition so the generate interceptor can inject
        session.pendingTransition = {
            worldId,
            timestamp: Date.now(),
        };

        // Inject world lore directly into prompt (bypasses World Info toggle)
        await activateWorldLore(worldId);

        // Update persistent state
        settings.previousWorldId = settings.currentWorldId;
        settings.currentWorldId = worldId;
        settings.visitHistory.push({ worldId, timestamp: Date.now() });

        // Keep history manageable
        if (settings.visitHistory.length > 100) {
            settings.visitHistory = settings.visitHistory.slice(-50);
        }

        saveSettings();
        saveChatWorldState(worldId);

        // Update context note
        updateWorldPrompt(worldId);

        // Update UI
        updateWorldDisplay(worldId);

        // Notification
        if (settings.showTransitionNotification) {
            const name = getWorldName(worldId);
            toastr.info(`Door leads to: ${name}`, 'The Endless', { timeOut: 4000 });
        }

        console.log(`[TheEndless] Transitioned to: ${getWorldName(worldId)}`);
    } catch (e) {
        console.error('[TheEndless] Transition failed:', e);
    } finally {
        session.isProcessing = false;
        // Clear transition prompt after one generation cycle
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
    await transitionToWorld(null);
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

    // Don't re-trigger if already in a world (player must return to Manifold first)
    // Exception: manifold return always works
    if (settings.currentWorldId && !detection.isManifoldReturn) {
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

// Model messages no longer trigger world transitions.
function onModelMessage(_messageIndex) {
    // Intentionally empty — model output does not trigger transitions
}

async function onChatChanged() {
    try {
        const context = SillyTavern.getContext();
        const settings = getSettings();
        const chatWorldId = getChatWorldState();

        // New/fresh chat: no saved world state → reset to Manifold
        if (!chatWorldId) {
            console.log('[TheEndless] Chat changed — no saved world state, resetting to Manifold');
            settings.currentWorldId = null;
            settings.previousWorldId = null;
            saveSettings();

            // Disable all world lorebook entries (clean slate)
            await disableAllWorldBooks();

            // Clear any injected lore
            context.setExtensionPrompt('theEndless_worldLore', '', 1, settings.injectionDepth + 1, false, 0);

            updateWorldPrompt(null);
            updateWorldDisplay(null);
            return;
        }

        // Existing chat with saved world: restore it
        settings.currentWorldId = chatWorldId;
        saveSettings();

        await activateWorldLore(chatWorldId);
        updateWorldPrompt(chatWorldId);
        updateWorldDisplay(chatWorldId);

        console.log(`[TheEndless] Chat changed — restored world: ${getWorldName(chatWorldId)}`);
    } catch (e) {
        console.error('[TheEndless] onChatChanged failed:', e);
    }
}

// ─── Slash Commands ─────────────────────────────────────────────────

function registerSlashCommands() {
    const context = SillyTavern.getContext();
    const { SlashCommandParser, SlashCommand, SlashCommandArgument, ARGUMENT_TYPE } = context;

    if (!SlashCommandParser) {
        console.warn('[TheEndless] SlashCommandParser not available, skipping slash command registration');
        return;
    }

    // /endless-world [name]
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
        helpString: '<div>Show current world or switch to a specific world. Usage: <code>/endless-world [name]</code></div>',
        unnamedArgumentList: [
            SlashCommandArgument.fromProps({
                description: 'World name to switch to (leave empty to show current)',
                typeList: [ARGUMENT_TYPE.STRING],
                isRequired: false,
            }),
        ],
    }));

    // /endless-door
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

    // /endless-manifold
    SlashCommandParser.addCommandObject(SlashCommand.fromProps({
        name: 'endless-manifold',
        aliases: ['em'],
        callback: async () => {
            await transitionToManifold();
            return 'Returned to The Manifold';
        },
        helpString: '<div>Return to The Manifold (deactivate all world lorebooks).</div>',
    }));

    // /endless-history
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
        helpString: '<div>Show world visit history (last 20 entries).</div>',
    }));
}

// ─── Lifecycle ──────────────────────────────────────────────────────

let initialized = false;

async function init() {
    if (initialized) return;
    initialized = true;

    console.log('[TheEndless] Initializing Door Manager extension...');

    const context = SillyTavern.getContext();

    // Initialize settings and generate interceptor
    initSettings();
    createGenerateInterceptor();

    // Initialize UI and slash commands
    await initUI();
    registerSlashCommands();

    // Set Manifold prompt (no API calls during init — CHAT_CHANGED handles the rest)
    updateWorldPrompt(null);
    updateWorldDisplay(null);

    // Wire up event handlers
    context.eventSource.on(context.event_types.MESSAGE_SENT, onPlayerMessage);
    context.eventSource.on(context.event_types.MESSAGE_RECEIVED, onModelMessage);
    context.eventSource.on(context.event_types.CHAT_CHANGED, onChatChanged);

    // Clear transition prompt after generation completes
    context.eventSource.on(context.event_types.GENERATION_ENDED, () => {
        const session = getSessionState();
        if (session.pendingTransition) {
            clearTransitionPrompt(getSettings().currentWorldId);
        }
    });

    console.log('[TheEndless] Door Manager extension activated — waiting for CHAT_CHANGED to initialize world state');
}

// Hook for manifest.json hooks.activate
export async function onActivate() {
    await init();
}

// jQuery ready fallback — ensures init runs even if hooks don't fire
jQuery(async () => {
    await init();
});
