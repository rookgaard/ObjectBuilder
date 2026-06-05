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

const DIRECTIONS = {
    outfit: {
        n:  { x: 0, y: 0 },
        e:  { x: 1, y: 0 },
        s:  { x: 2, y: 0 },
        w:  { x: 3, y: 0 },
    },
    missile: {
        nw: { x: 0, y: 0 },
        n:  { x: 1, y: 0 },
        ne: { x: 2, y: 0 },
        w:  { x: 0, y: 1 },
        e:  { x: 2, y: 1 },
        sw: { x: 0, y: 2 },
        s:  { x: 1, y: 2 },
        se: { x: 2, y: 2 },
    },
};

let tdv = null; // ThingDataView instance, recreated per host mount.

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

                <div class="preview-controls" id="preview-controls" hidden>
                    <div class="preview-control-group" id="prev-direction-group" hidden>
                        <div class="preview-control-title">Direction</div>
                        <div class="preview-direction-pad">
                            <button type="button" class="icon-button preview-direction-btn" data-dir="nw" data-diagonal="1" title="Northwest">↖</button>
                            <button type="button" class="icon-button preview-direction-btn" data-dir="n" title="North">↑</button>
                            <button type="button" class="icon-button preview-direction-btn" data-dir="ne" data-diagonal="1" title="Northeast">↗</button>
                            <button type="button" class="icon-button preview-direction-btn" data-dir="w" title="West">←</button>
                            <span class="preview-direction-pad__center"></span>
                            <button type="button" class="icon-button preview-direction-btn" data-dir="e" title="East">→</button>
                            <button type="button" class="icon-button preview-direction-btn" data-dir="sw" data-diagonal="1" title="Southwest">↙</button>
                            <button type="button" class="icon-button preview-direction-btn" data-dir="s" title="South">↓</button>
                            <button type="button" class="icon-button preview-direction-btn" data-dir="se" data-diagonal="1" title="Southeast">↘</button>
                        </div>
                    </div>

                    <div class="preview-control-group" id="prev-pose-group" hidden>
                        <div class="preview-control-title">
                            <span>Pose</span>
                        </div>
                        <div class="preview-controls__row">
                            <button type="button" class="icon-button preview-pose-btn is-active" data-pose="0">Stand</button>
                            <button type="button" class="icon-button preview-pose-btn" data-pose="1">Walking</button>
                        </div>
                    </div>

                    <div class="preview-control-group" id="prev-frame-group" hidden>
                        <div class="preview-control-title">
                            <span>Frame</span>
                            <span class="preview-control-count" id="prev-frame-count">1/1</span>
                        </div>
                        <div class="preview-controls__row preview-controls__row--range">
                            <button type="button" class="icon-button" id="prev-playpause" title="Play / Pause">▶</button>
                            <button type="button" class="icon-button" id="prev-prev" title="Previous frame">⏮</button>
                            <input type="range" class="preview-range" id="prev-frame" value="0" min="0" max="0">
                            <button type="button" class="icon-button" id="prev-next" title="Next frame">⏭</button>
                        </div>
                    </div>

                    <div class="preview-control-group" id="prev-addon-group" hidden>
                        <div class="preview-control-title">
                            <span>Addon</span>
                            <span class="preview-control-count" id="prev-addon-count">1/1</span>
                        </div>
                        <input type="range" class="preview-range" id="prev-addon" value="0" min="0" max="0">
                    </div>

                    <div class="preview-control-group" id="prev-mount-group" hidden>
                        <div class="preview-control-title">
                            <span id="prev-mount-label">Mount</span>
                            <span class="preview-control-count" id="prev-mount-count">1/1</span>
                        </div>
                        <input type="range" class="preview-range" id="prev-mount" value="0" min="0" max="0">
                    </div>

                    <div class="preview-control-group" id="prev-layer-group" hidden>
                        <label class="preview-control-title" for="prev-layer">
                            <span>Layer</span>
                        </label>
                        <select class="control" id="prev-layer"></select>
                    </div>

                    <div class="preview-control-group" id="prev-variant-group" hidden>
                        <div class="preview-control-title">Variant</div>
                        <div class="preview-controls__row preview-controls__patterns">
                            <label>X <input type="number" class="control control--numeric" id="prev-px" value="0" min="0"></label>
                            <label>Y <input type="number" class="control control--numeric" id="prev-py" value="0" min="0"></label>
                            <label>Z <input type="number" class="control control--numeric" id="prev-pz" value="0" min="0"></label>
                        </div>
                    </div>
                </div>
            </section>
        </div>
    `);

    tdv = createThingDataView($("#preview-canvas"));
    tdv.onChange(syncPreviewControls);

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

    const $controls = $("#preview-controls");
    $controls.off(".preview");

    $controls.on("click.preview", ".preview-direction-btn", function () {
        setDirection(String($(this).data("dir")));
    });

    $controls.on("click.preview", ".preview-pose-btn", function () {
        tdv?.setPose(Number($(this).data("pose")));
    });

    $controls.on("click.preview", "#prev-playpause", () => {
        if (!tdv) return;
        if (tdv.isPlaying) tdv.stop(); else tdv.play();
    });

    $controls.on("click.preview", "#prev-prev", () => {
        if (!tdv?.thing) return;
        const t = tdv.thing;
        const f = (tdv.coords.frame - 1 + t.frames) % Math.max(1, t.frames);
        tdv.setFrame(f);
    });

    $controls.on("click.preview", "#prev-next", () => {
        if (!tdv?.thing) return;
        const t = tdv.thing;
        const f = (tdv.coords.frame + 1) % Math.max(1, t.frames);
        tdv.setFrame(f);
    });

    $controls.on("input.preview", "#prev-frame", function () {
        tdv?.setFrame(Number($(this).val()));
    });
    $controls.on("input.preview", "#prev-addon", function () {
        tdv?.setPatternY(Number($(this).val()));
    });
    $controls.on("input.preview", "#prev-mount", function () {
        tdv?.setPatternZ(Number($(this).val()));
    });
    $controls.on("change.preview", "#prev-layer", function () {
        const value = String($(this).val());
        tdv?.setLayer(value === "all" ? null : Number(value));
    });
    $controls.on("input.preview", "#prev-px", function () {
        tdv?.setPatternX(Number($(this).val()));
    });
    $controls.on("input.preview", "#prev-py", function () {
        tdv?.setPatternY(Number($(this).val()));
    });
    $controls.on("input.preview", "#prev-pz", function () {
        tdv?.setPatternZ(Number($(this).val()));
    });
}

function setDirection(dir) {
    if (!tdv?.thing) return;
    const thing = tdv.thing;
    const map = DIRECTIONS[thing.category]?.[dir];
    if (!map) return;

    tdv.setPatternX(map.x);
    if (thing.category === "missile") {
        tdv.setPatternY(map.y);
    }
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
    syncPreviewControls();
}

function syncPreviewControls() {
    if (!tdv) return;

    const thing = tdv.thing;
    const rawThing = tdv.rawThing;
    const coords = tdv.coords;
    const groupType = tdv.groupType;
    const $controls = $("#preview-controls");

    if (!thing) {
        $controls.prop("hidden", true);
        return;
    }

    const isOutfit = thing.category === "outfit";
    const isMissile = thing.category === "missile";
    const frameCount = Math.max(1, thing.frames | 0);
    const layerCount = Math.max(1, thing.layers | 0);
    const hasPose = isOutfit && Array.isArray(rawThing?.frameGroups) && rawThing.frameGroups.length > 1;
    const showDirection = isOutfit || isMissile;
    const showFrame = frameCount > 1;
    const showAddon = isOutfit && thing.patternY > 1;
    const showMount = thing.patternZ > 1;
    const showLayer = layerCount > 1;
    const showVariant = !showDirection && (
        thing.patternX > 1 || thing.patternY > 1 || thing.patternZ > 1
    );

    $("#prev-pose-group").prop("hidden", !hasPose);
    $("#prev-pose-group .preview-pose-btn").removeClass("is-active");
    $(`#prev-pose-group .preview-pose-btn[data-pose="${groupType ?? 0}"]`).addClass("is-active");

    $("#prev-direction-group")
        .prop("hidden", !showDirection)
        .toggleClass("is-outfit", isOutfit)
        .toggleClass("is-missile", isMissile);
    $("#prev-direction-group [data-diagonal]")
        .toggleClass("is-direction-hidden", isOutfit)
        .prop("disabled", isOutfit);
    $("#prev-direction-group .preview-direction-btn").removeClass("is-active");
    const activeDir = directionFromCoords(thing, coords);
    if (activeDir) {
        $(`#prev-direction-group [data-dir="${activeDir}"]`).addClass("is-active");
    }

    $("#prev-frame-group").prop("hidden", !showFrame);
    $("#prev-frame").attr("max", Math.max(0, frameCount - 1)).val(coords.frame);
    $("#prev-frame-count").text(`${coords.frame + 1}/${frameCount}`);
    $("#prev-prev, #prev-next").prop("disabled", !showFrame);
    $("#prev-playpause")
        .prop("disabled", !thing.isAnimation || !showFrame)
        .text(tdv.isPlaying ? "⏸" : "▶");

    syncRange("#prev-addon", "#prev-addon-count", thing.patternY, coords.patternY);
    $("#prev-addon-group").prop("hidden", !showAddon);

    $("#prev-mount-label").text(isOutfit ? "Mount" : "Pattern Z");
    syncRange("#prev-mount", "#prev-mount-count", thing.patternZ, coords.patternZ);
    $("#prev-mount-group").prop("hidden", !showMount);

    syncLayerOptions(layerCount, coords.layer);
    $("#prev-layer-group").prop("hidden", !showLayer);

    $("#prev-variant-group").prop("hidden", !showVariant);
    $("#prev-px").attr("max", Math.max(0, thing.patternX - 1)).val(coords.patternX);
    $("#prev-py").attr("max", Math.max(0, thing.patternY - 1)).val(coords.patternY);
    $("#prev-pz").attr("max", Math.max(0, thing.patternZ - 1)).val(coords.patternZ);

    $controls.prop("hidden", !(
        hasPose || showDirection || showFrame || showAddon || showMount || showLayer || showVariant
    ));
}

function syncRange(inputSelector, countSelector, count, value) {
    const max = Math.max(1, count | 0);
    const current = Math.min(max - 1, Math.max(0, value | 0));
    $(inputSelector).attr("max", max - 1).val(current);
    $(countSelector).text(`${current + 1}/${max}`);
}

function syncLayerOptions(layerCount, selectedLayer) {
    const $layer = $("#prev-layer");
    if (Number($layer.data("layerCount")) !== layerCount) {
        const options = ['<option value="all">All</option>'];
        for (let i = 0; i < layerCount; i++) {
            options.push(`<option value="${i}">Layer ${i + 1}</option>`);
        }
        $layer.html(options.join(""));
        $layer.data("layerCount", layerCount);
    }
    $layer.val(selectedLayer == null ? "all" : String(selectedLayer));
}

function directionFromCoords(thing, coords) {
    const map = DIRECTIONS[thing.category];
    if (!map) return null;

    for (const [dir, pos] of Object.entries(map)) {
        if (thing.category === "outfit" && pos.x === coords.patternX) {
            return dir;
        }
        if (pos.x === coords.patternX && pos.y === coords.patternY) {
            return dir;
        }
    }
    return null;
}
