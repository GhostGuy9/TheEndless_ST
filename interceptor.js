/**
 * Prompt injection for The Endless.
 *
 * Strategy:
 * 1. Always inject a location/transition note via setExtensionPrompt (PROMPT_KEY)
 * 2. Try to attach world lorebook to chat via chat_metadata (native ST keyword scanning)
 * 3. If attachment works, ST handles lore injection natively — no LORE_KEY needed
 * 4. If attachment fails, fall back to direct lore injection via setExtensionPrompt (LORE_KEY)
 */

import { getSettings, getSessionState } from './state.js';
import { getWorldName, getBookName, attachWorldToChat, detachAllWorldsFromChat, readWorldLore } from './world-manager.js';

const PROMPT_KEY = 'theEndless_worldContext';
const LORE_KEY = 'theEndless_worldLore';

/**
 * Update the location/transition note.
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
            promptText = `[The Endless: The marble door leads to ${worldName}. The player is transitioning into this world. Narrate their arrival in ${worldName}.]`;
        }
    } else {
        if (!worldId) {
            promptText = '[The Endless: Current location is The Manifold — the living hub world between all doors.]';
        } else {
            promptText = `[The Endless: Current location is ${worldName}.]`;
        }
    }

    context.setExtensionPrompt(PROMPT_KEY, promptText, 1, settings.injectionDepth, false, 0);
}

/**
 * Activate world lore — tries native chat attachment first, falls back to direct injection.
 */
async function activateWorldLore(worldId) {
    const context = SillyTavern.getContext();
    const settings = getSettings();

    // Always detach previous worlds first
    await detachAllWorldsFromChat();

    if (!worldId) {
        // Returning to Manifold — clear any direct injection
        context.setExtensionPrompt(LORE_KEY, '', 1, settings.injectionDepth + 1, false, 0);
        console.log('[TheEndless] Cleared world lore (Manifold)');
        return;
    }

    const bookName = getBookName(worldId);
    if (!bookName) {
        console.warn(`[TheEndless] No book name for world "${worldId}"`);
        return;
    }

    // Try 1: Attach to chat via metadata (native ST)
    const attached = await attachWorldToChat(bookName);
    if (attached) {
        // Clear any leftover direct injection since native should handle it
        context.setExtensionPrompt(LORE_KEY, '', 1, settings.injectionDepth + 1, false, 0);
        console.log(`[TheEndless] Attached "${bookName}" to chat (native mode)`);
    }

    // Try 2: Also do direct injection as fallback/supplement
    // This ensures lore is available even if chat attachment doesn't work
    const lore = await readWorldLore(bookName);
    if (lore) {
        const worldName = getWorldName(worldId);
        context.setExtensionPrompt(
            LORE_KEY,
            `[World Lore — ${worldName}]\n${lore}`,
            1,
            settings.injectionDepth + 1,
            false,
            0,
        );
        console.log(`[TheEndless] Injected lore fallback for "${worldName}" (~${lore.length} chars)`);
    }
}

/**
 * Clear the transition flag.
 */
function clearTransitionPrompt(worldId) {
    const session = getSessionState();
    session.pendingTransition = null;
    updateWorldPrompt(worldId);
}

/**
 * No-op generate interceptor (manifest still references it).
 */
function createGenerateInterceptor() {
    globalThis.theEndlessGenerateInterceptor = async function () {};
}

export { updateWorldPrompt, activateWorldLore, clearTransitionPrompt, createGenerateInterceptor };
