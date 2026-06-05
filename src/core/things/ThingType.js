// ThingType — the per-object record (item/outfit/effect/missile).
// AS3 reference: otlib.things.ThingType. Field list is the union across all
// six generations so we don't have to thread per-version optionals.
//
// Sprite-index math (`getSpriteIndex`, `getTextureIndex`, `getTotalSprites`,
// `getSpriteSheetSize`) is a byte-for-byte port of the AS3 helpers.

import { ITEM, OUTFIT, MISSILE, isValid as isValidCategory } from "./ThingCategory.js";
import { SPRITE_DEFAULT_SIZE } from "../sprites/spriteRle.js";
import { FrameDuration, getDefaultDuration } from "../animation/FrameDuration.js";

export class ThingType {
    constructor() {
        // identity
        this.id = 0;
        this.category = "";

        // geometry
        this.width = 0;
        this.height = 0;
        this.exactSize = 0;
        this.layers = 0;
        this.patternX = 0;
        this.patternY = 0;
        this.patternZ = 0;
        this.frames = 0;
        this.spriteIndex = null; // Uint32Array or plain Array of sprite ids

        // ground / placement
        this.isGround = false;
        this.groundSpeed = 0;
        this.isGroundBorder = false;
        this.isOnBottom = false;
        this.isOnTop = false;

        // container / item behavior
        this.isContainer = false;
        this.stackable = false;
        this.forceUse = false;
        this.multiUse = false;
        this.hasCharges = false;
        this.writable = false;
        this.writableOnce = false;
        this.maxTextLength = 0;
        this.isFluidContainer = false;
        this.isFluid = false;

        // movement / collision
        this.isUnpassable = false;
        this.isUnmoveable = false;
        this.blockMissile = false;
        this.blockPathfind = false;
        this.noMoveAnimation = false;
        this.pickupable = false;
        this.hangable = false;
        this.isVertical = false;
        this.isHorizontal = false;
        this.rotatable = false;

        // light
        this.hasLight = false;
        this.lightLevel = 0;
        this.lightColor = 0;

        // misc visuals
        this.dontHide = false;
        this.isTranslucent = false;
        this.floorChange = false;
        this.hasOffset = false;
        this.offsetX = 0;
        this.offsetY = 0;
        this.hasElevation = false;
        this.elevation = 0;
        this.isLyingObject = false;
        this.animateAlways = false;

        // map
        this.miniMap = false;
        this.miniMapColor = 0;
        this.isLensHelp = false;
        this.lensHelp = 0;
        this.isFullGround = false;
        this.ignoreLook = false;

        // outfit-specific
        this.cloth = false;
        this.clothSlot = 0;

        // market (gen 5+)
        this.isMarketItem = false;
        this.marketName = "";
        this.marketCategory = 0;
        this.marketTradeAs = 0;
        this.marketShowAs = 0;
        this.marketRestrictProfession = 0;
        this.marketRestrictLevel = 0;

        // gen 5+
        this.hasDefaultAction = false;
        this.defaultAction = 0;
        this.wrappable = false;
        this.unwrappable = false;
        this.topEffect = false;
        this.usable = false;

        // animation
        this.isAnimation = false;
        this.animationMode = 0;
        this.loopCount = 0;
        this.startFrame = 0;
        this.frameDurations = null;   // FrameDuration[] when isAnimation
    }

    toString() {
        return `[ThingType category=${this.category}, id=${this.id}]`;
    }

    getTotalSprites() {
        return this.width *
               this.height *
               this.patternX *
               this.patternY *
               this.patternZ *
               this.frames *
               this.layers;
    }

    getTotalTextures() {
        return this.patternX *
               this.patternY *
               this.patternZ *
               this.frames *
               this.layers;
    }

    /**
     * Returns the index into `spriteIndex[]` for a given coordinate.
     * Matches the AS3 formula in ThingType.getSpriteIndex.
     */
    getSpriteIndex(width, height, layer, patternX, patternY, patternZ, frame) {
        return ((((((frame % this.frames) *
                this.patternZ + patternZ) *
                this.patternY + patternY) *
                this.patternX + patternX) *
                this.layers + layer) *
                this.height + height) *
                this.width + width;
    }

    getTextureIndex(layer, patternX, patternY, patternZ, frame) {
        return (((frame % this.frames *
                this.patternZ + patternZ) *
                this.patternY + patternY) *
                this.patternX + patternX) *
                this.layers + layer;
    }

    /** Returns { width, height } of the sprite sheet that would tile this thing. */
    getSpriteSheetSize() {
        return {
            width:  this.patternZ * this.patternX * this.layers * this.width  * SPRITE_DEFAULT_SIZE,
            height: this.frames   * this.patternY                * this.height * SPRITE_DEFAULT_SIZE,
        };
    }

    clone() {
        const copy = new ThingType();
        for (const key of Object.keys(this)) {
            copy[key] = this[key];
        }
        if (this.spriteIndex) {
            copy.spriteIndex = Array.from(this.spriteIndex);
        }
        if (this.isAnimation && Array.isArray(this.frameDurations)) {
            copy.frameDurations = this.frameDurations.map((d) => d.clone());
        }
        return copy;
    }
}

/**
 * Factory for a fresh ThingType in a given category, mirroring the AS3
 * `ThingType.create(id, category)` defaults.
 */
ThingType.create = function create(id, category) {
    if (!isValidCategory(category)) {
        throw new Error(`ThingType.create: invalid category "${category}"`);
    }

    const thing = new ThingType();
    thing.id = id;
    thing.category = category;
    thing.width = 1;
    thing.height = 1;
    thing.layers = 1;
    thing.frames = 1;
    thing.patternX = 1;
    thing.patternY = 1;
    thing.patternZ = 1;
    thing.exactSize = SPRITE_DEFAULT_SIZE;

    if (category === OUTFIT) {
        thing.patternX = 4;   // directions
        thing.frames = 3;     // anim frames
        thing.isAnimation = true;
        thing.frameDurations = new Array(thing.frames);
        const d = getDefaultDuration(category);
        for (let i = 0; i < thing.frames; i++) {
            thing.frameDurations[i] = new FrameDuration(d, d);
        }
    } else if (category === MISSILE) {
        thing.patternX = 3;
        thing.patternY = 3;
    }

    thing.spriteIndex = new Array(thing.getTotalSprites()).fill(0);
    return thing;
};

export default ThingType;
