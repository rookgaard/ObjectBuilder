// Base DAT reader — shared "texture patterns + sprite indices" block.
// AS3 reference: otlib.things.MetadataReader.readTexturePatterns.
//
// Per-generation flag dispatch lives in MetadataReader{N}.js; this file only
// holds what's stable across every Tibia version.

import { FrameDuration, getDefaultDuration } from "../../core/animation/FrameDuration.js";
import { SPRITE_DEFAULT_SIZE } from "../../core/sprites/spriteRle.js";

/**
 * Reads the texture-patterns + sprite-index block into `type`.
 *
 * @param {BinaryReader} reader
 * @param {ThingType}    type        will be mutated.
 * @param {boolean}      extended    true ⇒ 32-bit sprite ids (v ≥ 960 or AS3 "extended").
 * @param {boolean}      frameDurations true ⇒ per-frame durations on disk (v ≥ 1050).
 */
export function readTexturePatterns(reader, type, extended, frameDurations) {
    type.width  = reader.readUint8();
    type.height = reader.readUint8();

    if (type.width > 1 || type.height > 1) {
        type.exactSize = reader.readUint8();
    } else {
        type.exactSize = SPRITE_DEFAULT_SIZE;
    }

    type.layers   = reader.readUint8();
    type.patternX = reader.readUint8();
    type.patternY = reader.readUint8();
    type.patternZ = reader.readUint8();
    type.frames   = reader.readUint8();

    if (type.frames > 1) {
        type.isAnimation = true;
        type.frameDurations = new Array(type.frames);

        if (frameDurations) {
            type.animationMode = reader.readUint8();
            type.loopCount     = reader.readInt32();
            type.startFrame    = reader.readInt8();
            for (let i = 0; i < type.frames; i++) {
                const min = reader.readUint32();
                const max = reader.readUint32();
                type.frameDurations[i] = new FrameDuration(min, max);
            }
        } else {
            const d = getDefaultDuration(type.category);
            for (let i = 0; i < type.frames; i++) {
                type.frameDurations[i] = new FrameDuration(d, d);
            }
        }
    }

    const totalSprites = type.getTotalSprites();
    if (totalSprites > 4096) {
        throw new Error(
            `MetadataReader: ${type.category} ${type.id} declares ${totalSprites} sprites ` +
            "(AS3 caps at 4096 per object)"
        );
    }

    type.spriteIndex = new Array(totalSprites);
    for (let i = 0; i < totalSprites; i++) {
        type.spriteIndex[i] = extended ? reader.readUint32() : reader.readUint16();
    }
}
