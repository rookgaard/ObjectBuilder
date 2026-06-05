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
} from "../store/index.js";
import { applyUndoEntry } from "../ui/panels/editorPanel.js";

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
        // Ignore when focus is on a free-text input (numeric inputs treat
        // ctrl+z natively as input undo; let the browser handle it).
        if (e.target instanceof HTMLInputElement && e.target.type !== "checkbox") return;

        if (key === "z" && !e.shiftKey) {
            if (canUndo()) { e.preventDefault(); undo(); }
        } else if ((key === "y") || (key === "z" && e.shiftKey)) {
            if (canRedo()) { e.preventDefault(); redo(); }
        }
    });
}
