// Conversions between the AS3 "decoded" pixel buffer (byte order A,R,G,B per
// pixel — matches BitmapData.getPixels) and HTML5 ImageData (R,G,B,A).

import { SPRITE_BYTES, SPRITE_DEFAULT_SIZE } from "./spriteRle.js";

/**
 * Convert ARGB pixels to RGBA pixels (in place is not safe — returns a new buffer).
 *
 * @param {Uint8Array} argb  byte order A,R,G,B per pixel.
 * @returns {Uint8ClampedArray} byte order R,G,B,A per pixel (suitable for ImageData).
 */
export function argbToRgba(argb) {
    const n = argb.length;
    if (n % 4 !== 0) {
        throw new RangeError(`argbToRgba: byte length ${n} is not a multiple of 4`);
    }
    const out = new Uint8ClampedArray(n);
    for (let i = 0; i < n; i += 4) {
        out[i    ] = argb[i + 1]; // R
        out[i + 1] = argb[i + 2]; // G
        out[i + 2] = argb[i + 3]; // B
        out[i + 3] = argb[i    ]; // A
    }
    return out;
}

/**
 * Inverse: RGBA → ARGB. Used when pulling pixels back out of a Canvas.
 *
 * @param {Uint8ClampedArray|Uint8Array} rgba
 * @returns {Uint8Array}
 */
export function rgbaToArgb(rgba) {
    const n = rgba.length;
    if (n % 4 !== 0) {
        throw new RangeError(`rgbaToArgb: byte length ${n} is not a multiple of 4`);
    }
    const out = new Uint8Array(n);
    for (let i = 0; i < n; i += 4) {
        out[i    ] = rgba[i + 3]; // A
        out[i + 1] = rgba[i    ]; // R
        out[i + 2] = rgba[i + 1]; // G
        out[i + 3] = rgba[i + 2]; // B
    }
    return out;
}

/**
 * Wrap a 4096-byte ARGB buffer as an ImageData suitable for canvas.putImageData.
 *
 * @param {Uint8Array} argb  4096 bytes (32×32).
 * @returns {ImageData}
 */
export function argbToImageData(argb) {
    if (argb.length !== SPRITE_BYTES) {
        throw new RangeError(
            `argbToImageData: expected ${SPRITE_BYTES} bytes, got ${argb.length}`
        );
    }
    return new ImageData(argbToRgba(argb), SPRITE_DEFAULT_SIZE, SPRITE_DEFAULT_SIZE);
}
