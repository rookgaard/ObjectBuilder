// Client-version metadata. AS3 reference: otlib.core.Version.
//
// Note: dat/spr signatures here are stored as numbers (uint32) once parsed
// from versions.json, where they live as "0x…" strings to preserve casing.

export class Version {
    constructor({
        value = 0,
        valueStr = "",
        datSignature = 0,
        sprSignature = 0,
        otbVersion = 0,
    } = {}) {
        this.value = value;
        this.valueStr = valueStr;
        this.datSignature = datSignature;
        this.sprSignature = sprSignature;
        this.otbVersion = otbVersion;
    }

    toString() {
        return this.valueStr;
    }

    equals(other) {
        return Boolean(
            other &&
            other.value === this.value &&
            other.valueStr === this.valueStr &&
            other.datSignature === this.datSignature &&
            other.sprSignature === this.sprSignature &&
            other.otbVersion === this.otbVersion
        );
    }

    clone() {
        return new Version({
            value: this.value,
            valueStr: this.valueStr,
            datSignature: this.datSignature,
            sprSignature: this.sprSignature,
            otbVersion: this.otbVersion,
        });
    }
}

/**
 * Parse one row from versions.json (where signatures are "0x…" strings) into
 * a Version instance with numeric signatures.
 */
export function versionFromJson(row) {
    return new Version({
        value: Number(row.value),
        valueStr: String(row.valueStr),
        datSignature: parseHex(row.datSignature),
        sprSignature: parseHex(row.sprSignature),
        otbVersion: Number(row.otbVersion) || 0,
    });
}

function parseHex(s) {
    if (typeof s === "number") return s >>> 0;
    if (typeof s !== "string") return 0;
    const cleaned = s.startsWith("0x") || s.startsWith("0X") ? s.slice(2) : s;
    const n = parseInt(cleaned, 16);
    return Number.isFinite(n) ? n >>> 0 : 0;
}
