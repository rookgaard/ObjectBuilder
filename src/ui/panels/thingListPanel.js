import { STRINGS } from "../strings.js";
import { MOCK_THINGS } from "../../app/mockData.js";

const $ = window.jQuery;

export function renderThingListPanel($host) {
    const $body = $(`
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

    $host.empty().append($body);
    populateThingList("item");

    $("#category-select").off("change.thingList").on("change.thingList", function () {
        populateThingList(String($(this).val()));
    });
}

function populateThingList(category) {
    const items = MOCK_THINGS[category] || [];
    const $list = $("#thing-list").empty();
    items.forEach((thing, idx) => {
        $("<li>")
            .addClass("thing-list__item")
            .toggleClass("is-selected", idx === 0)
            .attr("data-id", thing.id)
            .text(`${thing.id} — ${thing.name}`)
            .appendTo($list);
    });

    $("#thing-list-title").text(
        `${STRINGS.categories[category]}s (${items.length} mock)`
    );

    $("#thing-id-input").val(items[0] ? items[0].id : 0);
}
