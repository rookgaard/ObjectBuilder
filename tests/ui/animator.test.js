// Animator unit tests — deterministic since we feed explicit dt.

import { describe, it, assert, assertEqual } from "../runner.js";
import { Animator } from "../../src/ui/preview/Animator.js";
import { FrameDuration } from "../../src/core/animation/FrameDuration.js";

const FIVES = [new FrameDuration(5, 5), new FrameDuration(5, 5), new FrameDuration(5, 5)];

describe("Animator — linear loop", () => {
    it("starts at frame 0", () => {
        const a = new Animator({ frames: 3, frameDurations: FIVES, category: "effect" });
        assertEqual(a.currentFrame, 0);
    });

    it("advances after dt >= duration", () => {
        const a = new Animator({ frames: 3, frameDurations: FIVES });
        assertEqual(a.tick(4), false, "no advance below duration");
        assertEqual(a.currentFrame, 0);
        assertEqual(a.tick(2), true, "now past 5 ms");
        assertEqual(a.currentFrame, 1);
    });

    it("wraps to frame 0", () => {
        const a = new Animator({ frames: 3, frameDurations: FIVES });
        a.tick(5); // → 1
        a.tick(5); // → 2
        a.tick(5); // → 0
        assertEqual(a.currentFrame, 0);
    });

    it("keeps looping after wrapping to frame 0", () => {
        const a = new Animator({ frames: 3, frameDurations: FIVES, animateAlways: true });
        a.tick(5); // → 1
        a.tick(5); // → 2
        a.tick(5); // → 0
        assertEqual(a.isComplete, false);
        assertEqual(a.tick(5), true, "advances again after wrap");
        assertEqual(a.currentFrame, 1);
    });

    it("with animateAlways=false stops after one loop", () => {
        const a = new Animator({ frames: 2, frameDurations: [new FrameDuration(1, 1), new FrameDuration(1, 1)], animateAlways: false });
        a.tick(1); // 0 → 1
        a.tick(1); // 1 → 0 (wrap) → complete
        assertEqual(a.isComplete, true);
        assertEqual(a.tick(100), false, "no advances once complete");
    });

    it("setFrame jumps and clears accumulated time", () => {
        const a = new Animator({ frames: 4, frameDurations: [new FrameDuration(10,10),new FrameDuration(10,10),new FrameDuration(10,10),new FrameDuration(10,10)] });
        a.tick(7);
        a.setFrame(2);
        assertEqual(a.currentFrame, 2);
        assertEqual(a.tick(9), false, "needs full 10ms from now");
        assertEqual(a.tick(2), true, "advance after the full 10ms");
        assertEqual(a.currentFrame, 3);
    });
});
