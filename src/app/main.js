// src/app/main.js — entry module loaded by index.html as <script type=module>.
// Wires the layers together and boots the UI shell.

import "../core/index.js";
import "../formats/index.js";
import "../store/index.js";
import "../workers/index.js";
import { bootUi } from "../ui/index.js";

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

    // Smoke-test that public/versions.json is reachable. Stage 3+ will
    // populate the version dropdown from this.
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
