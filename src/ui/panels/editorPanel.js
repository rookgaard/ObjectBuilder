import { STRINGS } from "../strings.js";
import {
    EVENTS,
    getState,
    getSelectedThing,
    replaceThing,
    pushEdit,
    on,
} from "../../store/index.js";
import { ThingType } from "../../core/things/ThingType.js";

const $ = window.jQuery;

// ── tab specifications ─────────────────────────────────────────────

const TEXTURE_NUMBERS = [
    { id: "tex-width",  field: "width",     label: "Width",      min: 0, max: 16  },
    { id: "tex-height", field: "height",    label: "Height",     min: 0, max: 16  },
    { id: "tex-exact",  field: "exactSize", label: "Exact size", min: 0, max: 256 },
    { id: "tex-layers", field: "layers",    label: "Layers",     min: 0, max: 16  },
    { id: "tex-px",     field: "patternX",  label: "Pattern X",  min: 0, max: 16  },
    { id: "tex-py",     field: "patternY",  label: "Pattern Y",  min: 0, max: 16  },
    { id: "tex-pz",     field: "patternZ",  label: "Pattern Z",  min: 0, max: 16  },
    { id: "tex-frames", field: "frames",    label: "Frames",     min: 1, max: 32  },
];

const PROPERTY_GROUPS = [
    { check: { id: "prop-isGround",     field: "isGround",     label: "Is ground" },
      nums:  [{ id: "prop-groundSpeed", field: "groundSpeed",  label: "Ground speed", min: 0, max: 9999 }] },
    { check: { id: "prop-hasLight",     field: "hasLight",     label: "Has light" },
      nums:  [{ id: "prop-lightLevel", field: "lightLevel",   label: "Light level", min: 0, max: 15 },
              { id: "prop-lightColor", field: "lightColor",   label: "Light color", min: 0, max: 255 }] },
    { check: { id: "prop-hasOffset",    field: "hasOffset",    label: "Has offset" },
      nums:  [{ id: "prop-offsetX", field: "offsetX", label: "Offset X", min: -32768, max: 32767 },
              { id: "prop-offsetY", field: "offsetY", label: "Offset Y", min: -32768, max: 32767 }] },
    { check: { id: "prop-hasElevation", field: "hasElevation", label: "Has elevation" },
      nums:  [{ id: "prop-elevation",  field: "elevation",   label: "Elevation", min: 0, max: 64 }] },
    { check: { id: "prop-miniMap",      field: "miniMap",      label: "Mini-map" },
      nums:  [{ id: "prop-miniMapColor", field: "miniMapColor", label: "Mini-map color", min: 0, max: 255 }] },
    { check: { id: "prop-isLensHelp",   field: "isLensHelp",   label: "Lens help" },
      nums:  [{ id: "prop-lensHelp",   field: "lensHelp",    label: "Lens help value", min: 0, max: 65535 }] },
    { check: { id: "prop-writable",     field: "writable",     label: "Writable" },
      nums:  [{ id: "prop-maxRWChars",  field: "maxReadWriteChars", label: "Max read/write chars", min: 0, max: 65535 }] },
    { check: { id: "prop-writableOnce", field: "writableOnce", label: "Writable once" },
      nums:  [{ id: "prop-maxRChars",   field: "maxReadChars",      label: "Max read chars",       min: 0, max: 65535 }] },
];

const FLAG_FIELDS = [
    ["isGroundBorder", "Ground border"],
    ["isOnBottom",     "On bottom"],
    ["isOnTop",        "On top"],
    ["isContainer",    "Container"],
    ["stackable",      "Stackable"],
    ["forceUse",       "Force use"],
    ["multiUse",       "Multi use"],
    ["isFluidContainer", "Fluid container"],
    ["isFluid",        "Fluid"],
    ["isUnpassable",   "Unpassable"],
    ["isUnmoveable",   "Unmoveable"],
    ["blockMissile",   "Blocks missile"],
    ["blockPathfind",  "Blocks pathfinder"],
    ["pickupable",     "Pickupable"],
    ["hangable",       "Hangable"],
    ["isHorizontal",   "Horizontal wall"],
    ["isVertical",     "Vertical wall"],
    ["rotatable",      "Rotatable"],
    ["isLyingObject",  "Lying object"],
    ["animateAlways",  "Animate always"],
    ["isFullGround",   "Full ground"],
    ["floorChange",    "Floor change"],
];

