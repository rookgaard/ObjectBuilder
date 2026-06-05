// "New Project" modal — create a blank project at the chosen version.
// AS3 reference: ob.components.CreateAssetsWindow.

import { showModal } from "../widgets/modal.js";
import { loadVersions } from "../../app/loadProject.js";
import { setProject } from "../../store/index.js";
import { ThingType } from "../../core/things/ThingType.js";
import { SprFile }   from "../../formats/spr/SprFile.js";
import { BinaryWriter } from "../../core/binary/BinaryWriter.js";

const $ = window.jQuery;

export async function showNewDialog() {
    const versions = await loadVersions();

    const $body = $(`
        <div class="form-grid" style="grid-template-columns: 1fr;">
            <label>
                <span>Client version</span>
                <select id="new-version" class="control"></select>
            </label>
            <label class="inline">
                <input type="checkbox" id="new-extended">
                <span>Extended (auto for v ≥ 9.60)</span>
            </label>
            <label class="inline">
                <input type="checkbox" id="new-transparency">
                <span>Transparency (auto for v ≥ 8.55)</span>
            </label>
            <label class="inline">
                <input type="checkbox" id="new-improvedAnimations">
                <span>Improved animations (auto for v ≥ 10.50)</span>
            </label>
        </div>
    `);

    const $select = $body.find("#new-version");
    for (const v of versions) {
        $select.append(`<option value="${v.valueStr}">${v.valueStr}</option>`);
    }
    $select.val("7.72");

    const action = await showModal({
        title: "New Project",
        body: $body,
        buttons: [
            { label: "Cancel", value: null },
            { label: "Create", value: "ok", primary: true },
        ],
    });
    if (action !== "ok") return null;

    const verStr  = String($body.find("#new-version").val());
    const version = versions.find((v) => v.valueStr === verStr);
    const extended           = $body.find("#new-extended").is(":checked")           || version.value >= 960;
    const transparency       = $body.find("#new-transparency").is(":checked");
    const improvedAnimations = $body.find("#new-improvedAnimations").is(":checked") || version.value >= 1050;

    const project = buildBlankProject(version, { extended, transparency, improvedAnimations });
    setProject(project);
    return project;
}

function buildBlankProject(version, opts) {
    const items    = new Map([[100, ThingType.create(100, "item")]]);
    const outfits  = new Map([[1,   ThingType.create(1, "outfit")]]);
    const effects  = new Map([[1,   ThingType.create(1, "effect")]]);
    const missiles = new Map([[1,   ThingType.create(1, "missile")]]);

    // Build a minimal SPR buffer in memory: header + count=1 + one empty slot.
    const w = new BinaryWriter();
    w.writeUint32(version.sprSignature);
    if (opts.extended) w.writeUint32(1); else w.writeUint16(1);
    w.writeUint32(0); // address for sprite 1 = 0 (empty)
    const sprBytes = w.toUint8Array();
    const sprBuf = sprBytes.buffer.slice(0, sprBytes.length);

    const spr = new SprFile(sprBuf, version, {
        extended: opts.extended,
        transparency: opts.transparency,
        strict: false,
    });

    return {
        version,
        dat: {
            version,
            signature: version.datSignature,
            signatureMismatch: false,
            itemsCount: 100, outfitsCount: 1, effectsCount: 1, missilesCount: 1,
            items, outfits, effects, missiles,
            extended: opts.extended,
            improvedAnimations: opts.improvedAnimations,
        },
        spr,
        dirty: false,
    };
}
