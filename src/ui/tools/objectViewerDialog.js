// Object Viewer. AS3 reference: objectview.ObjectViewer.
// Browser version: load one or more OBD files, preview them, optionally import
// the selected OBD into the currently loaded project.

import { importObdData } from "../../app/obdProject.js";
import { getLzmaCodec } from "../../formats/obd/lzmaCodec.js";
import { decodeObd, isEmptySpritePixels } from "../../formats/obd/ObdCodec.js";
import { getState } from "../../store/index.js";
import { createThingDataView } from "../preview/ThingDataView.js";
import { showModal } from "../widgets/modal.js";

const $ = window.jQuery;

export async function showObjectViewerDialog() {
    const $body = $(`
        <div class="object-viewer">
            <section class="object-viewer__sidebar">
                <label class="form-field">
                    <span class="form-field__label">OBD files</span>
                    <input type="file" id="object-viewer-files" class="control"
                           accept=".obd,application/octet-stream" multiple>
                </label>
                <ul class="object-viewer__files" id="object-viewer-list"></ul>
            </section>
            <section class="object-viewer__main">
                <div class="object-viewer__toolbar">
                    <button type="button" class="button" id="object-viewer-prev" title="Previous">Previous</button>
                    <button type="button" class="button" id="object-viewer-import" title="Import selected OBD">Import</button>
                    <button type="button" class="button" id="object-viewer-next" title="Next">Next</button>
                    <label class="form-field form-field--inline object-viewer__background-toggle">
                        <input type="checkbox" id="object-viewer-bg-enabled">
                        <span>Background</span>
                    </label>
                    <input type="color" id="object-viewer-bg" class="object-viewer__color" value="#303030" disabled>
                    <label class="object-viewer__zoom">
                        <span>Zoom</span>
                        <input type="range" id="object-viewer-zoom" min="1" max="5" step="0.1" value="2">
                    </label>
                </div>
                <div class="object-viewer__preview" id="object-viewer-preview"></div>
                <dl class="object-viewer__info" id="object-viewer-info"></dl>
                <div class="object-viewer__status" id="object-viewer-status">Pick OBD files to begin.</div>
            </section>
        </div>
    `);

    const tdv = createThingDataView($body.find("#object-viewer-preview"));
    const records = [];
    let selectedIndex = -1;
    let decodeToken = 0;
    tdv.onChange(syncCanvasScale);

    function setStatus(message) {
        $body.find("#object-viewer-status").text(message);
    }

    function renderList() {
        const $list = $body.find("#object-viewer-list").empty();
        if (records.length === 0) {
            $list.append('<li class="object-viewer__empty">No files selected.</li>');
        } else {
            records.forEach((record, index) => {
                const stateClass = record.error ? " has-error" : "";
                const activeClass = index === selectedIndex ? " is-active" : "";
                $list.append(`
                    <li>
                        <button type="button"
                                class="object-viewer__file${stateClass}${activeClass}"
                                data-index="${index}">
                            <span>${escapeHtml(record.file.name)}</span>
                            <small>${record.data ? describeThing(record.data) : (record.error ? "error" : "not loaded")}</small>
                        </button>
                    </li>
                `);
            });
        }
        syncButtons();
    }

    function syncButtons() {
        const hasSelection = selectedIndex >= 0 && selectedIndex < records.length;
        $body.find("#object-viewer-prev").prop("disabled", !hasSelection || selectedIndex === 0);
        $body.find("#object-viewer-next").prop("disabled", !hasSelection || selectedIndex === records.length - 1);
        $body.find("#object-viewer-import").prop("disabled", !hasSelection || !records[selectedIndex]?.data);
    }

    async function selectRecord(index) {
        if (index < 0 || index >= records.length) return;
        selectedIndex = index;
        renderList();
        setStatus("Loading OBD...");
        tdv.setThing(null, null);
        renderInfo(null);

        const token = ++decodeToken;
        const record = records[index];
        try {
            if (!record.data) {
                const bytes = new Uint8Array(await record.file.arrayBuffer());
                const codec = await getLzmaCodec();
                record.data = await decodeObd(bytes, codec);
                record.preview = buildObdPreviewSource(record.data);
            }
            if (token !== decodeToken) return;
            tdv.setThing(record.preview.thing, record.preview.spr);
            renderInfo(record.data);
            setStatus(`${record.file.name} loaded.`);
        } catch (err) {
            record.error = err;
            record.data = null;
            record.preview = null;
            if (token !== decodeToken) return;
            tdv.setThing(null, null);
            renderInfo(null);
            setStatus(`OBD load failed: ${err.message}`);
        } finally {
            renderList();
        }
    }

    function renderInfo(data) {
        const $info = $body.find("#object-viewer-info").empty();
        if (!data?.thing) return;
        const thing = data.thing;
        const rows = [
            ["Name", records[selectedIndex]?.file.name || ""],
            ["Category", thing.category],
            ["Client", formatClientVersion(data.clientVersion)],
            ["OBD", formatObdVersion(data.obdVersion)],
            ["Size", `${thing.width}x${thing.height}`],
            ["Layers", thing.layers],
            ["Patterns", `${thing.patternX}x${thing.patternY}x${thing.patternZ}`],
            ["Frames", thing.frames],
            ["Sprites", countObdSprites(data)],
        ];
        for (const [label, value] of rows) {
            $info.append(`<dt>${escapeHtml(label)}</dt><dd>${escapeHtml(value)}</dd>`);
        }
    }

    function syncPreviewStyle() {
        const bgEnabled = $body.find("#object-viewer-bg-enabled").is(":checked");
        const bg = $body.find("#object-viewer-bg").val() || "#303030";
        $body.find("#object-viewer-bg").prop("disabled", !bgEnabled);
        $body.find("#object-viewer-preview")
            .css("--object-viewer-bg", bgEnabled ? bg : "transparent");
        syncCanvasScale();
    }

    function syncCanvasScale() {
        const zoom = Number($body.find("#object-viewer-zoom").val()) || 1;
        const canvas = $body.find("#object-viewer-preview .tdv__canvas")[0];
        if (!canvas) return;
        canvas.style.width = `${canvas.width * zoom}px`;
        canvas.style.height = `${canvas.height * zoom}px`;
    }

    $body.find("#object-viewer-files").on("change", function () {
        records.length = 0;
        for (const file of Array.from(this.files || [])) {
            records.push({ file, data: null, preview: null, error: null });
        }
        selectedIndex = records.length ? 0 : -1;
        renderList();
        if (selectedIndex >= 0) selectRecord(selectedIndex);
        else {
            tdv.setThing(null, null);
            renderInfo(null);
            setStatus("Pick OBD files to begin.");
        }
    });

    $body.on("click", "[data-index]", function () {
        selectRecord(Number($(this).data("index")));
    });
    $body.find("#object-viewer-prev").on("click", () => selectRecord(selectedIndex - 1));
    $body.find("#object-viewer-next").on("click", () => selectRecord(selectedIndex + 1));
    $body.find("#object-viewer-import").on("click", () => {
        const record = records[selectedIndex];
        if (!record?.data) return;
        try {
            if (!getState().project) throw new Error("No project loaded.");
            const out = importObdData(record.data);
            setStatus(`Imported ${out.category} ${out.id}; ${out.spritesAdded} sprite${out.spritesAdded === 1 ? "" : "s"} added.`);
        } catch (err) {
            setStatus(`Import failed: ${err.message}`);
        }
    });
    $body.find("#object-viewer-zoom, #object-viewer-bg-enabled, #object-viewer-bg")
        .on("input change", syncPreviewStyle);

    renderList();
    syncPreviewStyle();

    await showModal({
        title: "Object Viewer",
        body: $body,
        buttons: [{ label: "Close", value: null, primary: true }],
    });
    tdv.stop();
}

