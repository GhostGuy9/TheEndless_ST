/**
 * The Endless - Door Manager Extension for SillyTavern
 *
 * Dynamically manages world lorebook activation based on narrative door events.
 * Detects when players walk through marble doors, randomly selects a destination
 * world, activates only that world's lorebook, and injects context for the model.
 */

import { initSettings, getSettings, saveSettings, saveChatWorldState, getChatWorldState, getSessionState } from './state.js';
import { selectRandomWorld, activateWorld, getWorldName, getWorldRegistry, findWorldIdByName } from './world-manager.js';
import { detectDoorEvent } from './door-detector.js';
import { updateWorldPrompt, createGenerateInterceptor } from './interceptor.js';
import { initUI, updateWorldDisplay } from './ui.js';

const DEBOUNCE_PLAYER_MS = 5000;
const DEBOUNCE_MODEL_MS = 10000;
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

        // Toggle lorebooks
        await activateWorld(worldId);

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

        // Update prompt injection
        updateWorldPrompt(worldId);

        // Update UI
        updateWorldDisplay(worldId);

        // Notification
        if (settings.showTransitionNotification) {
            const name = getWorldName(worldId);
            toastr.info(`Door leads to: ${name}`, 'The Endless', { timeOut: 4000 });
        }

        console.log(`[TheEndless] Transitioned to: ${getWorldName(worldId)}`);
    } finally {
        session.isProcessing = false;
        // Clear pending transition after one generation cycle
        setTimeout(() => {
            session.pendingTransition = null;
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

    session.lastDoorDetection = Date.now();

    if (detection.isManifoldReturn) {
        transitionToManifold();
    } else {
        transitionToRandomWorld();
    }
}

function onModelMessage(messageIndex) {
    const settings = getSettings();
    if (!settings.enabled) return;

    const context = SillyTavern.getContext();
    const message = context.chat[messageIndex];
    if (!message?.mes || message.is_user) return;

    const session = getSessionState();
    // Don't detect if we already have a pending transition or recently detected
    if (session.pendingTransition || session.isProcessing) return;
    if (Date.now() - session.lastDoorDetection < DEBOUNCE_MODEL_MS) return;

    const detection = detectDoorEvent(message.mes, 'model');
    if (!detection.detected) return;

    session.lastDoorDetection = Date.now();

    if (detection.isManifoldReturn) {
        transitionToManifold();
    } else {
        transitionToRandomWorld();
    }
}

async function onChatChanged() {
    const chatWorldId = getChatWorldState();
    const settings = getSettings();

    // Restore world state from chat metadata
    settings.currentWorldId = chatWorldId;
    saveSettings();

    // Activate the correct lorebook
    await activateWorld(chatWorldId);

    // Update prompt and UI
    updateWorldPrompt(chatWorldId);
    updateWorldDisplay(chatWorldId);

    console.log(`[TheEndless] Chat changed — restored world: ${getWorldName(chatWorldId)}`);
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
                const names = Object.values(getWorldRegistry()).map(w => w.name).join(', ');
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

export async function onActivate() {
    const context = SillyTavern.getContext();

    // Initialize settings and UI
    initSettings();
    createGenerateInterceptor();

    // Wait for app ready to register commands and UI
    context.eventSource.on(context.event_types.APP_READY, () => {
        initUI();
        registerSlashCommands();

        // Set initial world prompt
        const settings = getSettings();
        updateWorldPrompt(settings.currentWorldId);
        updateWorldDisplay(settings.currentWorldId);
    });

    // Wire up event handlers
    context.eventSource.on(context.event_types.MESSAGE_SENT, onPlayerMessage);
    context.eventSource.on(context.event_types.MESSAGE_RECEIVED, onModelMessage);
    context.eventSource.on(context.event_types.CHAT_CHANGED, onChatChanged);

    console.log('[TheEndless] Door Manager extension activated');
}
