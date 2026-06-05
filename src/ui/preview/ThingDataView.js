// ThingDataView — a single-canvas widget that mounts into a jQuery host and
// renders + animates the currently selected ThingType.
//
// Composition is delegated to ./SpriteSheet.js (one draw per frame). Animation
// is delegated to ./Animator.js (per-frame durations). When the host receives
// new geometry (different thing), we resize the canvas to width*32 × height*32
// — actual screen size is controlled via CSS (image-rendering: pixelated lets
// the browser handle scaling).

import { Animator }   from "./Animator.js";
import { drawFrame, compositeSize } from "./SpriteSheet.js";

const $ = window.jQuery;

export function createThingDataView($host) {
    $host.empty().append(`
        <div class="tdv">
            <div class="tdv__canvas-wrap">
                <canvas class="tdv__canvas" width="32" height="32" aria-label="Sprite preview"></canvas>
            </div>
            <p class="tdv__hint">No thing selected.</p>
        </div>
    `);

    const canvas = $host.find(".tdv__canvas")[0];
    const ctx    = canvas.getContext("2d");
    const $hint  = $host.find(".tdv__hint");

    let thing = null;
    let spr   = null;
    let coords = { patternX: 0, patternY: 0, patternZ: 0, frame: 0 };
    let drawBlendLayer = true;
    let animator = null;
    let playing = false;
    let rafId = null;
    let lastTs = 0;

    function setThing(nextThing, nextSpr) {
        thing = nextThing || null;
        spr   = nextSpr  || null;

        if (!thing || !spr) {
            stop();
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            $hint.text("No thing selected.");
            return;
        }

        const size = compositeSize(thing);
        canvas.width  = size.width;
        canvas.height = size.height;

        // Outfit conventions from AS3 ThingDataView:
        //  - first frame skipped when not animateAlways (start at frame 1).
        //  - patternX defaults to 2 (south-facing) so the preview looks right.
        if (thing.category === "outfit") {
            coords = { patternX: 2, patternY: 0, patternZ: 0, frame: 0 };
            drawBlendLayer = false;
        } else {
            coords = { patternX: 0, patternY: 0, patternZ: 0, frame: 0 };
            drawBlendLayer = true;
        }

        if (thing.isAnimation) {
            animator = new Animator({
                frames: thing.frames,
                frameDurations: thing.frameDurations,
                category: thing.category,
                animateAlways: thing.animateAlways || thing.category === "outfit",
                startFrame: 0,
            });
            play();
        } else {
            animator = null;
            stop();
        }

        render();
    }

    function render() {
        if (!thing || !spr) return;
        drawFrame(ctx, thing, spr, coords, { drawBlendLayer });
        $hint.text(thingHint());
    }

    function thingHint() {
        if (!thing) return "";
        const px = `pX ${coords.patternX}/${thing.patternX}`;
        const py = thing.patternY > 1 ? ` pY ${coords.patternY}/${thing.patternY}` : "";
        const pz = thing.patternZ > 1 ? ` pZ ${coords.patternZ}/${thing.patternZ}` : "";
        const fr = thing.frames   > 1 ? ` frame ${coords.frame + 1}/${thing.frames}` : "";
        return `${thing.category} ${thing.id} · ${px}${py}${pz}${fr}`;
    }

    function play() {
        if (!animator || playing) return;
        playing = true;
        lastTs = performance.now();
        const loop = (ts) => {
            if (!playing) return;
            const dt = ts - lastTs;
            lastTs = ts;
            if (animator.tick(dt)) {
                coords = { ...coords, frame: animator.currentFrame };
                render();
            }
            rafId = requestAnimationFrame(loop);
        };
        rafId = requestAnimationFrame(loop);
    }

    function stop() {
        playing = false;
        if (rafId != null) {
            cancelAnimationFrame(rafId);
            rafId = null;
        }
    }

    function setPatternX(v) {
        if (!thing) return;
        coords = { ...coords, patternX: clampPattern(v, thing.patternX) };
        render();
    }
    function setPatternY(v) {
        if (!thing) return;
        coords = { ...coords, patternY: clampPattern(v, thing.patternY) };
        render();
    }
    function setPatternZ(v) {
        if (!thing) return;
        coords = { ...coords, patternZ: clampPattern(v, thing.patternZ) };
        render();
    }
    function setFrame(v) {
        if (!thing || !animator) return;
        const f = ((v | 0) % thing.frames + thing.frames) % thing.frames;
        animator.setFrame(f);
        coords = { ...coords, frame: f };
        render();
    }

    function clampPattern(v, max) {
        const m = Math.max(1, max);
        return ((v | 0) % m + m) % m;
    }

    return {
        setThing,
        setPatternX,
        setPatternY,
        setPatternZ,
        setFrame,
        play,
        stop,
        get coords() { return { ...coords }; },
        get isPlaying() { return playing; },
        get thing() { return thing; },
    };
}
