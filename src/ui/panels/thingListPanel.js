import { STRINGS } from "../strings.js";
import { MOCK_THINGS } from "../../app/mockData.js";
import {
    EVENTS,
    getState,
    listFor,
    countFor,
    minIdFor,
    maxIdFor,
    setSelectedThingId,
    on,
} from "../../store/index.js";
import { createVirtualList } from "../widgets/virtualList.js";

const $ = window.jQuery;

const ROW_HEIGHT = 22;

// Module-scoped because there's one Object panel per app.
let vlist = null;
let mode  = null; // "real" | "mock" — we recreate the renderer when this flips

export function renderThingListPanel($host) {
    $host.empty().append(`
        <div class="panel-body">
            <section class="panel-section panel-section--grow">
                <h3 class="panel-section__title" id="thing-list-title">${STRINGS.panels.objects}</h3>
                <div class="thing-list-host" id="thing-list-host" tabindex="0" role="listbox" aria-label="Object list"></div>
            </section>

            <section class="panel-section">
                <label class="numeric-stepper">
                    <span class="numeric-stepper__label">ID</span>
                    <input type="number" min="0" value="0" id="thing-id-input" class="control control--numeric">
                </label>
            </section>

            <section class="panel-section">
                <div class="button-row">
                    <button type="button" class="icon-button" title="Replace">⤺</button>
                    <button type="button" class="icon-button" title="Import">⤓</button>
                    <button type="button" class="icon-button" title="Export">⤒</button>
                    <button type="button" class="icon-button" title="Edit">✎</button>
                    <button type="button" class="icon-button" title="Duplicate">⎘</button>
                    <button type="button" class="icon-button" title="New">＋</button>
                    <button type="button" class="icon-button" title="Remove">－</button>
                </div>
            </section>
        </div>
    `);

    rebuildList();
    bindControls();

    on(EVENTS.PROJECT_CHANGE,   () => rebuildList());
    on(EVENTS.SELECTION_CHANGE, () => syncListWithState());
}

function bindControls() {
    const $hostEl = $("#thing-list-host");

    // Numeric stepper — clamped to category min/max, push into store.
    $("#thing-id-input").off(".thingList")
        .on("change.thingList input.thingList", function () {
            const raw = Number($(this).val());
            const cat = getState().selectedCategory;
            const min = minIdFor(cat);
            const max = Math.max(min, maxIdFor(cat));
            if (!Number.isFinite(raw)) return;
            const clamped = Math.min(max, Math.max(min, Math.floor(raw)));
            if (clamped !== raw) $(this).val(clamped);
            setSelectedThingId(clamped);
        });

    // Keyboard navigation on the focused list.
    $hostEl.off("keydown.thingList").on("keydown.thingList", (e) => {
        if (!vlist || vlist.total <= 0) return;
        const cur = vlist.selectedIndex;
        const last = vlist.total - 1;
        let next = cur;
        switch (e.key) {
            case "ArrowDown": next = Math.min(last, (cur < 0 ? 0 : cur + 1)); break;
            case "ArrowUp":   next = Math.max(0,    (cur < 0 ? 0 : cur - 1)); break;
            case "PageDown":  next = Math.min(last, (cur < 0 ? 0 : cur + 10)); break;
            case "PageUp":    next = Math.max(0,    (cur < 0 ? 0 : cur - 10)); break;
            case "Home":      next = 0; break;
            case "End":       next = last; break;
            default: return;
        }
        e.preventDefault();
        if (next !== cur) {
            setSelectedThingId(indexToId(next));
        }
    });
}

function rebuildList() {
    const $hostEl = $("#thing-list-host");
    const $title  = $("#thing-list-title");
    const $input  = $("#thing-id-input");

    const state    = getState();
    const project  = state.project;
    const category = state.selectedCategory;

    if (project) {
        const map = listFor(project.dat, category);
        const min = minIdFor(category);
        const max = maxIdFor(category);
        const total = Math.max(0, max - min + 1);

        vlist = createVirtualList($hostEl, {
            rowHeight: ROW_HEIGHT,
            renderRow: (i) => {
                const id = min + i;
                const t = map.get(id);
                if (!t) return `<span class="vlist__row-id">${id}</span> <span class="vlist__row-meta">(missing)</span>`;
                return `<span class="vlist__row-id">${id}</span>`;
            },
        });
        vlist.onSelect((index) => setSelectedThingId(indexToId(index)));

        const selectedId = state.selectedThingId ?? min;
        const idx = Math.max(0, Math.min(total - 1, selectedId - min));
        vlist.setData(total, idx);
        vlist.scrollToIndex(idx, "center");

        const catLabel = STRINGS.categories[category] || category;
        $title.text(`${catLabel}s (${total}, ids ${min}–${max})`);

        $input.attr("min", min).attr("max", max).val(selectedId);
        mode = "real";
    } else {
        // Mock fallback (before any project loaded).
        const mockList = MOCK_THINGS[category] || [];
        vlist = createVirtualList($hostEl, {
            rowHeight: ROW_HEIGHT,
            renderRow: (i) => {
                const t = mockList[i];
                return `<span class="vlist__row-id">${t.id}</span> <span class="vlist__row-meta">— ${t.name}</span>`;
            },
        });
        vlist.onSelect((index) => setSelectedThingId(mockList[index].id));
        vlist.setData(mockList.length, mockList.length ? 0 : -1);
        const catLabel = STRINGS.categories[category] || category;
        $title.text(`${catLabel}s (${mockList.length} mock)`);
        $input.attr("min", 0).removeAttr("max").val(mockList[0]?.id ?? 0);
        mode = "mock";
    }
}

function syncListWithState() {
    const state = getState();
    const $input = $("#thing-id-input");

    if (!vlist) return;

    if (mode === "real") {
        const project = state.project;
        if (!project) { rebuildList(); return; }
        const category = state.selectedCategory;
        if ($("#thing-list-title").text().indexOf(STRINGS.categories[category]) === -1) {
            // Category changed → rebuild renderer for the new map.
            rebuildList();
            return;
        }
        const min = minIdFor(category);
        const idx = Math.max(0, Math.min(vlist.total - 1, (state.selectedThingId ?? min) - min));
        vlist.setSelectedIndex(idx);
        vlist.scrollToIndex(idx, "nearest");
        if (Number($input.val()) !== state.selectedThingId) {
            $input.val(state.selectedThingId);
        }
    } else {
        // mock — just re-render category lookup
        rebuildList();
    }
}

function indexToId(index) {
    const state = getState();
    if (mode === "real") {
        return minIdFor(state.selectedCategory) + index;
    }
    const list = MOCK_THINGS[state.selectedCategory] || [];
    return list[index]?.id ?? 0;
}
