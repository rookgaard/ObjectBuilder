import { STRINGS } from "../strings.js";
import {
    EVENTS,
    getState,
    getSelectedThing,
    setSelectedSpriteId,
    on,
} from "../../store/index.js";
import { argbToImageData } from "../../core/sprites/spritePixels.js";

const $ = window.jQuery;

const PLACEHOLDER_COUNT = 60;

export function renderSpriteListPanel($host) {
    $host.empty().append(`
        <div class="panel-body">
            <section class="panel-section panel-section--grow">
                <h3 class="panel-section__title" id="sprite-list-title">${STRINGS.panels.sprites}</h3>
                <div class="sprite-grid" id="sprite-grid" tabindex="0" aria-label="Sprite grid"></div>
            </section>

            <section class="panel-section">
                <label class="numeric-stepper">
                    <span class="numeric-stepper__label">Sprite ID</span>
                    <input type="number" min="0" value="1" id="sprite-id-input" class="control control--numeric">
                </label>
            </section>

            <section class="panel-section">
                <div class="button-row">
                    <button type="button" class="icon-button" title="Replace">⤺</button>
                    <button type="button" class="icon-button" title="Import">⤓</button>
                    <button type="button" class="icon-button" title="Export">⤒</button>
                    <button type="button" class="icon-button" title="Copy">⧉</button>
                    <button type="button" class="icon-button" title="Paste">⎘</button>
                    <button type="button" class="icon-button" title="New">＋</button>
                    <button type="button" class="icon-button" title="Remove">－</button>
                </div>
            </section>
        </div>
    `);

    refresh();

    $("#sprite-id-input").off("input.sprList")
        .on("input.sprList", function () {
            const id = Number($(this).val());
            if (Number.isFinite(id)) setSelectedSpriteId(id);
        });

    on(EVENTS.PROJECT_CHANGE, refresh);
    on(EVENTS.SELECTION_CHANGE, refresh);
}

function refresh() {
    const state = getState();
    const project = state.project;
    const $grid = $("#sprite-grid").empty();
    const $title = $("#sprite-list-title");

    if (!project) {
        for (let i = 0; i < PLACEHOLDER_COUNT; i++) {
            $("<div>").addClass("sprite-grid__cell").text(i + 1).appendTo($grid);
        }
        $title.text(STRINGS.panels.sprites);
        return;
    }

    // Show sprite slots referenced by the currently-selected thing.
    const thing = getSelectedThing();
    const ids = thing?.spriteIndex ?? [];
    $title.text(thing
        ? `${STRINGS.panels.sprites} (${ids.length} slot${ids.length === 1 ? "" : "s"})`
        : STRINGS.panels.sprites);

    if (ids.length === 0) {
        $("<p>").addClass("preview-canvas__hint").text("Select a thing to see its sprites.").appendTo($grid);
        return;
    }

    for (let slot = 0; slot < ids.length; slot++) {
        const id = ids[slot];
        const $cell = $("<div>")
            .addClass("sprite-grid__cell sprite-grid__cell--has-canvas")
            .attr("title", `slot ${slot} → sprite ${id}`)
            .attr("data-id", id);

        const canvas = document.createElement("canvas");
        canvas.width = 32;
        canvas.height = 32;
        canvas.className = "sprite-grid__canvas";

        const pixels = project.spr.getSpritePixels(id);
        if (pixels) {
            canvas.getContext("2d").putImageData(argbToImageData(pixels), 0, 0);
        }

        $cell.append(canvas);
        $cell.append($("<span class='sprite-grid__id'></span>").text(id));
        $grid.append($cell);
    }
}
