// Tests for sprite RLE codec — round-trip across the three canonical shapes:
// fully transparent, fully opaque, mixed runs.

import { describe, it, assertEqual, assertBytesEqual } from "../runner.js";
import {
    encodeSpritePixels,
    decodeSpritePixels,
    SPRITE_PIXELS,
    SPRITE_BYTES,
} from "../../src/core/sprites/spriteRle.js";

function buildPixels(builder) {
    const buf = new Uint8Array(SPRITE_BYTES);
    builder(buf);
    return buf;
}

function setPixel(buf, idx, a, r, g, b) {
    const o = idx * 4;
    buf[o    ] = a;
    buf[o + 1] = r;
    buf[o + 2] = g;
    buf[o + 3] = b;
}

describe("spriteRle — fully transparent", () => {
    it("encodes to zero bytes (isEmpty)", () => {
        const pixels = buildPixels(() => {});
        const enc = encodeSpritePixels(pixels, { transparent: true });
        assertEqual(enc.length, 0);
    });

    it("decodes empty stream back to all-zero pixels", () => {
        const dec = decodeSpritePixels(new Uint8Array(0), { transparent: true });
        assertEqual(dec.length, SPRITE_BYTES);
        for (let i = 0; i < SPRITE_BYTES; i++) {
            assertEqual(dec[i], 0, `byte ${i}`);
        }
    });
});

describe("spriteRle — fully opaque (transparent: false)", () => {
    it("round-trips a solid red sprite", () => {
        const pixels = buildPixels((buf) => {
            for (let i = 0; i < SPRITE_PIXELS; i++) {
                setPixel(buf, i, 0xFF, 0xFF, 0x00, 0x00);
            }
        });

        const enc = encodeSpritePixels(pixels, { transparent: false });

        // First 2 bytes = transparent run = 0; next 2 = colored run = 1024.
        assertEqual(enc[0], 0x00);
        assertEqual(enc[1], 0x00);
        assertEqual(enc[2], 0x00); // 1024 low byte
        assertEqual(enc[3], 0x04); // 1024 high byte (0x0400 LE)

        // Then 1024 × 3 bytes (R,G,B). Total length = 4 + 1024*3 = 3076.
        assertEqual(enc.length, 4 + SPRITE_PIXELS * 3);

        const dec = decodeSpritePixels(enc, { transparent: false });
        // Decoded sprite has implicit alpha 0xFF for colored pixels.
        for (let i = 0; i < SPRITE_PIXELS; i++) {
            const o = i * 4;
            assertEqual(dec[o    ], 0xFF, `pixel ${i} alpha`);
            assertEqual(dec[o + 1], 0xFF, `pixel ${i} red`);
            assertEqual(dec[o + 2], 0x00, `pixel ${i} green`);
            assertEqual(dec[o + 3], 0x00, `pixel ${i} blue`);
        }
    });
});

describe("spriteRle — mixed runs", () => {
    it("encodes leading-transparent + colored + trailing-transparent correctly", () => {
        // Layout: 3 transparent, 4 colored, then 1017 transparent.
        const pixels = buildPixels((buf) => {
            setPixel(buf, 3, 0xFF, 0x11, 0x22, 0x33);
            setPixel(buf, 4, 0xFF, 0x44, 0x55, 0x66);
            setPixel(buf, 5, 0xFF, 0x77, 0x88, 0x99);
            setPixel(buf, 6, 0xFF, 0xAA, 0xBB, 0xCC);
        });

        const enc = encodeSpritePixels(pixels, { transparent: false });

        // Expected stream:
        //   u16 transparentRun = 3      → 03 00
        //   u16 coloredRun     = 4      → 04 00
        //   4 × (R G B)                 → 12 bytes
        const expected = new Uint8Array([
            0x03, 0x00,
            0x04, 0x00,
            0x11, 0x22, 0x33,
            0x44, 0x55, 0x66,
            0x77, 0x88, 0x99,
            0xAA, 0xBB, 0xCC,
        ]);

        assertBytesEqual(enc, expected);

        const dec = decodeSpritePixels(enc, { transparent: false });
        // First 3 pixels still zero, next 4 carry colors, rest still zero.
        for (let i = 0; i < 3; i++) {
            for (let b = 0; b < 4; b++) assertEqual(dec[i * 4 + b], 0, `tx pix ${i} byte ${b}`);
        }
        assertEqual(dec[3 * 4 + 1], 0x11);
        assertEqual(dec[6 * 4 + 3], 0xCC);
        // Trailing zeros
        for (let i = 7; i < SPRITE_PIXELS; i++) {
            for (let b = 0; b < 4; b++) assertEqual(dec[i * 4 + b], 0, `tail pix ${i} byte ${b}`);
        }
    });
});

describe("spriteRle — transparent:true round-trip", () => {
    it("preserves per-pixel alpha", () => {
        // 2 transparent + 3 colored with varying alpha + tail transparent.
        const pixels = buildPixels((buf) => {
            setPixel(buf, 2, 0x80, 0x11, 0x22, 0x33);
            setPixel(buf, 3, 0xC0, 0x44, 0x55, 0x66);
            setPixel(buf, 4, 0xFF, 0x77, 0x88, 0x99);
        });

        const enc = encodeSpritePixels(pixels, { transparent: true });

        // Expected: tx=2, col=3, then per-pixel (R,G,B,A).
        const expected = new Uint8Array([
            0x02, 0x00,
            0x03, 0x00,
            0x11, 0x22, 0x33, 0x80,
            0x44, 0x55, 0x66, 0xC0,
            0x77, 0x88, 0x99, 0xFF,
        ]);
        assertBytesEqual(enc, expected);

        const dec = decodeSpritePixels(enc, { transparent: true });
        // Spot check pixel 2 and pixel 4.
        assertEqual(dec[2 * 4    ], 0x80, "pixel 2 alpha");
        assertEqual(dec[2 * 4 + 1], 0x11, "pixel 2 red");
        assertEqual(dec[4 * 4    ], 0xFF, "pixel 4 alpha");
        assertEqual(dec[4 * 4 + 3], 0x99, "pixel 4 blue");
    });
});
