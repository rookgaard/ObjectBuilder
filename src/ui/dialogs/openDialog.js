// "Open Project" modal — pick a Tibia.dat + Tibia.spr pair and a client
// version, then open them. AS3 reference: ob.components.OpenAssetsWindow.
//
// On success we read the two File objects as ArrayBuffers and feed them to
// app/loadProject.buildProject — same path as the dev "Load 7.72" button.

import { showModal } from "../widgets/modal.js";
import { loadVersions } from "../../app/loadProject.js";
import { buildProject } from "../../app/loadProject.js";

const $ = window.jQuery;

export async function showOpenDialog() {
    const versions = await loadVersions();

    const $body = $(`
        <div class="form-grid" style="grid-template-columns: 1fr;">
            <label>
                <span>Tibia.dat</span>
                <input type="file" accept=".dat,application/octet-stream" id="open-dat" class="control">
            </label>
            <label>
                <span>Tibia.spr</span>
                <input type="file" accept=".spr,application/octet-stream" id="open-spr" class="control">
            </label>
            <label>
                <span>Client version</span>
                <select id="open-version" class="control"></select>
            </label>
            <label class="inline">
                <input type="checkbox" id="open-extended">
                <span>Extended (32-bit sprite ids — auto for v ≥ 9.60)</span>
            </label>
            <label class="inline">
                <input type="checkbox" id="open-transparency">
                <span>Transparency (per-pixel alpha — auto for v ≥ 8.55)</span>
            </label>
            <label class="inline">
                <input type="checkbox" id="open-improvedAnimations">
                <span>Improved animations (per-frame durations — auto for v ≥ 10.50)</span>
            </label>
        </div>
    `);

    const $select = $body.find("#open-version");
    for (const v of versions) {
        $select.append(`<option value="${v.valueStr}">${v.valueStr}</option>`);
    }
    $select.val("7.72");

    const action = await showModal({
        title: "Open Project",
        body: $body,
        buttons: [
            { label: "Cancel", value: null },
            {
                label: "Open",
                value: "ok",
                primary: true,
                onValidate: ($host) => {
                    const ok = $host.find("#open-dat")[0].files.length > 0
                            && $host.find("#open-spr")[0].files.length > 0;
                    if (!ok) {
                        $host.find("p.error-line").remove();
                        $host.append('<p class="error-line">Select both Tibia.dat and Tibia.spr.</p>');
                    }
                    return ok;
                },
            },
        ],
    });

    if (action !== "ok") return null;

    const datFile = $body.find("#open-dat")[0].files[0];
    const sprFile = $body.find("#open-spr")[0].files[0];
    const verStr  = String($body.find("#open-version").val());
    const version = versions.find((v) => v.valueStr === verStr);
    const options = {
        extended:           $body.find("#open-extended").is(":checked")           || undefined,
        transparency:       $body.find("#open-transparency").is(":checked")       || undefined,
        improvedAnimations: $body.find("#open-improvedAnimations").is(":checked") || undefined,
        strict: false,
    };

    const [datBuffer, sprBuffer] = await Promise.all([
        datFile.arrayBuffer(),
        sprFile.arrayBuffer(),
    ]);

    return buildProject({ datBuffer, sprBuffer, version, options });
}
