import type { Auftrag } from '../state/auftragsbuch';
import type { Sia112Gruppe } from '../state/orbit-rang';
import type { KosmoZustand } from '../state/kosmo-status';
import { OFFENE_LAUF_STATUS, type NodeLauf, type NodeLaufStatus } from '../modules/vis/vis-runtime';

/**
 * V0.7.2 W4-G (Paket-Ergänzung «Companion minimal», Spec §10) — reine,
 * unit-getestete Ableitung der Job-/Freigabe-Karten aus den ZWEI
 * bestehenden Laufzeit-Quellen (KEINE Zweitimplementierung, KEIN neuer
 * Job-Typ): `state/auftragsbuch.ts` (KosmoDev-Auftragsbuch, IndexedDB) und
 * `modules/vis/vis-runtime.ts` (Render-Läufe, In-Memory je Sitzung). Kein
 * React, kein DOM — `Companion.tsx` liest nur diese Karten und rendert sie.
 *
 * Ehrlichkeitsregel (Spec §10 wörtlich): «Lese-/Freigabe-Companion, KEIN
 * Zeichnen … wenn vis-runtime im Web-Fallback leer ist, zeigt die Ansicht
 * einen ehrlichen Leerzustand.» Darum zeigen beide Ableitungen NUR
 * tatsächlich LAUFENDE Einträge (Auftrag: `offen`/`an-worker`, niemals
 * `erledigt` — das ist kein «laufender» Auftrag mehr; Vis-Lauf:
 * `OFFENE_LAUF_STATUS`, dieselbe Liste, die auch `vis-runtime.ts` selbst als
 * «noch offen» führt — keine zweite, abweichende Filterliste hier erfunden).
 */

/** Vereinigung der beiden Quell-Status-Räume — je EINE Karte trägt entweder
 *  einen Auftragsbuch- ODER einen Vis-Laufzeit-Status, nie gemischt. */
export type CompanionKartenStatus = Auftrag['status'] | NodeLaufStatus;

export type CompanionKartenTon = 'ruhe' | 'laeuft' | 'erfolg' | 'fehler';

export interface CompanionKarte {
  /** Stabiler React-`key` UND `data-testid`-Suffix (`companion-job-{id}`). */
  id: string;
  /** UPPERCASE-Mono-Label (Spec §0 Grundregel 5) — die Komponente selbst
   *  macht daraus keine zweite Gross/Klein-Wandlung, der Text kommt hier
   *  bereits fertig. */
  titel: string;
  status: CompanionKartenStatus;
  /** CSS-Custom-Property-NAME (ohne `var(...)`) — Rollenfarbe nur, weil ein
   *  Agent/Werkzeug (Dev-Worker bzw. HomeStation-Bridge) beteiligt ist
   *  (Spec §0 Grundregel 3), keine Farbe ohne Bedeutung. */
  rolle: string;
  /** true nur bei einem Vis-Lauf, der WIRKLICH freigebbar ist (Status
   *  `wartetFreigabe` UND `jobId`/`approvalToken` vorhanden — sonst könnte
   *  die Freigabe-Route gar nicht aufgerufen werden, s. `vis-jobs.ts`). */
  brauchtFreigabe: boolean;
  nodeId?: string;
  jobId?: string;
  approvalToken?: string;
}

/** Rollenfarbe je Quelle (Spec-§3-Tabelle «Station→Glyphe→Rolle»:
 *  dev→`--k-rolle-pna`, vis→`--k-rolle-generator`) — dieselben Konstanten
 *  wie `werkzeug-glyphen.tsx`s `STATION_GLYPHE`, hier nicht importiert (kein
 *  React-Bezug in dieser Datei), aber wörtlich identisch. */
export const AUFTRAG_ROLLE = '--k-rolle-pna';
export const VIS_ROLLE = '--k-rolle-generator';

/** UPPERCASE-Mono-Statuslabel je möglichem Status (Spec §0 Grundregel 5) —
 *  EINZIGE Quelle, `Companion.tsx` erfindet keine zweite Übersetzung. */
