// Builds the 4-column shell inside #app and wires the panels + splitters.

import { initSplitters } from "./splitter.js";
import { renderPreviewPanel }    from "./panels/previewPanel.js";
import { renderThingListPanel }  from "./panels/thingListPanel.js";
import { renderEditorPanel }     from "./panels/editorPanel.js";
import { renderSpriteListPanel } from "./panels/spriteListPanel.js";

const $ = window.jQuery;

const PANEL_DEFAULTS = {
    preview: { width: 200, min: 165, max: 320 },
    things:  { width: 220, min: 190, max: 320 },
    sprites: { width: 220, min: 190, max: 320 },
};

export function renderLayout($host) {
    const p = PANEL_DEFAULTS;

    $host.empty().append(`
        <div class="app-layout" id="app-layout">
            <section class="app-panel app-panel--preview"
                     id="panel-preview"
                     style="flex-basis:${p.preview.width}px"></section>
            <div class="app-splitter"
                 data-resize="panel-preview" data-edge="right"
                 data-min="${p.preview.min}" data-max="${p.preview.max}"></div>

            <section class="app-panel app-panel--things"
                     id="panel-things"
                     style="flex-basis:${p.things.width}px"></section>
            <div class="app-splitter"
                 data-resize="panel-things" data-edge="right"
                 data-min="${p.things.min}" data-max="${p.things.max}"></div>

            <section class="app-panel app-panel--editor" id="panel-editor"></section>

            <div class="app-splitter"
                 data-resize="panel-sprites" data-edge="left"
                 data-min="${p.sprites.min}" data-max="${p.sprites.max}"></div>
            <section class="app-panel app-panel--sprites"
                     id="panel-sprites"
                     style="flex-basis:${p.sprites.width}px"></section>
        </div>
    `);

    renderPreviewPanel($("#panel-preview"));
    renderThingListPanel($("#panel-things"));
    renderEditorPanel($("#panel-editor"));
    renderSpriteListPanel($("#panel-sprites"));

    initSplitters("#app-layout");
}

// Panel toggle state — kept in module scope; the View menu mutates it through
// togglePanel(id) below. The exit-criteria a11y pass uses aria-hidden too.
const PANEL_VISIBLE = {
    "panel-preview": true,
    "panel-things":  true,
    "panel-sprites": true,
};

export function togglePanel(panelId) {
    if (!(panelId in PANEL_VISIBLE)) return;
    const next = !PANEL_VISIBLE[panelId];
    PANEL_VISIBLE[panelId] = next;

    const $panel = $(`#${panelId}`);
    $panel.toggle(next).attr("aria-hidden", !next);

    // The splitter directly tied to this panel goes with it.
    $(`.app-splitter[data-resize="${panelId}"]`).toggle(next);
}

export function isPanelVisible(panelId) {
    return Boolean(PANEL_VISIBLE[panelId]);
}
