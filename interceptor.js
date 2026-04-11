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
import { getWorldName, getBookName, getWorlds, readWorldLore } from './world-manager.js';

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

    const isManifold = !worldId || worldId === 'manifold';
    let promptText;
    if (session.pendingTransition) {
        if (isManifold) {
            promptText = '[The Endless: The marble door bears a crescent moon etching. The player is transitioning back to The Manifold — the living brutalist hub world between all doors. Narrate their arrival in The Manifold.]';
        } else {
            promptText = `[The Endless: The marble door leads to ${worldName}. The player is transitioning into this world. Narrate their arrival in ${worldName}.]`;
        }
    } else {
        if (isManifold) {
            promptText = '[The Endless: Current location is The Manifold — the living hub world between all doors.]';
        } else {
            promptText = `[The Endless: Current location is ${worldName}.]`;
        }
    }

    context.setExtensionPrompt(PROMPT_KEY, promptText, 1, settings.injectionDepth, false, 0);
}

/**
 * Detach all world lorebooks from chat metadata, then attach only the
 * active one. This prevents ST's keyword scanner from picking up entries
 * from a previous world's lorebook.
 */
function updateChatAttachments(activeBookName) {
    try {
        const context = SillyTavern.getContext();
        if (!context.chatMetadata) return;

        const meta = context.chatMetadata;
        const registeredBooks = new Set(getWorlds().map(w => w.bookName));

        // Ensure array exists
        if (!Array.isArray(meta.world_info_extra_books)) {
            meta.world_info_extra_books = [];
        }

        // ── DIAGNOSTIC: log what's currently in the array so we can see
        //    what format ST actually uses (names? indices? file paths?)
        console.log('[TheEndless] BEFORE — world_info_extra_books:', JSON.stringify(meta.world_info_extra_books));
        console.log('[TheEndless] BEFORE — world_info:', JSON.stringify(meta.world_info));
        console.log('[TheEndless] Our registered bookNames:', JSON.stringify([...registeredBooks]));

        // Remove all our world lorebooks
        meta.world_info_extra_books = meta.world_info_extra_books.filter(
            name => !registeredBooks.has(name),
        );

        // Attach the active world's lorebook (if any)
        if (activeBookName) {
            meta.world_info_extra_books.push(activeBookName);
        }

        // Also manage the world_info field
        if (meta.world_info && registeredBooks.has(meta.world_info)) {
            meta.world_info = activeBookName || '';
        }

        console.log('[TheEndless] AFTER — world_info_extra_books:', JSON.stringify(meta.world_info_extra_books));
        console.log('[TheEndless] AFTER — world_info:', JSON.stringify(meta.world_info));

        context.saveMetadata();
        console.log(`[TheEndless] Chat attachments updated → ${activeBookName || '(Manifold)'}`);
    } catch (e) {
        console.warn('[TheEndless] Failed to update chat attachments:', e.message);
    }
}

/**
 * Activate world lore:
 * 1. Update chat metadata attachments (detach old, attach new)
 * 2. Read lore from API and inject via setExtensionPrompt
 */
async function activateWorldLore(worldId) {
    const context = SillyTavern.getContext();
    const settings = getSettings();
    // Treat null as Manifold
    const effectiveId = worldId || 'manifold';
    const bookName = getBookName(effectiveId);

    // Step 1: Update chat attachments — remove old world, attach new one
    updateChatAttachments(bookName);

    if (!bookName) {
        console.warn(`[TheEndless] No book name for world "${effectiveId}"`);
        context.setExtensionPrompt(LORE_KEY, '', 1, settings.injectionDepth + 1, false, 0);
        return;
    }

    try {
        const lore = await readWorldLore(bookName);
        if (lore) {
            const worldName = getWorldName(effectiveId);
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
