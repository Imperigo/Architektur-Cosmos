# KosmoOrbit Browser Smoke 2026-06-01

## Kontext

Diese Notiz dokumentiert den echten Browser-Smoke fuer den gebauten statischen
Export von `/orbit`. Der autonome Batch hat Route-Smoke, Static-Smoke,
Demo-Audit und einen In-App-Browser-Klicktest ausgefuehrt.

Lokaler Testserver:

```bash
cd out && python3 -m http.server 3001 --bind 127.0.0.1
```

Getestete URL:

```text
http://127.0.0.1:3001/orbit/
```

## Ergebnis

Status: `passed`

| Check | Erwartung | Ergebnis |
| --- | --- | --- |
| Static server liefert `/orbit/` | `HTTP 200` | `passed` |
| Haupttitel sichtbar | `KosmoOrbit` | `passed` |
| Vision Bridge sichtbar | `Orchestrierung vor Generierung` | `passed` |
| Demo-Bereitschaft sichtbar | `human-demo-ready` | `passed` |
| Rechte-Matrix sichtbar | `generation bleibt gesperrt` | `passed` |
| Rollenumschaltung sichtbar | Rollenchips sind klickbar | `passed` |
| Rolle `Entwurfsarchitekt` klickbar | Panel wechselt ohne Reload | `passed` |
| Demo-Schritt `02 Entwurf prueft Kontext` klickbar | Demo-Pfad wechselt auf Entwurfs-Schritt | `passed` |
| Sicherheitskopie bleibt sichtbar | `context_review_only` sichtbar | `passed` |

## Bereits Geprueft

- `npm run kosmo:orbit-route-smoke` prueft die statische Route und die
  wichtigsten Komponenten.
- `npm run kosmo:orbit-static-smoke` prueft den gebauten HTML-Export.
- `npm run kosmo:orbit-demo-audit` prueft Vorfuehrreihenfolge, Navigation,
  Freigabelinie und offensichtliche Render-Artefakte.
- In-App-Browser-Smoke hat die Vision Bridge mit KosmoZentrale,
  KosmoPrepare, KosmoDesign, KosmoDraw/Viz/Publish und KosmoData/KosmoAsset
  bestaetigt.
- In-App-Browser-Smoke hat `Entwurfsarchitekt` und `02 Entwurf prueft Kontext`
  geklickt und die erwarteten Texte bestaetigt.

## Grenzen

- Noch kein echter Mobile-Smoke.
- Keine externe Live-URL geprueft.
- Keine Cloudflare-, D1-, R2-, Auth- oder Upload-Aktion.
- Kein Push/Publish in diesem Schritt.

## Naechster sinnvoller Schritt

Als naechstes folgt ein schmaler Mobile-/Viewport-Smoke fuer `/orbit`, damit
die Demo-Navigation, Rechte-Matrix und Rollenkarten auch in engeren Layouts
lesbar bleiben.
