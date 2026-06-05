// Base DAT reader — shared "texture patterns + sprite indices" block.
// AS3 reference: otlib.things.MetadataReader.readTexturePatterns.

import { FrameDuration, getDefaultDuration } from "../../core/animation/FrameDuration.js";
import { FrameGroup } from "../../core/animation/FrameGroup.js";
import { SPRITE_DEFAULT_SIZE } from "../../core/sprites/spriteRle.js";
import { OUTFIT } from "../../core/things/ThingCategory.js";

/**
 * @param {BinaryReader} reader
 * @param {ThingType}    type
 * @param {boolean}      extended       u32 sprite ids when true (v ≥ 960).
 * @param {boolean}      frameDurations per-frame durations on disk (v ≥ 1050).
 * @param {boolean}      [frameGroups=false] outfits carry multiple FrameGroups
 *   on disk (Tibia 10.57+). Each group is prefixed with a u8 groupType.
 */
export function readTexturePatterns(reader, type, extended, frameDurations, frameGroups = false) {
    const useGroups = frameGroups && type.category === OUTFIT;
    const groupCount = useGroups ? reader.readUint8() : 1;

    type.frameGroups = [];

    for (let g = 0; g < groupCount; g++) {
        const groupType = useGroups ? reader.readUint8() : 0;
        const fg = new FrameGroup();
        fg.type = groupType;

        fg.width  = reader.readUint8();
        fg.height = reader.readUint8();
        fg.exactSize = (fg.width > 1 || fg.height > 1) ? reader.readUint8() : SPRITE_DEFAULT_SIZE;

        fg.layers   = reader.readUint8();
        fg.patternX = reader.readUint8();
        fg.patternY = reader.readUint8();
        fg.patternZ = reader.readUint8();
        fg.frames   = reader.readUint8();

        if (fg.frames > 1) {
            fg.isAnimation = true;
            fg.frameDurations = new Array(fg.frames);
            if (frameDurations) {
                fg.animationMode = reader.readUint8();
                fg.loopCount     = reader.readInt32();
                fg.startFrame    = reader.readInt8();
                for (let i = 0; i < fg.frames; i++) {
                    const min = reader.readUint32();
                    const max = reader.readUint32();
                    fg.frameDurations[i] = new FrameDuration(min, max);
                }
            } else {
                const d = getDefaultDuration(type.category);
                for (let i = 0; i < fg.frames; i++) {
                    fg.frameDurations[i] = new FrameDuration(d, d);
                }
            }
        }

        const totalSprites = fg.getTotalSprites();
        if (totalSprites > 4096) {
            throw new Error(
                `MetadataReader: ${type.category} ${type.id} group ${groupType} ` +
                `declares ${totalSprites} sprites (AS3 caps at 4096 per object)`
            );
        }

        fg.spriteIndex = new Array(totalSprites);
        for (let i = 0; i < totalSprites; i++) {
            fg.spriteIndex[i] = extended ? reader.readUint32() : reader.readUint16();
        }

        if (useGroups) type.frameGroups[groupType] = fg;
        // Mirror group 0 (or the only group) onto the root so existing UI /
        // preview / sprite-index math sees the same data as ThingType always did.
        if (g === 0) copyGroupToRoot(type, fg);
    }
}

function copyGroupToRoot(type, fg) {
    type.width = fg.width;
    type.height = fg.height;
    type.exactSize = fg.exactSize;
    type.layers = fg.layers;
    type.patternX = fg.patternX;
    type.patternY = fg.patternY;
    type.patternZ = fg.patternZ;
    type.frames = fg.frames;
    type.isAnimation = fg.isAnimation;
    type.animationMode = fg.animationMode;
    type.loopCount = fg.loopCount;
    type.startFrame = fg.startFrame;
    type.frameDurations = fg.frameDurations;
    type.spriteIndex = fg.spriteIndex;
}
