import { useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import type { ModulElement } from '@kosmo/kernel';
import { KButton, KInput, KSelect } from '@kosmo/ui';
import { useProject } from '../../state/project-store';
import './design-panels.css';

/**
 * Modul-Editor (vorform-Kern): eine kleine Zeichenfläche fürs Fassadenmodul.
 * Aufziehen zeichnet ein Element (Snap 50 mm), Klick selektiert, Entf löscht,
 * der Typ (Fenster/Paneel) gilt fürs nächste Element. Speichern schreibt den
 * Datensatz ins Doc — die 3D-Rasterung zeichnet ihn dann in jede Zelle.
 */

const SNAP = 50;

export function ModulEditor({ onClose }: { onClose: () => void }) {
  const runCommand = useProject((s) => s.runCommand);
  const doc = useProject.getState().doc;
  const bestehend = doc.settings.fassadenModule;
  const [name, setName] = useState(bestehend[0]?.name ?? 'Modul A');
  const [modB, setModB] = useState(bestehend[0]?.breite ?? 2500);
  const [modH, setModH] = useState(bestehend[0]?.hoehe ?? 3000);
  const [elemente, setElemente] = useState<ModulElement[]>(bestehend[0]?.elemente ?? []);
  const [typ, setTyp] = useState<'fenster' | 'paneel'>('fenster');
  const [auswahl, setAuswahl] = useState<number | null>(null);
  const [zug, setZug] = useState<{ x0: number; y0: number; x1: number; y1: number } | null>(null);
  const svgRef = useRef<SVGSVGElement | null>(null);

  // Anzeige: 1 Modul-mm = 0.14 px (2500 → 350 px), y nach oben
  const S = 0.14;
  const W = modB * S;
  const H = modH * S;
  const zuModul = (e: React.PointerEvent): { x: number; y: number } | null => {
    const rect = svgRef.current?.getBoundingClientRect();
    if (!rect) return null;
    const x = Math.round(((e.clientX - rect.left) / S) / SNAP) * SNAP;
    const y = Math.round(((rect.bottom - e.clientY) / S) / SNAP) * SNAP;
    return { x: Math.max(0, Math.min(modB, x)), y: Math.max(0, Math.min(modH, y)) };
  };

  const laden = (m: (typeof bestehend)[number]) => {
    setName(m.name);
    setModB(m.breite);
    setModH(m.hoehe);
    setElemente(m.elemente);
    setAuswahl(null);
  };

  const speichern = () => {
    runCommand('design.modulSpeichern', { name, breite: modB, hoehe: modH, elemente });
    onClose();
  };

  // createPortal nach document.body (Muster shell/Einstellungen.tsx):
  // der Stations-Wrapper traegt `.k-einblenden` (animation ... both) — die
  // gefuellte Transform macht ihn zum Containing Block fuer position:fixed,
  // der Dialog haengt sonst am gescrollten Panel statt am Viewport
  // (v0.7.0-Finale-Befund, Modul-Editor-E2E).
  return createPortal(
    <div
      data-testid="modul-editor"
      className="dp-dialog--fixed"
      onKeyDown={(e) => {
        if ((e.key === 'Delete' || e.key === 'Backspace') && auswahl !== null) {
          setElemente(elemente.filter((_, i) => i !== auswahl));
          setAuswahl(null);
        }
      }}
      tabIndex={0}
    >
      <div className="me-kopf">
        <b className="k-titel dp-titel-block">Modul-Editor</b>
        <KInput size="sm" value={name} onChange={(e) => setName(e.target.value)} data-testid="modul-name" className="dp-w110" />
        <KInput size="sm" mono type="number" value={modB} step={50} onChange={(e) => setModB(Number(e.target.value) || 2500)} className="dp-w66" />
        <span>×</span>
        <KInput size="sm" mono type="number" value={modH} step={50} onChange={(e) => setModH(Number(e.target.value) || 3000)} className="dp-w66" />
        <span className="dp-einheit dp-fussnote">mm</span>
        <div className="dp-fuell" />
        <KButton size="sm" tone={typ === 'fenster' ? 'accent' : 'quiet'} data-testid="typ-fenster" onClick={() => setTyp('fenster')}>
          Fenster
        </KButton>
        <KButton size="sm" tone={typ === 'paneel' ? 'accent' : 'quiet'} data-testid="typ-paneel" onClick={() => setTyp('paneel')}>
          Paneel
        </KButton>
      </div>
      <svg
        ref={svgRef}
        data-testid="modul-flaeche"
        width={W}
        height={H}
        className="me-flaeche"
        onPointerDown={(e) => {
          const p = zuModul(e);
          if (!p) return;
          e.currentTarget.setPointerCapture(e.pointerId);
          setZug({ x0: p.x, y0: p.y, x1: p.x, y1: p.y });
          setAuswahl(null);
        }}
        onPointerMove={(e) => {
          const p = zuModul(e);
          if (p) setZug((z) => (z ? { ...z, x1: p.x, y1: p.y } : z));
        }}
        onPointerUp={() => {
          setZug((z) => {
            if (z) {
              const b = Math.abs(z.x1 - z.x0);
              const h = Math.abs(z.y1 - z.y0);
              if (b >= 200 && h >= 200) {
                setElemente((alt2) => [
                  ...alt2,
                  { x: Math.min(z.x0, z.x1), y: Math.min(z.y0, z.y1), b, h, typ },
                ]);
              }
            }
            return null;
          });
        }}
      >
        {/* 50-cm-Hilfsraster */}
        {Array.from({ length: Math.floor(modB / 500) }, (_, i) => (
          <line key={`v${i}`} x1={(i + 1) * 500 * S} y1={0} x2={(i + 1) * 500 * S} y2={H} stroke="var(--k-line)" strokeWidth={0.5} />
        ))}
        {Array.from({ length: Math.floor(modH / 500) }, (_, i) => (
          <line key={`h${i}`} x1={0} y1={H - (i + 1) * 500 * S} x2={W} y2={H - (i + 1) * 500 * S} stroke="var(--k-line)" strokeWidth={0.5} />
        ))}
        {elemente.map((el, i) => (
          <rect
            key={i}
            data-testid="modul-element"
            x={el.x * S}
            y={H - (el.y + el.h) * S}
            width={el.b * S}
            height={el.h * S}
            fill={el.typ === 'fenster' ? 'rgba(36, 85, 164, 0.35)' : 'rgba(122, 106, 84, 0.45)'}
            stroke={auswahl === i ? 'var(--k-accent)' : 'var(--k-ink-soft)'}
            strokeWidth={auswahl === i ? 2 : 1}
            onPointerDown={(e) => {
              e.stopPropagation();
              setAuswahl(i);
            }}
          />
        ))}
        {zug && (
          <rect
            x={Math.min(zug.x0, zug.x1) * S}
            y={H - Math.max(zug.y0, zug.y1) * S}
            width={Math.abs(zug.x1 - zug.x0) * S}
            height={Math.abs(zug.y1 - zug.y0) * S}
            fill="none"
            stroke="var(--k-accent)"
            strokeDasharray="4 3"
          />
        )}
      </svg>
      <div className="me-fuss">
        <span className="dp-leer">
          Aufziehen zeichnet ({typ}), Klick wählt, Entf löscht · Snap 5 cm
        </span>
        <div className="dp-fuell" />
        {bestehend.length > 0 && (
          <KSelect
            size="sm"
            onChange={(e) => {
              const m = bestehend.find((x) => x.name === e.target.value);
              if (m) laden(m);
            }}
            defaultValue=""
          >
            <option value="" disabled>
              laden …
            </option>
            {bestehend.map((m) => (
              <option key={m.name}>{m.name}</option>
            ))}
          </KSelect>
        )}
        <KButton size="sm" tone="quiet" onClick={onClose}>
          Abbrechen
        </KButton>
        <KButton size="sm" tone="accent" data-testid="modul-speichern" onClick={speichern}>
          Speichern
        </KButton>
      </div>
    </div>,
    document.body,
  );
}
