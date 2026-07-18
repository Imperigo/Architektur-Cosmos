# WEBSITE-SYNC — Vertrag zwischen der Website und KosmoData (PD1, V084-SPEZ §3 E7)

> Kurzdoku, keine Neu-Diagnose. Belegt in `docs/V084-SPEZ.md` §2 D16 und §3 E7
> (bindend). Ändert NICHTS an der Website (Repo-Root) oder an
> `tools/build-kosmodata-seed.mjs` — reine Beschreibung + Verweis.

## 1 · Fakt: die Website IST der Repo-Root

Es gibt kein separates Website-Repo. Der Repo-Root ist ein Next.js-Export;
`src/worker.ts` serviert die Datei `data/mock-entries.json` schreibgeschützt
als `/api/entries.json` (siehe `src/worker.ts:95-97`). `kosmo-orbit/` ist ein
eigenständiger npm-Workspace daneben — unberührt vom Website-Build (siehe
`package.json`-Description).

## 2 · Quelle der Wahrheit + Sync-Richtung

**Quelle der Wahrheit: Root-`data/mock-entries.json`** (112 kuratierte
Referenz-Einträge). Sync-Richtung ist IMMER Repo-Datei → KosmoData-Seed,
nie umgekehrt:

```
Root  data/mock-entries.json
        │  (gelesen von)
        ▼
kosmo-orbit/tools/build-kosmodata-seed.mjs
        │  (schreibt, redigiert nach lib/public-kosmo.ts-Regeln)
        ▼
kosmo-orbit/apps/kosmo-orbit/public/kosmodata-seed.json   ← App-Offline-Seed, im Build gebündelt
```

`build-kosmodata-seed.mjs` (`tools/build-kosmodata-seed.mjs:5-8`) redigiert
beim Bauen dieselben Felder, die die Website selbst für ihre öffentliche
Ansicht in `lib/public-kosmo.ts` schwärzt (gesperrte Medienlizenzen,
interne Pfade, Quell-URLs) — der Seed bleibt ein öffentlicher, kuratierter
Auszug, keine 1:1-Kopie der Rohdaten.

Der zweite, laufzeitseitige Pfad ist rein lesend und schreibt NIE zurück in
die Website:

```
packages/kosmo-data/src/live.ts
  ladeReferenzenLive() → GET https://architekturkosmos.ch/api/entries.json
    Erfolg  → IndexedDB-Cache 'kosmo-data-cache' schreiben, {quelle:'live', …} zurückgeben
    Fehler  → letzten IndexedDB-Cache-Stand zurückgeben, {quelle:'cache', …}
    beides fehlt → null (Aufrufer bleibt beim Offline-Seed)
```

Ein Schreib-Weg App → Website existiert bewusst nicht (`live.ts:1-7`) — das
bräuchte einen eigenen Auth-Entscheid des Owners und ist NICHT Teil dieses
Vertrags.

## 3 · Was NICHT sync-pflichtig ist

- **`kosmo-data-cache` (IndexedDB, `live.ts:35-36`)** — ein reiner
  Laufzeit-Cache des letzten guten Live-Standes, pro Gerät/Browser-Profil.
  Er ist kein eingecheckter Zustand, unterliegt keinem Byte-Diff und wird
  von diesem Gate nicht angerührt. Läuft er einem Live-Stand hinterher,
  löst das lediglich einen neuen Live-Fetch aus — kein Drift-Fall im Sinne
  dieses Vertrags.
- Alles, was `build-kosmodata-seed.mjs` beim Redigieren bewusst entfernt
  (private Pfade, gesperrte Medien-URLs, interne Quellverweise) — das sind
  gewollte Abweichungen vom Rohstand, kein Sync-Fehler.

## 4 · Das Gate: `tools/pruefe-website-sync.mjs`

Teil von `release-gate` (`package.json`, Script-Zeile 23). Reines Node, keine
npm-Dependency (Muster: `tools/release-notiz.mjs`, `tools/secret-scan.mjs`).

Prüft bei jedem Lauf:

1. **Regeneration** — baut den Seed über eine unveränderte Kopie von
   `build-kosmodata-seed.mjs` in einem Temp-Verzeichnis (nie in den echten
   Checkout).
2. **Byte-Diff** — vergleicht das Ergebnis gegen den eingecheckten
   `apps/kosmo-orbit/public/kosmodata-seed.json`. Unterschied → Exit 1 mit
   der Meldung „Seed veraltet — node tools/build-kosmodata-seed.mjs
   ausführen".
3. **Protokoll** — loggt sha256 + Eintragszahl von `../data/mock-entries
   .json` (Nachvollziehbarkeit, welcher Quellstand geprüft wurde).
4. **Drift-Schutz** — prüft zusätzlich, dass jede `id` im eingecheckten Seed
   auch in `mock-entries.json` existiert (unabhängig vom Byte-Diff, fängt
   z.B. einen von Hand nachbearbeiteten Seed).

Reparatur bei Rot: `node tools/build-kosmodata-seed.mjs` ausführen (schreibt
den Seed neu), Diff prüfen, committen.

Selbsttest: `node tools/pruefe-website-sync.test.mjs` (grüner Fall gegen den
echten Checkout, roter Fall gegen einen fabrizierten Fixture-Baum mit
manipuliertem Temp-Seed).

## 5 · Wie die Website deployt (nur Verweis, hier nichts geändert)

Deploy-Ablauf, Build-Pipeline und kritische Config-Dateien der Website stehen
verbindlich in der Root-Doku **`DEPLOYMENT.md`** (Cloudflare Workers,
Auto-Deploy bei Push auf `main`, `next.config.js`/`wrangler.jsonc`). Dieses
Dokument ändert daran nichts — Website-Redesign/-Deploy ist laut
`docs/V084-SPEZ.md` §9 ausdrücklich kein Ziel von PD1.
