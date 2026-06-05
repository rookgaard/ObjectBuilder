// Generation-4 (Tibia 7.80 – 8.54) DAT reader.
// AS3 reference: otlib.things.MetadataReader4.

import F from "./MetadataFlags4.js";

export { readTexturePatterns } from "./MetadataReader.js";
export const GENERATION = 4;

export function readProperties(reader, type) {
    let flag = 0, previousFlag = 0;
    for (let safety = 0; safety < 256; safety++) {
        previousFlag = flag;
        flag = reader.readUint8();
        if (flag === F.LAST_FLAG) return;
        switch (flag) {
            case F.GROUND:          type.isGround = true; type.groundSpeed = reader.readUint16(); break;
            case F.GROUND_BORDER:   type.isGroundBorder = true; break;
            case F.ON_BOTTOM:       type.isOnBottom = true; break;
            case F.ON_TOP:          type.isOnTop = true; break;
            case F.CONTAINER:       type.isContainer = true; break;
            case F.STACKABLE:       type.stackable = true; break;
            case F.FORCE_USE:       type.forceUse = true; break;
            case F.MULTI_USE:       type.multiUse = true; break;
            case F.HAS_CHARGES:     type.hasCharges = true; break;
            case F.WRITABLE:        type.writable = true; type.maxTextLength = reader.readUint16(); break;
            case F.WRITABLE_ONCE:   type.writableOnce = true; type.maxTextLength = reader.readUint16(); break;
            case F.FLUID_CONTAINER: type.isFluidContainer = true; break;
            case F.FLUID:           type.isFluid = true; break;
            case F.UNPASSABLE:      type.isUnpassable = true; break;
            case F.UNMOVEABLE:      type.isUnmoveable = true; break;
            case F.BLOCK_MISSILE:   type.blockMissile = true; break;
            case F.BLOCK_PATHFIND:  type.blockPathfind = true; break;
            case F.PICKUPABLE:      type.pickupable = true; break;
            case F.HANGABLE:        type.hangable = true; break;
            case F.VERTICAL:        type.isVertical = true; break;
            case F.HORIZONTAL:      type.isHorizontal = true; break;
            case F.ROTATABLE:       type.rotatable = true; break;
            case F.HAS_LIGHT:       type.hasLight = true; type.lightLevel = reader.readUint16(); type.lightColor = reader.readUint16(); break;
            case F.DONT_HIDE:       type.dontHide = true; break;
            case F.FLOOR_CHANGE:    type.floorChange = true; break;
            case F.HAS_OFFSET:      type.hasOffset = true; type.offsetX = reader.readUint16(); type.offsetY = reader.readUint16(); break;
            case F.HAS_ELEVATION:   type.hasElevation = true; type.elevation = reader.readUint16(); break;
            case F.LYING_OBJECT:    type.isLyingObject = true; break;
            case F.ANIMATE_ALWAYS:  type.animateAlways = true; break;
            case F.MINI_MAP:        type.miniMap = true; type.miniMapColor = reader.readUint16(); break;
            case F.LENS_HELP:       type.isLensHelp = true; type.lensHelp = reader.readUint16(); break;
            case F.FULL_GROUND:     type.isFullGround = true; break;
            case F.IGNORE_LOOK:     type.ignoreLook = true; break;
            default:
                throw new Error(
                    `MetadataReader4: unknown flag 0x${flag.toString(16)} ` +
                    `(prev=0x${previousFlag.toString(16)}) on ${type.category} ${type.id}`
                );
        }
    }
    throw new Error(`MetadataReader4: flag stream did not terminate on ${type.category} ${type.id}`);
}
