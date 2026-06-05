import { describe, it, assertEqual } from "../runner.js";
import { FrameGroup } from "../../src/core/animation/FrameGroup.js";
import { SPRITE_BYTES } from "../../src/core/sprites/spriteRle.js";
import { ThingType } from "../../src/core/things/ThingType.js";
import { mergeClient } from "../../src/app/mergeProject.js";

describe("client merger", () => {
    it("appends source sprites + objects and remaps sprite ids (no optimize)", () => {
        const current = emptyCurrent({ items: 100, sprites: 2 });

        // Source: sprite 2 is blank → must drop out and remap to 0.
        const source = {
            dat: fakeDat({
                items:   [makeItem(100, [1, 2, 3])],
                outfits: [makeOutfit(1, [3, 1])],
            }),
            spr: new FakeSpr([pixels(1), new Uint8Array(SPRITE_BYTES), pixels(3)]),
        };

        const result = mergeClient(current, source, { optimizeSprites: false });

        assertEqual(result.spritesCount, 2);
        assertEqual(result.itemsCount, 1);
        assertEqual(result.outfitsCount, 1);
        assertEqual(result.effectsCount, 0);
        assertEqual(result.missilesCount, 0);

        // Current sprites were 2; sprite 1→3, blank→0, sprite 3→4.
        assertEqual(current.spr.spritesCount, 4);

        const newItem = current.dat.items.get(101);
        assertEqual(newItem.spriteIndex.join(","), "3,0,4");
        assertEqual(current.dat.itemsCount, 101);

        const newOutfit = current.dat.outfits.get(1);
        // [3,1] → [4,3]; root + frameGroups[0] share the array and stay in sync.
        assertEqual(newOutfit.spriteIndex.join(","), "4,3");
        assertEqual(newOutfit.frameGroups[0].spriteIndex.join(","), "4,3");
        assertEqual(current.dat.outfitsCount, 1);
    });

    it("skips empty source objects", () => {
        const current = emptyCurrent({ items: 100, sprites: 0 });
        const source = {
            dat: fakeDat({
                items: [makeItem(100, [0]), makeItem(101, [1])],
            }),
            spr: new FakeSpr([pixels(7)]),
        };

        const result = mergeClient(current, source, { optimizeSprites: false });

        // First item (single 0 sprite) is empty and skipped; only the second lands.
        assertEqual(result.itemsCount, 1);
        assertEqual(current.dat.items.get(101).spriteIndex.join(","), "1");
    });

    it("optimizes source sprites before merging (dedupe + drop empty)", () => {
        const current = emptyCurrent({ items: 100, sprites: 0 });
        const source = {
            dat: fakeDat({
                items: [makeItem(100, [1, 2, 3, 4])],
            }),
            // sprite 2 duplicates 1; sprite 3 is blank.
            spr: new FakeSpr([pixels(1), pixels(1), new Uint8Array(SPRITE_BYTES), pixels(2)]),
        };

        const result = mergeClient(current, source, { optimizeSprites: true });

        // 4 source sprites collapse to 2 unique non-empty ones.
        assertEqual(result.spritesCount, 2);
        assertEqual(current.spr.spritesCount, 2);

        // [1,2,3,4] → optimizer [1,1,0,2] → merge map keeps 1,1,0,2.
        assertEqual(current.dat.items.get(101).spriteIndex.join(","), "1,1,0,2");
    });

    it("synthesizes a default frame group for a pre-10.57 outfit merged into a frameGroups project", () => {
        const current = emptyCurrent({ items: 100, sprites: 0, frameGroups: true });
        const source = {
            dat: fakeDat({ outfits: [makeFlatOutfit(1, [5, 6])] }),
            spr: new FakeSpr([pixels(11), pixels(12), pixels(13), pixels(14), pixels(15), pixels(16)]),
        };

        const result = mergeClient(current, source, { optimizeSprites: false });
        const outfit = current.dat.outfits.get(1);

        assertEqual(result.outfitsCount, 1);
        assertEqual(outfit.frameGroups.length, 1);
        assertEqual(outfit.frameGroups[0].type, 0); // DEFAULT
        // Group shares the (remapped) root array so they never drift.
        assertEqual(outfit.frameGroups[0].spriteIndex === outfit.spriteIndex, true);
        // current started empty, so all 6 source sprites append as ids 1..6;
        // the outfit referenced source sprites 5 and 6 → remapped to 5,6.
        assertEqual(outfit.spriteIndex.join(","), "5,6");
    });

    it("rejects a merge that would overflow a non-extended project without mutating it", () => {
        const current = emptyCurrent({ items: 100, sprites: 0 });
        current.spr.spritesCount = 65534;
        current.spr.extended = false;
        const source = {
            dat: fakeDat({ items: [makeItem(100, [1, 2, 3])] }),
            spr: new FakeSpr([pixels(1), pixels(2), pixels(3)]),
        };

        let threw = false;
        try {
            mergeClient(current, source, { optimizeSprites: false });
        } catch {
            threw = true;
        }
        assertEqual(threw, true);
        // No partial mutation: the item was not appended, sprite count unchanged.
        assertEqual(current.dat.items.has(101), false);
        assertEqual(current.spr.spritesCount, 65534);
    });
});

