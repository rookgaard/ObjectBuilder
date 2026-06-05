// Undo stack semantics.

import { describe, it, assert, assertEqual } from "../runner.js";
import {
    pushEdit, undo, redo, canUndo, canRedo, clearUndo, setUndoApplyHandler,
} from "../../src/store/index.js";
import { _undoSize, _redoSize } from "../../src/store/undo.js";

describe("undo stack", () => {
    it("starts empty", () => {
        clearUndo();
        assertEqual(canUndo(), false);
        assertEqual(canRedo(), false);
    });

    it("pushEdit grows undo, clears redo, invokes applier on undo/redo", () => {
        clearUndo();
        const log = [];
        setUndoApplyHandler((kind, payload, dir) => log.push(`${dir}:${kind}:${payload.id}`));

        pushEdit("test", { id: 1 });
        pushEdit("test", { id: 2 });
        assertEqual(_undoSize(), 2);
        assertEqual(_redoSize(), 0);

        undo();                       // pops { id:2 }
        assertEqual(_undoSize(), 1);
        assertEqual(_redoSize(), 1);
        assertEqual(log.pop(), "undo:test:2");

        redo();                       // re-applies { id:2 }
        assertEqual(_undoSize(), 2);
        assertEqual(_redoSize(), 0);
        assertEqual(log.pop(), "redo:test:2");
    });

    it("a fresh pushEdit wipes redo", () => {
        clearUndo();
        setUndoApplyHandler(() => {});
        pushEdit("a", { id: 1 });
        pushEdit("b", { id: 2 });
        undo();
        assertEqual(_redoSize(), 1);
        pushEdit("c", { id: 3 });
        assertEqual(_redoSize(), 0, "redo cleared by a new edit");
    });

    it("undo on empty stack is a no-op", () => {
        clearUndo();
        assertEqual(undo(), null);
        assertEqual(redo(), null);
    });
});
