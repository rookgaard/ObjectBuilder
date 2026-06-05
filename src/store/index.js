// src/store/ — ThingTypeStorage, SpriteStorage. Mutable, event-emitting.
// Bridges binary formats (src/formats/) to the UI (src/ui/). May use jQuery
// purely as an event bus ($({}).trigger / on), nothing DOM-related. Stage 3+.

export const LAYER_NAME = "store";

console.log(`[ObjectBuilder-JS] layer loaded: ${LAYER_NAME}`);
