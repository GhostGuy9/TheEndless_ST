/**
 * UI rendering and event binding for The Endless extension.
 */

import { getSettings, saveSettings } from './state.js';
import { getWorlds, getWorldName, addWorld, removeWorld, updateWorldNote, getAllBooksWithStatus, selectRandomWorld, clearLoreCache } from './world-manager.js';
import { updateWorldPrompt, activateWorldLore } from './interceptor.js';

/**
 * Initialize the settings panel UI.
 */
async function initUI() {
    try {
        const baseUrl = new URL('.', import.meta.url).href;
        const response = await fetch(`${baseUrl}settings.html`);
        if (!response.ok) throw new Error(`Failed to load settings.html: ${response.status}`);
        const html = await response.text();
        $('#extensions_settings2').append(html);
        console.log('[TheEndless] Settings panel HTML loaded');
    } catch (e) {
        console.error('[TheEndless] Could not render settings template:', e);
        return;
    }

    populateWorldSelect();
    populateAddBookSelect();
    renderWorldList();
    syncUIToState();
    bindUIEvents();
    console.log('[TheEndless] UI initialized and events bound');
}

function populateWorldSelect() {
    const $select = $('#theendless_world_select');
    $select.find('option:not(:first)').remove();
    for (const world of getWorlds()) {
        $select.append(`<option value="${world.id}">${world.name}</option>`);
    }
}

function populateAddBookSelect() {
    const $select = $('#theendless_add_book_select');
    const currentVal = $select.val();
    $select.find('option:not(:first)').remove();
    const books = getAllBooksWithStatus();
    for (const book of books) {
        const label = book.registered ? `${book.name} (already added)` : book.name;
        $select.append(`<option value="${book.name}" ${book.registered ? 'disabled' : ''}>${label}</option>`);
    }
    if (currentVal) $select.val(currentVal);
}

function renderWorldList() {
    const $list = $('#theendless_world_list');
    $list.empty();
    const worlds = getWorlds();
    if (worlds.length === 0) {
        $list.append('<div class="theendless-empty">No worlds registered. Add a World Info book above.</div>');
        return;
    }
    for (const world of worlds) {
        const $entry = $(`
            <div class="theendless-world-entry" data-world-id="${world.id}">
                <div class="theendless-world-entry-header">
                    <span class="theendless-world-entry-name">${world.name}</span>
                    <span class="theendless-world-entry-book" title="World Info book: ${world.bookName}">${world.bookName}</span>
                    <button class="menu_button theendless-remove-world" data-world-id="${world.id}" title="Remove world">
                        <i class="fa-solid fa-trash-can"></i>
                    </button>
                </div>
                <div class="theendless-world-entry-note">
                    <input type="text" class="text_pole theendless-note-input" data-world-id="${world.id}"
                           value="${world.note || ''}" placeholder="Note (optional)" />
                </div>
            </div>
        `);
        $list.append($entry);
    }
}

function refreshUI() {
    populateWorldSelect();
    populateAddBookSelect();
    renderWorldList();
}

function syncUIToState() {
    const settings = getSettings();
    $('#theendless_enabled').prop('checked', settings.enabled);
    $('#theendless_prevent_repeat').prop('checked', settings.preventRepeatWorld);
    $('#theendless_notifications').prop('checked', settings.showTransitionNotification);
    $('#theendless_depth').val(settings.injectionDepth);
    updateWorldDisplay(settings.currentWorldId);
}

let eventsBound = false;

