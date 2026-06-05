// Top toolbar — chunky buttons for the most common File-menu actions.

import { STRINGS } from "./strings.js";
import { compileAndDownload } from "../app/compileProject.js";
import { showOpenDialog }      from "./dialogs/openDialog.js";
import { showNewDialog }       from "./dialogs/newDialog.js";
import { showFindDialog }      from "./tools/findDialog.js";
import {
    canUndo,
    canRedo,
    undo,
    redo,
    onUndoChange,
    getState,
} from "../store/index.js";

const $ = window.jQuery;

const BUTTONS = [
    { id: "new",     label: "New",     glyph: "✚"  },
    { id: "open",    label: "Open",    glyph: "📂" },
    { id: "compile", label: "Compile", glyph: "⚙"  },
    { id: "save",    label: "Save",    glyph: "💾" },
    { sep: true },
    { id: "find",    label: "Find",    glyph: "🔍" },
    { id: "undo",    label: "Undo",    glyph: "↶"  },
    { id: "redo",    label: "Redo",    glyph: "↷"  },
];

export function renderToolbar($host) {
    const $bar = $('<ul class="toolbar" role="toolbar" aria-label="Main toolbar"></ul>');

    BUTTONS.forEach((b) => {
        if (b.sep) {
            $bar.append('<li class="toolbar__sep" role="separator"></li>');
            return;
        }
        const label = STRINGS.toolbar[b.id] || b.label;
        const mod = b.modifier ? ` toolbar__btn--${b.modifier}` : "";
        $bar.append(`
            <li>
                <button type="button" class="toolbar__btn${mod}" data-cmd="toolbar.${b.id}" title="${label}">
                    <span class="toolbar__glyph" aria-hidden="true">${b.glyph}</span>
                    <span class="toolbar__label">${label}</span>
                </button>
            </li>
        `);
    });

    $host.empty().append($bar);

    $host.on("click", ".toolbar__btn", function () {
        const cmd = $(this).data("cmd");
        runToolbarCommand(cmd, $(this));
    });

    onUndoChange(({ canUndo: u, canRedo: r }) => {
        $host.find('[data-cmd="toolbar.undo"]').prop("disabled", !u);
        $host.find('[data-cmd="toolbar.redo"]').prop("disabled", !r);
    });
    // Initial state
    $host.find('[data-cmd="toolbar.undo"]').prop("disabled", !canUndo());
    $host.find('[data-cmd="toolbar.redo"]').prop("disabled", !canRedo());
}

function runToolbarCommand(cmd, $btn) {
    if (cmd === "toolbar.undo") { if (canUndo()) undo(); return; }
    if (cmd === "toolbar.redo") { if (canRedo()) redo(); return; }

    if (cmd === "toolbar.new") {
        const $status = $(".app-status");
        $btn.prop("disabled", true);
        $status.text("Creating new project...");
        showNewDialog()
            .then((project) => {
                $status.text(project ? `New project — ${project.version.valueStr}.` : "New project cancelled.");
            })
            .catch((err) => {
                console.error("[toolbar] new failed", err);
                $status.text(`New failed: ${err.message}`);
            })
            .finally(() => $btn.prop("disabled", false));
        return;
    }
    if (cmd === "toolbar.open") {
        const $status = $(".app-status");
        $btn.prop("disabled", true);
        $status.text("Opening project...");
        showOpenDialog()
            .then((project) => {
                $status.text(project
                    ? `Opened ${project.version.valueStr} — ${project.dat.itemsCount} items, ${project.spr.spritesCount} sprites.`
                    : "Open cancelled.");
            })
            .catch((err) => {
                console.error("[toolbar] open failed", err);
                $status.text(`Open failed: ${err.message}`);
            })
            .finally(() => $btn.prop("disabled", false));
        return;
    }
    if (cmd === "toolbar.find") {
        showFindDialog().catch((err) => console.error("[toolbar] find failed", err));
        return;
    }
    if (cmd === "toolbar.save") {
        // Save is the editor's per-thing commit; that's already wired in the
        // editor panel. Toolbar Save = "Compile" — produce the .dat/.spr.
        if (!getState().project) { console.warn("[toolbar] save: no project"); return; }
        try { compileAndDownload(); } catch (e) { console.error(e); }
        return;
    }

    if (cmd === "toolbar.compile") {
        if (!getState().project) {
            console.warn("[toolbar] compile: no project loaded");
            return;
        }
        const $status = $(".app-status");
        $btn.prop("disabled", true);
        $status.text("Compiling .dat + .spr…");
        try {
            const out = compileAndDownload();
            $status.text(`Compiled — dat ${out.datBytes.length} B, spr ${out.sprBytes.length} B (downloads triggered).`);
        } catch (err) {
            console.error("[toolbar] compile failed", err);
            $status.text(`Compile failed: ${err.message}`);
        } finally {
            $btn.prop("disabled", false);
        }
        return;
    }

    console.info(`[toolbar] TODO: command "${cmd}" is not wired up yet.`);
}
