# Serie J2 — Immersive Oberfläche fürs ganze System (Fable-Konzept, 08.07.2026)

> V1.6-Auftrag Block B (`docs/V16-AUFTRAG-PLAN.md`), Owner-Wortlaut: «Erweitere
> die dynamische Benutzeroberfläche aufs ganze System, recherchiere immersive
> dynamische Benutzeroberflächen-Experiences zum Verwenden oder als
> Referenzen, baue Konzept auf.» Dies ist reine Konzept-/Planungsarbeit
> (B-0) — der Bau folgt in Batches, B1 ist implementierungsreif spezifiziert
> und **wird noch heute Nacht gebaut**.
>
> Grundlage: `docs/SERIE-J-INTUITIVE-BEDIENUNG.md` (J3-Prinzip), der
> `docs/SERIE-J-BUILDPLAN.md` (Abschnitt 2, die heute gebaute Regel-Engine),
> `docs/OBERFLAECHE-FOKUS-SYSTEMATIK.md` (T7-Basis) und
> `docs/GESTALTUNGSKONZEPT.md` (Ästhetik-Leitplanken: Werkplan-Nüchternheit,
> gedämpfte, nicht spektakuläre Bewegung).

## 0. Web-Erreichbarkeit (ehrlich)

WebSearch war im Container erreichbar — drei Quellen wurden für diesen
Katalog live verifiziert (Procreate-Handbuch/Community, Apple-HIG zu
Ornaments, Blender-Doku zu Workspaces/Pie-Menüs, s. Fussnoten unten). Ableton/
DAW-Fokus-Modi, Figma-Kontextleisten/Command-Palette und diegetische
Games-HUDs stammen aus meinem Wissensstand ohne Live-Quelle in diesem
Durchlauf — dort steht das ehrlich als «kein Live-Beleg» statt einer
erfundenen Quellenangabe.

## 1. Referenz-Recherche — Katalog

Jeder Eintrag: was die Referenz macht, was KosmoOrbit **übernimmt**, was
**bewusst verworfen** wird.

### 1.1 Blender — kontextuelle Pie-Menüs & Workspaces *(live verifiziert)*

Blender ordnet ganze Bildschirm-Layouts («Workspaces») als Tabs oben an —
jede Workspace bringt ihr eigenes Panel-Set fürs jeweilige Gewerk (Modeling,
Sculpting, Texture Paint) und schaltet automatisch den passenden Objektmodus.
Pie-Menüs legen verwandte Befehle radial um den Cursor, per Taste halten +
Richtung ziehen + loslassen — schnell **und** muskelgedächtnis-tauglich, weil
die Richtung immer gleich bleibt.

**Übernommen:** das Prinzip «pro Tätigkeit ein eigenes, aufgeräumtes
Panel-Set» — das IST bereits die Stationen-Architektur (`state/stationen.ts`,
Design/Data/Büro-Familien) und die J3-Fokus-Stufen; wir bauen es aus, statt es
neu zu erfinden. Die Kontextmenü-Idee (Rechtsklick zeigt, was HIER geht) lebt
schon in J2 (`ViewportKontextmenue.tsx`).

**Verworfen:** echte radiale Pie-Menüs. Das Gestaltungskonzept
(`docs/GESTALTUNGSKONZEPT.md`) ist Werkplan/Tusche-auf-Papier, nüchtern und
rechtwinklig — ein radiales Gesten-Menü wäre ein Fremdkörper im visuellen
System und ein zusätzliches Erlernen für Architekt:innen, die von ArchiCAD
kommen, nicht von Blender. Bleibt eine V2-Idee, keine J2-Entscheidung.

### 1.2 Ableton Live / DAWs — Fokus-/Arrangement-Modi *(kein Live-Beleg — Wissensstand)*

DAWs wie Ableton kennen einen harten Umschalter zwischen «Arrangement»
(alles sichtbar, Overview, alle Spuren) und einem verengten Editier-Fokus
(eine Spur/Clip füllt den Screen, alles andere kollabiert). Der Wechsel ist
ein Klick oder eine Taste, sofort reversibel, nie ein Lade-Vorgang.

**Übernommen:** genau dieses Muster für die «Arbeits-UI»-Stufe (Abschnitt
3.2) — ein expliziter, sofortiger, umkehrbarer Fokus-Wechsel statt eines
schleichenden Auto-Verhaltens. Der bestehende Adaptions-Kern liefert das
graduell (Fokus-Stufen dimmen), DAWs zeigen den zusätzlichen **harten**
Schritt («ganz weg, nicht nur gedimmt»), den J3 heute noch nicht kennt.

**Verworfen:** DAWs verstecken beim Fokussieren auch Werkzeuge, die man
gleich danach wieder braucht (z. B. Mixer). KosmoOrbits Regel 2.3.1 («feste
Anker, nichts wird unerreichbar») bleibt härter als das DAW-Vorbild — Panels
kollabieren, verschwinden aber nie ganz ohne einen sichtbaren Rückweg.

### 1.3 Figma — Kontextleisten & Command-Palette-first *(kein Live-Beleg — Wissensstand)*

Figma zeigt eine schmale, werkzeugabhängige Kontextleiste (was gerade
ausgewählt ist, bestimmt die Eigenschaften-Spalte) und daneben eine
Command-Palette (⌘/Strg+K) als Fallback für alles Seltene — niemand muss
jeden Befehl in der Werkzeugleiste unterbringen, weil die Suche ihn immer
findet.

**Übernommen:** die Idee «Selten gebrauchtes muss nicht sichtbar UND nicht
tot sein — eine Suche/ein Katalog deckt es ab» als Ergänzung zur reinen
Dimmung. J3 dimmt heute nur (Regel 2.3.1); ein Command-Palette-artiger
Zugriff auf «alles, was gerade `.k-selten` ist» ist ein plausibler
V2-Baustein, hier nur als Idee notiert, nicht Teil von B1..Bn.

