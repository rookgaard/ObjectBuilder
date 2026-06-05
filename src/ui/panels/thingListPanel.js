import { STRINGS } from "../strings.js";
import { MOCK_THINGS } from "../../app/mockData.js";
import {
    EVENTS,
    getState,
    listFor,
    countFor,
    minIdFor,
    maxIdFor,
    setSelectedThingId,
    on,
    pushEdit,
} from "../../store/index.js";
import { createVirtualList } from "../widgets/virtualList.js";
import { addThing, duplicateThing, removeThing } from "../../store/index.js";
import { exportSelectedThingToObd, importObdFromFilePicker } from "../../app/obdProject.js";
import { drawFrame, compositeSize } from "../preview/SpriteSheet.js";

const $ = window.jQuery;

const ROW_HEIGHT = 41;
const THUMB_SIZE = 32;

// Module-scoped because there's one Object panel per app.
let vlist = null;
let mode  = null; // "real" | "mock" — we recreate the renderer when this flips

export function renderThingListPanel($host) {
    $host.empty().append(`
        <div class="panel-body">
            <section class="panel-section panel-section--grow">
                <h3 class="panel-section__title" id="thing-list-title">${STRINGS.panels.objects}</h3>
                <div class="thing-list-host" id="thing-list-host" tabindex="0" role="listbox" aria-label="Object list"></div>
            </section>

            <section class="panel-section">
                <label class="numeric-stepper">
                    <span class="numeric-stepper__label">ID</span>
                    <input type="number" min="0" value="0" id="thing-id-input" class="control control--numeric">
                </label>
            </section>

            <section class="panel-section">
                <div class="button-row">
                    <button type="button" class="icon-button" title="Replace (TODO)">⤺</button>
                    <button type="button" class="icon-button" id="thing-btn-import" title="Import OBD">⤓</button>
                    <button type="button" class="icon-button" id="thing-btn-export" title="Export selected as OBD">⤒</button>
                    <button type="button" class="icon-button" title="Edit (select & edit in middle panel)">✎</button>
                    <button type="button" class="icon-button" id="thing-btn-duplicate" title="Duplicate selected">⎘</button>
                    <button type="button" class="icon-button" id="thing-btn-new"       title="New (blank)">＋</button>
                    <button type="button" class="icon-button" id="thing-btn-remove"    title="Remove selected">－</button>
                </div>
            </section>
        </div>
    `);

    rebuildList();
    bindControls();

    on(EVENTS.PROJECT_CHANGE,   () => rebuildList());
    on(EVENTS.SELECTION_CHANGE, () => syncListWithState());
}

