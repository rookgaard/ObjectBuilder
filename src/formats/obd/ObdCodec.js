// OBD 2.0 single-object import/export.
// AS3 reference: ObjectBuilder-AS/src/otlib/obd/OBDEncoder.as

import { BinaryReader } from "../../core/binary/BinaryReader.js";
import { BinaryWriter } from "../../core/binary/BinaryWriter.js";
import { FrameDuration, getDefaultDuration } from "../../core/animation/FrameDuration.js";
import { FrameGroup } from "../../core/animation/FrameGroup.js";
import { SPRITE_BYTES, SPRITE_DEFAULT_SIZE } from "../../core/sprites/spriteRle.js";
import { ThingType } from "../../core/things/ThingType.js";
import { OUTFIT, fromValue, toValue } from "../../core/things/ThingCategory.js";
import { FLAGS as F, OBD_VERSION_2, OBD_VERSION_3 } from "./ObdFlags.js";

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

export async function encodeObdV3(data, codec) {
    if (!codec?.compress) throw new Error("encodeObdV3: missing LZMA codec");
    const payload = encodeObdPayloadV3(data);
    return codec.compress(payload);
}

/**
 * Encode the right OBD version for the thing — V3 when the thing has multiple
 * FrameGroups (outfits, 10.57+), V2 otherwise. Matches what builder3 / builder4
 * write so the resulting `.obd` is bit-compatible with the original AS3 app.
 */
export async function encodeObd(data, codec) {
    const groups = data.thing?.frameGroups;
    if (data.thing?.category === OUTFIT && Array.isArray(groups) && groups.filter(Boolean).length > 1) {
        return encodeObdV3(data, codec);
    }
    return encodeObdV2(data, codec);
}

