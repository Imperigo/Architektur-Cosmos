# Design System

Architecture Cosmos should feel like an inverted architectural drawing in motion, not a marketing site or generic SaaS dashboard.

## Visual Language

- Black background as the primary field.
- White linework as the architectural drawing language.
- Grey construction lines for grid, rings, and secondary marks.
- Thin strokes, measured spacing, restrained labels.
- No decorative gradient blobs, oversized cards, or glossy effects.

## Palette

- Field: `#050505`
- Linework: `#f7f7f4`
- Secondary text: `#b8b8b8`
- Construction line: `#2f2f2f`
- Fine grid: `#8c8c8c`

## Typography

Use system sans-serif for now. The interface should be quiet and legible:

- Small uppercase labels for system orientation.
- Strong but restrained headings.
- Compact detail text.
- No unbounded viewport-scaled typography. Bounded `clamp()` is allowed only
  when the minimum and maximum keep text readable across desktop, weak laptops
  and mobile.
- Follow the mandatory responsive interface rules in
  [`docs/interface-continuity-rulebook.md`](./interface-continuity-rulebook.md).

## Atlas Marks

Entry glyphs should distinguish type without becoming pictograms:

- Building: filled square.
- Urban plan: open square.
- Landscape project: diamond.
- Text: `T`.
- Theory: triangle.
- Map: plus.
- Infrastructure: line.
- Object: dot.
- Event: cross.

## Component Rules

- The atlas itself is unframed and central.
- Detail panels may use bordered, drawing-like surfaces.
- Controls should be compact and literal.
- Labels must remain readable before visual flourish.
- Cards are reserved for repeated items or panels, not page sections.
- Search, Lenses, Database, Dock and Dossier controls must share the same
  sizing tokens, safe-area spacing and touch-target rules.
- Text may never visibly escape an interface block; dynamic text must wrap,
  scroll internally or be intentionally ellipsized.

## Motion

Motion should be minimal. Hover and selection states can use stroke weight, opacity, and small contrast changes. Avoid theatrical animation until the atlas semantics are stable.

## Semantic Zoom Cards

Project information should unfold in the drawing space:

- Image level: a small framed exterior-placeholder close to the point.
- Preview level: four media slots, title, year, one-sentence summary.
- Dossier level: four captioned media slots, metadata, full description.

Cards should remain black/white architectural drawing surfaces, not photo-heavy editorial cards.

## Wormhole Motion

The atlas uses a fixed camera and a looping time-depth model. Scroll input changes the time position, not lateral map position. Year rings behave like the ribs of a tunnel; entries appear on the tunnel net when their year approaches the current ring.
