// src/formats/ — binary format readers/writers (DAT, SPR, OBD). Pure JS.
// Re-exports the public surface so callers can `import { loadDat, SprFile } from "../formats/index.js"`.

export { loadDat, MIN_ITEM_ID, MIN_OUTFIT_ID, MIN_EFFECT_ID, MIN_MISSILE_ID } from "./dat/DatLoader.js";
export { pickReaderForVersion } from "./dat/readerRegistry.js";
export { default as MetadataFlags3 } from "./dat/MetadataFlags3.js";
export * as MetadataReader3 from "./dat/MetadataReader3.js";
export { readTexturePatterns } from "./dat/MetadataReader.js";

export { SprFile } from "./spr/SprFile.js";

export const LAYER_NAME = "formats";
console.log(`[ObjectBuilder-JS] layer loaded: ${LAYER_NAME}`);
