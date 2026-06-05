// Runtime LZMA adapter for OBD files. The app stays no-build/no-npm: this
// lazily loads one browser script only when OBD import/export is used.
//
// Source package: LZMA-JS 2.3.2, MIT, by Nathan Rugg.

const DEFAULT_LZMA_URL = "https://cdn.jsdelivr.net/npm/lzma@2.3.2/src/lzma_worker.js";

let loadPromise = null;

export async function getLzmaCodec({ scriptUrl = DEFAULT_LZMA_URL, mode = 6 } = {}) {
    if (typeof window === "undefined" || typeof document === "undefined") {
        throw new Error("LZMA codec is only available in the browser");
    }

    if (!window.LZMA_WORKER) {
        loadPromise ??= loadScript(scriptUrl);
        await loadPromise;
    }

    const api = window.LZMA_WORKER;
    if (!api?.compress || !api?.decompress) {
        throw new Error("LZMA script loaded, but window.LZMA_WORKER is not available");
    }

    return {
        compress(bytes) {
            return callLzma(api.compress.bind(api), [Array.from(toUint8(bytes)), mode]);
        },
        decompress(bytes) {
            return callLzma(api.decompress.bind(api), [Array.from(toUint8(bytes))]);
        },
    };
}

function loadScript(src) {
    return new Promise((resolve, reject) => {
        const existing = document.querySelector(`script[data-obd-lzma="true"][src="${src}"]`);
        if (existing) {
            existing.addEventListener("load", () => resolve(), { once: true });
            existing.addEventListener("error", () => reject(new Error(`Failed to load ${src}`)), { once: true });
            return;
        }

        const script = document.createElement("script");
        script.src = src;
        script.async = true;
        script.dataset.obdLzma = "true";
        script.onload = () => resolve();
        script.onerror = () => reject(new Error(`Failed to load ${src}`));
        document.head.appendChild(script);
    });
}

function callLzma(fn, args) {
    return new Promise((resolve, reject) => {
        fn(...args, (result, err) => {
            if (err) {
                reject(err instanceof Error ? err : new Error(String(err)));
                return;
            }
            resolve(toUint8(result));
        });
    });
}

function toUint8(value) {
    if (value instanceof Uint8Array) return value;
    if (value instanceof Uint8ClampedArray) {
        return new Uint8Array(value.buffer, value.byteOffset, value.byteLength);
    }
    if (ArrayBuffer.isView(value)) {
        return new Uint8Array(value.buffer, value.byteOffset, value.byteLength);
    }
    if (value instanceof ArrayBuffer) return new Uint8Array(value);
    if (Array.isArray(value)) return Uint8Array.from(value.map((b) => b & 0xFF));
    if (typeof value === "string") {
        const out = new Uint8Array(value.length);
        for (let i = 0; i < value.length; i++) out[i] = value.charCodeAt(i) & 0xFF;
        return out;
    }
    throw new TypeError("LZMA result is not byte-like");
}
