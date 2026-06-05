// Tests for SprFile — synthetic minimal SPR with a small offset table.

import { describe, it, assert, assertEqual } from "../runner.js";
import { BinaryWriter } from "../../src/core/binary/BinaryWriter.js";
import { encodeSpritePixels, SPRITE_BYTES, SPRITE_PIXELS } from "../../src/core/sprites/spriteRle.js";
import { SprFile } from "../../src/formats/spr/SprFile.js";
import { Version } from "../../src/core/Version.js";

const VERSION_772 = new Version({
    value: 772,
    valueStr: "7.72",
    datSignature: 0x439D5A33,
    sprSignature: 0x439852BE,
});

// Build a minimal non-extended SPR with three sprites:
//   id=1 → solid red (transparent:false)
//   id=2 → empty (address 0)
//   id=3 → 3 transparent + 2 colored pixels
function buildSyntheticSpr() {
    // Encode payloads first.
    const solidRed = new Uint8Array(SPRITE_BYTES);
    for (let i = 0; i < SPRITE_PIXELS; i++) {
        const o = i * 4;
        solidRed[o] = 0xFF;     // A
        solidRed[o + 1] = 0xFF; // R
        solidRed[o + 2] = 0x00; // G
        solidRed[o + 3] = 0x00; // B
    }
    const payload1 = encodeSpritePixels(solidRed, { transparent: false });

    const mixed = new Uint8Array(SPRITE_BYTES);
    mixed[3 * 4] = 0xFF; mixed[3 * 4 + 1] = 0x11; mixed[3 * 4 + 2] = 0x22; mixed[3 * 4 + 3] = 0x33;
    mixed[4 * 4] = 0xFF; mixed[4 * 4 + 1] = 0x44; mixed[4 * 4 + 2] = 0x55; mixed[4 * 4 + 3] = 0x66;
    const payload3 = encodeSpritePixels(mixed, { transparent: false });

    // Header: u32 sig + u16 count (non-extended) = 6 bytes, then 3 × u32 addresses = 12 bytes.
    const HEADER = 6;
    const TABLE  = 3 * 4;
    const addr1 = HEADER + TABLE;                    // sprite 1 starts here
    const dataLen1 = payload1.length;
    const addr3 = addr1 + 3 /* RGB marker */ + 2 /* len short */ + dataLen1;

    const w = new BinaryWriter();
    w.writeUint32(VERSION_772.sprSignature);
    w.writeUint16(3); // spritesCount

    // Address table
    w.writeUint32(addr1); // id 1
    w.writeUint32(0);     // id 2 — empty
    w.writeUint32(addr3); // id 3

    // Sprite 1 chunk
    w.position = addr1;
    w.writeUint8(0xFF); w.writeUint8(0x00); w.writeUint8(0xFF); // unused magenta marker
    w.writeUint16(dataLen1);
    w.writeBytes(payload1);

    // Sprite 3 chunk
    w.position = addr3;
    w.writeUint8(0xFF); w.writeUint8(0x00); w.writeUint8(0xFF);
    w.writeUint16(payload3.length);
    w.writeBytes(payload3);

    return w.toUint8Array().buffer.slice(0, w.length);
}

describe("SprFile — synthetic 3-sprite file", () => {
    it("parses signature and count", () => {
        const spr = new SprFile(buildSyntheticSpr(), VERSION_772);
        assertEqual(spr.signature, VERSION_772.sprSignature);
        assertEqual(spr.spritesCount, 3);
        assertEqual(spr.extended, false);
        assertEqual(spr.transparency, false);
        assertEqual(spr.signatureMismatch, false);
    });

    it("returns blank buffer for id 0 and out-of-range null", () => {
        const spr = new SprFile(buildSyntheticSpr(), VERSION_772);
        const blank = spr.getSpritePixels(0);
        assert(blank instanceof Uint8Array && blank.length === SPRITE_BYTES, "blank length");
        assertEqual(spr.getSpritePixels(999), null);
    });

    it("decodes sprite 1 back to solid red (alpha=0xFF on colored)", () => {
        const spr = new SprFile(buildSyntheticSpr(), VERSION_772);
        const px = spr.getSpritePixels(1);
        assert(px, "sprite 1");
        assertEqual(px[0], 0xFF, "pixel 0 alpha");
        assertEqual(px[1], 0xFF, "pixel 0 red");
        assertEqual(px[2], 0x00, "pixel 0 green");
        assertEqual(px[3], 0x00, "pixel 0 blue");
        assertEqual(px[(SPRITE_PIXELS - 1) * 4 + 1], 0xFF, "last pixel red");
    });

    it("returns blank buffer for empty sprite (address 0)", () => {
        const spr = new SprFile(buildSyntheticSpr(), VERSION_772);
        const px = spr.getSpritePixels(2);
        assert(px, "sprite 2 returns something");
        for (let i = 0; i < px.length; i++) {
            assertEqual(px[i], 0, `byte ${i} of empty sprite`);
        }
        assertEqual(spr.isEmpty(2), true);
    });

    it("decodes sprite 3 with mixed runs", () => {
        const spr = new SprFile(buildSyntheticSpr(), VERSION_772);
        const px = spr.getSpritePixels(3);
        // Pixels 0..2 should be zero (leading transparent run).
        assertEqual(px[0], 0); assertEqual(px[1], 0); assertEqual(px[2], 0); assertEqual(px[3], 0);
        // Pixel 3 = (0xFF, 0x11, 0x22, 0x33) ARGB.
        assertEqual(px[3 * 4    ], 0xFF, "pixel 3 alpha");
        assertEqual(px[3 * 4 + 1], 0x11, "pixel 3 red");
        // Pixel 4 = (0xFF, 0x44, 0x55, 0x66).
        assertEqual(px[4 * 4 + 1], 0x44, "pixel 4 red");
        assertEqual(px[4 * 4 + 3], 0x66, "pixel 4 blue");
    });

    it("caches decoded pixels (second call returns the same Uint8Array)", () => {
        const spr = new SprFile(buildSyntheticSpr(), VERSION_772);
        const a = spr.getSpritePixels(1);
        const b = spr.getSpritePixels(1);
        assert(a === b, "second call hits the cache");
    });
});
