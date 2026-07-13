/**
 * Onboarding-Wizard (v0.7.6 Welle 3 Stream E) — reine Schritt-Metadaten, kein
 * React. Vier Schritte nach dem ClaudeDesign-Soll-Bild («Kosmo Viz
 * Onboarding.dc.html», README §10): Konto & Büro · Kosmo-Zentrale koppeln ·
 * Modelle & Core laden · Erstes Projekt & Zweig.
 *
 * Die Rollenfarben je Schritt übernehmen exakt die Zuordnung aus der
 * Design-Vorlage (`var(--role-system)`/`-manual`/`-agent`/`-generator`) —
 * übersetzt auf unsere Tokens: «system/teal» ist hier `--k-signal` (README
 * §10: «Signal (die «system/teal»-Rolle der Soll-Referenz) als Tönung»),
 * die übrigen drei sind die bestehenden `--k-rolle-*`-Volltöne/-Tönungen aus
 * dem v0.7.6-Fundament (Phase 0). Kein neuer Farbwert — alles Bestand.
 */

export type OnboardingSchrittId = 'konto' | 'zentrale' | 'werkzeuge' | 'projekt';

export interface OnboardingSchrittMeta {
  id: OnboardingSchrittId;
  /** «01» … «04» — wie im Soll-Bild, versal im Mono-Auge. */
  nummer: string;
  /** Kurztitel im linken Stepper. */
  railTitel: string;
  /** Mono-Unterzeile im Stepper («Identität · Rolle» etc.). */
  railUntertitel: string;
  /** Volle Überschrift im Hauptbereich. */
  titel: string;
  /** Fliesstext unter der Überschrift — ehrlich, ohne Politur-Übertreibung. */
  beschreibung: string;
  /** Schluss-Hinweis mit Schild-Symbol («alles lokal»-Ton). */
  hinweis: string;
  /** Rollenfarbe (CSS-Var) — Volltöne für Text/Rand, `-fill`/`-line` für Flächen. */
  farbe: string;
  farbeFill: string;
  farbeLine: string;
  /** Text des primären Weiter-Knopfs (Soll-Bild: «Weiter»/«Koppeln»/… ). */
  cta: string;
}

export const ONBOARDING_SCHRITTE: OnboardingSchrittMeta[] = [
  {
    id: 'konto',
    nummer: '01',
    railTitel: 'Konto & Büro',
    railUntertitel: 'Identität · Rolle',
    titel: 'Konto & Büro',
    beschreibung:
      'Kein Cloud-Login nötig — dein «Konto» bleibt an diesen lokalen Core gebunden. Wähle deine Rolle; sie ordnet die Zentrale und färbt, was Kosmo dir zuerst zeigt. Den Projektnamen setzt du gleich in Schritt 04.',
    hinweis: 'Dein Konto bleibt an den lokalen Core gebunden — kein zentrales Login, keine fremde Instanz.',
    farbe: 'var(--k-signal)',
    farbeFill: 'var(--k-signal-fill)',
    farbeLine: 'var(--k-signal-line)',
    cta: 'Weiter',
  },
  {
    id: 'zentrale',
    nummer: '02',
    railTitel: 'Kosmo-Zentrale',
    railUntertitel: 'Lokaler Core · Hardware',
    titel: 'Kosmo-Zentrale koppeln',
    beschreibung:
      'Ohne eigene HomeStation im Netz ist hier ehrlich nichts vorgetäuscht: wir prüfen live, ob eine lokale Bridge erreichbar ist. Läuft noch keine, richtest du sie über «Werkzeuge einrichten» ein oder wählst eine andere Betriebsart.',
    hinweis: 'Verbindung bleibt lokal — keine Cloud, kein Upload.',
    farbe: 'var(--k-rolle-manuell)',
    farbeFill: 'var(--k-rolle-manuell-fill)',
    farbeLine: 'var(--k-rolle-manuell-line)',
    cta: 'Weiter',
  },
  {
    id: 'werkzeuge',
    nummer: '03',
    railTitel: 'Modelle & Core',
    railUntertitel: 'On-device · Kern-Werkzeuge',
    titel: 'Modelle & Core laden',
    beschreibung:
      'Die schweren Brocken (LLM-Gewichte, Render-/Sprach-Werkzeuge) stecken nicht in der App — sie werden gezielt geholt. Unten steht der reale Stand deiner Kern-Werkzeuge für die aktuelle Betriebsart, kein erfundener Ladebalken.',
    hinweis: 'Läuft im Hintergrund weiter — du kannst schon zum ersten Projekt springen.',
    farbe: 'var(--k-rolle-agent)',
    farbeFill: 'var(--k-rolle-agent-fill)',
    farbeLine: 'var(--k-rolle-agent-line)',
    cta: 'Im Hintergrund weiter',
  },
  {
    id: 'projekt',
    nummer: '04',
    railTitel: 'Erstes Projekt',
    railUntertitel: 'Projekt · Ableitung',
    titel: 'Erstes Projekt & Zweig',
    beschreibung:
      'Dein Projekt existiert schon — bestätige oder ändere den Namen. Einen eigenen «Zweig» musst du nicht anlegen: Grundriss, Mengen und Visualisierung laufen automatisch aus dem Doc mit, sobald du zeichnest.',
    hinweis: 'Du bleibst Autor — die KI wird zum Instrument, nie zum Ersatz.',
    farbe: 'var(--k-rolle-generator)',
    farbeFill: 'var(--k-rolle-generator-fill)',
    farbeLine: 'var(--k-rolle-generator-line)',
    cta: 'Kosmos betreten',
  },
];
