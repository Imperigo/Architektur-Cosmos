import type { ModuleId } from '@kosmo/ui';

/**
 * «Funktionen & Neues» — kuratierte Release-Notizen fürs zentrale
 * Einstellungs-Panel (Serie K / Batch A4, Owner-Befund K14: «Einstellungsmenüs
 * … Funktionen & Neues»). Reine Datentabelle (unit-testbar), die Darstellung
 * lebt in `Einstellungen.tsx`.
 *
 * Ehrlichkeitsregel (Owner-Mandat): jeder Punkt ist gegen einen ROADMAP.md-
 * Beleg geprüft — kein Wunsch, kein Plan, keine Konzept-Recherche (die
 * reinen Doku-Batches wie Vorform-/Finch-/LoRA-Konzept oder die Notion-Scan-
 * Auswertung sind bewusst NICHT hier drin, sie sind kein Produktivcode).
 * `station` markiert Punkte, die auf eine einzelne Werkstation zutreffen
 * (für die stationsgefilterte Ansicht des Einstellungs-Panels); allgemeine
 * App-Änderungen bleiben ohne `station`.
 */

export interface NeuigkeitPunkt {
  /** Kurzer, ehrlicher Satz — was wirklich gebaut wurde. */
  text: string;
  /** Nur gesetzt, wenn der Punkt einer einzelnen Station zuzuordnen ist. */
  station?: ModuleId;
}

export interface NeuigkeitenEintrag {
  /** Semver-Kurzform, z.B. "0.6.2". */
  version: string;
  /** ISO-Datum (YYYY-MM-DD). */
  datum: string;
  /** true = diese Version ist noch nicht ausgeliefert («in dieser Version»). */
  inArbeit?: boolean;
  punkte: NeuigkeitPunkt[];
}