// ── editor state ───────────────────────────────────────────────────

let draft = null;        // ThingType clone being edited
let draftDirty = false;
let originalSnapshot = null; // pristine clone used to detect dirty + revert

// ── render -----------------------------------------------------------

export function renderEditorPanel($host) {
    $host.empty().append(`
        <div class="panel-body editor-panel">
            <nav class="editor-tabs" role="tablist">
                <button type="button" class="editor-tabs__tab is-active" role="tab" data-tab="texture"    aria-selected="true">${STRINGS.editor.tabs.texture}</button>
                <button type="button" class="editor-tabs__tab"            role="tab" data-tab="properties" aria-selected="false">${STRINGS.editor.tabs.properties}</button>
                <button type="button" class="editor-tabs__tab"            role="tab" data-tab="flags"      aria-selected="false">${STRINGS.editor.tabs.flags}</button>
            </nav>

            <div class="editor-tab-body editor-tab-body--texture is-active" role="tabpanel" data-tab="texture">
                ${renderTextureTab()}
            </div>
            <div class="editor-tab-body editor-tab-body--properties" role="tabpanel" data-tab="properties" hidden>
                ${renderPropertiesTab()}
            </div>
            <div class="editor-tab-body editor-tab-body--flags" role="tabpanel" data-tab="flags" hidden>
                ${renderFlagsTab()}
            </div>

            <div class="editor-actions">
                <span class="editor-status" id="editor-status">No selection.</span>
                <button type="button" class="button" id="editor-save"  disabled>${STRINGS.editor.save}</button>
                <button type="button" class="button" id="editor-close" disabled>${STRINGS.editor.close}</button>
            </div>
        </div>
    `);

    $host.on("click", ".editor-tabs__tab", function () {
        const tab = $(this).data("tab");
        $host.find(".editor-tabs__tab")
            .removeClass("is-active")
            .attr("aria-selected", "false");
        $(this).addClass("is-active").attr("aria-selected", "true");
        $host.find(".editor-tab-body").each(function () {
            const isActive = $(this).data("tab") === tab;
            $(this).toggleClass("is-active", isActive).prop("hidden", !isActive);
        });
    });

    bindEditHandlers($host);
    bindActionButtons();
    syncFromSelection();

    on(EVENTS.SELECTION_CHANGE, syncFromSelection);
    on(EVENTS.PROJECT_CHANGE,   syncFromSelection);
}

// Adopt the currently selected thing as the new editable draft. If the
// previous draft was dirty we discard it (Stage 6 baseline; an "are you
// sure?" alert is a Stage 13 polish item).
function syncFromSelection() {
    const thing = getSelectedThing();
    if (!thing) {
        draft = null;
        draftDirty = false;
        originalSnapshot = null;
        populateInputs(null);
        updateStatus("No selection.");
        return;
    }

    if (draftDirty && draft && draft.id === thing.id && draft.category === thing.category) {
        // Same thing, dirty draft — keep edits.
        populateInputs(draft);
        return;
    }

    draft = thing.clone();
    originalSnapshot = thing.clone();
    draftDirty = false;
    populateInputs(draft);
    updateStatus(`Editing ${thing.category} ${thing.id}`);
}

