// Generation-5 flag byte constants (Tibia 8.55 – 9.86).
// AS3 reference: otlib.things.MetadataFlags5.

export const F = Object.freeze({
    GROUND:          0x00,
    GROUND_BORDER:   0x01,
    ON_BOTTOM:       0x02,
    ON_TOP:          0x03,
    CONTAINER:       0x04,
    STACKABLE:       0x05,
    FORCE_USE:       0x06,
    MULTI_USE:       0x07,
    WRITABLE:        0x08,
    WRITABLE_ONCE:   0x09,
    FLUID_CONTAINER: 0x0A,
    FLUID:           0x0B,
    UNPASSABLE:      0x0C,
    UNMOVEABLE:      0x0D,
    BLOCK_MISSILE:   0x0E,
    BLOCK_PATHFIND:  0x0F,
    PICKUPABLE:      0x10,
    HANGABLE:        0x11,
    VERTICAL:        0x12,
    HORIZONTAL:      0x13,
    ROTATABLE:       0x14,
    HAS_LIGHT:       0x15,
    DONT_HIDE:       0x16,
    TRANSLUCENT:     0x17,
    HAS_OFFSET:      0x18,
    HAS_ELEVATION:   0x19,
    LYING_OBJECT:    0x1A,
    ANIMATE_ALWAYS:  0x1B,
    MINI_MAP:        0x1C,
    LENS_HELP:       0x1D,
    FULL_GROUND:     0x1E,
    IGNORE_LOOK:     0x1F,
    CLOTH:           0x20,
    MARKET_ITEM:     0x21,
    // builder4 fork: bones back-ported into gen-5 so custom DAT files with
    // bones in the 8.55–9.86 band still decode.
    HAS_BONES:       0x27,
    LAST_FLAG:       0xFF,
});
export default F;
