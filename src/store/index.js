// src/store/ — app-wide mutable state. Layer entry point: re-exports the
// public surface of projectStore.

export {
    EVENTS,
    getState,
    setProject,
    setSelectedCategory,
    setSelectedThingId,
    setSelectedSpriteId,
    on,
    off,
    getSelectedThing,
    listFor,
    countFor,
    minIdFor,
    maxIdFor,
} from "./projectStore.js";

export const LAYER_NAME = "store";
console.log(`[ObjectBuilder-JS] layer loaded: ${LAYER_NAME}`);
