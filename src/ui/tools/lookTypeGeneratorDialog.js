// Look Type Generator. AS3 reference: otlib.components.LookGenerator.
// Generates the XML <look/> node used by OT server/client configs.

import { showModal } from "../widgets/modal.js";

const $ = window.jQuery;

const MAX_TYPE = 0xFFFFFF;
const MAX_COLOR = 132;
const COLOR_PARTS = ["head", "body", "legs", "feet"];

const DEFAULT_LOOK = {
    outfit: 0,
    item: 0,
    head: 0,
    body: 0,
    legs: 0,
    feet: 0,
    addons: 0,
    mount: 0,
    corpse: 0,
};

export async function showLookTypeGeneratorDialog() {
    let state = normalizeLookType(DEFAULT_LOOK);
    let activeColor = "head";

    const $body = $(`
        <div class="look-generator">
            <section class="look-generator__panel">
                <div class="form-grid form-grid--two-col">
                    <label class="form-field">
                        <span class="form-field__label">Type</span>
                        <input type="number" id="look-type" class="control control--numeric" min="0" max="${MAX_TYPE}">
                    </label>
                    <label class="form-field form-field--inline look-generator__checkbox">
                        <input type="checkbox" id="look-as-item">
                        <span>as item</span>
                    </label>
                    ${COLOR_PARTS.map((part) => `
                        <label class="form-field">
                            <span class="form-field__label">${capitalize(part)}</span>
                            <input type="number" id="look-${part}" class="control control--numeric"
                                   min="0" max="${MAX_COLOR}" data-color-input="${part}">
                        </label>
                    `).join("")}
                    <label class="form-field">
                        <span class="form-field__label">Addons</span>
                        <input type="number" id="look-addons" class="control control--numeric" min="0" max="3">
                    </label>
                    <label class="form-field">
                        <span class="form-field__label">Mount</span>
                        <input type="number" id="look-mount" class="control control--numeric" min="0" max="${MAX_TYPE}">
                    </label>
                    <label class="form-field">
                        <span class="form-field__label">Corpse</span>
                        <input type="number" id="look-corpse" class="control control--numeric" min="0" max="${MAX_TYPE}">
                    </label>
                </div>
            </section>

            <section class="look-generator__panel">
                <div class="look-generator__part-tabs" role="tablist" aria-label="Color part">
                    ${COLOR_PARTS.map((part) => `
                        <button type="button" class="button look-generator__part-tab" data-color-part="${part}">
                            ${capitalize(part)}
                        </button>
                    `).join("")}
                </div>
                <div class="look-generator__palette" id="look-palette"></div>
            </section>

            <section class="look-generator__panel">
                <label class="form-field">
                    <span class="form-field__label">XML</span>
                    <textarea id="look-xml" class="control look-generator__xml" readonly spellcheck="false"></textarea>
                </label>
                <div class="look-generator__actions">
                    <button type="button" class="button" id="look-copy">Copy</button>
                    <button type="button" class="button" id="look-paste">Paste XML</button>
                    <span class="look-generator__status" id="look-status"></span>
                </div>
            </section>
        </div>
    `);

    const $palette = $body.find("#look-palette");
    for (let i = 0; i <= MAX_COLOR; i++) {
        $palette.append(`
            <button type="button"
                    class="look-generator__swatch"
                    data-color-index="${i}"
                    title="color ${i}"
                    style="background:${hsiToHex(i)}"></button>
        `);
    }

    function syncControls() {
        const asItem = state.item !== 0;
        $body.find("#look-as-item").prop("checked", asItem);
        $body.find("#look-type").val(asItem ? state.item : state.outfit);
        for (const part of COLOR_PARTS) {
            $body.find(`#look-${part}`).val(state[part]);
        }
        $body.find("#look-addons").val(state.addons);
        $body.find("#look-mount").val(state.mount);
        $body.find("#look-corpse").val(state.corpse);
        $body.find("#look-xml").val(serializeLookType(state));
        syncPalette();
    }

    function syncPalette() {
        $body.find("[data-color-part]").toggleClass("is-active", function () {
            return $(this).data("color-part") === activeColor;
        });
        $body.find("[data-color-index]").toggleClass("is-selected", function () {
            return Number($(this).data("color-index")) === state[activeColor];
        });
    }

    function readControls() {
        const value = clampInt($body.find("#look-type").val(), 0, MAX_TYPE);
        const asItem = $body.find("#look-as-item").is(":checked");
        state.outfit = asItem ? 0 : value;
        state.item = asItem ? value : 0;
        for (const part of COLOR_PARTS) {
            state[part] = clampInt($body.find(`#look-${part}`).val(), 0, MAX_COLOR);
        }
        state.addons = clampInt($body.find("#look-addons").val(), 0, 3);
        state.mount = clampInt($body.find("#look-mount").val(), 0, MAX_TYPE);
        state.corpse = clampInt($body.find("#look-corpse").val(), 0, MAX_TYPE);
        state = normalizeLookType(state);
        syncControls();
    }

    $body.on("input change", "input", readControls);
    $body.on("click", "[data-color-part]", function () {
        activeColor = String($(this).data("color-part"));
        syncPalette();
    });
    $body.on("click", "[data-color-index]", function () {
        state[activeColor] = Number($(this).data("color-index"));
        syncControls();
    });
    $body.find("#look-copy").on("click", async () => {
        const xml = serializeLookType(state);
        if (!xml) { setStatus("No look type set."); return; }
        try {
            await writeClipboard(xml);
            setStatus("Copied.");
        } catch (err) {
            setStatus(`Copy failed: ${err.message}`);
        }
    });
    $body.find("#look-paste").on("click", async () => {
        try {
            const xml = await readClipboard();
            state = parseLookXml(xml);
            activeColor = "head";
            syncControls();
            setStatus("Pasted.");
        } catch (err) {
            setStatus(`Paste failed: ${err.message}`);
        }
    });

    function setStatus(message) {
        $body.find("#look-status").text(message);
    }

    syncControls();

    await showModal({
        title: "Look Type Generator",
        body: $body,
        buttons: [{ label: "Close", value: null, primary: true }],
    });
}

