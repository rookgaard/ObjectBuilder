// Tests for BinaryReader / BinaryWriter round-trips.

import { describe, it, assert, assertEqual, assertBytesEqual, assertThrows } from "../runner.js";
import { BinaryReader } from "../../src/core/binary/BinaryReader.js";
import { BinaryWriter } from "../../src/core/binary/BinaryWriter.js";

describe("BinaryWriter — basic writes", () => {
    it("writes u8 little-endian", () => {
        const w = new BinaryWriter();
        w.writeUint8(0x12);
        assertBytesEqual(w.toUint8Array(), [0x12]);
    });

    it("writes u16 little-endian", () => {
        const w = new BinaryWriter();
        w.writeUint16(0x1234);
        assertBytesEqual(w.toUint8Array(), [0x34, 0x12]);
    });

    it("writes u32 little-endian", () => {
        const w = new BinaryWriter();
        w.writeUint32(0x12345678);
        assertBytesEqual(w.toUint8Array(), [0x78, 0x56, 0x34, 0x12]);
    });

    it("writes signed integers correctly", () => {
        const w = new BinaryWriter();
        w.writeInt8(-1);
        w.writeInt16(-2);
        w.writeInt32(-3);
        assertBytesEqual(w.toUint8Array(), [
            0xFF,             // -1 as i8
            0xFE, 0xFF,       // -2 as i16 LE
            0xFD, 0xFF, 0xFF, 0xFF, // -3 as i32 LE
        ]);
    });

    it("grows past the initial capacity", () => {
        const w = new BinaryWriter(4);
        for (let i = 0; i < 100; i++) w.writeUint8(i);
        assertEqual(w.length, 100);
        const bytes = w.toUint8Array();
        for (let i = 0; i < 100; i++) assertEqual(bytes[i], i, `byte ${i}`);
    });

    it("supports seek + overwrite (offset-table pattern)", () => {
        const w = new BinaryWriter();
        w.writeUint32(0); // placeholder
        w.writeUint8(0xAA);
        w.writeUint8(0xBB);

        const here = w.position;
        w.position = 0;
        w.writeUint32(0xCAFEBABE);
        w.position = here;

        assertBytesEqual(w.toUint8Array(), [0xBE, 0xBA, 0xFE, 0xCA, 0xAA, 0xBB]);
    });
});

describe("BinaryReader — basic reads", () => {
    it("reads back exactly what BinaryWriter wrote", () => {
        const w = new BinaryWriter();
        w.writeUint8(0x12);
        w.writeInt8(-12);
        w.writeUint16(0xCAFE);
        w.writeInt16(-12345);
        w.writeUint32(0xDEADBEEF);
        w.writeInt32(-2_000_000_000);

        const r = new BinaryReader(w.toUint8Array());
        assertEqual(r.readUint8(),  0x12);
        assertEqual(r.readInt8(),   -12);
        assertEqual(r.readUint16(), 0xCAFE);
        assertEqual(r.readInt16(),  -12345);
        assertEqual(r.readUint32(), 0xDEADBEEF);
        assertEqual(r.readInt32(),  -2_000_000_000);
        assertEqual(r.bytesAvailable, 0, "fully consumed");
    });

    it("seek + position + skip behave", () => {
        const r = new BinaryReader(new Uint8Array([10, 20, 30, 40, 50, 60]).buffer);
        r.skip(2);
        assertEqual(r.position, 2);
        assertEqual(r.readUint8(), 30);
        r.seek(5);
        assertEqual(r.readUint8(), 60);
        assertEqual(r.bytesAvailable, 0);
    });

    it("readBytes returns a view that aliases the buffer", () => {
        const src = new Uint8Array([1, 2, 3, 4, 5]);
        const r = new BinaryReader(src);
        const slice = r.readBytes(3);
        assertEqual(slice.length, 3);
        assertEqual(slice[0], 1);
        assertEqual(slice[2], 3);
        // Mutating the source mutates the view → confirms zero-copy.
        src[0] = 99;
        assertEqual(slice[0], 99, "view aliases source buffer");
    });

    it("throws when reading past end", () => {
        const r = new BinaryReader(new Uint8Array(2));
        r.readUint16();
        assertThrows(() => r.readUint8(), "read past end");
    });
});

describe("BinaryReader — accepts both ArrayBuffer and typed-array views", () => {
    it("ArrayBuffer source", () => {
        const buf = new Uint8Array([7]).buffer;
        const r = new BinaryReader(buf);
        assertEqual(r.readUint8(), 7);
    });

    it("Uint8Array view source (respects byteOffset)", () => {
        const big = new Uint8Array([0, 0, 0, 42, 99]);
        const view = big.subarray(3); // starts at index 3 in the underlying buffer
        const r = new BinaryReader(view);
        assertEqual(r.readUint8(), 42);
        assertEqual(r.readUint8(), 99);
    });
});
