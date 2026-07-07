# V2-Technik Block 2 — Auftragsbuch → Ausführung (Buildplan, Fable)

> Chefdenker-Plan (Fable, 07.07.2026) für Priorität 3 aus `V2-AUFTAKT.md`:
> «der Owner spricht die Verbesserung, zeigt wo, ein Worker liest die
> Workorder und arbeitet sie ab». Grundlage: die faktenbasierte Landkarte des
> Ist-Stands (Explore 07.07.) — Erfassung/Persistenz/Export sind fertig
> (ROADMAP P3), der Kreis bricht heute am Browser-Download ab: kein
> Repo-Schreibpfad aus der PWA, kein Worker-Backend, kein Rückkanal.

## 1. Architektur-Entscheide (bindend)

**E1 — Transport über die Bridge, nicht übers Dateisystem.** Die PWA kann
nicht ins Repo schreiben; die einzige Naht mit Dateisystemzugriff, die der
Client erreichen darf (CSP: localhost, Token-Header), ist die
HomeStation-Bridge. Die Workorder wird darum ein **Bridge-Job-Typ `dev-`**
im bestehenden Job-Store — dieselbe Mechanik wie Render/Splat/Blender-Sim
(Record im Store, Status-Lebenszyklus, Token-Pflicht, Grössen-Deckel).
Kein Kernel-Command: Aufträge leben bewusst ausserhalb von Doc/Undo/Yjs
(bestätigter Ist-Zustand, bleibt so).

**E2 — Contract `kosmodev.workorder/v1`, append-only.** Neu in
`@kosmo/contracts` (`bridge-api.ts` oder eigene Datei `dev-workorder.ts`):

- `Workorder` (Envelope): `schema: 'kosmodev.workorder/v1'`, `projekt`,
  `erzeugt_um` (ISO), `auftraege: Auftrag[]` mit exakt den heutigen Feldern
  (`id`, `ts`, `text`, `quelle`, `station`, `ort?`) — die Client-Wahrheit
  wandert 1:1, nichts wird umbenannt.
- `DevJobStatus = 'queued' | 'running' | 'done' | 'error' | 'cancelled'`.
  **Bewusst OHNE `awaiting_approval`**: eine Workorder kostet keine GPU und
  ihr Absenden IST bereits die explizite Owner-Handlung (Knopf in KosmoDev).
  Abweichung von Render/Splat hier dokumentiert und gewollt.
- `DevJob` (Record): `job_id` (Regex `^dev-\d+-[0-9a-f]{6}$`), `status`,
  `kind: 'dev-workorder'`, `created_at`, `updated_at?`, `worker?`,
  `message?`, `anzahl_auftraege`, `result?: DevJobResult`.
- `DevJobResult`: `worker` (Pflicht — wer hat gearbeitet),
  `abgeschlossen_um`, `ergebnisse: AuftragErgebnis[]` mit
  `auftrag_id`, `umgesetzt: boolean`, `commit?`, `notiz?`.
- Routen additiv in `bridgeRoutes`: `jobsDev: '/jobs/dev'`,
  `jobDev(id)`, `jobDevClaim(id)`, `jobDevResult(id)`,
  `jobDevCancel(id)`.

Nach AB1 gilt **Contract-Freeze** (nur additiv, wie Block 1).

**E3 — Rückkanal als Worker-Protokoll (Claim → Result).** Der ausführende
Worker ist ehrlich benannt: **Claude Code auf der HomeStation** (oder eine
Cloud-Session), den der Owner betreibt — die Bridge führt NIE selbst Code
aus, sie speichert und vermittelt nur Text. Normatives Protokoll (analog
«Worker andocken» fürs Rendern):

1. `GET /jobs/dev?status=queued` — offene Workorders sehen.
2. `POST /jobs/dev/{id}/claim` mit `{worker: "<name>"}` → Status `running`,
   `worker` gesetzt (verhindert Doppelarbeit, macht den Namen im Client
   sichtbar).
3. Arbeiten (Repo, Commits — ausserhalb der Bridge).
4. `POST /jobs/dev/{id}/result` mit `DevJobResult` → Status `done`
   (oder `error` + `message`). Token-pflichtig wie alles.

**E4 — Client schliesst den Kreis im Auftragsbuch.** `auftragsbuch.ts`
erhält additiv `ergebnis?: { worker: string; commit?: string; notiz?: string }`
am `Auftrag` und eine Funktion `uebergebeWorkorder()` (über die bestehende
`bridgeFetch`-Naht aus `vis-jobs.ts` — Token + typisierte `BridgeHttpError`
gratis). DevWorkspace bekommt neben dem Download-Export einen Knopf
**«An HomeStation übergeben»** + eine Job-Statuszeile (Poll wie KosmoVis,
2.5 s nur solange ein Dev-Job offen ist). Kommt ein Result zurück, werden
die betroffenen Aufträge `an-worker → erledigt` gesetzt und `ergebnis`
gespeichert/angezeigt (Worker-Name + Commit + Notiz an der Karte).
**Der Browser-Download bleibt** als Offline-Fallback bestehen.

**E5 — Ehrlichkeit (die harte Kante).**
- Ohne echten Dev-Worker bleibt ein Dev-Job beweisbar `queued` — der Client
  zeigt «wartet auf Worker — an der HomeStation Claude Code andocken», nie
  einen vorgetäuschten Fortschritt.
