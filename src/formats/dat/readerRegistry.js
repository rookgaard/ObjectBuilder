// Picks the right MetadataReader{N} module for a given client version.
// Bands match ThingTypeStorage.load's dispatch in AS3.

import * as Reader1 from "./MetadataReader1.js";
import * as Reader2 from "./MetadataReader2.js";
import * as Reader3 from "./MetadataReader3.js";
import * as Reader4 from "./MetadataReader4.js";
import * as Reader5 from "./MetadataReader5.js";
import * as Reader6 from "./MetadataReader6.js";

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
