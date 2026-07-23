# V092-SPEZ «Massgenau» — Druckmass, Profile, Detail, Vertiefung

> Owner-Entscheide 23.07.2026 (AskUserQuestion): ALLE vier Stränge gewählt
> (Profil-Manager · Geländer/Rampe-Vertiefung · Detail-Werkzeug ·
> UI-Politur) + Testregime «release-gate light». Fest aus 22.07.:
> **K27-Druckmass ist der EINE Golden-Zug** dieser Version.

## Betriebsregime bis v1.0 (Owner-Entscheid 23.07., verbindlich)

Für alle Zwischenversionen ab 0.9.2 gilt: **kein Voll-E2E-Komplettlauf,
keine Installer-/Download-Zustellung** — beides kehrt für **v1.0** zurück.
Je Version bleibt das **release-gate light**: Typecheck (8 WS) + alle
Unit-Suiten + svg-qa + Secrets + SFT + Website-Sync (`npm run
release-gate`), dazu NUR die E2E-Specs der angefassten Bereiche. Die
Paket-Gates (Suiten, Golden-Disziplin, Tabu-Kreise, Copy-back exakter
Pfade) bleiben unverändert hart. Web/iPad aktualisieren per Push
automatisch; Desktop-Installer werden erst wieder für v1.0 gebaut und
zugestellt. Spiegel in `../../STAND.md`.

## Bau-Anker (Faktencheck 23.07.)

Druck-Beschriftung heute: `plansvg.ts:361-369` (`fontSize = (beschlag ?
1.8 : 2.2) * scale` — Papier-mm × Massstab, EINE Stelle). Automatische
Aussenbemassung: `derive/dimensions.ts` (`deriveDimensions`), Masskette-
Druckgrammatik seit 0.9.0 (602) als Vorbild. Stützenprofil heute:
`Column.profil: 'rechteck'|'rund'` (`entities.ts:57`, `columnOutline`
`entities.ts:92-96`); `Beam` hat NUR breite/hoehe/material
(`entities.ts:65-73`), keinerlei Profil-Referenz; ein Profil-Katalog
existiert nicht. Detail-Ableitung existiert nicht (kein `derive/detail*`).
Geländer/Rampe: `derive/gelaender.ts`/`derive/rampe.ts` (je EINE
Zerlegung), `deriveGelaender` ignoriert `art` bewusst (P-A1-Scope),
`eigenschaftSetzen` kennt `ramp` nicht (P-B2 ehrlich nur Anzeige).

## Posten

### P-K27 «Druckmass» (FABLE solo — der EINE Golden-Zug)
Die automatische Aussenbemassung (`deriveDimensions`) bekommt im Druckweg
(`plansvg.ts`) die volle Masslinien-Grammatik der Masskette (602):
Hilfslinien, Papier-Abstand, Überstand, feste Papier-Schrift, Verdichtung
enger Segmente — Druck == Bildschirm-Lesbarkeitsversprechen aus E-K27a.
**Ablauf wie 089 («Golden-Beweger»):** Fable schreibt an Tag A eine
Subspez mit VOLLSTÄNDIGER Erwartungsliste der bewegten Bestands-Goldens
(jede Datei mit Grund), DANN erst der Zug an Tag B. GW-092 Teil 2 muss
Ist==Erwartungsliste beweisen; jeder unerwartete Treffer = Hard-Stop.

### P-P1 «Profil-Manager Kern» (Sonnet, Worktree — Kernel)
Entity `Profil` (kind 'profil', projektglobal wie Assembly): `name`,
`form: 'rechteck'|'rund'|'stahl-i'|'stahl-u'`, Masse (b/h bzw. d, Steg/
Flansch bei Stahl), abgeleitete `profilOutline()` (Muster columnOutline).
Commands `design.profilErstellen`/`profilAendern`/`profilLoeschen`
(Löschen nur wenn unreferenziert — ehrliche Ablehnung sonst). `Column`
und `Beam` lernen OPTIONALES `profilId` (additiv; ohne profilId exakt
heutiges Verhalten — Golden-Guard!); Zerlegungen (columnOutline/
deriveColumn/deriveBeam) lesen bei gesetztem profilId die Profil-Outline.
Unit-Tests inkl. Referenz-Schutz. **Goldens 0** (kein Fixture trägt
profilId). TABU: plan.ts/plansvg/PlanView/DesignWorkspace/plan-hit-test.

### P-P2 «Profil-Manager UI» (Sonnet — App, nach P-P1)
Verwaltungs-Panel nach Aufbauten-Muster (Liste, Anlegen, Ändern, Löschen
mit Referenz-Hinweis), Inspector: Stütze/Unterzug bekommen Profil-Auswahl
(inkl. «— kein Profil —» = Bestandsverhalten). E2E island-/panel-seitig.
**TABU: Cluster-B-Dateien.**

