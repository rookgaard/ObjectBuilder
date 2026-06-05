// OBD 2.0 single-object import/export.
// AS3 reference: ObjectBuilder-AS/src/otlib/obd/OBDEncoder.as

import { BinaryReader } from "../../core/binary/BinaryReader.js";
import { BinaryWriter } from "../../core/binary/BinaryWriter.js";
import { FrameDuration, getDefaultDuration } from "../../core/animation/FrameDuration.js";
import { SPRITE_BYTES, SPRITE_DEFAULT_SIZE } from "../../core/sprites/spriteRle.js";
import { ThingType } from "../../core/things/ThingType.js";
import { fromValue, toValue } from "../../core/things/ThingCategory.js";
import { FLAGS as F, OBD_VERSION_2 } from "./ObdFlags.js";

/**
 * @typedef ObdSpriteData
 * @property {number} id
 * @property {Uint8Array} pixels 4096-byte ARGB buffer.
 *
 * @typedef ObdThingData
 * @property {number} obdVersion
 * @property {number} clientVersion
 * @property {ThingType} thing
 * @property {ObdSpriteData[]} sprites
 */

export function encodeObdPayloadV2({ clientVersion, thing, sprites }) {
    if (!thing) throw new Error("encodeObdPayloadV2: missing thing");
    if (!Array.isArray(sprites)) throw new Error("encodeObdPayloadV2: sprites must be an array");
    const categoryValue = toValue(thing.category);
    if (!categoryValue) throw new Error(`encodeObdPayloadV2: invalid category "${thing.category}"`);

    const spriteCount = thing.spriteIndex?.length ?? thing.getTotalSprites();
    if (sprites.length !== spriteCount) {
        throw new Error(`encodeObdPayloadV2: expected ${spriteCount} sprites, got ${sprites.length}`);
    }

    const w = new BinaryWriter(64 + spriteCount * (4 + SPRITE_BYTES));
    w.writeUint16(OBD_VERSION_2);
    w.writeUint16(clientVersion | 0);
    w.writeUint8(categoryValue);

    const texturePositionField = w.position;
    w.position = texturePositionField + 4;

    writeProperties(w, thing);

    const texturePosition = w.position;
    w.position = texturePositionField;
    w.writeUint32(texturePosition);
    w.position = texturePosition;

    writeTextureAndSprites(w, thing, sprites);
    return w.toUint8Array();
}

export function decodeObdPayloadV2(bytes, { strict = true } = {}) {
    const reader = new BinaryReader(bytes);
    const obdVersion = reader.readUint16();
    if (obdVersion !== OBD_VERSION_2) {
        if (obdVersion >= 710) {
            throw new Error("decodeObdPayloadV2: OBD 1.0 files are not supported yet");
        }
        throw new Error(`decodeObdPayloadV2: unsupported OBD version ${obdVersion}`);
    }

    const clientVersion = reader.readUint16();
    const category = fromValue(reader.readUint8());
    if (!category) throw new Error("decodeObdPayloadV2: invalid object category");

    reader.readUint32(); // texture patterns position; AS3 writes it but decode skips it.

    const thing = new ThingType();
    thing.category = category;

    readProperties(reader, thing);
    readTextureAndSprites(reader, thing);

    if (strict && reader.bytesAvailable !== 0) {
        throw new Error(`decodeObdPayloadV2: ${reader.bytesAvailable} trailing byte(s)`);
    }

    const sprites = thing.spriteIndex.map((id, index) => ({
        id,
        pixels: thing._obdSprites[index],
    }));
    delete thing._obdSprites;

    return {
        obdVersion,
        clientVersion,
        thing,
        sprites,
    };
}

export async function encodeObdV2(data, codec) {
    if (!codec?.compress) throw new Error("encodeObdV2: missing LZMA codec");
    const payload = encodeObdPayloadV2(data);
    return codec.compress(payload);
}

export async function decodeObd(bytes, codec, options = {}) {
    if (!codec?.decompress) throw new Error("decodeObd: missing LZMA codec");
    const payload = await codec.decompress(bytes);
    return decodeObdPayloadV2(payload, options);
}

