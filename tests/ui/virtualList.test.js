// Pure-function tests for the virtual-list window math. No DOM required.

import { describe, it, assertEqual } from "../runner.js";
import { computeVisibleRange, scrollOffsetFor } from "../../src/ui/widgets/virtualList.js";

describe("virtualList — computeVisibleRange", () => {
    it("returns empty range for empty data", () => {
        const r = computeVisibleRange({ scrollTop: 0, viewportHeight: 400, rowHeight: 20, total: 0 });
        assertEqual(r.first, 0);
        assertEqual(r.last, -1);
    });

    it("first viewport with no scroll", () => {
        const r = computeVisibleRange({ scrollTop: 0, viewportHeight: 400, rowHeight: 20, total: 1000, buffer: 0 });
        assertEqual(r.first, 0);
        assertEqual(r.last, 20, "400/20 = 20 rows visible (indices 0..20 inclusive, edge-rounded)");
    });

    it("middle viewport with buffer", () => {
        const r = computeVisibleRange({ scrollTop: 1000, viewportHeight: 400, rowHeight: 20, total: 1000, buffer: 5 });
        // visible: rows 50..70, plus 5 buffer = 45..75
        assertEqual(r.first, 45);
        assertEqual(r.last, 75);
    });

    it("clamps to last index", () => {
        const r = computeVisibleRange({ scrollTop: 100_000, viewportHeight: 400, rowHeight: 20, total: 50 });
        assertEqual(r.last, 49, "never past total-1");
    });
});

describe("virtualList — scrollOffsetFor", () => {
    it("returns currentScrollTop when row is already visible", () => {
        const off = scrollOffsetFor({ index: 10, currentScrollTop: 100, viewportHeight: 400, rowHeight: 20 });
        // row 10 spans [200..220], view [100..500] — visible → no change
        assertEqual(off, 100);
    });

    it("scrolls up to bring row into view (above)", () => {
        const off = scrollOffsetFor({ index: 5, currentScrollTop: 200, viewportHeight: 100, rowHeight: 20 });
        // row 5 spans [100..120], view [200..300] — above; nearest scroll = top of row = 100
        assertEqual(off, 100);
    });

    it("scrolls down to bring row into view (below)", () => {
        const off = scrollOffsetFor({ index: 30, currentScrollTop: 0, viewportHeight: 100, rowHeight: 20 });
        // row 30 spans [600..620], view [0..100] — below; nearest scroll = bottom-view = 620-100 = 520
        assertEqual(off, 520);
    });

    it("center mode places row in the middle", () => {
        const off = scrollOffsetFor({ index: 100, currentScrollTop: 0, viewportHeight: 100, rowHeight: 20, mode: "center" });
        // row 100 top = 2000; centered = 2000 - 100/2 + 20/2 = 2000 - 50 + 10 = 1960
        assertEqual(off, 1960);
    });
});
