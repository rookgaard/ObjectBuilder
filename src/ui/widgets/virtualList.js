// Fixed-row-height virtual scroller. Renders only the visible window + buffer
// even when the dataset has tens of thousands of rows.
//
// Markup it builds inside the host:
//
//   <div class="vlist">              ← scroll container (the host element)
//     <div class="vlist__spacer">    ← height = total * rowHeight
//       <ul class="vlist__rows">     ← absolutely positioned via translateY
//         <li …>…</li> × visible
//       </ul>
//     </div>
//   </div>
//
// API:
//   const list = createVirtualList($host, { rowHeight, renderRow, getKey });
//   list.setData(totalCount, selectedIndex?);
//   list.setSelectedIndex(i);
//   list.scrollToIndex(i, "nearest" | "center");
//   list.onSelect(handler);   // handler(index, eventOrigin)
//   list.refreshVisible();    // re-render currently visible rows (after data mutation)

/**
 * @typedef VirtualListOpts
 * @property {number}    rowHeight                pixel height of one row, must be uniform.
 * @property {number}    [buffer=6]               rows rendered outside viewport on each side.
 * @property {(index:number)=>string} renderRow   returns HTML for the row at `index`.
 * @property {(index:number)=>string} [getKey]    stable key for reuse logic; defaults to index.
 */

/**
 * @param {JQuery}          $host
 * @param {VirtualListOpts} opts
 */
export function createVirtualList($host, opts) {
    // jQuery is grabbed lazily so the pure helpers below remain importable from
    // Node (or any other window-less context) for unit tests.
    const $ = window.jQuery;
    const rowHeight = opts.rowHeight;
    const buffer    = opts.buffer ?? 6;
    const renderRow = opts.renderRow;

    $host.addClass("vlist").empty().append(`
        <div class="vlist__spacer">
            <ul class="vlist__rows" role="listbox"></ul>
        </div>
    `);

    const $spacer = $host.find(".vlist__spacer");
    const $rows   = $host.find(".vlist__rows");

    let total = 0;
    let selectedIndex = -1;
    const handlers = [];

    function setData(newTotal, newSelected = -1) {
        total = newTotal;
        selectedIndex = newSelected;
        $spacer.css("height", (total * rowHeight) + "px");
        render();
    }

    function setSelectedIndex(i) {
        if (i === selectedIndex) return;
        selectedIndex = i;
        render();
    }

    function scrollToIndex(i, mode = "nearest") {
        const top = i * rowHeight;
        const bottom = top + rowHeight;
        const viewTop = $host.scrollTop();
        const viewH   = $host[0].clientHeight;
        const viewBottom = viewTop + viewH;

        if (mode === "center") {
            $host.scrollTop(Math.max(0, top - viewH / 2 + rowHeight / 2));
        } else if (top < viewTop) {
            $host.scrollTop(top);
        } else if (bottom > viewBottom) {
            $host.scrollTop(bottom - viewH);
        }
    }

    function visibleRange() {
        const viewH   = $host[0].clientHeight || 1;
        const viewTop = $host.scrollTop();
        const first = Math.max(0, Math.floor(viewTop / rowHeight) - buffer);
        const last  = Math.min(total - 1, Math.ceil((viewTop + viewH) / rowHeight) + buffer);
        return { first, last };
    }

    function render() {
        if (total === 0) {
            $rows.empty().css("transform", "translateY(0)");
            return;
        }
        const { first, last } = visibleRange();
        $rows.css("transform", `translateY(${first * rowHeight}px)`);

        const parts = [];
        for (let i = first; i <= last; i++) {
            const isSel = (i === selectedIndex);
            parts.push(
                `<li class="vlist__row${isSel ? " is-selected" : ""}" ` +
                `data-index="${i}" role="option" aria-selected="${isSel}" ` +
                `style="height:${rowHeight}px">${renderRow(i)}</li>`
            );
        }
        $rows.html(parts.join(""));
    }

    $host.on("scroll.vlist", render);

    $rows.on("click.vlist", ".vlist__row", function () {
        const i = Number($(this).attr("data-index"));
        if (Number.isFinite(i)) {
            selectedIndex = i;
            render();
            handlers.forEach((h) => h(i, "click"));
        }
    });

    return {
        setData,
        setSelectedIndex,
        scrollToIndex,
        refreshVisible: render,
        onSelect(h) { handlers.push(h); },
        get selectedIndex() { return selectedIndex; },
        get total() { return total; },
    };
}

// --- pure helpers exported for tests --------------------------------

/**
 * Window of visible row indices for a given scroll state. Pure function so
 * tests don't need a DOM.
 */
export function computeVisibleRange({ scrollTop, viewportHeight, rowHeight, total, buffer = 6 }) {
    if (total <= 0) return { first: 0, last: -1 };
    const first = Math.max(0, Math.floor(scrollTop / rowHeight) - buffer);
    const last  = Math.min(total - 1, Math.ceil((scrollTop + viewportHeight) / rowHeight) + buffer);
    return { first, last };
}

/**
 * Returns the smallest scrollTop that keeps row `i` visible (with `mode`
 * matching scrollIntoView semantics — "nearest" / "center"). Pure.
 */
export function scrollOffsetFor({ index, currentScrollTop, viewportHeight, rowHeight, mode = "nearest" }) {
    const top = index * rowHeight;
    const bottom = top + rowHeight;
    if (mode === "center") {
        return Math.max(0, top - viewportHeight / 2 + rowHeight / 2);
    }
    if (top < currentScrollTop) return top;
    if (bottom > currentScrollTop + viewportHeight) return bottom - viewportHeight;
    return currentScrollTop;
}
