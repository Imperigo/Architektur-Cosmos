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

Done criteria:

- `/`, `/atlas/`, Villa Savoye and Ingenbohl load on production;
- Lenses, Search and Database are reachable;
- Dossier opens from an atlas object.

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
passes.

Today:

- use the Cloudflare dashboard checklist in `docs/security-hardening-plan.md`;
- keep external testing passive and conservative;
- keep workflow files local until a GitHub token with `workflow` scope exists.

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
Ingenbohl stays the contemporary Swiss pilot for later manual/source review.

Today:

- run local-only automation commands for Villa Savoye;
- inspect generated outputs in `out/` and `archive-intake/`;
- do not upload anything to Cloudflare.

Done criteria:

- capture, rights gate, model plan and model generation run locally;
- generated next-actions identify the next manual review step.

## 5. 3D / Gaussian Splat / Blender-ArchiCAD

Decision for today: improve and test the analytical GLB workflow first. Gaussian
splat remains a rights-clean reality layer, not the canonical model.

Today:

- confirm Villa Savoye GLB generation works;
- keep layer names aligned with site, mass, low, structure and tectonic;
- use Blender profile output as the bridge to future Claude-in-Blender testing.

Deferred:

- Gaussian splat training until own/licensed video frames exist;
- IFC/ArchiCAD exchange until the reviewed GLB layer structure is stable.

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
npm run lint
npm run build
```

Browser/live smoke:

- `https://architekturkosmos.ch/`
- `https://architekturkosmos.ch/atlas/`
- `https://architekturkosmos.ch/atlas/villa-savoye/`
- `https://architekturkosmos.ch/atlas/alterszentrum-kloster-ingenbohl/`