export function serializeLookType(input) {
    const look = normalizeLookType(input);
    const attrs = [];
    if (look.outfit !== 0) attrs.push(["type", look.outfit]);
    else if (look.item !== 0) attrs.push(["typeex", look.item]);
    else return "";

    for (const key of ["head", "body", "legs", "feet", "mount", "addons", "corpse"]) {
        if (look[key] !== 0) attrs.push([key, look[key]]);
    }
    return `<look ${attrs.map(([key, value]) => `${key}="${value}"`).join(" ")}/>`;
}

export function parseLookXml(xmlString) {
    const text = String(xmlString || "").trim();
    if (!text) throw new Error("XML is empty.");

    const doc = new DOMParser().parseFromString(text, "application/xml");
    if (doc.querySelector("parsererror")) {
        throw new Error("Invalid XML.");
    }

    const root = doc.documentElement;
    if (!root || root.localName !== "look") {
        throw new Error("Invalid look XML. Missing look tag.");
    }

    const out = { ...DEFAULT_LOOK };
    if (root.hasAttribute("type")) {
        out.outfit = attrInt(root, "type", 0, MAX_TYPE);
    } else if (root.hasAttribute("typeex")) {
        out.item = attrInt(root, "typeex", 0, MAX_TYPE);
    } else {
        throw new Error("Invalid look XML. Missing look type/typeex.");
    }

    for (const part of COLOR_PARTS) {
        if (root.hasAttribute(part)) out[part] = attrInt(root, part, 0, MAX_COLOR);
    }
    if (root.hasAttribute("addons")) out.addons = attrInt(root, "addons", 0, 3);
    if (root.hasAttribute("mount")) out.mount = attrInt(root, "mount", 0, MAX_TYPE);
    if (root.hasAttribute("corpse")) out.corpse = attrInt(root, "corpse", 0, MAX_TYPE);
    return normalizeLookType(out);
}

