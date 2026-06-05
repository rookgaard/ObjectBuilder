// Browser test runner — minimal describe/it/assert that paints PASS/FAIL into
// the page. Kept dependency-free on purpose; jQuery is around but optional.

const SUITES = [];
let currentSuite = null;

export function describe(name, fn) {
    const suite = { name, tests: [] };
    SUITES.push(suite);
    currentSuite = suite;
    try {
        fn();
    } finally {
        currentSuite = null;
    }
}

export function it(name, fn) {
    if (!currentSuite) {
        throw new Error(`it("${name}", …) called outside of a describe() block`);
    }
    currentSuite.tests.push({ name, fn });
}

export class AssertionError extends Error {
    constructor(message) {
        super(message);
        this.name = "AssertionError";
    }
}

export function assert(cond, message) {
    if (!cond) {
        throw new AssertionError(message ?? "assertion failed");
    }
}

export function assertEqual(actual, expected, message) {
    if (actual !== expected) {
        throw new AssertionError(
            `${message ?? "assertEqual"} — expected ${format(expected)}, got ${format(actual)}`
        );
    }
}

export function assertBytesEqual(actual, expected, message) {
    const a = toBytes(actual);
    const b = toBytes(expected);
    if (a.length !== b.length) {
        throw new AssertionError(
            `${message ?? "assertBytesEqual"} — length mismatch ${a.length} vs ${b.length}`
        );
    }
    for (let i = 0; i < a.length; i++) {
        if (a[i] !== b[i]) {
            throw new AssertionError(
                `${message ?? "assertBytesEqual"} — byte ${i}: ` +
                `0x${a[i].toString(16).padStart(2, "0")} vs 0x${b[i].toString(16).padStart(2, "0")}`
            );
        }
    }
}

export function assertThrows(fn, message) {
    try {
        fn();
    } catch (e) {
        return e;
    }
    throw new AssertionError(`${message ?? "assertThrows"} — expected an exception`);
}

function toBytes(v) {
    if (v instanceof Uint8Array) return v;
    if (v instanceof Uint8ClampedArray) return new Uint8Array(v.buffer, v.byteOffset, v.byteLength);
    if (Array.isArray(v)) return Uint8Array.from(v);
    throw new TypeError("assertBytesEqual: not a byte source");
}

function format(v) {
    if (typeof v === "string") return JSON.stringify(v);
    if (v === null || v === undefined) return String(v);
    return String(v);
}

export async function run({ outputSelector = "#test-output" } = {}) {
    const $ = window.jQuery;
    const $out = $(outputSelector);

    let totalPass = 0;
    let totalFail = 0;
    const failures = [];

    for (const suite of SUITES) {
        const $suite = $(`<section class="test-suite"><h2>${escapeHtml(suite.name)}</h2><ol class="test-list"></ol></section>`)
            .appendTo($out);
        const $list = $suite.find(".test-list");

        for (const t of suite.tests) {
            try {
                await t.fn();
                $list.append(
                    `<li class="test test-pass"><span class="test__mark">✓</span> ${escapeHtml(t.name)}</li>`
                );
                totalPass++;
            } catch (err) {
                const stack = (err && err.message) ? err.message : String(err);
                $list.append(
                    `<li class="test test-fail"><span class="test__mark">✗</span> ` +
                    `${escapeHtml(t.name)}<pre class="test__error">${escapeHtml(stack)}</pre></li>`
                );
                totalFail++;
                failures.push({ suite: suite.name, test: t.name, err });
                console.error(`[TEST FAIL] ${suite.name} — ${t.name}`, err);
            }
        }
    }

    const summary = `${totalPass} passed, ${totalFail} failed`;
    $out.prepend(
        `<div class="test-summary ${totalFail === 0 ? "is-pass" : "is-fail"}">${summary}</div>`
    );
    document.title = `${totalFail === 0 ? "✓" : "✗"} ${summary} — ObjectBuilder-JS tests`;

    return { pass: totalPass, fail: totalFail, failures };
}

function escapeHtml(s) {
    return String(s)
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;");
}