- Der `--fake-worker` darf den **Protokoll-Kreis** schliessen (claim →
  result), aber sein Result trägt zwingend `worker: "fake-worker"` und je
  Auftrag `umgesetzt: false` + `notiz: "Simulation — keine echte Umsetzung"`.
  **Kein `commit`-Feld im Fake.** Anders als beim Render-Platzhalterbild
  könnte ein erfundener Commit-Hash für echte Arbeit gehalten werden — das
  ist die Blender-Regel (Zahlen/Belege nie faken), nicht die Bild-Regel.
- Der Client zeigt bei `ergebnis.worker === 'fake-worker'` das Label
  «Simulation» an der Karte und setzt den Status auf `erledigt` NUR im
  Sinne von «Kreis durchlaufen» — der Text der Notiz sagt ehrlich, dass
  nichts umgesetzt wurde. E2E assertet genau dieses Label.
- Offline/Token-fehlt/LAN-IP-CSP: dieselben ehrlichen Meldungen wie KosmoVis
  (Wiederverwendung `istAuthFehler`/`bridgeVermutlichCspGeblockt`).

**E6 — `docs/auftraege/` wird Bridge-Sache, nicht App-Sache.** Die Bridge
legt je Workorder `workorder.json` (maschinell) **und** `workorder.md`
(menschlich, mit YAML-Frontmatter: `schema`, `projekt`, `job_id`,
`auftrag_ids`) in ihrem Job-Store ab. Optional spiegelt
`KOSMO_BRIDGE_AUFTRAEGE_DIR=<pfad>` die `.md` zusätzlich in ein
Repo-Verzeichnis (die `docs/auftraege/`-Vision aus V2-AUFTAKT) — Default
aus, ehrlich dokumentiert. Das Markdown-Format des bestehenden
`alsWorkorderMd` bleibt der menschliche Teil; das Frontmatter kommt dazu.

## 2. Batches (Reihenfolge bindend)

| # | Batch | Inhalt | Wer |
|---|---|---|---|
| AB1 | Contract | `Workorder`/`DevJob`/`DevJobResult` + Routen, Contract-Tests, danach Freeze | Fable selbst |
| AB2 | Bridge | `/jobs/dev` (POST/GET/claim/result/cancel), Store-Ablage json+md+Frontmatter, `KOSMO_BRIDGE_AUFTRAEGE_DIR`-Spiegel, Fake-Worker-Schritt (ehrliches Simulation-Result), Härtung (Token, Deckel, id-Regex) | Fable selbst (zentrale Python-Naht) |
| AB3 | Client | `auftragsbuch.ts` (+`ergebnis`, `uebergebeWorkorder` via `bridgeFetch`), DevWorkspace (Übergeben-Knopf, Statuszeile, Poll, Ergebnis an der Karte, ehrliche Fehlzustände), Unit-Tests | Sonnet gegen diese Spec, Review Fable |
| AB4 | E2E | `e2e/dev-workorder.spec.ts`: voller Kreis gegen Fake-Bridge (erfassen → übergeben → fake-claim/result → Karte «erledigt · Simulation»), plus Gegenproben (offline ehrlich, ohne Übergabe bleibt Download-Weg grün — `p3.spec.ts` unverändert) | Sonnet, Review Fable |
| AB5 | Doku | Bridge-README «Dev-Worker andocken» (normatives Protokoll E3), `HOMESTATION-AUFTRAG.md` §, `ABNAHME-DREHBUCH.md` «Kreis schliessen», `V2-AUFTAKT.md`-Status | Sonnet |

Je Batch das Arbeitsmuster: Feature → Tests → Gate (typecheck + `npm test` +
Build) → volle serielle E2E (Fake-Bridge :8600, Sync :8700) → ROADMAP-Eintrag
→ deutscher Commit mit Trailern → Push. Goldens byte-identisch (kein
Kernel-Diff in diesem Block erwartet — Aufträge berühren den Kernel nicht).

## 3. Abnahme-Kriterien des Blocks

1. Owner erfasst einen Auftrag (⚑/KosmoDev/Kosmo-Tool) und drückt
   «An HomeStation übergeben» → `GET /jobs/dev` zeigt den Job mit exakt den
   erfassten Aufträgen (`workorder.json` beweisbar).
2. Ohne Worker bleibt der Job `queued`, der Client sagt es ehrlich.
3. Fake-Worker-Kreis: Result kommt zurück, Karten springen auf
   «erledigt · Simulation», **kein** Commit-Hash erfunden.
4. Worker-Protokoll ist so dokumentiert, dass Claude Code an der
   HomeStation es ohne Rückfragen bedienen kann (claim → arbeiten → result).
5. Download-Export funktioniert unverändert (Offline-Fallback).
6. Echte Ausführung (echter Worker setzt Aufträge um, Commit-Link an der
   Karte) bleibt ehrlich «⏳ HomeStation» bis zum ersten Live-Lauf.

## 4. Bewusst NICHT in diesem Block

- Kein Auto-Ausführen in der Bridge (sie bleibt Vermittlerin, führt nie
  Code aus — Sicherheitsgrenze aus Serie I).
- Keine Prioritäten/Abhängigkeiten am Auftrag (Datenmodell bleibt minimal;
  erst nach erstem Live-Lauf entscheiden).
- Kein Git-/PR-Automatismus aus der App heraus.
- Kein Kosmo-LLM-Tool «Workorder abschicken» — Absenden bleibt eine
  explizite Owner-Handlung (E2, Freigabe-Prinzip).
