import { describe, it, assert, assertEqual, assertBytesEqual } from "../runner.js";
import {
    decodeObd,
    decodeObdPayloadV2,
    decodeObdPayloadV3,
    encodeObdPayloadV2,
    encodeObdPayloadV3,
    encodeObdV2,
    encodeObd,
} from "../../src/formats/obd/ObdCodec.js";
import { OBD_VERSION_2, OBD_VERSION_3 } from "../../src/formats/obd/ObdFlags.js";
import { BinaryReader } from "../../src/core/binary/BinaryReader.js";
import { FrameDuration } from "../../src/core/animation/FrameDuration.js";
import { FrameGroup } from "../../src/core/animation/FrameGroup.js";
import { DEFAULT as GROUP_DEFAULT, WALKING as GROUP_WALKING } from "../../src/core/animation/FrameGroupType.js";
import { SPRITE_BYTES } from "../../src/core/sprites/spriteRle.js";
import { ThingType } from "../../src/core/things/ThingType.js";
import { ITEM, OUTFIT } from "../../src/core/things/ThingCategory.js";

function pixels(seed) {
    const out = new Uint8Array(SPRITE_BYTES);
    for (let i = 0; i < out.length; i += 4) {
        out[i] = 255;
        out[i + 1] = (seed + i) & 0xFF;
        out[i + 2] = (seed + i * 3) & 0xFF;
        out[i + 3] = (seed + i * 7) & 0xFF;
    }
    return out;
}

function makeThing() {
    const thing = new ThingType();
    thing.id = 100;
    thing.category = ITEM;
    thing.width = 2;
    thing.height = 1;
    thing.exactSize = 48;
    thing.layers = 1;
    thing.patternX = 1;
    thing.patternY = 1;
    thing.patternZ = 1;
    thing.frames = 2;
    thing.isAnimation = true;
    thing.animationMode = 1;
    thing.loopCount = -1;
    thing.startFrame = 1;
    thing.frameDurations = [new FrameDuration(100, 150), new FrameDuration(200, 250)];
    thing.spriteIndex = [11, 12, 13, 14];

    thing.isGround = true;
    thing.groundSpeed = 220;
    thing.stackable = true;
    thing.forceUse = true;
    thing.writable = true;
    thing.maxReadWriteChars = 64;
    thing.blockPathfind = true;
    thing.hasLight = true;
    thing.lightLevel = 7;
    thing.lightColor = 215;
    thing.hasOffset = true;
    thing.offsetX = 8;
    thing.offsetY = 12;
    thing.isMarketItem = true;
    thing.marketCategory = 2;
    thing.marketTradeAs = 3031;
    thing.marketShowAs = 3031;
    thing.marketName = "Gold Coin";
    thing.marketRestrictProfession = 0;
    thing.marketRestrictLevel = 0;
    thing.hasCharges = true;
    thing.floorChange = true;
    thing.usable = true;
    return thing;
}

function makeData() {
    const thing = makeThing();
    return {
        clientVersion: 772,
        thing,
        sprites: thing.spriteIndex.map((id, i) => ({ id, pixels: pixels(i + 1) })),
    };
}

const identityCodec = {
    async compress(bytes) { return new Uint8Array(bytes); },
    async decompress(bytes) { return new Uint8Array(bytes); },
};

describe("OBD 2.0 codec", () => {
    it("encodes the AS3 V2 header and backpatches the texture block position", () => {
        const payload = encodeObdPayloadV2(makeData());
        const reader = new BinaryReader(payload);

        assertEqual(reader.readUint16(), OBD_VERSION_2, "OBD version");
        assertEqual(reader.readUint16(), 772, "client version");
        assertEqual(reader.readUint8(), 1, "item category");
        const texturePosition = reader.readUint32();

        // First bytes at the texture position are width/height.
        reader.position = texturePosition;
        assertEqual(reader.readUint8(), 2, "texture width");
        assertEqual(reader.readUint8(), 1, "texture height");
    });

    it("round-trips properties, animation and raw ARGB sprites", () => {
        const data = makeData();
        const payload = encodeObdPayloadV2(data);
        const decoded = decodeObdPayloadV2(payload);
        const thing = decoded.thing;

        assertEqual(decoded.obdVersion, OBD_VERSION_2);
        assertEqual(decoded.clientVersion, 772);
        assertEqual(thing.category, ITEM);
        assertEqual(thing.width, 2);
        assertEqual(thing.height, 1);
        assertEqual(thing.exactSize, 48);
        assertEqual(thing.frames, 2);
        assertEqual(thing.isAnimation, true);
        assertEqual(thing.animationMode, 1);
        assertEqual(thing.loopCount, -1);
        assertEqual(thing.startFrame, 1);
        assertEqual(thing.frameDurations[0].minimum, 100);
        assertEqual(thing.frameDurations[1].maximum, 250);

        assertEqual(thing.isGround, true);
        assertEqual(thing.groundSpeed, 220);
        assertEqual(thing.stackable, true);
        assertEqual(thing.forceUse, true);
        assertEqual(thing.writable, true);
        assertEqual(thing.maxReadWriteChars, 64);
        assertEqual(thing.blockPathfind, true);
        assertEqual(thing.hasLight, true);
        assertEqual(thing.lightColor, 215);
        assertEqual(thing.hasOffset, true);
        assertEqual(thing.offsetY, 12);
        assertEqual(thing.isMarketItem, true);
        assertEqual(thing.marketName, "Gold Coin");
        assertEqual(thing.hasCharges, true);
        assertEqual(thing.floorChange, true);
        assertEqual(thing.usable, true);

        assertEqual(decoded.sprites.length, data.sprites.length);
        for (let i = 0; i < data.sprites.length; i++) {
            assertEqual(decoded.sprites[i].id, data.sprites[i].id);
            assertBytesEqual(decoded.sprites[i].pixels, data.sprites[i].pixels);
        }
    });

    it("supports injected compression adapters for full-file encode/decode", async () => {
        const data = makeData();
        const fileBytes = await encodeObdV2(data, identityCodec);
        const decoded = await decodeObd(fileBytes, identityCodec);

        assert(decoded.thing instanceof ThingType, "decoded thing is a ThingType");
        assertEqual(decoded.thing.category, ITEM);
        assertEqual(decoded.sprites[3].id, 14);
        assertBytesEqual(decoded.sprites[3].pixels, data.sprites[3].pixels);
    });
});

