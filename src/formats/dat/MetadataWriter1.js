// Generation-1 (Tibia 7.10 – 7.30) DAT writer.
// AS3 reference: otlib.things.MetadataWriter1.

import F from "./MetadataFlags1.js";
import { ITEM } from "../../core/things/ThingCategory.js";
import { FrameDuration } from "../../core/animation/FrameDuration.js";
import { SPRITE_DEFAULT_SIZE } from "../../core/sprites/spriteRle.js";

export const GENERATION = 1;

export function writeProperties(w, t) {
    if (t.category === ITEM) throw new Error("MetadataWriter1.writeProperties: item — use writeItemProperties");
    if (t.hasLight) { w.writeUint8(F.HAS_LIGHT); w.writeUint16(t.lightLevel); w.writeUint16(t.lightColor); }
    if (t.hasOffset) w.writeUint8(F.HAS_OFFSET);
    if (t.animateAlways) w.writeUint8(F.ANIMATE_ALWAYS);
    w.writeUint8(F.LAST_FLAG);
}

export function writeItemProperties(w, t) {
    if (t.category !== ITEM) throw new Error("MetadataWriter1.writeItemProperties: non-item");
    if (t.isGround) { w.writeUint8(F.GROUND); w.writeUint16(t.groundSpeed); }
    else if (t.isOnBottom) w.writeUint8(F.ON_BOTTOM);
    else if (t.isOnTop)    w.writeUint8(F.ON_TOP);

    if (t.isContainer)   w.writeUint8(F.CONTAINER);
    if (t.stackable)     w.writeUint8(F.STACKABLE);
    if (t.multiUse)      w.writeUint8(F.MULTI_USE);
    if (t.forceUse)      w.writeUint8(F.FORCE_USE);
    if (t.writable)      { w.writeUint8(F.WRITABLE);      w.writeUint16(t.maxReadWriteChars); }
    if (t.writableOnce)  { w.writeUint8(F.WRITABLE_ONCE); w.writeUint16(t.maxReadChars); }
    if (t.isFluidContainer) w.writeUint8(F.FLUID_CONTAINER);
    if (t.isFluid)       w.writeUint8(F.FLUID);
    if (t.isUnpassable)  w.writeUint8(F.UNPASSABLE);
    if (t.isUnmoveable)  w.writeUint8(F.UNMOVEABLE);
    if (t.blockMissile)  w.writeUint8(F.BLOCK_MISSILE);
    if (t.blockPathfind) w.writeUint8(F.BLOCK_PATHFINDER);
    if (t.pickupable)    w.writeUint8(F.PICKUPABLE);
    if (t.hasLight)      { w.writeUint8(F.HAS_LIGHT); w.writeUint16(t.lightLevel); w.writeUint16(t.lightColor); }
    if (t.floorChange)   w.writeUint8(F.FLOOR_CHANGE);
    if (t.isFullGround)  w.writeUint8(F.FULL_GROUND);
    if (t.hasElevation)  { w.writeUint8(F.HAS_ELEVATION); w.writeUint16(t.elevation); }
    if (t.hasOffset)     w.writeUint8(F.HAS_OFFSET);
    if (t.miniMap)       { w.writeUint8(F.MINI_MAP); w.writeUint16(t.miniMapColor); }
    if (t.rotatable)     w.writeUint8(F.ROTATABLE);
    if (t.isLyingObject) w.writeUint8(F.LYING_OBJECT);
    if (t.animateAlways) w.writeUint8(F.ANIMATE_ALWAYS);
    if (t.isLensHelp)    { w.writeUint8(F.LENS_HELP); w.writeUint16(t.lensHelp); }
    w.writeUint8(F.LAST_FLAG);
}

// Gen-1 patterns: no patternZ byte.
export function writeTexturePatterns(w, t, extended, frameDurations) {
    w.writeUint8(t.width);
    w.writeUint8(t.height);
    if (t.width > 1 || t.height > 1) w.writeUint8(t.exactSize || SPRITE_DEFAULT_SIZE);
    w.writeUint8(t.layers);
    w.writeUint8(t.patternX);
    w.writeUint8(t.patternY);
    w.writeUint8(t.frames);

    if (frameDurations && t.isAnimation) {
        w.writeUint8(t.animationMode);
        w.writeInt32(t.loopCount);
        w.writeInt8(t.startFrame);
        for (let i = 0; i < t.frames; i++) {
            const d = t.frameDurations?.[i] || new FrameDuration(0, 0);
            w.writeUint32(d.minimum);
            w.writeUint32(d.maximum);
        }
    }

    const idx = t.spriteIndex || [];
    for (let i = 0; i < idx.length; i++) {
        if (extended) w.writeUint32(idx[i]);
        else          w.writeUint16(idx[i]);
    }
}
