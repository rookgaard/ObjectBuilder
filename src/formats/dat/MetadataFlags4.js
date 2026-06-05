// Generation-4 flag byte constants (Tibia 7.80 – 8.54).
// AS3 reference: otlib.things.MetadataFlags4.

export const F = Object.freeze({
    GROUND:          0x00,
    GROUND_BORDER:   0x01,
    ON_BOTTOM:       0x02,
    ON_TOP:          0x03,
    CONTAINER:       0x04,
    STACKABLE:       0x05,
    FORCE_USE:       0x06,
    MULTI_USE:       0x07,
    HAS_CHARGES:     0x08,
    WRITABLE:        0x09,
    WRITABLE_ONCE:   0x0A,
    FLUID_CONTAINER: 0x0B,
    FLUID:           0x0C,
    UNPASSABLE:      0x0D,
    UNMOVEABLE:      0x0E,
    BLOCK_MISSILE:   0x0F,
    BLOCK_PATHFIND:  0x10,
    PICKUPABLE:      0x11,
    HANGABLE:        0x12,
    VERTICAL:        0x13,
    HORIZONTAL:      0x14,
    ROTATABLE:       0x15,
    HAS_LIGHT:       0x16,
    DONT_HIDE:       0x17,
    FLOOR_CHANGE:    0x18,
    HAS_OFFSET:      0x19,
    HAS_ELEVATION:   0x1A,
    LYING_OBJECT:    0x1B,
    ANIMATE_ALWAYS:  0x1C,
    MINI_MAP:        0x1D,
    LENS_HELP:       0x1E,
    FULL_GROUND:     0x1F,
    IGNORE_LOOK:     0x20,
    // builder4 fork: these were back-ported into gen-4 so that custom
    // 8.x DAT files which carry the bonuses still decode. Not used by stock
    // 7.80–8.54 CipSoft files.
    WRAPPABLE:       0x24,
    UNWRAPPABLE:     0x25,
    HAS_BONES:       0x27,
    LAST_FLAG:       0xFF,
});
export default F;
