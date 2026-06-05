// Drag-to-resize splitter. Each splitter element resizes one target panel.
//
// Markup contract — for each splitter you want active:
//   <div class="app-splitter"
//        data-resize="<panel id>"
//        data-edge="left|right"
//        data-min="120"
//        data-max="400"></div>
//
//   - data-edge="right" : dragging right grows the panel (its right edge moves).
//                         Used when the splitter sits AFTER the panel.
//   - data-edge="left"  : dragging right shrinks the panel (its left edge moves).
//                         Used when the splitter sits BEFORE the panel.
//   - data-min / data-max default to 100 / 600 px.

const $ = window.jQuery;

export function initSplitters(rootSelector = "#app-layout") {
    const $root = $(rootSelector);

    $root.on("mousedown.splitter", ".app-splitter", function (downEvent) {
        downEvent.preventDefault();

        const $handle = $(this);
        const targetId = $handle.data("resize");
        const edge = $handle.data("edge") || "right";
        const min = Number($handle.data("min")) || 100;
        const max = Number($handle.data("max")) || 600;

        const $target = $(`#${targetId}`);
        if ($target.length === 0) return;

        const startX = downEvent.pageX;
        const startWidth = $target.outerWidth();

        $("body").addClass("is-splitter-dragging");

        function onMove(moveEvent) {
            const delta = moveEvent.pageX - startX;
            const next = edge === "right"
                ? startWidth + delta
                : startWidth - delta;
            const clamped = Math.max(min, Math.min(max, next));
            $target.css("flex-basis", clamped + "px");
        }

        function onUp() {
            $(document).off("mousemove.splitter", onMove);
            $(document).off("mouseup.splitter", onUp);
            $("body").removeClass("is-splitter-dragging");
        }

        $(document).on("mousemove.splitter", onMove);
        $(document).on("mouseup.splitter", onUp);
    });
}