export function normalizeLookType(input) {
    const out = { ...DEFAULT_LOOK, ...(input || {}) };
    out.outfit = clampInt(out.outfit, 0, MAX_TYPE);
    out.item = out.outfit ? 0 : clampInt(out.item, 0, MAX_TYPE);
    for (const part of COLOR_PARTS) {
        out[part] = clampInt(out[part], 0, MAX_COLOR);
    }
    out.addons = clampInt(out.addons, 0, 3);
    out.mount = clampInt(out.mount, 0, MAX_TYPE);
    out.corpse = clampInt(out.corpse, 0, MAX_TYPE);
    return out;
}

export function hsiToRgb(color) {
    const values = 7;
    const steps = 19;
    let H = 0;
    let S = 0;
    let I = 0;
    let R = 0;
    let G = 0;
    let B = 0;

    color = clampInt(color, 0, steps * values - 1);

    if (color % steps === 0) {
        H = 0;
        S = 0;
        I = 1 - color / steps / values;
    } else {
        H = (color % steps) * (1 / 18);
        S = 1;
        I = 1;

        switch (Math.trunc(color / steps)) {
            case 0: S = 0.25; I = 1; break;
            case 1: S = 0.25; I = 0.75; break;
            case 2: S = 0.5; I = 0.75; break;
            case 3: S = 0.667; I = 0.75; break;
            case 4: S = 1; I = 1; break;
            case 5: S = 1; I = 0.75; break;
            case 6: S = 1; I = 0.5; break;
        }
    }

    if (I === 0) return 0x000000;
    if (S === 0) {
        const gray = Math.trunc(I * 0xFF);
        return (gray << 16) | (gray << 8) | gray;
    }

    if (H < 1 / 6) {
        R = I;
        B = I * (1 - S);
        G = B + (I - B) * 6 * H;
    } else if (H < 2 / 6) {
        G = I;
        B = I * (1 - S);
        R = G - (I - B) * (6 * H - 1);
    } else if (H < 3 / 6) {
        G = I;
        R = I * (1 - S);
        B = R + (I - R) * (6 * H - 2);
    } else if (H < 4 / 6) {
        B = I;
        R = I * (1 - S);
        G = B - (I - R) * (6 * H - 3);
    } else if (H < 5 / 6) {
        B = I;
        G = I * (1 - S);
        R = G + (I - G) * (6 * H - 4);
    } else {
        R = I;
        G = I * (1 - S);
        B = R - (I - G) * (6 * H - 5);
    }

    return (Math.trunc(R * 0xFF) << 16)
         | (Math.trunc(G * 0xFF) << 8)
         | Math.trunc(B * 0xFF);
}

function hsiToHex(color) {
    return `#${hsiToRgb(color).toString(16).padStart(6, "0")}`;
}

function attrInt(root, name, min, max) {
    return clampInt(root.getAttribute(name), min, max);
}

function clampInt(value, min, max) {
    const n = Number(value);
    if (!Number.isFinite(n)) return min;
    return Math.min(max, Math.max(min, Math.trunc(n)));
}

function capitalize(value) {
    return value.charAt(0).toUpperCase() + value.slice(1);
}

async function writeClipboard(text) {
    if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
        return;
    }
    const textarea = document.createElement("textarea");
    textarea.value = text;
    textarea.style.position = "fixed";
    textarea.style.left = "-9999px";
    document.body.append(textarea);
    textarea.select();
    try {
        if (!document.execCommand("copy")) throw new Error("clipboard API unavailable");
    } finally {
        textarea.remove();
    }
}

async function readClipboard() {
    if (!navigator.clipboard?.readText) {
        throw new Error("clipboard API unavailable");
    }
    return await navigator.clipboard.readText();
}
