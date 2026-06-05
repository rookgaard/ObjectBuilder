// Functional round-trip against the real 7.72 reference files. Byte-for-byte
// equality isn't guaranteed (e.g. empty-sprite encoding is normalised on
// compile), but the parsed state must be identical.

import { describe, it, assert, assertEqual, assertBytesEqual } from "../runner.js";
import { loadDat }     from "../../src/formats/dat/DatLoader.js";
import { compileDat }  from "../../src/formats/dat/DatCompiler.js";
import { SprFile }     from "../../src/formats/spr/SprFile.js";
import { compileSpr }  from "../../src/formats/spr/SprCompiler.js";
import { Version }     from "../../src/core/Version.js";

const V = new Version({ value: 772, valueStr: "7.72", datSignature: 0x439D5A33, sprSignature: 0x439852BE });

async function fetchBytes(url) {
    const r = await fetch(url);
    if (!r.ok) throw new Error(`${url} → HTTP ${r.status}`);
    return r.arrayBuffer();
}

const SAMPLE_ITEM_IDS = [100, 200, 500, 1000, 2160, 3031, 5000, 5157];
const SAMPLE_SPRITE_IDS = [1, 50, 131, 314, 500, 1000, 5000, 10423];

const FIELDS_TO_COMPARE = [
    "width", "height", "exactSize", "layers", "patternX", "patternY", "patternZ", "frames",
    "isGround", "groundSpeed", "isGroundBorder", "isOnBottom", "isOnTop",
    "isContainer", "stackable", "forceUse", "multiUse",
    "writable", "writableOnce", "maxTextLength",
    "isFluidContainer", "isFluid",
    "isUnpassable", "isUnmoveable", "blockMissile", "blockPathfind",
    "pickupable", "hangable", "isVertical", "isHorizontal", "rotatable",
    "hasLight", "lightLevel", "lightColor",
    "floorChange", "hasOffset", "offsetX", "offsetY",
    "hasElevation", "elevation",
    "isLyingObject", "animateAlways",
    "miniMap", "miniMapColor", "isLensHelp", "lensHelp", "isFullGround",
];

describe("Round-trip (DAT) — references/Tibia.dat", () => {
    it("byte-for-byte equal — compile(load(file)) === file", async () => {
        const buf = await fetchBytes("./references/Tibia.dat");
        const dat1 = loadDat(buf, V, { strict: true });
        const out  = compileDat(dat1, V);
        assertEqual(out.length, buf.byteLength, "output length matches input");
        assertBytesEqual(out, new Uint8Array(buf), "byte-identical");
    });

    it("compile(load(file)) parses back to identical counts + sampled items", async () => {
        const buf = await fetchBytes("./references/Tibia.dat");
        const dat1 = loadDat(buf, V, { strict: true });
        const out  = compileDat(dat1, V);
        const dat2 = loadDat(out.buffer.slice(0, out.length), V, { strict: true });

        assertEqual(dat2.itemsCount,    dat1.itemsCount);
        assertEqual(dat2.outfitsCount,  dat1.outfitsCount);
        assertEqual(dat2.effectsCount,  dat1.effectsCount);
        assertEqual(dat2.missilesCount, dat1.missilesCount);

        for (const id of SAMPLE_ITEM_IDS) {
            const a = dat1.items.get(id);
            const b = dat2.items.get(id);
            assert(a && b, `id ${id} exists in both`);
            for (const f of FIELDS_TO_COMPARE) {
                assertEqual(b[f], a[f], `item ${id}.${f}`);
            }
            assertEqual(b.spriteIndex.length, a.spriteIndex.length, `item ${id} spriteIndex.length`);
            for (let i = 0; i < a.spriteIndex.length; i++) {
                assertEqual(b.spriteIndex[i], a.spriteIndex[i], `item ${id} spriteIndex[${i}]`);
            }
        }

        // Sample one outfit too.
        const o1 = dat1.outfits.get(128);
        const o2 = dat2.outfits.get(128);
        assertEqual(o2.width, o1.width); assertEqual(o2.frames, o1.frames);
        assertEqual(o2.spriteIndex.length, o1.spriteIndex.length);
    });
});

describe("Round-trip (SPR) — references/Tibia.spr", () => {
    it("byte-for-byte equal — compile(load(file)) === file", async () => {
        const buf  = await fetchBytes("./references/Tibia.spr");
        const spr1 = new SprFile(buf, V);
        const out  = compileSpr(spr1, V);
        assertEqual(out.length, buf.byteLength, "output length matches input");
        assertBytesEqual(out, new Uint8Array(buf), "byte-identical");
    });

    it("compile + reload preserves sampled sprite pixels", async () => {
        const buf  = await fetchBytes("./references/Tibia.spr");
        const spr1 = new SprFile(buf, V);
        const out  = compileSpr(spr1, V);
        const spr2 = new SprFile(out.buffer.slice(0, out.length), V);

        assertEqual(spr2.spritesCount, spr1.spritesCount);

        for (const id of SAMPLE_SPRITE_IDS) {
            const a = spr1.getSpritePixels(id);
            const b = spr2.getSpritePixels(id);
            assertBytesEqual(b, a, `sprite ${id}`);
        }
    });
});
