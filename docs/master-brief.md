# Master Brief

Architecture Cosmos is a radial architecture atlas: a website and study tool that organizes architecture as a navigable cosmos of time, style, theory, place, and relation.

The project begins with a conservative MVP:

- Next.js, React, TypeScript, Tailwind CSS.
- SVG-based radial atlas.
- Local JSON mock data.
- No filters, database, CMS, authentication, or backend infrastructure.

The strategic goal is to establish a strong conceptual and technical foundation before adding advanced features.

## Working Name

**Architecture Cosmos**

Previous internal wording such as "Architecture Universe" or "Architektur-Cosmos-Browser" should be treated as early working language. The website identity should now consolidate around Architecture Cosmos.

## Intended Experience

The user lands on a precise, minimal interface and can open the atlas immediately. The atlas shows:

- Concentric time rings.
- Radial architectural style sectors.
- Entry nodes positioned by year and sector.
- A detail panel for the selected entry.

The experience should feel like an architectural drawing system: quiet, legible, and rigorous.

## Product Thesis

Architectural knowledge is not best understood as a flat list. It becomes more useful when shown as a field of relationships across history, theory, urbanism, material, typology, and place.

The atlas should make those relationships spatial without pretending that categories are absolute.

## MVP Success Criteria

- `/` clearly introduces Architecture Cosmos and links to `/atlas`.
- `/atlas` shows the radial atlas as the central experience.
- Entries are not limited to buildings.
- Data remains local and easy to inspect.
- The code stays simple enough to evolve.
- `npm run build` succeeds.
