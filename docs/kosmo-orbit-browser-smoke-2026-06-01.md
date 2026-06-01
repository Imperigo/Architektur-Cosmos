# KosmoOrbit Browser Smoke Checkliste 2026-06-01

## Kontext

Diese Notiz beschreibt den naechsten echten Browser-Smoke fuer den gebauten
statischen Export von `/orbit`. Der autonome Batch hat Route-Smoke,
Static-Smoke und Demo-Audit ausgefuehrt. Ein visueller Klicktest in einem
Browser bleibt bewusst als separater Schritt offen.

Lokaler Testserver:

```bash
cd out && python3 -m http.server 3001 --bind 127.0.0.1
```

Getestete URL:

```text
http://127.0.0.1:3001/orbit/
```

## Ergebnis

Status: `pending_browser_tool_or_manual_check`

| Check | Erwartung |
| --- | --- |
| Static server liefert `/orbit/` | `HTTP 200` |
| Haupttitel sichtbar | `KosmoOrbit` |
| Demo-Bereitschaft sichtbar | `human-demo-ready` |
| Rechte-Matrix sichtbar | `generation bleibt gesperrt` |
| Rollenumschaltung sichtbar | Rollenchips sind klickbar |
| Rolle `Entwurfsarchitekt` klickbar | Panel wechselt ohne Reload |
| Demo-Schritt `02 Entwurf prueft Kontext` klickbar | Demo-Pfad wechselt auf Entwurfs-Schritt |
| Sicherheitskopie bleibt sichtbar | `context_review_only` sichtbar |

## Bereits Geprueft

- `npm run kosmo:orbit-route-smoke` prueft die statische Route und die
  wichtigsten Komponenten.
- `npm run kosmo:orbit-static-smoke` prueft den gebauten HTML-Export.
- `npm run kosmo:orbit-demo-audit` prueft Vorfuehrreihenfolge, Navigation,
  Freigabelinie und offensichtliche Render-Artefakte.

## Grenzen

- Noch kein echter Klick-Smoke in einem Browser.
- Noch kein echter Mobile-Smoke.
- Keine externe Live-URL geprueft.
- Keine Cloudflare-, D1-, R2-, Auth- oder Upload-Aktion.
- Kein Push/Publish in diesem Schritt.

## Naechster sinnvoller Schritt

Sobald ein Browser-Tool oder eine manuelle Pruefung verfuegbar ist:

1. `npm run build`
2. `cd out && python3 -m http.server 3001 --bind 127.0.0.1`
3. `http://127.0.0.1:3001/orbit/` oeffnen
4. Checkliste oben durchklicken
5. Ergebnis in dieser Datei auf `passed` oder `blocked` setzen
