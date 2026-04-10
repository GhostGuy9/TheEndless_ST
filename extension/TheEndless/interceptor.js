/**
 * Generate interceptor and prompt injection for The Endless.
 *
 * Dual injection strategy:
 * 1. Persistent world note via setExtensionPrompt (always present)
 * 2. One-shot transition note via generate interceptor (during door events only)
 */

import { getSettings, getSessionState } from './state.js';
import { getWorldName } from './world-manager.js';

const PROMPT_KEY = 'theEndless_worldContext';

/**
 * Update the persistent world context prompt.
 * Called on every world change.
 */
function updateWorldPrompt(worldId) {
    const context = SillyTavern.getContext();
    const settings = getSettings();
    const worldName = getWorldName(worldId);

    let promptText;
    if (!worldId) {
        promptText = '[The Endless: Current location is The Manifold — the living hub world between all doors. No world-specific lorebook is active.]';
    } else {
        promptText = `[The Endless: Current location is ${worldName}. World-specific lore is active. Stay consistent with this world's tone, inhabitants, and rules.]`;
    }

    context.setExtensionPrompt(
        PROMPT_KEY,
        promptText,
        1,                      // extension_prompt_types.IN_CHAT
        settings.injectionDepth, // depth
        false,                   // no WI scan
        0,                       // SYSTEM role
    );
}

/**
 * Build the one-shot transition injection text.
 */
function buildTransitionInjection(worldId) {
    const worldName = getWorldName(worldId);
    if (!worldId) {
        return '[System: The marble door bears a crescent moon etching. It leads back to The Manifold. Narrate the transition back to The Manifold — the living brutalist hub world between all doors.]';
    }
    return `[System: The marble door leads to ${worldName}. Narrate the transition into this world using the world-specific lore now available in context.]`;
}

/**
 * The generate interceptor — registered globally via manifest.json.
 * Injects a one-shot system note when a door transition is pending.
 */
function createGenerateInterceptor() {
    globalThis.theEndlessGenerateInterceptor = async function (chat, contextSize, abort, type) {
        // Skip quiet/background generations
        if (type === 'quiet') return;

        const session = getSessionState();
        if (!session.pendingTransition) return;

        const injectionText = buildTransitionInjection(session.pendingTransition.worldId);

        // Find the last user message and inject the system note just before it
        const lastUserIndex = chat.findLastIndex(m => m.is_user);
        if (lastUserIndex >= 0) {
            chat.splice(lastUserIndex, 0, {
                role: 'system',
                content: injectionText,
                is_system: true,
                is_user: false,
                mes: injectionText,
                name: 'The Endless',
                send_date: Date.now(),
            });
        }
    };
}

export { updateWorldPrompt, createGenerateInterceptor };
