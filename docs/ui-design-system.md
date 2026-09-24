# Ridemere interface design system

Written for whoever works on the interface, on either side of the boundary. The game
and the website must look like one product, and they are built with completely
different tools, so the shared decisions live here.

`Ridemere` is a working product name, not a cleared trademark. It appears in exactly
one place in code, `web/src/lib/product.ts`, and nowhere in engine namespaces, object
identifiers, repository history or the standalone content identifiers, which all keep
the `sunrise` development prefix. Renaming the product must never mean renaming the
content.

## Principles

1. **The park is the subject; the interface is the frame.** Chrome is quieter and less
   saturated than anything on the map. If a control competes with a guest for
   attention, the control is wrong.
2. **Readable before pretty.** Every judgement is made at the size it is actually drawn,
   which for the game is nine to eleven pixels.
3. **One shape language.** Flat fills, soft rectangles, no bevels, no gloss, no
   drop-shadow stacks. The only shadow in the product is the one-pixel shadow under
   text, and it exists for legibility.
4. Not Windows 95, not a generic dashboard, not a free-to-play mobile game, not neon
   science fiction.

## Colour

A small semantic palette. Controls pick a role, never a colour.

| Token | Hex | Role |
|---|---|---|
| `bg` | `#131a24` | the surface behind everything |
| `raised` | `#1e2836` | panels and windows that sit above the background |
| `sunken` | `#0d131b` | inset areas: lists, fields, the map frame |
| `line` | `#2c3a4d` | separators and borders |
| `accent` | `#f2a341` | primary action, the warm Ridemere mark |
| `accentQuiet` | `#c07d24` | pressed and hovered states of the primary action |
| `secondary` | `#4ea3c4` | secondary action, selection, informational highlights |
| `positive` | `#5bb66a` | money in, success, a ride opening |
| `warning` | `#e0a92e` | attention that is not yet a problem |
| `danger` | `#d1573f` | destructive actions, breakdowns, money out |
| `text` | `#eef2f7` | primary text |
| `textQuiet` | `#9aa8bd` | secondary text, labels, units |
| `disabled` | `#55637a` | disabled text and icons |
| `selection` | `#f2a341` at 22% | selected rows and tabs |

Warm neutrals throughout: the greys lean blue only slightly, and the accent is the same
warm amber as the daylight in the world art. Nothing in the chrome approaches the
saturation of a ride.

**The game cannot use these hex values directly.** It draws from the fixed 236-colour
palette and picks window colours from the engine's named colour table, so the game side
expresses the same intent by choosing the nearest members of that table. The mapping is
in `tools/art-pipeline/build_ui_theme.py`, and the rule is that the role, not the exact
colour, is what carries across.

## Typography

**In the game:** our own sprite font, built by `tools/art-pipeline/build_fonts.py`.

The browser build compiles TrueType support out, so every character is a sprite from a
fixed table of 1,023 entries in three styles. Glyphs are rendered from Liberation Sans,
licensed under the SIL Open Font License 1.1, into exactly the boxes the engine
reserves, so no window can reflow or overflow: only the letterforms change.

Upstream draws a three-tone bevel, a light edge above and a dark edge below. Ridemere
draws flat letters with a one-pixel shadow down and to the right and no bevel. That
single change is most of why the game stops reading as OpenRCT2, it costs nothing, and
the shadow keeps text legible over bright terrain.

Constraints worth knowing before anyone proposes a different face:

* Three styles only: tiny (boxes up to 5×7), small (up to 8×10) and bold (up to 9×10).
* Glyph boxes and their vertical offsets are engine layout data. Changing them changes
  every window's measured text width.
* Glyph pixels are palette indices with fixed meanings: 1 is the letter, 2 a light
  bevel, 3 a shadow. There is no antialiasing and no grey.
* A face is chosen for eleven pixels, not for a specimen sheet. Unambiguous numerals
  and open counters matter; personality does not survive at this size.

**On the web:** the same intent at a size where a real typeface can show character. The
shell uses the system UI stack, which is fast, has no network cost on the isolated
route, and does not fight the game's own font. A licensed display face for the wordmark
is a later decision, not a V1-1 one.

## The wordmark

Typographic, not a logo. `Ridemere` set in the interface face, semibold, with slightly
tightened letter spacing, in `text` with the `R` in `accent`. It must remain trivially
replaceable: it is text in a component, not an image asset.

No mascot, no icon lockup, no gradient. When the name is cleared, a designer can make a
real mark; until then the product should not accumulate art built on a name that might
change.

## Iconography

Original, flat, geometric, drawn from shapes in code by
`tools/art-pipeline/build_ui_sprites.py`. 24×24 working size for toolbar icons.

* One accent colour per icon against a neutral body.
* Prefer the unambiguous shape over the pretty one. A bench is a bench from the side.
* Consistent stroke weight: two pixels for primary shapes, one for detail.
* Legible in a row of twenty at actual size, which is the only size that counts.
* No icon may be traced from, or modelled on, another game's artwork.

Web icons follow the same shape language at a larger size.

## Window chrome

The engine's window system is kept; only its colours and sprites change. A theme file
assigns each window class a role from the palette above, so the reskin is data rather
than code and any window added later inherits it.

States that must be visually distinct, tested at the size they are drawn:

| State | Distinction |
|---|---|
| normal and pressed | fill darkens, content shifts one pixel down and right |
| enabled and disabled | disabled text uses `disabled`, never only a lower opacity |
| unselected and selected tab | selected tab is raised, brighter, and joins the panel |
| warning and normal | an icon plus a colour, never colour alone |

## Where the two sides must agree

* The wordmark and product name.
* The accent colour, which is the one colour a player will associate with the product.
* Icon shape language.
* Spacing rhythm: multiples of four.
* Tone of voice in labels: plain, short, no exclamation marks.