function bindUIEvents() {
    if (eventsBound) return;
    eventsBound = true;

    $(document).on('change', '#theendless_enabled', function () {
        getSettings().enabled = $(this).is(':checked');
        saveSettings();
        console.log(`[TheEndless] Door detection ${$(this).is(':checked') ? 'enabled' : 'disabled'}`);
    });

    $(document).on('change', '#theendless_prevent_repeat', function () {
        getSettings().preventRepeatWorld = $(this).is(':checked');
        saveSettings();
    });

    $(document).on('change', '#theendless_notifications', function () {
        getSettings().showTransitionNotification = $(this).is(':checked');
        saveSettings();
    });

    $(document).on('change', '#theendless_depth', function () {
        const val = parseInt($(this).val(), 10);
        if (val >= 1 && val <= 10) {
            getSettings().injectionDepth = val;
            saveSettings();
            updateWorldPrompt(getSettings().currentWorldId);
        }
    });

    // Manual world switch
    $(document).on('click', '#theendless_go_world', async function () {
        try {
            const worldId = $('#theendless_world_select').val();
            if (!worldId) {
                toastr.warning('Select a world first', 'The Endless');
                return;
            }
            console.log(`[TheEndless] Go button → ${worldId}`);
            await doTransition(worldId);
        } catch (e) {
            console.error('[TheEndless] Go button error:', e);
            toastr.error(`Error: ${e.message}`, 'The Endless');
        }
    });

    // Random door
    $(document).on('click', '#theendless_random_door', async function () {
        try {
            const settings = getSettings();
            const excludeId = settings.preventRepeatWorld ? settings.currentWorldId : null;
            const worldId = selectRandomWorld(excludeId);
            if (!worldId) {
                toastr.warning('No worlds registered', 'The Endless');
                return;
            }
            console.log(`[TheEndless] Random Door → ${worldId}`);
            await doTransition(worldId);
        } catch (e) {
            console.error('[TheEndless] Random Door error:', e);
            toastr.error(`Error: ${e.message}`, 'The Endless');
        }
    });

    // Return to Manifold
    $(document).on('click', '#theendless_go_manifold', async function () {
        try {
            console.log('[TheEndless] Return to Manifold clicked');
            await doTransition(null);
        } catch (e) {
            console.error('[TheEndless] Manifold error:', e);
            toastr.error(`Error: ${e.message}`, 'The Endless');
        }
    });

    // Clear lore cache and re-inject (force refresh)
    $(document).on('click', '#theendless_enable_all', async function () {
        try {
            clearLoreCache();
            const settings = getSettings();
            if (settings.currentWorldId) {
                await activateWorldLore(settings.currentWorldId);
                toastr.info('Lore cache cleared and re-injected', 'The Endless', { timeOut: 3000 });
            } else {
                toastr.info('No active world — in Manifold', 'The Endless', { timeOut: 3000 });
            }
        } catch (e) {
            console.error('[TheEndless] Refresh error:', e);
            toastr.error(`Error: ${e.message}`, 'The Endless');
        }
    });

    // Return to Manifold (clear all lore)
    $(document).on('click', '#theendless_disable_all', async function () {
        try {
            console.log('[TheEndless] Disable All → Manifold');
            clearLoreCache();
            await doTransition(null);
            toastr.info('All world lore cleared — Manifold', 'The Endless', { timeOut: 3000 });
        } catch (e) {
            console.error('[TheEndless] Disable All error:', e);
            toastr.error(`Error: ${e.message}`, 'The Endless');
        }
    });

    $(document).on('focus mousedown', '#theendless_add_book_select', function () {
        populateAddBookSelect();
    });

    $(document).on('click', '#theendless_add_world_btn', function () {
        const bookName = $('#theendless_add_book_select').val();
        if (!bookName) {
            toastr.warning('Select a World Info book first', 'The Endless');
            return;
        }
        const world = addWorld(bookName);
        if (!world) {
            toastr.warning('This world is already registered', 'The Endless');
            return;
        }
        toastr.success(`Added: ${world.name}`, 'The Endless', { timeOut: 3000 });
        refreshUI();
    });

    $(document).on('click', '.theendless-remove-world', function () {
        const worldId = $(this).data('world-id');
        const world = getWorlds().find(w => w.id === worldId);
        if (!world) return;
        if (!confirm(`Remove "${world.name}" from the world registry?`)) return;
        removeWorld(worldId);
        if (getSettings().currentWorldId === worldId) {
            doTransition(null);
        }
        refreshUI();
        toastr.info(`Removed: ${world.name}`, 'The Endless', { timeOut: 3000 });
    });

    $(document).on('change', '.theendless-note-input', function () {
        const worldId = $(this).data('world-id');
        const note = $(this).val().trim();
        updateWorldNote(worldId, note);
    });

    console.log('[TheEndless] All UI events bound (delegated)');
}

async function doTransition(worldId) {
    const settings = getSettings();

    await activateWorldLore(worldId);

    settings.previousWorldId = settings.currentWorldId;
    settings.currentWorldId = worldId;
    settings.visitHistory.push({ worldId, timestamp: Date.now() });
    saveSettings();

    updateWorldPrompt(worldId);
    updateWorldDisplay(worldId);

    const name = getWorldName(worldId);
    if (settings.showTransitionNotification) {
        toastr.info(`Switched to: ${name}`, 'The Endless', { timeOut: 4000 });
    }
    console.log(`[TheEndless] Transition complete → ${name}`);
}

function updateWorldDisplay(worldId) {
    const name = getWorldName(worldId);
    $('#theendless_world_display').text(name);
}

export { initUI, updateWorldDisplay };
