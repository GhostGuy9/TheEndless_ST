/**
 * UI rendering and event binding for The Endless extension.
 */

import { getSettings, saveSettings } from './state.js';
import { getWorldRegistry, getWorldName, findWorldIdByName, activateWorld, selectRandomWorld } from './world-manager.js';
import { updateWorldPrompt } from './interceptor.js';

/**
 * Initialize the settings panel UI.
 */
async function initUI() {
    const context = SillyTavern.getContext();

    try {
        const html = await context.renderExtensionTemplateAsync('third-party/TheEndless_ST', 'settings');
        $('#extensions_settings2').append(html);
    } catch (e) {
        console.warn('[TheEndless] Could not render settings template:', e);
        return;
    }

    populateWorldSelect();
    populateBookNameMapping();
    syncUIToState();
    bindUIEvents();
}

/**
 * Populate the world dropdown selector.
 */
function populateWorldSelect() {
    const $select = $('#theendless_world_select');
    const registry = getWorldRegistry();

    for (const [id, world] of Object.entries(registry)) {
        $select.append(`<option value="${id}">${world.name}</option>`);
    }
}

/**
 * Populate the lorebook name mapping fields.
 */
function populateBookNameMapping() {
    const $list = $('#theendless_bookname_list');
    const settings = getSettings();
    const registry = getWorldRegistry();

    for (const [id, world] of Object.entries(registry)) {
        const currentName = settings.worldBookNames?.[id] ?? world.defaultBook;
        $list.append(`
            <div class="theendless-bookname-entry">
                <label>${world.name}:</label>
                <input type="text" class="text_pole theendless-bookname-input" data-world-id="${id}" value="${currentName}" />
            </div>
        `);
    }
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
        await doTransition(worldId);
    });

    // Return to Manifold
    $('#theendless_go_manifold').on('click', async function () {
        await doTransition(null);
    });

    // Book name mapping changes
    $(document).on('change', '.theendless-bookname-input', function () {
        const worldId = $(this).data('world-id');
        const bookName = $(this).val().trim();
        if (worldId && bookName) {
            getSettings().worldBookNames[worldId] = bookName;
            saveSettings();
        }
    });
}

/**
 * Perform a world transition from the UI.
 * This mirrors the transition logic in index.js but is triggered manually.
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
