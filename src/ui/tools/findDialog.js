// Find dialog — search the loaded project for ThingTypes matching a
// (boolean and/or numeric range) filter. AS3 reference: ob.components.FindWindow.
//
// Boolean filters use a tri-state: "any" / "true" / "false". Numeric filters
// accept min/max (both optional). Results list shows id + a short summary;
// clicking a row selects it in the main UI.

import { showModal } from "../widgets/modal.js";
import {
    getState,
    listFor,
    countFor,
    setSelectedCategory,
    setSelectedThingId,
} from "../../store/index.js";

const $ = window.jQuery;

const BOOL_FIELDS = [
    "isGround", "isGroundBorder", "isOnBottom", "isOnTop",
    "isContainer", "stackable", "forceUse", "multiUse",
    "writable", "writableOnce",
    "isFluidContainer", "isFluid",
    "isUnpassable", "isUnmoveable", "blockMissile", "blockPathfind",
    "pickupable", "hangable",
    "isVertical", "isHorizontal", "rotatable",
    "hasLight", "floorChange", "hasOffset", "hasElevation",
    "isLyingObject", "animateAlways",
    "miniMap", "isLensHelp", "isFullGround", "ignoreLook",
    "cloth", "isMarketItem", "hasDefaultAction",
    "wrappable", "unwrappable", "topEffect", "usable", "hasBones",
];

const NUM_FIELDS = [
    "groundSpeed", "lightLevel", "lightColor",
    "offsetX", "offsetY", "elevation",
    "miniMapColor", "lensHelp",
    "marketCategory", "marketTradeAs", "marketShowAs",
    "marketRestrictLevel",
];

export async function showFindDialog() {
    const project = getState().project;
    if (!project) {
        await showModal({
            title: "Find",
            body: $("<p>No project is loaded. Use File → Open first.</p>"),
            buttons: [{ label: "OK", value: null, primary: true }],
        });
        return null;
    }

    const $body = $(`
        <div class="form-grid" style="grid-template-columns: 1fr;">
            <label>
                <span>Category</span>
                <select id="find-category" class="control">
                    <option value="item">Item</option>
                    <option value="outfit">Outfit</option>
                    <option value="effect">Effect</option>
                    <option value="missile">Missile</option>
                </select>
            </label>

            <label>
                <span>ID range (inclusive)</span>
                <div style="display:flex; gap:6px;">
                    <input type="number" id="find-id-min" class="control control--numeric" placeholder="min">
                    <input type="number" id="find-id-max" class="control control--numeric" placeholder="max">
                </div>
            </label>

            <details>
                <summary>Boolean filters (any / true / false)</summary>
                <div class="form-grid form-grid--two-col" id="find-bools"></div>
            </details>

            <details>
                <summary>Numeric filters (min..max)</summary>
                <div class="form-grid form-grid--two-col" id="find-nums"></div>
            </details>

            <div class="form-section">
                <h4>Results</h4>
                <ul id="find-results" class="thing-list" style="max-height: 200px; overflow:auto;"></ul>
            </div>
        </div>
    `);

    const $bools = $body.find("#find-bools");
    for (const f of BOOL_FIELDS) {
        $bools.append(`
            <label class="form-field">
                <span class="form-field__label">${f}</span>
                <select class="control" data-bool="${f}">
                    <option value="any" selected>any</option>
                    <option value="true">true</option>
                    <option value="false">false</option>
                </select>
            </label>
        `);
    }

    const $nums = $body.find("#find-nums");
    for (const f of NUM_FIELDS) {
        $nums.append(`
            <label class="form-field">
                <span class="form-field__label">${f}</span>
                <div style="display:flex;gap:4px;">
                    <input type="number" class="control control--numeric" data-num-min="${f}" placeholder="min">
                    <input type="number" class="control control--numeric" data-num-max="${f}" placeholder="max">
                </div>
            </label>
        `);
    }

    $body.find("#find-category").val(getState().selectedCategory);

    function runSearch() {
        const cat = String($body.find("#find-category").val());
        const minId = numOrNull($body.find("#find-id-min").val());
        const maxId = numOrNull($body.find("#find-id-max").val());

        const boolFilters = [];
        $body.find("[data-bool]").each(function () {
            const v = $(this).val();
            if (v === "true")  boolFilters.push({ field: $(this).data("bool"), value: true });
            if (v === "false") boolFilters.push({ field: $(this).data("bool"), value: false });
        });

        const numFilters = [];
        for (const f of NUM_FIELDS) {
            const lo = numOrNull($body.find(`[data-num-min="${f}"]`).val());
            const hi = numOrNull($body.find(`[data-num-max="${f}"]`).val());
            if (lo !== null || hi !== null) numFilters.push({ field: f, lo, hi });
        }

        const proj = getState().project;
        const map = listFor(proj.dat, cat);
        const out = [];
        for (const [id, thing] of map) {
            if (minId !== null && id < minId) continue;
            if (maxId !== null && id > maxId) continue;
            let ok = true;
            for (const b of boolFilters) {
                if (Boolean(thing[b.field]) !== b.value) { ok = false; break; }
            }
            if (!ok) continue;
            for (const n of numFilters) {
                const v = Number(thing[n.field]) || 0;
                if (n.lo !== null && v < n.lo) { ok = false; break; }
                if (n.hi !== null && v > n.hi) { ok = false; break; }
            }
            if (ok) out.push({ id, thing });
            if (out.length >= 500) break; // cap for sanity
        }

        const $list = $body.find("#find-results").empty();
        if (out.length === 0) {
            $list.append('<li class="thing-list__item">No matches.</li>');
        } else {
            for (const { id, thing } of out) {
                const flags = pickActiveFlags(thing).slice(0, 4).join(", ");
                $list.append(
                    `<li class="thing-list__item" data-id="${id}" data-cat="${cat}">` +
                    `${id}${flags ? " — " + flags : ""}</li>`
                );
            }
            $list.find(".thing-list__item[data-id]").on("click", function () {
                const targetId = Number($(this).data("id"));
                const targetCat = String($(this).data("cat"));
                setSelectedCategory(targetCat);
                setSelectedThingId(targetId);
            });
        }
    }

    await showModal({
        title: `Find — ${countFor(project.dat, getState().selectedCategory)} entries in current category`,
        body: $body,
        buttons: [
            { label: "Close",  value: null },
            { label: "Search", value: "search", primary: true, onValidate: () => { runSearch(); return false; } },
            // "Search" stays open: onValidate returns false ⇒ modal doesn't close.
        ],
    });
    return null;
}

function numOrNull(v) {
    if (v === "" || v == null) return null;
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
}

function pickActiveFlags(t) {
    return BOOL_FIELDS.filter((f) => t[f]);
}
