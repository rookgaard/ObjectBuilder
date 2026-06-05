// SprCompiler — inverse of SprFile. Emits header + sprite address table +
// per-sprite chunks (3-byte magenta marker + u16 length + RLE payload).
//
// Reads pixel buffers via `spr.getSpritePixels(id)` so it works on either
// the SprFile we just loaded OR a fully synthetic Map<id, Uint8Array(4096)>
// when the caller doesn't have an SprFile (Stage 8 "new sprite" flow).

import { BinaryWriter } from "../../core/binary/BinaryWriter.js";
import { encodeSpritePixels, SPRITE_BYTES } from "../../core/sprites/spriteRle.js";

const HEADER_BASE = 6; // u32 sig + u16 count
const HEADER_EXT  = 8; // u32 sig + u32 count
const ADDRESS     = 4; // u32 offset per slot
const MARKER      = 3; // u8 r + u8 g + u8 b (magenta) per sprite chunk
const LEN_PREFIX  = 2; // u16 chunk length per sprite chunk

/**
 * Compile a sprite source into a fresh Uint8Array.
 *
 * @param {object}  src
 * @param {number}  src.spritesCount
 * @param {(id:number)=>Uint8Array|null} src.getSpritePixels
 * @param {Version} version
 * @param {object}  [options]
 * @param {boolean} [options.extended]      32-bit header + ids (auto from v ≥ 960).
 * @param {boolean} [options.transparency]  per-pixel alpha mode. Opt-in only;
 *   not auto-derived from the client version.
 * @returns {Uint8Array}
 */
export function compileSpr(src, version, options = {}) {
    const extended     = options.extended     ?? (version.value >= 960);
    const transparency = options.transparency ?? false;

    const count      = src.spritesCount | 0;
    const headerSize = extended ? HEADER_EXT : HEADER_BASE;
    const tableSize  = count * ADDRESS;

    // Pre-encode every sprite so we know the exact payload bytes + offset table.
    /** @type {(Uint8Array | null)[]} */
    const payloads = new Array(count + 1).fill(null); // 1-indexed; [0] unused
    for (let id = 1; id <= count; id++) {
        const pixels = src.getSpritePixels(id);
        if (!pixels || pixels.length !== SPRITE_BYTES) {
            payloads[id] = null;
            continue;
        }
        const encoded = encodeSpritePixels(pixels, { transparent: transparency });
        payloads[id] = encoded.length === 0 ? null : encoded;
    }

    // Total size: header + offset table + Σ (MARKER + LEN_PREFIX + payload) for non-empty.
    let total = headerSize + tableSize;
    for (let id = 1; id <= count; id++) {
        if (payloads[id]) total += MARKER + LEN_PREFIX + payloads[id].length;
    }

    const w = new BinaryWriter(total);
    w.writeUint32(version.sprSignature);
    if (extended) w.writeUint32(count);
    else          w.writeUint16(count);

    // Reserve the address table area; we backfill while writing chunks.
    const addressTablePos = w.position;
    w.position = addressTablePos + tableSize;

    for (let id = 1; id <= count; id++) {
        const payload = payloads[id];
        // Address of this slot
        const slotPos = addressTablePos + (id - 1) * ADDRESS;

        if (!payload) {
            const here = w.position;
            w.position = slotPos;
            w.writeUint32(0);
            w.position = here;
            continue;
        }

        const chunkStart = w.position;
        w.writeUint8(0xFF); w.writeUint8(0x00); w.writeUint8(0xFF); // magenta marker
        w.writeUint16(payload.length);
        w.writeBytes(payload);

        const afterChunk = w.position;
        w.position = slotPos;
        w.writeUint32(chunkStart);
        w.position = afterChunk;
    }

    return w.toUint8Array();
}
