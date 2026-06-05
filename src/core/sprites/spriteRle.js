// Sprite RLE codec — direct port of AS3 otlib.sprites.Sprite.compressPixels /
// uncompressPixels. Operates on the AS3 "decoded" pixel buffer:
//
//   - 1024 pixels per sprite (32 × 32)
//   - 4 bytes per pixel, byte order: A R G B
//     (matches BitmapData.getPixels() in AS3 / Flash BIG_ENDIAN ARGB)
//
// `transparent: false` mode (legacy clients ≤ 8.54): no alpha byte in the
// stream, alpha is implicit 0xFF on colored pixels / 0x00 on transparent runs.
//
// `transparent: true` mode (clients ≥ 8.55): per-pixel alpha byte in the
// stream, kept as-is on decode.
//
// Compressed stream format (little-endian unsigned shorts for the run lengths):
//
//   [u16 transparentRunPixels][u16 coloredRunPixels][R G B (A?)] × coloredRunPixels
//   …repeated until 1024 pixels accounted for…
//   (a fully transparent sprite produces zero bytes — `isEmpty`.)

export const SPRITE_PIXELS  = 32 * 32;        // 1024
export const SPRITE_BYTES   = SPRITE_PIXELS * 4; // 4096 (A,R,G,B)
export const SPRITE_DEFAULT_SIZE = 32;

/**
 * Encode a decoded ARGB pixel buffer into the RLE stream used by Tibia.spr.
 *
 * @param {Uint8Array} pixels     4096 bytes, byte order A,R,G,B per pixel.
 * @param {object}     [options]
 * @param {boolean}    [options.transparent=false]  emit alpha bytes when true.
 * @returns {Uint8Array} compressed bytes (may be length 0 = fully transparent).
 */
export function encodeSpritePixels(pixels, { transparent = false } = {}) {
    if (!(pixels instanceof Uint8Array)) {
        throw new TypeError("encodeSpritePixels: pixels must be a Uint8Array");
    }
    if (pixels.length !== SPRITE_BYTES) {
        throw new RangeError(
            `encodeSpritePixels: expected ${SPRITE_BYTES} bytes, got ${pixels.length}`
        );
    }

    // Output buffer: worst case ~ length × 1.5 + overhead. Allocate 8 KB and
    // trim at the end; we will never overshoot that.
    const out = new Uint8Array(SPRITE_BYTES * 2);
    let outPos = 0;

    const writeU16 = (at, v) => {
        out[at]     = v & 0xFF;
        out[at + 1] = (v >> 8) & 0xFF;
    };

    let index = 0;
    let alphaCount = 0;

    while (index < SPRITE_PIXELS) {
        // Count leading transparent pixels.
        let chunkSize = 0;
        while (index < SPRITE_PIXELS) {
            const o = index * 4;
            const a = pixels[o], r = pixels[o + 1], g = pixels[o + 2], b = pixels[o + 3];
            const isTransparent = (a === 0 && r === 0 && g === 0 && b === 0);
            if (!isTransparent) break;
            alphaCount++;
            chunkSize++;
            index++;
        }

        if (alphaCount >= SPRITE_PIXELS) break;   // fully transparent: bail out
        if (index >= SPRITE_PIXELS) break;        // last run was transparent: skip

        writeU16(outPos, chunkSize);
        outPos += 2;

        const coloredPosAt = outPos;
        outPos += 2; // placeholder for colored count

        chunkSize = 0;
        while (index < SPRITE_PIXELS) {
            const o = index * 4;
            const a = pixels[o], r = pixels[o + 1], g = pixels[o + 2], b = pixels[o + 3];
            const isTransparent = (a === 0 && r === 0 && g === 0 && b === 0);
            if (isTransparent) break;

            out[outPos++] = r;
            out[outPos++] = g;
            out[outPos++] = b;
            if (transparent) out[outPos++] = a;

            chunkSize++;
            index++;
        }

        writeU16(coloredPosAt, chunkSize);
    }

    return out.slice(0, outPos);
}

/**
 * Decode an RLE stream back into a 4096-byte ARGB pixel buffer.
 *
 * @param {Uint8Array} compressed
 * @param {object}     [options]
 * @param {boolean}    [options.transparent=false]
 * @returns {Uint8Array} 4096 bytes, byte order A,R,G,B per pixel.
 */
export function decodeSpritePixels(compressed, { transparent = false } = {}) {
    if (!(compressed instanceof Uint8Array)) {
        throw new TypeError("decodeSpritePixels: compressed must be a Uint8Array");
    }

    const pixels = new Uint8Array(SPRITE_BYTES);
    if (compressed.length === 0) {
        // Empty stream = fully transparent. Already zero-filled.
        return pixels;
    }

    let readPos  = 0;
    let writePos = 0;

    const readU16 = () => {
        const v = compressed[readPos] | (compressed[readPos + 1] << 8);
        readPos += 2;
        return v;
    };

    while (readPos < compressed.length) {
        const transparentPixels = readU16();
        const coloredPixels     = readU16();

        // Transparent run: bytes already 0 from the Uint8Array init.
        writePos += transparentPixels * 4;

        for (let i = 0; i < coloredPixels; i++) {
            const r = compressed[readPos++];
            const g = compressed[readPos++];
            const b = compressed[readPos++];
            const a = transparent ? compressed[readPos++] : 0xFF;

            pixels[writePos++] = a;
            pixels[writePos++] = r;
            pixels[writePos++] = g;
            pixels[writePos++] = b;
        }
    }

    // Tail (after the last decoded run) stays zero-filled — matches the AS3
    // uncompressPixels behavior of padding with transparent pixels.
    return pixels;
}
