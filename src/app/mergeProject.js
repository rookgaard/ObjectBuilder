// File → Merge — merge another client's DAT/SPR pair into the currently loaded
// project. AS3 reference: otlib.utils.ClientMerger + ObjectBuilder.mxml::mergeProject.
//
// Flow:
//   1. Load the second client (DatLoader + SprFile) into throwaway storage.
//   2. Optionally run the sprite optimizer on that source so we don't append
//      duplicate / empty / unused sprites.
//   3. Append every non-empty source sprite to the current SPR, building a
//      sourceSpriteId → newCurrentSpriteId map.
//   4. Remap every non-empty source object's spriteIndex (and per-FrameGroup
//      spriteIndex for outfits) to the new sprite ids, then append the object
//      to the end of the matching current DAT list.

import { loadDat, MIN_ITEM_ID, MIN_OUTFIT_ID, MIN_EFFECT_ID, MIN_MISSILE_ID } from "../formats/dat/DatLoader.js";
import { SprFile } from "../formats/spr/SprFile.js";
import { ITEM, OUTFIT, EFFECT, MISSILE } from "../core/things/ThingCategory.js";
import { FrameGroup } from "../core/animation/FrameGroup.js";
import { DEFAULT as FRAMEGROUP_DEFAULT } from "../core/animation/FrameGroupType.js";
import {
    applySpriteOptimization,
    buildSpriteOptimizationPlan,
} from "./spritesOptimizer.js";
import { getState, markProjectDirty } from "../store/index.js";

const U16_MAX = 0xFFFF;

/**
 * Browser entry point: parse the picked buffers as a second client, then merge
 * them into the active project. Marks the project dirty and notifies the store.
 *
 * @param {{datBuffer:ArrayBuffer, sprBuffer:ArrayBuffer, version:import("../core/Version.js").Version, options?:object, optimizeSprites?:boolean}} args
 * @returns {{itemsCount:number, outfitsCount:number, effectsCount:number, missilesCount:number, spritesCount:number}}
 */
export function mergeClientFiles({ datBuffer, sprBuffer, version, options = {}, optimizeSprites = true }) {
    const current = getState().project;
    if (!current) throw new Error("No project loaded");

    const source = {
        dat: loadDat(datBuffer, version, options),
        spr: new SprFile(sprBuffer, version, options),
    };

    const result = mergeClient(current, source, { optimizeSprites });

    // A single notify after the whole batch keeps the UI cheap (vs. per-thing).
    markProjectDirty();
    return result;
}

/**
 * Pure merge of `source` ({dat, spr}) into `current` ({dat, spr}). Mutates the
 * current project's DAT maps / counts and SPR storage in place. Returns the
 * per-category deltas (how many of each were appended).
 *
 * The work is split into a *plan* phase (which only mutates the throwaway
 * `source` object graph) and a *commit* phase (which touches `current`). All
 * overflow preflight checks run between the two, so a rejected merge never
 * leaves `current` half-mutated.
 *
 * NOTE: this is destructive to `source` — its ThingType spriteIndex arrays are
 * remapped and `id` / `category` reassigned. `source` is expected to be a
 * freshly-loaded, throwaway client.
 *
 * No store / DOM access here so it stays unit-testable.
 *
 * @param {{dat:object, spr:object}} current
 * @param {{dat:object, spr:object}} source
 * @param {{optimizeSprites?:boolean}} [opts]
 */
export function mergeClient(current, source, { optimizeSprites = true } = {}) {
    const oldItems    = current.dat.itemsCount    | 0;
    const oldOutfits  = current.dat.outfitsCount  | 0;
    const oldEffects  = current.dat.effectsCount  | 0;
    const oldMissiles = current.dat.missilesCount | 0;
    const oldSprites  = current.spr.spritesCount  | 0;

    if (optimizeSprites) {
        const plan = buildSpriteOptimizationPlan(source);
        applySpriteOptimization(source, plan);
    }

    // --- Plan phase: nothing on `current` is mutated yet. ---
    const { spriteIdMap, stagedPixels } = planSprites(source.spr, oldSprites);
    const planned = planObjects(current, source.dat, spriteIdMap);

    // --- Preflight: reject before committing if the result can't be encoded. ---
    const newSprites = oldSprites + stagedPixels.length;
    const spriteExtended = !!current.spr.extended && !!current.dat.extended;
    if (newSprites > U16_MAX && !spriteExtended) {
        throw new Error(
            `Merge would push the sprite count to ${newSprites}, past the ` +
            `65535 limit for a non-extended project. Open / compile this project ` +
            `as extended (v ≥ 9.60) before merging.`
        );
    }
    for (const category of [ITEM, OUTFIT, EFFECT, MISSILE]) {
        const projected = (current.dat[COUNT_KEY[category]] | 0) + countFor(planned, category);
        if (projected > U16_MAX) {
            throw new Error(`Merge would push the ${category} count to ${projected}, past the 65535 limit.`);
        }
    }

    // --- Commit phase: apply to `current`. Sprite ids line up with the plan. ---
    for (const pixels of stagedPixels) current.spr.addSprite(pixels);
    for (const { category, thing } of planned) {
        const countKey = COUNT_KEY[category];
        const newId = (current.dat[countKey] | 0) + 1;
        thing.id = newId;
        thing.category = category;
        current.dat[LIST_KEY[category]].set(newId, thing);
        current.dat[countKey] = newId;
    }

    return {
        itemsCount:    (current.dat.itemsCount    | 0) - oldItems,
        outfitsCount:  (current.dat.outfitsCount  | 0) - oldOutfits,
        effectsCount:  (current.dat.effectsCount  | 0) - oldEffects,
        missilesCount: (current.dat.missilesCount | 0) - oldMissiles,
        spritesCount:  (current.spr.spritesCount  | 0) - oldSprites,
    };
}