function writeTextureAndSprites(w, thing, sprites) {
    w.writeUint8(thing.width);
    w.writeUint8(thing.height);
    if (thing.width > 1 || thing.height > 1) {
        w.writeUint8(thing.exactSize);
    }

    w.writeUint8(thing.layers);
    w.writeUint8(thing.patternX);
    w.writeUint8(thing.patternY);
    w.writeUint8(thing.patternZ || 1);
    w.writeUint8(thing.frames);

    if (thing.frames > 1) {
        w.writeUint8(thing.animationMode | 0);
        w.writeInt32(thing.loopCount | 0);
        w.writeInt8(thing.startFrame | 0);

        const fallback = getDefaultDuration(thing.category);
        for (let i = 0; i < thing.frames; i++) {
            const duration = thing.frameDurations?.[i];
            w.writeUint32(duration?.minimum ?? fallback);
            w.writeUint32(duration?.maximum ?? fallback);
        }
    }

    for (let i = 0; i < sprites.length; i++) {
        const sprite = sprites[i];
        const pixels = sprite?.pixels;
        if (!pixels || pixels.length !== SPRITE_BYTES) {
            throw new Error(`encodeObdPayloadV2: invalid pixels at sprite slot ${i}`);
        }
        w.writeUint32(sprite.id >>> 0);
        w.writeBytes(pixels);
    }
}

function readTextureAndSprites(reader, thing) {
    thing.width = reader.readUint8();
    thing.height = reader.readUint8();
    thing.exactSize = (thing.width > 1 || thing.height > 1)
        ? reader.readUint8()
        : SPRITE_DEFAULT_SIZE;

    thing.layers = reader.readUint8();
    thing.patternX = reader.readUint8();
    thing.patternY = reader.readUint8();
    thing.patternZ = reader.readUint8();
    thing.frames = reader.readUint8();

    if (thing.frames > 1) {
        thing.isAnimation = true;
        thing.animationMode = reader.readUint8();
        thing.loopCount = reader.readInt32();
        thing.startFrame = reader.readInt8();
        thing.frameDurations = new Array(thing.frames);
        for (let i = 0; i < thing.frames; i++) {
            thing.frameDurations[i] = new FrameDuration(reader.readUint32(), reader.readUint32());
        }
    }

    const totalSprites = thing.getTotalSprites();
    if (totalSprites > 4096) {
        throw new Error(`decodeObdPayloadV2: object declares ${totalSprites} sprites`);
    }

    thing.spriteIndex = new Array(totalSprites);
    thing._obdSprites = new Array(totalSprites);
    for (let i = 0; i < totalSprites; i++) {
        thing.spriteIndex[i] = reader.readUint32();
        thing._obdSprites[i] = reader.readBytesCopy(SPRITE_BYTES);
    }
}