**Verworfen:** Figma-Kontextleisten ordnen sich frei nach Selektionstyp
um — bei KosmoOrbit widerspricht «freie Neuordnung» der harten Regel 2.3.1
(feste DOM-Anker, kein Muskelgedächtnis-Verlust). Wir übernehmen die
Kontext-Sensitivität, nicht die Neuordnung.

### 1.4 Apple visionOS / iPadOS — Ornamente, progressive disclosure, Stage Manager *(live verifiziert)*

visionOS-Ornamente sind Bedienelemente, die **leicht vor** dem Inhalt
schweben, mit dem Fenster mitwandern, aber den Inhalt nie verdecken; Apples
Leitlinie: «häufig gebrauchte Werkzeuge an den Rand, Ornamente weglassen wenn
nicht zwingend». iPadOS/Stage Manager legt zusätzlich progressive disclosure
nahe: erst beim Bedarf erscheinen tiefere Optionen.

**Übernommen:** das Ornament-Prinzip beschreibt fast 1:1, was `.k-selten`
mit Hover/Fokus-Aufhellung (`OBERFLAECHE-FOKUS-SYSTEMATIK.md`) schon tut —
am Rand, dezent, nie den Arbeitsinhalt verdeckend. Für Abschnitt 3.2 (Immersions-
Stufen) übernehmen wir explizit «Ornamente zuerst weglassen, dann erst
Inhalt verkleinern» als Reihenfolge, wenn die Arbeits-UI-Stufe Platz braucht.

**Verworfen:** räumliche 3D-Fenster-Physik (Tiefe/Parallaxe) — KosmoOrbit ist
eine flache Werkplan-Ästhetik (Gestaltungskonzept, Regel «Schatten fast
keine»), keine Vision-Pro-Tiefenillusion. Ein Ornament bei uns ist ein
flaches, dediziertes Element, keine schwebende Glasscheibe.

### 1.5 Games-HUDs — diegetische UI & Aufmerksamkeits-Ökonomie *(kein Live-Beleg — Wissensstand)*

Spiele reduzieren HUD-Elemente (Munition, Gesundheit, Minikarte) auf das
Nötigste während intensiver Handlung und blenden sie in ruhigen Momenten
wieder voll ein — «diegetisch» heisst dabei: Information sitzt möglichst in
der Spielwelt selbst statt als Overlay. Die Aufmerksamkeits-Ökonomie-Lehre
daraus: **je höher die kognitive Last der Aufgabe, desto weniger UI-Rauschen
gleichzeitig.**

**Übernommen:** die Kernidee — `aktionLaeuft` (heute schon der zentrale
Signal-Flag in `oberflaeche-adaption.ts`) ist genau dieser
Aufmerksamkeits-Trigger; J2 baut ihn systemweit aus und fügt die härtere
«Arbeits-UI»-Stufe hinzu (Abschnitt 3.2), wenn die Aktion lange genug läuft.
Diegetische Information (Werte direkt im 3D statt im Panel) ist bereits
teilweise da (Bemassung/Hover-Vorschau, `previewLine`).

**Verworfen:** Spiele blenden HUD oft ohne Nutzer-Kontrolle und ohne
erklärenden Hinweis aus — widerspricht Regel 2.3.5 (Transparenz,
`adaption-hinweis`) und dem J-Grundsatz «nichts Verstecktes». KosmoOrbit
zeigt immer, warum etwas zurücktrat, und lässt es per Klick sofort wieder
kommen.

### 1.6 Procreate — verschwindende UI beim Zeichnen *(live verifiziert)*

Procreates Handbuch (`help.procreate.com/procreate/handbook`) beschreibt eine
bewusst schlanke Seitenleiste (rechtshänder-/linkshänder-umschaltbar, in der
Höhe verschiebbar) und einen Modus, der die Leinwand komplett ohne Interface
auf einen zweiten Bildschirm projiziert («Actions → Prefs → Project canvas»).
Community-Threads zeigen zusätzlich ein «Auto-Hide»-Verhalten der Werkzeuge
während des Zeichnens selbst, das viele Nutzer bewusst an-/abschalten.

**Übernommen:** exakt das Bild für die dritte, radikalste Immersions-Stufe
«Zeichnen-pur» (Abschnitt 3.2) — Chrome verschwindet fast vollständig im
aktiven Sketch-Werkzeug, mit einem klar sichtbaren, immer erreichbaren
Rückweg (Procreates «Auto-Hide ist abschaltbar» ist die Blaupause für unser
Opt-out/Reset-Prinzip: nichts Automatisches ohne Kontrolle).

**Verworfen:** Procreates Zweitbildschirm-Projektion ist Hardware-spezifisch
(iPad + externer Screen) und kein Vorbild für unseren Ein-Fenster-Fall — wir
übernehmen die Interface-Reduktion, nicht die Multi-Display-Mechanik.

---

## 2. Ist-Stand-Inventar (dateigenau)

Was heute existiert — der einzige Ausbaupunkt, den J2 hat.

**`apps/kosmo-orbit/src/state/fokus.ts`** (39 Zeilen): statische T7-Basis.
`FokusStufe = 'primaer'|'sekundaer'|'selten'`; `KOPFLEISTE_FOKUS` (Z. 17–26,
nur die App-Kopfleiste); `fokusStufe()`/`fokusKlasse()` (Z. 31–38, reine
Zuordnungsfunktionen). Ändert sich nie zur Laufzeit — die ausschliesslich
statische Grundlage.