function populateInputs(thing) {
    if (!thing) {
        for (const f of TEXTURE_NUMBERS) $(`#${f.id}`).val("").prop("disabled", true);
        $("#anim-isAnimation").prop("checked", false).prop("disabled", true);
        $("#anim-mode, #anim-loopCount, #anim-startFrame").val("").prop("disabled", true);
        $("#sprite-index-preview").html(`<p class="form-field__label">No selection.</p>`);
        for (const g of PROPERTY_GROUPS) {
            $(`#${g.check.id}`).prop("checked", false).prop("disabled", true);
            for (const n of g.nums) $(`#${n.id}`).val("").prop("disabled", true);
        }
        for (const [key] of FLAG_FIELDS) $(`#flag-${key}`).prop("checked", false).prop("disabled", true);
        $("#editor-save, #editor-close").prop("disabled", true);
        return;
    }

    // Texture numerics
    for (const f of TEXTURE_NUMBERS) $(`#${f.id}`).val(thing[f.field] ?? 0).prop("disabled", false);

    // Animation
    $("#anim-isAnimation").prop("checked", Boolean(thing.isAnimation)).prop("disabled", false);
    $("#anim-mode").val(thing.animationMode ?? 0).prop("disabled", false);
    $("#anim-loopCount").val(thing.loopCount ?? 0).prop("disabled", false);
    $("#anim-startFrame").val(thing.startFrame ?? 0).prop("disabled", false);

    // Sprite index preview (read-only, edits land in Stage 8)
    const idx = thing.spriteIndex || [];
    const slots = idx.slice(0, 16).map((id, i) =>
        `<div class="form-field"><span class="form-field__label">[${i}]</span>` +
        `<input type="number" class="control control--numeric" value="${id}" disabled></div>`
    ).join("");
    $("#sprite-index-preview").html(slots || `<p class="form-field__label">No sprite index.</p>`);

    // Properties
    for (const g of PROPERTY_GROUPS) {
        $(`#${g.check.id}`).prop("checked", Boolean(thing[g.check.field])).prop("disabled", false);
        for (const n of g.nums) {
            $(`#${n.id}`).val(thing[n.field] ?? 0).prop("disabled", false);
        }
    }

    // Flags
    for (const [key] of FLAG_FIELDS) {
        $(`#flag-${key}`).prop("checked", Boolean(thing[key])).prop("disabled", false);
    }

    refreshActionButtons();
}

function bindEditHandlers($host) {
    // Texture numerics
    for (const f of TEXTURE_NUMBERS) {
        $(`#${f.id}`).off("input.editor").on("input.editor", function () {
            const v = clamp(Number($(this).val()), f.min, f.max);
            applyEdit(f.field, v);
        });
    }
    // Animation
    $("#anim-isAnimation").off("change.editor").on("change.editor", function () {
        applyEdit("isAnimation", $(this).is(":checked"));
    });
    $("#anim-mode").off("input.editor").on("input.editor", function () {
        applyEdit("animationMode", Number($(this).val()) | 0);
    });
    $("#anim-loopCount").off("input.editor").on("input.editor", function () {
        applyEdit("loopCount", Number($(this).val()) | 0);
    });
    $("#anim-startFrame").off("input.editor").on("input.editor", function () {
        applyEdit("startFrame", Number($(this).val()) | 0);
    });

    // Property groups (check + nums)
    for (const g of PROPERTY_GROUPS) {
        $(`#${g.check.id}`).off("change.editor").on("change.editor", function () {
            applyEdit(g.check.field, $(this).is(":checked"));
        });
        for (const n of g.nums) {
            $(`#${n.id}`).off("input.editor").on("input.editor", function () {
                applyEdit(n.field, clamp(Number($(this).val()), n.min, n.max));
            });
        }
    }

    // Flags
    for (const [key] of FLAG_FIELDS) {
        $(`#flag-${key}`).off("change.editor").on("change.editor", function () {
            applyEdit(key, $(this).is(":checked"));
        });
    }
}

function bindActionButtons() {
    $("#editor-save").off("click").on("click", saveDraft);
    $("#editor-close").off("click").on("click", closeDraft);
}

function applyEdit(field, value) {
    if (!draft) return;
    if (draft[field] === value) return;
    draft[field] = value;
    draftDirty = !valuesEqualToSnapshot();
    updateStatus(`Editing ${draft.category} ${draft.id}${draftDirty ? " *" : ""}`);
    refreshActionButtons();
}

