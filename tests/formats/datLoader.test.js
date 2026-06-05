// Tests for DatLoader against a hand-crafted synthetic DAT buffer that
// exercises every generation-3 codepath we rely on.

import { describe, it, assert, assertEqual } from "../runner.js";
import { BinaryWriter } from "../../src/core/binary/BinaryWriter.js";
import { loadDat, MIN_ITEM_ID } from "../../src/formats/dat/DatLoader.js";
import F from "../../src/formats/dat/MetadataFlags3.js";
import { Version } from "../../src/core/Version.js";

const VERSION_772 = new Version({
    value: 772,
    valueStr: "7.72",
    datSignature: 0x439D5A33,
    sprSignature: 0x439852BE,
});

// Build a minimal valid gen-3 DAT with:
//   • 1 item   id=100 — ground, light, 1×1, 1 sprite, sprite id 1
//   • 0 outfits / effects / missiles  ← achieved by setting maxOutfitId < MIN_OUTFIT_ID
//     …but that's not possible since MIN_OUTFIT_ID = 1 ≤ maxOutfitId. So we
//     give 1 outfit id=1 with the bare-minimum (no flags) + 1×1×1×1 = 1 sprite
//     each for outfit/effect/missile (4 dirs collapsed via patternX=1 just to
//     keep the fixture compact).
function buildSyntheticDat() {
    const w = new BinaryWriter();
    w.writeUint32(VERSION_772.datSignature); // signature
    w.writeUint16(100);                      // itemsCount (so range is 100..100)
    w.writeUint16(1);                        // outfitsCount
    w.writeUint16(1);                        // effectsCount
    w.writeUint16(1);                        // missilesCount

    // --- item 100: GROUND speed=150, HAS_LIGHT level=5 color=215, then 1×1 1-sprite
    w.writeUint8(F.GROUND);
    w.writeUint16(150);
    w.writeUint8(F.HAS_LIGHT);
    w.writeUint16(5);
    w.writeUint16(215);
    w.writeUint8(F.LAST_FLAG);
    // texture patterns: w=1 h=1 (no exactSize) layers=1 px=1 py=1 pz=1 frames=1
    w.writeUint8(1); w.writeUint8(1);
    w.writeUint8(1); w.writeUint8(1); w.writeUint8(1); w.writeUint8(1); w.writeUint8(1);
    w.writeUint16(1); // sprite id 1

    // --- outfit 1: no flags, 1×1 1-sprite
    w.writeUint8(F.LAST_FLAG);
    w.writeUint8(1); w.writeUint8(1);
    w.writeUint8(1); w.writeUint8(1); w.writeUint8(1); w.writeUint8(1); w.writeUint8(1);
    w.writeUint16(2);

    // --- effect 1
    w.writeUint8(F.LAST_FLAG);
    w.writeUint8(1); w.writeUint8(1);
    w.writeUint8(1); w.writeUint8(1); w.writeUint8(1); w.writeUint8(1); w.writeUint8(1);
    w.writeUint16(3);

    // --- missile 1
    w.writeUint8(F.LAST_FLAG);
    w.writeUint8(1); w.writeUint8(1);
    w.writeUint8(1); w.writeUint8(1); w.writeUint8(1); w.writeUint8(1); w.writeUint8(1);
    w.writeUint16(4);

    return w.toUint8Array();
}

describe("DatLoader — synthetic gen-3 DAT", () => {
    it("parses header counts", () => {
        const bytes = buildSyntheticDat();
        const dat = loadDat(bytes, VERSION_772, { strict: true });
        assertEqual(dat.signature, VERSION_772.datSignature);
        assertEqual(dat.itemsCount, 100);
        assertEqual(dat.outfitsCount, 1);
        assertEqual(dat.effectsCount, 1);
        assertEqual(dat.missilesCount, 1);
        assertEqual(dat.signatureMismatch, false);
    });

    it("populates item 100 with ground + light flags", () => {
        const dat = loadDat(buildSyntheticDat(), VERSION_772);
        const item = dat.items.get(100);
        assert(item, "item 100 exists");
        assertEqual(item.isGround, true);
        assertEqual(item.groundSpeed, 150);
        assertEqual(item.hasLight, true);
        assertEqual(item.lightLevel, 5);
        assertEqual(item.lightColor, 215);
        assertEqual(item.width, 1);
        assertEqual(item.height, 1);
        assertEqual(item.exactSize, 32, "no exactSize byte, defaults to 32");
        assertEqual(item.spriteIndex.length, 1);
        assertEqual(item.spriteIndex[0], 1);
    });

    it("fills empty item ids 1..99 with no entry (range starts at 100)", () => {
        const dat = loadDat(buildSyntheticDat(), VERSION_772);
        assertEqual(dat.items.has(99), false);
        assertEqual(dat.items.has(100), true);
    });

    it("populates outfit/effect/missile lists with one entry each", () => {
        const dat = loadDat(buildSyntheticDat(), VERSION_772);
        assertEqual(dat.outfits.size, 1);
        assertEqual(dat.effects.size, 1);
        assertEqual(dat.missiles.size, 1);
        assertEqual(dat.outfits.get(1).spriteIndex[0], 2);
        assertEqual(dat.effects.get(1).spriteIndex[0], 3);
        assertEqual(dat.missiles.get(1).spriteIndex[0], 4);
    });

    it("consumes the buffer exactly (bytesAvailable == 0)", () => {
        const bytes = buildSyntheticDat();
        loadDat(bytes, VERSION_772, { strict: true }); // would throw if trailing bytes
        assertEqual(MIN_ITEM_ID, 100, "constant sanity");
    });

    it("throws on unknown flag byte", () => {
        // Forge a DAT with item 100 declaring flag 0xAA which isn't in MetadataFlags3.
        const w = new BinaryWriter();
        w.writeUint32(VERSION_772.datSignature);
        w.writeUint16(100); w.writeUint16(0); w.writeUint16(0); w.writeUint16(0);
        // Wait — outfitsCount=0 means we'd loop 1..0 which is empty. Good.
        // …except our DatLoader uses `for (id = minId; id <= maxId; id++)`, which
        // with maxId=0 < minId=1 ⇒ zero iterations. Confirmed by code review.
        w.writeUint8(0xAA);

        let err = null;
        try { loadDat(w.toUint8Array(), VERSION_772); } catch (e) { err = e; }
        assert(err, "expected an error");
        assert(/Unknown flag|unknown flag/.test(err.message), `got: ${err.message}`);
    });
});