**`apps/kosmo-orbit/src/state/oberflaeche-adaption.ts`** (526 Zeilen): das
komplette J3-Regelwerk — aber **datenseitig 100 % KosmoDesign-spezifisch**.
Konkret Design-gebunden:
- `LeistenGruppe` (Z. 31) = `'zeichnen'|'ansicht'|'export'|'ebenen'|'projekt'|'verlauf'`
  — Design-Werkzeugleisten-Sektionen, keine andere Station kommt vor.
- `TaetigkeitsKontext` (Z. 42–58): `tool` (Design-`ToolId`), `phase` (SIA-Phase,
  existiert nur in KosmoDesign/`doc.settings.phase`), `aktionLaeuft`,
  `panelOffen`.
- `TAETIGKEITS_REGELN` (Z. 79–86) + `ZEICHEN_WERKZEUG_IDS` (Z. 95–103) +
  `istZeichenKontext()` (Z. 107–109): die Tätigkeits-Matrix, hart auf
  Design-Werkzeuge zugeschnitten.
- `LEISTEN_BASIS` (Z. 117–124): T7-Basis nur für die sechs Design-Gruppen.
- `adaptiveFokusStufe()` (Z. 184–213): kombiniert alles Obige inline — Matrix,
  Anti-Dimm, Werkplan-Phasen-Sonderfall (Z. 203–205), Top-3-Hebung — **eine
  einzige, nicht in Teile zerlegte Funktion**, das ist der Extraktionspunkt für
  B1.
- `leiteTaetigkeitsKontextAb()` (Z. 314–328): liest Design-State (`tool`,
  `phase`, `punkteOffen`, `ziehtElement`, `panelOffen`).

Stationsneutral (**bereits generisch**, ohne jeden Bezug zu
`LeistenGruppe`/`TaetigkeitsKontext`, operieren nur auf `elementId: string`
und `NutzungsProfil`) sind: `nutzungMelden`/`nutzungVerfallen`/
`adaptionZuruecksetzen`/`adaptionAktiv`/`setAdaptionAktiv`/`nutzungsProfil`
(Z. 464–525, der ganze localStorage-Layer inkl. Storage-Stub/defensivem
Parse), `opazitaetsKlasse`/`opazitaetsWert`/`elementFokusStufe`/
`gehobenesElementDerGruppe`/`istUnterBasis` (Z. 134–298) sowie die internen
Rang-Helfer `stufeMax`/`stufeMin`/`stufeAnheben`. Einzige Kopplung an Design:
`gruppeVonElement()` (Z. 155–158) liest das feste Modul-Array
`LEISTEN_GRUPPEN` (Z. 33–40) statt eine Gruppen-Liste als Parameter zu
nehmen — das ist der zweite, kleinere Extraktionspunkt.

**`apps/kosmo-orbit/src/state/stationen.ts`** (93 Zeilen): reine
Familien-Zuordnung (`design`/`data`/`buero`) für die Zentrale-Kacheln
(`stationFamilie()`, Z. 56–58) — hat mit Fokus-/Adaptions-Stufen **nichts**
zu tun, ist aber der Rahmen, in dem B2..Bn benennen, welche Station als
Nächstes drankommt.

**Wirkt heute NUR in `apps/kosmo-orbit/src/modules/design/DesignWorkspace.tsx`**
(Zeilen 700–826 die Ableitung/den Hook-Code, Zeilen 848–1307 die tatsächliche
`data-testid="leiste-gruppe-*"`-Verdrahtung, Zeile 1271 `adaption-hinweis`,
Zeile 1412 `adaption-reset`). Jede andere Station (Data/Vis/Publish/Prepare/
Doc/Train/Asset/Dev) rendert ihre Werkzeugleisten/Tabs/Panels heute mit
**festen** Klassen — keine `adaptiveFokusStufe`, kein `nutzungMelden`, kein
Opt-out/Reset. Das ist exakt die Lücke, die der Owner mit «aufs ganze System»
meint.

**E2E-Machart** (`e2e/oberflaeche-adaption.spec.ts`, 288 Zeilen): sechs Tests,
Muster für B1 und jeden Folge-Batch — (1) Matrix-Demotion + Hinweis
sichtbar/unsichtbar, (2) feste DOM-Anker (Reihenfolge der `data-testid`s vor/
nach Adaption identisch), (3) Freeze während Aktion + 2 s-Debounce danach,
(4) Element-Hebung (oft genutztes Element bleibt eine Stufe höher als seine
Gruppe, Geschwister unverändert), (5) Opt-out wirkt sofort ohne Reload,
(6) Reset löscht nur das Profil, nie den Schalter, `localStorage`-Schlüssel
bleibt sauber versioniert.

---

## 3. Das System-Konzept

### 3.1 EIN Adaptions-Kern für alle Stationen

**Entscheid 1 — Extraktion statt Neubau.** Kein neues Regelwerk: der
bestehende Kern (Rang-Helfer, Opazitäts-Helfer, der komplette
localStorage-Layer) ist bereits stationsneutral und wandert unverändert in
ein neues Modul. Nur die zwei Design-spezifischen Verschmelzungen
(`adaptiveFokusStufe()` als monolithische Funktion, `gruppeVonElement()` mit
hartcodierter Gruppen-Liste) werden in **Kern-Primitive + Stations-Matrix**
aufgetrennt — Design bekommt exakt sein heutiges Verhalten zurück (Regression
= null), jede weitere Station komponiert dieselben Primitive mit ihrer
eigenen Matrix.