### P-G «Geländer/Rampe-Vertiefung» (Sonnet, Worktree — Kernel)
(1) `art` wirkt in 3D: 'staketen' = senkrechte Stäbe (~120er-Teilung)
zwischen den Pfosten, 'voll' = geschlossene Brüstungsplatte, 'handlauf'
= heutiger Stand — alles in `deriveGelaender`, Geometrie weiterhin aus
`gelaenderTeile`. (2) `eigenschaftSetzen` lernt `ramp: ['width',
'hoehenDelta', 'podestLaenge']` mit DEMSELBEN ehrlichen Gate wie
`rampeGeometrieSetzen` (>15 % Ablehnung, keine Klemmung). (3) Podest im
Plan: `rampenTeile.plan` bekommt bei gesetztem `podestLaenge` eine
Podest-Trennlinie — Daten-Guard: das Golden-Fixture hat KEIN Podest,
`gelaender-rampe-plan.svg` bleibt byte-still (Beweis im Gate). Tests an
den Grenzen. **Goldens 0 bewegt.** TABU wie P-P1.

### P-D «Detail-Werkzeug v1» (Sonnet — Kernel-Daten; Cluster-B-Anteil FABLE)
Scope v1 BEWUSST schmal: Entity `DetailMarker` (kind 'detail': storeyId,
`bereich` [Rechteck a/b], `massstab` z.B. 1:5, `name`) + Command +
`derive/detail.ts`: Ausschnitt-Ableitung (Plan-Inhalte im Bereich,
skaliert) als DATEN + read-only-Detailansicht im PublishWorkspace
(eigene Karte, Muster Blattverzeichnis). KEIN eigenes Zeichnen im Detail
(= 0.9.3), KEIN plan.ts/plansvg-Einbau (Marker-Symbol im Druck wäre ein
ZWEITER Golden-Zug → Nicht-Ziel). Marker-Aufziehen im PlanView (Zwei-
Punkt, Muster Rampe) baut FABLE als kleinen Cluster-B-Nachzug an Tag B.

### P-U «UI-Politur» (Sonnet — App)
Referenzen-Tabelle: «Bild nicht lokal»-Fallback entquetschen (Ellipsis
statt Zeichenumbruch, Befund 618). Beschnitt-Sonde als npm-Script
(`npm run beschnitt-sonde`) mit Exit-Code (Funde ausserhalb der
deklarierten Line-Clamps = rot) → fester Bestandteil des release-gate
light AB 0.9.3 (in 0.9.2 erst Probelauf). Kleinreste aus Owner-
Screenshots, sofern gemeldet.

## Tage
**A:** P-P1 ‖ P-G ‖ P-U (Sonnet-Worktrees, Basis-Verifikations-Pflicht
Schritt 0) · Fable: P-K27-Subspez + Erwartungsliste (GW-092 Teil 1b).
**B:** P-K27 (Fable solo) ‖ P-P2 ‖ P-D · Fable: Detail-Marker-PlanView.
**C:** Matrix C-1…C-9 (Prüfer-Fan-out light) · release-gate light ·
Kurzritual (Bumps, neuigkeiten, lehren, STAND/CLAUDE, ROADMAP, Push —
OHNE Voll-E2E/Installer, Regime-Block oben).

## Sanktionen
1. Bewegter Bestands-Golden ausserhalb der P-K27-Erwartungsliste = Hard-Stop.
2. P-P1/P-G fassen plan.ts/plansvg/PlanView an = Scope-Bruch.
3. P-P2/P-D (Sonnet-Teil) fassen Cluster-B-Dateien an = Mandats-Bruch.
4. Gates stillschweigend klemmen statt ehrlich ablehnen = ungültig.
5. profilId/podestLaenge ohne Daten-Guard (Bestandsverhalten ändert sich
   ohne gesetztes Feld) = ungültig.
6. Voll-E2E/Installer «aus Gewohnheit» fahren = Regimeverstoss (Owner
   23.07.) — Zeit gehört den Features.

## Vollständigkeits-Matrix
C-1 Druckmass-Grammatik, Ist==Erwartungsliste, svg-qa 0 hart → P-K27 ·
C-2 Profil-Entity+Commands+Referenz-Schutz+Guards → P-P1 · C-3 Profil-UI
+ Inspector island-only → P-P2 · C-4 art wirkt in 3D (3 Formen) → P-G ·
C-5 ramp-Edits mit ehrlichem Gate → P-G · C-6 Podest-Plan hinter Guard,
gelaender-rampe-plan.svg byte-still → P-G · C-7 DetailMarker+Ableitung+
PlanView-Aufziehen, kein Druck-Einbau → P-D · C-8 Politur + Sonde als
Script → P-U · C-9 Kurzritual komplett nach Regime → Fable.

## Nicht-Ziele
Detail-Zeichnen im Ausschnitt + Detail-Marker im Druck (= 0.9.3, zweiter
Golden-Zug) · Stahlprofil-Normreihen-Katalog (HEA/IPE-Tabellen = Daten-
Posten später) · Sonnenstudien-Tool (KosmoSpez/R5) · KosmoTrain-Ingest
(bleibt bedingt: nur bei eingetroffenem Worker-Bericht, sonst erneut
deklarierter Entfall) · HDD-Voll-Index · Serie H/I/J.
