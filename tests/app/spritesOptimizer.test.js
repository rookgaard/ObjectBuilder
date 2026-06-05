import { describe, it, assertEqual } from "../runner.js";
import { FrameGroup } from "../../src/core/animation/FrameGroup.js";
import { SPRITE_BYTES } from "../../src/core/sprites/spriteRle.js";
import { ThingType } from "../../src/core/things/ThingType.js";
import {
    applySpriteOptimization,
    buildSpriteOptimizationPlan,
} from "../../src/app/spritesOptimizer.js";

describe("sprites optimizer", () => {
    it("deduplicates, removes unused/empty sprites, and rewrites thing ids", () => {
        const project = fakeProject();
        const plan = buildSpriteOptimizationPlan(project);

        assertEqual(plan.oldCount, 5);
        assertEqual(plan.newCount, 2);
        assertEqual(plan.removedCount, 3);
        assertEqual(plan.duplicateCount, 1);
        assertEqual(plan.unusedCount, 1);
        assertEqual(plan.emptyCount, 1);

        applySpriteOptimization(project, plan);

        const item = project.dat.items.get(100);
        const outfit = project.dat.outfits.get(1);
        assertEqual(item.spriteIndex.join(","), "1,1,0,2");
        assertEqual(outfit.frameGroups[0].spriteIndex.join(","), "2,1");
        assertEqual(project.spr.spritesCount, 2);
        assertEqual(project.spr.replaced.length, 2);
        assertEqual(project.dirty, true);
    });
});

function fakeProject() {
    const item = ThingType.create(100, "item");
    item.patternX = 4;
    item.spriteIndex = [1, 2, 3, 4];

    const outfit = ThingType.create(1, "outfit");
    const group = new FrameGroup();
    group.spriteIndex = [4, 2];
    outfit.frameGroups = [group];
    outfit.spriteIndex = group.spriteIndex;

    const sprites = new Map([
        [1, pixels(1)],
        [2, pixels(1)],
        [3, new Uint8Array(SPRITE_BYTES)],
        [4, pixels(2)],
        [5, pixels(3)],
    ]);

    return {
        dat: {
            items: new Map([[100, item]]),
            outfits: new Map([[1, outfit]]),
            effects: new Map(),
            missiles: new Map(),
        },
        spr: {
            spritesCount: 5,
            replaced: null,
            getSpritePixels(id) {
                return sprites.get(id) || null;
            },
            replaceSprites(nextSprites) {
                this.spritesCount = nextSprites.length;
                this.replaced = nextSprites;
            },
        },
    };
}

function pixels(seed) {
    const out = new Uint8Array(SPRITE_BYTES);
    out[0] = 255;
    out[1] = seed;
    return out;
}