/** Liste bleibt absteigend nach Version — die neuste zuerst (Test bewiesen). */
export const NEUIGKEITEN: NeuigkeitenEintrag[] = [
  {
    version: '0.6.3',
    datum: '2026-07-09',
    punkte: [
      {
        text: 'Neues Feld «Teilphase» (SIA-Projektstand Wettbewerb…Abnahme) im Projekt-Menü — getrennt vom Plan-Detaillierungsgrad, koppelt bewusst nicht automatisch.',
        station: 'design',
      },
      {
        text: 'Kosmo ist jetzt ein schwebendes Symbol statt eines dauerhaft offenen Chat-Panels — ein Klick öffnet das grosse Panel bei Bedarf.',
      },
      {
        text: 'Zentrale: Kacheln zeigen bei Hover die enthaltenen Werkzeuge, ein Info-Icon je Kachel erklärt die Station.',
      },
      {
        text: 'Erster Start: Kosmo fragt «Neu hier?» — der Rundgang startet nur noch auf Wunsch, nie mehr automatisch.',
      },
      {
        text: 'Zentrales Einstellungs-Panel (dieses hier): Darstellung, Rundgang, Kosmo/Werkzeuge und Oberflächen-Anpassung an einem Ort, dazu je Station erreichbar.',
      },
      {
        text: 'KosmoDesign: linkes Entwurfs-Dock (Sprechen · Skizzieren mit 3 Annäherungs-Vorschauen · CAD), Fähigkeiten-Icons, Werkzeug-Icons mit Mehr-Menü und Zero-Click-Statusleiste.',
        station: 'design',
      },
      {
        text: 'Plan mit Zoom-Detailstufen: aus der Distanz bleibt nur, was lesbar ist — Öffnungen und Umbau-Farbcode immer sichtbar.',
        station: 'design',
      },
      {
        text: 'Bauphasen-Presets: beim Teilphasen-Wechsel bietet Kosmo passende Fähigkeiten an — anwenden oder ablehnen, nie stumm umgebaut.',
        station: 'design',
      },
      {
        text: 'Vollprojekt-Werkzeuge: KV-Grobschätzung (Richtwert, kein Devis), Bauablauf-Balkenplan, Baugesuch-Blattsatz mit Ausnützungsnachweis, Mängel & Abnahmeprotokoll.',
        station: 'design',
      },
      {
        text: 'KosmoPublish: «Blatt füllen» belegt Blätter automatisch mit fehlenden Plänen und meldet ehrlich, was im Modell fehlt.',
        station: 'publish',
      },
      {
        text: 'KosmoVis: Auto-Kamera aus dem Modell, Cycles-Presets und Bildkomposition am Render-Node.',
        station: 'vis',
      },
      {
        text: 'Kosmo-Vorschläge zeigen Vorher/Nachher-Mini-Grundrisse mit farbiger Diff-Hervorhebung.',
      },
      {
        text: 'Leistung: auf Wunsch prüft Kosmo die Systemleistung (nur echte Browser-Werte) und drosselt die Render-Qualität passend — manuell übersteuerbar.',
      },
      {
        text: 'Material-Programm Stufe 1: Quelle als Pflichtfeld, echte Dimensionen, 3D-Würfel-Vorschau.',
        station: 'asset',
      },
    ],
  },
  {
    version: '0.6.2',
    datum: '2026-07-08',
    punkte: [
      {
        text: 'Grundlagenstudie-Bericht v2: Empfehlung mit Begründung zuerst, Vergleichstabelle mit markierter Bestzelle, «Grenzen der Studie» als eigener Abschnitt.',
        station: 'design',
      },
      {
        text: 'Umbau-Pläne: Bestand konsequent grau, kein Diagonalkreuz mehr, keine Rasterachsen mehr auf dem Blatt.',
        station: 'design',
      },
      {
        text: 'Studien-Panel überdeckt die Geschossleiste nicht mehr — Popup-Kollision behoben.',
        station: 'design',
      },
      {
        text: 'Geschosshöhe wählbar mit Herkunft (Wettbewerb/Architekt/SIA-Minimum/Standard), wirkt auch aufs Gewerbe-Erdgeschoss.',
        station: 'design',
      },
      {
        text: 'Doppelte «KosmoDesign»-Beschriftung in der Werkzeugleiste entfernt.',
        station: 'design',
      },
      {
        text: 'Unternehmerplan-Import per Drag & Drop, Erklärtexte einklappbar hinter «?».',
        station: 'publish',
      },
      {
        text: '«App deinstallieren…» als eigener Menüpunkt in der Kopfleiste, mit ehrlicher Anleitung je Betriebssystem.',
      },
      {
        text: 'Website: Download-Bereich und Deinstallations-Anleitung für alle Editionen und Plattformen.',
      },
    ],
  },
  {
    version: '0.6.1',
    datum: '2026-07-08',
    punkte: [
      {
        text: 'Volumenstudie: Regler starten aus der Zonenregel (Höhe, Ziel-Geschossfläche, Grenzabstand) statt aus festen Zahlen.',
        station: 'design',
      },
      {
        text: 'Studien-Vergleich zeigt einen Besonnungs-Richtwert (Wintersonnenwende) je Extremvariante.',
        station: 'design',
      },
      {
        text: 'Studien-Vergleich zeigt die Raumprogramm-Erfüllung je Extremvariante.',
        station: 'design',
      },
      {
        text: 'Kosmo kann die Volumenstudie jetzt selbst auslösen und die gewählte Variante als Baukörper übernehmen.',
        station: 'design',
      },
      {
        text: 'Neuer Studienbericht als druckfähiges SVG-Blatt mit den Kennwerten aller Varianten.',
        station: 'design',
      },
      {
        text: 'Die adaptive Werkzeugleiste (lernt genutzte Werkzeuge) läuft jetzt auch in KosmoData, nicht mehr nur in KosmoDesign.',
        station: 'data',
      },
      {
        text: 'Unternehmerpläne als PDF werden erkannt und ehrlich zurückgemeldet, statt in den DXF-Import zu laufen.',
        station: 'publish',
      },
    ],
  },
];

/** Alle Punkte einer Station über ALLE Versionen, neuste zuerst — für die
 *  stationsgefilterte Ansicht des Einstellungs-Panels. */
export function neuigkeitenFuerStation(
  station: ModuleId,
): { version: string; inArbeit?: boolean; punkt: NeuigkeitPunkt }[] {
  const treffer: { version: string; inArbeit?: boolean; punkt: NeuigkeitPunkt }[] = [];
  for (const eintrag of NEUIGKEITEN) {
    for (const punkt of eintrag.punkte) {
      if (punkt.station === station) {
        treffer.push({
          version: eintrag.version,
          ...(eintrag.inArbeit !== undefined ? { inArbeit: eintrag.inArbeit } : {}),
          punkt,
        });
      }
    }
  }
  return treffer;
}
