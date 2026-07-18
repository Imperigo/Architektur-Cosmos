import { useState } from 'react';
import { KButton, KIcon, KInput, melde, meldeFehler } from '@kosmo/ui';
import { planToDxf, sheetToSvg, transmittalCsv, type Sheet, type Storey } from '@kosmo/kernel';
import { useProject } from '../../../../state/project-store';
import { usePublishRuntime } from '../../publish-runtime';
import { exportSetSvgs, exportSheetPdf, exportSheetSetPdf } from '../../export-sheets';
import { publishInhaltsRegistry } from './registry';
import '../publish-island.css';

/**
 * AUSTAUSCH-Insel (PC3, `docs/V084-SPEZ.md` §5 W3, C-19) — PDF-Export,
 * SVG/DXF-Export und Export-Hub (Publikations-Sets). «Manuell» ist
 * `hatPopup:false` (`publish-island-katalog.ts`) und läuft über
 * `PublishWorkspace.tsx`s `onWerkzeugAktion` — kein Registry-Eintrag nötig
 * (Muster `vis/island/inhalte/austausch.tsx`s Kopfkommentar, das seinerseits
 * `DesignWorkspace.tsx`s `'manuell'`-Werkzeug spiegelt).
 *
 * Die drei Export-Funktionen (`exportSheetPdf`/`exportSetSvgs`/
 * `exportSheetSetPdf`) sind bereits eigenständige, komponentenfreie
 * Funktionen (`export-sheets.ts`) — UNVERÄNDERT wiederverwendet, keine
 * zweite Export-Pipeline.
 */

function useAktivesBlatt(): { sheet: Sheet | null; sheets: Sheet[] } {
  const revision = useProject((s) => s.revision);
  void revision;
  const doc = useProject.getState().doc;
  const sheets = doc.byKind<Sheet>('sheet').sort((a, b) => a.index - b.index);
  const aktiverSheetId = usePublishRuntime((s) => s.aktiverSheetId);
  const sheet = sheets.find((s) => s.id === aktiverSheetId) ?? sheets[0] ?? null;
  return { sheet, sheets };
}

function ExportPdfStufe2() {
  const { sheet } = useAktivesBlatt();
  return (
    <div className="pubisl-stufe2" data-testid="island-export-pdf-stufe2" onClick={(e) => e.stopPropagation()}>
      <div className="pubisl-reihe">
        <KButton size="sm" tone="accent" data-testid="island-export-set" onClick={() => void exportSheetSetPdf().catch((err) => meldeFehler(err))}>
          <KIcon name="export" size={14} /> Plansatz PDF
        </KButton>
        <KButton
          size="sm"
          tone="quiet"
          data-testid="island-export-blatt-pdf"
          disabled={!sheet}
          onClick={() => sheet && void exportSheetPdf(sheet.id).catch((err) => meldeFehler(err))}
        >
          Blatt PDF
        </KButton>
      </div>
    </div>
  );
}