function bindControls() {
    const $hostEl = $("#thing-list-host");

    // Numeric stepper. While typing, allow transient values like "3" / "30"
    // for item ids; clamp only when the user commits the field.
    $("#thing-id-input").off(".thingList")
        .on("input.thingList", function () {
            const text = String($(this).val()).trim();
            if (!/^\d+$/.test(text)) return;

            const raw = Number(text);
            const cat = getState().selectedCategory;
            const min = minIdFor(cat);
            const max = Math.max(min, maxIdFor(cat));
            if (raw >= min && raw <= max) {
                setSelectedThingId(raw);
            }
        })
        .on("change.thingList blur.thingList", function () {
            commitThingIdInput($(this));
        })
        .on("keydown.thingList", function (e) {
            if (e.key === "Enter") {
                e.preventDefault();
                commitThingIdInput($(this));
            } else if (e.key === "Escape") {
                $(this).val(getState().selectedThingId ?? "");
            }
        });

    // Add / duplicate / remove buttons
    $("#thing-btn-new").off("click").on("click", () => {
        const cat = getState().selectedCategory;
        const newId = addThing(cat);
        if (newId) pushEdit("thing-add", { category: cat, id: newId });
    });
    $("#thing-btn-duplicate").off("click").on("click", () => {
        const s = getState();
        if (s.selectedThingId == null) return;
        const newId = duplicateThing(s.selectedCategory, s.selectedThingId);
        if (newId) pushEdit("thing-add", { category: s.selectedCategory, id: newId, source: s.selectedThingId });
    });
    $("#thing-btn-remove").off("click").on("click", () => {
        const s = getState();
        if (s.selectedThingId == null) return;
        const before = removeThing(s.selectedCategory, s.selectedThingId);
        if (before) pushEdit("thing-remove", { category: s.selectedCategory, id: before.id, before });
    });
    $("#thing-btn-export").off("click").on("click", async () => {
        const $status = $(".app-status");
        try {
            $status.text("Exporting OBD...");
            const out = await exportSelectedThingToObd();
            $status.text(`Exported ${out.filename} (${out.bytes.length} B).`);
        } catch (err) {
            console.error("[thingList] OBD export failed", err);
            $status.text(`OBD export failed: ${err.message}`);
        }
    });
    $("#thing-btn-import").off("click").on("click", async () => {
        const $status = $(".app-status");
        try {
            $status.text("Importing OBD...");
            const out = await importObdFromFilePicker();
            if (!out) {
                $status.text("OBD import cancelled.");
                return;
            }
            $status.text(
                `Imported ${out.category} ${out.id} from OBD; ` +
                `${out.spritesAdded} sprite${out.spritesAdded === 1 ? "" : "s"} added.`
            );
        } catch (err) {
            console.error("[thingList] OBD import failed", err);
            $status.text(`OBD import failed: ${err.message}`);
        }
    });

    // Keyboard navigation on the focused list.
    $hostEl.off("keydown.thingList").on("keydown.thingList", (e) => {
        if (!vlist || vlist.total <= 0) return;
        const cur = vlist.selectedIndex;
        const last = vlist.total - 1;
        let next = cur;
        switch (e.key) {
            case "ArrowDown": next = Math.min(last, (cur < 0 ? 0 : cur + 1)); break;
            case "ArrowUp":   next = Math.max(0,    (cur < 0 ? 0 : cur - 1)); break;
            case "PageDown":  next = Math.min(last, (cur < 0 ? 0 : cur + 10)); break;
            case "PageUp":    next = Math.max(0,    (cur < 0 ? 0 : cur - 10)); break;
            case "Home":      next = 0; break;
            case "End":       next = last; break;
            default: return;
        }
        e.preventDefault();
        if (next !== cur) {
            setSelectedThingId(indexToId(next));
        }
    });
}

function commitThingIdInput($input) {
    const raw = Number($input.val());
    const cat = getState().selectedCategory;
    const min = minIdFor(cat);
    const max = Math.max(min, maxIdFor(cat));
    if (!Number.isFinite(raw)) {
        $input.val(getState().selectedThingId ?? min);
        return;
    }
    const clamped = Math.min(max, Math.max(min, Math.floor(raw)));
    $input.val(clamped);
    setSelectedThingId(clamped);
}

