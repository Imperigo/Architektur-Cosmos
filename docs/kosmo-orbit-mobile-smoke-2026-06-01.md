# KosmoOrbit Mobile Smoke Checkliste 2026-06-01

## Kontext

Diese Notiz beschreibt den naechsten schmalen Viewport-Smoke fuer den gebauten
statischen `/orbit`-Export. Der aktuelle autonome Batch hat bereits einen
Source-Level-Responsive-Audit ausgefuehrt; ein echter Mobile-/Viewport-Klicktest
im Browser bleibt offen.

Getestete URL:

```text
http://127.0.0.1:3001/orbit/
```

Ziel-Viewport:

```json
{ "width": 390, "height": 844 }
```

## Ergebnis

Status: `pending_browser_tool_or_manual_check`

| Check | Erwartung |
| --- | --- |
| Haupttitel sichtbar | `KosmoOrbit` |
| Demo-Navigation sichtbar | Links umbrechen statt horizontal zu laufen |
| Demo-Bereitschaft sichtbar | `human-demo-ready` sichtbar |
| Rechte-Matrix sichtbar | Karten bleiben lesbar |
| Rollenumschaltung sichtbar | Rollenchips bleiben erreichbar |
| Horizontaler Overflow | kein horizontaler Layoutbruch |
| Sichtbare Buttons/Links | keine zu kleinen Klickziele |
| Rolle `Entwurfsarchitekt` klickbar | Panel wechselt ohne Reload |
| Demo-Schritt `02 Entwurf prueft Kontext` klickbar | Demo-Pfad wechselt auf Entwurfs-Schritt |

## Bereits Geprueft

- `npm run kosmo:orbit-responsive-audit` prueft die `/orbit`-Quellen auf
  min-width-Guards, flex-wrap, responsive Grids und fehlende
  viewport-Fonttricks.
- `npm run kosmo:orbit-static-smoke` prueft, ob die wichtigsten Panels im
  gebauten HTML-Export vorhanden sind.

## Grenzen

- Noch kein echter Klick-Smoke im mobilen Browser.
- Kein echter Touch-Gesten-Test auf physischem Smartphone.
- Keine Safari-/Opera-Mobile-Matrix.
- Keine externe Live-URL geprueft.
- Keine Cloudflare-, D1-, R2-, Auth- oder Upload-Aktion.

## Naechster sinnvoller Schritt

Sobald ein Browser-Tool oder eine manuelle Pruefung verfuegbar ist:

1. `npm run build`
2. `cd out && python3 -m http.server 3001 --bind 127.0.0.1`
3. `http://127.0.0.1:3001/orbit/` bei 390 x 844 px oeffnen
4. Checkliste oben durchklicken
5. Ergebnis in dieser Datei auf `passed` oder `blocked` setzen
