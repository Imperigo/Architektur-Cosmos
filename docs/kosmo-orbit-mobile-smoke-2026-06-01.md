# KosmoOrbit Mobile Smoke 2026-06-01

## Kontext

Diese Notiz dokumentiert den schmalen Viewport-Smoke fuer den gebauten
statischen `/orbit`-Export. Der autonome Batch hat den Source-Level-
Responsive-Audit und einen echten 390px-In-App-Browser-Klicktest ausgefuehrt.

Getestete URL:

```text
http://127.0.0.1:4173/orbit/
```

Ziel-Viewport:

```json
{ "width": 390, "height": 844 }
```

## Ergebnis

Status: `passed`

| Check | Erwartung | Ergebnis |
| --- | --- | --- |
| Haupttitel sichtbar | `KosmoOrbit` | `passed` |
| Demo-Navigation sichtbar | Links umbrechen statt horizontal zu laufen | `passed` |
| Vision Bridge sichtbar | `Orchestrierung vor Generierung` | `passed` |
| Demo-Bereitschaft sichtbar | `human-demo-ready` sichtbar | `passed` |
| Pilot-Runbook sichtbar | `45-60 Minuten` sichtbar | `passed` |
| Pilot-Session sichtbar | `before null - after null` sichtbar | `passed` |
| Live-Gate sichtbar | `no-push-without-owner-go` sichtbar | `passed` |
| Rechte-Matrix sichtbar | Karten bleiben lesbar | `passed` |
| Rollenumschaltung sichtbar | Rollenchips bleiben erreichbar | `passed` |
| Horizontaler Overflow | kein horizontaler Layoutbruch | `0 px` |
| Sichtbare Buttons/Links | keine zu kleinen Klickziele | `0 unter 32 px` |

## Bereits Geprueft

- `npm run kosmo:orbit-responsive-audit` prueft die `/orbit`-Quellen auf
  min-width-Guards, flex-wrap, responsive Grids und fehlende
  viewport-Fonttricks.
- `npm run kosmo:orbit-static-smoke` prueft, ob die wichtigsten Panels im
  gebauten HTML-Export vorhanden sind.
- In-App-Browser-Smoke bei 390 x 844 px bestaetigt: `scrollWidth === clientWidth`,
  keine zu kleinen sichtbaren Buttons/Links, Pilot-Runbook sichtbar,
  Pilot-Session sichtbar und Live-Gate sichtbar.
- Nach der Vision Bridge bestaetigt der 390px-Smoke weiter: Vision-Navigation
  sichtbar, kein horizontaler Overflow und keine sichtbaren Buttons/Links unter
  32 px.

## Grenzen

- Kein echter Touch-Gesten-Test auf physischem Smartphone.
- Keine Safari-/Opera-Mobile-Matrix.
- Keine externe Live-URL geprueft.
- Keine Cloudflare-, D1-, R2-, Auth- oder Upload-Aktion.

## Naechster sinnvoller Schritt

Wenn `/orbit` live gepusht wird, sollte danach ein kurzer Live-Smoke mit
Cache-Buster folgen. Danach kann der Fokus wieder auf KosmoData/KosmoAsset
oder auf das naechste Orbit-Panel gelegt werden.
