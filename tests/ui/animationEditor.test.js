import { describe, it, assertEqual } from "../runner.js";
import { FrameDuration } from "../../src/core/animation/FrameDuration.js";
import {
    ensureFrameDurations,
    setFrameDuration,
} from "../../src/ui/tools/animationEditorDialog.js";

describe("animation editor", () => {
    it("creates default frame durations for missing entries", () => {
        const target = { frames: 3, frameDurations: null };
        const durations = ensureFrameDurations(target, "outfit");

        assertEqual(durations.length, 3);
        assertEqual(durations[0].minimum, 300);
        assertEqual(durations[0].maximum, 300);
        assertEqual(target.frameDurations, durations);
    });

    it("keeps existing frame durations and extends short arrays", () => {
        const existing = new FrameDuration(40, 60);
        const target = { frames: 2, frameDurations: [existing] };
        const durations = ensureFrameDurations(target, "effect");

        assertEqual(durations[0], existing);
        assertEqual(durations[1].minimum, 100);
        assertEqual(durations[1].maximum, 100);
    });

    it("normalizes edited frame duration ranges", () => {
        const target = { frames: 2, frameDurations: null, isAnimation: false };
        const duration = setFrameDuration(target, 0, 900, 100, "item");

        assertEqual(duration.minimum, 900);
        assertEqual(duration.maximum, 900);
        assertEqual(target.isAnimation, true);
    });
});