function valuesEqualToSnapshot() {
    if (!draft || !originalSnapshot) return true;
    const keys = [
        ...TEXTURE_NUMBERS.map((f) => f.field),
        "isAnimation", "animationMode", "loopCount", "startFrame",
        ...PROPERTY_GROUPS.flatMap((g) => [g.check.field, ...g.nums.map((n) => n.field)]),
        ...FLAG_FIELDS.map(([k]) => k),
    ];
    for (const k of keys) {
        if (draft[k] !== originalSnapshot[k]) return false;
    }
    return true;
}

function saveDraft() {
    if (!draft || !draftDirty) return;
    const before = originalSnapshot;
    const after  = draft.clone();
    replaceThing(draft.category, after);

    pushEdit("thing-edit", { category: after.category, id: after.id, before, after });

    originalSnapshot = after.clone();
    draftDirty = false;
    updateStatus(`Saved ${after.category} ${after.id}`);
    refreshActionButtons();
}

function closeDraft() {
    if (!draft || !originalSnapshot) return;
    draft = originalSnapshot.clone();
    draftDirty = false;
    populateInputs(draft);
    updateStatus(`Reverted ${draft.category} ${draft.id}`);
}

function refreshActionButtons() {
    $("#editor-save").prop("disabled", !draftDirty);
    $("#editor-close").prop("disabled", !draft);
}

function updateStatus(msg) {
    $("#editor-status").text(msg).toggleClass("is-dirty", Boolean(draftDirty));
}

function clamp(v, min, max) {
    if (!Number.isFinite(v)) return min;
    return Math.min(max, Math.max(min, v));
}

// ── tab markup helpers ─────────────────────────────────────────────

function renderTextureTab() {
    const fields = TEXTURE_NUMBERS.map((f) => numberField(f)).join("");
    return `
        <div class="form-grid">${fields}</div>
        <div class="form-section">
            <h4>Animation</h4>
            <div class="form-grid form-grid--two-col">
                ${checkboxField({ id: "anim-isAnimation", label: "Animated" })}
                ${numberField({ id: "anim-mode",       label: "Animation mode", min: 0, max: 1 })}
                ${numberField({ id: "anim-loopCount",  label: "Loop count",     min: -1, max: 9999 })}
                ${numberField({ id: "anim-startFrame", label: "Start frame",    min: 0, max: 32 })}
            </div>
        </div>
        <div class="form-section">
            <h4>Sprite index (first 16, read-only)</h4>
            <div class="form-grid form-grid--two-col" id="sprite-index-preview">
                <p class="form-field__label">Select an object to populate.</p>
            </div>
        </div>
    `;
}

function renderPropertiesTab() {
    return PROPERTY_GROUPS.map((g) => `
        <div class="form-section property-group">
            ${checkboxField(g.check)}
            ${g.nums.length ? `<div class="form-grid form-grid--two-col">${g.nums.map((n) => numberField(n)).join("")}</div>` : ""}
        </div>
    `).join("");
}

function renderFlagsTab() {
    return `
        <div class="form-grid form-grid--two-col">
            ${FLAG_FIELDS.map(([id, label]) => checkboxField({ id: `flag-${id}`, label })).join("")}
        </div>
    `;
}

function numberField({ id, label, min = 0, max = 9999 }) {
    return `
        <label class="form-field">
            <span class="form-field__label">${label}</span>
            <input type="number" class="control control--numeric" id="${id}"
                   min="${min}" max="${max}" value="" disabled>
        </label>
    `;
}

function checkboxField({ id, label }) {
    return `
        <label class="form-field form-field--inline">
            <input type="checkbox" id="${id}" disabled>
            <span class="form-field__label">${label}</span>
        </label>
    `;
}

// --- exposed for the undo applier (wired from src/app/main.js) -----

export function applyUndoEntry(kind, payload, direction) {
    if (kind !== "thing-edit") return;
    const thing = direction === "undo" ? payload.before : payload.after;
    replaceThing(payload.category, thing.clone());
}

export { ThingType }; // re-export so consumers can construct fresh instances
