// BinaryReader — little-endian wrapper around DataView with a moving cursor.
// AS3 reference: flash.utils.IDataInput / FileStream (with endian = LITTLE_ENDIAN).
//
// Backed by ArrayBuffer + DataView; never copies the underlying bytes.
// `readBytes(n)` returns a Uint8Array view that aliases the buffer — copy it
// if you need to keep it past the next read.

export class BinaryReader {
    constructor(source, byteOffset = 0, byteLength) {
        let buffer;
        let offset = byteOffset;
        let length;

        if (source instanceof ArrayBuffer) {
            buffer = source;
            length = byteLength ?? source.byteLength - byteOffset;
        } else if (ArrayBuffer.isView(source)) {
            buffer = source.buffer;
            offset = source.byteOffset + byteOffset;
            length = byteLength ?? source.byteLength - byteOffset;
        } else {
            throw new TypeError(
                "BinaryReader: source must be an ArrayBuffer or typed-array view"
            );
        }

        this._buffer = buffer;
        this._offset = offset;
        this._length = length;
        this._view = new DataView(buffer, offset, length);
        this._cursor = 0;
    }

    get length()         { return this._length; }
    get position()       { return this._cursor; }
    set position(value)  { this._setCursor(value); }
    get bytesAvailable() { return this._length - this._cursor; }
    get buffer()         { return this._buffer; }

    seek(position) {
        this._setCursor(position);
        return this;
    }

    skip(count) {
        this._setCursor(this._cursor + count);
        return this;
    }

    _setCursor(value) {
        if (value < 0 || value > this._length) {
            throw new RangeError(
                `BinaryReader: position ${value} out of range [0..${this._length}]`
            );
        }
        this._cursor = value;
    }

    _require(n) {
        if (this._cursor + n > this._length) {
            throw new RangeError(
                `BinaryReader: tried to read ${n} byte(s) past end ` +
                `(position=${this._cursor}, length=${this._length})`
            );
        }
    }

    readUint8() {
        this._require(1);
        return this._view.getUint8(this._cursor++);
    }

    readInt8() {
        this._require(1);
        return this._view.getInt8(this._cursor++);
    }

    readUint16() {
        this._require(2);
        const v = this._view.getUint16(this._cursor, /* littleEndian */ true);
        this._cursor += 2;
        return v;
    }

    readInt16() {
        this._require(2);
        const v = this._view.getInt16(this._cursor, true);
        this._cursor += 2;
        return v;
    }

    readUint32() {
        this._require(4);
        const v = this._view.getUint32(this._cursor, true);
        this._cursor += 4;
        return v;
    }

    readInt32() {
        this._require(4);
        const v = this._view.getInt32(this._cursor, true);
        this._cursor += 4;
        return v;
    }

    // Returns a Uint8Array VIEW (no copy) over the next `n` bytes.
    readBytes(n) {
        this._require(n);
        const view = new Uint8Array(this._buffer, this._offset + this._cursor, n);
        this._cursor += n;
        return view;
    }

    // Like readBytes but copies into a fresh Uint8Array.
    readBytesCopy(n) {
        return new Uint8Array(this.readBytes(n));
    }
}
