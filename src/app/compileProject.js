// Orchestrates a full project compile: produces fresh Tibia.dat + Tibia.spr
// Blobs from the currently loaded project and offers them as downloads.

import { compileDat } from "../formats/dat/DatCompiler.js";
import { compileSpr } from "../formats/spr/SprCompiler.js";
import { getState } from "../store/index.js";

export function compileCurrentProject() {
    const project = getState().project;
    if (!project) throw new Error("compileCurrentProject: no project loaded");

    const datBytes = compileDat(project.dat, project.version);
    const sprBytes = compileSpr(project.spr, project.version);

    return {
        datBytes,
        sprBytes,
        datBlob: new Blob([datBytes], { type: "application/octet-stream" }),
        sprBlob: new Blob([sprBytes], { type: "application/octet-stream" }),
    };
}

/** Triggers a download of `bytes` as `filename` via a hidden anchor. */
export function downloadBytes(bytes, filename) {
    const blob = bytes instanceof Blob
        ? bytes
        : new Blob([bytes], { type: "application/octet-stream" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    // Free the URL on the next tick so click is fully resolved.
    setTimeout(() => URL.revokeObjectURL(url), 0);
}

/**
 * Compile + download both files. Returns the produced byte arrays so callers
 * can also keep them in memory if they want.
 */
export function compileAndDownload() {
    const out = compileCurrentProject();
    downloadBytes(out.datBlob, "Tibia.dat");
    downloadBytes(out.sprBlob, "Tibia.spr");
    return out;
}
