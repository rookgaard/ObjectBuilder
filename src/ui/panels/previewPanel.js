import { STRINGS } from "../strings.js";
import { MOCK_CLIENT_INFO } from "../../app/mockData.js";

const $ = window.jQuery;

export function renderPreviewPanel($host) {
    const info = MOCK_CLIENT_INFO;

    const $body = $(`
        <div class="panel-body">
            <section class="panel-section files-info">
                <h3 class="panel-section__title">Files</h3>
                <dl class="files-info__list">
                    <dt>Version</dt><dd id="info-version">${info.valueStr}</dd>
                    <dt>Items</dt><dd id="info-items">${info.itemsCount}</dd>
                    <dt>Outfits</dt><dd id="info-outfits">${info.outfitsCount}</dd>
                    <dt>Effects</dt><dd id="info-effects">${info.effectsCount}</dd>
                    <dt>Missiles</dt><dd id="info-missiles">${info.missilesCount}</dd>
                    <dt>Sprites</dt><dd id="info-sprites">${info.spritesCount}</dd>
                </dl>
            </section>

            <section class="panel-section">
                <div class="category-row">
                    <select id="category-select" class="control">
                        <option value="item">${STRINGS.categories.item}</option>
                        <option value="outfit">${STRINGS.categories.outfit}</option>
                        <option value="effect">${STRINGS.categories.effect}</option>
                        <option value="missile">${STRINGS.categories.missile}</option>
                    </select>
                    <button type="button" class="icon-button" title="Toggle Object List" id="btn-toggle-objects">≡</button>
                </div>
            </section>

            <section class="panel-section panel-section--grow">
                <h3 class="panel-section__title">${STRINGS.panels.preview}</h3>
                <div class="preview-canvas" id="preview-canvas">
                    <canvas width="64" height="64" aria-label="Sprite preview"></canvas>
                    <p class="preview-canvas__hint">Selected thing renders here.</p>
                </div>
            </section>
        </div>
    `);

    $host.empty().append($body);
}