describe("OBD 3.0 codec", () => {
    function makeOutfitWithGroups() {
        const t = new ThingType();
        t.id = 128;
        t.category = OUTFIT;

        const def = new FrameGroup();
        def.type = GROUP_DEFAULT;
        def.layers = 2;
        def.patternX = 4;
        def.frames = 1;
        def.spriteIndex = [];
        for (let i = 0; i < def.getTotalSprites(); i++) def.spriteIndex.push(100 + i);

        const walk = new FrameGroup();
        walk.type = GROUP_WALKING;
        walk.layers = 2;
        walk.patternX = 4;
        walk.frames = 3;
        walk.isAnimation = true;
        walk.frameDurations = [
            new FrameDuration(200, 200),
            new FrameDuration(200, 200),
            new FrameDuration(200, 200),
        ];
        walk.spriteIndex = [];
        for (let i = 0; i < walk.getTotalSprites(); i++) walk.spriteIndex.push(500 + i);

        t.frameGroups = [];
        t.frameGroups[GROUP_DEFAULT] = def;
        t.frameGroups[GROUP_WALKING] = walk;
        return { thing: t, def, walk };
    }

    function makeGroupPixels(group, count) {
        const out = [];
        for (let i = 0; i < count; i++) {
            const p = new Uint8Array(SPRITE_BYTES);
            for (let j = 0; j < p.length; j++) p[j] = (group * 0x40 + i + j) & 0xFF;
            out.push({ id: (group === 0 ? 100 : 500) + i, pixels: p });
        }
        return out;
    }

    it("round-trips a 2-group outfit through V3", () => {
        const { thing, def, walk } = makeOutfitWithGroups();
        const sprites = {
            [GROUP_DEFAULT]: makeGroupPixels(0, def.getTotalSprites()),
            [GROUP_WALKING]: makeGroupPixels(1, walk.getTotalSprites()),
        };

        const payload = encodeObdPayloadV3({ clientVersion: 1098, thing, sprites });

        const reader = new BinaryReader(payload);
        assertEqual(reader.readUint16(), OBD_VERSION_3, "OBD version");
        assertEqual(reader.readUint16(), 1098, "client version");
        assertEqual(reader.readUint8(), 2, "outfit category");

        const decoded = decodeObdPayloadV3(payload);
        assertEqual(decoded.obdVersion, OBD_VERSION_3);
        assertEqual(decoded.thing.category, OUTFIT);
        assertEqual(decoded.thing.frameGroups.length, 2);
        assertEqual(decoded.thing.frameGroups[GROUP_WALKING].frames, 3);
        assertEqual(decoded.thing.frameGroups[GROUP_WALKING].isAnimation, true);
        assertBytesEqual(
            decoded.sprites[GROUP_WALKING][0].pixels,
            sprites[GROUP_WALKING][0].pixels,
        );
    });

    it("encodeObd auto-picks V3 for outfits with multiple frame groups", async () => {
        const { thing, def, walk } = makeOutfitWithGroups();
        const sprites = {
            [GROUP_DEFAULT]: makeGroupPixels(0, def.getTotalSprites()),
            [GROUP_WALKING]: makeGroupPixels(1, walk.getTotalSprites()),
        };
        const bytes = await encodeObd({ clientVersion: 1098, thing, sprites }, identityCodec);
        // Identity codec returns the raw payload — read its first u16.
        const head = new BinaryReader(bytes);
        assertEqual(head.readUint16(), OBD_VERSION_3, "uses V3");

        const decoded = await decodeObd(bytes, identityCodec);
        assertEqual(decoded.obdVersion, OBD_VERSION_3);
        assertEqual(decoded.thing.frameGroups.length, 2);
    });

    it("encodeObd falls back to V2 for items / single-group things", async () => {
        const data = makeData();
        const bytes = await encodeObd(data, identityCodec);
        const head = new BinaryReader(bytes);
        assertEqual(head.readUint16(), OBD_VERSION_2, "items still use V2");
    });
});
