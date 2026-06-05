import { STRINGS } from "../strings.js";

const $ = window.jQuery;

export function renderEditorPanel($host) {
    const $body = $(`
        <div class="panel-body editor-panel">
            <nav class="editor-tabs" role="tablist">
                <button type="button" class="editor-tabs__tab is-active" role="tab" data-tab="texture" aria-selected="true">${STRINGS.editor.tabs.texture}</button>
                <button type="button" class="editor-tabs__tab"            role="tab" data-tab="properties" aria-selected="false">${STRINGS.editor.tabs.properties}</button>
                <button type="button" class="editor-tabs__tab"            role="tab" data-tab="flags"      aria-selected="false">${STRINGS.editor.tabs.flags}</button>
            </nav>

            <div class="editor-tab-body editor-tab-body--texture is-active" role="tabpanel" data-tab="texture">
                ${textureTabHtml()}
            </div>
            <div class="editor-tab-body editor-tab-body--properties" role="tabpanel" data-tab="properties" hidden>
                ${propertiesTabHtml()}
            </div>
            <div class="editor-tab-body editor-tab-body--flags" role="tabpanel" data-tab="flags" hidden>
                ${flagsTabHtml()}
            </div>

            <div class="editor-actions">
                <button type="button" class="button" disabled>${STRINGS.editor.save}</button>
                <button type="button" class="button" disabled>${STRINGS.editor.close}</button>
            </div>
        </div>
    `);

    $host.empty().append($body);

    $host.find(".editor-tabs__tab").on("click", function () {
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
}

function textureTabHtml() {
    return `
        <div class="form-grid">
            ${numberField("Width", "tex-width", 1, 0, 16)}
            ${numberField("Height", "tex-height", 1, 0, 16)}
            ${numberField("Exact size", "tex-exact", 32, 0, 256)}
            ${numberField("Layers", "tex-layers", 1, 0, 16)}
            ${numberField("Pattern X", "tex-px", 1, 0, 16)}
            ${numberField("Pattern Y", "tex-py", 1, 0, 16)}
            ${numberField("Pattern Z", "tex-pz", 1, 0, 16)}
            ${numberField("Frames", "tex-frames", 1, 1, 32)}
        </div>
        <div class="form-section">
            <h4>Sprites</h4>
            <div class="sprite-slot-grid" id="sprite-slot-grid">
                <div class="sprite-grid__cell sprite-grid__cell--slot">1</div>
            </div>
        </div>
    `;
}

function propertiesTabHtml() {
    return `
        <div class="form-grid form-grid--two-col">
            ${checkboxField("Is ground", "prop-isGround")}
            ${numberField("Ground speed", "prop-groundSpeed", 100, 0, 9999)}

            ${checkboxField("Has light", "prop-hasLight")}
            ${numberField("Light level", "prop-lightLevel", 0, 0, 15)}
            ${numberField("Light color", "prop-lightColor", 0, 0, 255)}

            ${checkboxField("Has offset", "prop-hasOffset")}
            ${numberField("Offset X", "prop-offsetX", 0, 0, 64)}
            ${numberField("Offset Y", "prop-offsetY", 0, 0, 64)}

            ${checkboxField("Has elevation", "prop-hasElevation")}
            ${numberField("Elevation", "prop-elevation", 0, 0, 64)}

            ${checkboxField("Mini-map", "prop-miniMap")}
            ${numberField("Mini-map color", "prop-miniMapColor", 0, 0, 255)}

            ${checkboxField("Lens help", "prop-isLensHelp")}
            ${numberField("Lens help value", "prop-lensHelp", 0, 0, 65535)}

            ${checkboxField("Writable", "prop-writable")}
            ${checkboxField("Writable once", "prop-writableOnce")}
            ${numberField("Max text length", "prop-maxTextLength", 0, 0, 65535)}
        </div>
    `;
}

function flagsTabHtml() {
    const flags = [
        // Roughly the generation-3 flag list, plus the most common cross-gen flags.
        ["isGroundBorder", "Ground border"],
        ["isOnBottom", "On bottom"],
        ["isOnTop", "On top"],
        ["isContainer", "Container"],
        ["stackable", "Stackable"],
        ["forceUse", "Force use"],
        ["multiUse", "Multi use"],
        ["isFluidContainer", "Fluid container"],
        ["isFluid", "Fluid"],
        ["isUnpassable", "Unpassable"],
        ["isUnmoveable", "Unmoveable"],
        ["blockMissile", "Blocks missile"],
        ["blockPathfind", "Blocks pathfinder"],
        ["pickupable", "Pickupable"],
        ["hangable", "Hangable"],
        ["isHorizontal", "Horizontal wall"],
        ["isVertical", "Vertical wall"],
        ["rotatable", "Rotatable"],
        ["isLyingObject", "Lying object"],
        ["animateAlways", "Animate always"],
        ["isFullGround", "Full ground"],
        ["floorChange", "Floor change"],
    ];

    return `
        <div class="form-grid form-grid--two-col">
            ${flags.map(([key, label]) => checkboxField(label, `flag-${key}`)).join("")}
        </div>
    `;
}

function numberField(label, id, value, min, max) {
    return `
        <label class="form-field">
            <span class="form-field__label">${label}</span>
            <input type="number" class="control control--numeric" id="${id}"
                   value="${value}" min="${min}" max="${max}" disabled>
        </label>
    `;
}

function checkboxField(label, id) {
    return `
        <label class="form-field form-field--inline">
            <input type="checkbox" id="${id}" disabled>
            <span class="form-field__label">${label}</span>
        </label>
    `;
}
