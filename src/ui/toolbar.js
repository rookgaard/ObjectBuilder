// Top toolbar — chunky buttons for the most common File-menu actions.

import { STRINGS } from "./strings.js";
import { loadReferenceProject } from "../app/loadProject.js";
import { compileAndDownload } from "../app/compileProject.js";
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
    { sep: true },
    { id: "loadRef", label: "Load 7.72 (dev)", glyph: "⚡", modifier: "is-dev" },
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

    if (cmd === "toolbar.loadRef") {
        const $status = $(".app-status");
        $btn.prop("disabled", true);
        $status.text("Loading reference Tibia.dat + Tibia.spr…");

        loadReferenceProject()
            .then((project) => {
                $status.text(
                    `Loaded ${project.version.valueStr} — ` +
                    `${project.dat.itemsCount} items, ` +
                    `${project.dat.outfitsCount} outfits, ` +
                    `${project.dat.effectsCount} effects, ` +
                    `${project.dat.missilesCount} missiles, ` +
                    `${project.spr.spritesCount} sprites.`
                );
            })
            .catch((err) => {
                console.error("[toolbar] loadReferenceProject failed", err);
                $status.text(`Load failed: ${err.message}`);
            })
            .finally(() => {
                $btn.prop("disabled", false);
            });
        return;
    }

    console.info(`[toolbar] TODO: command "${cmd}" is not wired up yet.`);
}