**Entscheid 2 — EIN globaler Speicher, EIN Schalter, EIN Reset.** Der
Owner-Grundsatz aus Serie J3c («nichts Verstecktes, alles zurücksetzbar»)
gilt systemweit, nicht pro Station: derselbe `localStorage`-Schlüssel
`kosmo.adaption.v1` bedient alle Stationen. Ein Nutzer, der die Adaption in
KosmoDesign abschaltet, hat sie **auch** in KosmoData abgeschaltet — kein
verstecktes Pro-Station-Untermenü mit eigenem Zustand. Kollisionsfrei, weil
jede Station ihre eigene, disjunkte Gruppen-Namensmenge benutzt (Design:
`zeichnen/ansicht/export/ebenen/projekt/verlauf`; Data ab B1:
`navigation/suche/sync/dossier`; künftige Stationen entsprechend).

**Entscheid 3 — Nutzungssignale je Station, aber ein gemeinsames Vokabular.**
Jede Station bildet ihren eigenen `TaetigkeitsKontext` (ihr Äquivalent zu
Design `tool`/`phase`), aber genau zwei Felder sind universell und leben im
Kern: `aktionLaeuft: boolean` (irgendetwas Aktives läuft — Punktkette,
Import, Render, Tippen) und `panelOffen: boolean` (ein vom Nutzer geöffnetes
Detail-/Editier-Panel — nie dimmen, solange es offen ist). Jede Station
liefert diese zwei Felder aus ihrem eigenen State ab, wie
`leiteTaetigkeitsKontextAb()` es heute für Design tut.

**API-Schnitt (verbindlich für B1, Vorbild für B2..Bn):**

```ts
// NEU apps/kosmo-orbit/src/state/oberflaeche-adaption-kern.ts
// Reine Funktionen + der komplette localStorage-Layer — 1:1 aus
// oberflaeche-adaption.ts übernommen, nur ohne Design-Bezug.

export type { FokusStufe } from './fokus'; // Re-Export, keine zweite Definition

export interface NutzungsProfil {
  zaehler: Record<string, number>;
  zuletzt: Record<string, number>;
}

// Storage-Layer, 1:1 verschoben (Z. 330–525 heute):
export function nutzungMelden(elementId: string): void;
export function nutzungVerfallen(profil: NutzungsProfil, tage: number): NutzungsProfil;
export function adaptionZuruecksetzen(): void;
export function adaptionAktiv(): boolean;
export function setAdaptionAktiv(aktiv: boolean): void;
export function nutzungsProfil(): NutzungsProfil;

// Rang-/Opazitäts-Helfer, 1:1 verschoben (Z. 134–298 heute):
export function istUnterBasis(stufe: FokusStufe, basis: FokusStufe): boolean;
export function opazitaetsKlasse(stufe: FokusStufe): string;
export function opazitaetsWert(stufe: FokusStufe): number;
export function elementFokusStufe(elementId: string, gruppenStufe: FokusStufe, gehoben?: string): FokusStufe;

// Generalisiert (nimmt die Gruppen-Liste jetzt als Parameter,
// vorher Modul-Konstante LEISTEN_GRUPPEN):
export function gehobenesElementDerGruppe<G extends string>(
  gruppe: G, alleGruppen: readonly G[], nutzung: NutzungsProfil,
): string | undefined;
export function gruppeIstOftGenutzt<G extends string>(
  gruppe: G, alleGruppen: readonly G[], nutzung: NutzungsProfil,
): boolean;

// NEU — aufgetrennte Primitive aus dem heutigen Monolithen adaptiveFokusStufe():
/** Schritt 1: Matrix-Regel anwenden ('basis' = keine Verschiebung). */
export function stufeAusRegel(regelStufe: FokusStufe | 'basis', basis: FokusStufe): FokusStufe;
/** Schritt 2: Anti-Dimm-Wache — ein aktives Element/Panel wird nie gedimmt. */
export function wendeAntiDimmAn(stufe: FokusStufe, basis: FokusStufe, aktiv: boolean): FokusStufe;
/** Schritt 3: Top-3-Nutzer-Hebung, max. eine Stufe, nie über primär. */
export function wendeNutzerHebungAn<G extends string>(
  stufe: FokusStufe, gruppe: G, alleGruppen: readonly G[], nutzung: NutzungsProfil,
): FokusStufe;
export function darfUmordnen(aktionLaeuft: boolean): boolean;
```

`apps/kosmo-orbit/src/state/oberflaeche-adaption.ts` bleibt für Design **nach
aussen identisch** (`LeistenGruppe`, `TaetigkeitsKontext`, `LEISTEN_BASIS`,
`ZEICHEN_WERKZEUG_IDS`, `leiteTaetigkeitsKontextAb`, `adaptiveFokusStufe` —
alle exakt gleiche Signatur) und importiert intern nur noch die drei
Primitiven + den Storage-Layer aus dem Kern; `DesignWorkspace.tsx` ändert sich
in B1 **kein Zeichen**.

**Entscheid 4 — geteilte React-Steuerung als Hook.** Die ~100 Zeilen
Hook-Logik in `DesignWorkspace.tsx` (Z. 710–826: `stabilerKontext`-State,
Debounce-Timer, `adaptionIstAn`-State, `elementStil`, `gedaempfteGruppen`)
sind reine React-Verdrahtung ohne Design-Bezug — sie werden als
`useAdaptionsSteuerung()`-Hook ebenfalls in den Kern gezogen (B1-Umfang, s.
unten), sonst reimplementiert jede weitere Station denselben Code neu.

### 3.2 Immersions-Stufen

Drei Stufen, die **quer über alle Stationen** gelten — eine graduelle
Fortsetzung dessen, was J3-Fokus-Stufen schon dimmen, mit zwei zusätzlichen,
härteren Schritten obendrauf (aus 1.2 Ableton, 1.4 visionOS-Ornamente, 1.6
Procreate):