function readProperties(reader, thing) {
    let flag = 0;
    let previousFlag = 0;
    for (let safety = 0; safety < 256; safety++) {
        previousFlag = flag;
        flag = reader.readUint8();
        if (flag === F.LAST_FLAG) return;

        switch (flag) {
            case F.GROUND: thing.isGround = true; thing.groundSpeed = reader.readUint16(); break;
            case F.GROUND_BORDER: thing.isGroundBorder = true; break;
            case F.ON_BOTTOM: thing.isOnBottom = true; break;
            case F.ON_TOP: thing.isOnTop = true; break;
            case F.CONTAINER: thing.isContainer = true; break;
            case F.STACKABLE: thing.stackable = true; break;
            case F.FORCE_USE: thing.forceUse = true; break;
            case F.MULTI_USE: thing.multiUse = true; break;
            case F.WRITABLE: thing.writable = true; thing.maxReadWriteChars = reader.readUint16(); break;
            case F.WRITABLE_ONCE: thing.writableOnce = true; thing.maxReadChars = reader.readUint16(); break;
            case F.FLUID_CONTAINER: thing.isFluidContainer = true; break;
            case F.FLUID: thing.isFluid = true; break;
            case F.UNPASSABLE: thing.isUnpassable = true; break;
            case F.UNMOVEABLE: thing.isUnmoveable = true; break;
            case F.BLOCK_MISSILE: thing.blockMissile = true; break;
            case F.BLOCK_PATHFIND: thing.blockPathfind = true; break;
            case F.NO_MOVE_ANIMATION: thing.noMoveAnimation = true; break;
            case F.PICKUPABLE: thing.pickupable = true; break;
            case F.HANGABLE: thing.hangable = true; break;
            case F.HOOK_SOUTH: thing.isVertical = true; break;
            case F.HOOK_EAST: thing.isHorizontal = true; break;
            case F.ROTATABLE: thing.rotatable = true; break;
            case F.HAS_LIGHT: thing.hasLight = true; thing.lightLevel = reader.readUint16(); thing.lightColor = reader.readUint16(); break;
            case F.DONT_HIDE: thing.dontHide = true; break;
            case F.TRANSLUCENT: thing.isTranslucent = true; break;
            case F.HAS_OFFSET: thing.hasOffset = true; thing.offsetX = reader.readInt16(); thing.offsetY = reader.readInt16(); break;
            case F.HAS_ELEVATION: thing.hasElevation = true; thing.elevation = reader.readUint16(); break;
            case F.LYING_OBJECT: thing.isLyingObject = true; break;
            case F.ANIMATE_ALWAYS: thing.animateAlways = true; break;
            case F.MINI_MAP: thing.miniMap = true; thing.miniMapColor = reader.readUint16(); break;
            case F.LENS_HELP: thing.isLensHelp = true; thing.lensHelp = reader.readUint16(); break;
            case F.FULL_GROUND: thing.isFullGround = true; break;
            case F.IGNORE_LOOK: thing.ignoreLook = true; break;
            case F.CLOTH: thing.cloth = true; thing.clothSlot = reader.readUint16(); break;
            case F.MARKET_ITEM: readMarket(reader, thing); break;
            case F.DEFAULT_ACTION: thing.hasDefaultAction = true; thing.defaultAction = reader.readUint16(); break;
            case F.WRAPPABLE: thing.wrappable = true; break;
            case F.UNWRAPPABLE: thing.unwrappable = true; break;
            case F.TOP_EFFECT: thing.topEffect = true; break;
            case F.HAS_CHARGES: thing.hasCharges = true; break;
            case F.FLOOR_CHANGE: thing.floorChange = true; break;
            case F.USABLE: thing.usable = true; break;
            default:
                throw new Error(
                    `read OBD properties: unknown flag 0x${flag.toString(16)} ` +
                    `(previous=0x${previousFlag.toString(16)})`
                );
        }
    }
    throw new Error("read OBD properties: flag stream did not terminate");
}

