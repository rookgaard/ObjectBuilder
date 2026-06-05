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
    let groupType = 0; // 0 = DEFAULT (stand), 1 = WALKING — only relevant for outfits 10.57+
    let displayThing = null;
    let coords = { patternX: 0, patternY: 0, patternZ: 0, frame: 0, layer: null };
    let animator = null;
    let playing = false;
    let rafId = null;
    let lastTs = 0;
    const changeHandlers = [];

    function setThing(nextThing, nextSpr) {
        thing = nextThing || null;
        spr   = nextSpr  || null;
        groupType = 0;
        refreshDisplayThing();

        if (!thing || !spr) {
            stop();
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            $hint.text("No thing selected.");
            emitChange();
            return;
        }

        applyGeometryDefaults();
        rebuildAnimator();
        render();
    }

    function setPose(nextGroupType) {
        if (!thing) return;
        const g = nextGroupType | 0;
        if (g === groupType) return;
        groupType = g;
        refreshDisplayThing();
        applyGeometryDefaults();
        rebuildAnimator();
        render();
    }

    // Pick the FrameGroup-derived view if outfits 10.57+ carry frameGroups[].
    // Otherwise fall back to the ThingType itself (which has all fields on root).
    function refreshDisplayThing() {
        if (!thing) { displayThing = null; return; }
        const groups = thing.frameGroups;
        if (!Array.isArray(groups) || groups.length === 0) {
            displayThing = thing;
            return;
        }
        const g = groups[groupType] || groups[0];
        if (!g) { displayThing = thing; return; }
        // Layer the group's geometry over the underlying ThingType so callers
        // still see id / category / flags from the real thing.
        displayThing = Object.assign(Object.create(thing), {
            width: g.width, height: g.height, exactSize: g.exactSize,
            layers: g.layers,
            patternX: g.patternX, patternY: g.patternY, patternZ: g.patternZ,
            frames: g.frames,
            spriteIndex: g.spriteIndex,
            isAnimation: g.isAnimation,
            animationMode: g.animationMode,
            loopCount: g.loopCount,
            startFrame: g.startFrame,
            frameDurations: g.frameDurations,
        });
    }

    function applyGeometryDefaults() {
        const t = displayThing;
        const size = compositeSize(t);
        canvas.width  = size.width;
        canvas.height = size.height;

        // Outfit convention from AS3 ThingDataView: patternX defaults to 2
        // (south-facing) so the preview looks right.
        if (t.category === "outfit") {
            coords = {
                patternX: Math.min(2, Math.max(0, t.patternX - 1)),
                patternY: 0,
                patternZ: 0,
                frame: 0,
                layer: t.layers > 1 ? 0 : null,
            };
        } else {
            coords = { patternX: 0, patternY: 0, patternZ: 0, frame: 0, layer: null };
        }
    }

    function rebuildAnimator() {
        const t = displayThing;
        if (t.isAnimation && t.frames > 1) {
            animator = new Animator({
                frames: t.frames,
                frameDurations: t.frameDurations,
                category: t.category,
                animateAlways: true,
                startFrame: 0,
            });
            play();
        } else {
            animator = null;
            stop();
        }
    }

    function render() {
        if (!displayThing || !spr) return;
        drawFrame(ctx, displayThing, spr, coords, {
            drawBlendLayer: coords.layer == null,
            layer: coords.layer,
        });
        $hint.text(thingHint());
        emitChange();
    }

    function thingHint() {
        const t = displayThing;
        if (!t) return "";
        const px = `pX ${coords.patternX}/${t.patternX}`;
        const py = t.patternY > 1 ? ` pY ${coords.patternY}/${t.patternY}` : "";
        const pz = t.patternZ > 1 ? ` pZ ${coords.patternZ}/${t.patternZ}` : "";
        const fr = t.frames   > 1 ? ` frame ${coords.frame + 1}/${t.frames}` : "";
        const layer = t.layers > 1
            ? ` layer ${coords.layer == null ? "all" : coords.layer + 1}/${t.layers}`
            : "";
        const pose = (thing.frameGroups?.length > 1) ? ` · ${groupType === 1 ? "walking" : "stand"}` : "";
        return `${t.category} ${t.id} · ${px}${py}${pz}${fr}${layer}${pose}`;
    }

    function play() {
        if (!animator || playing) return;
        playing = true;
        lastTs = performance.now();
        emitChange();
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
        emitChange();
    }

    function setPatternX(v) {
        if (!displayThing) return;
        coords = { ...coords, patternX: clampPattern(v, displayThing.patternX) };
        render();
    }
    function setPatternY(v) {
        if (!displayThing) return;
        coords = { ...coords, patternY: clampPattern(v, displayThing.patternY) };
        render();
    }
    function setPatternZ(v) {
        if (!displayThing) return;
        coords = { ...coords, patternZ: clampPattern(v, displayThing.patternZ) };
        render();
    }
    function setFrame(v) {
        if (!displayThing) return;
        const frames = Math.max(1, displayThing.frames | 0);
        const f = ((v | 0) % frames + frames) % frames;
        if (animator) animator.setFrame(f);
        coords = { ...coords, frame: f };
        render();
    }
    function setLayer(v) {
        if (!displayThing) return;
        if (v == null || v === "all") {
            coords = { ...coords, layer: null };
        } else {
            coords = { ...coords, layer: clampPattern(v, displayThing.layers) };
        }
        render();
    }

    function emitChange() {
        const snapshot = { thing: displayThing, coords: { ...coords }, playing, groupType };
        changeHandlers.forEach((h) => h(snapshot));
    }

    function clampPattern(v, max) {
        const m = Math.max(1, max);
        return ((v | 0) % m + m) % m;
    }

    return {
        setThing,
        setPose,
        setPatternX,
        setPatternY,
        setPatternZ,
        setFrame,
        setLayer,
        play,
        stop,
        onChange(h) { changeHandlers.push(h); },
        get coords() { return { ...coords }; },
        get isPlaying() { return playing; },
        // displayThing is what the preview shows (FrameGroup-substituted for
        // outfits 10.57+). `rawThing` is the underlying ThingType — useful when
        // a caller needs to know whether multiple FrameGroups are available.
        get thing()      { return displayThing; },
        get rawThing()   { return thing; },
        get groupType()  { return groupType; },
    };
}
