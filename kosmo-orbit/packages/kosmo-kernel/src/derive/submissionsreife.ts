import type { KosmoDoc } from '../model/doc';
import type { Assembly, Opening, Slab, Wall, Zone } from '../model/entities';
import { deriveAusmass } from './ausmass';

/**
 * Submissionsreife-Check (Block C, C-E8) — reine Ableitung: liest NUR das
 * Doc, kein DOM, kein Store. Wendet die Kriterien-Tabelle aus
 * docs/SUBMISSION-KONZEPT.md §1.4 auf das an, was das Datenmodell WIRKLICH
 * hergibt — gleiche Machart wie derive/checks.ts: «Richtwerte, kein
 * Normersatz». Es werden NUR Lücken gemeldet, die aus dem Doc beweisbar
 * sind — keine erfundenen Normwerte.
 *
 * Owner-Grundsatz (SIA 118 Art. 86–89, Konzept §1.4): erfordert eine
 * Bestellungsänderung eine Leistung ohne zutreffenden Einheitspreis/
 * Beschreibung im Leistungsverzeichnis, wird ein Nachtragspreis angefügt —
 * jede Lücke im Plan wird nach der Vergabe zum Nachtragspreis, zu
 * Konditionen ausserhalb des Wettbewerbs. Undefiniert = Zusatzkosten.
 *
 * Implementiert sind die Kriterien, die das Datenmodell hergibt (a–f aus dem
 * C1-Auftrag); die volle Konzept-Tabelle 1.4 kennt zusätzlich eBKP-Zuordnung
 * und Toleranz-/Genauigkeitsstufe — dafür trägt kein Entity ein Feld, diese
 * bleiben bewusst aussen vor (kein Normersatz durch Erfindung).
 */

export interface SubmissionsBefund {
  /** Betroffenes Bauteil (Wand/Decke/Öffnung/Zone); fehlt bei Gesamt-Hinweisen. */
  bauteilId?: string;
  /** Kurzer deutscher Text mit dem WARUM (Owner-Grundsatz). */
  text: string;
  /** luecke = harter Befund (Nachtragsrisiko), hinweis = weicher Befund. */
  schwere: 'luecke' | 'hinweis';
}

const NACHTRAGSRISIKO = 'undefiniert = Nachtragsrisiko bei der Vergabe (SIA 118 Art. 86–89)';

/** (a)+(b): Aufbau fehlt/leer, oder eine Schicht ohne Material — je Bauteil. */
function aufbauLuecke(bauteil: string, assembly: Assembly | undefined): string | null {
  if (!assembly || assembly.kind !== 'assembly') {
    return `${bauteil} ohne Aufbau — ${NACHTRAGSRISIKO}`;
  }
  if (assembly.layers.length === 0) {
    return `${bauteil}: Aufbau «${assembly.name}» hat keine Schichten — ${NACHTRAGSRISIKO}`;
  }
  const ohneMaterial = assembly.layers.some((l) => !l.material || l.material.trim() === '');
  if (ohneMaterial) {
    return `${bauteil}: Aufbau «${assembly.name}» hat eine Schicht ohne Material — ${NACHTRAGSRISIKO}`;
  }
  return null;
}

/**
 * Lückenliste je Bauteil für die Submissionsreife (SIA-Phase 4.41). Ohne
 * storeyId läuft der Check projektweit; mit storeyId nur im Geschoss (Zonen/
 * Wände/Decken direkt, Öffnungen über ihre Wirtwand). Reine Funktion, keine
 * Exceptions — leeres Doc liefert eine leere Liste.
 */
