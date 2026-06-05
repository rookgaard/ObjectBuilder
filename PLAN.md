# ObjectBuilder-JS — Rewrite Plan

This is the rolling, resumable plan for porting Object Builder (Adobe AIR / Flex / ActionScript 3)
to a browser-only single-page app. Keep this file up to date — *every time a stage closes or the
next sub-task changes, edit "Current focus" below first, then update the relevant stage section*.

Reference AS3 source: `../ObjectBuilder-AS/src/`.

## Locked technical choices

These are decided. No need to re-ask the user.

- **Stack**: plain HTML + CSS + ES modules. **jQuery 4.0.0** (pinned, via `code.jquery.com` CDN)
  for DOM/UI. Do not bump the jQuery version without owner sign-off.
- **No build tool, no transpiler.** Files served as-is by any static HTTP server
  (`python -m http.server 8000` or `npx serve .`). `file://` won't work because of ES modules.
- **Language**: vanilla JavaScript (ES2022+). No TypeScript, no JSX.
- **UI strings**: English only (matches AS3 default).
- **Project owner ↔ Claude communication language**: Polish. Committed files stay English.
- **Test files for 7.72**: `references/Tibia.dat` + `references/Tibia.spr` (gitignored).
  Signatures: dat `0x439D5A33`, spr `0x439852BE`. 5157 items, 254 outfits, 26 effects, 16 missiles,
  10423 sprites (non-extended u16). These signatures match the AS3 `value=770 "7.70"` entry; the
  bytes use generation-3 layout (covered by `MetadataReader3`). Listed in `versions.json` as
  `value: 772, valueStr: "7.72"` so the dropdown reads "7.72" as the user expects.

---

## Current focus

> **Stage 0 — DONE** (2026-06-05). Scaffold in place: `index.html` (jQuery 4.0.0 from CDN +
> `src/app/main.js` as module), `style.css` (dark `#494949` theme), six stub modules across
> `src/{core,formats,store,workers,ui,app}/`, `public/versions.json` (79 rows, 7.72 at top),
> `.editorconfig`. Smoke-tested via `python -m http.server 8765`: HTTP 200 on `/`, `/style.css`,
> `/src/app/main.js`, `/public/versions.json`; JSON parses with 79 entries, first row
> `7.72 / 0x439D5A33`.
>
> **Now active: Stage 1 — UI shell mock**.
>
> **Next concrete step**: build the 4-column main layout (Preview / Object list / ThingType Editor
> / Sprite list) inside `<main id="app">` in `index.html`, styled by `style.css`, plus draggable
> splitters. Implement splitter drag as a small jQuery module in `src/ui/splitter.js`
> (mousedown on a 5 px handle, capture mousemove on `document`, release on mouseup). No data wired
> in yet — that's the next sub-task.
>
> Update this section the moment a sub-task closes.

---

## Priority order (how I'd actually do it)

The user asked for: UI → load 7.72 → browse categories → edit → add → more versions. I agree, but
I'd insert and re-order a few things based on what reading the AS3 code revealed. Top-to-bottom is
strict priority — don't start stage N+1 until N "exit criteria" are green.

