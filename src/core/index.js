// src/core/ — pure JS, no DOM, no jQuery. Stable across the project; this
// file just re-exports the public surface so callers can import from one
// place without knowing the folder layout.

export { BinaryReader } from "./binary/BinaryReader.js";
export { BinaryWriter } from "./binary/BinaryWriter.js";

export {
    SPRITE_PIXELS,
    SPRITE_BYTES,
    SPRITE_DEFAULT_SIZE,
    encodeSpritePixels,
    decodeSpritePixels,
} from "./sprites/spriteRle.js";

export {
    argbToRgba,
    rgbaToArgb,
    argbToImageData,
} from "./sprites/spritePixels.js";

export { ThingType }                       from "./things/ThingType.js";
export { ThingProperty }                   from "./things/ThingProperty.js";
export * as ThingCategory                  from "./things/ThingCategory.js";

export { Version, versionFromJson }        from "./Version.js";
export { FrameDuration, getDefaultDuration } from "./animation/FrameDuration.js";

export const LAYER_NAME = "core";
console.log(`[ObjectBuilder-JS] layer loaded: ${LAYER_NAME}`);
