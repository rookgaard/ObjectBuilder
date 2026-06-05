// Top menu bar. AS3 reference: src/ob/menu/Menu.as. Items are stubs except
// the View ones, which call into ./layout.js to toggle panels.

import { STRINGS } from "./strings.js";
import { togglePanel, isPanelVisible } from "./layout.js";
import {
    setProject,
    getState,
    canUndo,
    canRedo,
    undo,
    redo,
    onUndoChange,
} from "../store/index.js";
import { showOpenDialog }       from "./dialogs/openDialog.js";
import { showNewDialog }        from "./dialogs/newDialog.js";
import { showCompileAsDialog }  from "./dialogs/compileAsDialog.js";
import { showAnimationEditorDialog } from "./tools/animationEditorDialog.js";
import { showFindDialog }       from "./tools/findDialog.js";
import { showLookTypeGeneratorDialog } from "./tools/lookTypeGeneratorDialog.js";
import { showObjectViewerDialog } from "./tools/objectViewerDialog.js";
import { showSlicerDialog }     from "./tools/slicerDialog.js";
import { compileAndDownload }   from "../app/compileProject.js";
import { loadVersions }         from "../app/loadProject.js";
import {
    appendLog,
    getLogEntries,
    installConsoleLogCapture,
} from "../app/sessionLog.js";

const $ = window.jQuery;
installConsoleLogCapture();

// command id -> { label, handler }. Handler defaults to a TODO alert.
const HANDLERS = {
    "view.showPreview": () => syncViewItem("view.showPreview", "panel-preview"),
    "view.showObjects": () => syncViewItem("view.showObjects", "panel-things"),
    "view.showSprites": () => syncViewItem("view.showSprites", "panel-sprites"),

    "file.new":        () => doNew(),
    "file.open":       () => doOpen(),
    "file.compile":    () => doCompile(),
    "file.compileAs":  () => doCompileAs(),
    "file.close":      () => doClose(),

    "edit.undo": () => { if (canUndo()) undo(); },
    "edit.redo": () => { if (canRedo()) redo(); },

    "tools.find":   () => showFindDialog().catch((e) => console.error("[menu] find failed", e)),
    "tools.lookGenerator": () => showLookTypeGeneratorDialog().catch((e) => console.error("[menu] look generator failed", e)),
    "tools.objectViewer": () => showObjectViewerDialog().catch((e) => console.error("[menu] object viewer failed", e)),
    "tools.slicer": () => showSlicerDialog().catch((e) => console.error("[menu] slicer failed", e)),
    "tools.animationEditor": () => showAnimationEditorDialog().catch((e) => console.error("[menu] animation editor failed", e)),

    "window.log":      () => showLogWindow().catch((e) => console.error("[menu] log failed", e)),
    "window.versions": () => showVersionsWindow().catch((e) => console.error("[menu] versions failed", e)),

    "help.about": () => showAboutWindow().catch((e) => console.error("[menu] about failed", e)),
};

function reportStatus(msg) {
    $(".app-status").text(msg);
    appendLog("status", msg);
}

async function doNew() {
    try {
        const p = await showNewDialog();
        if (p) reportStatus(`New project — ${p.version.valueStr}.`);
    } catch (err) { console.error("[menu] new failed", err); reportStatus(`New failed: ${err.message}`); }
}

async function doOpen() {
    try {
        const p = await showOpenDialog();
        if (p) reportStatus(`Opened ${p.version.valueStr} — ${p.dat.itemsCount} items, ${p.spr.spritesCount} sprites.`);
    } catch (err) { console.error("[menu] open failed", err); reportStatus(`Open failed: ${err.message}`); }
}

async function doCompile() {
    if (!getState().project) { await showNoProjectDialog("Compile"); return; }
    try {
        const out = compileAndDownload();
        reportStatus(`Compiled — dat ${out.datBytes.length} B, spr ${out.sprBytes.length} B.`);
    } catch (err) { console.error("[menu] compile failed", err); reportStatus(`Compile failed: ${err.message}`); }
}

async function doCompileAs() {
    if (!getState().project) { await showNoProjectDialog("Compile As"); return; }
    try {
        const out = await showCompileAsDialog();
        if (out) reportStatus(`Compiled as ${out.version.valueStr}.`);
    } catch (err) { console.error("[menu] compileAs failed", err); reportStatus(`Compile As failed: ${err.message}`); }
}

