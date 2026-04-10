/**
 * UI rendering and event binding for The Endless extension.
 */

import { getSettings, saveSettings } from './state.js';
import { getWorlds, getWorldName, addWorld, removeWorld, updateWorldNote, getAllBooksWithStatus, selectRandomWorld, activateWorld } from './world-manager.js';
import { updateWorldPrompt } from './interceptor.js';

/**
 * Initialize the settings panel UI.
 */
async function initUI() {
    const context = SillyTavern.getContext();

    try {
        const baseUrl = new URL('.', import.meta.url).href;
        const response = await fetch(`${baseUrl}settings.html`);
        if (!response.ok) throw new Error(`Failed to load settings.html: ${response.status}`);
        const html = await response.text();
        $('#extensions_settings2').append(html);
    } catch (e) {
        console.warn('[TheEndless] Could not render settings template:', e);
        return;
    }

    populateWorldSelect();
    populateAddBookSelect();
    renderWorldList();
    syncUIToState();
    bindUIEvents();
}

/**
 * Populate the world dropdown selector (for manual "Go to" control).
 */
function populateWorldSelect() {
    const $select = $('#theendless_world_select');
    $select.find('option:not(:first)').remove();

    for (const world of getWorlds()) {
        $select.append(`<option value="${world.id}">${world.name}</option>`);
    }
}

/**
 * Populate the "Add World" dropdown with all available World Info books.
 * Already-registered books are shown but marked as such.
 */
function populateAddBookSelect() {
    const $select = $('#theendless_add_book_select');
    const currentVal = $select.val();
    $select.find('option:not(:first)').remove();

    const books = getAllBooksWithStatus();
    console.log('[TheEndless] Available World Info books:', books);

    for (const book of books) {
        const label = book.registered ? `${book.name} (already added)` : book.name;
        $select.append(`<option value="${book.name}" ${book.registered ? 'disabled' : ''}>${label}</option>`);
    }

    // Restore selection if still valid
    if (currentVal) $select.val(currentVal);
}

/**
 * Render the world list in the settings panel.
 */
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

/**
 * Refresh all dynamic UI elements.
 */
function refreshUI() {
    populateWorldSelect();
    populateAddBookSelect();
    renderWorldList();
}

/**
 * Sync UI controls to current settings state.
 */
function syncUIToState() {
    const settings = getSettings();

    $('#theendless_enabled').prop('checked', settings.enabled);
    $('#theendless_prevent_repeat').prop('checked', settings.preventRepeatWorld);
    $('#theendless_notifications').prop('checked', settings.showTransitionNotification);
    $('#theendless_depth').val(settings.injectionDepth);

    updateWorldDisplay(settings.currentWorldId);
}

/**
 * Bind UI event handlers.
 */
function bindUIEvents() {
    // Toggles
    $('#theendless_enabled').on('change', function () {
        getSettings().enabled = $(this).is(':checked');
        saveSettings();
    });

    $('#theendless_prevent_repeat').on('change', function () {
        getSettings().preventRepeatWorld = $(this).is(':checked');
        saveSettings();
    });

    $('#theendless_notifications').on('change', function () {
        getSettings().showTransitionNotification = $(this).is(':checked');
        saveSettings();
    });

    $('#theendless_depth').on('change', function () {
        const val = parseInt($(this).val(), 10);
        if (val >= 1 && val <= 10) {
            getSettings().injectionDepth = val;
            saveSettings();
            updateWorldPrompt(getSettings().currentWorldId);
        }
    });

    // Manual world switch
    $('#theendless_go_world').on('click', async function () {
        const worldId = $('#theendless_world_select').val();
        if (!worldId) {
            toastr.warning('Select a world first', 'The Endless');
            return;
        }
        await doTransition(worldId);
    });

    // Random door
    $('#theendless_random_door').on('click', async function () {
        const settings = getSettings();
        const excludeId = settings.preventRepeatWorld ? settings.currentWorldId : null;
        const worldId = selectRandomWorld(excludeId);
        if (!worldId) {
            toastr.warning('No worlds registered', 'The Endless');
            return;
        }
        await doTransition(worldId);
    });

    // Return to Manifold
    $('#theendless_go_manifold').on('click', async function () {
        await doTransition(null);
    });

    // Refresh the "Add World" dropdown every time it's opened
    $('#theendless_add_book_select').on('focus mousedown', function () {
        populateAddBookSelect();
    });

    // Add world
    $('#theendless_add_world_btn').on('click', function () {
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

    // Remove world (delegated event for dynamic elements)
    $(document).on('click', '.theendless-remove-world', function () {
        const worldId = $(this).data('world-id');
        const world = getWorlds().find(w => w.id === worldId);
        if (!world) return;

        if (!confirm(`Remove "${world.name}" from the world registry?`)) return;

        removeWorld(worldId);

        // If we're currently in this world, return to Manifold
        if (getSettings().currentWorldId === worldId) {
            doTransition(null);
        }

        refreshUI();
        toastr.info(`Removed: ${world.name}`, 'The Endless', { timeOut: 3000 });
    });

    // Update note (delegated event for dynamic elements)
    $(document).on('change', '.theendless-note-input', function () {
        const worldId = $(this).data('world-id');
        const note = $(this).val().trim();
        updateWorldNote(worldId, note);
    });
}

/**
 * Perform a world transition from the UI.
 */
async function doTransition(worldId) {
    const settings = getSettings();

    await activateWorld(worldId);

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
    console.log(`[TheEndless] Manual transition to: ${name}`);
}

/**
 * Update the world display in the settings panel.
 */
function updateWorldDisplay(worldId) {
    const name = getWorldName(worldId);
    $('#theendless_world_display').text(name);
}

export { initUI, updateWorldDisplay };
