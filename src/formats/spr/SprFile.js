// SprFile — wraps a Tibia.spr ArrayBuffer and lazy-decodes sprites on demand.
// AS3 reference: otlib.sprites.SpriteStorage.onLoad + SpriteReader.readSprite.
//
// Layout (little-endian):
//   u32 signature
//   u16/u32 spritesCount   (u32 when "extended", from v ≥ 960)
//   u32 address[spritesCount]   (0 ⇒ empty sprite)
//   …per sprite, at its address: u8 r, u8 g, u8 b (unused), u16 dataLen, u8[dataLen] rle…

import { BinaryReader } from "../../core/binary/BinaryReader.js";
import {
    decodeSpritePixels,
    SPRITE_BYTES,
} from "../../core/sprites/spriteRle.js";

const HEADER_BASE = 6; // u32 signature + u16 count
const HEADER_EXT  = 8; // u32 signature + u32 count
const ADDRESS     = 4; // u32 offset per sprite slot

export class SprFile {
    /**
     * @param {ArrayBuffer|Uint8Array} buffer
     * @param {Version} version
     * @param {object}  [options]
     * @param {boolean} [options.extended]      32-bit count + ids (auto from v ≥ 960).
     * @param {boolean} [options.transparency]  per-pixel alpha mode (auto from v ≥ 855).
     * @param {boolean} [options.strict=true]   throw on signature mismatch.
     */
    constructor(buffer, version, { extended, transparency, strict = true } = {}) {
        this.buffer = buffer instanceof ArrayBuffer
            ? buffer
            : buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength);
        this.version = version;
        this.extended     = extended    ?? version.value >= 960;
        this.transparency = transparency ?? version.value >= 855;
        this.headerSize   = this.extended ? HEADER_EXT : HEADER_BASE;

        const r = new BinaryReader(this.buffer);
        if (r.length < this.headerSize) {
            throw new Error(`SprFile: file too small (${r.length} bytes, need ≥ ${this.headerSize})`);
        }
        this.signature    = r.readUint32();
        this.spritesCount = this.extended ? r.readUint32() : r.readUint16();

        this.signatureMismatch = this.signature !== version.sprSignature;
        if (this.signatureMismatch && strict) {
            console.warn(
                `[SprFile] signature mismatch: file 0x${this.signature.toString(16).toUpperCase()} ` +
                `vs version ${version.valueStr} 0x${version.sprSignature.toString(16).toUpperCase()}`
            );
        }

        /** @type {Map<number, Uint8Array>} cache of decoded ARGB pixel buffers */
        this._cache = new Map();
        // Sprite id 0 is canonical "blank" — never stored, always returns zeros.
        this._blank = new Uint8Array(SPRITE_BYTES);
    }

    /** Returns true if `id` is within the file's sprite range. */
    hasSprite(id) {
        return id > 0 && id <= this.spritesCount;
    }

    /**
     * Returns the decoded 4096-byte ARGB pixel buffer for sprite `id`.
     * id == 0 ⇒ blank sprite. Out-of-range ids return null.
     */
    getSpritePixels(id) {
        if (id === 0) return this._blank;
        if (!this.hasSprite(id)) return null;

        const cached = this._cache.get(id);
        if (cached) return cached;

        const r = new BinaryReader(this.buffer);
        r.seek(this.headerSize + (id - 1) * ADDRESS);
        const address = r.readUint32();

        let pixels;
        if (address === 0) {
            pixels = this._blank;
        } else {
            r.seek(address);
            r.skip(3); // magenta marker R/G/B — unused
            const dataLen = r.readUint16();
            const compressed = dataLen > 0
                ? r.readBytesCopy(dataLen)
                : new Uint8Array(0);
            pixels = decodeSpritePixels(compressed, { transparent: this.transparency });
        }

        this._cache.set(id, pixels);
        return pixels;
    }

    /** True iff sprite `id` carries no pixel data (address 0 or zero-length payload). */
    isEmpty(id) {
        if (id === 0) return true;
        if (!this.hasSprite(id)) return true;
        if (this._cache.has(id)) {
            const buf = this._cache.get(id);
            // All-zero ARGB ⇒ empty.
            for (let i = 0; i < buf.length; i++) if (buf[i] !== 0) return false;
            return true;
        }
        const r = new BinaryReader(this.buffer);
        r.seek(this.headerSize + (id - 1) * ADDRESS);
        const address = r.readUint32();
        if (address === 0) return true;
        r.seek(address);
        r.skip(3);
        return r.readUint16() === 0;
    }
}
