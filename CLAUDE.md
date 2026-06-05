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

Layered the same way as the AS3 code:

```
src/
  core/            // pure ES modules, no DOM: BinaryReader/Writer, RLE codec, ThingType,
                   // ThingProperty, Version, format constants, sprite-index math
  formats/         // DAT (MetadataReader/Writer × 6 generations), SPR loader/compiler, OBD codec
  store/           // ThingTypeStorage, SpriteStorage — mutable, event-emitting
  workers/         // optional: load/compile inside a Web Worker (mirrors ObjectBuilderWorker)
  ui/              // framework code; renders panels (preview, lists, editor)
  app/             // wires UI to store + workers
public/            // versions.json, icons, alert sprite
```

The AS3 app communicates UI ↔ a worker through "commands" (`LoadFilesCommand`, `GetThingCommand`,
`UpdateThingCommand`, …). The JS port keeps the same command shape so each AS3 command maps 1:1 to a
TS function or worker message — makes the port mechanical.

## Conventions for this port

- **TypeScript** for everything in `src/`. Strict mode.
- **No backend.** Everything runs in the browser. File access via
  `<input type="file">`, drag-drop, or the File System Access API where available.
- **No Flash/BitmapData abstractions** — render through `<canvas>` `ImageData`, and keep raw pixel
  buffers as `Uint8Array` / `Uint8ClampedArray`.
- **Match the AS3 binary layout byte-for-byte.** When in doubt, the reference is the AS3 file in
  `../ObjectBuilder-AS/src/...` — cite that path next to non-obvious code.
- **Endianness is always little-endian** for `.dat` / `.spr`.
- Keep `core/` free of DOM and framework imports so it can run in a Web Worker.
- Don't add features that aren't in the AS3 app yet; the AS3 behavior is the spec.

## Status

- [x] Analyzed AS3 source, mapped UI + binary formats.
- [ ] Project scaffold (build tool, TS config, lint).
- [ ] Stage 1 — UI shell mock (no data).
- [ ] Stage 2 — Load Tibia 7.72 (`.dat` + `.spr`) end-to-end, read-only.
- [ ] Stage 3 — Browse the four categories (lists + numeric stepper).
- [ ] Stage 4 — Edit attributes + flags, save in memory.
- [ ] Stage 5 — Add / duplicate / remove objects + sprites.
- [ ] Stage 6 — Re-compile `.dat` + `.spr` and download.
- [ ] Stage 7 — Add support for more version generations.
- [ ] Stage 8 — OBD import/export, Animation Editor, Slicer, Look Generator.

Detailed roadmap & resume points: see [PLAN.md](./PLAN.md).

## How to resume work in a new session

1. Read this file end-to-end.
2. Read `PLAN.md` — it has the current stage, the next concrete sub-task, and any open questions.
3. If `PLAN.md` mentions a specific AS3 file as a reference for the current sub-task, open that
   first to refresh the binary layout / flag table before writing JS.
4. Update the "Status" checklist above and the "Current focus" section in `PLAN.md` when work
   advances or pivots.