async function doClose() {
    const project = getState().project;
    if (!project) { reportStatus("No project loaded."); return; }
    if (project.dirty) {
        const ok = await confirmDiscard("There are unsaved edits. Close and discard them?");
        if (!ok) return;
    }
    setProject(null);
    reportStatus("Project closed.");
}

async function confirmDiscard(message) {
    const { showModal } = await import("./widgets/modal.js");
    const action = await showModal({
        title: "Discard changes?",
        body: $(`<p>${message}</p>`),
        buttons: [
            { label: "Cancel",  value: null },
            { label: "Discard", value: "ok", primary: true },
        ],
    });
    return action === "ok";
}

async function showNoProjectDialog(action) {
    reportStatus("No project loaded.");
    const { showModal } = await import("./widgets/modal.js");
    await showModal({
        title: "No Project Loaded",
        body: $(`<p>${action} requires an open project. Use File → New or File → Open first.</p>`),
        buttons: [
            { label: "OK", value: "ok", primary: true },
        ],
    });
}

async function showVersionsWindow() {
    const { showModal } = await import("./widgets/modal.js");
    let versions;
    try {
        versions = await loadVersions();
    } catch (err) {
        await showModal({
            title: "Versions",
            body: $(`<p>Could not load versions.json: ${escapeHtml(err.message)}</p>`),
            buttons: [{ label: "OK", value: "ok", primary: true }],
        });
        return;
    }

    const current = getState().project?.version;
    const rows = versions.map((v) => {
        const active = current?.equals?.(v) || current?.valueStr === v.valueStr;
        return `
            <tr class="${active ? "is-active" : ""}">
                <td>${escapeHtml(v.valueStr)}</td>
                <td>${v.value}</td>
                <td>${formatHex(v.datSignature)}</td>
                <td>${formatHex(v.sprSignature)}</td>
                <td>${v.otbVersion || ""}</td>
            </tr>
        `;
    }).join("");

    const body = $(`
        <div class="menu-window menu-window--versions">
            <div class="menu-window__summary">
                ${versions.length} version${versions.length === 1 ? "" : "s"} loaded from public/versions.json.
            </div>
            <div class="menu-window__table-wrap">
                <table class="menu-window__table">
                    <thead>
                        <tr>
                            <th>Version</th>
                            <th>Value</th>
                            <th>DAT signature</th>
                            <th>SPR signature</th>
                            <th>OTB</th>
                        </tr>
                    </thead>
                    <tbody>${rows}</tbody>
                </table>
            </div>
        </div>
    `);

    await showModal({
        title: "Versions",
        body,
        buttons: [{ label: "Close", value: "close", primary: true }],
    });
}

async function showLogWindow() {
    const { showModal } = await import("./widgets/modal.js");
    const entries = getLogEntries();
    const rows = entries.length
        ? entries.map((e) => `
            <tr>
                <td>${formatTime(e.time)}</td>
                <td>${escapeHtml(e.level)}</td>
                <td>${escapeHtml(e.message)}</td>
            </tr>
        `).join("")
        : `<tr><td colspan="3" class="menu-window__empty">No log entries yet.</td></tr>`;

    const body = $(`
        <div class="menu-window menu-window--log">
            <div class="menu-window__summary">${entries.length} entr${entries.length === 1 ? "y" : "ies"} in this browser session.</div>
            <div class="menu-window__table-wrap">
                <table class="menu-window__table">
                    <thead>
                        <tr>
                            <th>Time</th>
                            <th>Level</th>
                            <th>Message</th>
                        </tr>
                    </thead>
                    <tbody>${rows}</tbody>
                </table>
            </div>
        </div>
    `);

    await showModal({
        title: "Log",
        body,
        buttons: [{ label: "Close", value: "close", primary: true }],
    });
}

async function showAboutWindow() {
    const { showModal } = await import("./widgets/modal.js");
    const project = getState().project;
    const projectLine = project
        ? `${escapeHtml(project.version.valueStr)} loaded: ${project.dat.itemsCount} items, ${project.dat.outfitsCount} outfits, ${project.dat.effectsCount} effects, ${project.dat.missilesCount} missiles, ${project.spr.spritesCount} sprites.`
        : "No project loaded.";
    const body = $(`
        <div class="menu-window menu-window--about">
            <h3>ObjectBuilder-JS</h3>
            <p>Browser-based Object Builder port for Tibia DAT/SPR and OBD workflows.</p>
            <p>${projectLine}</p>
        </div>
    `);

    await showModal({
        title: "About",
        body,
        buttons: [{ label: "Close", value: "close", primary: true }],
    });
}

