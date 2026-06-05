// Generation-3 flag byte constants (Tibia 7.55 – 7.72).
// AS3 reference: otlib.things.MetadataFlags3 — bytes must match exactly or
// the DAT will be mis-parsed at the first object that uses a flag.

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
    BLOCK_PATHFINDER:0x0F,
    PICKUPABLE:      0x10,
    HANGABLE:        0x11,
    VERTICAL:        0x12,
    HORIZONTAL:      0x13,
    ROTATABLE:       0x14,
    HAS_LIGHT:       0x15,
    // 0x16 — undocumented in the AS3 source, never emitted by stock Tibia 7.x
    FLOOR_CHANGE:    0x17,
    HAS_OFFSET:      0x18,
    HAS_ELEVATION:   0x19,
    LYING_OBJECT:    0x1A,
    ANIMATE_ALWAYS:  0x1B,
    MINI_MAP:        0x1C,
    LENS_HELP:       0x1D,
    FULL_GROUND:     0x1E,
    LAST_FLAG:       0xFF,
});

export default F;
