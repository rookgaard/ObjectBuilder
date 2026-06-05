// Linear undo / redo stack for ThingType edits. Each entry captures the
// (category, id, before, after) of a single Save action. Undo applies
// `before`; redo applies `after`.
//
// Generic enough that a future "add new" / "remove" pair can push entries
// here too (Stage 8).

let _bus = null;
function bus() {
    if (_bus) return _bus;
    if (typeof window === "undefined" || !window.jQuery) return null;
    _bus = window.jQuery({});
    return _bus;
}

export const UNDO_EVENT = "undo:change";
export const UNDO_LIMIT = 100;

const undoStack = []; // newest at the end
const redoStack = [];

let _applyHandler = null;

/**
 * Register a (kind, entry) → void callback that actually mutates the storage.
 * Called from inside undo() / redo(); the editor wires it once at boot.
 */
export function setApplyHandler(fn) {
    _applyHandler = fn;
}

/**
 * Record an edit. `kind` is a free-form string so future Stage-8 actions
 * ("add", "remove") can share this stack.
 */
export function pushEdit(kind, payload) {
    undoStack.push({ kind, payload });
    if (undoStack.length > UNDO_LIMIT) undoStack.shift();
    redoStack.length = 0;
    fire();
}

export function canUndo() { return undoStack.length > 0; }
export function canRedo() { return redoStack.length > 0; }

export function undo() {
    const entry = undoStack.pop();
    if (!entry) return null;
    redoStack.push(entry);
    _applyHandler?.(entry.kind, entry.payload, "undo");
    fire();
    return entry;
}

export function redo() {
    const entry = redoStack.pop();
    if (!entry) return null;
    undoStack.push(entry);
    _applyHandler?.(entry.kind, entry.payload, "redo");
    fire();
    return entry;
}

export function clear() {
    undoStack.length = 0;
    redoStack.length = 0;
    fire();
}

export function onChange(handler) {
    const b = bus();
    if (b) b.on(UNDO_EVENT, (_evt, ...args) => handler(...args));
}

function fire() {
    const b = bus();
    if (b) b.trigger(UNDO_EVENT, [{ canUndo: canUndo(), canRedo: canRedo() }]);
}

// --- pure helpers for tests --------------------------------------------------

/** Total entries currently on the undo stack — exposed for tests. */
export function _undoSize() { return undoStack.length; }
/** Total entries currently on the redo stack — exposed for tests. */
export function _redoSize() { return redoStack.length; }
