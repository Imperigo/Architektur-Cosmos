# Interface Continuity Rulebook

Architecture Cosmos must stay readable, touchable and visually continuous across
desktop browsers, weak laptops, Safari, Opera, Chrome and mobile screens. This
rulebook is mandatory for every UI addition, change or removal.

## External Baselines

- WCAG 2.2 target-size minimum: interactive targets should be at least 24 by 24
  CSS pixels, with larger targets preferred for touch UI.
- W3C Reflow: layouts must remain usable at 320 CSS pixels wide without
  horizontal scrolling for normal content.
- Apple HIG: touch controls should provide about 44 by 44 points of usable hit
  area.
- Android/Material accessibility guidance: touch targets should be about 48 by
  48 dp, with spacing between neighboring targets.
- MDN guidance: use media queries, container queries, bounded `clamp()`, dynamic
  viewport units and `overflow-wrap` to keep responsive UI robust.

References:
[W3C Target Size Minimum](https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum),
[W3C Reflow](https://www.w3.org/WAI/WCAG21/Understanding/reflow),
[Apple Buttons](https://developer.apple.com/design/human-interface-guidelines/buttons),
[Apple Typography](https://developer.apple.com/design/human-interface-guidelines/typography),
[Android Touch Target Size](https://support.google.com/accessibility/android/answer/7101858?hl=en),
[MDN Media Queries](https://developer.mozilla.org/en-US/docs/Web/CSS/Guides/Media_queries),
[MDN Container Queries](https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_container_queries),
[MDN overflow-wrap](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Properties/overflow-wrap),
[MDN viewport units](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Values/length).

## Core Rules

- Use tokens only. New buttons, panels, text, spacing and touch targets must use
  the shared `--ui-*` and `--cosmos-hud-*` tokens in `app/globals.css`.
- Touch first, desktop compact. Desktop visual controls must be at least 36 px
  high with a 44 px hit area; mobile/coarse-pointer controls must be at least
  44 px high with a 48 px hit area.
- Text never escapes. UI containers must use `min-width: 0`,
  `overflow-wrap: anywhere`, safe line-height and internal scroll regions.
  Avoid `white-space: nowrap` except for secondary decorative labels.
- Type has hard limits. Mobile body/input text should be 14-16 px, mobile button
  text 12-14 px, mobile labels 11-12 px. Desktop UI text should not drop below
  10 px for interactive controls.
- Panels must fit. Mobile panels may not exceed `92vw` or `78dvh`, must respect
  `safe-area-inset-*`, and must scroll internally.
- SVG UI must opt into responsive sizing. `foreignObject`, HUD, dock and dossier
  elements must use the atlas UI metrics helper rather than ad hoc scale values.
- Keep locations stable. Lenses live left, Search lives right, Database lives
  bottom-right, Dock lives bottom-center. Equivalent controls share height,
  active states, spacing and motion.
- Reduce effects on fragile browsers. Mobile, Safari and Opera should avoid
  heavy blur, glow and animated filter work. Prefer `transform` and `opacity`.

## Token Table

| Token | Purpose |
|---|---|
| `--ui-safe-edge` | Minimum screen edge spacing including safe areas. |
| `--ui-hit-min` | Minimum desktop hit area. |
| `--ui-hit-touch` | Minimum touch hit area. |
| `--ui-trigger-h` | Shared trigger height for Search/Lenses/Database-style controls. |
| `--ui-trigger-min-w` | Shared trigger width floor. |
| `--ui-panel-max-w` | Maximum readable panel width. |
| `--ui-panel-max-h` | Maximum panel height before internal scroll. |
| `--ui-gap` | Standard UI gap. |
| `--ui-font-control` | Button/control text size. |
| `--ui-font-body` | Panel body/input text size. |
| `--ui-font-label` | Panel label/meta text size. |

## Do / Do Not

- Do reuse `.cosmos-trigger`, `.cosmos-panel`, `.cosmos-scroll-panel`,
  `.cosmos-touch-target` and `.cosmos-text-safe`.
- Do use internal scrolling for any panel that can contain dynamic text.
- Do test at 320 px width and at 200% browser zoom before publishing major UI.
- Do keep mobile panels less dense than desktop panels.
- Do not place long dynamic text in fixed-width SVG text without wrapping or
  ellipsis.
- Do not create one-off button heights, panel widths or breakpoints.
- Do not rely on hover as the only way to reveal essential controls.
- Do not animate layout-affecting properties during scroll/zoom.

## QA Checklist

- `/atlas/`: intro, touch travel, pinch, Dock, Lenses, Search, Database and
  project dossier work at 320, 360, 390, 430, 768, 1366 and 1440 px widths.
- `/atlas/villa-savoye/` and `/atlas/alterszentrum-kloster-ingenbohl/`: detail
  pages, 3D viewer controls and Search remain readable.
- Safari, Opera and Chrome show no horizontal page drift during zoom/travel.
- 200% browser zoom keeps all controls reachable and all panel text contained.
- No visible button is smaller than the target-size rules above.
- No visible UI text overflows its block.
