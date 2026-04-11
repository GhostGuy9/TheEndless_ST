/**
 * Prompt injection for The Endless.
 *
 * Injects world lore directly via setExtensionPrompt. This is the only
 * reliable method — toggling entry.disable via the API doesn't work
 * because ST caches world info in memory and never re-reads files.
 *
 * One API call per transition (GET to read lore). Zero calls for Manifold.
 */

import { getSettings, getSessionState } from './state.js';
import { getWorldName, getBookName, readWorldLore } from './world-manager.js';

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
 * Activate world lore — read from API and inject via setExtensionPrompt.
 * One GET call for activation, zero calls for Manifold.
 */
async function activateWorldLore(worldId) {
    const context = SillyTavern.getContext();
    const settings = getSettings();

    if (!worldId) {
        // Returning to Manifold — just clear the lore injection
        context.setExtensionPrompt(LORE_KEY, '', 1, settings.injectionDepth + 1, false, 0);
        console.log('[TheEndless] Cleared world lore (Manifold)');
        return;
    }

    // Read world lore and inject it
    const bookName = getBookName(worldId);
    if (!bookName) {
        console.warn(`[TheEndless] No book name for world "${worldId}"`);
        return;
    }

    try {
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
            console.log(`[TheEndless] Injected lore for "${worldName}" (~${lore.length} chars)`);
        } else {
            console.warn(`[TheEndless] No lore content found for "${bookName}"`);
            context.setExtensionPrompt(LORE_KEY, '', 1, settings.injectionDepth + 1, false, 0);
        }
    } catch (e) {
        console.error(`[TheEndless] Failed to read lore for "${bookName}":`, e);
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
