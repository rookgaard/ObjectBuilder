import { STRINGS } from "../strings.js";
import { EVENTS, getSelectedThing, on } from "../../store/index.js";

const $ = window.jQuery;

// ── tab specifications ─────────────────────────────────────────────
// Each tab declares its fields once; render() builds HTML and update()
// re-fills values when the selection changes. All controls are disabled
// in Stage 4 — actual editing arrives in Stage 6.

const TEXTURE_NUMBERS = [
    { id: "tex-width",  label: "Width",      min: 0, max: 16  },
    { id: "tex-height", label: "Height",     min: 0, max: 16  },
    { id: "tex-exact",  label: "Exact size", min: 0, max: 256 },
    { id: "tex-layers", label: "Layers",     min: 0, max: 16  },
    { id: "tex-px",     label: "Pattern X",  min: 0, max: 16  },
    { id: "tex-py",     label: "Pattern Y",  min: 0, max: 16  },
    { id: "tex-pz",     label: "Pattern Z",  min: 0, max: 16  },
    { id: "tex-frames", label: "Frames",     min: 1, max: 32  },
];

const TEXTURE_FIELD_KEYS = {
    "tex-width":  "width",
    "tex-height": "height",
    "tex-exact":  "exactSize",
    "tex-layers": "layers",
    "tex-px":     "patternX",
    "tex-py":     "patternY",
    "tex-pz":     "patternZ",
    "tex-frames": "frames",
};

// Properties tab — checkbox + dependent numeric inputs.
const PROPERTY_GROUPS = [
    { check: { id: "prop-isGround",     field: "isGround",     label: "Is ground" },
      nums:  [{ id: "prop-groundSpeed", field: "groundSpeed",  label: "Ground speed", min: 0, max: 9999 }] },

    { check: { id: "prop-hasLight",     field: "hasLight",     label: "Has light" },
      nums:  [{ id: "prop-lightLevel", field: "lightLevel",   label: "Light level", min: 0, max: 15 },
              { id: "prop-lightColor", field: "lightColor",   label: "Light color", min: 0, max: 255 }] },

    { check: { id: "prop-hasOffset",    field: "hasOffset",    label: "Has offset" },
      nums:  [{ id: "prop-offsetX", field: "offsetX", label: "Offset X", min: 0, max: 64 },
              { id: "prop-offsetY", field: "offsetY", label: "Offset Y", min: 0, max: 64 }] },

    { check: { id: "prop-hasElevation", field: "hasElevation", label: "Has elevation" },
      nums:  [{ id: "prop-elevation",  field: "elevation",   label: "Elevation", min: 0, max: 64 }] },

    { check: { id: "prop-miniMap",      field: "miniMap",      label: "Mini-map" },
      nums:  [{ id: "prop-miniMapColor", field: "miniMapColor", label: "Mini-map color", min: 0, max: 255 }] },

    { check: { id: "prop-isLensHelp",   field: "isLensHelp",   label: "Lens help" },
      nums:  [{ id: "prop-lensHelp",   field: "lensHelp",    label: "Lens help value", min: 0, max: 65535 }] },

    { check: { id: "prop-writable",     field: "writable",     label: "Writable" },
      nums:  [{ id: "prop-maxTextLen",  field: "maxTextLength", label: "Max text length", min: 0, max: 65535 }] },

    { check: { id: "prop-writableOnce", field: "writableOnce", label: "Writable once" },
      nums:  [] },
];

// Gen-3 flag checkbox list. (Stage 10 will gate per-version.)
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

// ── render -----------------------------------------------------------

export function renderEditorPanel($host) {
    const $body = $(`
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
                <span class="editor-status" id="editor-status">Read-only — editing arrives in Stage 6.</span>
                <button type="button" class="button" disabled>${STRINGS.editor.save}</button>
                <button type="button" class="button" disabled>${STRINGS.editor.close}</button>
            </div>
        </div>
    `);

    $host.empty().append($body);

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

    refreshFromSelection();
    on(EVENTS.SELECTION_CHANGE, refreshFromSelection);
    on(EVENTS.PROJECT_CHANGE,   refreshFromSelection);
}

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
            <h4>Sprite index (first 16)</h4>
            <div class="form-grid form-grid--two-col" id="sprite-index-preview">
                <p class="form-field__label">Select an object to populate.</p>
            </div>
        </div>
    `;
}

function renderPropertiesTab() {
    const blocks = PROPERTY_GROUPS.map((g) => `
        <div class="form-section property-group">
            ${checkboxField(g.check)}
            ${g.nums.length ? `<div class="form-grid form-grid--two-col">${g.nums.map((n) => numberField(n)).join("")}</div>` : ""}
        </div>
    `).join("");
    return blocks;
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

// ── refresh from the current selection ─────────────────────────────

function refreshFromSelection() {
    const thing = getSelectedThing();
    const $status = $("#editor-status");

    if (!thing) {
        $status.text("No selection.");
        clearAllInputs();
        return;
    }

    $status.text(`Read-only — ${thing.category} ${thing.id}`);

    // Texture numerics
    for (const f of TEXTURE_NUMBERS) {
        const key = TEXTURE_FIELD_KEYS[f.id];
        $(`#${f.id}`).val(thing[key] ?? 0);
    }

    // Animation
    $("#anim-isAnimation").prop("checked", Boolean(thing.isAnimation));
    $("#anim-mode").val(thing.animationMode ?? 0);
    $("#anim-loopCount").val(thing.loopCount ?? 0);
    $("#anim-startFrame").val(thing.startFrame ?? 0);

    // Sprite index preview (first 16 entries — keeps the panel cheap)
    const idx = thing.spriteIndex || [];
    const slots = idx.slice(0, 16).map((id, i) =>
        `<div class="form-field"><span class="form-field__label">[${i}]</span>` +
        `<input type="number" class="control control--numeric" value="${id}" disabled></div>`
    ).join("");
    $("#sprite-index-preview").html(slots || `<p class="form-field__label">No sprite index.</p>`);

    // Properties
    for (const g of PROPERTY_GROUPS) {
        $(`#${g.check.id}`).prop("checked", Boolean(thing[g.check.field]));
        for (const n of g.nums) {
            $(`#${n.id}`).val(thing[n.field] ?? 0);
        }
    }

    // Flags
    for (const [key] of FLAG_FIELDS) {
        $(`#flag-${key}`).prop("checked", Boolean(thing[key]));
    }
}

function clearAllInputs() {
    for (const f of TEXTURE_NUMBERS) $(`#${f.id}`).val("");
    $("#anim-isAnimation").prop("checked", false);
    $("#anim-mode, #anim-loopCount, #anim-startFrame").val("");
    $("#sprite-index-preview").html(`<p class="form-field__label">No selection.</p>`);
    for (const g of PROPERTY_GROUPS) {
        $(`#${g.check.id}`).prop("checked", false);
        for (const n of g.nums) $(`#${n.id}`).val("");
    }
    for (const [key] of FLAG_FIELDS) $(`#flag-${key}`).prop("checked", false);
}
