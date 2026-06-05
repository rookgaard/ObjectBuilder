# ObjectBuilder-JS — Rewrite Plan

This is the rolling, resumable plan for porting Object Builder (Adobe AIR / Flex / ActionScript 3)
to a TypeScript single-page web app. Keep this file up to date — *every time a stage closes or the
next sub-task changes, edit "Current focus" below first, then update the relevant stage section*.

Reference AS3 source: `../ObjectBuilder-AS/src/`.

---

## Current focus

> **Stage 0** — project scaffold not started yet. The repository folder `ObjectBuilder-JS/` exists
> and currently only contains `CLAUDE.md` and this `PLAN.md`.
>
> **Next concrete step**: scaffold a Vite + TypeScript project in this directory (`npm create vite@latest .
> -- --template vanilla-ts`), then commit an empty `src/core/`, `src/formats/`, `src/store/`,
> `src/ui/`, `src/app/`, `public/` tree to lock in the layered architecture from CLAUDE.md.
>
> Update this section the moment Stage 0 finishes.

---

## Priority order (how I'd actually do it)

The user asked for: UI → load 7.72 → browse categories → edit → add → more versions. I agree, but
I'd insert and re-order a few things based on what reading the AS3 code revealed. Top-to-bottom is
strict priority — don't start stage N+1 until N "exit criteria" are green.

| #  | Stage                                                              | Why this order                                                                                |
| -- | ------------------------------------------------------------------ | --------------------------------------------------------------------------------------------- |
| 0  | Project scaffold (Vite + TS + lint + folder layout)                | Cheap; locks the architecture in place before any real code.                                  |
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

## Stage 0 — Project scaffold

**Exit criteria**
- `package.json`, `tsconfig.json`, `vite.config.ts`, `.eslintrc`, `.prettierrc` in place.
- `npm run dev` serves a blank page. `npm run build` succeeds. `npm run typecheck` succeeds.
- Folder skeleton: `src/{core,formats,store,workers,ui,app}/index.ts` (empty re-exports), `public/`.
- Vitest configured for `src/core` and `src/formats` (these layers should be pure / no DOM).

**Sub-tasks**
- [ ] `npm create vite@latest . -- --template vanilla-ts`
- [ ] Add ESLint + Prettier configs.
- [ ] Add Vitest.
- [ ] Commit folder skeleton with placeholder `index.ts` in each layer.
- [ ] Add `.editorconfig` matching the AS3 repo style (4-space, LF).

**Resume hint**: if this stage is partial, check whether `package.json` exists; if not, start from
`npm create vite@…`. If yes, jump to whichever sub-task is unchecked.

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
- [ ] Decide framework: Lit / Preact / React / vanilla — **ask user before committing.** (Default
      recommendation: Preact + signals — light, no JSX-pragma drama, plays nicely with Web Workers.)
- [ ] Build the 4-column layout component with draggable splitters.
- [ ] Mock data: 3 items, 1 outfit, 1 effect, 1 missile.
- [ ] Ports of `Toolbar.as` + native menu schema.
- [ ] ThingType Editor tabbed panel (three tabs visible, mock fields).
- [ ] Hook up View → toggle panel visibility.
- [ ] Quick a11y pass: labels, focus order, keyboard tabs.

