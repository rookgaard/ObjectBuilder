// Synthetic FrameGroup round-trip — encode a 2-group outfit + decode + verify
// counts / geometry / sprite indices come back intact.

import { describe, it, assertEqual, assertBytesEqual } from "../runner.js";
import { BinaryReader } from "../../src/core/binary/BinaryReader.js";
import { BinaryWriter } from "../../src/core/binary/BinaryWriter.js";
import { ThingType } from "../../src/core/things/ThingType.js";
import { OUTFIT, ITEM } from "../../src/core/things/ThingCategory.js";
import { FrameGroup } from "../../src/core/animation/FrameGroup.js";
import { DEFAULT, WALKING } from "../../src/core/animation/FrameGroupType.js";
import { FrameDuration } from "../../src/core/animation/FrameDuration.js";
import { readTexturePatterns } from "../../src/formats/dat/MetadataReader.js";
import { writeTexturePatterns } from "../../src/formats/dat/MetadataWriter.js";

function makeOutfitWithGroups() {
    const t = new ThingType();
    t.id = 1;
    t.category = OUTFIT;

    const def = new FrameGroup();
    def.type = DEFAULT;
    def.width = 1; def.height = 1; def.layers = 2;
    def.patternX = 4; def.patternY = 1; def.patternZ = 1;
    def.frames = 1;
    def.isAnimation = false;
    def.spriteIndex = [];
    for (let i = 0; i < def.getTotalSprites(); i++) def.spriteIndex.push(100 + i);

    const walk = new FrameGroup();
    walk.type = WALKING;
    walk.width = 1; walk.height = 1; walk.layers = 2;
    walk.patternX = 4; walk.patternY = 1; walk.patternZ = 1;
    walk.frames = 3;
    walk.isAnimation = true;
    walk.animationMode = 0;
    walk.loopCount = 0;
    walk.startFrame = 0;
    walk.frameDurations = [
        new FrameDuration(200, 200),
        new FrameDuration(200, 200),
        new FrameDuration(200, 200),
    ];
    walk.spriteIndex = [];
    for (let i = 0; i < walk.getTotalSprites(); i++) walk.spriteIndex.push(500 + i);

    t.frameGroups = [];
    t.frameGroups[DEFAULT] = def;
    t.frameGroups[WALKING] = walk;
    return t;
}

describe("MetadataReader/Writer — outfit FrameGroups", () => {
    it("round-trips a DEFAULT + WALKING outfit with frameGroups feature on", () => {
        const orig = makeOutfitWithGroups();
        const w = new BinaryWriter(256);
        writeTexturePatterns(w, orig, /*extended*/ true, /*frameDurations*/ true, /*frameGroups*/ true);
        const bytes = w.toUint8Array();

        const r = new BinaryReader(bytes.buffer);
        const decoded = new ThingType();
        decoded.id = 1;
        decoded.category = OUTFIT;
        readTexturePatterns(r, decoded, true, true, true);

        assertEqual(decoded.frameGroups.length, 2, "two frame groups");
        const def = decoded.frameGroups[DEFAULT];
        const walk = decoded.frameGroups[WALKING];
        assertEqual(def.layers, 2);
        assertEqual(def.patternX, 4);
        assertEqual(def.frames, 1);
        assertEqual(def.spriteIndex[0], 100);
        assertEqual(walk.frames, 3);
        assertEqual(walk.isAnimation, true);
        assertEqual(walk.frameDurations[1].minimum, 200);
        assertEqual(walk.spriteIndex[walk.spriteIndex.length - 1], 500 + walk.getTotalSprites() - 1);

        // DEFAULT group mirrors onto root.
        assertEqual(decoded.layers, 2);
        assertEqual(decoded.patternX, 4);
    });

    it("backward-compat — frameGroups feature off treats outfit as single root group", () => {
        const t = new ThingType();
        t.id = 2; t.category = OUTFIT;
        t.width = 1; t.height = 1; t.layers = 2;
        t.patternX = 4; t.patternY = 1; t.patternZ = 1;
        t.frames = 1;
        t.spriteIndex = [10, 11, 12, 13, 14, 15, 16, 17];

        const w = new BinaryWriter(64);
        writeTexturePatterns(w, t, true, false, /*frameGroups*/ false);
        const bytes = w.toUint8Array();

        const r = new BinaryReader(bytes.buffer);
        const decoded = new ThingType();
        decoded.id = 2; decoded.category = OUTFIT;
        readTexturePatterns(r, decoded, true, false, false);

        assertEqual(decoded.frameGroups.length, 0, "no frame groups array entries");
        assertEqual(decoded.layers, 2);
        assertEqual(decoded.patternX, 4);
        assertBytesEqual(new Uint8Array(decoded.spriteIndex), new Uint8Array(t.spriteIndex));
    });

    it("items / effects / missiles never get a group prefix even when feature is on", () => {
        const t = new ThingType();
        t.id = 3; t.category = ITEM;
        t.width = 1; t.height = 1; t.layers = 1;
        t.patternX = 1; t.patternY = 1; t.patternZ = 1;
        t.frames = 1;
        t.spriteIndex = [42];

        const w = new BinaryWriter(32);
        writeTexturePatterns(w, t, true, false, true);
        const r = new BinaryReader(w.toUint8Array().buffer);

        // First byte must be width (1), not a group count — items skip the group prefix.
        assertEqual(r.readUint8(), 1, "first byte = width");
    });
});
