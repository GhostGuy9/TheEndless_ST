/**
 * Prompt injection and world lore activation for The Endless.
 *
 * Three-layer strategy for world lore:
 * 1. Toggle World Info entries via API (native ST keyword scanning) — now with proper auth
 * 2. Attach lorebook to chat via chat_metadata (native ST)
 * 3. Direct injection via setExtensionPrompt (fallback, always works)
 *
 * Plus: always inject a location/transition note via setExtensionPrompt.
 */

import { getSettings, getSessionState } from './state.js';
import { getWorldName, getBookName, activateWorld, attachWorldToChat, detachAllWorldsFromChat, readWorldLore } from './world-manager.js';

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
 * Activate world lore using all available methods.
 */
async function activateWorldLore(worldId) {
    const context = SillyTavern.getContext();
    const settings = getSettings();
    const bookName = worldId ? getBookName(worldId) : null;

    // Layer 1: Toggle World Info entries via API (proper auth headers now)
    const toggled = await activateWorld(worldId);
    if (toggled) {
        console.log(`[TheEndless] Layer 1 success: World Info entries toggled for "${getWorldName(worldId)}"`);
    }

    // Layer 2: Attach/detach via chat metadata
    await detachAllWorldsFromChat();
    if (bookName) {
        await attachWorldToChat(bookName);
        console.log(`[TheEndless] Layer 2: Chat attachment attempted for "${bookName}"`);
    }

    // Layer 3: Direct injection fallback (always works)
    if (!worldId) {
        context.setExtensionPrompt(LORE_KEY, '', 1, settings.injectionDepth + 1, false, 0);
        console.log('[TheEndless] Cleared world lore (Manifold)');
        return;
    }

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
        console.log(`[TheEndless] Layer 3: Direct injection for "${worldName}" (~${lore.length} chars)`);
    } else if (!toggled) {
        console.warn(`[TheEndless] All layers failed for "${getWorldName(worldId)}" — no lore available`);
    } else {
        // Layer 1 worked, clear any stale direct injection
        context.setExtensionPrompt(LORE_KEY, '', 1, settings.injectionDepth + 1, false, 0);
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
