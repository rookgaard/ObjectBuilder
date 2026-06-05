import { describe, it, assert, assertEqual } from "../runner.js";
import { ThingType } from "../../src/core/things/ThingType.js";
import { SPRITE_BYTES } from "../../src/core/sprites/spriteRle.js";
import { buildObdPreviewSource } from "../../src/ui/tools/objectViewerDialog.js";

describe("object viewer", () => {
    it("remaps OBD sprite slots to preview-local sprite ids", () => {
        const thing = ThingType.create(100, "item");
        thing.patternX = 3;
        thing.spriteIndex = [77, 0, 88];

        const first = new Uint8Array(SPRITE_BYTES);
        const empty = new Uint8Array(SPRITE_BYTES);
        const second = new Uint8Array(SPRITE_BYTES);
        first[0] = 255;
        second[0] = 255;
        second[1] = 10;

        const preview = buildObdPreviewSource({
            obdVersion: 200,
            clientVersion: 772,
            thing,
            sprites: [
                { id: 77, pixels: first },
                { id: 0, pixels: empty },
                { id: 88, pixels: second },
            ],
        });

        assertEqual(preview.thing.spriteIndex[0], 1);
        assertEqual(preview.thing.spriteIndex[1], 0);
        assertEqual(preview.thing.spriteIndex[2], 2);
        assert(preview.spr.getSpritePixels(1) === first, "first pixels are available by preview id");
        assert(preview.spr.getSpritePixels(2) === second, "second pixels are available by preview id");
        assertEqual(preview.spr.getSpritePixels(77), null);
    });
});
