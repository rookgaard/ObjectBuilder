// Live integration test against the project owner's reference 7.70 fixtures
// sitting at /references/770/Tibia.dat + /references/770/Tibia.spr. This is the
// equivalent of the AS3 app's "open the same client" smoke test.

import { describe, it, assert, assertEqual } from "../runner.js";
import { loadDat } from "../../src/formats/dat/DatLoader.js";
import { SprFile } from "../../src/formats/spr/SprFile.js";
import { Version } from "../../src/core/Version.js";

const VERSION_770 = new Version({
    value: 770,
    valueStr: "7.70",
    datSignature: 0x439D5A33,
    sprSignature: 0x439852BE,
});

const DAT_URL = "./references/770/Tibia.dat";
const SPR_URL = "./references/770/Tibia.spr";

async function fetchBytes(url) {
    const r = await fetch(url);
    if (!r.ok) throw new Error(`${url} → HTTP ${r.status}`);
    return r.arrayBuffer();
}

describe("Integration — references/770/Tibia.dat (7.70)", () => {
    it("parses with itemsCount=5089, outfitsCount=254, effectsCount=25, missilesCount=15", async () => {
        const buf = await fetchBytes(DAT_URL);
        const dat = loadDat(buf, VERSION_770, { strict: true });
        assertEqual(dat.itemsCount,    5089);
        assertEqual(dat.outfitsCount,  254);
        assertEqual(dat.effectsCount,  25);
        assertEqual(dat.missilesCount, 15);
        assertEqual(dat.signatureMismatch, false);
    });

    it("item id 100 has non-empty spriteIndex", async () => {
        const buf = await fetchBytes(DAT_URL);
        const dat = loadDat(buf, VERSION_770);
        const item = dat.items.get(100);
        assert(item, "item 100");
        assert(item.spriteIndex && item.spriteIndex.length > 0, "spriteIndex populated");
        assert(item.spriteIndex[0] >= 0, "first sprite id is a number");
    });
});

describe("Integration — references/770/Tibia.spr (7.70)", () => {
    it("parses header with spritesCount=10962", async () => {
        const buf = await fetchBytes(SPR_URL);
        const spr = new SprFile(buf, VERSION_770);
        assertEqual(spr.spritesCount, 10962);
        assertEqual(spr.signatureMismatch, false);
        assertEqual(spr.extended, false);
        assertEqual(spr.transparency, false);
    });

    it("can decode sprite id 1 (4096 byte ARGB buffer)", async () => {
        const buf = await fetchBytes(SPR_URL);
        const spr = new SprFile(buf, VERSION_770);
        const px = spr.getSpritePixels(1);
        assert(px, "sprite 1 returned");
        assertEqual(px.length, 4096, "ARGB buffer length");
    });
});
