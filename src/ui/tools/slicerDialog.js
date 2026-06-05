// Slicer — load a PNG, split it into 32×32 tiles, add them to the project
// sprite storage. AS3 reference: slicer.Slicer.

import { showModal } from "../widgets/modal.js";
import { getState, addSprite, pushEdit } from "../../store/index.js";
import { rgbaToArgb }     from "../../core/sprites/spritePixels.js";
import { SPRITE_DEFAULT_SIZE } from "../../core/sprites/spriteRle.js";

const $ = window.jQuery;
const TILE = SPRITE_DEFAULT_SIZE;

export async function showSlicerDialog() {
    if (!getState().project) {
        await showModal({
            title: "Slicer",
            body: $("<p>No project is loaded. Use File → Open first.</p>"),
            buttons: [{ label: "OK", value: null, primary: true }],
        });
        return null;
    }

    const $body = $(`
        <div class="form-grid" style="grid-template-columns: 1fr;">
            <label>
                <span>Sprite sheet (PNG, dimensions must be multiples of 32)</span>
                <input type="file" id="slicer-file" accept="image/png" class="control">
            </label>
            <div id="slicer-info" style="font-size: 11px; color: #9a9a9a;">Pick an image to begin.</div>
            <div id="slicer-preview" class="sprite-grid" style="max-height: 280px; overflow:auto;"></div>
        </div>
    `);

    let tiles = []; // Array of Uint8Array (ARGB 4096 bytes each)
    const $info    = $body.find("#slicer-info");
    const $preview = $body.find("#slicer-preview");

    $body.find("#slicer-file").on("change", async function () {
        const file = this.files[0];
        if (!file) return;
        try {
            tiles = await loadAndSlice(file);
            $info.text(`${tiles.length} tile(s) of ${TILE}×${TILE}.`);
            $preview.empty();
            for (let i = 0; i < tiles.length; i++) {
                const $cell = $('<div class="sprite-grid__cell sprite-grid__cell--has-canvas"></div>')
                    .attr("title", `tile ${i + 1}`);
                const canvas = document.createElement("canvas");
                canvas.width = TILE; canvas.height = TILE; canvas.className = "sprite-grid__canvas";
                const ctx = canvas.getContext("2d");
                ctx.putImageData(argbToImageData(tiles[i]), 0, 0);
                $cell.append(canvas);
                $preview.append($cell);
            }
        } catch (err) {
            $info.text(`Slicer failed: ${err.message}`);
            tiles = [];
            $preview.empty();
        }
    });

    const action = await showModal({
        title: "Slicer",
        body: $body,
        buttons: [
            { label: "Cancel", value: null },
            {
                label: "Add tiles as sprites",
                value: "ok",
                primary: true,
                onValidate: () => tiles.length > 0,
            },
        ],
    });

    if (action !== "ok") return null;

    let added = 0;
    for (const px of tiles) {
        const id = addSprite(px);
        if (id) { added++; pushEdit("sprite-add", { id }); }
    }
    return { added };
}

async function loadAndSlice(file) {
    const url = URL.createObjectURL(file);
    try {
        const img = await loadImage(url);
        if (img.width % TILE !== 0 || img.height % TILE !== 0) {
            throw new Error(`Image dimensions ${img.width}×${img.height} must be multiples of ${TILE}`);
        }
        const cols = img.width / TILE;
        const rows = img.height / TILE;
        const canvas = document.createElement("canvas");
        canvas.width = img.width; canvas.height = img.height;
        canvas.getContext("2d").drawImage(img, 0, 0);

        const out = [];
        for (let r = 0; r < rows; r++) {
            for (let c = 0; c < cols; c++) {
                const rgba = canvas.getContext("2d").getImageData(c * TILE, r * TILE, TILE, TILE);
                out.push(rgbaToArgb(rgba.data));
            }
        }
        return out;
    } finally {
        URL.revokeObjectURL(url);
    }
}

function loadImage(url) {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = (e) => reject(new Error("image failed to load"));
        img.src = url;
    });
}

function argbToImageData(argb) {
    const rgba = new Uint8ClampedArray(argb.length);
    for (let i = 0; i < argb.length; i += 4) {
        rgba[i    ] = argb[i + 1];
        rgba[i + 1] = argb[i + 2];
        rgba[i + 2] = argb[i + 3];
        rgba[i + 3] = argb[i    ];
    }
    return new ImageData(rgba, TILE, TILE);
}
