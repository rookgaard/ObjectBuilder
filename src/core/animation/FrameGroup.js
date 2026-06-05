// FrameGroup — geometry + animation + spriteIndex slice of a ThingType.
// Used for outfits from Tibia 10.57+, which carry separate DEFAULT and WALKING
// groups. Pre-10.57 things are represented with a single group (or with no
// frameGroups[] at all, in which case fields live on the ThingType root).
//
// AS3 reference: otlib.animation.FrameGroup.

import { SPRITE_DEFAULT_SIZE } from "../sprites/spriteRle.js";
import { FrameDuration, getDefaultDuration } from "./FrameDuration.js";
import { DEFAULT as TYPE_DEFAULT } from "./FrameGroupType.js";

export class FrameGroup {
    constructor() {
        this.type = TYPE_DEFAULT;
        this.width = 1;
        this.height = 1;
        this.exactSize = SPRITE_DEFAULT_SIZE;
        this.layers = 1;
        this.patternX = 1;
        this.patternY = 1;
        this.patternZ = 1;
        this.frames = 1;
        this.spriteIndex = null;
        this.isAnimation = false;
        this.animationMode = 0;
        this.loopCount = 0;
        this.startFrame = 0;
        this.frameDurations = null;
    }

    getTotalSprites() {
        return this.width * this.height *
               this.patternX * this.patternY * this.patternZ *
               this.frames * this.layers;
    }

    getTotalTextures() {
        return this.patternX * this.patternY * this.patternZ *
               this.frames * this.layers;
    }

    getSpriteIndex(width, height, layer, patternX, patternY, patternZ, frame) {
        return ((((((frame % this.frames) *
                this.patternZ + patternZ) *
                this.patternY + patternY) *
                this.patternX + patternX) *
                this.layers + layer) *
                this.height + height) *
                this.width + width;
    }

    getSpriteSheetSize() {
        return {
            width:  this.patternZ * this.patternX * this.layers * this.width  * SPRITE_DEFAULT_SIZE,
            height: this.frames   * this.patternY                * this.height * SPRITE_DEFAULT_SIZE,
        };
    }

    clone() {
        const g = new FrameGroup();
        g.type = this.type;
        g.width = this.width;
        g.height = this.height;
        g.exactSize = this.exactSize;
        g.layers = this.layers;
        g.patternX = this.patternX;
        g.patternY = this.patternY;
        g.patternZ = this.patternZ;
        g.frames = this.frames;
        if (this.spriteIndex) g.spriteIndex = Array.from(this.spriteIndex);
        g.isAnimation = this.isAnimation;
        g.animationMode = this.animationMode;
        g.loopCount = this.loopCount;
        g.startFrame = this.startFrame;
        if (Array.isArray(this.frameDurations)) {
            g.frameDurations = this.frameDurations.map((d) => d.clone());
        }
        return g;
    }
}

/** Build a fresh outfit-default FrameGroup with `frames` count and default durations. */
FrameGroup.makeOutfitGroup = function makeOutfitGroup(category, frames = 1) {
    const g = new FrameGroup();
    g.patternX = 4;
    g.frames = frames;
    g.isAnimation = frames > 1;
    g.frameDurations = new Array(frames);
    const d = getDefaultDuration(category);
    for (let i = 0; i < frames; i++) g.frameDurations[i] = new FrameDuration(d, d);
    g.spriteIndex = new Array(g.getTotalSprites()).fill(0);
    return g;
};

export default FrameGroup;