| Stufe | Kopfleiste | Werkzeug-/Tabsleiste | Seiten-/Detail-Panels | Auslöser | Rückweg |
| --- | --- | --- | --- | --- | --- |
| **Voll-UI** (Default) | voll (Logo, Text, alle `KOPFLEISTE_FOKUS`-Elemente) | alle Gruppen nach J3-Fokus-Stufe (primär/sekundär/selten — **gedimmt, nie versteckt**, wie heute) | offen, wenn vom Nutzer geöffnet | Standard-Zustand | — |
| **Arbeits-UI** («Vertiefen», neu in J2) | eingedampft: nur Icon, kein Text-Label (Ornament-Prinzip 1.4: erst Beschriftung weg, dann Fläche) | primär bleibt voll; `.k-sekundaer`/`.k-selten`-Gruppen kollabieren auf eine schmale Icon-Reihe ohne Sektions-Label | schliessen sich automatisch, **ausser** `panelOffen` schützt sie (Anti-Dimm gilt auch hier) | `aktionLaeuft` hält länger als **8 s** ununterbrochen an, ODER ein Kurzbefehl (Design: bestehende Taste `Tab`, dieselbe wie Blender/Photoshop-Muscle-Memory) | derselbe Kurzbefehl, ODER jede Mausbewegung an den oberen Bildschirmrand — sofort, kein Klick nötig |
| **Zeichnen-pur** (Procreate-Vorbild 1.6) | ausgeblendet bis auf einen dezenten Eckindikator (`◇`, `.k-selten`-Farbwert, kein eigenes Icon-Set) | ausgeblendet | ausgeblendet | **explizit**: Sketch-Werkzeug/Vollbild-Skizzieren AKTIV **und** Nutzer bestätigt/aktiviert es selbst (Klick auf den Eckindikator oder Kurzbefehl) — **nie automatisch ohne Aktion des Nutzers** | Klick auf den Eckindikator, `Escape`, oder ein Wisch/Klick an den Bildschirmrand |

**Ehrlich:** «Arbeits-UI» ist die einzige Stufe, die B1 **nicht** baut — B1
liefert den Adaptions-Kern + KosmoData auf Stufe «Voll-UI»-Niveau (dimmen,
nicht kollabieren/verstecken). Die härteren Stufen (Arbeits-UI-Kollaps,
Zeichnen-pur) sind hier als Konzept fixiert, ihr Bau ist B2/B3 (Abschnitt 4)
— das folgt derselben «Konzept vor Bau»-Reihenfolge, die der Owner für Block
B verlangt hat.

### 3.3 Je Station: 2–3 konkrete Adaptions-Hebel

Gegründet auf real existierenden `data-testid`s je Workspace (gelesen, nicht
erfunden) — Ausgangspunkt für B2..Bn, wenn der Adaptions-Kern (B1) einmal
steht.

**KosmoData** (`modules/data/DataWorkspace.tsx`) — **B1, s. Abschnitt 4**:
(1) `suche` (Suchfeld `data-search` + Sammlungsfilter `filter-sammlung` +
Sektor-Chips) bleibt/wird primär, solange getippt wird; (2) `sync`
(`data-sync`) tritt beim Tippen auf `selten` zurück — man synct nicht
während man filtert; (3) `dossier` (`ref-detail-dossier`, u. a. `ref3d-laden`/
`ref-assets`) wird nie gedimmt, solange eine Referenz gewählt ist
(`selected !== null`, Anti-Dimm-Analogon zu Design `panelOffen`).

**KosmoVis** (`modules/vis/VisWorkspace.tsx`): (1) während ein Render-Job
läuft, bleibt der Job-Status/die Queue-Anzeige immer primär (Anti-Dimm,
analog `dev-job-status`); (2) Post-Prozess-/Stil-Regler treten zurück, sobald
eine Kamera-Fahrt/Vorschau aktiv rendert (`aktionLaeuft`); (3) oft genutzter
Render-Stil/Preset wird per Top-3-Hebung selbst hervorgehoben (Element-Hebung
wie heute `sonne-toggle`/`textur-toggle` in Design).

**KosmoPublish** (`modules/publish/PublishWorkspace.tsx`): (1) beim aktiven
Blattlayout (ein Sheet `sheet-*` in Bearbeitung) treten
Metadaten-/Auswahlfelder (`auswahl-thema`, `auswahl-massstab`) zurück, die
Platzierwerkzeuge (`place-plan`/`place-axo`/`place-section`/`place-bildslot`)
bleiben primär; (2) Export-Gruppe (`export-set`/`export-dxf`/`pubset-pdf`/
`pubset-svg`) rückt vor, sobald ein Blatt vollständig platziert ist (keine
`disabled`-Platzierknöpfe mehr); (3) oft genutztes Exportformat wird
gehoben.

**KosmoPrepare** (`modules/prepare/PrepareWorkspace.tsx`): (1) während ein
Import läuft (`ingest-zone`/`pick-files` aktiv), bleibt der Fortschritt immer
primär (Anti-Dimm); (2) das Dossier/die Klassifikations-Vorschläge
(`dossier`, `dossier-uebernehmen`) treten nur hervor, wenn ein Dokument
gewählt ist, sonst zurück; (3) die zuletzt genutzte Ziel-Sammlung
(`basis-${sammlung}`) wird per Top-3-Hebung markiert.

**KosmoDoc** (`modules/doc/DocWorkspace.tsx`): (1) der aktive Bericht-Tab
(`doc-tab-*`) bleibt primär, ungenutzte Tabs sinken auf sekundär/selten nach
Top-3-Nutzung; (2) `doc-berichte` (die Auswertungsliste) bleibt primär,
solange ein Bericht offen ist (Anti-Dimm-Panel-Analogon). Bewusst nur zwei
Hebel — KosmoDoc ist die schlankeste Station, ein dritter wäre erzwungen.