function syncViewItem(commandId, panelId) {
    togglePanel(panelId);
    const checked = isPanelVisible(panelId);
    $(`.menu__item[data-cmd="${commandId}"]`)
        .toggleClass("is-checked", checked)
        .attr("aria-checked", checked);
}

export function renderMenu($host) {
    const m = STRINGS.menu;

    const menus = [
        ["file",   m.file.label,   buildItems(m.file.items,   "file")],
        ["edit",   m.edit.label,   buildItems(m.edit.items,   "edit")],
        ["view",   m.view.label,   buildViewItems()],
        ["tools",  m.tools.label,  buildItems(m.tools.items,  "tools")],
        ["window", m.window.label, buildItems(m.window.items, "window")],
        ["help",   m.help.label,   buildItems(m.help.items,   "help")],
    ];

    const $bar = $('<ul class="menu" role="menubar"></ul>');
    menus.forEach(([key, label, itemsHtml]) => {
        const $top = $(`
            <li class="menu__top" role="none">
                <button type="button" class="menu__top-label" role="menuitem" aria-haspopup="true" aria-expanded="false">${label}</button>
                <ul class="menu__dropdown" role="menu">${itemsHtml}</ul>
            </li>
        `);
        $bar.append($top);
    });

    $host.empty().append($bar);

    // Toggle dropdowns on click.
    $host.on("click", ".menu__top-label", function (e) {
        e.stopPropagation();
        const $top = $(this).closest(".menu__top");
        const wasOpen = $top.hasClass("is-open");
        $host.find(".menu__top").removeClass("is-open")
            .find(".menu__top-label").attr("aria-expanded", "false");
        if (!wasOpen) {
            $top.addClass("is-open")
                .find(".menu__top-label").attr("aria-expanded", "true");
        }
    });

    // Close dropdowns on outside click.
    $(document).on("click.menu-close", () => {
        $host.find(".menu__top.is-open").removeClass("is-open")
            .find(".menu__top-label").attr("aria-expanded", "false");
    });

    // Dispatch on item click.
    $host.on("click", ".menu__item", function (e) {
        e.stopPropagation();
        const cmd = $(this).data("cmd");
        $host.find(".menu__top.is-open").removeClass("is-open")
            .find(".menu__top-label").attr("aria-expanded", "false");
        runCommand(cmd);
    });

    // Initialize View item checks from current panel state.
    syncViewCheckedState();
    syncUndoItems();
    onUndoChange(syncUndoItems);
}

function buildItems(items, group) {
    return Object.entries(items)
        .map(([key, label]) => `
            <li role="none">
                <button type="button" class="menu__item" role="menuitem" data-cmd="${group}.${key}">${label}</button>
            </li>
        `)
        .join("");
}

function buildViewItems() {
    const v = STRINGS.menu.view.items;
    const item = (cmd, label) => `
        <li role="none">
            <button type="button" class="menu__item" role="menuitemcheckbox" data-cmd="${cmd}" aria-checked="true">${label}</button>
        </li>`;
    return [
        item("view.showPreview", v.showPreview),
        item("view.showObjects", v.showObjects),
        item("view.showSprites", v.showSprites),
    ].join("");
}

function syncViewCheckedState() {
    const map = {
        "view.showPreview": "panel-preview",
        "view.showObjects": "panel-things",
        "view.showSprites": "panel-sprites",
    };
    for (const [cmd, panelId] of Object.entries(map)) {
        const checked = isPanelVisible(panelId);
        $(`.menu__item[data-cmd="${cmd}"]`)
            .toggleClass("is-checked", checked)
            .attr("aria-checked", checked);
    }
}

function syncUndoItems() {
    const state = {
        "edit.undo": canUndo(),
        "edit.redo": canRedo(),
    };
    for (const [cmd, enabled] of Object.entries(state)) {
        $(`.menu__item[data-cmd="${cmd}"]`)
            .prop("disabled", !enabled)
            .attr("aria-disabled", String(!enabled));
    }
}

function runCommand(cmd) {
    const handler = HANDLERS[cmd];
    if (handler) {
        handler();
        return;
    }
    // Default: log a TODO for stubbed items so we don't spam alert() boxes.
    console.info(`[menu] TODO: command "${cmd}" is not wired up yet.`);
}

function formatHex(value) {
    return `0x${(value >>> 0).toString(16).toUpperCase().padStart(8, "0")}`;
}

function formatTime(value) {
    return value.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
}

function escapeHtml(value) {
    return String(value)
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;");
}
