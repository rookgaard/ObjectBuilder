// Base DAT writer — shared texture-patterns + sprite-index block.
// AS3 reference: otlib.things.MetadataWriter.writeTexturePatterns.

/**
 * @param {BinaryWriter} writer
 * @param {ThingType}    type
 * @param {boolean}      extended         u32 sprite ids when true.
 * @param {boolean}      frameDurations   per-frame durations on disk (v ≥ 1050).
 */
export function writeTexturePatterns(writer, type, extended, frameDurations) {
    writer.writeUint8(type.width);
    writer.writeUint8(type.height);

    if (type.width > 1 || type.height > 1) {
        writer.writeUint8(type.exactSize);
    }

    writer.writeUint8(type.layers);
    writer.writeUint8(type.patternX);
    writer.writeUint8(type.patternY);
    writer.writeUint8(type.patternZ);
    writer.writeUint8(type.frames);

    if (frameDurations && type.isAnimation) {
        writer.writeUint8(type.animationMode);
        writer.writeInt32(type.loopCount);
        writer.writeInt8(type.startFrame);

        for (let i = 0; i < type.frames; i++) {
            const d = type.frameDurations[i];
            writer.writeUint32(d.minimum);
            writer.writeUint32(d.maximum);
        }
    }

    const spriteIndex = type.spriteIndex || [];
    for (let i = 0; i < spriteIndex.length; i++) {
        if (extended) writer.writeUint32(spriteIndex[i]);
        else          writer.writeUint16(spriteIndex[i]);
    }
}
