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
    markProjectDirty,
    getSelectedThing,
    replaceThing,
    addThing,
    duplicateThing,
    removeThing,
    addSprite,
    replaceSprite,
    removeSprite,
    listFor,
    countFor,
    minIdFor,
    maxIdFor,
} from "./projectStore.js";

export {
    UNDO_EVENT,
    pushEdit,
    canUndo,
    canRedo,
    undo,
    redo,
    clear as clearUndo,
    onChange as onUndoChange,
    setApplyHandler as setUndoApplyHandler,
} from "./undo.js";

export const LAYER_NAME = "store";
console.log(`[ObjectBuilder-JS] layer loaded: ${LAYER_NAME}`);
