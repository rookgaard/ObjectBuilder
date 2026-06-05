// Browser-facing OBD commands: export selected object and import one OBD file
// into the current project.

import { downloadBytes } from "./compileProject.js";
import { getState, getSelectedThing, addThing } from "../store/index.js";
import {
    collectObdSprites,
    decodeObd,
    encodeObdV2,
    isEmptySpritePixels,
} from "../formats/obd/ObdCodec.js";
import { getLzmaCodec } from "../formats/obd/lzmaCodec.js";

export async function exportSelectedThingToObd() {
    const project = getState().project;
    const thing = getSelectedThing();
    if (!project || !thing) throw new Error("No object selected");

    const sprites = collectObdSprites(thing, project.spr);
    const codec = await getLzmaCodec();
    const bytes = await encodeObdV2({
        clientVersion: project.version.value,
        thing,
        sprites,
    }, codec);

    const filename = `${thing.category}-${thing.id}.obd`;
    downloadBytes(bytes, filename);
    return { bytes, filename, thing };
}

export async function importObdFromFilePicker() {
    const file = await pickObdFile();
    if (!file) return null;
    return importObdFile(file);
}

export async function importObdFile(file) {
    const project = getState().project;
    if (!project) throw new Error("No project loaded");

    const bytes = new Uint8Array(await file.arrayBuffer());
    const codec = await getLzmaCodec();
    const data = await decodeObd(bytes, codec);
    return importObdData(data);
}

export function importObdData(data) {
    const project = getState().project;
    if (!project) throw new Error("No project loaded");

    const thing = data.thing.clone();
    const sprites = data.sprites || [];
    const nextSpriteIndex = new Array(sprites.length);
    let spritesAdded = 0;

    for (let i = 0; i < sprites.length; i++) {
        const sprite = sprites[i];
        const pixels = sprite?.pixels;
        if (isEmptySpritePixels(pixels)) {
            nextSpriteIndex[i] = 0;
            continue;
        }

        const existingId = sprite.id | 0;
        const existingPixels = existingId > 0 && project.spr.hasSprite(existingId)
            ? project.spr.getSpritePixels(existingId)
            : null;

        if (existingPixels && pixelsEqual(existingPixels, pixels)) {
            nextSpriteIndex[i] = existingId;
            continue;
        }

        nextSpriteIndex[i] = project.spr.addSprite(pixels);
        spritesAdded++;
    }

    thing.spriteIndex = nextSpriteIndex;
    const id = addThing(thing.category, thing);
    return { id, category: thing.category, spritesAdded, clientVersion: data.clientVersion };
}

function pickObdFile() {
    return new Promise((resolve) => {
        const input = document.createElement("input");
        input.type = "file";
        input.accept = ".obd,application/octet-stream";
        input.style.display = "none";
        input.addEventListener("change", () => {
            const file = input.files?.[0] ?? null;
            input.remove();
            resolve(file);
        }, { once: true });
        document.body.appendChild(input);
        input.click();
    });
}

function pixelsEqual(a, b) {
    if (!a || !b || a.length !== b.length) return false;
    for (let i = 0; i < a.length; i++) {
        if (a[i] !== b[i]) return false;
    }
    return true;
}