export async function decodeObd(bytes, codec, options = {}) {
    if (!codec?.decompress) throw new Error("decodeObd: missing LZMA codec");
    const payload = await codec.decompress(bytes);
    if (payload.length < 2) {
        throw new Error("decodeObd: payload too small to read OBD version");
    }
    const version = (payload[0] | (payload[1] << 8)) >>> 0;
    if (version === OBD_VERSION_3) return decodeObdPayloadV3(payload, options);
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

/**
 * Gather sprites grouped by FrameGroup index (DEFAULT=0, WALKING=1). For
 * non-outfit categories or outfits with no frameGroups[], returns
 * `{ 0: collectObdSprites(thing, spr) }`. Used by V3 export.
 */
export function collectObdSpritesByGroup(thing, spr) {
    const groups = thing.frameGroups;
    if (thing.category !== OUTFIT || !Array.isArray(groups) || groups.length === 0) {
        return { 0: collectObdSprites(thing, spr) };
    }
    const out = {};
    for (let g = 0; g < groups.length; g++) {
        const fg = groups[g];
        if (!fg) continue;
        const ids = fg.spriteIndex || [];
        out[g] = ids.map((id) => {
            const pixels = spr.getSpritePixels(id);
            if (!pixels || pixels.length !== SPRITE_BYTES) {
                throw new Error(`collectObdSpritesByGroup: invalid sprite ${id} in group ${g}`);
            }
            return { id, pixels: new Uint8Array(pixels) };
        });
    }
    return out;
}

/**
 * Encode an OBD 3.0 payload (uncompressed). For outfits the layout is:
 *   u16 obdVersion (300), u16 clientVersion, u8 category,
 *   u32 texturePatternsPosition (backpatched),
 *   <OBD property flag stream>,
 *   u8 groupCount,
 *   per group: u8 groupType + standard texture/animation layout
 *              + per sprite: u32 id + u32 dataSize + dataSize bytes (raw 4096 ARGB).
 * For non-outfits there is no groupCount or groupType byte — a single group is
 * emitted with the same per-sprite layout.
 *
 * AS3 ref: builder3 / builder4 OBDEncoder.encodeV3.
 */
export function encodeObdPayloadV3({ clientVersion, thing, sprites }) {
    if (!thing) throw new Error("encodeObdPayloadV3: missing thing");
    const categoryValue = toValue(thing.category);
    if (!categoryValue) throw new Error(`encodeObdPayloadV3: invalid category "${thing.category}"`);

    const isOutfit = thing.category === OUTFIT;
    const groupMap = normalizeSpriteGroups(sprites, isOutfit);

    const w = new BinaryWriter(64);
    w.writeUint16(OBD_VERSION_3);
    w.writeUint16(clientVersion | 0);
    w.writeUint8(categoryValue);

    const texturePositionField = w.position;
    w.position = texturePositionField + 4;

    writeProperties(w, thing);

    const texturePosition = w.position;
    w.position = texturePositionField;
    w.writeUint32(texturePosition);
    w.position = texturePosition;

    const groups = pickFrameGroupsForV3(thing);
    if (isOutfit) {
        w.writeUint8(groups.length);
    }

    for (let g = 0; g < groups.length; g++) {
        const fg = groups[g];
        if (isOutfit) w.writeUint8(fg.type | 0);
        writeFrameGroupV3(w, fg);
        const list = groupMap[fg.type] || groupMap[g] || [];
        if (list.length !== fg.getTotalSprites()) {
            throw new Error(
                `encodeObdPayloadV3: group ${fg.type} expected ${fg.getTotalSprites()} sprites, got ${list.length}`
            );
        }
        for (const sprite of list) {
            const pixels = sprite?.pixels;
            if (!pixels || pixels.length !== SPRITE_BYTES) {
                throw new Error(`encodeObdPayloadV3: invalid pixels in group ${fg.type}`);
            }
            w.writeUint32(sprite.id >>> 0);
            w.writeUint32(pixels.length);
            w.writeBytes(pixels);
        }
    }
    return w.toUint8Array();
}

export function decodeObdPayloadV3(bytes, { strict = true } = {}) {
    const reader = new BinaryReader(bytes);
    const obdVersion = reader.readUint16();
    if (obdVersion !== OBD_VERSION_3) {
        throw new Error(`decodeObdPayloadV3: expected OBD version 300, got ${obdVersion}`);
    }
    const clientVersion = reader.readUint16();
    const category = fromValue(reader.readUint8());
    if (!category) throw new Error("decodeObdPayloadV3: invalid object category");
    reader.readUint32(); // texture patterns position; the encoder writes it but decoder skips.

    const thing = new ThingType();
    thing.category = category;
    readProperties(reader, thing);

    const isOutfit = category === OUTFIT;
    const groupCount = isOutfit ? reader.readUint8() : 1;
    const spritesByGroup = {};

    thing.frameGroups = [];
    for (let g = 0; g < groupCount; g++) {
        const groupType = isOutfit ? reader.readUint8() : 0;
        const fg = new FrameGroup();
        fg.type = groupType;
        readFrameGroupV3(reader, fg);
        thing.frameGroups[groupType] = fg;

        const total = fg.getTotalSprites();
        const list = new Array(total);
        for (let i = 0; i < total; i++) {
            const id = reader.readUint32();
            const dataSize = reader.readUint32();
            if (dataSize !== SPRITE_BYTES) {
                throw new Error(
                    `decodeObdPayloadV3: invalid sprite size ${dataSize} (group ${groupType}, slot ${i})`
                );
            }
            const pixels = reader.readBytesCopy(SPRITE_BYTES);
            fg.spriteIndex[i] = id;
            list[i] = { id, pixels };
        }
        spritesByGroup[groupType] = list;
    }

    // Mirror group 0 (or the only group) onto the root so existing UI / SPR
    // append paths can consume the thing without knowing about frameGroups.
    const root = thing.frameGroups[0] || thing.frameGroups[groupCount > 0 ? thing.frameGroups.findIndex(Boolean) : 0];
    if (root) {
        thing.width = root.width;
        thing.height = root.height;
        thing.exactSize = root.exactSize;
        thing.layers = root.layers;
        thing.patternX = root.patternX;
        thing.patternY = root.patternY;
        thing.patternZ = root.patternZ;
        thing.frames = root.frames;
        thing.isAnimation = root.isAnimation;
        thing.animationMode = root.animationMode;
        thing.loopCount = root.loopCount;
        thing.startFrame = root.startFrame;
        thing.frameDurations = root.frameDurations;
        thing.spriteIndex = root.spriteIndex;
    }

    // For outfits keep the per-group map (call sites that handle V3 will read
    // `spritesByGroup`). For single-group payloads, also expose `sprites` as a
    // flat array so the existing import path keeps working without changes.
    const sprites = isOutfit
        ? spritesByGroup
        : (spritesByGroup[0] || []);

    if (strict && reader.bytesAvailable !== 0) {
        throw new Error(`decodeObdPayloadV3: ${reader.bytesAvailable} trailing byte(s)`);
    }

    return { obdVersion, clientVersion, thing, sprites };
}

function pickFrameGroupsForV3(thing) {
    const groups = thing.frameGroups?.filter(Boolean) || [];
    if (groups.length > 0) return groups;
    // Build a synthetic single-group view from the root fields. Lets V3 be
    // used uniformly even for non-outfit / pre-10.57 things.
    const fg = new FrameGroup();
    fg.type = 0;
    fg.width = thing.width;
    fg.height = thing.height;
    fg.exactSize = thing.exactSize || SPRITE_DEFAULT_SIZE;
    fg.layers = thing.layers;
    fg.patternX = thing.patternX;
    fg.patternY = thing.patternY;
    fg.patternZ = thing.patternZ || 1;
    fg.frames = thing.frames;
    fg.isAnimation = !!thing.isAnimation;
    fg.animationMode = thing.animationMode | 0;
    fg.loopCount = thing.loopCount | 0;
    fg.startFrame = thing.startFrame | 0;
    fg.frameDurations = thing.frameDurations;
    fg.spriteIndex = thing.spriteIndex;
    return [fg];
}

function writeFrameGroupV3(w, fg) {
    w.writeUint8(fg.width);
    w.writeUint8(fg.height);
    if (fg.width > 1 || fg.height > 1) w.writeUint8(fg.exactSize || SPRITE_DEFAULT_SIZE);
    w.writeUint8(fg.layers);
    w.writeUint8(fg.patternX);
    w.writeUint8(fg.patternY);
    w.writeUint8(fg.patternZ || 1);
    w.writeUint8(fg.frames);

    if (fg.isAnimation) {
        w.writeUint8(fg.animationMode | 0);
        w.writeInt32(fg.loopCount | 0);
        w.writeInt8(fg.startFrame | 0);
        const fallback = getDefaultDuration("outfit");
        for (let i = 0; i < fg.frames; i++) {
            const d = fg.frameDurations?.[i];
            w.writeUint32(d?.minimum ?? fallback);
            w.writeUint32(d?.maximum ?? fallback);
        }
    }
}

function readFrameGroupV3(r, fg) {
    fg.width = r.readUint8();
    fg.height = r.readUint8();
    fg.exactSize = (fg.width > 1 || fg.height > 1) ? r.readUint8() : SPRITE_DEFAULT_SIZE;
    fg.layers = r.readUint8();
    fg.patternX = r.readUint8();
    fg.patternY = r.readUint8();
    fg.patternZ = r.readUint8();
    fg.frames = r.readUint8();

    if (fg.frames > 1) {
        fg.isAnimation = true;
        fg.animationMode = r.readUint8();
        fg.loopCount = r.readInt32();
        fg.startFrame = r.readInt8();
        fg.frameDurations = new Array(fg.frames);
        for (let i = 0; i < fg.frames; i++) {
            fg.frameDurations[i] = new FrameDuration(r.readUint32(), r.readUint32());
        }
    }

    const total = fg.getTotalSprites();
    if (total > 4096) {
        throw new Error(`decodeObdPayloadV3: group declares ${total} sprites (> 4096)`);
    }
    fg.spriteIndex = new Array(total);
}

function normalizeSpriteGroups(sprites, isOutfit) {
    if (!sprites) throw new Error("encodeObdPayloadV3: sprites missing");
    if (Array.isArray(sprites)) {
        // Flat list — treat as group 0.
        return { 0: sprites };
    }
    if (typeof sprites === "object") return sprites;
    throw new Error("encodeObdPayloadV3: sprites must be an array or { group: [] } map");
}

export function isEmptySpritePixels(pixels) {
    if (!pixels) return true;
    for (let i = 0; i < pixels.length; i++) {
        if (pixels[i] !== 0) return false;
    }
    return true;
}
