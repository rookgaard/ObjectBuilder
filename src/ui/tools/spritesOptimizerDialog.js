// Sprites Optimizer. AS3 reference: ob.components.SpritesOptimizerWindow.

import {
    applySpriteOptimization,
    buildSpriteOptimizationPlan,
} from "../../app/spritesOptimizer.js";
import { getState, markProjectDirty } from "../../store/index.js";
import { showModal } from "../widgets/modal.js";

const $ = window.jQuery;

export async function showSpritesOptimizerDialog() {
    if (!getState().project) {
        await showModal({
            title: "Sprites Optimizer",
            body: $("<p>No project is loaded. Use File -> Open first.</p>"),
            buttons: [{ label: "OK", value: null, primary: true }],
        });
        return;
    }

    let plan = null;
    let optionsKey = "";
    const $body = $(`
        <div class="sprites-optimizer">
            <section class="sprites-optimizer__options">
                <label class="form-field form-field--inline">
                    <input type="checkbox" id="sprites-opt-dedupe" checked>
                    <span class="form-field__label">Deduplicate identical sprites</span>
                </label>
                <label class="form-field form-field--inline">
                    <input type="checkbox" id="sprites-opt-unused" checked>
                    <span class="form-field__label">Remove unused sprites</span>
                </label>
                <label class="form-field form-field--inline">
                    <input type="checkbox" id="sprites-opt-empty" checked>
                    <span class="form-field__label">Remove empty sprites</span>
                </label>
            </section>
            <section class="sprites-optimizer__result">
                <dl class="sprites-optimizer__stats" id="sprites-opt-stats">
                    <dt>Old sprite count</dt><dd>0</dd>
                    <dt>New sprite count</dt><dd>0</dd>
                    <dt>Removed sprites</dt><dd>0</dd>
                    <dt>Duplicate sprites</dt><dd>0</dd>
                    <dt>Unused sprites</dt><dd>0</dd>
                    <dt>Empty sprites</dt><dd>0</dd>
                </dl>
                <div class="sprites-optimizer__status" id="sprites-opt-status">Analyze before optimizing.</div>
            </section>
            <section class="sprites-optimizer__actions">
                <button type="button" class="button" id="sprites-opt-analyze">Analyze</button>
                <button type="button" class="button button--primary" id="sprites-opt-run" disabled>Optimize</button>
            </section>
        </div>
    `);

    function readOptions() {
        return {
            deduplicate: $body.find("#sprites-opt-dedupe").is(":checked"),
            removeUnused: $body.find("#sprites-opt-unused").is(":checked"),
            removeEmpty: $body.find("#sprites-opt-empty").is(":checked"),
        };
    }

    function invalidatePlan() {
        plan = null;
        optionsKey = "";
        $body.find("#sprites-opt-run").prop("disabled", true);
        setStatus("Analyze before optimizing.");
    }

    function setStatus(message) {
        $body.find("#sprites-opt-status").text(message);
    }

    function renderPlan(nextPlan, elapsedMs = null) {
        const stats = [
            ["Old sprite count", nextPlan.oldCount],
            ["New sprite count", nextPlan.newCount],
            ["Removed sprites", nextPlan.removedCount],
            ["Duplicate sprites", nextPlan.duplicateCount],
            ["Unused sprites", nextPlan.unusedCount],
            ["Empty sprites", nextPlan.emptyCount],
        ];
        const $stats = $body.find("#sprites-opt-stats").empty();
        for (const [label, value] of stats) {
            $stats.append(`<dt>${label}</dt><dd>${value}</dd>`);
        }
        const suffix = elapsedMs == null ? "" : ` (${elapsedMs.toFixed(0)} ms)`;
        setStatus(nextPlan.removedCount > 0
            ? `Ready to remove ${nextPlan.removedCount} sprite${nextPlan.removedCount === 1 ? "" : "s"}.${suffix}`
            : `Nothing to optimize.${suffix}`);
        $body.find("#sprites-opt-run").prop("disabled", nextPlan.removedCount <= 0);
    }

    function analyze() {
        const project = getState().project;
        const options = readOptions();
        const key = JSON.stringify(options);
        setStatus("Analyzing sprites...");
        const start = performance.now();
        plan = buildSpriteOptimizationPlan(project, options);
        optionsKey = key;
        renderPlan(plan, performance.now() - start);
    }

    $body.find("#sprites-opt-analyze").on("click", analyze);
    $body.find("#sprites-opt-run").on("click", () => {
        const project = getState().project;
        const key = JSON.stringify(readOptions());
        if (!plan || key !== optionsKey) analyze();
        if (!plan || plan.removedCount <= 0) return;
        const start = performance.now();
        applySpriteOptimization(project, plan);
        markProjectDirty();
        renderPlan(plan, performance.now() - start);
        $body.find("#sprites-opt-run").prop("disabled", true);
        setStatus(`Optimized: ${plan.oldCount} -> ${plan.newCount} sprites.`);
    });
    $body.find("input[type=checkbox]").on("change", invalidatePlan);

    await showModal({
        title: "Sprites Optimizer",
        body: $body,
        buttons: [{ label: "Close", value: null, primary: true }],
    });
}
