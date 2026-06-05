// Sanity tests for ThingType + ThingCategory + Version + sprite-sheet math.

import { describe, it, assertEqual, assert, assertThrows } from "../runner.js";
import { ThingType } from "../../src/core/things/ThingType.js";
import * as ThingCategory from "../../src/core/things/ThingCategory.js";
import { Version, versionFromJson } from "../../src/core/Version.js";

describe("ThingCategory", () => {
    it("recognises the four canonical names", () => {
        assert(ThingCategory.isValid("item"));
        assert(ThingCategory.isValid("outfit"));
        assert(ThingCategory.isValid("effect"));
        assert(ThingCategory.isValid("missile"));
        assert(!ThingCategory.isValid("frobnicator"));
    });

    it("value <-> name round-trip", () => {
        for (const cat of ThingCategory.ALL) {
            assertEqual(ThingCategory.fromValue(ThingCategory.toValue(cat)), cat);
        }
    });

    it("fromString tolerates plurals and case", () => {
        assertEqual(ThingCategory.fromString("Items"), "item");
        assertEqual(ThingCategory.fromString("OUTFITS"), "outfit");
        assertEqual(ThingCategory.fromString("???"), null);
    });
});

describe("ThingType.create defaults", () => {
    it("item is 1×1, 1 frame, exactSize 32", () => {
        const t = ThingType.create(100, "item");
        assertEqual(t.width, 1);
        assertEqual(t.height, 1);
        assertEqual(t.layers, 1);
        assertEqual(t.frames, 1);
        assertEqual(t.exactSize, 32);
        assertEqual(t.getTotalSprites(), 1);
        assertEqual(t.spriteIndex.length, 1);
    });

    it("outfit is 4-dir, 3-frame, animated", () => {
        const t = ThingType.create(1, "outfit");
        assertEqual(t.patternX, 4);
        assertEqual(t.frames, 3);
        assertEqual(t.isAnimation, true);
        assertEqual(t.frameDurations.length, 3);
        // total sprites = 1*1*1*4*1*1*3 = 12 with layers=1
        assertEqual(t.getTotalSprites(), 12);
    });

    it("missile is 3×3 pattern", () => {
        const t = ThingType.create(1, "missile");
        assertEqual(t.patternX, 3);
        assertEqual(t.patternY, 3);
        assertEqual(t.getTotalSprites(), 9);
    });

    it("rejects invalid category", () => {
        assertThrows(() => ThingType.create(1, "wat"));
    });
});

describe("ThingType.getSpriteIndex (AS3 parity)", () => {
    // Outfit: w=1,h=1,layers=2,patternX=4,patternY=1,patternZ=1,frames=3
    // Formula (AS3):
    //   ((((((frame % frames)*pz + patternZ)*py + patternY)*px + patternX)*layers + layer)*height + height)*width + width
    // Frame steps by layers*patternZ*patternY*patternX = 2*1*1*4 = 8.
    // patternX steps by layers = 2. layer steps by 1.
    it("outfit-shaped: base, +layer, +patternX, +frame", () => {
        const t = new ThingType();
        t.width = 1; t.height = 1; t.layers = 2;
        t.patternX = 4; t.patternY = 1; t.patternZ = 1;
        t.frames = 3;

        assertEqual(t.getSpriteIndex(0, 0, 0, 0, 0, 0, 0), 0, "base");
        assertEqual(t.getSpriteIndex(0, 0, 1, 0, 0, 0, 0), 1, "+layer");
        assertEqual(t.getSpriteIndex(0, 0, 0, 1, 0, 0, 0), 2, "+patternX");
        assertEqual(t.getSpriteIndex(0, 0, 0, 0, 0, 0, 1), 8, "+frame");
        assertEqual(t.getTotalSprites(), 24, "totalSprites");
    });

    it("item-shaped: only (0,0,…,0) is valid", () => {
        const t = new ThingType();
        t.width = 1; t.height = 1; t.layers = 1;
        t.patternX = 1; t.patternY = 1; t.patternZ = 1;
        t.frames = 1;
        assertEqual(t.getSpriteIndex(0, 0, 0, 0, 0, 0, 0), 0);
        assertEqual(t.getTotalSprites(), 1);
    });

    it("getSpriteSheetSize matches AS3 formula", () => {
        const t = new ThingType();
        t.width = 2; t.height = 2; t.layers = 1;
        t.patternX = 4; t.patternY = 1; t.patternZ = 1;
        t.frames = 3;
        // sheetW = patternZ*patternX*layers*width*32 = 1*4*1*2*32 = 256
        // sheetH = frames*patternY*height*32         = 3*1*2*32   = 192
        const s = t.getSpriteSheetSize();
        assertEqual(s.width, 256);
        assertEqual(s.height, 192);
    });
});

describe("ThingType.clone", () => {
    it("makes a deep-enough copy (spriteIndex + frameDurations)", () => {
        const t = ThingType.create(1, "outfit");
        t.spriteIndex[0] = 999;
        const t2 = t.clone();
        t.spriteIndex[0] = 1;
        t.frameDurations[0].minimum = 9999;
        assertEqual(t2.spriteIndex[0], 999, "spriteIndex was copied");
        assertEqual(t2.frameDurations[0].minimum !== 9999, true, "frameDurations were copied");
    });
});

describe("Version + versionFromJson", () => {
    it("parses 0x… strings into numeric signatures", () => {
        const v = versionFromJson({
            value: 772,
            valueStr: "7.72",
            datSignature: "0x439D5A33",
            sprSignature: "0x439852BE",
            otbVersion: 0,
        });
        assertEqual(v.value, 772);
        assertEqual(v.valueStr, "7.72");
        assertEqual(v.datSignature, 0x439D5A33);
        assertEqual(v.sprSignature, 0x439852BE);
    });

    it("equals + clone behave", () => {
        const a = new Version({ value: 1, valueStr: "1", datSignature: 2, sprSignature: 3, otbVersion: 4 });
        const b = a.clone();
        assert(a.equals(b));
        b.value = 99;
        assert(!a.equals(b));
    });
});
