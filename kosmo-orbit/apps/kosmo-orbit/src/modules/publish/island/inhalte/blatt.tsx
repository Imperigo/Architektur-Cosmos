import { useState } from 'react';
import { KButton, KSelect, meldeFehler } from '@kosmo/ui';
import { plankopfReserveMm, sheetPaperSize, type Sheet, type SheetFormat } from '@kosmo/kernel';
import { useProject } from '../../../../state/project-store';
import { usePublishRuntime } from '../../publish-runtime';
import { schnittLinie } from '../../publish-aktionen';
import { AutoPackPanel } from '../../AutoPackPanel';
import { publishInhaltsRegistry } from './registry';
import '../publish-island.css';

/**
 * BLATT-Insel (PC3, `docs/V084-SPEZ.md` §5 W3, C-19) — Stufe-2/3-Inhalte für
 * Blatt anlegen/wechseln, Ansicht platzieren und Auto-Pack. Reine
 * Registry-Komponenten (kein Prop-Pfad, Muster `vis/island/inhalte/*.tsx`):
 * sie lesen `publish-runtime.ts` (`aktiverSheetId`) + `useProject` direkt.
 *
 * `AutoPackPanel` wird UNVERÄNDERT wiederverwendet (Bauauftrag «Islands sind
 * Zugänge, keine Nachbauten») — nur `sheetId` kommt jetzt aus dem
 * Runtime-Store statt aus `PublishWorkspace.tsx`s lokalem `sheet`.
 */

const FORMATS: SheetFormat[] = ['A0', 'A1', 'A2', 'A3', 'A4', 'Rolle'];
const SCALES = [50, 100, 200, 500];

/** Reaktiver Lese-Helfer (`revision` + `aktiverSheetId` bleiben Hook-Abos —
 *  kein `.getState()`-Direktlesen, sonst rendert der Popup-Inhalt beim
 *  Blatt-Wechsel aus der BLATT-Liste nicht nach). Aufruf NUR aus einer
 *  Registry-Komponente heraus (Hook-Regeln), s. Aufrufer unten. */
function useAktivesBlatt(): { sheet: Sheet | null; sheets: Sheet[] } {
  const revision = useProject((s) => s.revision);
  void revision;
  const doc = useProject.getState().doc;
  const sheets = doc.byKind<Sheet>('sheet').sort((a, b) => a.index - b.index);
  const aktiverSheetId = usePublishRuntime((s) => s.aktiverSheetId);
  const sheet = sheets.find((s) => s.id === aktiverSheetId) ?? sheets[0] ?? null;
  return { sheet, sheets };
}

function BlattListeStufe2() {
  const revision = useProject((s) => s.revision);
  void revision;
  const doc = useProject.getState().doc;
  const runCommand = useProject((s) => s.runCommand);
  const sheets = doc.byKind<Sheet>('sheet').sort((a, b) => a.index - b.index);
  const aktiverSheetIdStore = usePublishRuntime((s) => s.aktiverSheetId);
  const setAktiverSheetId = usePublishRuntime((s) => s.setAktiverSheetId);
  const [format, setFormat] = useState<SheetFormat>('A1');
  const aktivId = sheets.some((s) => s.id === aktiverSheetIdStore) ? aktiverSheetIdStore : (sheets[0]?.id ?? null);

  const neuesBlatt = () => {
    try {
      const res = runCommand('publish.blattErstellen', {
        name: `Blatt ${sheets.length + 1}`,
        format,
        orientation: 'quer',
      });
      setAktiverSheetId((res.patches[0] as { id: string }).id);
    } catch (err) {
      meldeFehler(err);
    }
  };

  return (
    <div className="pubisl-stufe2" data-testid="island-blatt-stufe2" onClick={(e) => e.stopPropagation()}>
      {sheets.length === 0 ? (
        <p className="pubisl-hinweis">Noch kein Blatt im Plansatz.</p>
      ) : (
        <div className="pubisl-blatt-liste">
          {sheets.map((s) => (
            <button
              key={s.id}
              type="button"
              className={`pubisl-blatt-eintrag${s.id === aktivId ? ' pubisl-blatt-eintrag--aktiv' : ''}`}
              data-testid={`island-blatt-eintrag-${s.index}`}
              onClick={() => setAktiverSheetId(s.id)}
            >
              {s.name} · {s.format}
            </button>
          ))}
        </div>
      )}
      <div className="pubisl-reihe">
        <KSelect
          size="sm"
          data-testid="island-blatt-format"
          value={format}
          onChange={(e) => setFormat(e.target.value as SheetFormat)}
        >
          {FORMATS.map((f) => (
            <option key={f} value={f}>{f}</option>
          ))}
        </KSelect>
        <KButton size="sm" tone="quiet" data-testid="island-blatt-anlegen" onClick={neuesBlatt}>
          + Blatt
        </KButton>
      </div>
    </div>
  );
}

