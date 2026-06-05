// SpriteSheet pure-helper tests — no canvas needed for tileOffset / compositeSize.

import { describe, it, assertEqual } from "../runner.js";
import { tileOffset, compositeSize } from "../../src/ui/preview/SpriteSheet.js";

const fakeThing = (w, h) => ({ width: w, height: h });

describe("SpriteSheet.compositeSize", () => {
    it("1×1 ⇒ 32×32", () => {
        assertEqual(compositeSize(fakeThing(1, 1)).width, 32);
        assertEqual(compositeSize(fakeThing(1, 1)).height, 32);
    });
    it("2×2 ⇒ 64×64", () => {
        assertEqual(compositeSize(fakeThing(2, 2)).width, 64);
        assertEqual(compositeSize(fakeThing(2, 2)).height, 64);
    });
});

describe("SpriteSheet.tileOffset (anchored bottom-right)", () => {
    it("1×1 has the only tile at (0,0)", () => {
        const o = tileOffset(fakeThing(1, 1), 0, 0);
        assertEqual(o.x, 0); assertEqual(o.y, 0);
    });

    it("2×2: tile (0,0) sits at bottom-right (32,32)", () => {
        const o = tileOffset(fakeThing(2, 2), 0, 0);
        assertEqual(o.x, 32); assertEqual(o.y, 32);
    });

    it("2×2: tile (1,0) sits at bottom-left (0,32)", () => {
        const o = tileOffset(fakeThing(2, 2), 1, 0);
        assertEqual(o.x, 0); assertEqual(o.y, 32);
    });

    it("2×2: tile (0,1) sits at top-right (32,0)", () => {
        const o = tileOffset(fakeThing(2, 2), 0, 1);
        assertEqual(o.x, 32); assertEqual(o.y, 0);
    });

    it("2×2: tile (1,1) sits at top-left (0,0)", () => {
        const o = tileOffset(fakeThing(2, 2), 1, 1);
        assertEqual(o.x, 0); assertEqual(o.y, 0);
    });
});
