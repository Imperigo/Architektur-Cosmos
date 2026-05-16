# Interface Concept

Architecture Cosmos has two MVP screens:

- `/`: project entry and direct link to the atlas.
- `/atlas`: the radial atlas experience.

## Homepage

The homepage should name the project, state the promise, and point clearly to `/atlas`. It should not become a marketing funnel before the atlas itself is mature.

## Atlas

The atlas is the primary interface. It consists of:

- A fixed-center time wormhole.
- Dynamic year rings that form the wormhole body.
- Radial style sectors as longitudinal tunnel seams.
- Entry nodes placed by year and sector.
- Semantic entry nodes that change detail level while zooming.
- Minimal status text that confirms the MVP is local and SVG-based.

## Interaction

Current MVP interaction:

- Hover an entry node to reveal a lightweight label.
- Click or keyboard-select an entry node.
- Read the selected entry in the detail panel.
- Read a short list of relations connected to the selected entry.
- Toggle the relation overlay on or off.
- Travel through history with the controls or mouse wheel.
- The camera stays fixed on the center; there is no lateral panning.
- Click a node to select it without forcing a detail level.
- Read project detail directly inside the zoomable atlas space.

The journey loops: zooming inward moves from the present toward deep history; after the deepest point, continued inward zoom visually moves back outward through time.

Near-future interaction:

- Improve relation readability as the dataset grows.
- Refine label density and cluster behavior with larger entry sets.
- Add source trails and curated study paths.
- Add filters only after entry taxonomy and relation logic are proven.

## Interface Boundaries

Do not add search, filters, authentication, database, CMS, user accounts, or editing flows in the foundation phase.

The early interface should answer one question well: can the atlas make architectural knowledge feel spatial, legible, and expandable?