**Decisions to surface to user**: framework choice, dark theme like the AS3 app (#494949) or modern
light/dark toggle.

---

## Stage 2 — Binary I/O primitives + RLE codec

Pure ES modules in `src/core/`. No DOM. Fully unit-tested.

**Files to create**
- `core/binary/BinaryReader.ts` — wraps `DataView`, little-endian, with cursor + `readUint8/16/32`,
  `readInt8/16/32`, `readBytes(n)`, `bytesAvailable`, `position` getter/setter.
- `core/binary/BinaryWriter.ts` — same API mirrored for writing; backed by a growable `Uint8Array`.
- `core/sprites/spriteRle.ts` — port of `Sprite.compressPixels` / `uncompressPixels`. Two modes:
  `transparent: false` (no alpha byte) and `transparent: true` (4th byte per colored pixel).
- `core/sprites/spritePixels.ts` — conversions between Flash-order `A R G B` (decoded buffer) and
  HTML `ImageData` `R G B A`.
- `core/things/ThingType.ts` — the 75+ field record + `clone()`, `getSpriteIndex()`,
  `getSpriteSheetSize()`. Pure data class.
- `core/things/ThingCategory.ts` — string enum + `value <-> name` helpers.
- `core/things/ThingProperty.ts` — `{ property: string; value: unknown }`.
- `core/core/Version.ts` — `{ value, valueStr, datSignature, sprSignature, otbVersion }`.
- `core/animation/FrameDuration.ts`.

**Exit criteria**
- Unit tests pass for: read/write round-trip on `u8/u16/u32/i8/i16/i32`, RLE encode→decode round
  trip of (a) a fully transparent sprite, (b) a fully opaque sprite, (c) a sprite with mixed
  transparent and colored runs, (d) the alert sprite from `assets/`.
- `getSpriteIndex` matches AS3 output on a hand-computed case.

**Resume hint**: AS3 reference for RLE: `ObjectBuilder-AS/src/otlib/sprites/Sprite.as` lines
~197–309. Copy the algorithm; don't re-derive.

---

## Stage 3 — Load Tibia 7.72 `.dat` + `.spr` (read-only)

Targets `MetadataReader3` band (7.55–7.72).

**Files to create**
- `formats/dat/MetadataFlags3.ts` — flag-byte constants (port of `MetadataFlags3.as`).
- `formats/dat/MetadataReader.ts` — base class with `readTexturePatterns()` (port of
  `MetadataReader.as`).
- `formats/dat/MetadataReader3.ts` — generation-3 flag dispatch (port of `MetadataReader3.as`).
- `formats/dat/DatLoader.ts` — top-level: read signature, counts, then per-category lists.
- `formats/spr/SprLoader.ts` — port of `SpriteStorage.onLoad` + `SpriteReader.readSprite`.
- `store/ThingTypeStorage.ts` — holds `Map<id, ThingType>` per category, dispatches the right
  reader based on `Version.value`.
- `store/SpriteStorage.ts` — holds `Map<id, Sprite>`; lazy reads from a kept `ArrayBuffer`.
- `app/loadProject.ts` — accepts `File` objects (dat, spr) + selected `Version`, returns a populated
  storage pair.
- `public/versions.json` — ported from `firstRun/versions.xml`.

**UI integration**
- Replace mock data wiring with a "File → Open" dialog that asks the user for `.dat` and `.spr`
  files and a version from the dropdown. (7.72 specifically isn't in the AS3 `versions.xml` —
  closest stock entry is 770/"7.70". Add a 772 entry to `versions.json` if the user has files with
  different signatures; the AS3 app autodetects via signature match.)

**Exit criteria**
- Open a known-good `Tibia.dat` + `Tibia.spr` (any 7.55–7.72), see the item count match the AS3
  app's display, see a hand-picked item ID render in the preview.
- No JS errors, no NaN sprite coordinates.
- DAT file is consumed fully (`bytesAvailable == 0` at end) — same invariant the AS3 enforces.

**Open question for the user**: do they have actual 7.72 files? If yes, log their `.dat`/`.spr`
signatures here so we know what to enter in `versions.json`:

```
{
  "value": 772,
  "valueStr": "7.72",
  "datSignature": "0x________",   // TODO fill from real file
  "sprSignature": "0x________",
  "otbVersion": 0
}
```

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
- `ui/preview/SpriteSheet.ts` — composes a thing's sprites into one off-screen canvas.
- `ui/preview/Animator.ts` — frame timing (`FrameDuration`, animationMode, loopCount).
- `ui/preview/ThingDataView.tsx` (or framework equivalent) — renders the current frame at the
  current `(layer, patternX, patternY, patternZ)`.

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
- `ui/editor/TextureTab.tsx` — width/height/exactSize/layers/patternX/Y/Z/frames editors + sprite
  slot grid.
- `ui/editor/PropertiesTab.tsx` — isGround/groundSpeed, hasLight/light, automap/minimap color,
  offset, elevation, cloth, market, writable, hasAction, lensHelp.
- `ui/editor/FlagsTab.tsx` — checkbox grid of all booleans (gen-specific subset).
- `store/undo.ts` — simple linear undo/redo stack of `(thingId, before, after)`.

**Exit criteria**
- Toggling a flag updates the `ThingType` in storage.
- Numeric edits are bounded and validated.
- Undo / redo work across edits.
- "Save" button on the editor commits changes (in-memory) and updates the preview.

---

## Stage 7 — Compile + download

Port of `MetadataWriter3` + `SpriteStorage.compile`.

**Files**
- `formats/dat/MetadataWriter.ts` — base + `writeTexturePatterns` (port of `MetadataWriter.as`).
- `formats/dat/MetadataWriter3.ts` — generation-3 flag emission.
- `formats/dat/DatCompiler.ts` — header + per-category loops.
- `formats/spr/SprCompiler.ts` — header + offset table + sprite data writes.
- `app/compileProject.ts` — produces two `Blob`s and triggers downloads.

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
compressed. The JS LZMA implementation: `lzma-js` or roll a small streaming decoder. Per-object
content: client version, category, properties, patterns, then per-sprite ARGB pixels.

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

- `ui/tools/FindWindow.tsx` — port of `FindWindow.mxml` (search by property/value).
- `ui/tools/Slicer.tsx` — split a sprite sheet PNG into 32×32 tiles.
- `ui/tools/AnimationEditor.tsx` — port of `com/mignari/animator/AnimationEditor.as`.
- `ui/tools/LookGenerator.tsx` — port of `LookGenerator.mxml` (outfit colour preview).
- `ui/tools/SpritesOptimizer.tsx` — port of `SpritesOptimizerWindow.mxml`.

---

## Stage 12 — Persistence

- OPFS for working copy of last-loaded project (so reloading the browser doesn't lose work).
- LocalStorage for UI settings (panel widths, last version chosen, theme).

---

## Stage 13 — Polish

- i18n (AS3 supports en/pl/pt — `ObjectBuilder-AS/locale/`). Port at least en + pl.
- Keyboard shortcuts (AS3 list under `ObjectBuilder-AS/src/nail/menu`).
- A11y audit.
- Dark / light theme toggle.

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

## Open questions (resolve with user before committing implementation)

- **UI framework** (Stage 1): Preact (default rec) / Lit / React / vanilla DOM?
- **Build tool**: Vite (default rec) / esbuild / Parcel?
- **7.72 client files**: does the user have actual 7.72 `.dat`/`.spr` to test with? What are the
  exact signatures from their files? (We may need a new `versions.json` row.)
- **Language**: keep menus & error strings in English (port-friendly) or Polish (user's language)?
- **OBD parsing**: pull in a JS LZMA library (`lzma-js`) or hand-roll? — defer to Stage 9.
