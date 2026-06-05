// Generation-3 (Tibia 7.55 – 7.72) DAT property writer.
// AS3 reference: otlib.things.MetadataWriter3.
//
// Flag emission ORDER matters: it mirrors AS3 exactly so a load-then-compile
// round-trip can stay byte-identical against the same input. The four
// placement flags (GROUND / GROUND_BORDER / ON_BOTTOM / ON_TOP) are
// mutually exclusive in the writer — only one is emitted even if multiple
// happen to be true on the ThingType (which never happens in valid Tibia data).

import F from "./MetadataFlags3.js";
import { ITEM } from "../../core/things/ThingCategory.js";

export const GENERATION = 3;

export { writeTexturePatterns } from "./MetadataWriter.js";

/**
 * Emits the flag stream for an outfit / effect / missile and terminates with
 * LAST_FLAG. Gen-3 outfits-and-friends have a tiny flag set: HAS_LIGHT,
 * HAS_OFFSET, ANIMATE_ALWAYS (matches AS3 writeProperties).
 *
 * @param {BinaryWriter} writer
 * @param {ThingType}    type
 */
export function writeProperties(writer, type) {
    if (type.category === ITEM) {
        throw new Error("MetadataWriter3.writeProperties called on an item — use writeItemProperties");
    }

    if (type.hasLight) {
        writer.writeUint8(F.HAS_LIGHT);
        writer.writeUint16(type.lightLevel);
        writer.writeUint16(type.lightColor);
    }
    if (type.hasOffset) {
        writer.writeUint8(F.HAS_OFFSET);
        writer.writeUint16(type.offsetX);
        writer.writeUint16(type.offsetY);
    }
    if (type.animateAlways) writer.writeUint8(F.ANIMATE_ALWAYS);

    writer.writeUint8(F.LAST_FLAG);
}

/**
 * Emits the (much larger) flag stream for items.
 *
 * @param {BinaryWriter} writer
 * @param {ThingType}    type
 */
export function writeItemProperties(writer, type) {
    if (type.category !== ITEM) {
        throw new Error("MetadataWriter3.writeItemProperties called on a non-item");
    }

    if (type.isGround) {
        writer.writeUint8(F.GROUND);
        writer.writeUint16(type.groundSpeed);
    } else if (type.isGroundBorder) writer.writeUint8(F.GROUND_BORDER);
    else if (type.isOnBottom)       writer.writeUint8(F.ON_BOTTOM);
    else if (type.isOnTop)          writer.writeUint8(F.ON_TOP);

    if (type.isContainer)   writer.writeUint8(F.CONTAINER);
    if (type.stackable)     writer.writeUint8(F.STACKABLE);
    if (type.multiUse)      writer.writeUint8(F.MULTI_USE);
    if (type.forceUse)      writer.writeUint8(F.FORCE_USE);

    if (type.writable) {
        writer.writeUint8(F.WRITABLE);
        writer.writeUint16(type.maxTextLength);
    }
    if (type.writableOnce) {
        writer.writeUint8(F.WRITABLE_ONCE);
        writer.writeUint16(type.maxTextLength);
    }

    if (type.isFluidContainer) writer.writeUint8(F.FLUID_CONTAINER);
    if (type.isFluid)          writer.writeUint8(F.FLUID);
    if (type.isUnpassable)     writer.writeUint8(F.UNPASSABLE);
    if (type.isUnmoveable)     writer.writeUint8(F.UNMOVEABLE);
    if (type.blockMissile)     writer.writeUint8(F.BLOCK_MISSILE);
    if (type.blockPathfind)    writer.writeUint8(F.BLOCK_PATHFINDER);
    if (type.pickupable)       writer.writeUint8(F.PICKUPABLE);
    if (type.hangable)         writer.writeUint8(F.HANGABLE);
    if (type.isVertical)       writer.writeUint8(F.VERTICAL);
    if (type.isHorizontal)     writer.writeUint8(F.HORIZONTAL);
    if (type.rotatable)        writer.writeUint8(F.ROTATABLE);

    if (type.hasLight) {
        writer.writeUint8(F.HAS_LIGHT);
        writer.writeUint16(type.lightLevel);
        writer.writeUint16(type.lightColor);
    }

    if (type.floorChange) writer.writeUint8(F.FLOOR_CHANGE);

    if (type.hasOffset) {
        writer.writeUint8(F.HAS_OFFSET);
        writer.writeUint16(type.offsetX);
        writer.writeUint16(type.offsetY);
    }

    if (type.hasElevation) {
        writer.writeUint8(F.HAS_ELEVATION);
        writer.writeUint16(type.elevation);
    }

    if (type.isLyingObject)  writer.writeUint8(F.LYING_OBJECT);
    if (type.animateAlways)  writer.writeUint8(F.ANIMATE_ALWAYS);

    if (type.miniMap) {
        writer.writeUint8(F.MINI_MAP);
        writer.writeUint16(type.miniMapColor);
    }
    if (type.isLensHelp) {
        writer.writeUint8(F.LENS_HELP);
        writer.writeUint16(type.lensHelp);
    }
    if (type.isFullGround) writer.writeUint8(F.FULL_GROUND);

    writer.writeUint8(F.LAST_FLAG);
}
