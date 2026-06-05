// Animation Editor for the currently selected ThingType.
// AS3 reference: com.mignari.animator.AnimationEditor. The browser version
// edits existing object animation metadata and per-frame durations.

import { FrameDuration, getDefaultDuration } from "../../core/animation/FrameDuration.js";
import {
    getSelectedThing,
    getState,
    pushEdit,
    replaceThing,
} from "../../store/index.js";
import { createThingDataView } from "../preview/ThingDataView.js";
import { showModal } from "../widgets/modal.js";

const $ = window.jQuery;
const MAX_DURATION = 60000;

export async function showAnimationEditorDialog() {
    const project = getState().project;
    const selected = getSelectedThing();
    if (!project || !selected) {
        await showModal({
            title: "Animation Editor",
            body: $("<p>Select an object in a loaded project first.</p>"),
            buttons: [{ label: "OK", value: null, primary: true }],
        });
        return;
    }

    let original = selected.clone();
    let draft = selected.clone();
    let dirty = false;
    let activeGroup = firstAnimationGroupKey(draft);

    const $body = $(`
        <div class="animation-editor">
            <section class="animation-editor__preview-panel">
                <div class="animation-editor__preview" id="animation-editor-preview"></div>
                <div class="animation-editor__transport">
                    <button type="button" class="button" id="anim-editor-prev">Previous</button>
                    <button type="button" class="button" id="anim-editor-play">Pause</button>
                    <button type="button" class="button" id="anim-editor-next">Next</button>
                </div>
            </section>
            <section class="animation-editor__settings">
                <div class="form-grid form-grid--two-col">
                    <label class="form-field" id="anim-editor-group-field">
                        <span class="form-field__label">Frame group</span>
                        <select class="control" id="anim-editor-group"></select>
                    </label>
                    <label class="form-field form-field--inline animation-editor__checkbox">
                        <input type="checkbox" id="anim-editor-enabled">
                        <span class="form-field__label">Animated</span>
                    </label>
                    <label class="form-field">
                        <span class="form-field__label">Animation mode</span>
                        <input type="number" class="control control--numeric" id="anim-editor-mode" min="0" max="1">
                    </label>
                    <label class="form-field">
                        <span class="form-field__label">Loop count</span>
                        <input type="number" class="control control--numeric" id="anim-editor-loop" min="-1" max="9999">
                    </label>
                    <label class="form-field">
                        <span class="form-field__label">Start frame</span>
                        <input type="number" class="control control--numeric" id="anim-editor-start" min="0">
                    </label>
                </div>
                <div class="animation-editor__frames-wrap">
                    <table class="animation-editor__frames">
                        <thead>
                            <tr>
                                <th>Frame</th>
                                <th>Min ms</th>
                                <th>Max ms</th>
                            </tr>
                        </thead>
                        <tbody id="anim-editor-frames"></tbody>
                    </table>
                </div>
                <div class="animation-editor__actions">
                    <button type="button" class="button" id="anim-editor-revert">Revert</button>
                    <button type="button" class="button button--primary" id="anim-editor-save">Save</button>
                    <span class="animation-editor__status" id="anim-editor-status"></span>
                </div>
            </section>
        </div>
    `);

    const tdv = createThingDataView($body.find("#animation-editor-preview"));
    tdv.onChange(syncPreviewControls);

    function target() {
        return getAnimationTarget(draft, activeGroup);
    }

    function refreshAll() {
        const groups = getAnimationGroups(draft);
        const $group = $body.find("#anim-editor-group").empty();
        for (const group of groups) {
            $group.append(`<option value="${group.key}">${escapeHtml(group.label)}</option>`);
        }
        if (!groups.some((g) => g.key === activeGroup)) activeGroup = groups[0].key;
        $group.val(activeGroup);
        $body.find("#anim-editor-group-field").prop("hidden", groups.length <= 1);

        const t = target();
        ensureFrameDurations(t, draft.category);
        const frameCount = Math.max(1, t.frames | 0);
        $body.find("#anim-editor-enabled").prop("checked", Boolean(t.isAnimation));
        $body.find("#anim-editor-mode").val(t.animationMode ?? 0);
        $body.find("#anim-editor-loop").val(t.loopCount ?? 0);
        $body.find("#anim-editor-start")
            .attr("max", Math.max(0, frameCount - 1))
            .val(Math.min(Math.max(0, t.startFrame | 0), frameCount - 1));
        renderFrameRows(t);
        tdv.setThing(draft, project.spr);
        if (activeGroup !== "root") tdv.setPose(Number(activeGroup));
        tdv.setFrame(Math.min(tdv.coords.frame, frameCount - 1));
        syncDirtyState();
    }

    function renderFrameRows(t) {
        const durations = ensureFrameDurations(t, draft.category);
        const $rows = $body.find("#anim-editor-frames").empty();
        for (let i = 0; i < Math.max(1, t.frames | 0); i++) {
            const d = durations[i];
            $rows.append(`
                <tr data-frame="${i}">
                    <td><button type="button" class="button animation-editor__frame-jump" data-frame="${i}">${i + 1}</button></td>
                    <td><input type="number" class="control control--numeric" data-frame-min="${i}"
                               min="0" max="${MAX_DURATION}" value="${d.minimum}"></td>
                    <td><input type="number" class="control control--numeric" data-frame-max="${i}"
                               min="0" max="${MAX_DURATION}" value="${d.maximum}"></td>
                </tr>
            `);
        }
    }

    function markDirty() {
        dirty = true;
        syncDirtyState();
    }

    function syncDirtyState() {
        $body.find("#anim-editor-save").prop("disabled", !dirty);
        $body.find("#anim-editor-revert").prop("disabled", !dirty);
        $body.find("#anim-editor-status").text(
            `${draft.category} ${draft.id} - ${dirty ? "modified" : "saved"}`
        );
    }

    function syncPreviewControls() {
        $body.find("#anim-editor-play").text(tdv.isPlaying ? "Pause" : "Play");
        const canvas = $body.find("#animation-editor-preview .tdv__canvas")[0];
        if (canvas) {
            canvas.style.width = `${canvas.width * 3}px`;
            canvas.style.height = `${canvas.height * 3}px`;
        }
    }

    $body.find("#anim-editor-group").on("change", function () {
        activeGroup = String($(this).val());
        refreshAll();
    });
    $body.find("#anim-editor-enabled").on("change", function () {
        const t = target();
        t.isAnimation = $(this).is(":checked") && (t.frames | 0) > 1;
        markDirty();
        tdv.setThing(draft, project.spr);
        if (activeGroup !== "root") tdv.setPose(Number(activeGroup));
    });
    $body.find("#anim-editor-mode").on("input", function () {
        target().animationMode = clampInt($(this).val(), 0, 1);
        markDirty();
    });
    $body.find("#anim-editor-loop").on("input", function () {
        target().loopCount = clampInt($(this).val(), -1, 9999);
        markDirty();
    });
    $body.find("#anim-editor-start").on("input", function () {
        const t = target();
        t.startFrame = clampInt($(this).val(), 0, Math.max(0, (t.frames | 0) - 1));
        markDirty();
    });
    $body.on("input", "[data-frame-min], [data-frame-max]", function () {
        const t = target();
        const frame = Number($(this).closest("tr").data("frame"));
        const min = $body.find(`[data-frame-min="${frame}"]`).val();
        const max = $body.find(`[data-frame-max="${frame}"]`).val();
        const d = setFrameDuration(t, frame, min, max, draft.category);
        $body.find(`[data-frame-min="${frame}"]`).val(d.minimum);
        $body.find(`[data-frame-max="${frame}"]`).val(d.maximum);
        markDirty();
    });
    $body.on("click", ".animation-editor__frame-jump", function () {
        tdv.setFrame(Number($(this).data("frame")));
    });
    $body.find("#anim-editor-prev").on("click", () => {
        const t = target();
        tdv.setFrame((tdv.coords.frame - 1 + t.frames) % Math.max(1, t.frames));
    });
    $body.find("#anim-editor-next").on("click", () => {
        const t = target();
        tdv.setFrame((tdv.coords.frame + 1) % Math.max(1, t.frames));
    });
    $body.find("#anim-editor-play").on("click", () => {
        if (tdv.isPlaying) tdv.stop();
        else tdv.play();
    });
    $body.find("#anim-editor-revert").on("click", () => {
        draft = original.clone();
        dirty = false;
        refreshAll();
    });
    $body.find("#anim-editor-save").on("click", () => {
        if (!dirty) return;
        mirrorDefaultFrameGroup(draft);
        const before = original.clone();
        const after = draft.clone();
        replaceThing(after.category, after);
        pushEdit("thing-edit", { category: after.category, id: after.id, before, after });
        original = after.clone();
        dirty = false;
        syncDirtyState();
    });

    refreshAll();

    await showModal({
        title: "Animation Editor",
        body: $body,
        buttons: [{ label: "Close", value: null, primary: true }],
    });
    tdv.stop();
}

