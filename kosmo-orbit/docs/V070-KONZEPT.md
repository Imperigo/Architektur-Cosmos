# V070-KONZEPT — «Schwarz auf Weiss» (10.–12.07.2026)

Owner-Auftrag: SIA-Phasen vollständig in 2D+3D (Entwurf/Wettbewerb bis und
mit Baueingabe = SCHWARZ gem. SIA) · offene 0.7.0-Aufträge · Finch-Nachbau
(finch3d.com/product). Owner-Entscheide: Phasenmodell = **Planungsphasen
2–5** (Wettbewerb TP 22 · Vorprojekt 31 · Bauprojekt 32 · Baueingabe 33 ·
Ausschreibung 41 · Werkplan/Ausführung 51/52); 3D = **Weissmodell als
Phasen-Default, Schwarzmodus wählbar**, Materialien ab Ausschreibung,
Override im Projekt-Menü; Finch-Interop/Enterprise = **lokale Äquivalente**.

## E1 — Phasenmodell (additiv, keine Migration)

- `SiaPhase` (doc.ts:64-71) bleibt wie sie ist (7 Werte decken das
  bestätigte Modell); nur Label: `bewilligung` → «Baueingabe (SIA 33)».
- `BauPhase` (doc.ts:39) additiv: `'wettbewerb' | 'vorprojekt' |
  'bauprojekt' | 'baueingabe' | 'werkplan'`. `phaseLabel()` erweitern:
  Wettbewerb (SIA 22) · Vorprojekt (SIA 31) · Bauprojekt (SIA 32) ·
  Baueingabe (SIA 33) · Werkplan (SIA 51).
- Entkopplung phase↔siaPhase bleibt (module.spec:809/813 verifiziert sie);
  `empfohlenePlanPhase()` (doc.ts:99-112): wettbewerb→wettbewerb,
  vorprojekt→vorprojekt, bauprojekt→bauprojekt, bewilligung→baueingabe,
  ausschreibung|ausfuehrung|abnahme→werkplan.
- Defaults UNVERÄNDERT (phase='werkplan', siaPhase='wettbewerb') — Seeds,
  Journeys, 16 Goldens stabil.
- `PHASEN_MASSSTAB` (modules/design/export-plan.ts:8): wettbewerb 1:200,
  baueingabe 1:100. Bemassungs-Preset-Map (DesignWorkspace phase-stil-
  onChange): wettbewerb = {aussenKetten:'gesamt', innenKetten:false,
  hoehenKoten:false}; baueingabe = wie bauprojekt (Gesamt + Höhenkoten).

## E2 — Zentrale Poché-Utility

NEU `packages/kosmo-kernel/src/derive/poche.ts`:

```ts
export type PocheModus = 'phase' | 'schwarz' | 'material';
export interface PocheEntscheid {
  art: 'schwarz' | 'grau' | 'daemmung' | 'tint' | 'umbau' | 'thema' | 'none';
  fill: string | null;          // konkrete Farbe für den SVG-Export
  schraffurLinien: boolean;     // nur werkplan bzw. modus 'material'
  einDeckung: boolean;          // EIN Poché über Gesamtdicke (statt Schichten)
}
export function pocheEntscheid(args: {
  phase: BauPhase; modus: PocheModus; material?: string;
  klassen: { tragend: boolean; daemmung: boolean; projektion: boolean };
  umbau?: 'bestand' | 'abbruch' | 'neu'; themaFarbe?: string;
  kontext: 'grundriss' | 'schnitt';
}): PocheEntscheid
```

- Neues Setting `doc.settings.pocheModus: PocheModus` (Default `'phase'`)
  + Command `design.pocheModusSetzen`.
- **Präzedenz (fix):** themaFarbe > Umbau-Farben (SIA 400 B.8.11, gewinnen
  AUCH in Schwarz-Phasen — Baugesuch braucht rot/gelb) > Phasen-Schwarz >
  heutige Tints/Grau.
