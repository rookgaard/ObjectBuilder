// Selection / category invariants on the in-memory store. We exercise the
// public API and listen on the jQuery event bus.

import { describe, it, assert, assertEqual } from "../runner.js";
import {
    EVENTS,
    getState,
    setProject,
    setSelectedCategory,
    setSelectedThingId,
    on,
    minIdFor,
    maxIdFor,
} from "../../src/store/index.js";
import { Version } from "../../src/core/Version.js";
import { ThingType } from "../../src/core/things/ThingType.js";

function fakeProject() {
    const version = new Version({ value: 772, valueStr: "7.72" });
    const make = (id, cat) => { const t = new ThingType(); t.id = id; t.category = cat; return t; };
    const items    = new Map([[100, make(100, "item")], [101, make(101, "item")], [102, make(102, "item")]]);
    const outfits  = new Map([[1, make(1, "outfit")], [2, make(2, "outfit")]]);
    const effects  = new Map([[1, make(1, "effect")]]);
    const missiles = new Map([[1, make(1, "missile")]]);
    return {
        version,
        dat: {
            version,
            items, outfits, effects, missiles,
            itemsCount: 102, outfitsCount: 2, effectsCount: 1, missilesCount: 1,
        },
        spr: { spritesCount: 0, getSpritePixels: () => null },
    };
}

describe("projectStore — setProject snaps selection to min id", () => {
    it("on item category, snaps to id 100", () => {
        setProject(null);
        setSelectedCategory("item");
        setProject(fakeProject());
        assertEqual(getState().selectedThingId, 100);
    });

    it("on outfit category, snaps to id 1", () => {
        setProject(null);
        setSelectedCategory("outfit");
        setProject(fakeProject());
        assertEqual(getState().selectedThingId, 1);
    });

    it("clears selection when project is unset", () => {
        setProject(fakeProject());
        setProject(null);
        assertEqual(getState().selectedThingId, null);
    });
});

describe("projectStore — events fire", () => {
    it("PROJECT_CHANGE fires on setProject", () => {
        let calls = 0;
        on(EVENTS.PROJECT_CHANGE, () => calls++);
        const before = calls;
        setProject(fakeProject());
        setProject(null);
        assert(calls >= before + 2, `expected ≥ +2 calls, got ${calls - before}`);
    });

    it("SELECTION_CHANGE fires when category changes", () => {
        setProject(fakeProject());
        let calls = 0;
        on(EVENTS.SELECTION_CHANGE, () => calls++);
        const before = calls;
        setSelectedCategory("effect");
        assert(calls > before, "SELECTION_CHANGE fired");
        assertEqual(getState().selectedThingId, 1, "snap to min id of effect");
    });

    it("setSelectedThingId is a no-op when unchanged", () => {
        setProject(fakeProject());
        setSelectedCategory("item");
        setSelectedThingId(100);
        let calls = 0;
        on(EVENTS.SELECTION_CHANGE, () => calls++);
        const before = calls;
        setSelectedThingId(100);
        assertEqual(calls, before, "no fire when id is the same");
    });
});

describe("projectStore — minIdFor / maxIdFor", () => {
    it("item starts at 100", () => {
        assertEqual(minIdFor("item"), 100);
    });

    it("outfit/effect/missile start at 1", () => {
        assertEqual(minIdFor("outfit"), 1);
        assertEqual(minIdFor("effect"), 1);
        assertEqual(minIdFor("missile"), 1);
    });

    it("maxIdFor returns the loaded count", () => {
        setProject(fakeProject());
        assertEqual(maxIdFor("item"), 102);
        assertEqual(maxIdFor("outfit"), 2);
        assertEqual(maxIdFor("effect"), 1);
        assertEqual(maxIdFor("missile"), 1);
    });

    it("maxIdFor returns 0 when no project is loaded", () => {
        setProject(null);
        assertEqual(maxIdFor("item"), 0);
    });
});
