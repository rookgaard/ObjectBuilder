// Synthetic SPR round-trip: build a fake SprFile-like source, compile,
// re-parse, compare per-sprite pixel buffers.

import { describe, it, assert, assertEqual, assertBytesEqual } from "../runner.js";
import { compileSpr } from "../../src/formats/spr/SprCompiler.js";
import { SprFile }    from "../../src/formats/spr/SprFile.js";
import { SPRITE_BYTES, SPRITE_PIXELS } from "../../src/core/sprites/spriteRle.js";
import { Version } from "../../src/core/Version.js";

const V = new Version({ value: 772, valueStr: "7.72", datSignature: 0x439D5A33, sprSignature: 0x439852BE });

function solidRed() {
    const px = new Uint8Array(SPRITE_BYTES);
    for (let i = 0; i < SPRITE_PIXELS; i++) {
        const o = i * 4;
        px[o] = 0xFF; px[o + 1] = 0xFF; px[o + 2] = 0; px[o + 3] = 0;
    }
    return px;
}

function mixed() {
    const px = new Uint8Array(SPRITE_BYTES);
    px[3 * 4] = 0xFF; px[3 * 4 + 1] = 0x11; px[3 * 4 + 2] = 0x22; px[3 * 4 + 3] = 0x33;
    px[4 * 4] = 0xFF; px[4 * 4 + 1] = 0x44; px[4 * 4 + 2] = 0x55; px[4 * 4 + 3] = 0x66;
    return px;
}

describe("SprCompiler — synthetic round-trip", () => {
    it("3 sprites (solid red, empty, mixed) survive compile + reload", () => {
        const src = {
            spritesCount: 3,
            getSpritePixels(id) {
                if (id === 1) return solidRed();
                if (id === 2) return new Uint8Array(SPRITE_BYTES); // all-zero = empty
                if (id === 3) return mixed();
                return null;
            },
        };

        const bytes = compileSpr(src, V, { extended: false, transparency: false });

        // Header sanity
        assertEqual(bytes[0], 0x33, "sig byte 0");
        assertEqual(bytes[1], 0x5A, "sig byte 1");
        assertEqual(bytes[2], 0x9D, "sig byte 2");
        assertEqual(bytes[3], 0x43, "sig byte 3");
        assertEqual(bytes[4] | (bytes[5] << 8), 3, "spritesCount");

        // Reload and compare pixels per sprite.
        const reloaded = new SprFile(bytes.buffer.slice(0, bytes.length), V);
        assertEqual(reloaded.spritesCount, 3);
        assertBytesEqual(reloaded.getSpritePixels(1), solidRed());
        assertBytesEqual(reloaded.getSpritePixels(3), mixed());
        // Empty sprite: all-zero buffer
        const empty = reloaded.getSpritePixels(2);
        for (let i = 0; i < SPRITE_BYTES; i++) assertEqual(empty[i], 0, `empty byte ${i}`);
    });

    it("empty sprite gets address 0 in the offset table", () => {
        const src = {
            spritesCount: 2,
            getSpritePixels(id) {
                if (id === 1) return solidRed();
                if (id === 2) return new Uint8Array(SPRITE_BYTES);
                return null;
            },
        };
        const bytes = compileSpr(src, V, { extended: false, transparency: false });
        // Address table starts at byte 6. Sprite 2's offset is at bytes 10..13.
        const addr2 = bytes[10] | (bytes[11] << 8) | (bytes[12] << 16) | (bytes[13] << 24);
        assertEqual(addr2 >>> 0, 0, "address 0 for empty sprite");
    });
});
