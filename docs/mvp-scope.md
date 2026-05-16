# MVP Scope

The first MVP tests the foundation of Architecture Cosmos, not the full product.

## In Scope

- Next.js app with `/` and `/atlas`.
- React and TypeScript components.
- Tailwind CSS for interface styling.
- SVG-based radial atlas.
- Local JSON mock data.
- Entry-based data model.
- Entry detail panel.
- Basic hover and selected states.
- Concentric time rings.
- Radial style sectors.
- Conservative black/white architectural drawing style.

## Out of Scope

- Filters.
- Search.
- Authentication.
- Database.
- CMS.
- Backend infrastructure.
- User profiles.
- Saved collections.
- PixiJS, canvas, or WebGL atlas rendering.
- AI content generation.

## Foundation Phase Priorities

1. Clarify the concept.
2. Stabilize the data model.
3. Make `/atlas` visually and technically coherent.
4. Keep the implementation easy to inspect.
5. Expand mock data only when it improves the atlas structure.

## Next MVP Milestones

### Milestone 1: Foundation

Docs, data primitives, atlas geometry, and visual grammar are aligned.

### Milestone 2: Density

Add enough local entries to test crowding, labels, and sector balance.

### Milestone 3: Relations

Introduce simple relation data and an optional relation overlay.

### Milestone 4: Navigation

Add zoom and pan once the static atlas remains readable.

### Milestone 5: Discovery

Only then consider filters, search, or curated lenses.
