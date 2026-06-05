// Browser-facing sprite mutation helpers.

import { getState, replaceSprite } from "../store/index.js";
import { rgbaToArgb } from "../core/sprites/spritePixels.js";
import { SPRITE_DEFAULT_SIZE } from "../core/sprites/spriteRle.js";

const TILE = SPRITE_DEFAULT_SIZE;

export async function replaceSelectedSpriteFromPngFilePicker() {
    const file = await pickPngFile();
    if (!file) return null;
    return replaceSelectedSpriteFromPngFile(file);
}

export async function replaceSelectedSpriteFromPngFile(file) {
    const state = getState();
    if (!state.project) throw new Error("No project loaded");
    const id = state.selectedSpriteId | 0;
    if (id <= 0) throw new Error("No sprite selected");

    const pixels = await loadPngAsSprite(file);
    const before = replaceSprite(id, pixels);
    if (!before) throw new Error(`Could not replace sprite ${id}`);
    return { id, before, pixels };
}

async function loadPngAsSprite(file) {
    const url = URL.createObjectURL(file);
    try {
        const img = await loadImage(url);
        if (img.width !== TILE || img.height !== TILE) {
            throw new Error(`PNG must be ${TILE}x${TILE}px; got ${img.width}x${img.height}px`);
        }

        const canvas = document.createElement("canvas");
        canvas.width = TILE;
        canvas.height = TILE;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0);
        return rgbaToArgb(ctx.getImageData(0, 0, TILE, TILE).data);
    } finally {
        URL.revokeObjectURL(url);
    }
}

function pickPngFile() {
    return new Promise((resolve) => {
        const input = document.createElement("input");
        input.type = "file";
        input.accept = "image/png,.png";
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

function loadImage(url) {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = () => reject(new Error("image failed to load"));
        img.src = url;
    });
}
