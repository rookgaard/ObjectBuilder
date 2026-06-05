// SpriteSheet pure-helper tests — no canvas needed for tileOffset / compositeSize.

import { describe, it, assertEqual } from "../runner.js";
import { SPRITE_BYTES } from "../../src/core/sprites/spriteRle.js";
import { ThingType } from "../../src/core/things/ThingType.js";
import { tileOffset, compositeSize, drawFrame } from "../../src/ui/preview/SpriteSheet.js";

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

describe("SpriteSheet.drawFrame layer selection", () => {
    it("draws all layers by default and a single layer when requested", () => {
        const thing = new ThingType();
        thing.width = 1;
        thing.height = 1;
        thing.layers = 2;
        thing.patternX = 1;
        thing.patternY = 1;
        thing.patternZ = 1;
        thing.frames = 1;
        thing.spriteIndex = [1, 2];

        const spr = {
            getSpritePixels(id) {
                if (id === 1) return solidArgb(255, 0, 0);
                if (id === 2) return solidArgb(0, 0, 255);
                return null;
            },
        };

        const canvas = document.createElement("canvas");
        canvas.width = 32;
        canvas.height = 32;
        const ctx = canvas.getContext("2d");

        drawFrame(ctx, thing, spr, { patternX: 0, patternY: 0, patternZ: 0, frame: 0 });
        assertEqual(readPixel(ctx), "0,0,255,255", "all layers ends on top layer");

        drawFrame(ctx, thing, spr, { patternX: 0, patternY: 0, patternZ: 0, frame: 0 }, { layer: 0 });
        assertEqual(readPixel(ctx), "255,0,0,255", "layer 0 only");

        drawFrame(ctx, thing, spr, { patternX: 0, patternY: 0, patternZ: 0, frame: 0 }, { layer: 1 });
        assertEqual(readPixel(ctx), "0,0,255,255", "layer 1 only");
    });
});

function solidArgb(r, g, b, a = 255) {
    const pixels = new Uint8Array(SPRITE_BYTES);
    for (let i = 0; i < pixels.length; i += 4) {
        pixels[i] = a;
        pixels[i + 1] = r;
        pixels[i + 2] = g;
        pixels[i + 3] = b;
    }
    return pixels;
}

function readPixel(ctx) {
    return Array.from(ctx.getImageData(0, 0, 1, 1).data).join(",");
}