**KosmoTrain** (`modules/train/TrainWorkspace.tsx`): (1) `train-kuration`
(die Kurations-Arbeit an einzelnen Beispielen) bleibt primär während eine
Kuration läuft; (2) `train-export` tritt zurück, solange kuriert wird, rückt
vor sobald `eintraege.length > 0` und Ruhe herrscht (analog Werkplan-Export-
Hebung in Design); (3) `train-stand`-Kennzahlenzeile ist immer primär (reine
Statusanzeige, keine Dimmung — bewusste Nicht-Adaption als drittes,
begründetes Nicht-Hebel).

**KosmoAsset** (`modules/asset/AssetWorkspace.tsx`): (1) `asset-search`/
`asset-sammlung`/`asset-facet-*` bleiben primär während getippt/gefiltert
wird; (2) `asset-detail` (das gewählte Objekt-Dossier: `asset-formats`/
`asset-rights`/`asset-refs`) wird nie gedimmt, solange ein Objekt gewählt ist
(Anti-Dimm); (3) oft genutzter Tab (`tab-objekte`/`asset-tab-bauteile`/
`asset-tab-materialien`) wird per Top-3-Hebung markiert.

**KosmoDev** (`modules/dev/DevWorkspace.tsx`): (1) `dev-job-status` (laufender
Werkstatt-Auftrag) ist IMMER primär, solange ein Auftrag läuft — reinstes
Anti-Dimm-Beispiel im ganzen System (ein laufender Prozess darf nie
verschwinden); (2) `auftrag-erfassen`/Erfassungsfeld tritt zurück, sobald
Aufträge (`auftrag-karte`) in Bearbeitung sind — man erfasst nicht Neues,
während man beobachtet; (3) `workorder-export`/`workorder-uebergeben` rücken
vor, sobald `offene === 0` (nichts mehr offen — Übergabe ist jetzt dran).

**Ehrlich:** Vis/Publish/Prepare/Doc/Train/Asset/Dev sind hier auf Basis
realer `data-testid`s entworfen, aber **nicht** gegen den vollen
Komponentencode jeder Datei geprüft (Zeit-/Scope-Grenze dieses B-0-Konzepts).
B2..Bn (Abschnitt 4) verifizieren vor dem Bau je Station den vollständigen
State, exakt wie B1 es für KosmoData in diesem Dokument bereits tut.

---

## 4. Batch-Plan B1..Bn

**B1 — Adaptions-Kern extrahieren + auf KosmoData ausrollen** *(wird heute
Nacht gebaut, implementierungsreif spezifiziert)*

- **Ziel:** die zwei Design-spezifischen Verschmelzungen in
  `oberflaeche-adaption.ts` (Abschnitt 2) auftrennen in Kern + Design-Adapter
  (Regression = null für DesignWorkspace), und KosmoData als erste zweite
  Station ans selbe Regelwerk anschliessen.
