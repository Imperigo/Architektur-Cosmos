import type { SzenarioSkript } from '@kosmo/ai';

/**
 * Journey B «Mehrfamilienhaus» (v0.6.7 Nachtkampagne) — EIN durchgehendes
 * SzenarioSkript für den ScriptedProvider (`packages/kosmo-ai/src/scripted.ts`):
 * eine Benutzersimulation, die den kompletten Rohbau AUSSCHLIESSLICH über den
 * Kosmo-Chat aufbaut (`e2e/kosmo-journey-mfh.spec.ts`, Baustein `kosmoChatSkript`).
 *
 * WICHTIGE ARCHITEKTUR-EINSICHT (Befund, siehe Abschlussbericht): ein
 * `SkriptZug.toolCalls`-Array ist zur Autorenzeit VOLLSTÄNDIG statisch — es
 * gibt keine Rückkopplung von einem Tool-ERGEBNIS (z.B. einer frisch
 * erzeugten Wand-/Geschoss-ID) in die Argumente eines SPÄTEREN Zugs. Diese
 * Journey umgeht das, indem sie `storeyId`/`assemblyId` in JEDEM Zug
 * WEGLÄSST — `ChatSession.applyDefaults()` (packages/kosmo-ai/src/chat.ts)
 * füllt beides aus dem App-Kontext (aktives Geschoss / erster Wandaufbau)
 * automatisch, GENAU wie ein echter Nutzer es täte, der storeyId nie selbst
 * nennt. Das geht nur, WEIL das aktive Geschoss (EG) während des ganzen
 * Chat-Baus nie wechselt — siehe Zug 8 (Geschosswechsel) + Zug 9 (Dach).
 *
 * 0.6.8-ABLÖSUNG (Restpunkt aus der 0.6.7-Nachtkampagne, vormals Befund 6):
 * `ui.geschossSetzen` (H-33, `state/kosmo-ui-werkzeuge.ts`) ist seit 0.6.7
 * ein echtes Chat-Werkzeug (`ui_geschossSetzen`) — Zug 8 unten wechselt das
 * aktive Geschoss GENAU wie ein Nutzer es täte, «wechsle ins Dachgeschoss»,
 * BEVOR Zug 9 das Dach zeichnet. Das Walmdach landet dadurch über den
 * echten Chat-Weg auf dem RICHTIGEN (obersten) Geschoss — der frühere
 * `window.__kosmo.run`-Fallback in `kosmo-journey-mfh.spec.ts` (falsches
 * Dach löschen + auf dem obersten Geschoss neu anlegen) entfällt.
 * `ui.geschossSetzen` ist ein READ-TOOL (App-Zustand, kein Doc-Patch, kein
 * Undo-Eintrag, `packages/kosmo-ai/src/chat.ts` `readTools`) — es läuft
 * SOFORT ohne Diff-Karten-Gate (`KosmoPanel.tsx` `kosmoUiWerkzeuge`-
 * Kommentar). Der geteilte Baustein `kosmoChatSkript` (`e2e/sim/
 * bausteine.ts`) erwartet für JEDEN Zug mit genau einem Tool-Call eine
 * `proposal-card` — die bei einem reinen Read-Tool NIE entsteht. Zug 8
 * läuft darum NICHT über `kosmoChatSkript`, sondern manuell (Muster wie
 * Zug 1 in `kosmo-journey-mfh.spec.ts`): Text senden, auf den wieder
 * aktiven Send-Knopf warten, `activeStoreyId` pollen — kein Karten-Klick.
 * Ziel-Geschoss «3.OG» ist deterministisch: `bootstrapProject()`
 * (state/project-store.ts) legt IMMER genau EG(index 0) + 1.OG(index 1) an,
 * `design.geschossKopieren({anzahl:2})` (Zug 7) stapelt danach auf dem
 * höchsten bestehenden Index (`design.ts` 'design.geschossKopieren':
 * `index = maxIndex + n`) — die zwei neuen Geschosse heissen darum immer
 * «2.OG» (index 2) und «3.OG» (index 3), unabhängig vom Szenario.
 */