export const STATUS_LABEL: Record<CompanionKartenStatus, string> = {
  offen: 'OFFEN',
  'an-worker': 'BEIM WORKER',
  erledigt: 'ERLEDIGT',
  gesendet: 'GESENDET',
  wartetFreigabe: 'WARTET AUF FREIGABE',
  wartetGpu: 'WARTET AUF GPU',
  rendert: 'RENDERT',
  fertig: 'FERTIG',
  fehler: 'FEHLER',
  abgebrochen: 'ABGEBROCHEN',
  zeitueberschreitung: 'ZEITÜBERSCHREITUNG',
};

/** Status-Punkt-Ton je Status — reine Bedeutungs-Zuordnung (Spec §0
 *  Grundregel 3 «Farbe nur mit Bedeutung»), `Companion.tsx` übersetzt das
 *  erst in eine konkrete Token-Farbe (`--k-warning`/`--k-info`/…). */
export const STATUS_TON: Record<CompanionKartenStatus, CompanionKartenTon> = {
  offen: 'ruhe',
  'an-worker': 'laeuft',
  erledigt: 'erfolg',
  gesendet: 'laeuft',
  wartetFreigabe: 'laeuft',
  wartetGpu: 'laeuft',
  rendert: 'laeuft',
  fertig: 'erfolg',
  fehler: 'fehler',
  abgebrochen: 'ruhe',
  zeitueberschreitung: 'fehler',
};

/** Auftragsbuch → Karten: nur laufende Aufträge (`offen`/`an-worker`) —
 *  `erledigt` ist kein «laufender Auftrag» mehr (Ehrlichkeitsregel oben). */
export function auftragsKarten(auftraege: readonly Auftrag[]): CompanionKarte[] {
  return auftraege
    .filter((a) => a.status !== 'erledigt')
    .map((a) => ({
      id: `auftrag-${a.id}`,
      titel: a.text,
      status: a.status,
      rolle: AUFTRAG_ROLLE,
      brauchtFreigabe: false,
    }));
}

/** Vis-Runtime-Läufe → Karten: nur `OFFENE_LAUF_STATUS` (dieselbe Liste, die
 *  `vis-runtime.ts` selbst als «noch offen» führt) — `fertig`/`fehler`/
 *  `abgebrochen`/`zeitueberschreitung` sind keine laufenden Aufträge mehr. */
export function visKarten(laeufe: Record<string, NodeLauf>): CompanionKarte[] {
  return Object.entries(laeufe)
    .filter(([, lauf]) => (OFFENE_LAUF_STATUS as readonly string[]).includes(lauf.status))
    .map(([nodeId, lauf]) => ({
      id: `vis-${nodeId}`,
      titel: `RENDER · ${nodeId}`,
      status: lauf.status,
      rolle: VIS_ROLLE,
      brauchtFreigabe:
        lauf.status === 'wartetFreigabe' && lauf.jobId !== undefined && lauf.approvalToken !== undefined,
      nodeId,
      ...(lauf.jobId !== undefined ? { jobId: lauf.jobId } : {}),
      ...(lauf.approvalToken !== undefined ? { approvalToken: lauf.approvalToken } : {}),
    }));
}

/** Beide Quellen zusammen, Freigabe-bedürftige Karten zuerst (die
 *  dringendste menschliche Handlung zuoberst) — `Array.prototype.sort` ist
 *  stabil, die Reihenfolge INNERHALB der beiden Gruppen bleibt erhalten. */
export function companionKarten(auftraege: readonly Auftrag[], laeufe: Record<string, NodeLauf>): CompanionKarte[] {
  const karten = [...visKarten(laeufe), ...auftragsKarten(auftraege)];
  return karten.sort((a, b) => Number(b.brauchtFreigabe) - Number(a.brauchtFreigabe));
}

