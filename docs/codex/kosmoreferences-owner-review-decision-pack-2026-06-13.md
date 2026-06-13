# KosmoReferences Owner Review Decision Pack

Datum: 2026-06-13

Dieses Paket bereitet Entscheidungen vor. Es promoted nichts automatisch.

## 1. Villa Savoye Bildkandidaten

Diese drei Dateien sind Kandidaten, bleiben aber bis Owner/Human Review
`public_ready=false`:

| Datei | Vorschlag |
| --- | --- |
| `savoye-3-exterior-cc0.jpg` | Freigabe moeglich, wenn Wikimedia-CC0-Seitenstand nochmals bestaetigt wird |
| `villa-savoye-loc-exterior.jpg` | Freigabe moeglich mit LOC/Balthazar-Korab-Credit und bestaetigtem Rights Advisory |
| `villa-savoye-chaise-longue-interior-cc-by-sa-2.jpg` | Nur freigeben, wenn CC BY-SA 2.0 Attribution und ShareAlike-Pflichten akzeptiert werden |

## 2. Villa Savoye weiter blockiert

- `villa-savoye-loc-exterior-crop.jpg`
- `villa-savoye-ground-floor-diagram.svg`
- `villa-savoye-long-section-diagram.svg`
- `public/archive-models/villa-savoye/low.glb`

Default: blockiert lassen, bis Derivat-/Geometriebasis reviewed ist.

## 3. Modell-Promotion

Dry-run Status:

| Entry | Score | Dry-run | Public jetzt |
| --- | ---: | --- | --- |
| Villa Savoye | 92 | `ready_for_owner_confirmation` | nein |
| Ingenbohl | 100 | `ready_for_owner_confirmation` | nein |

Erst nach Owner Review:

```bash
npm run brain:promote-model -- --entry villa-savoye --confirm-public-model
npm run brain:promote-model -- --entry alterszentrum-kloster-ingenbohl --confirm-public-model
```

## 4. Sogn Benedetg

Status: Link-only, keine lokalen Medien/Modelle. Default: nicht promoten, bis
die grosse private Bibliothek oder eigene review-only Studienassets verfuegbar
sind.

## Guardrail

Public-ready nach diesem Paket: 0.