function ExportSvgDxfStufe2() {
  const revision = useProject((s) => s.revision);
  void revision;
  const doc = useProject.getState().doc;
  const storeys = doc.storeysOrdered();
  const { sheet } = useAktivesBlatt();

  const exportSvg = () => {
    if (!sheet) return;
    const svgMarkup = sheetToSvg(doc, sheet.id, { projectName: doc.settings.projectName });
    const url = URL.createObjectURL(new Blob([svgMarkup], { type: 'image/svg+xml' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = `${doc.settings.projectName.replace(/\s+/g, '-')}-${sheet.name.replace(/\s+/g, '-')}.svg`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 10_000);
  };

  const exportDxf = () => {
    const storeyId = storeys[0]?.id;
    if (!storeyId) return;
    const storey = doc.get<Storey>(storeyId);
    const dxf = planToDxf(doc, storeyId);
    const url = URL.createObjectURL(new Blob([dxf], { type: 'application/dxf' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = `${doc.settings.projectName.replace(/\s+/g, '-')}-${storey?.name ?? 'Grundriss'}.dxf`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 10_000);
  };

  return (
    <div className="pubisl-stufe2" data-testid="island-export-svg-dxf-stufe2" onClick={(e) => e.stopPropagation()}>
      <div className="pubisl-reihe">
        <KButton size="sm" tone="ghost" data-testid="island-export-blatt-svg" disabled={!sheet} onClick={exportSvg}>
          <KIcon name="export" size={14} /> Blatt SVG
        </KButton>
        <KButton size="sm" tone="ghost" data-testid="island-export-dxf" disabled={storeys.length === 0} onClick={exportDxf}>
          <KIcon name="export" size={14} /> Grundriss DXF
        </KButton>
      </div>
    </div>
  );
}

function ExportHubStufe3() {
  const revision = useProject((s) => s.revision);
  void revision;
  const runCommand = useProject((s) => s.runCommand);
  const doc = useProject.getState().doc;
  const { sheets } = useAktivesBlatt();
  const [neuesSetName, setNeuesSetName] = useState('');
  const sets = doc.settings.publikationsSets ?? [];

  const setSpeichern = () => {
    const name = neuesSetName.trim();
    if (!name) {
      melde('Erst einen Set-Namen eingeben.', { ton: 'fehler' });
      return;
    }
    if (sheets.length === 0) {
      melde('Kein Blatt im Plansatz — erst in der BLATT-Insel eines anlegen.', { ton: 'fehler' });
      return;
    }
    try {
      runCommand('publish.setSpeichern', { name, sheetIds: sheets.map((s) => s.id) });
      setNeuesSetName('');
      melde(`Set «${name}» gespeichert (${sheets.length} ${sheets.length === 1 ? 'Blatt' : 'Blätter'})`, { ton: 'erfolg' });
    } catch (err) {
      meldeFehler(err);
    }
  };

  return (
    <div className="pubisl-stufe2" data-testid="island-export-hub-stufe2" onClick={(e) => e.stopPropagation()}>
      {sets.length === 0 ? (
        <p className="pubisl-hinweis">Noch kein Publikations-Set gespeichert.</p>
      ) : (
        sets.map((set) => (
          <div key={set.name} className="pubisl-reihe" data-testid="island-pubset-eintrag">
            <span>{set.name} · {set.sheetIds.length} Blätter</span>
            <KButton size="sm" tone="quiet" data-testid="island-pubset-pdf" onClick={() => void exportSheetSetPdf(set)}>PDF</KButton>
            <KButton size="sm" tone="ghost" data-testid="island-pubset-svg" onClick={() => exportSetSvgs(set)}>SVGs</KButton>
            <KButton
              size="sm"
              tone="ghost"
              data-testid="island-pubset-transmittal"
              onClick={() => {
                const csv = transmittalCsv(doc, set);
                const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
                const a = document.createElement('a');
                a.href = url;
                a.download = `${set.name.replace(/\s+/g, '-')}-Transmittal.csv`;
                a.click();
                URL.revokeObjectURL(url);
              }}
            >
              <KIcon name="export" size={14} title="Transmittal-Liste exportieren" />
            </KButton>
          </div>
        ))
      )}
      <div className="pubisl-reihe">
        <KInput size="sm" value={neuesSetName} onChange={(e) => setNeuesSetName(e.target.value)} placeholder="Set-Name…" data-testid="island-pubset-name" />
        <KButton size="sm" tone="quiet" data-testid="island-pubset-speichern" onClick={setSpeichern}>Set speichern</KButton>
      </div>
    </div>
  );
}

publishInhaltsRegistry.registriere('export-pdf', { Stufe2: ExportPdfStufe2, Stufe3: ExportPdfStufe2 });
publishInhaltsRegistry.registriere('export-svg-dxf', { Stufe2: ExportSvgDxfStufe2, Stufe3: ExportSvgDxfStufe2 });
publishInhaltsRegistry.registriere('export-hub', { Stufe2: ExportHubStufe3, Stufe3: ExportHubStufe3 });
