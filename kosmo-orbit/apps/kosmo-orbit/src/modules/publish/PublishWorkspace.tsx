import { useMemo, useRef, useState } from 'react';
import { Badge, KButton, Panel, moduleHue } from '@kosmo/ui';
import {
  exportDxf,
  placementPaperBounds,
  sheetPaperSize,
  sheetToSvg,
  type Sheet,
  type SheetFormat,
  type Storey,
} from '@kosmo/kernel';
import { bootstrapProject, useProject } from '../../state/project-store';
import { exportSheetSetPdf } from './export-sheets';

/**
 * KosmoPublish — Blatteditor. Blätter sind Kernel-Entities (Undo/Sync/.kosmo
 * inklusive); die Vorschau ist das echte Druck-SVG, Platzierungen werden per
 * Drag direkt auf dem Papier verschoben (Command beim Loslassen).
 */

const FORMATS: SheetFormat[] = ['A0', 'A1', 'A2', 'A3', 'A4'];
const SCALES = [50, 100, 200, 500];

export function PublishWorkspace() {
  const revision = useProject((s) => s.revision);
  const runCommand = useProject((s) => s.runCommand);
  const undo = useProject((s) => s.undo);
  const { doc } = useProject.getState();
  if (doc.byKind('storey').length === 0) bootstrapProject();

  const sheets = useMemo(
    () => doc.byKind<Sheet>('sheet').sort((a, b) => a.index - b.index),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [revision],
  );
  const storeys = useMemo(
    () => doc.storeysOrdered(),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [revision],
  );

  const [activeSheetId, setActiveSheetId] = useState<string | null>(null);
  const [newFormat, setNewFormat] = useState<SheetFormat>('A1');
  const [placeStoreyId, setPlaceStoreyId] = useState<string | null>(null);
  const [placeScale, setPlaceScale] = useState(100);
  const [selectedPlacement, setSelectedPlacement] = useState<string | null>(null);
  const [drag, setDrag] = useState<{ id: string; dx: number; dy: number } | null>(null);
  const svgHostRef = useRef<HTMLDivElement>(null);

  const sheet = sheets.find((s) => s.id === activeSheetId) ?? sheets[0] ?? null;
  const paper = sheet ? sheetPaperSize(sheet) : null;

  const svgMarkup = useMemo(
    () =>
      sheet
        ? sheetToSvg(doc, sheet.id, { projectName: doc.settings.projectName })
        : '',
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [revision, sheet?.id],
  );

  /** Bildschirm-px → Papier-mm im Vorschau-SVG. */
  function toPaper(e: React.PointerEvent): { x: number; y: number } | null {
    const host = svgHostRef.current?.querySelector('svg');
    if (!host || !paper) return null;
    const r = host.getBoundingClientRect();
    return {
      x: ((e.clientX - r.left) / r.width) * paper.width,
      y: ((e.clientY - r.top) / r.height) * paper.height,
    };
  }

  function addSheet() {
    const res = runCommand('publish.blattErstellen', {
      name: `Blatt ${sheets.length + 1}`,
      format: newFormat,
      orientation: 'quer',
    });
    setActiveSheetId((res.patches[0] as { id: string }).id);
  }

  function placeGrundriss() {
    if (!sheet || !paper) return;
    const storeyId = placeStoreyId ?? storeys[0]?.id;
    if (!storeyId) return;
    runCommand('publish.ansichtPlatzieren', {
      sheetId: sheet.id,
      view: 'grundriss',
      storeyId,
      scale: placeScale,
      x: paper.width / 2,
      y: (paper.height - 30) / 2,
    });
  }

  /** Schnitt durch die Mitte oder Ansicht von aussen (N/O/S/W). */
  function placeSchnitt(richtung: 'schnitt' | 'nord' | 'ost' | 'sued' | 'west') {
    if (!sheet || !paper) return;
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    for (const e of doc.entities.values()) {
      if (e.kind === 'wall' || e.kind === 'mass') {
        const pts = e.kind === 'wall' ? [e.a, e.b] : e.outline;
        for (const p of pts) {
          minX = Math.min(minX, p.x); maxX = Math.max(maxX, p.x);
          minY = Math.min(minY, p.y); maxY = Math.max(maxY, p.y);
        }
      }
    }
    if (minX === Infinity) return;
    const midY = Math.round((minY + maxY) / 2);
    // Blickrichtung = linke Normale der Linie a→b
    const linien = {
      schnitt: { a: { x: minX - 1000, y: midY }, b: { x: maxX + 1000, y: midY }, titel: 'Schnitt' },
      sued: { a: { x: minX - 1000, y: minY - 2000 }, b: { x: maxX + 1000, y: minY - 2000 }, titel: 'Ansicht Süd' },
      nord: { a: { x: maxX + 1000, y: maxY + 2000 }, b: { x: minX - 1000, y: maxY + 2000 }, titel: 'Ansicht Nord' },
      ost: { a: { x: maxX + 2000, y: minY - 1000 }, b: { x: maxX + 2000, y: maxY + 1000 }, titel: 'Ansicht Ost' },
      west: { a: { x: minX - 2000, y: maxY + 1000 }, b: { x: minX - 2000, y: minY - 1000 }, titel: 'Ansicht West' },
    } as const;
    const l = linien[richtung];
    runCommand('publish.ansichtPlatzieren', {
      sheetId: sheet.id,
      view: 'schnitt',
      a: l.a,
      b: l.b,
      scale: placeScale,
      x: paper.width / 2,
      y: (paper.height - 30) / 2,
      title: l.titel,
    });
  }

  function exportSvg() {
    if (!sheet) return;
    const url = URL.createObjectURL(new Blob([svgMarkup], { type: 'image/svg+xml' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = `${doc.settings.projectName.replace(/\s+/g, '-')}-${sheet.name.replace(/\s+/g, '-')}.svg`;
    document.body.appendChild(a);
  a.click();
  a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 10_000);
  }

  function exportDxfFile() {
    const storeyId = placeStoreyId ?? storeys[0]?.id;
    if (!storeyId) return;
    const storey = doc.get<Storey>(storeyId);
    const dxf = exportDxf(doc, storeyId);
    const url = URL.createObjectURL(new Blob([dxf], { type: 'application/dxf' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = `${doc.settings.projectName.replace(/\s+/g, '-')}-${storey?.name ?? 'Grundriss'}.dxf`;
    document.body.appendChild(a);
  a.click();
  a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 10_000);
  }

  return (
    <div style={{ position: 'absolute', inset: 0, display: 'flex' }}>
      {/* Blattliste */}
      <div
        style={{
          width: 220,
          borderRight: '1px solid var(--k-line)',
          background: 'var(--k-surface)',
          padding: 12,
          display: 'flex',
          flexDirection: 'column',
          gap: 8,
          overflow: 'auto',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Badge hue={moduleHue.publish}>Plansatz</Badge>
        </div>
        {sheets.map((s) => (
          <Panel
            key={s.id}
            data-testid={`sheet-${s.index}`}
            onClick={() => setActiveSheetId(s.id)}
            style={{
              padding: '8px 10px',
              cursor: 'pointer',
              borderColor: sheet?.id === s.id ? 'var(--k-accent)' : 'var(--k-line)',
            }}
          >
            <div style={{ fontWeight: 550, fontSize: 13 }}>{s.name}</div>
            <div style={{ fontSize: 11.5, color: 'var(--k-ink-faint)' }}>
              {s.format} {s.orientation} · {s.placements.length} Ansichten
            </div>
          </Panel>
        ))}
        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          <select
            value={newFormat}
            onChange={(e) => setNewFormat(e.target.value as SheetFormat)}
            style={{ padding: '4px 6px', borderRadius: 6, border: '1px solid var(--k-line-strong)', background: 'var(--k-raised)' }}
          >
            {FORMATS.map((f) => (
              <option key={f} value={f}>{f}</option>
            ))}
          </select>
          <KButton size="sm" tone="quiet" onClick={addSheet} data-testid="add-sheet">
            + Blatt
          </KButton>
        </div>
        <div style={{ flex: 1 }} />
        <KButton size="sm" tone="accent" onClick={() => void exportSheetSetPdf()} data-testid="export-set">
          Plansatz PDF
        </KButton>
        <KButton size="sm" tone="ghost" onClick={exportSvg}>Blatt SVG</KButton>
        <KButton size="sm" tone="ghost" onClick={exportDxfFile} data-testid="export-dxf">
          Grundriss DXF
        </KButton>
      </div>

      {/* Blattfläche */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        <div
          style={{
            display: 'flex',
            gap: 8,
            alignItems: 'center',
            padding: '8px 12px',
            borderBottom: '1px solid var(--k-line)',
            background: 'var(--k-surface)',
            fontSize: 12.5,
          }}
        >
          <span style={{ color: 'var(--k-ink-faint)' }}>Platzieren:</span>
          <select
            value={placeStoreyId ?? storeys[0]?.id ?? ''}
            onChange={(e) => setPlaceStoreyId(e.target.value)}
            data-testid="place-storey"
            style={{ padding: '4px 6px', borderRadius: 6, border: '1px solid var(--k-line-strong)', background: 'var(--k-raised)' }}
          >
            {storeys.map((s) => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
          <select
            value={placeScale}
            onChange={(e) => setPlaceScale(Number(e.target.value))}
            style={{ padding: '4px 6px', borderRadius: 6, border: '1px solid var(--k-line-strong)', background: 'var(--k-raised)' }}
          >
            {SCALES.map((s) => (
              <option key={s} value={s}>1:{s}</option>
            ))}
          </select>
          <KButton size="sm" tone="quiet" onClick={placeGrundriss} data-testid="place-plan" disabled={!sheet}>
            Grundriss
          </KButton>
          <KButton size="sm" tone="quiet" onClick={() => placeSchnitt('schnitt')} data-testid="place-section" disabled={!sheet}>
            Schnitt
          </KButton>
          <span style={{ color: 'var(--k-ink-faint)' }}>Ansicht:</span>
          {(
            [
              ['nord', 'N'],
              ['ost', 'O'],
              ['sued', 'S'],
              ['west', 'W'],
            ] as const
          ).map(([r, label]) => (
            <KButton
              key={r}
              size="sm"
              tone="quiet"
              onClick={() => placeSchnitt(r)}
              data-testid={`place-${r}`}
              disabled={!sheet}
            >
              {label}
            </KButton>
          ))}
          {selectedPlacement && sheet && (
            <KButton
              size="sm"
              tone="ghost"
              onClick={() => {
                runCommand('publish.ansichtEntfernen', { sheetId: sheet.id, placementId: selectedPlacement });
                setSelectedPlacement(null);
              }}
            >
              Ansicht entfernen
            </KButton>
          )}
          <div style={{ flex: 1 }} />
          <KButton size="sm" tone="ghost" onClick={undo}>↩ Rückgängig</KButton>
        </div>

        <div
          style={{
            flex: 1,
            overflow: 'auto',
            display: 'grid',
            placeItems: 'center',
            background: 'var(--k-field)',
            padding: 24,
          }}
        >
          {sheet && paper ? (
            <div
              ref={svgHostRef}
              data-testid="sheet-canvas"
              style={{
                position: 'relative',
                width: 'min(100%, 1100px)',
                aspectRatio: `${paper.width} / ${paper.height}`,
                boxShadow: 'var(--k-shadow, 0 8px 30px rgba(0,0,0,0.12))',
              }}
              onPointerMove={(e) => {
                if (!drag) return;
                const p = toPaper(e);
                if (!p) return;
                setDrag({ ...drag, dx: p.x, dy: p.y });
              }}
              onPointerUp={() => {
                if (drag && sheet) {
                  runCommand('publish.ansichtVerschieben', {
                    sheetId: sheet.id,
                    placementId: drag.id,
                    x: Math.round(drag.dx),
                    y: Math.round(drag.dy),
                  });
                }
                setDrag(null);
              }}
            >
              <div
                style={{ position: 'absolute', inset: 0 }}
                // Vorschau = echtes Druck-SVG aus dem Kern
                dangerouslySetInnerHTML={{ __html: svgMarkup.replace('<svg ', '<svg style="width:100%;height:100%" ') }}
              />
              {/* Platzierungs-Overlays: Auswahl + Drag */}
              {sheet.placements.map((pl) => {
                const b = placementPaperBounds(doc, pl);
                const x = drag?.id === pl.id ? drag.dx - b.width / 2 : b.x;
                const y = drag?.id === pl.id ? drag.dy - b.height / 2 : b.y;
                const sel = selectedPlacement === pl.id;
                return (
                  <div
                    key={pl.id}
                    data-testid={`placement-${pl.id}`}
                    onPointerDown={(e) => {
                      e.preventDefault();
                      setSelectedPlacement(pl.id);
                      const p = toPaper(e);
                      if (p) setDrag({ id: pl.id, dx: pl.x, dy: pl.y });
                    }}
                    style={{
                      position: 'absolute',
                      left: `${(x / paper.width) * 100}%`,
                      top: `${(y / paper.height) * 100}%`,
                      width: `${(b.width / paper.width) * 100}%`,
                      height: `${(b.height / paper.height) * 100}%`,
                      border: sel ? '1.5px solid var(--k-accent)' : '1px dashed transparent',
                      cursor: 'move',
                      borderRadius: 2,
                    }}
                    onMouseEnter={(e) => {
                      if (!sel) (e.currentTarget as HTMLElement).style.border = '1px dashed var(--k-accent)';
                    }}
                    onMouseLeave={(e) => {
                      if (!sel) (e.currentTarget as HTMLElement).style.border = '1px dashed transparent';
                    }}
                  />
                );
              })}
            </div>
          ) : (
            <div style={{ color: 'var(--k-ink-faint)', textAlign: 'center' }}>
              <div style={{ fontSize: 15, fontWeight: 550, marginBottom: 6 }}>Noch kein Blatt im Plansatz.</div>
              <div style={{ fontSize: 13 }}>Links Format wählen und «+ Blatt» — dann Grundrisse und Schnitte platzieren.</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
