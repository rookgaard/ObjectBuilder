import { STRINGS } from "../strings.js";
import { MOCK_CLIENT_INFO } from "../../app/mockData.js";
import {
    EVENTS,
    getState,
    setSelectedCategory,
    getSelectedThing,
    on,
} from "../../store/index.js";
import { createThingDataView } from "../preview/ThingDataView.js";

const $ = window.jQuery;

let tdv = null; // ThingDataView instance — recreated per host mount.

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
                <div class="preview-canvas" id="preview-canvas"></div>

                <div class="preview-controls" id="preview-controls">
                    <div class="preview-controls__row">
                        <button type="button" class="icon-button" id="prev-playpause" title="Play / Pause">⏯</button>
                        <button type="button" class="icon-button" id="prev-prev" title="Previous frame">⏮</button>
                        <button type="button" class="icon-button" id="prev-next" title="Next frame">⏭</button>
                    </div>
                    <div class="preview-controls__row preview-controls__patterns">
                        <label>pX <input type="number" class="control control--numeric" id="prev-px" value="0" min="0"></label>
                        <label>pY <input type="number" class="control control--numeric" id="prev-py" value="0" min="0"></label>
                        <label>pZ <input type="number" class="control control--numeric" id="prev-pz" value="0" min="0"></label>
                    </div>
                </div>
            </section>
        </div>
    `);

    tdv = createThingDataView($("#preview-canvas"));

    refreshFilesInfo();
    refreshThingDataView();
    bindControls();

    on(EVENTS.PROJECT_CHANGE, () => {
        refreshFilesInfo();
        refreshThingDataView();
    });
    on(EVENTS.SELECTION_CHANGE, () => {
        const cat = getState().selectedCategory;
        if ($("#category-select").val() !== cat) {
            $("#category-select").val(cat);
        }
        refreshThingDataView();
    });
}

function bindControls() {
    $("#category-select").off("change.preview").on("change.preview", function () {
        setSelectedCategory(String($(this).val()));
    });

    $("#prev-playpause").off("click").on("click", () => {
        if (!tdv) return;
        if (tdv.isPlaying) tdv.stop(); else tdv.play();
    });

    $("#prev-prev").off("click").on("click", () => {
        if (!tdv?.thing) return;
        const t = tdv.thing;
        const f = (tdv.coords.frame - 1 + t.frames) % Math.max(1, t.frames);
        tdv.setFrame(f);
    });

    $("#prev-next").off("click").on("click", () => {
        if (!tdv?.thing) return;
        const t = tdv.thing;
        const f = (tdv.coords.frame + 1) % Math.max(1, t.frames);
        tdv.setFrame(f);
    });

    $("#prev-px").off("input").on("input", function () { tdv?.setPatternX(Number($(this).val())); });
    $("#prev-py").off("input").on("input", function () { tdv?.setPatternY(Number($(this).val())); });
    $("#prev-pz").off("input").on("input", function () { tdv?.setPatternZ(Number($(this).val())); });
}

function refreshFilesInfo() {
    const p = getState().project;
    const info = p ? {
        valueStr:      p.version.valueStr,
        itemsCount:    p.dat.itemsCount,
        outfitsCount:  p.dat.outfitsCount,
        effectsCount:  p.dat.effectsCount,
        missilesCount: p.dat.missilesCount,
        spritesCount:  p.spr.spritesCount,
    } : { ...MOCK_CLIENT_INFO };

    $("#info-version").text(info.valueStr);
    $("#info-items").text(info.itemsCount);
    $("#info-outfits").text(info.outfitsCount);
    $("#info-effects").text(info.effectsCount);
    $("#info-missiles").text(info.missilesCount);
    $("#info-sprites").text(info.spritesCount);
}

function refreshThingDataView() {
    if (!tdv) return;
    const project = getState().project;
    const thing   = getSelectedThing();

    tdv.setThing(thing, project?.spr ?? null);

    // Sync pattern stepper bounds to the current thing.
    const t = thing || { patternX: 1, patternY: 1, patternZ: 1 };
    $("#prev-px").attr("max", Math.max(0, t.patternX - 1));
    $("#prev-py").attr("max", Math.max(0, t.patternY - 1));
    $("#prev-pz").attr("max", Math.max(0, t.patternZ - 1));
    const c = tdv.coords;
    $("#prev-px").val(c.patternX);
    $("#prev-py").val(c.patternY);
    $("#prev-pz").val(c.patternZ);
}
