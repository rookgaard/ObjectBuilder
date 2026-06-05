// Base DAT writer — shared texture-patterns + sprite-index block.
// AS3 reference: otlib.things.MetadataWriter.writeTexturePatterns.

import { OUTFIT } from "../../core/things/ThingCategory.js";

/**
 * @param {BinaryWriter} writer
 * @param {ThingType}    type
 * @param {boolean}      extended         u32 sprite ids when true.
 * @param {boolean}      frameDurations   per-frame durations on disk (v ≥ 1050).
 * @param {boolean}      [frameGroups=false] outfits carry multiple FrameGroups
 *   on disk (Tibia 10.57+).
 */
export function writeTexturePatterns(writer, type, extended, frameDurations, frameGroups = false) {
    const useGroups = frameGroups && type.category === OUTFIT &&
                      Array.isArray(type.frameGroups) && type.frameGroups.length > 0;

    if (useGroups) {
        const groups = type.frameGroups.filter(Boolean);
        writer.writeUint8(groups.length);
        for (const g of groups) {
            writer.writeUint8(g.type);
            writeOneGroup(writer, g, extended, frameDurations);
        }
        return;
    }

    // Single-group path — emit straight from the ThingType root fields.
    writeOneGroup(writer, type, extended, frameDurations);
}

function writeOneGroup(writer, src, extended, frameDurations) {
    writer.writeUint8(src.width);
    writer.writeUint8(src.height);

    if (src.width > 1 || src.height > 1) {
        writer.writeUint8(src.exactSize);
    }

    writer.writeUint8(src.layers);
    writer.writeUint8(src.patternX);
    writer.writeUint8(src.patternY);
    writer.writeUint8(src.patternZ);
    writer.writeUint8(src.frames);

    if (frameDurations && src.isAnimation) {
        writer.writeUint8(src.animationMode);
        writer.writeInt32(src.loopCount);
        writer.writeInt8(src.startFrame);
        for (let i = 0; i < src.frames; i++) {
            const d = src.frameDurations[i];
            writer.writeUint32(d.minimum);
            writer.writeUint32(d.maximum);
        }
    }

    const spriteIndex = src.spriteIndex || [];
    for (let i = 0; i < spriteIndex.length; i++) {
        if (extended) writer.writeUint32(spriteIndex[i]);
        else          writer.writeUint16(spriteIndex[i]);
    }
}
