// Tests for projectStore mutations (Stage 8): addThing / duplicateThing /
// removeThing + sprite add/remove via the SprFile overlay.

import { describe, it, assert, assertEqual } from "../runner.js";
import {
    EVENTS,
    setProject,
    getState,
    addThing,
    duplicateThing,
    replaceThing,
    removeThing,
    addSprite,
    replaceSprite,
    removeSprite,
    countFor,
    listFor,
    setSelectedCategory,
    on,
} from "../../src/store/index.js";
import { ThingType } from "../../src/core/things/ThingType.js";
import { Version } from "../../src/core/Version.js";
import { SPRITE_BYTES } from "../../src/core/sprites/spriteRle.js";

function fakeProject() {
    const make = (id, cat) => { const t = new ThingType(); t.id = id; t.category = cat; t.width = 1; t.height = 1; t.layers = 1; t.patternX = 1; t.patternY = 1; t.patternZ = 1; t.frames = 1; t.spriteIndex = [id]; return t; };
    const items    = new Map([[100, make(100, "item")], [101, make(101, "item")], [102, make(102, "item")]]);
    const outfits  = new Map([[1, make(1, "outfit")]]);
    const effects  = new Map([[1, make(1, "effect")]]);
    const missiles = new Map([[1, make(1, "missile")]]);

    // Minimal stub for the spr side (Stage-8 mutations only need add/replace/remove).
    let spritesCount = 5;
    const overlay = new Map();
    const spr = {
        get spritesCount() { return spritesCount; },
        set spritesCount(v) { spritesCount = v; },
        getSpritePixels(id) { return overlay.get(id) ?? new Uint8Array(SPRITE_BYTES); },
        addSprite(pixels) {
            spritesCount++;
            overlay.set(spritesCount, pixels || new Uint8Array(SPRITE_BYTES));
            return spritesCount;
        },
        replaceSprite(id, pixels) {
            if (id <= 0 || id > spritesCount) return false;
            overlay.set(id, pixels || new Uint8Array(SPRITE_BYTES));
            return true;
        },
        removeSprite(id) {
            const prev = overlay.get(id) ?? new Uint8Array(SPRITE_BYTES);
            if (id === spritesCount && id !== 1) { overlay.delete(id); spritesCount--; }
            else overlay.set(id, new Uint8Array(SPRITE_BYTES));
            return prev;
        },
    };

    return {
        version: new Version({ value: 772, valueStr: "7.72" }),
        dat: { items, outfits, effects, missiles, itemsCount: 102, outfitsCount: 1, effectsCount: 1, missilesCount: 1 },
        spr,
    };
}

describe("addThing / duplicateThing / removeThing", () => {
    it("addThing on items bumps the count to 103", () => {
        setProject(fakeProject());
        setSelectedCategory("item");
        const newId = addThing("item");
        assertEqual(newId, 103);
        assertEqual(countFor(getState().project.dat, "item"), 103);
        assert(listFor(getState().project.dat, "item").has(103), "map has 103");
    });

    it("addThing emits PROJECT_CHANGE so virtual lists can rebuild", () => {
        setProject(fakeProject());
        setSelectedCategory("outfit");
        let calls = 0;
        on(EVENTS.PROJECT_CHANGE, () => calls++);
        const before = calls;

        const newId = addThing("outfit");

        assertEqual(newId, 2);
        assert(calls > before, "PROJECT_CHANGE fired after addThing");
    });

    it("duplicateThing clones the source at a fresh id", () => {
        setProject(fakeProject());
        setSelectedCategory("item");
        const newId = duplicateThing("item", 100);
        assertEqual(newId, 103);
        const map = listFor(getState().project.dat, "item");
        assertEqual(map.get(103).spriteIndex[0], 100, "cloned spriteIndex carried over");
    });

    it("replaceThing keeps the id and emits PROJECT_CHANGE", () => {
        setProject(fakeProject());
        const replacement = ThingType.create(101, "item");
        replacement.marketName = "Replacement";
        let calls = 0;
        on(EVENTS.PROJECT_CHANGE, () => calls++);
        const before = calls;

        assertEqual(replaceThing("item", replacement), true);

        assert(calls > before, "PROJECT_CHANGE fired after replaceThing");
        assertEqual(listFor(getState().project.dat, "item").get(101).marketName, "Replacement");
    });

    it("removeThing on the highest id decrements the count", () => {
        setProject(fakeProject());
        setSelectedCategory("item");
        const removed = removeThing("item", 102);
        assertEqual(removed.id, 102);
        assertEqual(countFor(getState().project.dat, "item"), 101);
        assertEqual(listFor(getState().project.dat, "item").has(102), false);
    });

    it("removeThing in the middle replaces with a default ThingType", () => {
        setProject(fakeProject());
        setSelectedCategory("item");
        const removed = removeThing("item", 101);
        assertEqual(removed.id, 101);
        assertEqual(countFor(getState().project.dat, "item"), 102, "count unchanged");
        const slot = listFor(getState().project.dat, "item").get(101);
        assert(slot, "slot still exists");
        assertEqual(slot.width, 1, "default ThingType has width 1");
    });
});

describe("addSprite / removeSprite (SprFile overlay)", () => {
    it("addSprite increments spritesCount", () => {
        setProject(fakeProject());
        const id = addSprite();
        assertEqual(id, 6);
        assertEqual(getState().project.spr.spritesCount, 6);
    });

    it("replaceSprite returns previous pixels and marks the selected sprite", () => {
        setProject(fakeProject());
        const pixels = new Uint8Array(SPRITE_BYTES);
        pixels[0] = 255;
        const before = replaceSprite(1, pixels);
        assert(before, "previous pixels returned");
        assertEqual(getState().selectedSpriteId, 1);
    });

    it("removeSprite on the highest id decrements; in the middle blanks", () => {
        setProject(fakeProject());
        removeSprite(5); // highest
        assertEqual(getState().project.spr.spritesCount, 4);
        const beforeMid = removeSprite(2);
        assert(beforeMid, "returned previous pixels");
        assertEqual(getState().project.spr.spritesCount, 4, "count unchanged on middle remove");
    });
});