| #  | Stage                                                              | Why this order                                                                                |
| -- | ------------------------------------------------------------------ | --------------------------------------------------------------------------------------------- |
| 0  | Static scaffold (index.html + jQuery CDN + src/ tree)              | Cheap; locks the architecture in place before any real code.                                  |
| 1  | UI shell (4-panel layout, menu, toolbar) with mock data            | User's first ask. Lets us iterate on look & feel without binary formats blocking us.          |
| 2  | Binary I/O primitives + Sprite RLE codec (pure-core, unit-tested)  | Needed by every later stage. Easy to test in isolation against fixtures.                      |
| 3  | Load Tibia 7.72 `.dat` + `.spr` end-to-end, **read-only**          | The user's "first concrete version" milestone. Exercises stages 1 + 2.                        |
| 4  | Browse 4 categories with the real loaded data                      | Wires Stage 3 into Stage 1. Trivially small once 3 is done.                                   |
| 5  | Live preview + animation rendering of the selected object          | Needed before editing, otherwise the editor is flying blind.                                  |
| 6  | Edit attributes + flags (in-memory only, undo-able)                | The actual "editor" the user asked for.                                                       |
| 7  | Re-compile `.dat` + `.spr` and download                            | Closes the read-write loop. **Must come before "add new"** — otherwise we can't verify writes. |
| 8  | Add / duplicate / remove objects and sprites                       | Builds on Stage 7's writer.                                                                   |
| 9  | OBD (single-object import/export) — LZMA-compressed `.obd` files   | Highest-value side-feature; doesn't need server.                                              |
| 10 | Support more Tibia generations (7.10–7.50, 7.80–8.54, 8.55–10.56)  | Each is a new MetadataReader/Writer + a row in versions.json.                                 |
| 11 | Helper tools: Find, Slicer, Animation Editor, Look Generator       | Nice-to-have, low priority.                                                                   |
| 12 | Persistence: remember last-used directory / version via OPFS       | Quality of life.                                                                              |
| 13 | Polish: i18n, keyboard shortcuts, accessibility, theming           | Last.                                                                                         |

### Why I deviated from the user's order

- **Inserted Stage 2** before "load 7.72". Without a tested `BinaryReader` / RLE codec, debugging
  the loader is misery.
- **Stage 5 (live preview) before Stage 6 (editing).** The AS3 app's editor relies on a continuously
  animated preview; building the editor without a preview means you can't tell whether your edits
  worked.
- **Stage 7 (compile) before Stage 8 (add new).** If we can't write `.dat`/`.spr` yet, "added" items
  exist only in memory and we can't validate them. Compile first → verify round-trip → then add.
- **Folded "compile" out of Stage 8.** The user implicitly bundled compile under "edit attributes",
  but compile is large enough (LZMA-equivalent RLE write, offset table, frame-duration writes for
  newer versions) to warrant its own stage.
- **Treated 7.72 = generation 3.** `MetadataReader3` handles 7.55–7.72, so the work for 7.72 covers
  three other versions for free with only tiny tweaks.

---

## Stage 0 — Static scaffold

**Exit criteria**
- `index.html` at repo root: loads jQuery latest from a CDN (with SRI hash) and
  `<script type="module" src="./src/app/main.js">`. Shows a placeholder "ObjectBuilder-JS" header so
  we can verify the page boots.
- `style.css` at repo root, linked from `index.html`. Empty body rule + the placeholder header
  styles only.
- Folder skeleton:
  `src/core/index.js`, `src/formats/index.js`, `src/store/index.js`, `src/workers/index.js`,
  `src/ui/index.js`, `src/app/main.js`. Each is a stub module that just `console.log`s its own name
  on import so we can confirm everything loads.
- `public/versions.json` — ported from `ObjectBuilder-AS/src/firstRun/versions.xml`, with one extra
  row at the top for our reference files:
  `{ "value": 772, "valueStr": "7.72", "datSignature": "0x439D5A33", "sprSignature": "0x439852BE", "otbVersion": 0 }`.
- `.editorconfig` (4-space indent, LF line endings, UTF-8) matching AS3 repo style.
- `python -m http.server 8000` then visiting <http://localhost:8000/> shows the placeholder header
  and the browser console logs the six module names.

