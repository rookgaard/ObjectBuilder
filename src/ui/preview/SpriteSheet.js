// Composes one rendered frame of a ThingType into a canvas. Composition is
// done on demand (per render) rather than precomputed like AS3 did, because
// the cost is tiny: width × height × layers sprites per draw.
//
// Tibia anchors multi-tile objects at the BOTTOM-RIGHT. So the sprite at
// (w_tile = 0, h_tile = 0) — the "first" tile per the ThingType.getSpriteIndex
// formula — goes to the bottom-right corner of the composite. Larger w_tile /
// h_tile indices move LEFT / UP respectively.

import { SPRITE_DEFAULT_SIZE } from "../../core/sprites/spriteRle.js";
import { argbToImageData }     from "../../core/sprites/spritePixels.js";

const TILE = SPRITE_DEFAULT_SIZE; // 32

/**
 * Returns the canvas pixel offset for tile (w_tile, h_tile) of an object of
 * size (width, height). Pure helper — exposed for tests.
 */
export function tileOffset(thing, wTile, hTile) {
    return {
        x: (thing.width  - 1 - wTile) * TILE,
        y: (thing.height - 1 - hTile) * TILE,
    };
}

/**
 * Pixel size of the composed frame.
 */
export function compositeSize(thing) {
    return { width: thing.width * TILE, height: thing.height * TILE };
}

/**
 * Draws one frame of `thing` into `ctx`, starting at (0, 0).
 *
 * Layers ≥ 2: the AS3 ThingDataView blits layer 1 on top of layer 0 with
 * normal alpha blending. We mirror that. For outfit *coloring* (skin / head
 * etc. recoloring of layer 1) that's a Stage 11 feature.
 *
 * @param {CanvasRenderingContext2D} ctx
 * @param {ThingType}                thing
 * @param {SprFile}                  spr
 * @param {object}                   coords    { patternX, patternY, patternZ, frame }
 * @param {object}                   [options] { drawBlendLayer = true, background = null }
 */
export function drawFrame(ctx, thing, spr, coords, options = {}) {
    const { patternX = 0, patternY = 0, patternZ = 0, frame = 0 } = coords;
    const { drawBlendLayer = true, background = null } = options;

    const size = compositeSize(thing);

    if (background !== null) {
        ctx.fillStyle = background;
        ctx.fillRect(0, 0, size.width, size.height);
    } else {
        ctx.clearRect(0, 0, size.width, size.height);
    }

    const layers = drawBlendLayer ? thing.layers : 1;
    const px = thing.patternX > 0 ? patternX % thing.patternX : 0;
    const py = thing.patternY > 0 ? patternY % thing.patternY : 0;
    const pz = thing.patternZ > 0 ? patternZ % thing.patternZ : 0;

    for (let layer = 0; layer < layers; layer++) {
        for (let hTile = 0; hTile < thing.height; hTile++) {
            for (let wTile = 0; wTile < thing.width; wTile++) {
                const spriteSlot = thing.getSpriteIndex(wTile, hTile, layer, px, py, pz, frame);
                const spriteId = thing.spriteIndex?.[spriteSlot];
                if (!spriteId) continue;

                const pixels = spr.getSpritePixels(spriteId);
                if (!pixels) continue;

                const { x, y } = tileOffset(thing, wTile, hTile);
                ctx.putImageData(argbToImageData(pixels), x, y);
            }
        }
    }
}
