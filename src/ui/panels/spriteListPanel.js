import { STRINGS } from "../strings.js";

const $ = window.jQuery;

export function renderSpriteListPanel($host) {
    const $body = $(`
        <div class="panel-body">
            <section class="panel-section panel-section--grow">
                <h3 class="panel-section__title">${STRINGS.panels.sprites}</h3>
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

    $host.empty().append($body);

    const $grid = $("#sprite-grid");
    for (let i = 0; i < 60; i++) {
        $("<div>")
            .addClass("sprite-grid__cell")
            .attr("title", `Sprite ${i + 1}`)
            .text(i + 1)
            .appendTo($grid);
    }
}
