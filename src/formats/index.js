// src/formats/ — binary format readers/writers (DAT, SPR, OBD). Pure JS.
// Re-exports the public surface so callers can `import { loadDat, SprFile } from "../formats/index.js"`.

export { loadDat, MIN_ITEM_ID, MIN_OUTFIT_ID, MIN_EFFECT_ID, MIN_MISSILE_ID } from "./dat/DatLoader.js";
export { compileDat } from "./dat/DatCompiler.js";
export { pickReaderForVersion } from "./dat/readerRegistry.js";
export { pickWriterForVersion } from "./dat/writerRegistry.js";
export { default as MetadataFlags3 } from "./dat/MetadataFlags3.js";
export * as MetadataReader3 from "./dat/MetadataReader3.js";
export * as MetadataWriter3 from "./dat/MetadataWriter3.js";
export { readTexturePatterns } from "./dat/MetadataReader.js";
export { writeTexturePatterns } from "./dat/MetadataWriter.js";

export { SprFile }    from "./spr/SprFile.js";
export { compileSpr } from "./spr/SprCompiler.js";
export {
    collectObdSprites,
    decodeObd,
    decodeObdPayloadV2,
    encodeObdPayloadV2,
    encodeObdV2,
} from "./obd/ObdCodec.js";
export { getLzmaCodec } from "./obd/lzmaCodec.js";

export const LAYER_NAME = "formats";
console.log(`[ObjectBuilder-JS] layer loaded: ${LAYER_NAME}`);
