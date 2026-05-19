# Database Research Agents

Architecture Cosmos needs research agents before it needs automatic database
writes. The first version is deliberately conservative: it produces research
packages, source candidates and rights notes, but it does not add entries to the
public atlas by itself.

## Agents

### 1. Historical Architecture Researcher

Purpose: identify historically important buildings, urban plans, landscape
projects, texts, theories, maps, infrastructures, objects and events.

Primary source families:

- ETH course pages and public lecture indexes.
- ETH Research Collection, ETH Library and swisscovery.
- E-Periodica, ETH E-Pics and public archive catalogues.
- ISOS, geo.admin.ch, OpenStreetMap and historic map sources.
- Wikimedia Commons, Europeana and Library of Congress when file-level rights
  are clear.

Typical output:

- project candidates;
- source trails and bibliography;
- course clusters such as `Global History ETH`;
- potential atlas tags: period, typology, region, structure, material, theme;
- rights notes: public, link-only, private review or blocked.

### 2. Contemporary Architecture Researcher

Purpose: identify current and recent projects, especially Swiss and European
architecture, through architecture platforms, office websites and curated
publications.

Primary source families:

- Afasia, espazium, Swiss-Architects, World-Architects, Divisare.
- Office websites as primary metadata sources.
- Swiss journals and project databases when available.
- Material/structure sources such as Lignumdata and Material-Archiv for
  analysis tags.

Typical output:

- project candidates;
- primary office source links;
- publication links and source confidence;
- material, structural and tectonic seed tags;
- rights notes for images, plans, sections and model inputs.

## Rights And Automation Rules

The agents do not scrape private accounts, subscriptions, course portals or
social media. Instagram is treated as a manual hint source only. Magazine and
office images are link-only unless there is explicit permission or a reusable
license.

Public display is allowed only for:

- `own_work`
- `public_domain`
- `licensed`

Everything else remains:

- `link_only`
- `private_review`
- `private_research`

Credits and watermarks do not replace permission.

## Source Registry

The canonical list lives in:

```text
data/research-source-registry.json
```

The registry stores:

- agent ownership;
- source type;
- reliability;
- rights mode;
- automation mode;
- whether the source came from Opera bookmarks, repo research or existing
  project work.

Private or sensitive bookmarks are intentionally excluded.

## Local Tool

Generate a research package without touching the database:

```bash
npm run database:research -- --agent historical --topic "Villa Savoye"
npm run database:research -- --agent current --topic "Kloster Ingenbohl"
npm run database:research -- --agent all --topic "Swiss timber housing"
```

Generate and analyze in one pass:

```bash
npm run database:analyze -- --agent current --topic "Kloster Ingenbohl"
npm run database:research -- --mode analyze --agent historical --topic "Villa Savoye"
```

The tool writes:

```text
out/database-research/{date}/{agent}-{topic}/research-pack.json
out/database-research/{date}/{agent}-{topic}/research-pack.md
out/database-research/{date}/{agent}-{topic}/analysis-pack.json
out/database-research/{date}/{agent}-{topic}/analysis-pack.md
```

This is the intended flow:

```text
Research pack
  -> analysis pack
  -> manual review
  -> rights gate
  -> entry draft
  -> model/media plan
  -> optional reviewed atlas entry
```

No generated candidate becomes public until it passes rights and quality review.

## Quality Scoring

Each candidate should eventually receive:

- source confidence: primary, academic, official, secondary, social hint;
- rights status: display-safe, link-only, private review;
- analysis potential: material, structure, tectonics, typology, site;
- model potential: enough plans/photos, partial, insufficient.

## Next Implementation Step

The current implementation has two modes:

- `research`: source/query pack only;
- `analyze`: source scoring, rights summary, analysis tags, model potential and
  draft recommendation.

Later, if we add a search API key, the same tool can run live discovery and
produce candidate rows. Even then, the database write remains a separate review
step.