function rebuildList() {
    const $hostEl = $("#thing-list-host");
    const $title  = $("#thing-list-title");
    const $input  = $("#thing-id-input");

    const state    = getState();
    const project  = state.project;
    const category = state.selectedCategory;

    if (project) {
        const map = listFor(project.dat, category);
        const min = minIdFor(category);
        const max = maxIdFor(category);
        const total = Math.max(0, max - min + 1);

        vlist = createVirtualList($hostEl, {
            rowHeight: ROW_HEIGHT,
            renderRow: (i) => {
                const id = min + i;
                const t = map.get(id);
                const label = t?.marketName ? ` - ${escapeHtml(t.marketName)}` : "";
                return `
                    <span class="thing-row-thumb">
                        <canvas class="thing-row-thumb__canvas" width="${THUMB_SIZE}" height="${THUMB_SIZE}"
                                data-thing-id="${id}" aria-hidden="true"></canvas>
                    </span>
                    <span class="vlist__row-id">${id}</span>
                    ${t ? `<span class="vlist__row-meta">${label}</span>` : `<span class="vlist__row-meta">(missing)</span>`}
                `;
            },
            afterRender: drawVisibleThumbnails,
        });
        vlist.onSelect((index) => setSelectedThingId(indexToId(index)));

        const selectedId = state.selectedThingId ?? min;
        const idx = Math.max(0, Math.min(total - 1, selectedId - min));
        vlist.setData(total, idx);
        vlist.scrollToIndex(idx, "center");

        const catLabel = STRINGS.categories[category] || category;
        $title.text(`${catLabel}s (${total}, ids ${min}–${max})`);

        $input.attr("min", min).attr("max", max).val(selectedId);
        mode = "real";
    } else {
        // Mock fallback (before any project loaded).
        const mockList = MOCK_THINGS[category] || [];
        vlist = createVirtualList($hostEl, {
            rowHeight: ROW_HEIGHT,
            renderRow: (i) => {
                const t = mockList[i];
                return `
                    <span class="thing-row-thumb thing-row-thumb--empty"></span>
                    <span class="vlist__row-id">${t.id}</span>
                    <span class="vlist__row-meta">— ${escapeHtml(t.name)}</span>
                `;
            },
        });
        vlist.onSelect((index) => setSelectedThingId(mockList[index].id));
        vlist.setData(mockList.length, mockList.length ? 0 : -1);
        const catLabel = STRINGS.categories[category] || category;
        $title.text(`${catLabel}s (${mockList.length} mock)`);
        $input.attr("min", 0).removeAttr("max").val(mockList[0]?.id ?? 0);
        mode = "mock";
    }
}

function drawVisibleThumbnails($rows) {
    const state = getState();
    const project = state.project;
    if (!project) return;

    const category = state.selectedCategory;
    const map = listFor(project.dat, category);

    $rows.find(".thing-row-thumb__canvas").each(function () {
        const id = Number(this.dataset.thingId);
        const thing = map.get(id);
        drawThingThumbnail(this, thing, project.spr);
    });
}

function drawThingThumbnail(canvas, thing, spr) {
    const ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, THUMB_SIZE, THUMB_SIZE);

    if (!thing || !spr || !thing.spriteIndex?.length) return;

    const size = compositeSize(thing);
    if (size.width <= 0 || size.height <= 0) return;

    const source = document.createElement("canvas");
    source.width = size.width;
    source.height = size.height;
    const sourceCtx = source.getContext("2d");
    drawFrame(sourceCtx, thing, spr, {
        patternX: thing.category === "outfit" && thing.patternX > 2 ? 2 : 0,
        patternY: 0,
        patternZ: 0,
        frame: 0,
    }, {
        drawBlendLayer: thing.category !== "outfit",
    });

    const scale = Math.min(THUMB_SIZE / source.width, THUMB_SIZE / source.height, 1);
    const width = Math.max(1, Math.round(source.width * scale));
    const height = Math.max(1, Math.round(source.height * scale));
    const x = Math.floor((THUMB_SIZE - width) / 2);
    const y = Math.floor((THUMB_SIZE - height) / 2);

    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(source, x, y, width, height);
}

function escapeHtml(value) {
    return String(value)
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;");
}

function syncListWithState() {
    const state = getState();
    const $input = $("#thing-id-input");

    if (!vlist) return;

    if (mode === "real") {
        const project = state.project;
        if (!project) { rebuildList(); return; }
        const category = state.selectedCategory;
        if ($("#thing-list-title").text().indexOf(STRINGS.categories[category]) === -1) {
            // Category changed → rebuild renderer for the new map.
            rebuildList();
            return;
        }
        const min = minIdFor(category);
        const idx = Math.max(0, Math.min(vlist.total - 1, (state.selectedThingId ?? min) - min));
        vlist.setSelectedIndex(idx);
        vlist.scrollToIndex(idx, "nearest");
        if (Number($input.val()) !== state.selectedThingId) {
            $input.val(state.selectedThingId);
        }
    } else {
        // mock — just re-render category lookup
        rebuildList();
    }
}

function indexToId(index) {
    const state = getState();
    if (mode === "real") {
        return minIdFor(state.selectedCategory) + index;
    }
    const list = MOCK_THINGS[state.selectedCategory] || [];
    return list[index]?.id ?? 0;
}