// Builds Map<sourceSpriteId, newCurrentSpriteId> and the ordered list of pixel
// buffers to append. Empty source sprites map to 0 and are not staged.
//
// Emptiness is decided from the decoded pixels (not SprFile.isEmpty), because
// after the optimizer runs the sprites live in the write overlay and
// SprFile.isEmpty() only inspects the on-disk table — it would read stale data.
function planSprites(sourceSpr, oldSpriteCount) {
    const spriteIdMap = new Map();
    const stagedPixels = [];
    const count = sourceSpr.spritesCount | 0;
    for (let id = 1; id <= count; id++) {
        const pixels = sourceSpr.getSpritePixels(id);
        if (!pixels || isAllZero(pixels)) {
            spriteIdMap.set(id, 0);
            continue;
        }
        spriteIdMap.set(id, oldSpriteCount + stagedPixels.length + 1);
        stagedPixels.push(pixels);
    }
    return { spriteIdMap, stagedPixels };
}

// Walks every source category, skips empty things, remaps each remaining
// thing's sprite ids (mutating the throwaway source object), and returns the
// ordered list of { category, thing } to append on commit.
function planObjects(current, sourceDat, spriteIdMap) {
    const useFrameGroups = !!current.dat.frameGroups;
    const planned = [];
    const lists = [
        [ITEM,    sourceDat.items,    MIN_ITEM_ID,    sourceDat.itemsCount],
        [OUTFIT,  sourceDat.outfits,  MIN_OUTFIT_ID,  sourceDat.outfitsCount],
        [EFFECT,  sourceDat.effects,  MIN_EFFECT_ID,  sourceDat.effectsCount],
        [MISSILE, sourceDat.missiles, MIN_MISSILE_ID, sourceDat.missilesCount],
    ];
    for (const [category, list, min, max] of lists) {
        if (!list) continue;
        for (let id = min; id <= max; id++) {
            const thing = list.get(id);
            if (!thing || thingIsEmpty(thing)) continue;
            remapThingSprites(thing, spriteIdMap);
            if (category === OUTFIT && useFrameGroups) normalizeOutfitGroups(thing);
            planned.push({ category, thing });
        }
    }
    return planned;
}

function countFor(planned, category) {
    let n = 0;
    for (const p of planned) if (p.category === category) n++;
    return n;
}

function isAllZero(pixels) {
    for (let i = 0; i < pixels.length; i++) {
        if (pixels[i] !== 0) return false;
    }
    return true;
}

const COUNT_KEY = {
    [ITEM]:    "itemsCount",
    [OUTFIT]:  "outfitsCount",
    [EFFECT]:  "effectsCount",
    [MISSILE]: "missilesCount",
};

const LIST_KEY = {
    [ITEM]:    "items",
    [OUTFIT]:  "outfits",
    [EFFECT]:  "effects",
    [MISSILE]: "missiles",
};

// Rewrites spriteIndex (and every FrameGroup spriteIndex) in place using the
// sourceSpriteId → newId map. A `seen` set guards against double-remapping the
// array shared between the root spriteIndex and frameGroups[0] (outfits 10.57+).
function remapThingSprites(thing, spriteIdMap) {
    const seen = new Set();
    remapSpriteArray(thing.spriteIndex, spriteIdMap, seen);
    if (Array.isArray(thing.frameGroups)) {
        for (const group of thing.frameGroups) {
            if (group) remapSpriteArray(group.spriteIndex, spriteIdMap, seen);
        }
    }
}

function remapSpriteArray(ids, spriteIdMap, seen) {
    if (!ids || seen.has(ids)) return;
    seen.add(ids);
    for (let i = 0; i < ids.length; i++) {
        const sid = ids[i] | 0;
        if (sid !== 0) ids[i] = spriteIdMap.get(sid) ?? 0;
    }
}

// A pre-10.57 source outfit has only root fields (no frameGroups). When merged
// into a frameGroups-enabled project the DAT writer expects at least one group,
// so synthesize a DEFAULT group mirroring the (already-remapped) root. The
// group shares the root spriteIndex array so the two never drift.
function normalizeOutfitGroups(thing) {
    if (Array.isArray(thing.frameGroups) && thing.frameGroups.filter(Boolean).length > 0) {
        return;
    }
    const g = new FrameGroup();
    g.type = FRAMEGROUP_DEFAULT;
    g.width = thing.width;
    g.height = thing.height;
    g.exactSize = thing.exactSize;
    g.layers = thing.layers;
    g.patternX = thing.patternX;
    g.patternY = thing.patternY;
    g.patternZ = thing.patternZ;
    g.frames = thing.frames;
    g.isAnimation = thing.isAnimation;
    g.animationMode = thing.animationMode;
    g.loopCount = thing.loopCount;
    g.startFrame = thing.startFrame;
    g.frameDurations = thing.frameDurations;
    g.spriteIndex = thing.spriteIndex; // shared reference — stays in sync
    thing.frameGroups = [g];
}

// Mirrors AS3 otlib.utils.ThingUtils.isEmpty: an object with no sprites, a
// single 0 sprite, or an all-zero outfit (12) / missile (9) layout is empty.
function thingIsEmpty(thing) {
    const idx = thing.spriteIndex;
    const length = idx ? idx.length : 0;
    if (length === 0) return true;
    if (length === 1 && idx[0] === 0) return true;
    if ((length === 12 && thing.category === OUTFIT) ||
        (length === 9 && thing.category === MISSILE)) {
        for (let i = length - 1; i >= 0; i--) {
            if (idx[i] !== 0) return false;
        }
        return true;
    }
    return false;
}
