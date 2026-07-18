import { ingestFile, type KnowledgeDoc } from './knowledge';

/**
 * PC4-Ausbau (`docs/V084-SPEZ.md` §5 W3, C-20, Owner-Auftrag Punkt 2 «EINE
 * echte Verbesserung mit Beweis») — `ingestFile()` (`knowledge.ts`, NUR
 * konsumiert, keine Kernlogik-Änderung) gab schon vor PC4 ein `KnowledgeDoc`
 * mit `chunkCount` zurück ODER warf einen Fehler; die bisherige EINZIGE
 * Aufruferin (`PrepareWorkspace.tsx`s `addFiles`, Bestand, UNVERÄNDERT) nutzt
 * das nicht: ein einziges `error`-Feld wird bei mehreren Dateien in einer
 * Schleife pro Fehlschlag überschrieben — die vorletzte Datei scheitert
 * STUMM, nur der letzte Fehler bleibt sichtbar, und selbst ein Erfolg zeigt
 * nirgends, wie viele Abschnitte entstanden sind.
 *
 * Dieser Helfer sammelt das EHRLICHE Ergebnis JE Datei (Erfolg + echte
 * Abschnittszahl ODER der echte Fehlertext) — Grundlage für die
 * Ingest-Ergebnis-Anzeige der AUFNAHME-Insel (`island/inhalte/aufnahme.tsx`).
 * Bewusst NICHT rückwirkend in `PrepareWorkspace.tsx`s Bestands-`addFiles`
 * verdrahtet (Bestandsschutz «Manuell unverändert», s. Abschlussbericht) —
 * die Verbesserung lebt NUR im neuen Island-Weg.
 */
export interface IngestErgebnisEintrag {
  readonly name: string;
  readonly status: 'ok' | 'fehler';
  /** Nur bei `status:'ok'` gesetzt — echte Abschnittszahl aus `KnowledgeDoc.chunkCount`. */
  readonly chunkCount?: number;
  /** Nur bei `status:'fehler'` gesetzt — der echte Fehlertext (nie stumm verschluckt). */
  readonly fehler?: string;
}

/**
 * Nimmt mehrere Dateien auf und sammelt EIN Ergebnis je Datei — läuft
 * sequenziell (wie das Bestands-`addFiles`-Muster), damit `busy`-artige
 * Fortschrittsanzeigen der aufrufenden Komponente Datei für Datei
 * weiterschalten können (`onDatei`-Callback nach jeder abgeschlossenen
 * Datei, optional).
 */
export async function ingestDateienMitErgebnis(
  files: FileList | File[],
  optionen: {
    source?: KnowledgeDoc['source'];
    onDatei?: (ergebnis: IngestErgebnisEintrag, index: number, gesamt: number) => void;
  } = {},
): Promise<IngestErgebnisEintrag[]> {
  const liste = Array.from(files);
  const ergebnisse: IngestErgebnisEintrag[] = [];
  for (let i = 0; i < liste.length; i++) {
    const f = liste[i]!;
    let eintrag: IngestErgebnisEintrag;
    try {
      const doc = await ingestFile(f, optionen.source);
      eintrag = { name: f.name, status: 'ok', chunkCount: doc.chunkCount };
    } catch (err) {
      eintrag = { name: f.name, status: 'fehler', fehler: err instanceof Error ? err.message : String(err) };
    }
    ergebnisse.push(eintrag);
    optionen.onDatei?.(eintrag, i, liste.length);
  }
  return ergebnisse;
}