export function ensureFrameDurations(target, category) {
    const frameCount = Math.max(1, target.frames | 0);
    const fallback = getDefaultDuration(category);
    const durations = Array.isArray(target.frameDurations)
        ? target.frameDurations.slice(0, frameCount)
        : [];

    for (let i = 0; i < frameCount; i++) {
        const existing = durations[i];
        durations[i] = existing instanceof FrameDuration
            ? existing
            : new FrameDuration(existing?.minimum ?? fallback, existing?.maximum ?? fallback);
    }
    target.frameDurations = durations;
    return durations;
}

export function setFrameDuration(target, index, minimum, maximum, category) {
    const durations = ensureFrameDurations(target, category);
    const i = clampInt(index, 0, durations.length - 1);
    const min = clampInt(minimum, 0, MAX_DURATION);
    const max = Math.max(min, clampInt(maximum, 0, MAX_DURATION));
    durations[i] = new FrameDuration(min, max);
    if ((target.frames | 0) > 1) target.isAnimation = true;
    return durations[i];
}

function getAnimationGroups(thing) {
    const groups = Array.isArray(thing.frameGroups)
        ? thing.frameGroups
            .map((group, index) => group ? { key: String(index), label: frameGroupLabel(index) } : null)
            .filter(Boolean)
        : [];
    if (groups.length) return groups;
    return [{ key: "root", label: "Object" }];
}

function getAnimationTarget(thing, key) {
    if (key !== "root" && Array.isArray(thing.frameGroups)) {
        const group = thing.frameGroups[Number(key)];
        if (group) return group;
    }
    return thing;
}

function firstAnimationGroupKey(thing) {
    return getAnimationGroups(thing)[0].key;
}

function frameGroupLabel(index) {
    if (index === 0) return "Default";
    if (index === 1) return "Walking";
    return `Group ${index}`;
}

function mirrorDefaultFrameGroup(thing) {
    const group = Array.isArray(thing.frameGroups) ? thing.frameGroups[0] : null;
    if (!group) return;
    thing.frames = group.frames;
    thing.isAnimation = group.isAnimation;
    thing.animationMode = group.animationMode;
    thing.loopCount = group.loopCount;
    thing.startFrame = group.startFrame;
    thing.frameDurations = group.frameDurations?.map((d) => d.clone()) ?? null;
}

function clampInt(value, min, max) {
    const n = Number(value);
    if (!Number.isFinite(n)) return min;
    return Math.min(max, Math.max(min, Math.trunc(n)));
}

function escapeHtml(value) {
    return String(value)
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;");
}
