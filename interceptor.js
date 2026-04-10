/**
 * Prompt injection for The Endless.
 *
 * Uses setExtensionPrompt exclusively for world context injection.
 * During transitions, the prompt temporarily includes a transition instruction
 * which is cleared after the next generation completes.
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
    const session = getSessionState();

    const worldName = getWorldName(worldId);
    let promptText;

    if (session.pendingTransition) {
        // Transition in progress — include the transition instruction
        if (!worldId) {
            promptText = '[The Endless: The marble door bears a crescent moon etching. The player is transitioning back to The Manifold — the living brutalist hub world between all doors. Narrate their arrival in The Manifold.]';
        } else {
            promptText = `[The Endless: The marble door leads to ${worldName}. The player is transitioning into this world. Narrate their arrival in ${worldName} using the world-specific lore now in context.]`;
        }
    } else {
        // Normal state — just indicate current location
        if (!worldId) {
            promptText = '[The Endless: Current location is The Manifold — the living hub world between all doors. No world-specific lorebook is active.]';
        } else {
            promptText = `[The Endless: Current location is ${worldName}. World-specific lore is active. Stay consistent with this world's tone, inhabitants, and rules.]`;
        }
    }

    context.setExtensionPrompt(
        PROMPT_KEY,
        promptText,
        1,                       // extension_prompt_types.IN_CHAT
        settings.injectionDepth, // depth
        false,                   // no WI scan
        0,                       // SYSTEM role
    );
}

/**
 * Clear the transition flag from the prompt (revert to normal location note).
 * Called after generation completes.
 */
function clearTransitionPrompt(worldId) {
    const session = getSessionState();
    session.pendingTransition = null;
    updateWorldPrompt(worldId);
}

/**
 * Register a no-op generate interceptor.
 * The manifest still references it, so it needs to exist.
 */
function createGenerateInterceptor() {
    globalThis.theEndlessGenerateInterceptor = async function () {
        // No-op — injection is handled entirely via setExtensionPrompt
    };
}

export { updateWorldPrompt, clearTransitionPrompt, createGenerateInterceptor };
