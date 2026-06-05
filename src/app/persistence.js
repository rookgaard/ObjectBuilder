// Tiny localStorage helper. Persists UI preferences (panel widths, last
// selected category) across page reloads. Wrapped in try/catch because
// localStorage can throw in private-browsing modes.

const KEY = "objectbuilder-js:settings:v1";

const DEFAULTS = {
    panelWidths: {                  // px
        "panel-preview": 200,
        "panel-things":  220,
        "panel-sprites": 220,
    },
    selectedCategory: "item",
    selectedVersion:  "7.72",
};

let cache = null;

function load() {
    if (cache) return cache;
    try {
        const raw = localStorage.getItem(KEY);
        cache = raw ? { ...DEFAULTS, ...JSON.parse(raw) } : { ...DEFAULTS };
    } catch {
        cache = { ...DEFAULTS };
    }
    cache.panelWidths = { ...DEFAULTS.panelWidths, ...(cache.panelWidths || {}) };
    return cache;
}

function save() {
    try {
        localStorage.setItem(KEY, JSON.stringify(cache));
    } catch {
        // Ignore — quota or private mode.
    }
}

export function get(key) {
    return load()[key];
}

export function set(key, value) {
    load();
    cache[key] = value;
    save();
}

export function getPanelWidth(id) {
    return load().panelWidths[id];
}

export function setPanelWidth(id, px) {
    load();
    cache.panelWidths[id] = px;
    save();
}
