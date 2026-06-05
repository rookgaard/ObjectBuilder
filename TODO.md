# Deferred features — backlog

Features observed in the downstream builder forks (`builder1` / `builder2` /
`builder3` / `builder4`, see `../builder{1..4}/`) that we have **not** ported yet.
Each entry is a standalone unit of work — sized roughly so it could land as
one focused stage / commit.

Source attribution next to each item points at the CHANGELOG line that
introduced it, so the AS3 implementation can be located for reference.

## Already done (cross-referenced for completeness)

The binary-format work that *was* needed for current-version client support
has all landed. See `PLAN.md` "Stages 14–24" for the full audit and commits:

- ✅ Gen 4 / 5 / 6 flag back-ports (WRAPPABLE / UNWRAPPABLE / TOP_EFFECT / HAS_BONES)
- ✅ Signed offsets across gens 1–6 + OBD; `maxTextLength` split
- ✅ `versions.json` extended to 12.90
- ✅ FrameGroup (DEFAULT + WALKING) scaffold for outfits 10.57+
- ✅ OBD v3 (outfit FrameGroups + per-sprite size prefix)
- ✅ Stand / Walking pose toggle in preview
- ✅ Single multi-file Open picker (auto-detect dat / spr + version)

## UI extras (mostly from builder4 0.5.8 – 0.6.0)

- [ ] **Compare Objects** — multi-select two or more objects and open a
      side-by-side comparison window from the context menu.
      *AS3 ref: builder4 changelog 0.6.0; `src/ob/...` Compare window.*

- [ ] **Copy / Paste server item attributes** (items.xml + .otb) — copy from
      one object and paste onto another with a confirmation prompt before
      overwriting. Needs deep-copy of nested attribute dicts to avoid
      shared-reference bugs (the changelog flags this explicitly).
      *AS3 ref: builder4 changelog 0.6.0.*

- [ ] **Edit Pixels — pixel-shift in sprite editor** — shift the current sprite
      one row/column in any direction using arrow keys or on-screen buttons.
      Two modes: boundary protection (clamp) and "wrap" (edge wraps to
      opposite side). Hook into the sprite list panel.
      *AS3 ref: builder4 changelog 0.5.9 + 0.6.0 "Wrap" mode.*

- [ ] **Film Roll view** — alternate sprite list rendering that shows the
      animation frames of the selected ThingType as a horizontal filmstrip,
      with per-frame multi-select (Ctrl+Click toggle, Ctrl+A select all),
      and orange selection border. Selected frames receive pixel-shifts in
      one go from the Edit Pixels feature above.
      *AS3 ref: builder4 changelog 0.5.9.*

- [ ] **Pixel grid overlay** in the sprite editor for precise pixel work.
      *AS3 ref: builder4 changelog 0.5.9.*

- [ ] **Bulk Editor expansion** — bulk-edit window covering ground speed,
      light, mini-map color, offset, elevation, cloth, default action,
      lens help, market, writable. Each row should be version-gated
      (hide / disable when the active version doesn't support that flag).
      *AS3 ref: builder4 changelog 0.5.9.*

- [ ] **Grid view for Objects + Sprites panels** with a **size stepper** that
      adjusts thumbnail size and applies automatic cropping + bitmap
      smoothing.
      *AS3 ref: builder4 changelog 0.6.0.*

- [ ] **Frame durations bulk window** — set frame durations on every object
      at once (rather than per-thing in the Properties tab).
      *AS3 ref: builder1 changelog 0.5.5.*

- [ ] **Slicer accepts empty sprites** — currently the slicer skips fully
      transparent tiles. Add a checkbox to keep them as blank sprites.
      *AS3 ref: builder3 changelog 0.5.2.*

- [ ] **Object Viewer**, **Animation Editor**, **Look Generator**,
      **SpritesOptimizer** — top-level Tools menu items still listed as
      TODOs in the menu. Each is its own dialog / window.
      *AS3 ref: ObjectBuilder-AS Tools menu.*

## Non-UI follow-ups

- [ ] **Sprite editor — load sprites larger than 32×32**. AS3 fork adds a
      checkbox; sprites store size as 64×64 / 96×96 inside the same on-disk
      layout via a separate flag. Needs research on the actual binary
      change.
      *AS3 ref: builder3 changelog 0.5.4.*

- [ ] **PNG replace** — replace a sprite directly from a PNG file (without
      going through the slicer). The slicer covers many-tile import; this
      is single-sprite drag-drop / file picker.
      *AS3 ref: builder4 changelog 0.5.8.*

- [ ] **Export All** — single button on Objects / Sprites panels that
      exports every entry at once without manual multi-select.
      *AS3 ref: builder4 changelog 0.5.8.*

- [ ] **Bulk replace objects** — replace a contiguous id range in one shot.
      *AS3 ref: builder4 changelog 0.5.8.*

- [ ] **Quick Save shortcut + File → New Window** — open a second
      ObjectBuilder instance from the file menu (each window owns its own
      project).
      *AS3 ref: builder4 changelog 0.5.8.*

- [ ] **4K / high-DPI display improvements** — likely just `devicePixelRatio`
      handling in the SpriteSheet composer + preview canvas; verify
      sub-pixel sprite rendering at 200% zoom.
      *AS3 ref: builder4 changelog 0.5.8.*

- [ ] **Theme toggle / dark mode + a11y deep dive** — keyboard navigation in
      every dialog, focus styles, color-contrast audit.

## Notes

Once any of these moves into active work, copy the bullet into PLAN.md's
"Current focus" block and mark it `[x]` here when the commit lands.