/** Phasen-Ring (Spec §10 «Kreisprogress n/5 aus `sia112Gruppe()`») — 5
 *  Segmente, die ersten `gruppe` davon «gefüllt». Reine Geometrie-freie
 *  Ableitung; `Companion.tsx` übersetzt das erst in SVG-Winkel. */
export function phasenSegmente(gruppe: Sia112Gruppe): readonly boolean[] {
  return [1, 2, 3, 4, 5].map((n) => n <= gruppe);
}

/**
 * v0.7.6 Welle 2 (Companion-Fläche, orb-zentriert) — Anzeige-Text je echtem
 * `KosmoZustand` (`state/kosmo-status.ts`, 9 Werte, bereits gebaute
 * State-Machine — hier NUR eine reine Text-/Farb-Ableitung, KEIN zweiter
 * Automat). `Companion.tsx` zeigt diese Info als RUHIGE LEGENDE, nicht als
 * Wähler: Companion treibt keine `ChatSession` (Spec-Ehrlichkeitsgrenze,
 * Kopfkommentar `Companion.tsx`) — ein Klick könnte den echten Zustand nicht
 * ehrlich auslösen, darum bleibt die Legende rein lesend.
 *
 * Farben lehnen sich an den ClaudeDesign-Soll (Kosmo Viz Companion.dc.html)
 * an — idle≈system/ruhig, hörend/spricht/schreibt≈Signal, denkt≈Agent-Rolle,
 * dispatching≈Generator-Rolle (Hand-off an ein Werkzeug) — erweitert auf alle
 * 9 echten Zustände (der Soll-Bild-Demo-Automat kannte nur 4). */
export interface ZustandInfo {
  /** UPPERCASE-Mono-Badge (Spec §0 Grundregel 5). */
  label: string;
  /** CSS-Custom-Property-NAME (ohne `var(...)`). */
  farbe: string;
  /** Ein Satz, grounded — «Der Architekt bleibt Autor» als wiederkehrender Ton. */
  caption: string;
}

export const ZUSTAND_INFO: Record<KosmoZustand, ZustandInfo> = {
  idle: {
    label: 'BEREIT',
    farbe: '--k-ink-faint',
    caption: 'Bereit. Der Architekt bleibt Autor — ich bin das Instrument.',
  },
  thinking: {
    label: 'DENKT NACH',
    farbe: '--k-rolle-agent',
    caption: 'Denkt nach — verknüpft Projektwissen und Kontext.',
  },
  listening: {
    label: 'HÖRT ZU',
    farbe: '--k-signal',
    caption: 'Hört zu. Sag, was der Zweig tun soll.',
  },
  speaking: {
    label: 'SPRICHT',
    farbe: '--k-signal',
    caption: 'Spricht die Antwort vor.',
  },
  writing: {
    label: 'SCHREIBT',
    farbe: '--k-signal',
    caption: 'Schreibt die Antwort.',
  },
  dispatching: {
    label: 'SENDET AUFTRAG',
    farbe: '--k-rolle-generator',
    caption: 'Übergibt den Vorschlag zur Ausführung.',
  },
  done: {
    label: 'FERTIG',
    farbe: '--k-success',
    caption: 'Fertig — Ergebnis übernommen.',
  },
  error: {
    label: 'FEHLER',
    farbe: '--k-danger',
    caption: 'Etwas ist schiefgelaufen — Details im Verlauf.',
  },
  takeover: {
    label: 'ÜBERNIMMT',
    farbe: '--k-signal',
    caption: 'Wendet ein grösseres Paket sichtbar an — jederzeit unterbrechbar.',
  },
};

/** Stabile Anzeige-Reihenfolge der Legende (Companion.tsx) — bewusst nicht
 *  `Object.keys(ZUSTAND_INFO)` an der Render-Stelle (Reihenfolge dort nicht
 *  spec-garantiert), sondern hier EINMAL explizit festgelegt. */
export const ALLE_ZUSTAENDE: readonly KosmoZustand[] = [
  'idle',
  'listening',
  'thinking',
  'speaking',
  'writing',
  'dispatching',
  'done',
  'error',
  'takeover',
];