function AnsichtPlatzierenStufe2() {
  const revision = useProject((s) => s.revision);
  void revision;
  const doc = useProject.getState().doc;
  const runCommand = useProject((s) => s.runCommand);
  const storeys = doc.storeysOrdered();
  const { sheet } = useAktivesBlatt();
  const paper = sheet ? sheetPaperSize(sheet) : null;
  const [storeyId, setStoreyId] = useState('');
  const [scale, setScale] = useState(100);
  const aktivStoreyId = storeys.some((s) => s.id === storeyId) ? storeyId : (storeys[0]?.id ?? '');

  if (!sheet || !paper) {
    return (
      <div className="pubisl-stufe2" data-testid="island-platzieren-stufe2" onClick={(e) => e.stopPropagation()}>
        <p className="pubisl-hinweis">Erst ein Blatt anlegen (BLATT-Insel).</p>
      </div>
    );
  }

  const mitte = { x: paper.width / 2, y: (paper.height - plankopfReserveMm().hoehe) / 2 };

  const sicher = (fn: () => void) => {
    try {
      fn();
    } catch (err) {
      meldeFehler(err);
    }
  };

  const grundriss = () =>
    sicher(() =>
      runCommand('publish.ansichtPlatzieren', {
        sheetId: sheet.id,
        view: 'grundriss',
        storeyId: aktivStoreyId,
        scale,
        x: mitte.x,
        y: mitte.y,
      }),
    );
  const axo = () =>
    sicher(() =>
      runCommand('publish.ansichtPlatzieren', { sheetId: sheet.id, view: 'axo', scale: scale * 2, x: mitte.x, y: mitte.y }),
    );
  const bildSlot = () =>
    sicher(() => {
      const w = Math.min(120, paper.width * 0.35);
      runCommand('publish.bildPlatzieren', {
        sheetId: sheet.id,
        x: Math.round(paper.width / 2 - w / 2),
        y: Math.round(mitte.y - w / 3),
        w: Math.round(w),
      });
    });
  const schnitt = (richtung: 'schnitt' | 'nord' | 'ost' | 'sued' | 'west') =>
    sicher(() => {
      const l = schnittLinie(doc, richtung);
      if (!l) return;
      runCommand('publish.ansichtPlatzieren', {
        sheetId: sheet.id,
        view: 'schnitt',
        a: l.a,
        b: l.b,
        scale,
        x: mitte.x,
        y: mitte.y,
        title: l.titel,
      });
    });

  return (
    <div className="pubisl-stufe2" data-testid="island-platzieren-stufe2" onClick={(e) => e.stopPropagation()}>
      <div className="pubisl-reihe">
        <KSelect size="sm" data-testid="island-platzieren-geschoss" value={aktivStoreyId} onChange={(e) => setStoreyId(e.target.value)}>
          {storeys.map((s) => (
            <option key={s.id} value={s.id}>{s.name}</option>
          ))}
        </KSelect>
        <KSelect size="sm" data-testid="island-platzieren-massstab" value={scale} onChange={(e) => setScale(Number(e.target.value))}>
          {SCALES.map((s) => (
            <option key={s} value={s}>1:{s}</option>
          ))}
        </KSelect>
      </div>
      <div className="pubisl-reihe">
        <KButton size="sm" tone="quiet" data-testid="island-platzieren-grundriss" onClick={grundriss}>Grundriss</KButton>
        <KButton size="sm" tone="quiet" data-testid="island-platzieren-axo" onClick={axo}>Axo</KButton>
        <KButton size="sm" tone="quiet" data-testid="island-platzieren-bildslot" onClick={bildSlot}>Bild-Slot</KButton>
      </div>
      <div className="pubisl-reihe">
        {(
          [
            ['nord', 'N'],
            ['ost', 'O'],
            ['sued', 'S'],
            ['west', 'W'],
          ] as const
        ).map(([r, label]) => (
          <KButton key={r} size="sm" tone="quiet" data-testid={`island-platzieren-${r}`} onClick={() => schnitt(r)}>
            {label}
          </KButton>
        ))}
      </div>
    </div>
  );
}

function AutoPackStufe3() {
  const { sheet } = useAktivesBlatt();
  if (!sheet) {
    return (
      <div className="pubisl-stufe2" data-testid="island-auto-pack-stufe2" onClick={(e) => e.stopPropagation()}>
        <p className="pubisl-hinweis">Erst ein Blatt anlegen (BLATT-Insel).</p>
      </div>
    );
  }
  return <AutoPackPanel sheetId={sheet.id} onClose={() => {}} />;
}

publishInhaltsRegistry.registriere('blatt', { Stufe2: BlattListeStufe2, Stufe3: BlattListeStufe2 });
publishInhaltsRegistry.registriere('platzieren', { Stufe2: AnsichtPlatzierenStufe2, Stufe3: AnsichtPlatzierenStufe2 });
publishInhaltsRegistry.registriere('auto-pack', { Stufe2: AutoPackStufe3, Stufe3: AutoPackStufe3 });
