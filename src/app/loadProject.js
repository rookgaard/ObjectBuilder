// Project load orchestrator. Pulls a `.dat` + `.spr` pair plus a Version into
// a single LoadedProject object and pushes it into the projectStore.

import { loadDat } from "../formats/dat/DatLoader.js";
import { SprFile } from "../formats/spr/SprFile.js";
import { Version, versionFromJson } from "../core/Version.js";
import { setProject } from "../store/projectStore.js";

const VERSIONS_URL = "./public/versions.json";

let _versionsPromise = null;

/** Returns the parsed versions.json array as Version[] (memoized). */
export function loadVersions() {
    if (!_versionsPromise) {
        _versionsPromise = fetch(VERSIONS_URL)
            .then((r) => {
                if (!r.ok) throw new Error(`versions.json HTTP ${r.status}`);
                return r.json();
            })
            .then((rows) => rows.map(versionFromJson));
    }
    return _versionsPromise;
}

/** Finds the Version row for the given valueStr ("7.72"). */
export async function findVersion(valueStr) {
    const versions = await loadVersions();
    return versions.find((v) => v.valueStr === valueStr) ?? null;
}

/**
 * @param {{ datBuffer:ArrayBuffer, sprBuffer:ArrayBuffer, version:Version, options?:object }} args
 * @returns {LoadedProject}
 */
export function buildProject({ datBuffer, sprBuffer, version, options = {} }) {
    const dat = loadDat(datBuffer, version, options);
    const spr = new SprFile(sprBuffer, version, options);
    const project = { version, dat, spr };
    setProject(project);
    return project;
}

/**
 * Dev convenience reference fixtures. Each entry points at a `references/<dir>/`
 * folder holding a matching `Tibia.dat` + `Tibia.spr` pair. `valueStr` selects
 * the Version row in versions.json; `fallback` supplies a synthetic Version for
 * client versions that predate / postdate the ported versions.json list.
 *
 * Extended / transparency / improvedAnimations modes are auto-derived from
 * `version.value` by the DAT/SPR loaders, so only the value needs to be right.
 */
export const REFERENCE_PROJECTS = [
    { id: "ref770",  label: "Load 7.7",   dir: "770",  valueStr: "7.70" },
    { id: "ref860",  label: "Load 8.6",   dir: "860",  valueStr: "8.60 v1" },
    { id: "ref900",  label: "Load 9.0",   dir: "900",  valueStr: "9.00" },
    { id: "ref1010", label: "Load 10.10", dir: "1010", valueStr: "10.10" },
    { id: "ref1035", label: "Load 10.35", dir: "1035", valueStr: "10.35" },
    { id: "ref1041", label: "Load 10.41", dir: "1041", valueStr: "10.41" },
    { id: "ref1050", label: "Load 10.50", dir: "1050", valueStr: "10.50" },
    { id: "ref1055", label: "Load 10.55", dir: "1055", valueStr: "10.55" },
    { id: "ref1061", label: "Load 10.61", dir: "1061", valueStr: "10.61" },
    {
        id: "ref1098", label: "Load 10.98", dir: "1098", valueStr: "10.98",
        fallback: { value: 1098, datSignature: 0x000042a3, sprSignature: 0x57bbd603 },
    },
    {
        id: "ref1501", label: "Load 15.01", dir: "1501", valueStr: "15.01",
        fallback: { value: 1501, datSignature: 0x000042a3, sprSignature: 0x53159ca9 },
    },
];

/**
 * Loads one of the REFERENCE_PROJECTS fixtures into the projectStore.
 *
 * @param {(typeof REFERENCE_PROJECTS)[number]} [ref] defaults to the first entry.
 */
export async function loadReferenceProject(ref = REFERENCE_PROJECTS[0]) {
    let version = await findVersion(ref.valueStr);
    if (!version && ref.fallback) {
        version = new Version({
            value: ref.fallback.value,
            valueStr: ref.valueStr,
            datSignature: ref.fallback.datSignature,
            sprSignature: ref.fallback.sprSignature,
        });
    }
    if (!version) {
        throw new Error(`loadReferenceProject: version ${ref.valueStr} not in versions.json`);
    }

    const base = `./references/${ref.dir}`;
    const [dat, spr] = await Promise.all([
        fetch(`${base}/Tibia.dat`).then(assertOk).then((r) => r.arrayBuffer()),
        fetch(`${base}/Tibia.spr`).then(assertOk).then((r) => r.arrayBuffer()),
    ]);

    return buildProject({
        datBuffer: dat,
        sprBuffer: spr,
        version,
        // Custom fixtures may carry tweaked signatures / trailing bytes.
        options: { strict: false },
    });
}

function assertOk(response) {
    if (!response.ok) {
        throw new Error(`fetch ${response.url} → HTTP ${response.status}`);
    }
    return response;
}