- **Dateien:**
  - NEU `apps/kosmo-orbit/src/state/oberflaeche-adaption-kern.ts` — Inhalt
    exakt wie API-Schnitt in Abschnitt 3.1: Storage-Layer (1:1 aus
    `oberflaeche-adaption.ts` Z. 330–525 verschoben), Rang-/Opazitäts-Helfer
    (Z. 134–298 verschoben, `gehobenesElementDerGruppe`/
    `gruppeIstOftGenutzt` um den `alleGruppen`-Parameter erweitert statt
    `LEISTEN_GRUPPEN` zu lesen), plus NEU die drei Primitive
    `stufeAusRegel`/`wendeAntiDimmAn`/`wendeNutzerHebungAn` (aus dem
    Design-Monolithen Z. 184–213 herausgezogen) und `darfUmordnen`
    (Signatur ändert sich leicht: nimmt `aktionLaeuft: boolean` direkt statt
    `TaetigkeitsKontext`, da der Kern `TaetigkeitsKontext` nicht kennt).
    Zusätzlich der `useAdaptionsSteuerung()`-Hook (Entscheid 4): kapselt
    `stabilerKontext`/`nutzungSnapshot`/Debounce-Timer/`adaptionIstAn`-State
    generisch über `G extends string`.
  - `apps/kosmo-orbit/src/state/oberflaeche-adaption.ts` — wird zum
    Design-Adapter: `LeistenGruppe`/`TaetigkeitsKontext`/`LEISTEN_BASIS`/
    `TAETIGKEITS_REGELN`/`ZEICHEN_WERKZEUG_IDS`/`leiteTaetigkeitsKontextAb`
    bleiben, aber `adaptiveFokusStufe()` ruft jetzt
    `stufeAusRegel`→`wendeAntiDimmAn`(zweimal: Punktkette/Drag UND
    `ebenen`+`panelOffen`)→Werkplan-Phasen-Sonderfall (bleibt lokal, ist
    NICHT generisch)→`wendeNutzerHebungAn` aus dem Kern auf, statt es selbst
    zu berechnen. **Exportierte Signatur unverändert** — `DesignWorkspace.tsx`
    braucht keine Änderung, bestehende Tests (`test/oberflaeche-adaption.test.ts`,
    `e2e/oberflaeche-adaption.spec.ts`) bleiben ohne Anpassung grün (Diff-Check
    wie J3a in `SERIE-J-BUILDPLAN.md` Abschnitt 5).
  - NEU `apps/kosmo-orbit/src/state/oberflaeche-adaption-data.ts` —
    KosmoData-Konfiguration, analog zu Design:
    ```ts
    export type DatenGruppe = 'navigation' | 'suche' | 'sync' | 'dossier';
    const ALLE_DATEN_GRUPPEN: readonly DatenGruppe[] = ['navigation','suche','sync','dossier'];

    export const DATEN_LEISTEN_BASIS: Record<DatenGruppe, FokusStufe> = {
      navigation: 'primaer', suche: 'sekundaer', sync: 'sekundaer', dossier: 'sekundaer',
    };

    export interface DatenTaetigkeitsKontext {
      tab: DataTab;            // aktiver Tab, aus DataWorkspace
      aktionLaeuft: boolean;   // query.trim().length > 0 (Suche/Filter aktiv getippt)
      panelOffen: boolean;     // selected !== null (Dossier offen)
    }

    export function leiteDatenTaetigkeitsKontextAb(params: {
      tab: DataTab; query: string; dossierOffen: boolean;
    }): DatenTaetigkeitsKontext;

    // Matrix (2 Zeilen Sonderregel, Rest 'basis'):
    //  suche:  beim Suchen → 'primaer' (Anti-Dimm über aktionLaeuft, kein Matrix-Sonderfall nötig)
    //  sync:   beim Suchen → 'selten'
    //  dossier: bei offenem Panel → 'primaer' (Anti-Dimm über panelOffen)
    export function adaptiveDatenFokusStufe(
      gruppe: DatenGruppe, basis: FokusStufe,
      kontext: DatenTaetigkeitsKontext, nutzung: NutzungsProfil,
    ): FokusStufe;
    ```
    `adaptiveDatenFokusStufe` komponiert exakt dieselben drei Kern-Primitive
    wie Design, nur mit der Daten-Matrix (`sync`→`selten` bei `aktionLaeuft`,
    `dossier`→Anti-Dimm bei `panelOffen`, `suche`→Anti-Dimm bei `aktionLaeuft`)
    statt der Zeichnen-Matrix.
  - `apps/kosmo-orbit/src/modules/data/DataWorkspace.tsx` — Verdrahtung
    analog zu `DesignWorkspace.tsx` Z. 700–826:
    1. `data-testid="leiste-gruppe-navigation"` um die Tab-Reihe (heutige
       Zeilen ~392–415), Klasse aus `fokusKlasse(stufeFuerGruppe('navigation'))`.
    2. `data-testid="leiste-gruppe-suche"` um Suchfeld + `filter-sammlung` +
       Sektor-Chips (heutige Zeilen ~459–492, nur im `referenzen`-Tab
       gerendert — Gruppe existiert nur dort, das ist zulässig, Design hat
       mit `verlauf` denselben Fall nicht, aber `ebenen` ist ebenfalls nur
       bedingt relevant je nach Panel-Zustand).
    3. `data-testid="leiste-gruppe-sync"` um den bestehenden `data-sync`-
       Knopf (heutige Zeile ~443–445) — dafür aus der Badge-Zeile in einen
       eigenen `<span>` gezogen (reine Markup-Umhüllung, keine
       Verhaltensänderung).
    4. `data-testid="leiste-gruppe-dossier"` um den `has_3d`-Aktionsblock
       im Dossier (heutige Zeilen ~739–764: `ref3d-laden`/`ref3d-kein-lokal`);
       das Dossier selbst (`ref-detail-dossier`) bleibt unverändert
       gerendert (bedingt auf `selected`), nur der Aktionsblock trägt die
       Fokus-Klasse.
    5. `nutzungMelden('navigation:${tab}')` bei jedem Tab-Klick,
       `nutzungMelden('sync:sync-button')` bei Sync-Klick,
       `nutzungMelden('dossier:ref3d-laden')`/`nutzungMelden('dossier:ref-asset')`
       bei den Dossier-Aktionen.
    6. Ein `adaption-hinweis`- und ein `adaption-schalter`/`adaption-reset`-
       Trio, **dieselben `data-testid`s wie in Design** (kollisionsfrei, weil
       nie zwei Stationen gleichzeitig gemountet sind) — platziert neben dem
       `data-sync`-Knopf, da KosmoData kein «Projekt ▾»-Menü hat wie Design.
  - NEU `apps/kosmo-orbit/test/oberflaeche-adaption-kern.test.ts` — die
    Kern-Primitive isoliert getestet (Rang-Helfer, Storage-Layer-Härte wie
    heute in `oberflaeche-adaption.test.ts`, aber ohne jeden Design-Bezug).
  - `apps/kosmo-orbit/test/oberflaeche-adaption.test.ts` — bleibt unverändert
    grün (beweist Regressionsfreiheit des Design-Adapters).
  - NEU `e2e/oberflaeche-adaption-data.spec.ts` — **exakt dieselbe Machart**
    wie `e2e/oberflaeche-adaption.spec.ts` (Abschnitt 2), übertragen auf
    KosmoData:
    1. Ruhezustand (`referenzen`-Tab, kein Suchtext, kein `selected`):
       `leiste-gruppe-suche`/`leiste-gruppe-sync` auf T7-Basis `sekundaer`,
       `adaption-hinweis` unsichtbar.
    2. Text in `data-search` tippen: `leiste-gruppe-suche` → `primaer`,
       `leiste-gruppe-sync` → `selten`, `adaption-hinweis` sichtbar und
       nennt «Sync».
    3. **Feste Anker:** `data-testid`-Reihenfolge unter
       `[data-testid="referenzen-werkzeugleiste"]` (neuer Wrapper, analog
       `design-werkzeugleiste`) bleibt vor/nach Tippen identisch.
    4. Eine Referenz öffnen (`ref-card` klicken) während weiter getippt
       wird: `leiste-gruppe-dossier` bleibt `primaer`, nie gedimmt.
    5. Suchfeld leeren, 2 s warten (Debounce, `ADAPTION_DEBOUNCE_MS` aus dem
       Kern importiert statt lokal dupliziert): Gruppen zurück auf Basis.
    6. Opt-out (`adaption-schalter` aus) → exakte T7-Basisklassen sofort;
       Reset (`adaption-reset`) → Profil geleert, Schalter unverändert,
       `localStorage`-Schlüssel `kosmo.adaption.v1` bleibt derselbe wie in
       Design (geteilter Speicher, Entscheid 2).
