/**
 * Prompt injection for The Endless.
 *
 * Two injection points via setExtensionPrompt:
 * 1. PROMPT_KEY — world context note (location + transition instructions)
 * 2. LORE_KEY — actual world lore content read from the lorebook
 *
 * This bypasses World Info entry toggling entirely. The extension reads
 * the lorebook content and injects it directly into the prompt.
 */

import { getSettings, getSessionState } from './state.js';
import { getWorldName, getWorldLore } from './world-manager.js';

const PROMPT_KEY = 'theEndless_worldContext';
const LORE_KEY = 'theEndless_worldLore';

/**
 * Update the persistent world context prompt.
 */
function updateWorldPrompt(worldId) {
    const context = SillyTavern.getContext();
    const settings = getSettings();
    const session = getSessionState();
    const worldName = getWorldName(worldId);

    let promptText;
    if (session.pendingTransition) {
        if (!worldId) {
            promptText = '[The Endless: The marble door bears a crescent moon etching. The player is transitioning back to The Manifold — the living brutalist hub world between all doors. Narrate their arrival in The Manifold.]';
        } else {
            promptText = `[The Endless: The marble door leads to ${worldName}. The player is transitioning into this world. Narrate their arrival in ${worldName} using the world lore provided below.]`;
        }
    } else {
        if (!worldId) {
            promptText = '[The Endless: Current location is The Manifold — the living hub world between all doors.]';
        } else {
            promptText = `[The Endless: Current location is ${worldName}. Use the world lore provided below for setting details, NPCs, and tone.]`;
        }
    }

    context.setExtensionPrompt(
        PROMPT_KEY,
        promptText,
        1,                       // IN_CHAT
        settings.injectionDepth, // depth
        false,                   // no WI scan
        0,                       // SYSTEM role
    );
}

/**
 * Inject or clear world lore content.
 * When a world is active, injects the lorebook content directly.
 * When in Manifold (null), clears the injection.
 */
async function updateWorldLore(worldId) {
    const context = SillyTavern.getContext();
    const settings = getSettings();

    if (!worldId) {
        // In Manifold — clear world lore injection
        context.setExtensionPrompt(LORE_KEY, '', 1, settings.injectionDepth + 1, false, 0);
        console.log('[TheEndless] Cleared world lore injection (Manifold)');
        return;
    }

    const lore = await getWorldLore(worldId);
    if (!lore) {
        console.warn(`[TheEndless] No lore content for world "${worldId}"`);
        context.setExtensionPrompt(LORE_KEY, '', 1, settings.injectionDepth + 1, false, 0);
        return;
    }

    const worldName = getWorldName(worldId);
    const injection = `[World Lore — ${worldName}]\n${lore}`;

    context.setExtensionPrompt(
        LORE_KEY,
        injection,
        1,                           // IN_CHAT
        settings.injectionDepth + 1, // one deeper than the context note
        false,                       // no WI scan
        0,                           // SYSTEM role
    );

    console.log(`[TheEndless] Injected lore for "${worldName}" (~${lore.length} chars)`);
}

/**
 * Clear the transition flag from the prompt.
 */
function clearTransitionPrompt(worldId) {
    const session = getSessionState();
    session.pendingTransition = null;
    updateWorldPrompt(worldId);
}

/**
 * Register a no-op generate interceptor (manifest still references it).
 */
function createGenerateInterceptor() {
    globalThis.theEndlessGenerateInterceptor = async function () {};
}

export { updateWorldPrompt, updateWorldLore, clearTransitionPrompt, createGenerateInterceptor };
