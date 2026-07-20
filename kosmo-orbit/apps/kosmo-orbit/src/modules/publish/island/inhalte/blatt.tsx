import { useRef, useState } from 'react';
import { KButton, KIcon, KInput, KSelect, meldeFehler } from '@kosmo/ui';
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
 *
 * Umbenennen/Entfernen-Parität (0.8.11): die Insel konnte Blätter bisher nur
 * wählen/anlegen — Umbenennen (Klick-zu-Edit, testid `blattisl-name-<index>`)
 * und Entfernen (testid `blattisl-entfernen-<index>`) übernehmen dieselben
 * Bausteine wie das Manuell-Chrome (`PublishWorkspace.tsx:824-868`): KInput
 * autoFocus + Vorselektion, Enter/Blur committet via
 * `design.eigenschaftSetzen` (`feld:'name'`, Kernel-Weg seit ROADMAP 547),
 * Escape bricht per Ref-Guard gegen den Unmount-Blur ab, `publish.
 * blattEntfernen` ohne eigene Bestätigung (identisch zum Manuell-Knopf) —
 * Undo bleibt der normale History-Stack (Ctrl+Z).
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

  // Klick-zu-Edit-Namensfeld, Muster `PublishWorkspace.tsx:824-856` (s.
  // Kopfkommentar). `blattnameAbbrechenRef` bewacht dasselbe Zeitfenster wie
  // dort: Escape setzt `bearbeiteSheetId` zurück, der native Blur beim
  // Unmount des Inputs darf danach NICHT mehr committen.
  const [bearbeiteSheetId, setBearbeiteSheetId] = useState<string | null>(null);
  const blattnameAbbrechenRef = useRef(false);

  const blattnameBearbeitenStarten = (sheetId: string): void => {
    blattnameAbbrechenRef.current = false;
    setBearbeiteSheetId(sheetId);
    setAktiverSheetId(sheetId);
  };

  const blattnameCommitten = (sheetId: string, roh: string): void => {
    if (blattnameAbbrechenRef.current) {
      blattnameAbbrechenRef.current = false;
      return;
    }
    try {
      runCommand('design.eigenschaftSetzen', { entityId: sheetId, feld: 'name', wert: roh });
    } catch (err) {
      // Sichtbare Fehlermeldung (Toast) statt eines stillen No-op — der
      // Kernel wirft VOR jedem Patch (getrimmt, leer/Nur-Whitespace), das
      // Doc bleibt unverändert, der Eintrag zeigt darum automatisch
      // weiterhin den alten Namen.
      meldeFehler(err);
    } finally {
      setBearbeiteSheetId(null);
    }
  };

  // `publish.blattEntfernen` — identische Semantik zum Manuell-Knopf
  // (`PublishWorkspace.tsx:857-868`): kein eigener Bestätigungsdialog, das
  // ist der normale History-Stack (Ctrl+Z bringt das Blatt zurück). War das
  // entfernte Blatt aktiv, räumt `setAktiverSheetId(null)` den Runtime-Store
  // — der Fallback aufs erste verbleibende Blatt läuft danach über denselben
  // Effekt wie beim ersten Insel-Öffnen (`PublishWorkspace.tsx`s
  // `islandSheet`-Sync-Effekt).
  const blattEntfernen = (sheetId: string): void => {
    try {
      runCommand('publish.blattEntfernen', { sheetId });
      if (aktiverSheetIdStore === sheetId) setAktiverSheetId(null);
    } catch (err) {
      meldeFehler(err);
    }
  };

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
            <div
              key={s.id}
              className={`pubisl-blatt-eintrag${s.id === aktivId ? ' pubisl-blatt-eintrag--aktiv' : ''}`}
              data-testid={`island-blatt-eintrag-${s.index}`}
              onClick={() => setAktiverSheetId(s.id)}
            >
              {bearbeiteSheetId === s.id ? (
                <KInput
                  size="sm"
                  autoFocus
                  defaultValue={s.name}
                  data-testid={`blattisl-name-${s.index}`}
                  className="pubisl-blatt-name-feld"
                  onFocus={(e) => e.currentTarget.select()}
                  onClick={(ev) => ev.stopPropagation()}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.currentTarget.blur();
                    } else if (e.key === 'Escape') {
                      e.stopPropagation();
                      blattnameAbbrechenRef.current = true;
                      setBearbeiteSheetId(null);
                    }
                  }}
                  onBlur={(e) => blattnameCommitten(s.id, e.currentTarget.value)}
                />
              ) : (
                <span
                  className="pubisl-blatt-name"
                  data-testid={`blattisl-name-${s.index}`}
                  title="Blattname bearbeiten"
                  onClick={(ev) => {
                    ev.stopPropagation();
                    blattnameBearbeitenStarten(s.id);
                  }}
                >
                  {s.name} · {s.format}
                </span>
              )}
              <button
                type="button"
                aria-label="Blatt entfernen"
                title="Blatt entfernen"
                data-testid={`blattisl-entfernen-${s.index}`}
                className="pubisl-blatt-entfernen"
                onClick={(ev) => {
                  ev.stopPropagation();
                  blattEntfernen(s.id);
                }}
              >
                <KIcon name="schliessen" size={14} title="Blatt entfernen" />
              </button>
            </div>
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
