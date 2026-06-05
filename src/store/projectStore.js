// Minimal app-wide state — current loaded project + selection. Subscribers
// (UI panels, menu, toolbar) listen via a jQuery-based event bus so the store
// itself stays framework-agnostic.

import { ITEM, isValid as isValidCategory } from "../core/things/ThingCategory.js";
import { ThingType } from "../core/things/ThingType.js";
import { get as getPersisted, set as setPersisted } from "../app/persistence.js";

const $ = window.jQuery;
const bus = $({}); // jQuery's "anything is an event emitter if you wrap it"

const persistedCat = getPersisted("selectedCategory");
const state = {
    /** @type {?LoadedProject} */
    project: null,
    selectedCategory: isValidCategory(persistedCat) ? persistedCat : ITEM,
    selectedThingId:  null,
    selectedSpriteId: 1,
};

/**
 * @typedef LoadedProject
 * @property {import("../core/Version.js").Version} version
 * @property {import("../formats/dat/DatLoader.js").DatParseResult} dat
 * @property {import("../formats/spr/SprFile.js").SprFile} spr
 */

export const EVENTS = {
    PROJECT_CHANGE:   "project:change",
    SELECTION_CHANGE: "selection:change",
};

export function getState() {
    return state;
}

export function setProject(project) {
    state.project = project;
    if (project) {
        // Snap selection to the first valid id for the current category.
        const minId = minIdFor(state.selectedCategory);
        state.selectedThingId = minId;
        state.selectedSpriteId = 1;
    } else {
        state.selectedThingId = null;
        state.selectedSpriteId = 1;
    }
    bus.trigger(EVENTS.PROJECT_CHANGE, [project]);
    bus.trigger(EVENTS.SELECTION_CHANGE, [state]);
}

export function setSelectedCategory(category) {
    if (state.selectedCategory === category) return;
    state.selectedCategory = category;
    state.selectedThingId  = minIdFor(category);
    setPersisted("selectedCategory", category);
    bus.trigger(EVENTS.SELECTION_CHANGE, [state]);
}

export function setSelectedThingId(id) {
    if (state.selectedThingId === id) return;
    state.selectedThingId = id;
    bus.trigger(EVENTS.SELECTION_CHANGE, [state]);
}

export function setSelectedSpriteId(id) {
    if (state.selectedSpriteId === id) return;
    state.selectedSpriteId = id;
    bus.trigger(EVENTS.SELECTION_CHANGE, [state]);
}

export function on(eventName, handler) {
    bus.on(eventName, (_evt, ...args) => handler(...args));
}

export function off(eventName, handler) {
    bus.off(eventName, handler);
}

export function getSelectedThing() {
    const p = state.project;
    if (!p || state.selectedThingId == null) return null;
    const map = listFor(p.dat, state.selectedCategory);
    return map.get(state.selectedThingId) ?? null;
}

/**
 * Replaces the ThingType for (category, id) in the loaded storage. The map
 * stays the same instance — only the value at `id` is swapped. Used by the
 * editor's Save action and by undo/redo.
 *
 * Marks the project as `dirty` (Stage 7 compile will read this flag).
 */
export function replaceThing(category, thing) {
    const p = state.project;
    if (!p) return false;
    const map = listFor(p.dat, category);
    if (!map.has(thing.id)) return false;
    thing.category = category;
    map.set(thing.id, thing);
    p.dirty = true;
    bus.trigger(EVENTS.SELECTION_CHANGE, [state]);
    return true;
}

/**
 * Append a new ThingType to the given category. Returns the new id, or null
 * if no project is loaded.
 */
export function addThing(category, thing = null) {
    const p = state.project;
    if (!p) return null;
    const map = listFor(p.dat, category);
    const countKey = countKeyFor(category);
    const newId = (p.dat[countKey] | 0) + 1;
    const newThing = thing
        ? Object.assign(thing.clone(), { id: newId, category })
        : ThingType.create(newId, category);
    map.set(newId, newThing);
    p.dat[countKey] = newId;
    p.dirty = true;
    state.selectedCategory = category;
    state.selectedThingId = newId;
    bus.trigger(EVENTS.SELECTION_CHANGE, [state]);
    return newId;
}

/**
 * Remove ThingType `id` from `category`. AS3 semantics:
 *   - If it is the highest id, delete the entry AND decrement the count.
 *   - Otherwise replace with a default ThingType.create(id, category) so the
 *     slot remains (DAT format has no gaps).
 *
 * Returns the previous ThingType (for undo).
 */
export function removeThing(category, id) {
    const p = state.project;
    if (!p) return null;
    const map = listFor(p.dat, category);
    if (!map.has(id)) return null;
    const minId = minIdFor(category);
    const countKey = countKeyFor(category);
    const removed = map.get(id);

    if (id === (p.dat[countKey] | 0) && id !== minId) {
        map.delete(id);
        p.dat[countKey] = id - 1;
        if (state.selectedThingId === id) state.selectedThingId = id - 1;
    } else {
        map.set(id, ThingType.create(id, category));
    }
    p.dirty = true;
    bus.trigger(EVENTS.SELECTION_CHANGE, [state]);
    return removed;
}

function countKeyFor(category) {
    switch (category) {
        case "item":    return "itemsCount";
        case "outfit":  return "outfitsCount";
        case "effect":  return "effectsCount";
        case "missile": return "missilesCount";
    }
    throw new Error(`Unknown category: ${category}`);
}

/** Duplicate the ThingType `sourceId` of `category` at a fresh id. */
export function duplicateThing(category, sourceId) {
    const p = state.project;
    if (!p) return null;
    const map = listFor(p.dat, category);
    const source = map.get(sourceId);
    if (!source) return null;
    return addThing(category, source);
}

/** Add a fresh sprite to the SPR storage. Returns the new id, or null. */
export function addSprite(pixels = null) {
    const p = state.project;
    if (!p) return null;
    const spr = p.spr;
    if (typeof spr.addSprite !== "function") {
        throw new Error("SprFile does not support add; upgrade Stage 8");
    }
    const id = spr.addSprite(pixels);
    p.dirty = true;
    state.selectedSpriteId = id;
    bus.trigger(EVENTS.SELECTION_CHANGE, [state]);
    return id;
}

/** Remove a sprite by id. */
export function removeSprite(id) {
    const p = state.project;
    if (!p) return null;
    const spr = p.spr;
    if (typeof spr.removeSprite !== "function") {
        throw new Error("SprFile does not support remove; upgrade Stage 8");
    }
    const removed = spr.removeSprite(id);
    p.dirty = true;
    bus.trigger(EVENTS.SELECTION_CHANGE, [state]);
    return removed;
}


export function listFor(dat, category) {
    switch (category) {
        case "item":    return dat.items;
        case "outfit":  return dat.outfits;
        case "effect":  return dat.effects;
        case "missile": return dat.missiles;
        default: return new Map();
    }
}

export function countFor(dat, category) {
    switch (category) {
        case "item":    return dat.itemsCount;
        case "outfit":  return dat.outfitsCount;
        case "effect":  return dat.effectsCount;
        case "missile": return dat.missilesCount;
        default: return 0;
    }
}

export function minIdFor(category) {
    return category === "item" ? 100 : 1;
}

export function maxIdFor(category) {
    const p = state.project;
    return p ? countFor(p.dat, category) : 0;
}