- **Abnahme (grün/rot):** `npm run typecheck` + `npm test` (neue +
  bestehende `oberflaeche-adaption*`-Tests grün, ≥10 neue Kern-/Daten-Fälle)
  + `npm run build`, dann volle Playwright-Suite inkl. beider
  `oberflaeche-adaption*.spec.ts`; Goldens byte-identisch (reiner
  UI-/State-Umbau, kein Kernel-Zugriff); `DesignWorkspace.tsx`-Diff zeigt
  **keine** Verhaltensänderung (nur ggf. Import-Pfad-Wechsel in
  `oberflaeche-adaption.ts` selbst).
- **Grenze:** B1 baut nur die «Voll-UI»-Stufe für KosmoData (dimmen, wie
  Design es heute tut) — die härteren Immersions-Stufen (Arbeits-UI,
  Zeichnen-pur, Abschnitt 3.2) sind NICHT Teil von B1.

**B2 — Immersions-Stufen «Arbeits-UI» bauen (stationsübergreifend)**
Baut auf B1s Kern. Neuer, dritter State im Kern (`immersionsStufe: 'voll'|
'arbeit'`), Kopfleiste (`App.tsx`) reagiert (Icon-only), Kollaps der
`.k-sekundaer`/`.k-selten`-Gruppen auf Icon-Reihe (kein neues CSS-System,
bestehende Motion-Tokens `--k-motion-base` + `prefers-reduced-motion`).
Kurzbefehl `Tab` (Design zuerst, da dort schon am meisten Werkzeuge). E2E:
Kurzbefehl togglet, Rand-Mausbewegung togglet zurück, Anti-Dimm-Panels bleiben
ausgenommen.

**B3 — Immersions-Stufe «Zeichnen-pur» (Design/Sketch zuerst)**
Baut auf B2. Nur im aktiven Sketch-Werkzeug (`tool==='skizze'` oder
3D-Sketch-Modus), nur nach explizitem Nutzer-Klick auf einen neuen
`data-testid="immersion-eckindikator"`. Kopfleiste/Werkzeugleiste komplett
`visibility:hidden` (nicht `display:none`, damit Playwright/A11y-Tools sie
weiter finden), Eckindikator bleibt immer sichtbar. E2E: Ecktipp aktiviert,
`Escape`/Erneuter Tipp deaktiviert, kein Layout-Ruck (Regel 2.3.1 gilt weiter).

**B4 — Rollout auf KosmoVis + KosmoPublish**
Zwei Stationen mit klarem Anti-Dimm-Kandidaten (laufender Render-Job,
aktives Blattlayout) — Matrix + Verdrahtung nach Abschnitt 3.3, exakt nach
B1-Vorbild (eigene `oberflaeche-adaption-vis.ts`/`-publish.ts`, gleiche
Kern-Primitive, gleiche E2E-Machart).

**B5 — Rollout auf KosmoPrepare + KosmoAsset + KosmoTrain**
Analog B4, die drei Stationen mit Datei-/Katalog-Charakter (Import,
Objekt-Dossier, Kurations-Fortschritt).

**B6 — Rollout auf KosmoDoc + KosmoDev**
Die zwei schlankesten Stationen (nur 2 Hebel je Abschnitt 3.3) — kleinster
Batch, schliesst den systemweiten Rollout ab.

**B7 — Schlussreview + Doku**
`docs/OBERFLAECHE-FOKUS-SYSTEMATIK.md` bekommt einen «J2»-Abschnitt (analog
zum heutigen «J3»-Abschnitt), ROADMAP-Sammel-Check über alle B1..B6-Einträge,
volle System-E2E einmal am Stück.

Jeder Batch: Gate (`typecheck`+`test`+`build`) + volle E2E, eigener
deutscher Commit mit Trailern, eigener Push, ROADMAP-Eintrag vor dem
Phase-3-Marker — Owner-Arbeitsmuster (`CLAUDE.md`), unverändert.

---

## 5. Ehrliche Restgrenzen

- Der Referenz-Katalog (Abschnitt 1) ist zu drei Fünfteln live verifiziert
  (Blender/Apple/Procreate), zu zwei Fünfteln Wissensstand ohne
  Live-Quelle in diesem Durchlauf (Ableton, Figma, Games-HUDs) — klar
  gekennzeichnet, nicht verschleiert.
- Die 2–3-Hebel-Vorschläge für Vis/Publish/Prepare/Doc/Train/Asset/Dev
  (Abschnitt 3.3) beruhen auf `data-testid`-Scans, nicht auf vollständiger
  Code-Lektüre jeder Datei — B2..B6 verifizieren vor dem eigentlichen Bau
  gegen den vollständigen Stand, wie B1 es für KosmoData in diesem Dokument
  bereits vollständig getan hat.
- «Arbeits-UI»/«Zeichnen-pur» (Abschnitt 3.2) sind Konzept, nicht Bau — B1
  liefert ausschliesslich die «Voll-UI»-Dimm-Stufe für KosmoData, die
  härteren Stufen sind B2/B3.
- Die geteilte `useAdaptionsSteuerung()`-Hook-Extraktion (Entscheid 4) ist im
  API-Schnitt benannt, aber ihre exakte interne Form legt der bauende
  Sonnet-Agent fest — die Zeilen 710–826 in `DesignWorkspace.tsx` sind das
  verbindliche Verhalten, das sie 1:1 reproduzieren muss (Regressionstest:
  bestehende Design-E2E bleibt unverändert grün).
