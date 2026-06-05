// FrameDuration — minimum/maximum dwell time for one animation frame, in
// milliseconds. AS3 reference: otlib.animation.FrameDuration.
//
// AS3 stores per-frame durations only for generation 6 (improvedAnimations,
// v ≥ 1050). For older generations every frame uses getDefaultDuration() for
// its category.

import { ITEM, OUTFIT, EFFECT, MISSILE } from "../things/ThingCategory.js";

export class FrameDuration {
    constructor(minimum = 0, maximum = 0) {
        this.minimum = minimum;
        this.maximum = maximum;
    }

    /** Returns a duration sampled uniformly between min and max. */
    sample() {
        if (this.minimum === this.maximum) return this.minimum;
        const span = this.maximum - this.minimum;
        return this.minimum + Math.floor(Math.random() * (span + 1));
    }

    clone() {
        return new FrameDuration(this.minimum, this.maximum);
    }
}

// Defaults match AS3 otlib.animation.FrameDuration.getDefaultDuration:
//   item     500 ms
//   outfit   300 ms
//   effect   100 ms
//   missile  100 ms
const DEFAULTS = {
    [ITEM]: 500,
    [OUTFIT]: 300,
    [EFFECT]: 100,
    [MISSILE]: 100,
};

export function getDefaultDuration(category) {
    return DEFAULTS[category] ?? 500;
}