function writeProperties(w, thing) {
    if (thing.isGround) { w.writeUint8(F.GROUND); w.writeUint16(thing.groundSpeed); }
    else if (thing.isGroundBorder) w.writeUint8(F.GROUND_BORDER);
    else if (thing.isOnBottom) w.writeUint8(F.ON_BOTTOM);
    else if (thing.isOnTop) w.writeUint8(F.ON_TOP);

    if (thing.isContainer) w.writeUint8(F.CONTAINER);
    if (thing.stackable) w.writeUint8(F.STACKABLE);
    if (thing.forceUse) w.writeUint8(F.FORCE_USE);
    if (thing.multiUse) w.writeUint8(F.MULTI_USE);
    if (thing.writable) { w.writeUint8(F.WRITABLE); w.writeUint16(thing.maxReadWriteChars); }
    if (thing.writableOnce) { w.writeUint8(F.WRITABLE_ONCE); w.writeUint16(thing.maxReadChars); }
    if (thing.isFluidContainer) w.writeUint8(F.FLUID_CONTAINER);
    if (thing.isFluid) w.writeUint8(F.FLUID);
    if (thing.isUnpassable) w.writeUint8(F.UNPASSABLE);
    if (thing.isUnmoveable) w.writeUint8(F.UNMOVEABLE);
    if (thing.blockMissile) w.writeUint8(F.BLOCK_MISSILE);
    if (thing.blockPathfind) w.writeUint8(F.BLOCK_PATHFIND);
    if (thing.noMoveAnimation) w.writeUint8(F.NO_MOVE_ANIMATION);
    if (thing.pickupable) w.writeUint8(F.PICKUPABLE);
    if (thing.hangable) w.writeUint8(F.HANGABLE);
    if (thing.isVertical) w.writeUint8(F.HOOK_SOUTH);
    if (thing.isHorizontal) w.writeUint8(F.HOOK_EAST);
    if (thing.rotatable) w.writeUint8(F.ROTATABLE);
    if (thing.hasLight) { w.writeUint8(F.HAS_LIGHT); w.writeUint16(thing.lightLevel); w.writeUint16(thing.lightColor); }
    if (thing.dontHide) w.writeUint8(F.DONT_HIDE);
    if (thing.isTranslucent) w.writeUint8(F.TRANSLUCENT);
    if (thing.hasOffset) { w.writeUint8(F.HAS_OFFSET); w.writeInt16(thing.offsetX); w.writeInt16(thing.offsetY); }
    if (thing.hasElevation) { w.writeUint8(F.HAS_ELEVATION); w.writeUint16(thing.elevation); }
    if (thing.isLyingObject) w.writeUint8(F.LYING_OBJECT);
    if (thing.animateAlways) w.writeUint8(F.ANIMATE_ALWAYS);
    if (thing.miniMap) { w.writeUint8(F.MINI_MAP); w.writeUint16(thing.miniMapColor); }
    if (thing.isLensHelp) { w.writeUint8(F.LENS_HELP); w.writeUint16(thing.lensHelp); }
    if (thing.isFullGround) w.writeUint8(F.FULL_GROUND);
    if (thing.ignoreLook) w.writeUint8(F.IGNORE_LOOK);
    if (thing.cloth) { w.writeUint8(F.CLOTH); w.writeUint16(thing.clothSlot); }
    if (thing.isMarketItem) writeMarket(w, thing);
    if (thing.hasDefaultAction) { w.writeUint8(F.DEFAULT_ACTION); w.writeUint16(thing.defaultAction); }
    if (thing.wrappable) w.writeUint8(F.WRAPPABLE);
    if (thing.unwrappable) w.writeUint8(F.UNWRAPPABLE);
    if (thing.topEffect) w.writeUint8(F.TOP_EFFECT);
    if (thing.hasCharges) w.writeUint8(F.HAS_CHARGES);
    if (thing.floorChange) w.writeUint8(F.FLOOR_CHANGE);
    if (thing.usable) w.writeUint8(F.USABLE);
    w.writeUint8(F.LAST_FLAG);
}

function readMarket(reader, thing) {
    thing.isMarketItem = true;
    thing.marketCategory = reader.readUint16();
    thing.marketTradeAs = reader.readUint16();
    thing.marketShowAs = reader.readUint16();
    const nameLength = reader.readUint16();
    let name = "";
    const bytes = reader.readBytes(nameLength);
    for (let i = 0; i < bytes.length; i++) name += String.fromCharCode(bytes[i]);
    thing.marketName = name;
    thing.marketRestrictProfession = reader.readUint16();
    thing.marketRestrictLevel = reader.readUint16();
}

function writeMarket(w, thing) {
    w.writeUint8(F.MARKET_ITEM);
    w.writeUint16(thing.marketCategory);
    w.writeUint16(thing.marketTradeAs);
    w.writeUint16(thing.marketShowAs);
    const name = thing.marketName || "";
    w.writeUint16(name.length);
    for (let i = 0; i < name.length; i++) w.writeUint8(name.charCodeAt(i) & 0xFF);
    w.writeUint16(thing.marketRestrictProfession);
    w.writeUint16(thing.marketRestrictLevel);
}

export function collectObdSprites(thing, spr) {
    const ids = thing.spriteIndex || [];
    return ids.map((id) => {
        const pixels = spr.getSpritePixels(id);
        if (!pixels || pixels.length !== SPRITE_BYTES) {
            throw new Error(`collectObdSprites: invalid sprite ${id}`);
        }
        return { id, pixels: new Uint8Array(pixels) };
    });
}

export function isEmptySpritePixels(pixels) {
    if (!pixels) return true;
    for (let i = 0; i < pixels.length; i++) {
        if (pixels[i] !== 0) return false;
    }
    return true;
}
