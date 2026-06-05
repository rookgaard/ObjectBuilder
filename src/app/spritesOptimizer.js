// Sprite optimizer: deduplicate, drop empty/unused sprites, compact ids, and
// rewrite every ThingType spriteIndex to the new ids.

import { SPRITE_BYTES } from "../core/sprites/spriteRle.js";

const DEFAULT_OPTIONS = {
    deduplicate: true,
    removeUnused: true,
    removeEmpty: true,
};

export function buildSpriteOptimizationPlan(project, options = {}) {
    if (!project?.dat || !project?.spr) throw new Error("No project loaded.");
    const opts = { ...DEFAULT_OPTIONS, ...options };
    const spr = project.spr;
    const oldCount = spr.spritesCount | 0;
    const used = collectUsedSpriteIds(project.dat);
    const remap = new Map();
    const newSprites = [];
    const hashBuckets = new Map();
    let duplicateCount = 0;
    let unusedCount = 0;
    let emptyCount = 0;

    for (let id = 1; id <= oldCount; id++) {
        const isUsed = used.has(id);
        if (opts.removeUnused && !isUsed) {
            unusedCount++;
            continue;
        }

        const pixels = spr.getSpritePixels(id);
        if (!pixels || pixels.length !== SPRITE_BYTES || isEmptyPixels(pixels)) {
            if (opts.removeEmpty) {
                emptyCount++;
                continue;
            }
        }

        if (opts.deduplicate && pixels && pixels.length === SPRITE_BYTES && !isEmptyPixels(pixels)) {
            const existing = findDuplicate(hashBuckets, pixels);
            if (existing) {
                remap.set(id, existing.newId);
                duplicateCount++;
                continue;
            }
        }

        const newId = newSprites.length + 1;
        const copy = pixels && pixels.length === SPRITE_BYTES
            ? new Uint8Array(pixels)
            : new Uint8Array(SPRITE_BYTES);
        newSprites.push(copy);
        remap.set(id, newId);

        if (opts.deduplicate && !isEmptyPixels(copy)) {
            const hash = hashPixels(copy);
            if (!hashBuckets.has(hash)) hashBuckets.set(hash, []);
            hashBuckets.get(hash).push({ newId, pixels: copy });
        }
    }

    return {
        oldCount,
        newCount: newSprites.length,
        removedCount: oldCount - newSprites.length,
        duplicateCount,
        unusedCount,
        emptyCount,
        remap,
        newSprites,
    };
}

export function applySpriteOptimization(project, plan) {
    if (!project?.dat || !project?.spr) throw new Error("No project loaded.");
    if (!plan) throw new Error("Missing optimization plan.");

    rewriteDatSpriteIds(project.dat, plan.remap);

    if (typeof project.spr.replaceSprites === "function") {
        project.spr.replaceSprites(plan.newSprites);
    } else {
        project.spr.spritesCount = plan.newSprites.length;
        project.spr._overrides = new Map(plan.newSprites.map((pixels, i) => [i + 1, pixels]));
        project.spr._cache?.clear?.();
    }

    project.dirty = true;
    return plan;
}

export function collectUsedSpriteIds(dat) {
    const used = new Set();
    for (const thing of iterateThings(dat)) {
        collectSpriteIndex(thing.spriteIndex, used);
        if (Array.isArray(thing.frameGroups)) {
            for (const group of thing.frameGroups) {
                if (group) collectSpriteIndex(group.spriteIndex, used);
            }
        }
    }
    return used;
}

export function rewriteDatSpriteIds(dat, remap) {
    const seen = new Set();
    for (const thing of iterateThings(dat)) {
        rewriteSpriteIndex(thing.spriteIndex, remap, seen);
        if (Array.isArray(thing.frameGroups)) {
            for (const group of thing.frameGroups) {
                if (group) rewriteSpriteIndex(group.spriteIndex, remap, seen);
            }
        }
    }
}

function* iterateThings(dat) {
    for (const map of [dat.items, dat.outfits, dat.effects, dat.missiles]) {
        if (!map) continue;
        for (const thing of map.values()) yield thing;
    }
}

function collectSpriteIndex(ids, used) {
    if (!ids) return;
    for (const id of ids) {
        if (id > 0) used.add(id | 0);
    }
}

function rewriteSpriteIndex(ids, remap, seen) {
    if (!ids || seen.has(ids)) return;
    seen.add(ids);
    for (let i = 0; i < ids.length; i++) {
        const id = ids[i] | 0;
        ids[i] = id > 0 ? (remap.get(id) ?? 0) : 0;
    }
}

function findDuplicate(hashBuckets, pixels) {
    const bucket = hashBuckets.get(hashPixels(pixels));
    if (!bucket) return null;
    return bucket.find((entry) => pixelsEqual(entry.pixels, pixels)) || null;
}

function hashPixels(pixels) {
    let hash = 0x811c9dc5;
    for (let i = 0; i < pixels.length; i++) {
        hash = Math.imul(hash ^ pixels[i], 0x01000193);
    }
    return hash >>> 0;
}

function pixelsEqual(a, b) {
    if (!a || !b || a.length !== b.length) return false;
    for (let i = 0; i < a.length; i++) {
        if (a[i] !== b[i]) return false;
    }
    return true;
}

function isEmptyPixels(pixels) {
    if (!pixels) return true;
    for (let i = 0; i < pixels.length; i++) {
        if (pixels[i] !== 0) return false;
    }
    return true;
}