export function buildObdPreviewSource(data) {
    if (!data?.thing) throw new Error("Missing OBD thing data.");
    const thing = data.thing.clone();
    const spritePixels = new Map();
    let nextId = 1;

    if (data.sprites && !Array.isArray(data.sprites) && typeof data.sprites === "object") {
        for (const key of Object.keys(data.sprites)) {
            const groupType = Number(key);
            const group = thing.frameGroups?.[groupType];
            if (!group) continue;
            group.spriteIndex = remapSpriteSlots(data.sprites[key], spritePixels, () => nextId++);
            if (groupType === 0) thing.spriteIndex = group.spriteIndex;
        }
        if (!thing.spriteIndex && thing.frameGroups?.length) {
            const first = thing.frameGroups.find(Boolean);
            if (first) thing.spriteIndex = first.spriteIndex;
        }
    } else {
        thing.spriteIndex = remapSpriteSlots(data.sprites || [], spritePixels, () => nextId++);
    }

    return {
        thing,
        spr: {
            getSpritePixels(id) {
                return spritePixels.get(id) || null;
            },
        },
    };
}

function remapSpriteSlots(sprites, spritePixels, nextId) {
    return (sprites || []).map((sprite) => {
        const pixels = sprite?.pixels;
        if (isEmptySpritePixels(pixels)) return 0;
        const id = nextId();
        spritePixels.set(id, pixels);
        return id;
    });
}

function describeThing(data) {
    const t = data.thing;
    return `${t.category} ${formatClientVersion(data.clientVersion)}`;
}

function countObdSprites(data) {
    if (Array.isArray(data.sprites)) return data.sprites.length;
    if (!data.sprites || typeof data.sprites !== "object") return 0;
    return Object.values(data.sprites).reduce((sum, list) => sum + (Array.isArray(list) ? list.length : 0), 0);
}

function formatClientVersion(value) {
    if (!Number.isFinite(Number(value))) return "";
    return (Number(value) / 100).toFixed(2);
}

function formatObdVersion(value) {
    if (!Number.isFinite(Number(value))) return "";
    return (Number(value) / 100).toFixed(2);
}

function escapeHtml(value) {
    return String(value)
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;");
}
