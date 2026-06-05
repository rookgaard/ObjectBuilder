// Generation-1 (Tibia 7.10 – 7.30) DAT reader.
// AS3 reference: otlib.things.MetadataReader1.

import F from "./MetadataFlags1.js";
import { readTexturePatterns as baseReadTexturePatterns } from "./MetadataReader.js";
import { FrameDuration, getDefaultDuration } from "../../core/animation/FrameDuration.js";
import { SPRITE_DEFAULT_SIZE } from "../../core/sprites/spriteRle.js";

export const GENERATION = 1;

export function readProperties(reader, type) {
    let flag = 0, previousFlag = 0;
    for (let safety = 0; safety < 256; safety++) {
        previousFlag = flag;
        flag = reader.readUint8();
        if (flag === F.LAST_FLAG) return;
        switch (flag) {
            case F.GROUND:           type.isGround = true; type.groundSpeed = reader.readUint16(); break;
            case F.ON_BOTTOM:        type.isOnBottom = true; break;
            case F.ON_TOP:           type.isOnTop = true; break;
            case F.CONTAINER:        type.isContainer = true; break;
            case F.STACKABLE:        type.stackable = true; break;
            case F.MULTI_USE:        type.multiUse = true; break;
            case F.FORCE_USE:        type.forceUse = true; break;
            case F.WRITABLE:         type.writable = true; type.maxReadWriteChars = reader.readUint16(); break;
            case F.WRITABLE_ONCE:    type.writableOnce = true; type.maxReadChars = reader.readUint16(); break;
            case F.FLUID_CONTAINER:  type.isFluidContainer = true; break;
            case F.FLUID:            type.isFluid = true; break;
            case F.UNPASSABLE:       type.isUnpassable = true; break;
            case F.UNMOVEABLE:       type.isUnmoveable = true; break;
            case F.BLOCK_MISSILE:    type.blockMissile = true; break;
            case F.BLOCK_PATHFINDER: type.blockPathfind = true; break;
            case F.PICKUPABLE:       type.pickupable = true; break;
            case F.HAS_LIGHT:        type.hasLight = true; type.lightLevel = reader.readUint16(); type.lightColor = reader.readUint16(); break;
            case F.FLOOR_CHANGE:     type.floorChange = true; break;
            case F.FULL_GROUND:      type.isFullGround = true; break;
            case F.HAS_ELEVATION:    type.hasElevation = true; type.elevation = reader.readUint16(); break;
            case F.HAS_OFFSET:       type.hasOffset = true; type.offsetX = 8; type.offsetY = 8; break;
            case F.MINI_MAP:         type.miniMap = true; type.miniMapColor = reader.readUint16(); break;
            case F.ROTATABLE:        type.rotatable = true; break;
            case F.LYING_OBJECT:     type.isLyingObject = true; break;
            case F.ANIMATE_ALWAYS:   type.animateAlways = true; break;
            case F.LENS_HELP:        type.isLensHelp = true; type.lensHelp = reader.readUint16(); break;
            default:
                throw new Error(
                    `MetadataReader1: unknown flag 0x${flag.toString(16)} ` +
                    `(prev=0x${previousFlag.toString(16)}) on ${type.category} ${type.id}`
                );
        }
    }
    throw new Error(`MetadataReader1: flag stream did not terminate on ${type.category} ${type.id}`);
}

// Gen-1 patterns: no patternZ byte (forced to 1), no exactSize byte either.
export function readTexturePatterns(reader, type, extended, frameDurations) {
    type.width  = reader.readUint8();
    type.height = reader.readUint8();
    if (type.width > 1 || type.height > 1) type.exactSize = reader.readUint8();
    else type.exactSize = SPRITE_DEFAULT_SIZE;

    type.layers   = reader.readUint8();
    type.patternX = reader.readUint8();
    type.patternY = reader.readUint8();
    type.patternZ = 1; // gen-1 has no Z byte
    type.frames   = reader.readUint8();

    if (type.frames > 1) {
        type.isAnimation = true;
        type.frameDurations = new Array(type.frames);
        const d = getDefaultDuration(type.category);
        for (let i = 0; i < type.frames; i++) type.frameDurations[i] = new FrameDuration(d, d);
    }

    const total = type.getTotalSprites();
    if (total > 4096) throw new Error(`MetadataReader1: ${type.category} ${type.id} > 4096 sprites`);
    type.spriteIndex = new Array(total);
    for (let i = 0; i < total; i++) {
        type.spriteIndex[i] = extended ? reader.readUint32() : reader.readUint16();
    }
}
