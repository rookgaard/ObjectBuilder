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
