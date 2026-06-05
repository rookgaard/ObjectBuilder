// Picks the right MetadataReader{N} module for a given client version.
// As we add later generations they get plugged in here — the bands match
// ThingTypeStorage.load's dispatch in AS3.

import * as Reader3 from "./MetadataReader3.js";

const NOT_IMPLEMENTED = (gen, range) => () => {
    throw new Error(
        `readerRegistry: generation ${gen} (${range}) is not implemented yet — ` +
        "add MetadataReader" + gen + ".js and wire it here."
    );
};

const Reader1 = { GENERATION: 1, readProperties: NOT_IMPLEMENTED(1, "7.10 – 7.30"), readTexturePatterns: NOT_IMPLEMENTED(1, "7.10 – 7.30") };
const Reader2 = { GENERATION: 2, readProperties: NOT_IMPLEMENTED(2, "7.40 – 7.50"), readTexturePatterns: NOT_IMPLEMENTED(2, "7.40 – 7.50") };
const Reader4 = { GENERATION: 4, readProperties: NOT_IMPLEMENTED(4, "7.80 – 8.54"), readTexturePatterns: NOT_IMPLEMENTED(4, "7.80 – 8.54") };
const Reader5 = { GENERATION: 5, readProperties: NOT_IMPLEMENTED(5, "8.55 – 9.86"), readTexturePatterns: NOT_IMPLEMENTED(5, "8.55 – 9.86") };
const Reader6 = { GENERATION: 6, readProperties: NOT_IMPLEMENTED(6, "10.10 – 10.56"), readTexturePatterns: NOT_IMPLEMENTED(6, "10.10 – 10.56") };

/**
 * @param {Version} version
 * @returns {{ GENERATION:number, readProperties:Function, readTexturePatterns:Function }}
 */
export function pickReaderForVersion(version) {
    const v = version.value | 0;
    if (v <= 730) return Reader1;
    if (v <= 750) return Reader2;
    if (v <= 772) return Reader3;
    if (v <= 854) return Reader4;
    if (v <= 986) return Reader5;
    return Reader6;
}
