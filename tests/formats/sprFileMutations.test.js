// Tests for SprFile write overlay (addSprite / replaceSprite / removeSprite)
// plus round-trip through SprCompiler.

import { describe, it, assert, assertEqual, assertBytesEqual } from "../runner.js";
import { compileSpr } from "../../src/formats/spr/SprCompiler.js";
import { SprFile }    from "../../src/formats/spr/SprFile.js";
import { SPRITE_BYTES, SPRITE_PIXELS } from "../../src/core/sprites/spriteRle.js";
import { Version } from "../../src/core/Version.js";
import { BinaryWriter } from "../../src/core/binary/BinaryWriter.js";

const V = new Version({ value: 772, valueStr: "7.72", datSignature: 0x439D5A33, sprSignature: 0x439852BE });

function emptySpr(count) {
    // 1 sprite minimum, all empty (address 0).
    const w = new BinaryWriter();
    w.writeUint32(V.sprSignature);
    w.writeUint16(count);
    for (let i = 0; i < count; i++) w.writeUint32(0);
    return w.toUint8Array().buffer.slice(0, w.length);
}

function solidRed() {
    const px = new Uint8Array(SPRITE_BYTES);
    for (let i = 0; i < SPRITE_PIXELS; i++) {
        const o = i * 4;
        px[o] = 0xFF; px[o + 1] = 0xFF;
    }
    return px;
}

describe("SprFile — write overlay", () => {
    it("addSprite bumps spritesCount and getSpritePixels returns overlay", () => {
        const spr = new SprFile(emptySpr(3), V);
        const id = spr.addSprite(solidRed());
        assertEqual(id, 4);
        assertEqual(spr.spritesCount, 4);
        const got = spr.getSpritePixels(4);
        assertBytesEqual(got, solidRed());
    });

    it("replaceSprite overrides existing pixels", () => {
        const spr = new SprFile(emptySpr(3), V);
        spr.replaceSprite(1, solidRed());
        const got = spr.getSpritePixels(1);
        assertEqual(got[1], 0xFF, "red after replace");
    });

    it("removeSprite on highest id decrements; in middle blanks", () => {
        const spr = new SprFile(emptySpr(5), V);
        spr.addSprite(solidRed());
        assertEqual(spr.spritesCount, 6);
        spr.removeSprite(6);
        assertEqual(spr.spritesCount, 5);
        const before = spr.removeSprite(3);
        assert(before, "returns prev pixels");
        assertEqual(spr.spritesCount, 5, "middle remove keeps count");
        const blanked = spr.getSpritePixels(3);
        for (let i = 0; i < blanked.length; i++) assertEqual(blanked[i], 0, `pixel ${i}`);
    });

    it("compile picks up overrides — round-trip after addSprite", () => {
        const spr = new SprFile(emptySpr(2), V);
        spr.addSprite(solidRed());
        const bytes = compileSpr(spr, V);
        const reloaded = new SprFile(bytes.buffer.slice(0, bytes.length), V);
        assertEqual(reloaded.spritesCount, 3);
        assertBytesEqual(reloaded.getSpritePixels(3), solidRed());
    });
});
