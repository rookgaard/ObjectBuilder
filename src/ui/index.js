// src/ui/ — UI bootstrap. Assembles the shell into the DOM.

import { STRINGS }       from "./strings.js";
import { renderMenu }    from "./menu.js";
import { renderToolbar } from "./toolbar.js";
import { renderLayout }  from "./layout.js";

export const LAYER_NAME = "ui";

console.log(`[ObjectBuilder-JS] layer loaded: ${LAYER_NAME}`);

export function bootUi() {
    const $ = window.jQuery;

    // Header text — replace the Stage-0 placeholder with the live subtitle.
    $(".app-header h1").text(STRINGS.app.title);
    $(".app-header__sub").text(STRINGS.app.subtitle);

    renderMenu   ($("#app-menu"));
    renderToolbar($("#app-toolbar"));
    renderLayout ($("#app"));

    $(".app-status").text(STRINGS.statusBar.ready);
}