function emptyCurrent({ items = 100, sprites = 0, frameGroups = false, extended = false } = {}) {
    return {
        dat: {
            itemsCount: items,
            outfitsCount: 0,
            effectsCount: 0,
            missilesCount: 0,
            items: new Map([[items, makeItem(items, [0])]]),
            outfits: new Map(),
            effects: new Map(),
            missiles: new Map(),
            frameGroups,
            extended,
        },
        spr: new FakeSpr(Array.from({ length: sprites }, (_, i) => pixels(100 + i)), extended),
    };
}

function fakeDat({ items = [], outfits = [], effects = [], missiles = [] }) {
    const toMap = (arr) => new Map(arr.map((t) => [t.id, t]));
    return {
        itemsCount:    items.length    ? Math.max(...items.map((t) => t.id))    : 99,
        outfitsCount:  outfits.length  ? Math.max(...outfits.map((t) => t.id))  : 0,
        effectsCount:  effects.length  ? Math.max(...effects.map((t) => t.id))  : 0,
        missilesCount: missiles.length ? Math.max(...missiles.map((t) => t.id)) : 0,
        items: toMap(items),
        outfits: toMap(outfits),
        effects: toMap(effects),
        missiles: toMap(missiles),
    };
}

function makeItem(id, spriteIndex) {
    const t = ThingType.create(id, "item");
    t.spriteIndex = spriteIndex.slice();
    return t;
}

function makeOutfit(id, spriteIndex) {
    const t = ThingType.create(id, "outfit");
    const g = new FrameGroup();
    g.spriteIndex = spriteIndex.slice();
    t.frameGroups = [g];
    t.spriteIndex = g.spriteIndex; // mirror group 0 (shared reference)
    return t;
}

// A pre-10.57 outfit: root spriteIndex only, no frameGroups.
function makeFlatOutfit(id, spriteIndex) {
    const t = ThingType.create(id, "outfit");
    t.frameGroups = [];
    t.spriteIndex = spriteIndex.slice();
    t.patternX = 4;
    t.frames = 1;
    return t;
}

// Minimal SprFile stand-in: overlay-correct getSpritePixels (so emptiness is
// always read from live data) plus addSprite / replaceSprites.
class FakeSpr {
    constructor(list, extended = false) {
        this.sprites = new Map();
        list.forEach((px, i) => this.sprites.set(i + 1, px));
        this.spritesCount = list.length;
        this.extended = extended;
        this._blank = new Uint8Array(SPRITE_BYTES);
    }
    getSpritePixels(id) {
        if (id === 0) return this._blank;
        return this.sprites.get(id) ?? null;
    }
    addSprite(px) {
        const id = ++this.spritesCount;
        this.sprites.set(id, new Uint8Array(px));
        return id;
    }
    replaceSprites(arr) {
        this.sprites = new Map();
        arr.forEach((px, i) => this.sprites.set(i + 1, px));
        this.spritesCount = arr.length;
    }
}

function pixels(seed) {
    const out = new Uint8Array(SPRITE_BYTES);
    out[0] = 255;
    out[1] = seed & 0xff;
    out[2] = (seed >> 8) & 0xff;
    return out;
}
