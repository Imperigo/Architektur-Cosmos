# Kosmo Project Package Examples

This folder contains local-only examples for the Kosmo MVP 0.1 project package contract.

- `kosmo-demo-001/` is the first minimal package connecting Kosmo Prepare, Data, Orbit, Design, Draw, Viz, Publish and Zentrale.
- The package manifest is validated against `/schema/kosmo-project-package.schema.json`.
- Example content is intentionally small and review-oriented. It is not public project data and not a production upload source.

Create a new local review-only package outside Git:

```bash
npm run kosmo:package-create -- --name "Test Atelier" --address "Zurich" --program "Studio:48, Library:18"
```

By default the generated package is written to `archive-intake/kosmo-projects/`,
which is gitignored. Use this for real or private projects. Keep `examples/`
for small public-safe fixtures only.

Regenerate a local publish review pack:

```bash
npm run kosmo:package-review -- --project examples/kosmo-projects/kosmo-demo-001
```
