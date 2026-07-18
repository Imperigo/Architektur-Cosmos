import { useState } from 'react';
import { KButton } from '@kosmo/ui';
import { ingestDateienMitErgebnis, type IngestErgebnisEintrag } from '../../ingest-ergebnis';
import { OneDriveSection } from '../../prepare-sections';
import { prepareInhaltsRegistry } from './registry';
import '../prepare-island.css';

/**
 * AUFNAHME-Insel (PC4, `docs/V084-SPEZ.md` §5 W3, C-20) — Dateien
 * wählen/ingest (Drag&Drop + Dateidialog, inkl. Ausbau-Ergebnisanzeige je
 * Datei, Owner-Auftrag Punkt 2) und OneDrive verbinden/Ordner.
 */

function ErgebnisListe({ ergebnisse }: { ergebnisse: readonly IngestErgebnisEintrag[] }) {
  if (ergebnisse.length === 0) return null;
  const erfolge = ergebnisse.filter((e) => e.status === 'ok').length;
  const fehler = ergebnisse.filter((e) => e.status === 'fehler').length;
  return (
    <>
      <p className="prisl-hinweis-klein" data-testid="island-dateien-zusammenfassung">
        {erfolge} {erfolge === 1 ? 'Datei' : 'Dateien'} aufgenommen
        {fehler > 0 ? `, ${fehler} fehlgeschlagen` : ''}.
      </p>
      <div className="prisl-ergebnis-liste" data-testid="island-dateien-ergebnisse">
        {ergebnisse.map((e, i) => (
          <div
            key={`${e.name}-${i}`}
            className={`prisl-ergebnis-zeile${e.status === 'fehler' ? ' prisl-ergebnis-zeile--fehler' : ''}`}
            data-testid={`island-dateien-ergebnis-${i}`}
          >
            <span className="prisl-ergebnis-name">{e.name}</span>
            <span className="prisl-ergebnis-status">
              {e.status === 'ok' ? `✓ ${e.chunkCount} Abschnitt${e.chunkCount === 1 ? '' : 'e'}` : `⚠ ${e.fehler}`}
            </span>
          </div>
        ))}
      </div>
    </>
  );
}

/**
 * PC4-Ausbau (Owner-Auftrag Punkt 2, «EINE echte Verbesserung mit Beweis»):
 * anders als das Bestands-`PrepareWorkspace.tsx`s `addFiles` (ein einziges,
 * pro Fehlschlag überschriebenes `error`-Feld, s. `ingest-ergebnis.ts`-
 * Kopfkommentar) zeigt diese Insel das EHRLICHE Ergebnis je Datei — echte
 * Abschnittszahl bei Erfolg, echter Fehlertext bei Misserfolg, keine Datei
 * verschwindet stumm in einer Sammel-Fehlermeldung.
 */
function DateienInhalt() {
  const [dragOver, setDragOver] = useState(false);
  const [laufend, setLaufend] = useState(false);
  const [ergebnisse, setErgebnisse] = useState<IngestErgebnisEintrag[]>([]);

  async function verarbeite(files: FileList | File[]): Promise<void> {
    setLaufend(true);
    setErgebnisse([]);
    await ingestDateienMitErgebnis(files, {
      onDatei: (eintrag) => setErgebnisse((vorher) => [...vorher, eintrag]),
    });
    setLaufend(false);
  }

  function pickFiles(): void {
    const input = document.createElement('input');
    input.type = 'file';
    input.multiple = true;
    input.accept = '.pdf,.txt,.md,text/plain,application/pdf';
    input.onchange = () => input.files && void verarbeite(input.files);
    input.click();
  }

  return (
    <div className="prisl-stufe2" data-testid="island-dateien-stufe2" onClick={(e) => e.stopPropagation()}>
      <div
        className={`prisl-dropzone${dragOver ? ' prisl-dropzone--drag' : ''}`}
        data-testid="island-dateien-dropzone"
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          if (e.dataTransfer.files.length) void verarbeite(e.dataTransfer.files);
        }}
      >
        PDF, Text oder Markdown hierher ziehen
      </div>
      <KButton size="sm" tone="accent" onClick={pickFiles} disabled={laufend} data-testid="island-dateien-waehlen">
        {laufend ? 'Nehme auf …' : 'Dateien wählen'}
      </KButton>
      <ErgebnisListe ergebnisse={ergebnisse} />
    </div>
  );
}

function OneDriveInhalt() {
  // Wiederverwendet `prepare-sections.tsx`s `OneDriveSection` unverändert
  // (dieselbe Komponente wie im Manuell-Modus, s. dortiger Kopfkommentar) —
  // kein zweiter OneDrive-Weg,
  // kein Refresh-Callback nötig: die zentrale Bühne liest `docs` beim
  // nächsten Render ohnehin neu (`PrepareWorkspace()`s eigener `refresh`
  // läuft dort schon bei jedem Mount/Wechsel zurück nach 'manuell').
  return (
    <div className="prisl-stufe2" data-testid="island-onedrive-stufe2" onClick={(e) => e.stopPropagation()}>
      <OneDriveSection onIngested={() => {}} />
    </div>
  );
}

prepareInhaltsRegistry.registriere('dateien', { Stufe2: DateienInhalt, Stufe3: DateienInhalt });
prepareInhaltsRegistry.registriere('onedrive', { Stufe2: OneDriveInhalt, Stufe3: OneDriveInhalt });