- **Schwarz-Regeln:** wettbewerb/vorprojekt → einDeckung=true, fill
  `#1a1a1a` für alle geschnittenen Bauteile; bauprojekt/baueingabe →
  Schichten: tragend `#1a1a1a`, nichttragend `#c9c9c9`, Dämmung weiss ohne
  Schraffur; werkplan (und modus 'material' in JEDER Phase) → exakt
  heutiges Verhalten (Tints + schraffurLinien) — **byte-identischer
  Refactor**, bewiesen über die 16 Goldens.
- Ersetzt die 3+1 Farbstellen: plansvg.ts:69 (Grundriss-Export — heute OHNE
  Phasenweiche), plansvg.ts:259-273 (Schnitt), PlanView.tsx:822/892
  (Bildschirm: art→CSS-Var, schwarz→`var(--k-ink)`, sonst wie heute —
  Themes/token-spiegel unberührt), plan.ts:286-344 (liest `einDeckung`
  statt `phase==='vorprojekt'`).
- H-42 nebenbei: `doc.settings.fensterBoegen: boolean` (Default true) —
  plan.ts:398 fluegelBogen nur wenn an; Command-Feld an bestehendem
  Settings-Weg, Schalter im Projekt-Menü (2A).

## E3 — 3D-Darstellungsmodus

- `doc.settings.darstellung3d: 'auto'|'material'|'weiss'|'schwarz'`,
  Default `'auto'` (**doc.settings** — projektsemantisch/Yjs/Undo; der
  Textur-Toggle bleibt localStorage). Auflösung von 'auto' über siaPhase:
  bis inkl. 'bewilligung' → **weiss**, ab 'ausschreibung' → material.
- Command `design.darstellung3dSetzen`. Helfer
  `aufgeloesteDarstellung3d(settings): 'material'|'weiss'|'schwarz'` in
  doc.ts (pure, testbar).
- Viewport3D.tsx:1116-1152: Material-Factory verzweigt: weiss →
  `0xffffff`, roughness 0.9, Textur-Pipeline übersprungen; schwarz →
  `0x1c1c1c`, roughness 0.95; material → heutiges Verhalten. Fenster
  (fensterMaterial :611) behalten Transparenz in allen Modi.
  Revision-Counter analog setTexturModus (:217-222).
- Projekt-Menü-Schalter (2A, KSelect darstellung3d) — Audit: KEINE
  bestehenden 3D-Farb-Asserts in e2e (verifiziert 10.07.).

## E4 — Schwarzplan/Situationsplan v1

NEU `derive/schwarzplan.ts`: `schwarzplanSvg(doc, {massstab: 500|1000})` —
eigene Gebäude-Footprints schwarz gefüllt, Parzellengrenze strichpunktiert
(`parzelleZuOutline`, standort.ts), Nordpfeil + Massstabsbalken +
LV95-Rahmen; Nachbarbebauung NUR aus manuell erfassten Kontext-Polygonen
(ehrlich: kein OSM-Import in v1, Lücke im UI benannt). Footprint-Helfer aus
studienbeurteilung.ts:82-115 extrahieren (gemeinsame Quelle). Neuer
Blatt-Typ «Situationsplan» (sheet.ts/publikation.ts, 3A verdrahtet ins
Blatt). Golden `schwarzplan.svg` hinter Daten-Guard (ohne Parzelle kein
Situationsplan → Alt-Goldens byte-identisch).

## E5 — Finch-Tiefe (Product-Page-Katalog vom 10.07.)

Katalog (finch3d.com/product, Text+Videos): (1) Plan Library mit
eingebetteten Regeln (Accessibility/Code/Constraints) als Generierungs-
Basis · (2) Generierung «feasibility → detailed layouts in minutes»,
tausende Echtzeit-Varianten, Instant-Feedback · (3) Agent «Archie»:
Türplatzierung, Compliance-Checks, verkettete Einheiten-Updates · (4) BIM-
Modell + Export ohne Neuzeichnen · (5) Interop Rhino/Revit/Grasshopper ·
(6) Enterprise/SSO/Teams. Bestand F1–F10 komplett (RE-FINCH.md §7) —
v0.7.0 baut die TIEFE:

- **(i) Anytime-Variantensuche** (4A): `derive/variantensuche.ts` —
  seeded synchroner Generator `variantenSuche(eingabe, gewichte, seed):
  Generator<Variante>`; Start = Greedy-DP aus segmentierer.ts (Export
  refactoren, Verhalten identisch — Charakterisierungstests!), danach
  Ruin-&-Recreate-Züge (Wohnungsgrenzen jittern, Segmente tauschen);
  `Score = Σ gewicht_k · normiert(kennzahl_k)` über vorhandene Kennzahlen
  (SIA-416-Flächen, Programmerfüllung, Custom-Formeln). KEIN Worker: UI
  zieht in requestIdleCallback-Zeitscheiben (5A). Deterministisch bei
  fixem Seed.
- **(ii) F7-Locks** (4B): Vorlagen-Wandkanten `dehnung: 'fest'|'dehnbar'`
  (Default dehnbar = heutiges Verhalten); achsweiser Stretch respektiert
  Locks; Alt-Vorlagen unverändert gültig.
- **(iii) Kennzahl-Matrix** (5A): variantenmatrix.ts verallgemeinern —
  Quelle = Volumenstudien ODER Variantensuche-Ergebnisse; Spalten =
  wählbare Kennzahlen + Score.
- **(iv) Kosmo-Präzisier** (5B): Persona in kosmo-ai + 3 Commands:
  `design.tuerenPlatzieren` (Raumgraph-Erschliessung, fehlende Türen
  ergänzen), `design.komplianzFixes` (checks-Befunde → konkrete Patches
  als Diff-Karten via runCommand), `design.einheitTypAktualisieren`
  (Änderung an einem Wohnungstyp → alle Instanzen, EINE Undo-Gruppe).
  ScriptedProvider-Tests + kosmo-scripted.spec.
- **(v) Regeln-in-Vorlagen** (4B): Vorlagen-Feld `regeln: string[]`
  (Regelpreset-Ids); Instanziieren aktiviert Checks; Generator übernimmt
  eingebettete Regeln in die Prüfkette.
- **(vi) BIM-Brücke** (6A): IFC/DXF-Roundtrip-Beweise als Tests;
  `docs/INTEROP.md` (ehrliche Rhino/Revit/Grasshopper-Wege über IFC/DXF);
  RE-FINCH.md §8 Nachtrag (Product-Page-Analyse + begründete
  Enterprise/SSO-Auslassung: lokal-first Einzelbüro, kein Mandanten-
  Backend, Yjs-Sync deckt Kollaboration).

## Vertrags-Audit (10.07., verbindlich für alle Streams)

- phase-stil: NUR Wert-Asserts (module.spec:783/809/813 = Default werkplan
  + Entkopplung) — beide bleiben per Design wahr; keine Optionszählung.
- KEINE 3D-Farb-/Screenshot-Asserts in e2e (Grep verifiziert).
- plan-lod.spec.ts = Gate für PlanView-Umbauten (2A).
- Werkzeugzähler toBe(18) (seit v0.8.1: 17, Splat-Fusion §8 Sanktion 1):
  KEINE neuen Toolbar-Werkzeuge — neue Schalter leben im Projekt-Menü. Seed
  112/«19× Beton» unberührt (Poché = reine Darstellungsebene).
  exactOptionalPropertyTypes: neue optionale Settings mit konditionalen
  Spreads.

## Wellen & Besitz (Dateidisjunktheit = Merge-Gesetz)

Siehe Plan-File; Kurzform: Tag 1 = W1 (1A Kernel Phasen+Poché+H-42-Guard /
1B plan-hit-test+ui-zustand+Inspector) → W2 (2A PlanView+DesignWorkspace+
phasen-presets / 2B Viewport3D+schwarzplan+standort+studienbeurteilung) →
Kritik 1 → W3 (3A blattfuellung+publish / 3B ref3d-E2E+Site-Zonentyp).
Tag 2 = W4 (4A variantensuche+segmentierer / 4B Vorlagen+zonenwaende+
grundrissgenerator) → Kritik 2 (API-Review VOR UI) → W5 (5A Matrix+Panel /
5B kosmo-ai+Commands) → W6 (6A ifc/dxf+INTEROP+RE-FINCH / 6B Restfixe) →
Kritik 3 → Finale (Bump, Scan-Nachlauf §0, Vollsuite 5183, CI, PDF).
