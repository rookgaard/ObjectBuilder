// Picks the right MetadataWriter{N} for a given client version.
// Mirrors readerRegistry; gens 1/2/4/5/6 stub-throw until ported.

import * as Writer3 from "./MetadataWriter3.js";

const NOT_IMPLEMENTED = (gen, range) => () => {
    throw new Error(
        `writerRegistry: generation ${gen} (${range}) is not implemented yet — ` +
        "add MetadataWriter" + gen + ".js and wire it here."
    );
};

const Writer1 = { GENERATION: 1, writeProperties: NOT_IMPLEMENTED(1, "7.10 – 7.30"), writeItemProperties: NOT_IMPLEMENTED(1, "7.10 – 7.30"), writeTexturePatterns: NOT_IMPLEMENTED(1, "7.10 – 7.30") };
const Writer2 = { GENERATION: 2, writeProperties: NOT_IMPLEMENTED(2, "7.40 – 7.50"), writeItemProperties: NOT_IMPLEMENTED(2, "7.40 – 7.50"), writeTexturePatterns: NOT_IMPLEMENTED(2, "7.40 – 7.50") };
const Writer4 = { GENERATION: 4, writeProperties: NOT_IMPLEMENTED(4, "7.80 – 8.54"), writeItemProperties: NOT_IMPLEMENTED(4, "7.80 – 8.54"), writeTexturePatterns: NOT_IMPLEMENTED(4, "7.80 – 8.54") };
const Writer5 = { GENERATION: 5, writeProperties: NOT_IMPLEMENTED(5, "8.55 – 9.86"), writeItemProperties: NOT_IMPLEMENTED(5, "8.55 – 9.86"), writeTexturePatterns: NOT_IMPLEMENTED(5, "8.55 – 9.86") };
const Writer6 = { GENERATION: 6, writeProperties: NOT_IMPLEMENTED(6, "10.10 – 10.56"), writeItemProperties: NOT_IMPLEMENTED(6, "10.10 – 10.56"), writeTexturePatterns: NOT_IMPLEMENTED(6, "10.10 – 10.56") };

export function pickWriterForVersion(version) {
    const v = version.value | 0;
    if (v <= 730) return Writer1;
    if (v <= 750) return Writer2;
    if (v <= 772) return Writer3;
    if (v <= 854) return Writer4;
    if (v <= 986) return Writer5;
    return Writer6;
}
