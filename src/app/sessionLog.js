// In-memory session log for the browser app. Captures console info/warn/error
// and lets UI commands add explicit status entries.

const LIMIT = 250;
const entries = [];
let installed = false;
let nextId = 1;

export function installConsoleLogCapture() {
    if (installed || typeof console === "undefined") return;
    installed = true;

    for (const level of ["info", "warn", "error"]) {
        const original = console[level]?.bind(console);
        if (!original) continue;
        console[level] = (...args) => {
            appendLog(level, args.map(formatValue).join(" "));
            original(...args);
        };
    }
}

export function appendLog(level, message) {
    entries.push({
        id: nextId++,
        level,
        message: String(message ?? ""),
        time: new Date(),
    });
    if (entries.length > LIMIT) entries.splice(0, entries.length - LIMIT);
}

export function getLogEntries() {
    return entries.slice();
}

function formatValue(value) {
    if (value instanceof Error) return value.stack || value.message;
    if (typeof value === "string") return value;
    try {
        return JSON.stringify(value);
    } catch (_err) {
        return String(value);
    }
}
