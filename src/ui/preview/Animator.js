// Animator — frame-timer for ThingDataView.
// AS3 reference: otlib.animation.Animator (simplified — we only support the
// linear loop modes used by stock Tibia ≤ 9.86. ASYNC_MODE / loopCount
// semantics from generation 6 are deferred until Stage 10).

import { getDefaultDuration, FrameDuration } from "../../core/animation/FrameDuration.js";

export class Animator {
    /**
     * @param {object} args
     * @param {number}  args.frames                  number of frames (≥ 1).
     * @param {FrameDuration[]} [args.frameDurations] per-frame timing; defaults
     *   to FrameDuration(getDefaultDuration(category)) × frames when omitted.
     * @param {string}  [args.category]              ThingCategory — drives the default duration.
     * @param {boolean} [args.animateAlways=true]    when false, play once then pause.
     * @param {number}  [args.startFrame=0]
     */
    constructor({ frames, frameDurations = null, category = "item", animateAlways = true, startFrame = 0 }) {
        this.frames = Math.max(1, frames | 0);
        if (frameDurations && frameDurations.length === this.frames) {
            this.durations = frameDurations.map((d) =>
                d instanceof FrameDuration ? d : new FrameDuration(d.minimum, d.maximum)
            );
        } else {
            const d = getDefaultDuration(category);
            this.durations = new Array(this.frames).fill(0).map(() => new FrameDuration(d, d));
        }
        this.animateAlways = animateAlways;
        this.currentFrame  = Math.max(0, Math.min(this.frames - 1, startFrame | 0));
        this._sinceLast    = 0;
        this._currentDur   = this.durations[this.currentFrame].sample();
        this.isComplete    = false;
    }

    /**
     * Advance by `dtMs` milliseconds. Returns true if `currentFrame` changed.
     */
    tick(dtMs) {
        if (this.isComplete || this.frames <= 1) return false;
        this._sinceLast += dtMs;

        let changed = false;
        while (this._sinceLast >= this._currentDur) {
            this._sinceLast -= this._currentDur;
            this.currentFrame = (this.currentFrame + 1) % this.frames;
            this._currentDur = this.durations[this.currentFrame].sample();
            changed = true;

            if (this.currentFrame === 0 && !this.animateAlways) {
                this.isComplete = true;
                break;
            }
        }
        return changed;
    }

    reset() {
        this.currentFrame = 0;
        this._sinceLast   = 0;
        this._currentDur  = this.durations[0].sample();
        this.isComplete   = false;
    }

    setFrame(i) {
        this.currentFrame = ((i | 0) % this.frames + this.frames) % this.frames;
        this._sinceLast = 0;
        this._currentDur = this.durations[this.currentFrame].sample();
    }
}