**Sub-tasks**
- [x] Write `index.html` with jQuery 4.0.0 `<script src="https://code.jquery.com/jquery-4.0.0.min.js">`
      + module entry. (SRI hash optional; if added, grab the current value from
      https://releases.jquery.com/jquery/ — don't make one up.)
- [x] Write `style.css` with body reset and placeholder header style.
- [x] Create six stub `index.js` / `main.js` files.
- [x] Convert `firstRun/versions.xml` → `public/versions.json` (JSON array of version objects, sigs
      stored as `"0x…"` strings to preserve the AS3 hex casing). Insert the 7.72 row at the top.
- [x] Add `.editorconfig`.
- [x] Smoke test with `python -m http.server`: GET /, /style.css, /src/app/main.js,
      /public/versions.json — all 200; versions.json parses with 79 entries, first = 7.72.

**Resume hint**: if this stage is partial, check whether `index.html` exists; if not, start from
the first sub-task. If yes, jump to whichever sub-task is unchecked.

---

## Stage 1 — UI shell with mock data

Mirror `ObjectBuilder.mxml`'s 4-column `HDividedBox`. No real data yet — render hard-coded mock
objects so we can iterate on layout, drag-to-resize, panel toggles, theming.

**Exit criteria**
- 4 resizable columns: Preview / Object list / ThingType Editor / Sprite list.
- Native-ish menu bar (File / Edit / View / Tools / Window / Help) — items can be stubs.
- Toolbar above the columns (New / Open / Compile / Save / …).
- Category dropdown (Item/Outfit/Effect/Missile) toggles which mock list is shown.
- ThingType Editor has the three tabs: **Texture**, **Properties**, **Flags** (mock fields inside).
- View menu: toggle visibility of Preview / Things / Sprites panels (state in app store).
- Looks readable at the original AS3 minimum window of 800×600 and scales up.

**Sub-tasks**
- [ ] Build the 4-column layout in `index.html` markup, styled by `style.css`.
- [ ] Draggable splitters between the four columns. Implement with jQuery (`mousedown`/`mousemove`
      on a 5px-wide handle div, no jQuery UI dependency).
- [ ] Mock data module `src/app/mockData.js` exporting 3 items, 1 outfit, 1 effect, 1 missile (each
      a partial `ThingType`-shaped object).
- [ ] Top toolbar (`src/ui/toolbar.js`) — buttons for New / Open / Compile / Save / etc. Port of
      `Toolbar.as`. Buttons are stubs (`alert('TODO')`).
- [ ] Top menu bar (`src/ui/menu.js`) — File / Edit / View / Tools / Window / Help with the same
      items as `ob/menu/Menu.as`. Items are stubs.
- [ ] ThingType Editor tabbed panel (`src/ui/editor/index.js`) — three tabs visible: **Texture**,
      **Properties**, **Flags**. Inside each tab show static mock fields for now.
- [ ] Hook up View menu → toggle panel visibility (jQuery `.toggle()`).
- [ ] Theme: dark, mimicking the AS3 #494949 background. No light/dark toggle in MVP.
- [ ] Quick a11y pass: labels, focus order, keyboard tabs.

---

## Stage 2 — Binary I/O primitives + RLE codec

Pure ES modules in `src/core/`. No DOM. No jQuery. Tested through a simple in-browser test runner
served at `tests.html` (no Vitest, no Node — we just open `tests.html`, it loads each test module
and prints PASS/FAIL into the page).

**Files to create**
- `src/core/binary/BinaryReader.js` — wraps `DataView`, little-endian, with cursor +
  `readUint8/16/32`, `readInt8/16/32`, `readBytes(n)`, `bytesAvailable`, `position` getter/setter.
- `src/core/binary/BinaryWriter.js` — same API mirrored for writing; backed by a growable
  `Uint8Array` (double-grow strategy).
- `src/core/sprites/spriteRle.js` — port of `Sprite.compressPixels` / `uncompressPixels`. Two modes:
  `transparent: false` (no alpha byte) and `transparent: true` (4th byte per colored pixel).
- `src/core/sprites/spritePixels.js` — conversions between Flash-order `A R G B` (decoded buffer)
  and HTML `ImageData` `R G B A`.
- `src/core/things/ThingType.js` — the 75+ field record + `clone()`, `getSpriteIndex()`,
  `getSpriteSheetSize()`. Plain JS class.
- `src/core/things/ThingCategory.js` — string constants `ITEM`/`OUTFIT`/`EFFECT`/`MISSILE` +
  `value <-> name` helpers.
- `src/core/things/ThingProperty.js` — `{ property, value }` factory.
- `src/core/Version.js` — `{ value, valueStr, datSignature, sprSignature, otbVersion }`.
- `src/core/animation/FrameDuration.js`.

**Testing harness**
- `tests.html` at repo root — loads jQuery + the test modules and prints results.
- `tests/runner.js` — tiny `assert`/`describe`/`it` shim (~50 lines) writing to the page.
- `tests/core/binary.test.js`, `tests/core/spriteRle.test.js`, `tests/core/thingType.test.js`.
- Open <http://localhost:8000/tests.html>; all rows must be green before closing the stage.

**Exit criteria**
- Round-trip tests pass for `u8/u16/u32/i8/i16/i32` reader/writer.
- RLE encode→decode round trip passes for: (a) fully transparent sprite, (b) fully opaque sprite,
  (c) mixed runs sprite, (d) the alert sprite PNG decoded into pixels and back.
- `getSpriteIndex` matches a hand-computed AS3 result for one outfit and one item.

**Resume hint**: AS3 reference for RLE: `ObjectBuilder-AS/src/otlib/sprites/Sprite.as` lines
~197–309. Copy the algorithm; don't re-derive.

---

## Stage 3 — Load Tibia 7.72 `.dat` + `.spr` (read-only)

Targets `MetadataReader3` band (7.55–7.72).

**Files to create**
- `src/formats/dat/MetadataFlags3.js` — flag-byte constants (port of `MetadataFlags3.as`).
- `src/formats/dat/MetadataReader.js` — base class with `readTexturePatterns()` (port of
  `MetadataReader.as`).
- `src/formats/dat/MetadataReader3.js` — generation-3 flag dispatch (port of `MetadataReader3.as`).
- `src/formats/dat/DatLoader.js` — top-level: read signature, counts, then per-category lists.
- `src/formats/spr/SprLoader.js` — port of `SpriteStorage.onLoad` + `SpriteReader.readSprite`.
- `src/store/ThingTypeStorage.js` — holds a `Map<id, ThingType>` per category, dispatches the right
  reader based on `Version.value`.
- `src/store/SpriteStorage.js` — holds `Map<id, Sprite>`; lazy reads from a kept `ArrayBuffer` for
  sprites not yet accessed.
- `src/app/loadProject.js` — accepts `File` objects (dat, spr) + selected `Version`, returns a
  populated storage pair via Promise.
- (Already created in Stage 0:) `public/versions.json` with the 7.72 row at the top.

**UI integration**
- Replace mock data wiring with a "File → Open" dialog: a jQuery modal that exposes two
  `<input type="file" accept=".dat">` / `.spr` fields and the version dropdown populated from
  `public/versions.json`. Reading with `FileReader.readAsArrayBuffer()`.
- When the user has the File System Access API, prefer `window.showOpenFilePicker` for a smoother
  native dialog; otherwise fall back to the `<input>` flow.
- For the test fixtures in `references/`, add a dev-only "Load reference 7.72" button so we don't
  have to click through the dialog on every reload during development. The button reads via
  `fetch('./references/Tibia.dat')` and `fetch('./references/Tibia.spr')` — works as long as the
  static server serves the `references/` folder. Remove this button once we're past Stage 7.

**Exit criteria**
- "Load reference 7.72" reads both files and the UI displays itemsCount=5157, outfitsCount=254,
  effectsCount=26, missilesCount=16 — matching the header inspection in CLAUDE.md.
- A hand-picked item (e.g. id=100) renders its sprite in the preview canvas.
- No JS errors, no NaN sprite coordinates.
- DAT file is consumed fully (`bytesAvailable == 0` at end) — same invariant the AS3 enforces.

---

## Stage 4 — Browse the 4 categories

This is mostly wiring Stage 3 storage into the Stage 1 UI.

**Exit criteria**
- Category dropdown switches the list and the visible ID range
  (items: 100..N, outfits/effects/missiles: 1..N).
- Numeric stepper jumps to ID, list scrolls to it.
- Selecting an entry populates Preview + ThingType Editor (read-only display first).
- Sprite list shows the sprites referenced by the selected thing's `spriteIndex`.

---

## Stage 5 — Live preview + animation

Port of `ThingDataView.as` + `otlib/animation/Animator.as`.

**Files**
- `src/ui/preview/SpriteSheet.js` — composes a thing's sprites into one off-screen `OffscreenCanvas`.
- `src/ui/preview/Animator.js` — frame timing (`FrameDuration`, animationMode, loopCount) driven by
  `requestAnimationFrame`.
- `src/ui/preview/ThingDataView.js` — jQuery widget that owns a `<canvas>` and renders the current
  frame at the current `(layer, patternX, patternY, patternZ)`. Exposes
  `.thingData(t)`, `.play()`, `.stop()`, `.patternX(n)` chainable jQuery-style.

**Exit criteria**
- An outfit renders all 4 directions when patternX is scrubbed.
- An animated effect cycles frames with timing matching the AS3 app (`FrameDuration.getDefaultDuration`).
- Outfits with addons / mount layers blend correctly (color-shifted overlay — see
  `LookGenerator.mxml` for the color tables, only needed once we tackle outfit coloring; for now
  layer 0 only is fine).

---

## Stage 6 — Edit attributes + flags

In-memory only; no compile yet.

**Files**
- `src/ui/editor/textureTab.js` — width/height/exactSize/layers/patternX/Y/Z/frames editors + sprite
  slot grid.
- `src/ui/editor/propertiesTab.js` — isGround/groundSpeed, hasLight/light, automap/minimap color,
  offset, elevation, cloth, market, writable, hasAction, lensHelp.
- `src/ui/editor/flagsTab.js` — checkbox grid of all booleans (gen-specific subset).
- `src/store/undo.js` — simple linear undo/redo stack of `(thingId, before, after)`.

**Exit criteria**
- Toggling a flag updates the `ThingType` in storage.
- Numeric edits are bounded and validated.
- Undo / redo work across edits (Ctrl+Z / Ctrl+Y).
- "Save" button on the editor commits changes (in-memory) and updates the preview.

---

## Stage 7 — Compile + download

Port of `MetadataWriter3` + `SpriteStorage.compile`.

**Files**
- `src/formats/dat/MetadataWriter.js` — base + `writeTexturePatterns` (port of `MetadataWriter.as`).
- `src/formats/dat/MetadataWriter3.js` — generation-3 flag emission.
- `src/formats/dat/DatCompiler.js` — header + per-category loops.
- `src/formats/spr/SprCompiler.js` — header + offset table + sprite data writes.
- `src/app/compileProject.js` — produces two `Blob`s and triggers downloads via a hidden
  `<a download>` (or via the File System Access API `showSaveFilePicker` when available).

**Exit criteria**
- **Round-trip test**: load `Tibia.dat` + `Tibia.spr` 7.72, immediately recompile without any edit,
  diff the result against the input — they must be byte-identical (this is what catches any reader
  bug).
- Edit one flag on one item, recompile, reload the output, observe the edit is preserved.
- Output `.dat` matches signature/header structure (verifiable with the AS3 app side-by-side).

---

## Stage 8 — Add / duplicate / remove

**Exit criteria**
- "New thing" button appends a default `ThingType.create()` to the current category. ID is
  `itemsCount+1` etc.
- "Duplicate" copies the selected thing's data into a new ID.
- "Remove" follows the AS3 semantics: if the removed id is the highest, decrement count; otherwise
  replace with a blank default (`ThingType.create(id, category)`).
- "New sprite" appends to sprite storage. "Remove sprite" mirrors the AS3 semantics.
- All four still pass the Stage 7 round-trip + edit-then-reload test.

---

## Stage 9 — OBD single-object import/export

OBD 2.0 layout is documented in `../ObjectBuilder-AS/OBD 2.0 Structure.txt`. Whole file is LZMA-
compressed. To stay no-build we pull the LZMA decoder/encoder from a CDN as another `<script>` or
ES-module import (e.g. `lzma1` or `lzma-purejs` published as an ES module). Per-object content:
client version, category, properties, patterns, then per-sprite ARGB pixels.

**Exit criteria**
- Import an `.obd` exported by the AS3 app → appears in the right category in our UI.
- Export a thing from our UI → AS3 app can import it back.

---

## Stage 10 — More version generations

For each band, port the matching `MetadataReader*` + `MetadataWriter*` + `MetadataFlags*` and add an
entry to `versions.json`. Order, easiest first:

1. Gen 2 (7.40–7.50) — strictly a flag table delta from gen 3.
2. Gen 1 (7.10–7.30) — same shape, different flag table; also forces `patternZ = 1`.
3. Gen 4 (7.80–8.54) — flag table grows; market is still absent. `hasCharges` appears.
4. Gen 5 (8.55–9.86) — adds `marketCategory*`, `defaultAction`, `wrappable`, `clothSlot`. From 9.60
   sprite indices become u32 ("extended").
5. Gen 6 (10.10–10.56) — adds `improvedAnimations` (per-frame durations in `.dat`), `topEffect`,
   `usable`. OBD compile path needs to know about frame durations.

Each generation also needs its corresponding UI tweaks: the flag checkboxes shown in
`FlagsTab.tsx` must filter to flags that exist for the loaded version.

---

## Stage 11 — Helper tools

- `src/ui/tools/findWindow.js` — port of `FindWindow.mxml` (search by property/value).
- `src/ui/tools/slicer.js` — split a sprite sheet PNG into 32×32 tiles.
- `src/ui/tools/animationEditor.js` — port of `com/mignari/animator/AnimationEditor.as`.
- `src/ui/tools/lookGenerator.js` — port of `LookGenerator.mxml` (outfit colour preview).
- `src/ui/tools/spritesOptimizer.js` — port of `SpritesOptimizerWindow.mxml`.

---

## Stage 12 — Persistence

- OPFS for working copy of last-loaded project (so reloading the browser doesn't lose work).
- LocalStorage for UI settings (panel widths, last version chosen, theme).

---

## Stage 13 — Polish

- Keyboard shortcuts (AS3 list under `ObjectBuilder-AS/src/nail/menu`).
- A11y audit.
- Dark / light theme toggle.
- i18n is **out of scope** for this port — UI stays English-only per project decision.

---

## Resumption protocol

When tokens run out and a new session opens:

1. Read `CLAUDE.md` and this file.
2. Find the "Current focus" block at the top of this file — it points to the active stage and the
   next concrete step.
3. Scan the active stage's checklist for the first unchecked `[ ]` sub-task.
4. Before writing JS, open the AS3 source file the stage references and re-read the relevant
   region. (Don't re-derive binary layout from memory.)
5. Do one sub-task end-to-end, tick the box, update "Current focus", commit if there's a git repo.

---

## Resolved decisions log

(Things that *were* open questions and are now locked. New questions go into "Current focus" so
they're impossible to miss.)

- **UI framework**: jQuery (CDN). No Preact/React/Lit/vanilla DOM. Decided 2026-06-05.
- **jQuery version**: 4.0.0, pinned. Decided 2026-06-05 by project owner — do not bump without
  sign-off.
- **Build tool**: none. Static HTML + ES modules + jQuery from CDN. Decided 2026-06-05.
- **Language**: TypeScript dropped; plain ES2022 JavaScript. Decided 2026-06-05.
- **UI strings**: English only. Decided 2026-06-05.
- **Documentation language**: English-only in committed files; Polish only in live conversation.
  Decided 2026-06-05.
- **7.72 client files**: provided by project owner at `references/Tibia.dat` + `references/Tibia.spr`.
  Signatures dat=`0x439D5A33`, spr=`0x439852BE`, counts 5157/254/26/16, 10423 sprites. These
  signatures are bytewise identical to AS3's `value=770 "7.70"` entry. Confirmed 2026-06-05.
- **OBD parsing**: defer to Stage 9; pull an LZMA decoder from a CDN as an ES module then.
