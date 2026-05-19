# Adaptive Performance Program

Architecture Cosmos should feel smooth on high-end desktops, weak laptops,
Safari, Opera, Chrome and mobile screens. The atlas must therefore adapt its
rendering budget instead of rendering one fixed maximum experience everywhere.

## Performance Tiers

The current frontend uses three runtime tiers:

- `reduced`: narrow screens, coarse pointer/touch, low CPU/memory signals,
  `prefers-reduced-motion`, Safari/Opera-conservative cases or `?perf=reduced`.
- `balanced`: default for normal laptops and browsers.
- `full`: wide desktop, strong CPU/memory signals and non-conservative browser,
  or `?perf=full`.

Manual QA overrides:

```text
/?perf=reduced
/?perf=balanced
/?perf=full
```

## Current Tier Effects

- Node render budget:
  - reduced: 58 visible nodes
  - balanced: 88 visible nodes
  - full: 112 visible nodes
- Wormhole geometry:
  - reduced: fewer spokes, samples, stream lines and speed lines
  - balanced/full: richer tunnel detail
- Relations:
  - reduced: no hover-triggered network overlay, only explicit relations or
    selected dossier context
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

1. Add Playwright/browser visual smoke tests for `/`, `/atlas/`,
   `/atlas/villa-savoye/` and a narrow mobile viewport.
2. Add a small optional debug HUD for current performance tier, node count and
   frame estimate, hidden unless `?debug=motion-dev`.
3. Profile the SVG layer counts in real browsers and reduce expensive filters
   further if Safari/Opera still lag.
4. Split 3D viewer loading behind an interaction gate on mobile if needed.
5. Add asset-size budgets for images and GLB files before large content imports.

## Principle

Performance is part of the design. The atlas should preserve the concept on weak
devices by reducing density, not by becoming broken or visually chaotic.
