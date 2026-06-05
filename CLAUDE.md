# ObjectBuilder-JS

A browser-based port of [Object Builder](https://github.com/ottools/ObjectBuilder) — an editor for
Tibia client asset files (`Tibia.dat` + `Tibia.spr`). Lets the user load, browse, edit, add and
re-compile items, outfits, effects and missiles for legacy Tibia / OTClient projects.

The original is an Adobe AIR / Flex (ActionScript 3) desktop app sitting next to this folder at
`../ObjectBuilder-AS/`. This port aims to deliver the same workflow as a single-page web app that
runs fully client-side — no server, no upload of the user's `.dat`/`.spr` files.

## What it does (target scope)

1. Pick a Tibia client version and load a matching `Tibia.dat` + `Tibia.spr` pair from the local
   filesystem (via `<input type="file">` / drag-drop / File System Access API).
2. Browse the four object categories: **Item**, **Outfit**, **Effect**, **Missile**.
3. Show each object's sprite(s), animation, pattern, size and all metadata flags in a property
   inspector.
4. Edit flags and numeric attributes, change sprite mappings, add or remove objects, replace
   sprites.
5. Re-compile a new `.dat` / `.spr` pair and download them back to the user.
6. Eventually: import/export individual objects (`.obd` files), Animation Editor, Slicer, Object
   Viewer, Look Generator (mirroring the AS3 tools).

## Source / reference repo

`../ObjectBuilder-AS/` — the AS3 source we port from. The most load-bearing files there:

| AS3 source                                        | What it does                                          |
| ------------------------------------------------- | ----------------------------------------------------- |
| `src/ObjectBuilder.mxml`                          | App shell, panels, menu, command dispatcher (Worker)  |
| `src/otlib/things/ThingType.as`                   | The core "object" record: ~75 fields                  |
| `src/otlib/things/ThingCategory.as`               | `item`/`outfit`/`effect`/`missile` enum               |
| `src/otlib/things/ThingTypeStorage.as`            | Loads/compiles the whole `.dat`, version dispatch     |
| `src/otlib/things/MetadataReader{1..6}.as`        | Per-version flag decoders (the 6 generations)         |
| `src/otlib/things/MetadataWriter{1..6}.as`        | Per-version flag encoders                             |
| `src/otlib/things/MetadataFlags{1..6}.as`         | Flag-byte tables for each generation                  |
| `src/otlib/things/MetadataReader.as`              | Base `readTexturePatterns()`, sprite-index reading    |
| `src/otlib/sprites/Sprite.as`                     | RLE compress/uncompress of a single 32×32 sprite      |
| `src/otlib/sprites/SpriteStorage.as`              | Loads/compiles `.spr` with offset table               |
| `src/otlib/sprites/SpriteReader.as`               | Reads a sprite chunk by offset                        |
| `src/otlib/core/Version.as`                       | `{value, valueStr, datSignature, sprSignature, otb}`  |
| `src/firstRun/versions.xml`                       | Authoritative list of known client signatures         |
| `src/otlib/components/ThingTypeEditor.mxml`       | Big tabbed editor (Texture / Properties / Flags tabs) |
| `src/otlib/components/ThingDataView.as`           | Live sprite preview + animator                        |
| `src/otlib/animation/`                            | Frame timing, animator                                |
| `src/otlib/obd/`                                  | OBD 2.0 single-object import/export (LZMA-compressed) |

## Generations / version bands (from AS3 dispatch)

These bands are how the `.dat` flag tables shift across Tibia history. The JS port needs the same
banding so 7.x flags don't collide with 9.x flags.

| Generation         | Reader/Writer class | Tibia versions | Notes                                  |
| ------------------ | ------------------- | -------------- | -------------------------------------- |
| 1                  | `…1`                | 7.10 – 7.30    | Earliest flag set                      |
| 2                  | `…2`                | 7.40 – 7.50    |                                        |
| **3 (MVP target)** | `…3`                | 7.55 – 7.72    | **First stage of the port targets this** |
| 4                  | `…4`                | 7.80 – 8.54    |                                        |
| 5                  | `…5`                | 8.55 – 9.86    | u32 IDs ("extended") from 9.60+         |
| 6                  | `…6`                | 10.10 – 10.56  | Market, frame durations, "improvedAnims" |

## .dat / .spr binary format (the must-know bits)

All values are **little-endian**.

### `Tibia.dat` (generation 3 — 7.55–7.72 layout)

```
u32 signature              // matches Version.datSignature
u16 itemsCount             // last item id (items run 100..itemsCount)
u16 outfitsCount           // outfits run 1..outfitsCount
u16 effectsCount           // effects run 1..effectsCount
u16 missilesCount          // missiles run 1..missilesCount

for each id in [100..itemsCount] then outfits then effects then missiles:
    while (flag = u8) != 0xFF:
        // dispatch flag byte through MetadataReader3 flag table
        // some flags consume extra u16 args (light, mini-map color, offset, …)
    u8 width
    u8 height
    if width > 1 or height > 1: u8 exactSize
    u8 layers
    u8 patternX, u8 patternY, u8 patternZ
    u8 frames
    // frame durations only exist on generation 6 / improvedAnimations
    for i in [0 .. width*height*layers*patternX*patternY*patternZ*frames):
        u16 spriteIndex[i]      // u32 if 'extended' (v >= 960)
```

### `Tibia.spr`

```
u32 signature                                 // matches Version.sprSignature
u16 spritesCount                              // u32 if 'extended' (v >= 960)
u32 address[spritesCount]                     // 0 = empty sprite
// then for each non-empty sprite, at its address:
u8  r, u8 g, u8 b                             // unused magenta marker (0xFF, 0x00, 0xFF)
u16 dataLength
u8[dataLength] rle                            // run-length encoded 32×32 ARGB
```

### Sprite RLE (each 32×32 sprite, 4096-pixel buffer)

Alternating chunks until the pixel cursor reaches 1024 pixels (4096 bytes BGRA):

```
u16 transparentRunLength
u16 coloredRunLength
for i in [0..coloredRunLength):
    u8 R, u8 G, u8 B          // and u8 A if 'transparency' enabled
```

A "transparency-enabled" `.spr` (8.55+) stores a real per-pixel alpha byte. For older files alpha is
implied 0xFF on colored pixels and 0x00 on transparent runs. Pixel order in the decoded buffer is
`A R G B` per pixel (matches Flash `BitmapData.setPixels`); for an HTML5 canvas `ImageData` we'll
need to remap to `R G B A`.

### ThingType — the per-object record (75+ fields)

See `ThingType.as` for the full list. Key axes:

- **Geometry**: `width`, `height`, `exactSize`, `layers`, `patternX/Y/Z`, `frames`
- **Animation**: `isAnimation`, `animationMode`, `loopCount`, `startFrame`, `frameDurations[]`
- **Sprite mapping**: `spriteIndex[]` — flat array indexed via `getSpriteIndex(w,h,l,px,py,pz,frame)`
- **Boolean flags**: `isGround/isGroundBorder/isOnBottom/isOnTop/isContainer/stackable/…` (~40 flags)
- **Parametric flags**: `groundSpeed`, `maxTextLength`, `lightLevel/lightColor`, `offsetX/Y`,
  `elevation`, `miniMapColor`, `lensHelp`, market fields, etc.

Not all flags exist on every generation; the per-generation `MetadataReader*.as` decides which
appear in the bitstream and which read extra u16 args.

## Original UI shell (what we replicate)

`ObjectBuilder.mxml` builds a 4-column horizontal split:

```
┌───────────────┬───────────────┬─────────────────────┬───────────────┐
│ Preview panel │ Object list   │ ThingType Editor    │ Sprite list   │
│ ───────────── │ ───────────── │ ─────────────────── │ ───────────── │
│ Files info    │ Category drop │ Tabs:               │ Sprite grid   │
│ Animated view │ Object grid   │  • Texture          │ Numeric step  │
│ of selected   │ Numeric step  │    (patterns,       │ Replace /     │
│ thing         │ Replace /     │    appearance,      │  import /     │
│               │  import /     │    animation)       │  export /     │
│               │  export /     │  • Properties       │  copy /       │
│               │  edit /       │    (ground, light,  │  paste /      │
│               │  duplicate /  │    automap, offset, │  new /        │
│               │  new /        │    elevation,       │  remove       │
│               │  remove       │    market, …)       │               │
│               │               │  • Flags            │               │
│               │               │    (~40 booleans)   │               │
│               │               │ [Save] [Close]      │               │
└───────────────┴───────────────┴─────────────────────┴───────────────┘
```

Native menu: File (New/Open/Compile/Compile As/Merge/Close/Preferences/Exit), View (toggle panels),
Tools (Find, Look Generator, Object Viewer, Slicer, Animation Editor, Sprites Optimizer), Window
(Log, Versions), Help.

## Target architecture (JS)

**No build tool.** Plain HTML + CSS + ES modules served as static files. **jQuery 4.0.0** for DOM
and UI plumbing, pulled from `https://code.jquery.com/jquery-4.0.0.min.js` in `index.html`. The
version is **locked** — do not bump without the project owner's sign-off; 4.0.0 dropped support for
several legacy APIs that 3.x still carried, so a downgrade could mask bugs we'd need to fix later.
Modern browsers (Chromium/Firefox/Safari latest) are the only target — we rely on
`<script type="module">`, `DataView`, `Uint8Array`, `OffscreenCanvas`, and (where available) the
File System Access API.

Layered the same way as the AS3 code:

```
index.html         // entry; loads jQuery from CDN + src/app/main.js as a module
style.css          // global styles
src/
  core/            // pure ES modules, NO jQuery, NO DOM: BinaryReader/Writer, RLE codec,
                   // ThingType, ThingProperty, Version, format constants, sprite-index math
  formats/         // DAT (MetadataReader/Writer × 6 generations), SPR loader/compiler, OBD codec
  store/           // ThingTypeStorage, SpriteStorage — mutable; emit jQuery events on a $bus
  workers/         // optional: load/compile inside a Web Worker (mirrors ObjectBuilderWorker)
  ui/              // jQuery widgets that render panels (preview, lists, editor)
  app/             // main.js entry; wires UI to store + workers
public/
  versions.json    // ported from AS3 firstRun/versions.xml
  assets/          // alert sprite PNG, icons (lifted from ObjectBuilder-AS/assets)
references/        // user's local Tibia.dat / Tibia.spr for testing (gitignored)
```

The AS3 app communicates UI ↔ a worker through "commands" (`LoadFilesCommand`, `GetThingCommand`,
`UpdateThingCommand`, …). The JS port keeps the same command shape: each AS3 command maps 1:1 to a
plain JS function (synchronous, in the main thread) or — once introduced — to a worker `postMessage`
payload. This keeps the port mechanical.

### Running locally

There is no `npm install` and no compile step. The project owner runs `server.exe` (lives in this
folder, kept running between sessions) that serves the working tree at
**<http://127.0.0.1/>** on port 80. Refresh the browser tab to pick up edits — there's no HMR.

Opening `index.html` via `file://` will NOT work because ES modules require an HTTP origin.

If you need to verify a change from inside the agent, just `curl http://127.0.0.1/<path>` — do
**not** start `python -m http.server`, `npx serve`, or any other server: the owner already has one
running and a second one would just collide on the port.

## Conventions for this port

- **Plain JavaScript** (ES2022+). No TypeScript, no JSX, no transpilers, no bundlers.
- **jQuery 4.0.0** (pinned, from `code.jquery.com` CDN) is the *only* runtime dependency. Used
  for: DOM construction, event delegation, the cross-module event bus, simple show/hide animations.
  Not used inside `src/core/` or `src/formats/` (those stay pure so they can run in a Web Worker
  later). Don't introduce jQuery plugins without a discussion first.
- **ES modules** (`<script type="module">`); `import`/`export` everywhere in `src/`. No globals
  except `window.jQuery` / `window.$` from the CDN.
- **No backend.** Everything runs in the browser. File access via `<input type="file">`, drag-drop,
  or the File System Access API where available. Output via `Blob` + `URL.createObjectURL` +
  programmatic `<a download>` click.
- **No Flash/BitmapData abstractions** — render through `<canvas>` `ImageData`, and keep raw pixel
  buffers as `Uint8Array` / `Uint8ClampedArray`.
- **UI language is English** (matches AS3 default). Strings live in `src/ui/strings.js`, ready for
  later i18n but no language switcher in MVP.
- **Match the AS3 binary layout byte-for-byte.** When in doubt, the reference is the AS3 file in
  `../ObjectBuilder-AS/src/...` — cite that path in a comment next to non-obvious code.
- **Endianness is always little-endian** for `.dat` / `.spr`.
- Keep `core/` free of DOM, jQuery, and framework imports so it can run in a Web Worker.
- Don't add features that aren't in the AS3 app yet; the AS3 behavior is the spec.
- **Documentation (`*.md`) is written in English only.** Conversation with the project owner is in
  Polish; that does not leak into committed files.

## Reference test files

The user keeps a working `Tibia.dat` + `Tibia.spr` pair under `references/` (gitignored). Read at
project start, header reports:

| File        | Bytes    | Header field                             | Value                       |
| ----------- | -------- | ---------------------------------------- | --------------------------- |
| `Tibia.dat` | 186 653  | signature (u32, LE)                      | `0x439D5A33`                |
|             |          | itemsCount  (u16)                        | 5157 (ids 100..5157)        |
|             |          | outfitsCount (u16)                       | 254  (ids 1..254)           |
|             |          | effectsCount (u16)                       | 26                          |
|             |          | missilesCount (u16)                      | 16                          |
| `Tibia.spr` | 14 583 074 | signature (u32, LE)                    | `0x439852BE`                |
|             |          | spritesCount (u16, non-extended)         | 10423                       |

Those signatures are bit-for-bit the AS3 `versions.xml` entry for **value=770 / "7.70"** — there is
no distinct 7.72 entry in the stock AS3 list, and the dat/spr in `references/` self-identify as the
7.70 generation. `MetadataReader3` (which covers the 7.55–7.72 band) is the correct decoder either
way. We surface this file as `value: 772, valueStr: "7.72"` in `public/versions.json` with the same
signatures (user calls them 7.72) so the version dropdown shows what the user expects.

## Status

- [x] Analyzed AS3 source, mapped UI + binary formats.
- [x] Identified `references/Tibia.dat` + `Tibia.spr` signatures (gen 3 / 7.55–7.72 band).
- [x] Stage 0 — Static project scaffold (index.html + jQuery 4.0.0, style.css, src/ layout,
      public/versions.json, .editorconfig; smoke-tested via http.server).
- [x] Stage 1 — UI shell mock (4-column layout, splitters, menu, toolbar, editor tabs, mock data).
- [x] Stage 2 — Binary I/O + sprite RLE codec + ThingType/Version/FrameDuration; in-browser PASS/
      FAIL runner at <http://127.0.0.1/tests.html>.
- [x] Stage 3 — DAT gen-3 reader + SPR lazy reader + projectStore + UI "Load 7.72 (dev)" wires
      real counts/sprites into the shell. Integration tests against `references/Tibia.{dat,spr}`.
- [x] Stage 4 — Virtual list for the Object panel, read-only editor bound to selected ThingType,
      keyboard nav, stepper clamping, new test suites.
- [x] Stage 5 — Live preview: SpriteSheet composer + Animator + ThingDataView widget + pattern
      controls in the preview panel.
- [x] Stage 6 — Editor edits flags/properties/texture, Save/Close + undo stack + Ctrl+Z/Ctrl+Y.
- [x] Stage 7 — DAT + SPR compilers + Compile toolbar button + byte-identical round-trip
      against `references/Tibia.{dat,spr}` (186 KB / 14 MB).
- [x] Stage 8 — add/duplicate/remove for ThingType + add/remove sprite with overlay; icon
      buttons + undo entries; round-trip preserved through SPR re-compile.
- [x] Stage 9 — File menu wiring: Open / New / Compile / Compile As / Close dialogs.
- [ ] Stage 10 — OBD single-object import/export (LZMA-compressed `.obd`).
- [ ] Stage 11 — Support more version generations (7.10–7.50, 7.80+).
- [ ] Stage 11 — Helper tools (Find, Slicer, Animation Editor, Look Generator).
- [ ] Stage 12 — Persistence (OPFS / localStorage).
- [ ] Stage 13 — Polish (keyboard shortcuts, a11y, theming).

Detailed roadmap & resume points: see [PLAN.md](./PLAN.md).

## How to resume work in a new session

1. Read this file end-to-end.
2. Read `PLAN.md` — it has the current stage, the next concrete sub-task, and any open questions.
3. If `PLAN.md` mentions a specific AS3 file as a reference for the current sub-task, open that
   first to refresh the binary layout / flag table before writing JS.
4. Update the "Status" checklist above and the "Current focus" section in `PLAN.md` when work
   advances or pivots.
