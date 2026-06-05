// Top menu bar. AS3 reference: src/ob/menu/Menu.as. Items are stubs except
// the View ones, which call into ./layout.js to toggle panels.

import { STRINGS } from "./strings.js";
import { togglePanel, isPanelVisible } from "./layout.js";

const $ = window.jQuery;

// command id -> { label, handler }. Handler defaults to a TODO alert.
const HANDLERS = {
    "view.showPreview": () => syncViewItem("view.showPreview", "panel-preview"),
    "view.showObjects": () => syncViewItem("view.showObjects", "panel-things"),
    "view.showSprites": () => syncViewItem("view.showSprites", "panel-sprites"),
};

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

function runCommand(cmd) {
    const handler = HANDLERS[cmd];
    if (handler) {
        handler();
        return;
    }
    // Default: log a TODO for stubbed items so we don't spam alert() boxes.
    console.info(`[menu] TODO: command "${cmd}" is not wired up yet.`);
}
