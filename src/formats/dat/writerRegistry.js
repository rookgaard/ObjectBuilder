// Picks the right MetadataWriter{N} for a given client version.

import * as Writer1 from "./MetadataWriter1.js";
import * as Writer2 from "./MetadataWriter2.js";
import * as Writer3 from "./MetadataWriter3.js";
import * as Writer4 from "./MetadataWriter4.js";
import * as Writer5 from "./MetadataWriter5.js";
import * as Writer6 from "./MetadataWriter6.js";

export function pickWriterForVersion(version) {
    const v = version.value | 0;
    if (v <= 730) return Writer1;
    if (v <= 750) return Writer2;
    if (v <= 772) return Writer3;
    if (v <= 854) return Writer4;
    if (v <= 986) return Writer5;
    return Writer6;
}
