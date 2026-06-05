// Generation-4 (Tibia 7.80 – 8.54) DAT writer.
// AS3 reference: otlib.things.MetadataWriter4.

import F from "./MetadataFlags4.js";
import { ITEM } from "../../core/things/ThingCategory.js";

export { writeTexturePatterns } from "./MetadataWriter.js";
export const GENERATION = 4;

export function writeProperties(w, t) {
    if (t.category === ITEM) throw new Error("MetadataWriter4.writeProperties: item — use writeItemProperties");
    if (t.hasLight)  { w.writeUint8(F.HAS_LIGHT);  w.writeUint16(t.lightLevel); w.writeUint16(t.lightColor); }
    if (t.hasOffset) { w.writeUint8(F.HAS_OFFSET); w.writeUint16(t.offsetX);    w.writeUint16(t.offsetY); }
    if (t.animateAlways) w.writeUint8(F.ANIMATE_ALWAYS);
    w.writeUint8(F.LAST_FLAG);
}

export function writeItemProperties(w, t) {
    if (t.category !== ITEM) throw new Error("MetadataWriter4.writeItemProperties: non-item");
    if (t.isGround) { w.writeUint8(F.GROUND); w.writeUint16(t.groundSpeed); }
    else if (t.isGroundBorder) w.writeUint8(F.GROUND_BORDER);
    else if (t.isOnBottom)     w.writeUint8(F.ON_BOTTOM);
    else if (t.isOnTop)        w.writeUint8(F.ON_TOP);

    if (t.isContainer)   w.writeUint8(F.CONTAINER);
    if (t.stackable)     w.writeUint8(F.STACKABLE);
    if (t.forceUse)      w.writeUint8(F.FORCE_USE);
    if (t.multiUse)      w.writeUint8(F.MULTI_USE);
    if (t.hasCharges)    w.writeUint8(F.HAS_CHARGES);
    if (t.writable)      { w.writeUint8(F.WRITABLE);      w.writeUint16(t.maxTextLength); }
    if (t.writableOnce)  { w.writeUint8(F.WRITABLE_ONCE); w.writeUint16(t.maxTextLength); }
    if (t.isFluidContainer) w.writeUint8(F.FLUID_CONTAINER);
    if (t.isFluid)       w.writeUint8(F.FLUID);
    if (t.isUnpassable)  w.writeUint8(F.UNPASSABLE);
    if (t.isUnmoveable)  w.writeUint8(F.UNMOVEABLE);
    if (t.blockMissile)  w.writeUint8(F.BLOCK_MISSILE);
    if (t.blockPathfind) w.writeUint8(F.BLOCK_PATHFIND);
    if (t.pickupable)    w.writeUint8(F.PICKUPABLE);
    if (t.hangable)      w.writeUint8(F.HANGABLE);
    if (t.isVertical)    w.writeUint8(F.VERTICAL);
    if (t.isHorizontal)  w.writeUint8(F.HORIZONTAL);
    if (t.rotatable)     w.writeUint8(F.ROTATABLE);
    if (t.hasLight)      { w.writeUint8(F.HAS_LIGHT); w.writeUint16(t.lightLevel); w.writeUint16(t.lightColor); }
    if (t.dontHide)      w.writeUint8(F.DONT_HIDE);
    if (t.floorChange)   w.writeUint8(F.FLOOR_CHANGE);
    if (t.hasOffset)     { w.writeUint8(F.HAS_OFFSET); w.writeUint16(t.offsetX); w.writeUint16(t.offsetY); }
    if (t.hasElevation)  { w.writeUint8(F.HAS_ELEVATION); w.writeUint16(t.elevation); }
    if (t.isLyingObject) w.writeUint8(F.LYING_OBJECT);
    if (t.animateAlways) w.writeUint8(F.ANIMATE_ALWAYS);
    if (t.miniMap)       { w.writeUint8(F.MINI_MAP); w.writeUint16(t.miniMapColor); }
    if (t.isLensHelp)    { w.writeUint8(F.LENS_HELP); w.writeUint16(t.lensHelp); }
    if (t.isFullGround)  w.writeUint8(F.FULL_GROUND);
    if (t.ignoreLook)    w.writeUint8(F.IGNORE_LOOK);
    w.writeUint8(F.LAST_FLAG);
}
