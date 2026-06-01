# KosmoOrbit Browser Smoke 2026-06-01

## Kontext

Diese Notiz dokumentiert den echten Browser-Smoke fuer den gebauten statischen
Export von `/orbit`. Der autonome Batch hat Route-Smoke, Static-Smoke,
Demo-Audit und einen In-App-Browser-Sichttest ausgefuehrt.

Lokaler Testserver:

```bash
python3 -m http.server 4173 -d out
```

Getestete URL:

```text
http://127.0.0.1:4173/orbit/
```

## Ergebnis

Status: `passed`

| Check | Erwartung | Ergebnis |
| --- | --- | --- |
| Static server liefert `/orbit/` | `HTTP 200` | `passed` |
| Haupttitel sichtbar | `KosmoOrbit` | `passed` |
| Vision Bridge sichtbar | `Orchestrierung vor Generierung` | `passed` |
| Demo-Bereitschaft sichtbar | `human-demo-ready` | `passed` |
| Pilot-Runbook sichtbar | `45-60 Minuten` | `passed` |
| Live-Gate sichtbar | `no-push-without-owner-go` | `passed` |
| Rechte-Matrix sichtbar | `generation bleibt gesperrt` | `passed` |
| Desktop-Viewport | 1440 x 900 ohne horizontalen Overflow | `passed` |
| Mobile-Viewport | 390 x 844 ohne horizontalen Overflow | `passed` |
| Sichtbare Buttons/Links | keine Klickziele unter 32 px | `passed` |
| Sicherheitskopie bleibt sichtbar | `context_review_only` sichtbar | `passed` |

## Bereits Geprueft

- `npm run kosmo:orbit-route-smoke` prueft die statische Route und die
  wichtigsten Komponenten.
- `npm run kosmo:orbit-static-smoke` prueft den gebauten HTML-Export.
- `npm run kosmo:orbit-demo-audit` prueft Vorfuehrreihenfolge, Navigation,
  Freigabelinie und offensichtliche Render-Artefakte.
- In-App-Browser-Smoke hat die Demo-Navigation mit Pilotplan und Live-Gate
  bestaetigt.
- Desktop-Smoke bei 1440 x 900 px bestaetigt: `scrollWidth === clientWidth`,
  Pilot-Runbook sichtbar, Live-Gate sichtbar und keine Klickziele unter 32 px.
- Mobile-Smoke bei 390 x 844 px bestaetigt: `scrollWidth === clientWidth`,
  Pilot-Runbook sichtbar, Live-Gate sichtbar und keine Klickziele unter 32 px.

## Grenzen

- Kein echter Touch-Gesten-Test auf physischem Smartphone.
- Keine externe Live-URL geprueft.
- Keine Cloudflare-, D1-, R2-, Auth- oder Upload-Aktion.
- Kein Push/Publish in diesem Schritt.

## Naechster sinnvoller Schritt

Als naechstes kann entweder bewusst ueber Push/Live entschieden werden oder
lokal weiter an Interaktion, KosmoDesign-Handoff und Pilotprojekt-Inputs
gearbeitet werden.
