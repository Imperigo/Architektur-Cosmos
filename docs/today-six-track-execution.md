# Today Six-Track Execution

This document turns the current Architecture Cosmos roadmap into today-sized
work packages. It keeps the project moving while preserving the current safety
rules: no live auth, no public uploads, no live D1/R2 writes, and no aggressive
external pentesting.

## 1. Atlas UX

Status: live and usable as a semantic wormhole atlas.

Today:

- keep the SVG wormhole interaction stable;
- test start, zoom, lenses, search, database and dossier on live desktop;
- only fix small stability issues such as button alignment, text overflow or
  broken click targets.
- run the adaptive performance program across weak laptops, Safari, Opera,
  Chrome and mobile/narrow viewports.

Done criteria:

- `/`, `/atlas/`, Villa Savoye and Ingenbohl load on production;
- Lenses, Search and Database are reachable;
- Dossier opens from an atlas object.
- `?perf=reduced`, `?perf=balanced` and `?perf=full` keep the atlas usable with
  different render budgets.

## 2. Database / Private Library

Decision for V1: start with **admin-only Cloudflare Access** before public user
accounts. Public user accounts come later after the upload/review pipeline is
proven.

Today:

- keep the Database UI labelled as browser-session-only;
- maintain the private library as an architecture/specification track;
- do not implement real browser persistence yet.

Next implementation target:

- protected Worker API behind Access;
- D1 private draft tables;
- R2 quarantine bucket;
- review queue and rights gate before public publishing.

## 3. Security / Firewall

Status: security headers and `security.txt` are live. Local `security:check`
passes. GitHub workflow publishing is confirmed: the current token can push
workflow files, and CI plus the weekly update scout are now committed on `main`.

Today:

- use the Cloudflare dashboard checklist in `docs/security-hardening-plan.md`;
- keep external testing passive and conservative;
- monitor the first GitHub Actions runs and fix CI only if the remote
  environment differs from local.
- use the `Live Security Headers` workflow as a daily passive production check.

Recommended Cloudflare order:

1. SSL/HTTPS-only.
2. WAF managed rules.
3. Bot protection.
4. Future `/api/*` rate-limit rules.
5. Turnstile site key reserved for future forms.
6. Cloudflare Access for future admin/private routes.

## 4. AI Archive Automation

Decision for today: use **Villa Savoye** as the first full automation pilot
because it already has media, model data and a procedural massing template.
Use **Alterszentrum Kloster Ingenbohl** as the second source-only/private-research
pilot to test how the pipeline behaves when sources exist but rights-reviewed
plans, images and geometry are not yet available.

Today:

- run local-only automation commands for Villa Savoye;
- run local-only automation commands for Ingenbohl as a source-only pilot;
- inspect generated outputs in `out/` and `archive-intake/`;
- do not upload anything to Cloudflare.

Done criteria:

- capture, rights gate, model plan and model generation run locally;
- generated next-actions identify the next manual review step.

Progress:

- Villa Savoye autopilot passes locally from capture through model generation.
- The model-plan asset resolver now recognizes public pilot media under
  `public/archive-media`, so exterior, interior, section and plan slots are
  correctly available for the next Blender/analysis pass.
- Ingenbohl autopilot passes locally through capture, model-plan, rights-gate
  and asset-manifest. Model generation is correctly skipped because no
  rights-reviewed plan/section basis or procedural template exists yet.
- The model-plan next-actions are now project-sensitive: Villa Savoye keeps its
  five-points sequence, while source-only pilots receive rights/geometry-first
  instructions.

## 5. 3D / Gaussian Splat / Blender-ArchiCAD

Decision for today: improve and test the analytical GLB workflow first. Gaussian
splat remains a rights-clean reality layer, not the canonical model.

Today:

- confirm Villa Savoye GLB generation works;
- keep layer names aligned with site, mass, low, structure and tectonic;
- use Blender profile output as the bridge to future Claude-in-Blender testing.
- make the project detail page treat the 3D/model viewer as the primary
  analysis object, ahead of generic filters;
- add material investigation as a first-class viewer/filter layer;
- run `archive:media-quality` to score exterior, interior, section and plan
  slots before trusting them as 3D/model inputs;
- improve image-identification expectations: current static UI is only
  filename/context matching, while real project recognition requires a private
  vision model or server-side API behind auth.

Deferred:

- Gaussian splat training until own/licensed video frames exist;
- IFC/ArchiCAD exchange until the reviewed GLB layer structure is stable.
- true visual building recognition until the private upload/vision pipeline is
  protected by auth, quarantine, rights gate and API-key isolation.

## 6. Content / Pilot Entries

Today’s pilot priorities:

1. Villa Savoye: 3D/analysis reference pilot.
2. Alterszentrum Kloster Ingenbohl: contemporary Swiss transformation pilot.
3. Flower House: Afasia/source-rights pilot.
4. Glass House: comparison/typology relation target.
5. Farnsworth House: comparison/typology relation target.
6. Unité d’Habitation: modern housing/study path target.
7. Salk Institute: landscape/institutional relation target.
8. Centre Pompidou: infrastructure/tectonic relation target.
9. Parc de la Villette: landscape/theory relation target.
10. Bruder Klaus Field Chapel: material/atmosphere analysis target.

Done criteria:

- pilots have clear status labels: source, media, rights, model, analysis;
- no mass import until the pilot standard is stronger.

## Today Test Gate

Run before any commit or publish:

```bash
npm run archive:validate
npm run security:check
npm run security:headers
npm run lint
npm run build
```

Browser/live smoke:

- `https://architekturkosmos.ch/`
- `https://architekturkosmos.ch/atlas/`
- `https://architekturkosmos.ch/atlas/villa-savoye/`
- `https://architekturkosmos.ch/atlas/alterszentrum-kloster-ingenbohl/`
