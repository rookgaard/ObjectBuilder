// src/app/main.js — entry module loaded by index.html as <script type=module>.
// Wires the layers together; for Stage 0 it just proves every layer imports
// cleanly and that jQuery is reachable.

import "../core/index.js";
import "../formats/index.js";
import "../store/index.js";
import "../workers/index.js";
import "../ui/index.js";

const $ = window.jQuery;
if (!$) {
    throw new Error(
        "jQuery did not load. Check the CDN <script> tag in index.html and " +
        "make sure you are serving the site over http(s), not file://."
    );
}

$(() => {
    console.log(
        `[ObjectBuilder-JS] boot complete — jQuery ${$.fn.jquery} ready`
    );

    // Smoke-test that public/versions.json is reachable. Stage 1+ will
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
