// Browser-facing OBD commands: export selected object and import one OBD file
// into the current project.

import { downloadBytes } from "./compileProject.js";
import { getState, getSelectedThing, addThing, replaceThing } from "../store/index.js";
import {
    collectObdSprites,
    collectObdSpritesByGroup,
    decodeObd,
    encodeObd,
    isEmptySpritePixels,
} from "../formats/obd/ObdCodec.js";
import { getLzmaCodec } from "../formats/obd/lzmaCodec.js";
import { OUTFIT } from "../core/things/ThingCategory.js";

export async function exportSelectedThingToObd() {
    const project = getState().project;
    const thing = getSelectedThing();
    if (!project || !thing) throw new Error("No object selected");

    // For outfits with multiple FrameGroups (10.57+) collect sprites per group
    // so the V3 writer can emit them. encodeObd() picks V2 vs V3 automatically.
    const usesGroups = thing.category === OUTFIT
        && Array.isArray(thing.frameGroups)
        && thing.frameGroups.filter(Boolean).length > 1;
    const sprites = usesGroups
        ? collectObdSpritesByGroup(thing, project.spr)
        : collectObdSprites(thing, project.spr);
    const codec = await getLzmaCodec();
    const bytes = await encodeObd({
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

export async function replaceSelectedThingFromObdFilePicker() {
    const file = await pickObdFile();
    if (!file) return null;
    return replaceSelectedThingFromObdFile(file);
}

export async function replaceSelectedThingFromObdFile(file) {
    const project = getState().project;
    if (!project) throw new Error("No project loaded");

    const bytes = new Uint8Array(await file.arrayBuffer());
    const codec = await getLzmaCodec();
    const data = await decodeObd(bytes, codec);
    return replaceSelectedThingFromObdData(data);
}

export function importObdData(data) {
    const project = getState().project;
    if (!project) throw new Error("No project loaded");

    const { thing, spritesAdded } = prepareObdThing(data, project.spr);
    const id = addThing(thing.category, thing);
    return { id, category: thing.category, spritesAdded, clientVersion: data.clientVersion, thing };
}

export function replaceSelectedThingFromObdData(data) {
    const project = getState().project;
    const current = getSelectedThing();
    if (!project || !current) throw new Error("No object selected");
    if (data.thing.category !== current.category) {
        throw new Error(`Cannot replace ${current.category} ${current.id} with ${data.thing.category} OBD`);
    }

    const before = current.clone();
    const { thing, spritesAdded } = prepareObdThing(data, project.spr);
    thing.id = current.id;
    thing.category = current.category;

    if (!replaceThing(current.category, thing)) {
        throw new Error(`Could not replace ${current.category} ${current.id}`);
    }

    return {
        id: thing.id,
        category: thing.category,
        spritesAdded,
        clientVersion: data.clientVersion,
        before,
        thing,
    };
}

function prepareObdThing(data, spr) {
    const thing = data.thing.clone();
    let spritesAdded = 0;

    // V3 outfit: sprites is `{groupType: [...]}`; remap each group's spriteIndex
    // independently and update the FrameGroup's spriteIndex in-place.
    if (data.sprites && !Array.isArray(data.sprites) && typeof data.sprites === "object") {
        for (const key of Object.keys(data.sprites)) {
            const groupType = Number(key);
            const list = data.sprites[key];
            const fg = thing.frameGroups?.[groupType];
            if (!fg || !Array.isArray(list)) continue;
            const remapped = remapSpriteList(list, spr);
            fg.spriteIndex = remapped.ids;
            spritesAdded += remapped.added;
        }
        // Mirror group 0 onto the root for legacy callers (editor / preview).
        const root = thing.frameGroups?.[0];
        if (root) thing.spriteIndex = root.spriteIndex;
    } else {
        // V2 / V3-flat: single flat list of sprites; current path.
        const sprites = data.sprites || [];
        const remapped = remapSpriteList(sprites, project.spr);
        thing.spriteIndex = remapped.ids;
        spritesAdded = remapped.added;
    }

    return { thing, spritesAdded };
}

function remapSpriteList(sprites, spr) {
    const ids = new Array(sprites.length);
    let added = 0;
    for (let i = 0; i < sprites.length; i++) {
        const sprite = sprites[i];
        const pixels = sprite?.pixels;
        if (isEmptySpritePixels(pixels)) {
            ids[i] = 0;
            continue;
        }
        const existingId = sprite.id | 0;
        const existingPixels = existingId > 0 && spr.hasSprite(existingId)
            ? spr.getSpritePixels(existingId)
            : null;
        if (existingPixels && pixelsEqual(existingPixels, pixels)) {
            ids[i] = existingId;
            continue;
        }
        ids[i] = spr.addSprite(pixels);
        added++;
    }
    return { ids, added };
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
