# KosmoOrbit Navigation Browser Smoke 2026-06-01

Status: passed after static asset guard.

## Ziel

Nach der kompakten Gruppen-Navigation und dem Rueckkehr-Link zum Kosmo-Hub
wurde der gebaute statische `/orbit` Export lokal im In-App-Browser geprueft.
Der Check war lokal und hat keine Cloud-Aktion, keinen Push, keinen Upload und
keine Kosten ausgeloest.

## Befund

Der erste Browser-Aufruf zeigte Inhalt und Links, aber ohne CSS. Ursache:
`out/orbit/index.html` referenzierte `/_next/static/css/...`, waehrend der
lokale Exportordner die statischen Next-Assets nicht vollstaendig enthielt.

Darauf wurde der Build-Pfad abgesichert:

- `npm run build` und `npm run build:fresh` fuehren nach `next build`
  `scripts/next-static-export-assets.mjs` aus.
- Das Skript kopiert fehlende Dateien aus `.next/static` nach
  `out/_next/static`.
- Es prueft danach, dass referenzierte CSS- und JS-Assets wirklich im Export
  existieren.
- `npm run kosmo:orbit-static-smoke` prueft ebenfalls, dass die von `/orbit`
  referenzierten `_next/static` Assets vorhanden sind.

## Testziel

- URL: `http://127.0.0.1:4177/orbit/`
- Quelle: `out/orbit/index.html`
- Viewport: `319 x 998`
- Screenshot: `/private/tmp/kosmo-orbit-navigation-styled-smoke-2026-06-01.png`

## Ergebnis

| Check | Ergebnis |
| --- | --- |
| Seite laedt mit Titel `KosmoOrbit | Architektur Kosmos` | passed |
| CSS ist geladen | passed |
| Rueckkehr-Link `Zurueck zum Kosmo-Hub` ist sichtbar | passed |
| Rueckkehr-Link-Hoehe | 36 px |
| Gruppenlabels `Schnellpfad`, `Pilot`, `System`, `Review`, `Betrieb`, `Rollen` sichtbar | passed |
| Link zu `#pilot-result` sichtbar | passed |
| Navigationslinks | 28 |
| horizontaler Overflow | 0 px |

## Grenze

Dieser Browser-Smoke bestaetigt nur die lokale Darstellung und Asset-Verfuegbarkeit
des statischen Exports. Er ist kein Live- oder Deployment-Nachweis und ersetzt
nicht den Live-Smoke nach einem bewussten Push/Deploy-Go.
