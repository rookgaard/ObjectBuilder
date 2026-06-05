// OBD 2.0 property flags. This is a fixed OBD-local flag table, not the
// per-client DAT metadata table.
// AS3 reference: ObjectBuilder-AS/src/otlib/obd/OBDEncoder.as

export const OBD_VERSION_2 = 200;

export const FLAGS = Object.freeze({
    GROUND: 0x00,
    GROUND_BORDER: 0x01,
    ON_BOTTOM: 0x02,
    ON_TOP: 0x03,
    CONTAINER: 0x04,
    STACKABLE: 0x05,
    FORCE_USE: 0x06,
    MULTI_USE: 0x07,
    WRITABLE: 0x08,
    WRITABLE_ONCE: 0x09,
    FLUID_CONTAINER: 0x0A,
    FLUID: 0x0B,
    UNPASSABLE: 0x0C,
    UNMOVEABLE: 0x0D,
    BLOCK_MISSILE: 0x0E,
    BLOCK_PATHFIND: 0x0F,
    NO_MOVE_ANIMATION: 0x10,
    PICKUPABLE: 0x11,
    HANGABLE: 0x12,
    HOOK_SOUTH: 0x13,
    HOOK_EAST: 0x14,
    ROTATABLE: 0x15,
    HAS_LIGHT: 0x16,
    DONT_HIDE: 0x17,
    TRANSLUCENT: 0x18,
    HAS_OFFSET: 0x19,
    HAS_ELEVATION: 0x1A,
    LYING_OBJECT: 0x1B,
    ANIMATE_ALWAYS: 0x1C,
    MINI_MAP: 0x1D,
    LENS_HELP: 0x1E,
    FULL_GROUND: 0x1F,
    IGNORE_LOOK: 0x20,
    CLOTH: 0x21,
    MARKET_ITEM: 0x22,
    DEFAULT_ACTION: 0x23,
    WRAPPABLE: 0x24,
    UNWRAPPABLE: 0x25,
    TOP_EFFECT: 0x26,

    HAS_CHARGES: 0xFC,
    FLOOR_CHANGE: 0xFD,
    USABLE: 0xFE,
    LAST_FLAG: 0xFF,
});

export default FLAGS;
