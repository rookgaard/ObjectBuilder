// src/app/main.js — entry module loaded by index.html as <script type=module>.
// Wires the layers together and boots the UI shell.

import "../core/index.js";
import "../formats/index.js";
import "../store/index.js";
import "../workers/index.js";
import { bootUi } from "../ui/index.js";
import {
    setUndoApplyHandler,
    undo,
    redo,
    canUndo,
    canRedo,
    getState,
} from "../store/index.js";
import { applyUndoEntry } from "../ui/panels/editorPanel.js";
import { showOpenDialog } from "../ui/dialogs/openDialog.js";
import { showNewDialog }  from "../ui/dialogs/newDialog.js";
import { compileAndDownload } from "./compileProject.js";

const $ = window.jQuery;
if (!$) {
    throw new Error(
        "jQuery did not load. Check the <script> tag in index.html and " +
        "make sure you are serving the site over http(s), not file://."
    );
}

$(() => {
    console.log(
        `[ObjectBuilder-JS] boot complete — jQuery ${$.fn.jquery} ready`
    );

    bootUi();
    setUndoApplyHandler(applyUndoEntry);
    bindKeyboardShortcuts();

    // Smoke-test that public/versions.json is reachable. Stage 3+ uses it.
    $.getJSON("./public/versions.json")
        .done((versions) => {
            console.log(
                `[ObjectBuilder-JS] versions.json loaded — ${versions.length} entries; ` +
                `first: ${versions[0].valueStr} (dat ${versions[0].datSignature})`
            );
        })
        .fail((xhr, status, err) => {
            console.error(
                "[ObjectBuilder-JS] could not load public/versions.json",
                status,
                err
            );
        });
});

function bindKeyboardShortcuts() {
    $(document).on("keydown.app", (e) => {
        const isMod = e.ctrlKey || e.metaKey;
        if (!isMod) return;

        const key = e.key.toLowerCase();
        const isTextField = (e.target instanceof HTMLInputElement && e.target.type !== "checkbox")
                         || (e.target instanceof HTMLTextAreaElement);

        // Undo / redo
        if (key === "z" && !e.shiftKey && !isTextField) {
            if (canUndo()) { e.preventDefault(); undo(); }
            return;
        }
        if ((key === "y" || (key === "z" && e.shiftKey)) && !isTextField) {
            if (canRedo()) { e.preventDefault(); redo(); }
            return;
        }
        if (isTextField) return;

        if (key === "o") { e.preventDefault(); showOpenDialog().catch(console.error); return; }
        if (key === "n") { e.preventDefault(); showNewDialog().catch(console.error); return; }
        if (key === "s") {
            e.preventDefault();
            if (getState().project) {
                try { compileAndDownload(); } catch (err) { console.error(err); }
            }
            return;
        }
    });

    // Warn before close if there are unsaved changes.
    window.addEventListener("beforeunload", (e) => {
        const project = getState().project;
        if (project?.dirty) {
            e.preventDefault();
            e.returnValue = "";
        }
    });
}