export function pruefeSubmissionsreife(doc: KosmoDoc, storeyId?: string): SubmissionsBefund[] {
  const befunde: SubmissionsBefund[] = [];
  const inScope = (sid: string) => !storeyId || sid === storeyId;

  // (a)+(b) Wände: Aufbau vorhanden + je Schicht ein Material benannt
  // (SIA 400 C.3.1.1 — Materialisierung/Sinnbilder im Werkplan).
  for (const w of doc.byKind<Wall>('wall')) {
    if (!inScope(w.storeyId)) continue;
    const text = aufbauLuecke('Wand', doc.get<Assembly>(w.assemblyId));
    if (text) befunde.push({ bauteilId: w.id, text, schwere: 'luecke' });
  }

  // (a)+(b) Decken: assemblyId ist im Datenmodell optional (Vorform-Betrieb
  // erlaubt Decken ohne Aufbau) — für die Submission ist das dennoch eine
  // Lücke, siehe Konzept-Tabelle 1.4 («Material/Aufbau benannt»).
  for (const s of doc.byKind<Slab>('slab')) {
    if (!inScope(s.storeyId)) continue;
    const assembly = s.assemblyId ? doc.get<Assembly>(s.assemblyId) : undefined;
    const text = aufbauLuecke('Decke', assembly);
    if (text) befunde.push({ bauteilId: s.id, text, schwere: 'luecke' });
  }

  // (c) Zonen ohne Raumtyp: Mengenzuordnung (eBKP/NPK-Kapitel je
  // Raumnutzung) bleibt unklar. Programm-Zonen (Wohnungs-Aggregate aus
  // Liste/Segmentierer) sind keine Einzelräume — gleiche Ausnahme wie
  // derive/checks.ts (pruefeGrundriss).
  for (const z of doc.byKind<Zone>('zone')) {
    if (!inScope(z.storeyId)) continue;
    if (z.program) continue;
    if (!z.raumTyp) {
      befunde.push({
        bauteilId: z.id,
        text: `Zone «${z.name}» hat keinen Raumtyp — Mengenzuordnung (eBKP/NPK-Kapitel) unklar`,
        schwere: 'hinweis',
      });
    }
  }

  // (d) Öffnungen ohne gültiges Mass: der Command-Weg sperrt width/height
  // ≤ 0 bereits per zod (.positive()) — dieser Check fängt Alt-/Importdaten,
  // die nicht über runCommand entstanden sind.
  for (const o of doc.byKind<Opening>('opening')) {
    const wall = doc.get<Wall>(o.wallId);
    if (wall && !inScope(wall.storeyId)) continue;
    if (o.width <= 0 || o.height <= 0) {
      const art = o.openingType === 'tuer' ? 'Tür' : o.openingType === 'fenster' ? 'Fenster' : 'Leibung';
      befunde.push({
        bauteilId: o.id,
        text: `${art} ohne gültiges Mass (${o.width}×${o.height} mm) — ${NACHTRAGSRISIKO}`,
        schwere: 'luecke',
      });
    }
  }

  // Guard: Gesamt-Hinweise (Phase, Ausmass) nur, wenn im Scope überhaupt
  // Bauteile stehen — ein leeres Doc/Geschoss bleibt eine leere Liste.
  const bauteileVorhanden =
    doc.byKind<Wall>('wall').some((w) => inScope(w.storeyId)) ||
    doc.byKind<Slab>('slab').some((s) => inScope(s.storeyId)) ||
    doc.byKind<Zone>('zone').some((z) => inScope(z.storeyId)) ||
    doc.byKind<Opening>('opening').some((o) => {
      const wall = doc.get<Wall>(o.wallId);
      return !wall || inScope(wall.storeyId);
    });
  if (!bauteileVorhanden) return befunde;

  // (e) Phase: Submission (SIA-Teilphase 4.41) verlangt Werkplan-
  // Detaillierung — Ausschreibungspläne stehen auf Werkplan-Niveau 1:50
  // (Konzept §1.2, SIA 400 Planfolge).
  if (doc.settings.phase !== 'werkplan') {
    befunde.push({
      text: `Projektphase «${doc.settings.phase}» — Submission verlangt Werkplan-Detaillierung (SIA 400 Planfolge)`,
      schwere: 'hinweis',
    });
  }

  // (f) Ausmass-Rückstich: derive/ausmass.ts rechnet doc-weit (kein
  // Geschoss-Parameter im heutigen Datenmodell) — Näherung: stehen im Scope
  // Wände, liefert das NPK-nahe Ausmass aber projektweit KEINE einzige
  // Position, ist etwas strukturell undefiniert, das die Einzel-Checks oben
  // nicht als Bauteil-Lücke fassen (z.B. alle Aufbauten im Doc ungültig).
  const waendeImScope = doc.byKind<Wall>('wall').some((w) => inScope(w.storeyId));
  if (waendeImScope && deriveAusmass(doc).positionen.length === 0) {
    befunde.push({
      text: 'Es gibt Wände, aber das NPK-nahe Ausmass liefert keine Positionen — Mengengrundlage prüfen',
      schwere: 'hinweis',
    });
  }

  return befunde;
}
