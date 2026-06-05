// BinaryWriter — little-endian, backed by a Uint8Array that doubles when full.
// Mirrors the BinaryReader surface. Call `.toUint8Array()` to get the final
// bytes (a fresh slice trimmed to the written length).

const DEFAULT_CAPACITY = 256;

export class BinaryWriter {
    constructor(initialCapacity = DEFAULT_CAPACITY) {
        this._bytes = new Uint8Array(Math.max(8, initialCapacity));
        this._view  = new DataView(this._bytes.buffer);
        this._cursor = 0;
        this._length = 0; // highest written offset; supports out-of-order writes
    }

    get position()      { return this._cursor; }
    set position(value) { this._setCursor(value); }
    get length()        { return this._length; }
    get capacity()      { return this._bytes.length; }

    _setCursor(value) {
        if (value < 0) {
            throw new RangeError(`BinaryWriter: negative position ${value}`);
        }
        // Out-of-order writes are allowed (mirrors AS3's seek + writeShort
        // patch pattern used by SpriteStorage.compile).
        this._grow(value);
        this._cursor = value;
    }

    _grow(targetLength) {
        if (targetLength <= this._bytes.length) return;
        let cap = this._bytes.length;
        while (cap < targetLength) cap *= 2;
        const next = new Uint8Array(cap);
        next.set(this._bytes);
        this._bytes = next;
        this._view  = new DataView(this._bytes.buffer);
    }

    _bumpLength(after) {
        if (after > this._length) this._length = after;
    }

    _write(n, fn) {
        const at = this._cursor;
        this._grow(at + n);
        fn(at);
        this._cursor = at + n;
        this._bumpLength(this._cursor);
    }

    writeUint8(v) { this._write(1, (at) => this._view.setUint8(at, v & 0xFF)); }
    writeInt8(v)  { this._write(1, (at) => this._view.setInt8(at, v)); }

    writeUint16(v) {
        this._write(2, (at) => this._view.setUint16(at, v & 0xFFFF, /* le */ true));
    }
    writeInt16(v) {
        this._write(2, (at) => this._view.setInt16(at, v, true));
    }
    writeUint32(v) {
        this._write(4, (at) => this._view.setUint32(at, v >>> 0, true));
    }
    writeInt32(v) {
        this._write(4, (at) => this._view.setInt32(at, v | 0, true));
    }

    writeBytes(source, offset = 0, length) {
        const src = source instanceof Uint8Array
            ? source
            : new Uint8Array(source.buffer ?? source, source.byteOffset ?? 0, source.byteLength ?? source.length);
        const len = length ?? src.length - offset;
        this._write(len, (at) => this._bytes.set(src.subarray(offset, offset + len), at));
    }

    // Returns a fresh Uint8Array trimmed to the logical length.
    toUint8Array() {
        return this._bytes.slice(0, this._length);
    }

    // Returns the underlying buffer (length == capacity, NOT trimmed). Useful
    // when you want zero-copy into a Blob with explicit length.
    rawBuffer() {
        return this._bytes;
    }
}
