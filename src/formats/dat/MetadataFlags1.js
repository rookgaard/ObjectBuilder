// Generation-1 flag byte constants (Tibia 7.10 – 7.30).
// AS3 reference: otlib.things.MetadataFlags1.

export const F = Object.freeze({
    GROUND:          0x00,
    ON_BOTTOM:       0x01,
    ON_TOP:          0x02,
    CONTAINER:       0x03,
    STACKABLE:       0x04,
    MULTI_USE:       0x05,
    FORCE_USE:       0x06,
    WRITABLE:        0x07,
    WRITABLE_ONCE:   0x08,
    FLUID_CONTAINER: 0x09,
    FLUID:           0x0A,
    UNPASSABLE:      0x0B,
    UNMOVEABLE:      0x0C,
    BLOCK_MISSILE:   0x0D,
    BLOCK_PATHFINDER:0x0E,
    PICKUPABLE:      0x0F,
    HAS_LIGHT:       0x10,
    FLOOR_CHANGE:    0x11,
    FULL_GROUND:     0x12,
    HAS_ELEVATION:   0x13,
    HAS_OFFSET:      0x14,           // no payload; offsets fixed to 8/8 in gen-1
    // 0x15 — undocumented
    MINI_MAP:        0x16,
    ROTATABLE:       0x17,
    LYING_OBJECT:    0x18,
    ANIMATE_ALWAYS:  0x19,
    LENS_HELP:       0x1A,
    LAST_FLAG:       0xFF,
});
export default F;
