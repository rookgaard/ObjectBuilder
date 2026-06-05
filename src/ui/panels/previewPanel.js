import { STRINGS } from "../strings.js";
import { MOCK_CLIENT_INFO } from "../../app/mockData.js";
import {
    EVENTS,
    getState,
    setSelectedCategory,
    getSelectedThing,
    on,
} from "../../store/index.js";
import { argbToImageData } from "../../core/sprites/spritePixels.js";

const $ = window.jQuery;

export function renderPreviewPanel($host) {
    $host.empty().append(`
        <div class="panel-body">
            <section class="panel-section files-info">
                <h3 class="panel-section__title">Files</h3>
                <dl class="files-info__list">
                    <dt>Version</dt><dd id="info-version"></dd>
                    <dt>Items</dt><dd id="info-items"></dd>
                    <dt>Outfits</dt><dd id="info-outfits"></dd>
                    <dt>Effects</dt><dd id="info-effects"></dd>
                    <dt>Missiles</dt><dd id="info-missiles"></dd>
                    <dt>Sprites</dt><dd id="info-sprites"></dd>
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
                    <canvas id="preview-canvas-el" width="32" height="32" aria-label="Sprite preview"></canvas>
                    <p class="preview-canvas__hint" id="preview-canvas-hint">Click "Load 7.72 (dev)" in the toolbar to load reference files.</p>
                </div>
            </section>
        </div>
    `);

    refreshFilesInfo();
    refreshPreview();

    $("#category-select").off("change.preview").on("change.preview", function () {
        setSelectedCategory(String($(this).val()));
    });

    on(EVENTS.PROJECT_CHANGE, () => {
        refreshFilesInfo();
        refreshPreview();
    });
    on(EVENTS.SELECTION_CHANGE, () => {
        const cat = getState().selectedCategory;
        if ($("#category-select").val() !== cat) {
            $("#category-select").val(cat);
        }
        refreshPreview();
    });
}

function refreshFilesInfo() {
    const p = getState().project;
    const info = p
        ? {
              valueStr:      p.version.valueStr,
              itemsCount:    p.dat.itemsCount,
              outfitsCount:  p.dat.outfitsCount,
              effectsCount:  p.dat.effectsCount,
              missilesCount: p.dat.missilesCount,
              spritesCount:  p.spr.spritesCount,
          }
        : { ...MOCK_CLIENT_INFO };

    $("#info-version").text(info.valueStr);
    $("#info-items").text(info.itemsCount);
    $("#info-outfits").text(info.outfitsCount);
    $("#info-effects").text(info.effectsCount);
    $("#info-missiles").text(info.missilesCount);
    $("#info-sprites").text(info.spritesCount);
}

function refreshPreview() {
    const canvas = document.getElementById("preview-canvas-el");
    if (!canvas) return;

    const project = getState().project;
    const thing   = getSelectedThing();
    const hint    = $("#preview-canvas-hint");

    const ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (!project || !thing) {
        hint.text(project
            ? `No selection.`
            : `Click "Load 7.72 (dev)" in the toolbar to load reference files.`);
        return;
    }

    const spriteId = thing.spriteIndex?.[0] ?? 0;
    if (!spriteId) {
        hint.text(`${thing.category} ${thing.id}: no sprite at slot 0.`);
        return;
    }

    const pixels = project.spr.getSpritePixels(spriteId);
    if (!pixels) {
        hint.text(`${thing.category} ${thing.id}: sprite ${spriteId} out of range.`);
        return;
    }

    const imageData = argbToImageData(pixels);
    ctx.putImageData(imageData, 0, 0);
    hint.text(`${thing.category} ${thing.id} → sprite ${spriteId}`);
}
