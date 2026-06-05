// Generation-2 (Tibia 7.40 – 7.50) DAT reader. Same patterns layout as gen-1
// (no patternZ byte). HAS_OFFSET still no payload.
// AS3 reference: otlib.things.MetadataReader2.

import F from "./MetadataFlags2.js";
import { readTexturePatterns } from "./MetadataReader1.js"; // shared no-Z layout

export { readTexturePatterns };
export const GENERATION = 2;

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
            case F.WRITABLE:         type.writable = true; type.maxTextLength = reader.readUint16(); break;
            case F.WRITABLE_ONCE:    type.writableOnce = true; type.maxTextLength = reader.readUint16(); break;
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
            case F.HANGABLE:         type.hangable = true; break;
            case F.VERTICAL:         type.isVertical = true; break;
            case F.HORIZONTAL:       type.isHorizontal = true; break;
            case F.ANIMATE_ALWAYS:   type.animateAlways = true; break;
            case F.LENS_HELP:        type.isLensHelp = true; type.lensHelp = reader.readUint16(); break;
            default:
                throw new Error(
                    `MetadataReader2: unknown flag 0x${flag.toString(16)} ` +
                    `(prev=0x${previousFlag.toString(16)}) on ${type.category} ${type.id}`
                );
        }
    }
    throw new Error(`MetadataReader2: flag stream did not terminate on ${type.category} ${type.id}`);
}
