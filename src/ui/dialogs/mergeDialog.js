// "Merge Client Files" modal — pick a second Tibia.dat + Tibia.spr pair, detect
// its version/options, then append its sprites and objects to the currently
// loaded project. AS3 reference: ob.components.MergeAssetsWindow +
// ObjectBuilder.mxml::mergeProject.
//
// Same multi-file picker as the Open dialog: drop both files in at once and the
// dialog assigns them to the .dat / .spr slot by signature (falling back to the
// file extension), auto-selecting the matching version row.

import { showModal } from "../widgets/modal.js";
import { loadVersions } from "../../app/loadProject.js";
import { mergeClientFiles } from "../../app/mergeProject.js";
import { getState } from "../../store/index.js";

const $ = window.jQuery;

export async function showMergeDialog() {
    if (!getState().project) {
        await showModal({
            title: "No Project Loaded",
            body: $('<p>Merge appends another client into the open project. Use File → New or File → Open first.</p>'),
            buttons: [{ label: "OK", value: "ok", primary: true }],
        });
        return null;
    }

    const versions = await loadVersions();

    const $body = $(`
        <div class="form-grid" style="grid-template-columns: 1fr;">
            <label>
                <span>Source Tibia.dat + Tibia.spr</span>
                <input type="file" id="merge-files" class="control"
                       accept=".dat,.spr,application/octet-stream"
                       multiple>
            </label>
            <div class="open-detected" id="merge-detected" hidden>
                <ul class="open-detected__list"></ul>
            </div>
            <label>
                <span>Client version</span>
                <select id="merge-version" class="control"></select>
            </label>
            <label class="inline">
                <input type="checkbox" id="merge-extended">
                <span>Extended (32-bit sprite ids — auto for v ≥ 9.60)</span>
            </label>
            <label class="inline">
                <input type="checkbox" id="merge-transparency">
                <span>Transparency (per-pixel alpha — auto for v ≥ 8.55)</span>
            </label>
            <label class="inline">
                <input type="checkbox" id="merge-improvedAnimations">
                <span>Improved animations (per-frame durations — auto for v ≥ 10.50)</span>
            </label>
            <label class="inline">
                <input type="checkbox" id="merge-frameGroups">
                <span>Frame groups (multiple outfit groups — auto for v ≥ 10.57)</span>
            </label>
            <label class="inline">
                <input type="checkbox" id="merge-optimize" checked>
                <span>Optimize sprites before merge (drop empty / duplicate sprites)</span>
            </label>
        </div>
    `);

    const $select = $body.find("#merge-version");
    for (const v of versions) {
        $select.append(`<option value="${v.valueStr}">${v.valueStr}</option>`);
    }
    $select.val(getState().project.version?.valueStr ?? "7.72");

    let detected = { datFile: null, sprFile: null, matchedVersion: null };

    $body.find("#merge-files").on("change.mergedlg", async function () {
        detected = await classifyFiles(this.files, versions);
        renderDetected($body, detected);
        if (detected.matchedVersion) {
            $select.val(detected.matchedVersion.valueStr);
        }
    });

    const action = await showModal({
        title: "Merge Client Files",
        body: $body,
        buttons: [
            { label: "Cancel", value: null },
            {
                label: "Merge",
                value: "ok",
                primary: true,
                onValidate: ($host) => {
                    $host.find("p.error-line").remove();
                    if (!detected.datFile || !detected.sprFile) {
                        $host.append('<p class="error-line">Pick both Tibia.dat and Tibia.spr (you can select them together).</p>');
                        return false;
                    }
                    return true;
                },
            },
        ],
    });

    if (action !== "ok") return null;

    const verStr  = String($select.val());
    const version = versions.find((v) => v.valueStr === verStr);
    const options = {
        extended:           $body.find("#merge-extended").is(":checked")           || undefined,
        transparency:       $body.find("#merge-transparency").is(":checked")       || undefined,
        improvedAnimations: $body.find("#merge-improvedAnimations").is(":checked") || undefined,
        frameGroups:        $body.find("#merge-frameGroups").is(":checked")        || undefined,
        strict: false,
    };
    const optimizeSprites = $body.find("#merge-optimize").is(":checked");

    const [datBuffer, sprBuffer] = await Promise.all([
        detected.datFile.arrayBuffer(),
        detected.sprFile.arrayBuffer(),
    ]);

    return mergeClientFiles({ datBuffer, sprBuffer, version, options, optimizeSprites });
}

/**
 * Partitions a FileList into {datFile, sprFile} by reading the first 4 bytes of
 * each (u32 LE) and matching against known signatures from versions.json. Falls
 * back to the file extension when no signature matches.
 */
async function classifyFiles(fileList, versions) {
    const datSigs = new Set(versions.map((v) => parseHex(v.datSignature)));
    const sprSigs = new Set(versions.map((v) => parseHex(v.sprSignature)));

    let datFile = null;
    let sprFile = null;
    let matchedVersion = null;

    for (const file of Array.from(fileList || [])) {
        const sig = await readU32LE(file);
        const lower = file.name.toLowerCase();

        const looksDatBySig = sig !== null && datSigs.has(sig);
        const looksSprBySig = sig !== null && sprSigs.has(sig);
        const looksDatByExt = lower.endsWith(".dat");
        const looksSprByExt = lower.endsWith(".spr");

        if ((looksDatBySig || looksDatByExt) && !datFile) {
            datFile = file;
            if (looksDatBySig) {
                matchedVersion = versions.find((v) => parseHex(v.datSignature) === sig) || matchedVersion;
            }
        } else if ((looksSprBySig || looksSprByExt) && !sprFile) {
            sprFile = file;
        }
    }

    return { datFile, sprFile, matchedVersion };
}

function renderDetected($host, detected) {
    const $box = $host.find("#merge-detected");
    const $list = $box.find(".open-detected__list").empty();
    if (!detected.datFile && !detected.sprFile) {
        $box.prop("hidden", true);
        return;
    }
    $box.prop("hidden", false);
    if (detected.datFile) {
        const verLabel = detected.matchedVersion
            ? ` — version ${detected.matchedVersion.valueStr}`
            : "";
        $list.append(`<li><strong>.dat</strong>: ${escapeHtml(detected.datFile.name)} (${formatBytes(detected.datFile.size)})${verLabel}</li>`);
    }
    if (detected.sprFile) {
        $list.append(`<li><strong>.spr</strong>: ${escapeHtml(detected.sprFile.name)} (${formatBytes(detected.sprFile.size)})</li>`);
    }
}

async function readU32LE(file) {
    try {
        const slice = await file.slice(0, 4).arrayBuffer();
        if (slice.byteLength < 4) return null;
        return new DataView(slice).getUint32(0, true) >>> 0;
    } catch {
        return null;
    }
}

function parseHex(s) {
    if (typeof s === "number") return s >>> 0;
    if (typeof s !== "string") return 0;
    const cleaned = s.startsWith("0x") || s.startsWith("0X") ? s.slice(2) : s;
    return (parseInt(cleaned, 16) >>> 0) || 0;
}

function formatBytes(n) {
    if (n < 1024) return `${n} B`;
    if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} kB`;
    return `${(n / (1024 * 1024)).toFixed(2)} MB`;
}

function escapeHtml(s) {
    return String(s)
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;");
}
