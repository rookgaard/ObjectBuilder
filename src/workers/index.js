// src/workers/ — optional Web Worker wrappers. Mirror of AS3's
// ObjectBuilderWorker.as / WorkerCommunicator.as. Empty until we need to move
// loading/compiling off the main thread; until then, src/app/ calls the
// formats/store layers synchronously.

export const LAYER_NAME = "workers";

console.log(`[ObjectBuilder-JS] layer loaded: ${LAYER_NAME}`);
