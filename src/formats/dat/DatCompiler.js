// DatCompiler — inverse of DatLoader. Writes header (sig + 4 × u16 counts)
// then loops each category; missing ids get a single LAST_FLAG byte (matches
// AS3 ThingTypeStorage.compile's writeThingList fallback).

import { BinaryWriter } from "../../core/binary/BinaryWriter.js";
import F from "./MetadataFlags3.js";
import { pickWriterForVersion } from "./writerRegistry.js";
import {
    MIN_ITEM_ID, MIN_OUTFIT_ID, MIN_EFFECT_ID, MIN_MISSILE_ID,
} from "./DatLoader.js";
import { ITEM, OUTFIT, EFFECT, MISSILE } from "../../core/things/ThingCategory.js";

/**
 * Compiles a project (DatParseResult shape) into a fresh Uint8Array.
 *
 * @param {object}  dat                  output of loadDat (or hand-built same shape).
 * @param {Version} version
 * @param {object}  [options]
 * @param {boolean} [options.extended]            override; defaults to v ≥ 960.
 * @param {boolean} [options.improvedAnimations]  override; defaults to v ≥ 1050.
 * @returns {Uint8Array}
 */
export function compileDat(dat, version, options = {}) {
    const {
        extended: extOpt = false,
        improvedAnimations: animOpt = false,
        frameGroups: groupsOpt = false,
    } = options;
    const isExtended    = extOpt    || version.value >= 960;
    const hasFrameDurs  = animOpt   || version.value >= 1050;
    const hasFrameGrps  = groupsOpt || version.value >= 1057;

    const impl = pickWriterForVersion(version);
    const w = new BinaryWriter(64 * 1024);

    w.writeUint32(version.datSignature);
    w.writeUint16(dat.itemsCount);
    w.writeUint16(dat.outfitsCount);
    w.writeUint16(dat.effectsCount);
    w.writeUint16(dat.missilesCount);

    writeList(w, impl, dat.items,    MIN_ITEM_ID,    dat.itemsCount,    ITEM,    isExtended, hasFrameDurs, hasFrameGrps, /* isItem */ true);
    writeList(w, impl, dat.outfits,  MIN_OUTFIT_ID,  dat.outfitsCount,  OUTFIT,  isExtended, hasFrameDurs, hasFrameGrps, false);
    writeList(w, impl, dat.effects,  MIN_EFFECT_ID,  dat.effectsCount,  EFFECT,  isExtended, hasFrameDurs, hasFrameGrps, false);
    writeList(w, impl, dat.missiles, MIN_MISSILE_ID, dat.missilesCount, MISSILE, isExtended, hasFrameDurs, hasFrameGrps, false);

    return w.toUint8Array();
}

function writeList(w, impl, map, minId, maxId, category, extended, frameDurations, frameGroups, isItem) {
    for (let id = minId; id <= maxId; id++) {
        const thing = map.get(id);
        if (!thing) {
            w.writeUint8(F.LAST_FLAG); // missing slot — empty flag stream, no patterns
            continue;
        }
        thing.category = category;
        try {
            if (isItem) impl.writeItemProperties(w, thing);
            else        impl.writeProperties(w, thing);
            impl.writeTexturePatterns(w, thing, extended, frameDurations, frameGroups);
        } catch (err) {
            throw new Error(
                `DatCompiler: failed writing ${category} id ${id} at output byte ${w.position}: ${err.message}`
            );
        }
    }
}
