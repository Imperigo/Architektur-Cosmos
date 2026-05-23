# Adaptive Performance Program

Architecture Cosmos should feel smooth on high-end desktops, weak laptops,
Safari, Opera, Chrome and mobile screens. The atlas must therefore adapt its
rendering budget instead of rendering one fixed maximum experience everywhere.

## Performance Tiers

The current frontend uses three runtime tiers:

- `reduced`: narrow screens, coarse pointer/touch, low CPU/memory signals,
  `prefers-reduced-motion` or `?perf=reduced`.
- `balanced`: default for normal laptops and browsers.
- `full`: wide desktop, strong CPU/memory signals and non-conservative browser,
  or `?perf=full`.

Safari and Opera now receive a separate browser guard via
`html[data-cosmos-browser="safari"|"opera"]`: they can stay in `balanced` on
capable desktop hardware, but expensive blur/filter/mix-blend effects are
reduced. Weak devices in those browsers still fall back to `reduced`.

Manual QA overrides:

```text
/?perf=reduced
/?perf=balanced
/?perf=full
```

## Current Tier Effects

- Node render budget:
  - reduced: 36 visible nodes idle / 18 while moving
  - balanced: 64 visible nodes idle / 34 while moving
  - full: 96 visible nodes idle / 56 while moving
- Node rendering:
  - moving/reduced mode uses fast glyphs without miniature detail lines,
    preview cards, inline media or floating labels.
  - idle mode restores richer thumbnails and selected/source labels.
- Tunnel rendering:
  - Canvas renders the wormhole background, rings, grid and energy bands.
  - SVG is reserved for UI, text, project nodes, labels, relations and selected
    dossier surfaces.
- Wormhole geometry:
  - reduced: fewer spokes, samples, stream lines and speed lines
  - balanced/full: richer tunnel detail
- Relations:
  - reduced: no relation overlay
  - balanced/full: relations render only when idle and explicitly requested,
    selected or focused
- 3D viewer:
  - reduced: lower pixel ratio, no antialiasing, default power preference
  - balanced/full: higher pixel ratio and antialiasing
- CSS:
  - reduced: hides expensive decorative streams/glows and disables more
    animations/filters
- mobile/coarse pointer: smaller HUD, safer overlay positions and scrollable
  model controls
- Atlas touch travel:
  - one-finger vertical swipe moves through the wormhole timeline
  - two-finger pinch maps to atlas travel instead of browser page zoom
  - overlays keep native vertical scrolling and do not trigger tunnel travel
  - the custom desktop crosshair is hidden on coarse-pointer devices

## Browser QA Matrix

Minimum manual checks before major publish:

| Target | URL | Expected |
|---|---|---|
| Desktop Chrome | `/?perf=full` | richest tunnel, smooth zoom |
| Desktop Safari | `/?perf=balanced` or automatic | no page scroll, no heavy lag |
| Desktop Opera | `/?perf=balanced` or automatic | wheel zoom does not move page |
| Weak laptop simulation | `/?perf=reduced` | stable motion, no flicker |
| Mobile narrow viewport | `/?perf=reduced` | panels fit, HUD reachable |
| Mobile Opera/Safari/Chrome | `/atlas/?perf=reduced` | one-finger travel and two-finger pinch move the atlas, not the page |
| Detail page | `/atlas/villa-savoye/` | 3D viewer controls usable |

## Next Optimization Steps

1. Run a dedicated smartphone UI redesign pass. Current performance is improved,
   but HUD and overlay proportions still need a separate touch-first layout
   treatment.
2. Add Playwright/browser visual smoke tests for `/`, `/atlas/`,
   `/atlas/villa-savoye/` and a narrow mobile viewport.
3. Add a small optional debug HUD for current performance tier, node count and
   frame estimate, hidden unless `?debug=motion-dev`.
4. Profile the SVG layer counts in real browsers and reduce expensive filters
   further if Safari/Opera still lag.
5. Split 3D viewer loading behind an interaction gate on mobile if needed.
6. Add asset-size budgets for images and GLB files before large content imports.

## Principle

Performance is part of the design. The atlas should preserve the concept on weak
devices by reducing density, not by becoming broken or visually chaotic.
