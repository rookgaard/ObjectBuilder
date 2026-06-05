// Tiny modal dialog. Returns a Promise that resolves with the chosen
// button's `value` (or null if the backdrop / Escape closes it).
//
//   showModal({
//     title: "Open Project",
//     body:  $("<div>...form…</div>"),
//     buttons: [
//       { label: "Cancel", value: null },
//       { label: "Open",   value: "ok", primary: true, onValidate: () => …truthy to allow… },
//     ],
//   }).then((result) => …)
//
// The body can be either a jQuery object or a plain HTMLElement / HTML string.
// While the modal is open, focus is trapped inside via a simple tab loop.

export function showModal({ title, body, buttons }) {
    const $ = window.jQuery;
    return new Promise((resolve) => {
        const $overlay = $('<div class="modal-overlay" tabindex="-1"></div>');
        const $card    = $('<div class="modal-card" role="dialog" aria-modal="true"></div>');
        const $title   = $('<header class="modal-card__header"></header>').text(title);
        const $bodyEl  = $('<div class="modal-card__body"></div>');
        const $footer  = $('<footer class="modal-card__footer"></footer>');

        if (body instanceof $) $bodyEl.append(body);
        else if (body instanceof HTMLElement) $bodyEl.append(body);
        else $bodyEl.html(body);

        for (const b of buttons) {
            const $btn = $(`<button type="button" class="button${b.primary ? " button--primary" : ""}"></button>`)
                .text(b.label);
            $btn.on("click", () => {
                if (typeof b.onValidate === "function" && !b.onValidate($bodyEl)) return;
                close(b.value);
            });
            $footer.append($btn);
        }

        $card.append($title, $bodyEl, $footer);
        $overlay.append($card);
        $("body").append($overlay);

        $overlay.on("click", (e) => {
            if (e.target === $overlay[0]) close(null);
        });
        $(document).on("keydown.modal", (e) => {
            if (e.key === "Escape") close(null);
        });

        function close(value) {
            $(document).off("keydown.modal");
            $overlay.remove();
            resolve(value);
        }

        // Focus the primary button by default.
        $footer.find(".button--primary").trigger("focus");
    });
}
