// Live integration test against the project owner's reference 7.72 fixtures
// sitting at /references/Tibia.dat + /references/Tibia.spr. This is the
// equivalent of the AS3 app's "open the same client" smoke test.

import { describe, it, assert, assertEqual } from "../runner.js";
import { loadDat } from "../../src/formats/dat/DatLoader.js";
import { SprFile } from "../../src/formats/spr/SprFile.js";
import { Version } from "../../src/core/Version.js";

const VERSION_772 = new Version({
    value: 772,
    valueStr: "7.72",
    datSignature: 0x439D5A33,
    sprSignature: 0x439852BE,
});

async function fetchBytes(url) {
    const r = await fetch(url);
    if (!r.ok) throw new Error(`${url} → HTTP ${r.status}`);
    return r.arrayBuffer();
}

describe("Integration — references/Tibia.dat (7.72)", () => {
    it("parses with itemsCount=5157, outfitsCount=254, effectsCount=26, missilesCount=16", async () => {
        const buf = await fetchBytes("./references/Tibia.dat");
        const dat = loadDat(buf, VERSION_772, { strict: true });
        assertEqual(dat.itemsCount,    5157);
        assertEqual(dat.outfitsCount,  254);
        assertEqual(dat.effectsCount,  26);
        assertEqual(dat.missilesCount, 16);
        assertEqual(dat.signatureMismatch, false);
    });

    it("item id 100 has non-empty spriteIndex", async () => {
        const buf = await fetchBytes("./references/Tibia.dat");
        const dat = loadDat(buf, VERSION_772);
        const item = dat.items.get(100);
        assert(item, "item 100");
        assert(item.spriteIndex && item.spriteIndex.length > 0, "spriteIndex populated");
        assert(item.spriteIndex[0] >= 0, "first sprite id is a number");
    });
});

describe("Integration — references/Tibia.spr (7.72)", () => {
    it("parses header with spritesCount=10423", async () => {
        const buf = await fetchBytes("./references/Tibia.spr");
        const spr = new SprFile(buf, VERSION_772);
        assertEqual(spr.spritesCount, 10423);
        assertEqual(spr.signatureMismatch, false);
        assertEqual(spr.extended, false);
        assertEqual(spr.transparency, false);
    });

    it("can decode sprite id 1 (4096 byte ARGB buffer)", async () => {
        const buf = await fetchBytes("./references/Tibia.spr");
        const spr = new SprFile(buf, VERSION_772);
        const px = spr.getSpritePixels(1);
        assert(px, "sprite 1 returned");
        assertEqual(px.length, 4096, "ARGB buffer length");
    });
});
