import { STRINGS } from "../strings.js";
import { MOCK_THINGS } from "../../app/mockData.js";
import {
    EVENTS,
    getState,
    listFor,
    countFor,
    minIdFor,
    setSelectedThingId,
    on,
} from "../../store/index.js";

const $ = window.jQuery;

const MAX_RENDERED = 200; // cheap windowing; full virtualization is Stage 4.

export function renderThingListPanel($host) {
    $host.empty().append(`
        <div class="panel-body">
            <section class="panel-section panel-section--grow">
                <h3 class="panel-section__title" id="thing-list-title">${STRINGS.panels.objects}</h3>
                <ul class="thing-list" id="thing-list" role="listbox" tabindex="0"></ul>
            </section>

            <section class="panel-section">
                <label class="numeric-stepper">
                    <span class="numeric-stepper__label">ID</span>
                    <input type="number" min="0" value="100" id="thing-id-input" class="control control--numeric">
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

    refreshList();

    $("#thing-list").off("click.thingList")
        .on("click.thingList", ".thing-list__item", function () {
            const id = Number($(this).attr("data-id"));
            if (!Number.isNaN(id)) setSelectedThingId(id);
        });

    $("#thing-id-input").off("change.thingList input.thingList")
        .on("change.thingList input.thingList", function () {
            const id = Number($(this).val());
            if (Number.isFinite(id)) setSelectedThingId(id);
        });

    on(EVENTS.PROJECT_CHANGE, () => refreshList());
    on(EVENTS.SELECTION_CHANGE, () => refreshList());
}

function refreshList() {
    const state    = getState();
    const project  = state.project;
    const category = state.selectedCategory;
    const $list    = $("#thing-list");
    const $title   = $("#thing-list-title");
    const $input   = $("#thing-id-input");

    let entries;
    let totalCount;

    if (project) {
        const map = listFor(project.dat, category);
        const minId = minIdFor(category);
        totalCount = countFor(project.dat, category);

        // Window of MAX_RENDERED around the selected id.
        const selectedId = state.selectedThingId ?? minId;
        const halfWindow = Math.floor(MAX_RENDERED / 2);
        const windowStart = Math.max(minId, selectedId - halfWindow);
        const windowEnd   = Math.min(totalCount, windowStart + MAX_RENDERED - 1);

        entries = [];
        for (let id = windowStart; id <= windowEnd; id++) {
            const thing = map.get(id);
            entries.push({ id, label: thing ? `${id}` : `${id} (missing)` });
        }
    } else {
        const mockList = MOCK_THINGS[category] || [];
        totalCount = mockList.length;
        entries = mockList.map((t) => ({ id: t.id, label: `${t.id} — ${t.name}` }));
    }

    $list.empty();
    const selectedId = state.selectedThingId;
    for (const e of entries) {
        const $li = $("<li>")
            .addClass("thing-list__item")
            .toggleClass("is-selected", e.id === selectedId)
            .attr("data-id", e.id)
            .text(e.label);
        $list.append($li);
    }

    const catLabel = STRINGS.categories[category] || category;
    $title.text(project
        ? `${catLabel}s (${totalCount}, showing ${entries.length})`
        : `${catLabel}s (${totalCount} mock)`);

    if (selectedId != null && Number($input.val()) !== selectedId) {
        $input.val(selectedId);
    }

    // Scroll the selected row into view.
    const $selected = $list.find(".thing-list__item.is-selected");
    if ($selected.length) {
        const elem = $selected[0];
        if (typeof elem.scrollIntoView === "function") {
            elem.scrollIntoView({ block: "nearest" });
        }
    }
}
