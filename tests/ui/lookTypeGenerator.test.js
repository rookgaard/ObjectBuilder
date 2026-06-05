import { describe, it, assertEqual, assert } from "../runner.js";
import {
    hsiToRgb,
    normalizeLookType,
    parseLookXml,
    serializeLookType,
} from "../../src/ui/tools/lookTypeGeneratorDialog.js";

describe("look type generator", () => {
    it("serializes outfit looks and omits zero attributes", () => {
        const xml = serializeLookType({
            outfit: 128,
            head: 78,
            body: 69,
            legs: 58,
            feet: 76,
            addons: 3,
            mount: 0,
            corpse: 3058,
        });
        assertEqual(xml, '<look type="128" head="78" body="69" legs="58" feet="76" addons="3" corpse="3058"/>');
    });

    it("serializes item looks as typeex", () => {
        const xml = serializeLookType({ item: 3031, count: 100 });
        assertEqual(xml, '<look typeex="3031"/>');
    });

    it("returns an empty string when no type is set", () => {
        assertEqual(serializeLookType({ head: 10 }), "");
    });

    it("parses look XML back to a normalized state", () => {
        const look = parseLookXml('<look typeex="3031" head="10" body="20" addons="2" mount="368"/>');
        assertEqual(look.item, 3031);
        assertEqual(look.outfit, 0);
        assertEqual(look.head, 10);
        assertEqual(look.body, 20);
        assertEqual(look.addons, 2);
        assertEqual(look.mount, 368);
    });

    it("normalizes ranges and prefers outfit over item", () => {
        const look = normalizeLookType({ outfit: 100, item: 200, head: 999, addons: 9 });
        assertEqual(look.outfit, 100);
        assertEqual(look.item, 0);
        assertEqual(look.head, 132);
        assertEqual(look.addons, 3);
    });

    it("uses the AS3 HSI palette formula", () => {
        assertEqual(hsiToRgb(0), 0xFFFFFF);
        assertEqual(hsiToRgb(19), 0xDADADA);
        assert(hsiToRgb(1) !== hsiToRgb(2), "adjacent hue swatches differ");
    });
});
