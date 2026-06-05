// DatLoader — parses an entire Tibia.dat ArrayBuffer into per-category Maps
// of ThingType. AS3 reference: otlib.things.ThingTypeStorage.load + readBytes.

import { BinaryReader } from "../../core/binary/BinaryReader.js";
import { ThingType } from "../../core/things/ThingType.js";
import { ITEM, OUTFIT, EFFECT, MISSILE } from "../../core/things/ThingCategory.js";
import { pickReaderForVersion } from "./readerRegistry.js";

export const MIN_ITEM_ID    = 100;
export const MIN_OUTFIT_ID  = 1;
export const MIN_EFFECT_ID  = 1;
export const MIN_MISSILE_ID = 1;

const HEADER_SIZE = 12; // u32 signature + 4 × u16 counts

/**
 * Parse a `.dat` buffer.
 *
 * @param {ArrayBuffer|Uint8Array} buffer
 * @param {Version} version
 * @param {object} [options]
 * @param {boolean} [options.extended]            32-bit sprite ids (or auto from v ≥ 960).
 * @param {boolean} [options.improvedAnimations]  per-frame durations (or auto from v ≥ 1050).
 * @param {boolean} [options.strict=true]         throw if signature mismatches or trailing bytes.
 * @returns {DatParseResult}
 */
export function loadDat(buffer, version, options = {}) {
    const {
        extended: extOpt = false,
        improvedAnimations: animOpt = false,
        frameGroups: groupsOpt = false,
        strict = true,
    } = options;
    const isExtended    = extOpt    || version.value >= 960;
    const hasFrameDurs  = animOpt   || version.value >= 1050;
    const hasFrameGrps  = groupsOpt || version.value >= 1057;

    const reader = new BinaryReader(buffer);
    if (reader.length < HEADER_SIZE) {
        throw new Error(`DatLoader: file too small (${reader.length} bytes, need ≥ ${HEADER_SIZE})`);
    }

    const signature      = reader.readUint32();
    const itemsCount     = reader.readUint16();
    const outfitsCount   = reader.readUint16();
    const effectsCount   = reader.readUint16();
    const missilesCount  = reader.readUint16();

    const signatureMismatch = signature !== version.datSignature;
    if (signatureMismatch && strict) {
        // Custom servers often tweak signatures; demote the strictness via
        // `strict: false` if you want to load anyway. AS3 doesn't enforce it.
        console.warn(
            `[DatLoader] signature mismatch: file 0x${signature.toString(16).toUpperCase()} ` +
            `vs version ${version.valueStr} 0x${version.datSignature.toString(16).toUpperCase()}`
        );
    }

    const impl = pickReaderForVersion(version);
    if (typeof impl.readProperties !== "function") {
        throw new Error(`DatLoader: no reader for version ${version.valueStr}`);
    }

    const items    = readList(reader, impl, MIN_ITEM_ID,    itemsCount,    ITEM,    isExtended, hasFrameDurs, hasFrameGrps);
    const outfits  = readList(reader, impl, MIN_OUTFIT_ID,  outfitsCount,  OUTFIT,  isExtended, hasFrameDurs, hasFrameGrps);
    const effects  = readList(reader, impl, MIN_EFFECT_ID,  effectsCount,  EFFECT,  isExtended, hasFrameDurs, hasFrameGrps);
    const missiles = readList(reader, impl, MIN_MISSILE_ID, missilesCount, MISSILE, isExtended, hasFrameDurs, hasFrameGrps);

    if (reader.bytesAvailable !== 0) {
        const msg = `DatLoader: ${reader.bytesAvailable} trailing byte(s) after parsing`;
        if (strict) throw new Error(msg);
        else console.warn("[DatLoader] " + msg);
    }

    return {
        version,
        signature,
        signatureMismatch,
        itemsCount,
        outfitsCount,
        effectsCount,
        missilesCount,
        items,
        outfits,
        effects,
        missiles,
        extended: isExtended,
        improvedAnimations: hasFrameDurs,
        frameGroups: hasFrameGrps,
    };
}

function readList(reader, impl, minId, maxId, category, extended, frameDurations, frameGroups) {
    const map = new Map();
    for (let id = minId; id <= maxId; id++) {
        const thing = new ThingType();
        thing.id = id;
        thing.category = category;
        try {
            impl.readProperties(reader, thing);
            impl.readTexturePatterns(reader, thing, extended, frameDurations, frameGroups);
        } catch (err) {
            throw new Error(
                `DatLoader: failed reading ${category} id ${id} at byte ${reader.position}: ${err.message}`
            );
        }
        map.set(id, thing);
    }
    return map;
}

/**
 * @typedef DatParseResult
 * @property {Version} version
 * @property {number}  signature
 * @property {boolean} signatureMismatch
 * @property {number}  itemsCount
 * @property {number}  outfitsCount
 * @property {number}  effectsCount
 * @property {number}  missilesCount
 * @property {Map<number, ThingType>} items
 * @property {Map<number, ThingType>} outfits
 * @property {Map<number, ThingType>} effects
 * @property {Map<number, ThingType>} missiles
 * @property {boolean} extended
 * @property {boolean} improvedAnimations
 */
