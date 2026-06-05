// "Compile As" — pick a base filename and version override, then compile and
// trigger downloads (.dat first, then .spr).

import { showModal } from "../widgets/modal.js";
import { loadVersions } from "../../app/loadProject.js";
import { getState } from "../../store/index.js";
import { compileDat } from "../../formats/dat/DatCompiler.js";
import { compileSpr } from "../../formats/spr/SprCompiler.js";
import { downloadBytes } from "../../app/compileProject.js";

const $ = window.jQuery;

export async function showCompileAsDialog() {
    const project = getState().project;
    if (!project) throw new Error("No project loaded.");

    const versions = await loadVersions();

    const $body = $(`
        <div class="form-grid" style="grid-template-columns: 1fr;">
            <label>
                <span>Base filename (no extension)</span>
                <input type="text" class="control" id="cas-name" value="Tibia">
            </label>
            <label>
                <span>Target version (must match the loaded layout)</span>
                <select id="cas-version" class="control"></select>
            </label>
        </div>
    `);

    const $select = $body.find("#cas-version");
    for (const v of versions) $select.append(`<option value="${v.valueStr}">${v.valueStr}</option>`);
    $select.val(project.version.valueStr);

    const action = await showModal({
        title: "Compile As",
        body: $body,
        buttons: [
            { label: "Cancel", value: null },
            { label: "Compile", value: "ok", primary: true },
        ],
    });
    if (action !== "ok") return null;

    const baseName = String($body.find("#cas-name").val()).trim() || "Tibia";
    const verStr   = String($body.find("#cas-version").val());
    const version  = versions.find((v) => v.valueStr === verStr) ?? project.version;

    const datBytes = compileDat(project.dat, version);
    const sprBytes = compileSpr(project.spr, version);
    downloadBytes(datBytes, `${baseName}.dat`);
    downloadBytes(sprBytes, `${baseName}.spr`);

    return { datBytes, sprBytes, version };
}
