# Architecture Cosmos Foundation

Architecture Cosmos is a radial knowledge atlas for architecture. It is not a simple portfolio, archive list, or map of famous buildings. The project treats architectural history as a navigable field where buildings, plans, texts, theories, objects, maps, infrastructures, landscapes, and events can be read together.

The first product promise is simple: a person should be able to enter the atlas, see time and architectural thought arranged as a spatial system, click an entry, and understand why that entry belongs in the wider cosmos.

## Core Idea

The atlas combines three forms of orientation:

1. Time as concentric rings.
2. Architectural families as radial sectors.
3. Knowledge entries as points that can later connect into relations, paths, and thematic lenses.

This makes the interface closer to a drawing table than a dashboard. It should feel precise, quiet, and expandable.

The atlas also follows a semantic zoom principle: zooming in does not only enlarge marks, it reveals richer forms of knowledge. A project changes from point, to image point, to preview, to dossier.

## Product Principles

- Start with the atlas, not with a landing page.
- Treat every item as an entry, not only as a project.
- Derive position from data whenever possible.
- Keep the MVP local, inspectable, and frontend-only.
- Prefer legibility over spectacle.
- Use black, white, and grey like an architectural drawing.
- Add filters, search, CMS, database, and authentication only after the core field is stable.

## Core Primitives

### Entry

The main unit of knowledge. An entry can be a building, urban plan, landscape project, text, theory, map, infrastructure, object, or event.

### Time Ring

A concentric historical reference ring. The current MVP uses selected anchor years rather than a perfectly linear chronology, because architectural history has dense periods that need visual space.

### Style Sector

A radial field for architectural orientation. Sectors are not rigid academic categories; they are broad atlas regions that help the user navigate.

### Relation

A future connection between entries. Relations should describe influence, reaction, reference, typology, material lineage, shared author, shared theme, or historical dependency.

### Lens

A future interpretive mode. A lens can emphasize time, typology, climate, urbanism, theory, material, pedagogy, or personal study paths. Lenses are not part of the first MVP UI.

### Semantic Zoom Level

The amount of information shown for an entry based on camera scale and distance from the viewport center.

- Global: atlas, rings, sectors, points.
- Image: point plus primary image placeholder.
- Preview: four media slots, title, and one-sentence summary.
- Dossier: four captioned media slots and full project description.

## Foundation Decisions

- Entry data stays in `data/mock-entries.json` until the schema and interaction model have proven themselves.
- Atlas coordinates are layout output, not primary content. Data should store year and sector; geometry should calculate radius and angle.
- The homepage should introduce Architecture Cosmos clearly and send users to `/atlas`.
- `/atlas` is the main experience.
- Visual complexity should come from the structure of the atlas, not from decorative effects.

## Near-Term Build Order

1. Stabilize the foundation docs, data schema, visual grammar, and MVP scope.
2. Expand local mock entries across periods and entry types.
3. Add relation data and a simple optional relation overlay.
4. Improve node collision handling and label strategy.
5. Add zoom and pan only after the static SVG atlas is readable.
6. Refine relation readability, labels, and density with a larger dataset.
7. Add filters and search later, once the primitives are settled.

## Not Yet

These are intentionally deferred:

- Database or CMS.
- Authentication.
- User accounts or saved collections.
- Search and filters.
- PixiJS or canvas rendering.
- AI-generated content flows.
- Complex editing tools.

The project earns those layers only after the atlas itself works as a meaningful knowledge space.