export const MFH_SKRIPT: SzenarioSkript = {
  id: 'journey-b-mfh',
  zuege: [
    // 1) Raster + Stützen ----------------------------------------------------
    {
      nutzerErwartung: 'raster',
      antwortText:
        'Ich lege ein Stützenraster über den Grundriss (5 Hauptachsen à 6 m, 3 Querachsen à 7 m) und setze auf jede Kreuzung eine Stütze.',
      toolCalls: [
        { name: 'design_rasterSetzen', args: { achsmass: 6000, anzahl: 5, querAchsmass: 7000, querAnzahl: 3 } },
        { name: 'design_stuetzenAusRaster', args: {} },
      ],
    },
    // 2) Aussenwände EG als Rechteck 24 × 14 m -------------------------------
    {
      nutzerErwartung: 'wände',
      antwortText: 'Ich zeichne die vier Aussenwände des EG als Rechteck, 24 × 14 m.',
      toolCalls: [
        { name: 'design_wandZeichnen', args: { a: { x: 0, y: 0 }, b: { x: 24000, y: 0 } } },
        { name: 'design_wandZeichnen', args: { a: { x: 24000, y: 0 }, b: { x: 24000, y: 14000 } } },
        { name: 'design_wandZeichnen', args: { a: { x: 24000, y: 14000 }, b: { x: 0, y: 14000 } } },
        { name: 'design_wandZeichnen', args: { a: { x: 0, y: 14000 }, b: { x: 0, y: 0 } } },
      ],
    },
    // 3) Decke EG -------------------------------------------------------------
    {
      nutzerErwartung: 'decke',
      antwortText: 'Und die Bodenplatte/Decke über dem ganzen Grundriss.',
      toolCalls: [
        {
          name: 'design_deckeZeichnen',
          args: {
            outline: [
              { x: 0, y: 0 },
              { x: 24000, y: 0 },
              { x: 24000, y: 14000 },
              { x: 0, y: 14000 },
            ],
          },
        },
      ],
    },
    // 4) Zonen: Treppenhaus + zwei Wohnungen -----------------------------------
    // (Der Wohnungs-Segmentierer ist NICHT als Chat-Tool ansprechbar — kein
    // Command in packages/kosmo-kernel/src/commands, nur ein UI-Knopf
    // «segmentierer-lauf» im BerechnungslistePanel. Befund 3.)
    {
      nutzerErwartung: 'zonen',
      antwortText:
        'Ich lege das Erschliessungstreppenhaus in die Mitte und je eine Wohnzone links und rechts an.',
      toolCalls: [
        {
          name: 'design_zoneErstellen',
          args: {
            outline: [
              { x: 10500, y: 6000 },
              { x: 13500, y: 6000 },
              { x: 13500, y: 8000 },
              { x: 10500, y: 8000 },
            ],
            name: 'Treppenhaus',
            sia: 'VF',
            raumTyp: 'treppenhaus',
          },
        },
        {
          name: 'design_zoneErstellen',
          args: {
            outline: [
              { x: 1000, y: 1000 },
              { x: 10000, y: 1000 },
              { x: 10000, y: 13000 },
              { x: 1000, y: 13000 },
            ],
            name: 'Wohnung West',
            sia: 'HNF',
            raumTyp: 'wohnen',
            program: 'preisguenstig',
          },
        },
        {
          name: 'design_zoneErstellen',
          args: {
            outline: [
              { x: 14000, y: 1000 },
              { x: 23000, y: 1000 },
              { x: 23000, y: 13000 },
              { x: 14000, y: 13000 },
            ],
            name: 'Wohnung Ost',
            sia: 'HNF',
            raumTyp: 'wohnen',
            program: 'marktgerecht',
          },
        },
      ],
    },
    // 5) Fassadenmodul zeichnen -------------------------------------------------
    {
      nutzerErwartung: 'fassadenmodul',
      antwortText: 'Ich zeichne ein Lochfassaden-Modul mit einem Fenster pro Feld.',
      toolCalls: [
        {
          name: 'design_modulSpeichern',
          args: {
            name: 'Lochfassade MFH',
            breite: 3000,
            hoehe: 3000,
            elemente: [{ x: 900, y: 1100, b: 1200, h: 1500, typ: 'fenster' }],
          },
        },
      ],
    },
    // 6) Fenster stanzen ---------------------------------------------------------
    {
      nutzerErwartung: 'fenster',
      antwortText: 'Jetzt stanze ich die Fenster aus dem Modul in alle Aussenwände.',
      toolCalls: [{ name: 'design_fensterAusModulen', args: { modul: 'Lochfassade MFH' } }],
    },
    // 7) Geschosse stapeln ---------------------------------------------------------
    {
      nutzerErwartung: 'geschosse',
      antwortText: 'Ich staple das EG zweimal — das ergibt die Regelgeschosse darüber.',
      toolCalls: [{ name: 'design_geschossKopieren', args: { anzahl: 2 } }],
    },
    // 8) Aktives Geschoss aufs oberste (3.OG) wechseln — echter Chat-Weg
    // (ui.geschossSetzen, H-33/0.6.8-Ablösung, siehe Kopfkommentar) statt des
    // früheren window.__kosmo.run-Fallbacks. LÄUFT NICHT über kosmoChatSkript
    // (Read-Tool, keine Diff-Karte) — kosmo-journey-mfh.spec.ts spielt diesen
    // Zug manuell.
    {
      nutzerErwartung: 'geschoss',
      antwortText: 'Ich wechsle aufs oberste Geschoss (3.OG), bevor ich das Dach zeichne.',
      toolCalls: [{ name: 'ui_geschossSetzen', args: { name: '3.OG' } }],
    },
    // 9) Walmdach — dank Zug 8 landet storeyId (aus applyDefaults()) jetzt
    // ehrlich auf dem obersten Geschoss, nicht mehr auf EG.
    {
      nutzerErwartung: 'dach',
      antwortText: 'Und obendrauf ein Walmdach, 35° Neigung.',
      toolCalls: [
        {
          name: 'design_dachErstellen',
          args: {
            outline: [
              { x: 0, y: 0 },
              { x: 24000, y: 0 },
              { x: 24000, y: 14000 },
              { x: 0, y: 14000 },
            ],
          },
        },
      ],
    },
    // 10) Material/Aufbau -------------------------------------------------------
    {
      nutzerErwartung: 'material',
      antwortText: 'Ich lege noch einen Klinker-Aussenwandaufbau im Katalog an, für die Materialisierung.',
      toolCalls: [
        {
          name: 'design_aufbauErstellen',
          args: {
            name: 'AW Klinker 36',
            target: 'wall',
            layers: [
              { material: 'klinker', thickness: 115, function: 'bekleidung' },
              { material: 'daemmung-mw', thickness: 160, function: 'daemmung' },
              { material: 'beton', thickness: 180, function: 'tragend' },
            ],
          },
        },
      ],
    },
  ],
};

/** Nutzertexte je Zug — in der Reihenfolge von `MFH_SKRIPT.zuege` (für
 * `kosmoChatSkript`s `optionen.nutzerTexte`). */
export const MFH_NUTZERTEXTE: readonly string[] = [
  'Leg mir bitte ein Stützenraster über den Grundriss und setz gleich die Stützen.',
  'Zeichne die vier Aussenwände im EG als Rechteck, 24 auf 14 Meter.',
  'Jetzt noch die Decke über den ganzen Grundriss.',
  'Leg das Treppenhaus in die Mitte und je eine Wohnzone links und rechts an.',
  'Zeichne mir ein Lochfassaden-Modul mit einem Fenster pro Feld.',
  'Stanz die Fenster aus dem Modul in alle Aussenwände.',
  'Stapel das EG zweimal für die Regelgeschosse.',
  'Wechsle aufs oberste Geschoss, das 3.OG.',
  'Und jetzt ein Walmdach obendrauf, 35 Grad.',
  'Leg mir noch einen Klinker-Aussenwandaufbau im Katalog an.',
];
