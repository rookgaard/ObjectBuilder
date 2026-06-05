// Project load orchestrator. Pulls a `.dat` + `.spr` pair plus a Version into
// a single LoadedProject object and pushes it into the projectStore.

import { loadDat } from "../formats/dat/DatLoader.js";
import { SprFile } from "../formats/spr/SprFile.js";
import { versionFromJson } from "../core/Version.js";
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
 * Dev convenience — loads the project owner's reference fixtures from
 * /references/Tibia.dat + /references/Tibia.spr against version "7.72".
 */
export async function loadReferenceProject() {
    const version = await findVersion("7.72");
    if (!version) throw new Error("loadReferenceProject: version 7.72 not in versions.json");

    const [dat, spr] = await Promise.all([
        fetch("./references/Tibia.dat").then(assertOk).then((r) => r.arrayBuffer()),
        fetch("./references/Tibia.spr").then(assertOk).then((r) => r.arrayBuffer()),
    ]);

    return buildProject({
        datBuffer: dat,
        sprBuffer: spr,
        version,
        // 7.72 = non-extended, no transparency, no improvedAnimations.
        options: { strict: false },
    });
}

function assertOk(response) {
    if (!response.ok) {
        throw new Error(`fetch ${response.url} → HTTP ${response.status}`);
    }
    return response;
}
