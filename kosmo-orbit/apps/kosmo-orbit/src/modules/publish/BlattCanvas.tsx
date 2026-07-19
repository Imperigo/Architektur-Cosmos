import { useRef, type CSSProperties } from 'react';
import { imagePaperBounds, placementPaperBounds, type Sheet } from '@kosmo/kernel';
import { useProject } from '../../state/project-store';
import { findePlankopfHitbox, findeRahmenRect } from './plankopf-overlay';
import { usePublishRuntime } from './publish-runtime';

/**
 * PC3 (`docs/V084-SPEZ.md` §5 W3, C-19) — Extraktion des bisher INLINE in
 * `PublishWorkspace.tsx` liegenden Blatt-Canvas (SVG-Vorschau + Platzierungs-/
 * Bild-/Text-/Plankopf-Overlays + die beiden Vorschau-Toggle-Overlays) in
 * eine eigenständige, wiederverwendbare Komponente — WORTGLEICH aus dem
 * bisherigen `sheet && paper`-Zweig übernommen (keine Verhaltensänderung,
 * reine Bewegung + Parametrisierung über Props statt Komponenten-Closures).
 *
 * **Warum das nötig ist:** die Island-Insel BLATT (`island/inhalte/blatt.tsx`)
 * UND der Blatt-Zoom-Wrapper (`island/BlattZoomBuehne.tsx`) brauchen GENAU
 * dieselbe Blattfläche wie der Manuell-Modus — «Islands sind Zugänge, keine
 * Nachbauten» (Bauauftrag). Der Manuell-Zweig in `PublishWorkspace.tsx`
 * rendert diese Komponente jetzt anstelle des früheren Inline-Blocks; DOM/
 * Testids/Verhalten bleiben dadurch BYTE-GLEICH (reine Verschiebung, keine
 * JSX-Änderung) — jede bestehende Publish-E2E-Spec bleibt darum unverändert
 * grün (Bestandsschutz, Auftrag Punkt 4).
 *
 * `svgHostRef`/`toPaper()` bleiben INTERN (waren zuvor `PublishWorkspace.
 * tsx`-lokal, aber nirgends sonst gebraucht) — kein Prop-Zuwachs ausserhalb
 * dessen, was diese Komponente wirklich von aussen braucht.
 *
 * **PB3 (v0.8.5, `docs/V085-SPEZ.md` §3 E5 + §7 C-19) — Bemassungs-/Zonen-
 * Toggles:** `zeigeBemassung`/`zeigeZonen` kommen bewusst NICHT als Prop
 * (anders als `zonenVorschau`/`aussenbemassungVorschau` oben, die reine
 * Manuell-Modus-`useState` sind), sondern direkt aus `publish-runtime.ts`
 * (Modul-Singleton) — dieselbe Anzeige gilt darum in JEDEM Aufrufer
 * (Manuell-`PublishWorkspace.tsx` UND `island/BlattZoomBuehne.tsx`), ohne
 * dass beide Aufrufer den Zustand einzeln durchreichen müssten, und der Wert
 * überlebt das Schliessen der Insel (E5-Beweispflicht). Die eigentliche
 * Wirkung ist eine reine CSS-Modifier-Klasse auf `.k-publish-blatt-svg`
 * (`publish.css`) — `svgMarkup` selbst (das echte, golden-geprüfte
 * `sheetToSvg()`-Ergebnis) bleibt STRING-IDENTISCH, nur die Bildschirm-
 * Darstellung filtert per Attribut-Selektor.
 */
export interface BlattCanvasProps {
  sheet: Sheet;
  paper: { width: number; height: number };
  svgMarkup: string;
  selectedPlacement: string | null;
  setSelectedPlacement: (id: string | null) => void;
  selectedBild: string | null;
  setSelectedBild: (id: string | null) => void;
  drag: { id: string; dx: number; dy: number } | null;
  setDrag: (v: { id: string; dx: number; dy: number } | null) => void;
  textDrag: { id: string; dx: number; dy: number } | null;
  setTextDrag: (v: { id: string; dx: number; dy: number } | null) => void;
  bildDrag: { id: string; dx: number; dy: number } | null;
  setBildDrag: (v: { id: string; dx: number; dy: number } | null) => void;
  zonenVorschau: boolean;
  aussenbemassungVorschau: boolean;
  /** Steuert die `--sel`-Optik des Plankopf-Overlays — im Manuell-Modus
   *  `plankopfOffen`, im Island-Modus s. `island/inhalte/darstellung.tsx`. */
  plankopfAktiv: boolean;
  /** Klick auf das Plankopf-Overlay — Manuell öffnet `PlankopfPanel` über
   *  `setPlankopfOffen(true)`, Island löst dieselbe Insel-Aktion aus. */
  onPlankopfKlick: () => void;
  /** Grössen-/Positionsformel des Blatts — Manuell behält seine gemessene
   *  Chrome-Höhen-Formel, Island füllt stattdessen die Bühnenfläche. */
  style: CSSProperties;
}

export function BlattCanvas({
  sheet,
  paper,
  svgMarkup,
  selectedPlacement,
  setSelectedPlacement,
  selectedBild,
  setSelectedBild,
  drag,
  setDrag,
  textDrag,
  setTextDrag,
  bildDrag,
  setBildDrag,
  zonenVorschau,
  aussenbemassungVorschau,
  plankopfAktiv,
  onPlankopfKlick,
  style,
}: BlattCanvasProps) {
  const runCommand = useProject((s) => s.runCommand);
  const { doc } = useProject.getState();
  const svgHostRef = useRef<HTMLDivElement>(null);
  const zeigeBemassung = usePublishRuntime((s) => s.zeigeBemassung);
  const zeigeZonen = usePublishRuntime((s) => s.zeigeZonen);

  /** Bildschirm-px → Papier-mm im Vorschau-SVG. */
  function toPaper(e: React.PointerEvent): { x: number; y: number } | null {
    const host = svgHostRef.current?.querySelector('svg');
    if (!host) return null;
    const r = host.getBoundingClientRect();
    return {
      x: ((e.clientX - r.left) / r.width) * paper.width,
      y: ((e.clientY - r.top) / r.height) * paper.height,
    };
  }

  return (
    <div
      ref={svgHostRef}
      data-testid="sheet-canvas"
      className="k-publish-blatt"
      style={style}
      onPointerMove={(e) => {
        if (textDrag) {
          const p = toPaper(e);
          if (p) setTextDrag({ ...textDrag, dx: p.x, dy: p.y });
          return;
        }
        if (bildDrag) {
          const p = toPaper(e);
          if (p) setBildDrag({ ...bildDrag, dx: p.x, dy: p.y });
          return;
        }
        if (!drag) return;
        const p = toPaper(e);
        if (!p) return;
        setDrag({ ...drag, dx: p.x, dy: p.y });
      }}
      onPointerUp={() => {
        if (bildDrag && sheet) {
          const b = (sheet.bilder ?? []).find((x) => x.id === bildDrag.id);
          if (b) {
            const r = imagePaperBounds(doc, b);
            runCommand('publish.bildVerschieben', {
              sheetId: sheet.id,
              bildId: b.id,
              x: Math.round(bildDrag.dx - r.width / 2),
              y: Math.round(bildDrag.dy - r.height / 2),
            });
          }
          setBildDrag(null);
        }
        if (textDrag && sheet) {
          const t = sheet.texte?.find((x) => x.id === textDrag.id);
          if (t) {
            runCommand('publish.textSetzen', {
              sheetId: sheet.id,
              textId: t.id,
              text: t.text,
              x: Math.round(textDrag.dx),
              y: Math.round(textDrag.dy),
            });
          }
          setTextDrag(null);
        }
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
        className={`k-publish-blatt-svg${zeigeBemassung ? '' : ' k-publish-blatt-svg--ohne-bemassung'}${zeigeZonen ? '' : ' k-publish-blatt-svg--ohne-zonen'}`}
        // C-19 (PB3): reiner Bildschirm-Beweis für die Toggle-Mechanik
        // (e2e/publish-toggles.spec.ts) — `svgMarkup` (unten) bleibt
        // unangetastet, nur diese zwei Attribute + die Modifier-Klasse oben
        // steuern die CSS-Filterung.
        data-bemassung={zeigeBemassung ? 'an' : 'aus'}
        data-zonen={zeigeZonen ? 'an' : 'aus'}
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
            className={`k-publish-overlay${sel ? ' k-publish-overlay--sel' : ''}`}
            style={{
              left: `${(x / paper.width) * 100}%`,
              top: `${(y / paper.height) * 100}%`,
              width: `${(b.width / paper.width) * 100}%`,
              height: `${(b.height / paper.height) * 100}%`,
            }}
          />
        );
      })}
      {/* Bild-Overlays: Slots auswählen + verschieben */}
      {(sheet.bilder ?? []).map((b) => {
        const r = imagePaperBounds(doc, b);
        const x = bildDrag?.id === b.id ? bildDrag.dx - r.width / 2 : r.x;
        const y = bildDrag?.id === b.id ? bildDrag.dy - r.height / 2 : r.y;
        const sel = selectedBild === b.id;
        return (
          <div
            key={b.id}
            data-testid={`blatt-bild-${b.id}`}
            onPointerDown={(e) => {
              e.preventDefault();
              setSelectedPlacement(null);
              setSelectedBild(b.id);
              setBildDrag({ id: b.id, dx: r.x + r.width / 2, dy: r.y + r.height / 2 });
            }}
            className={`k-publish-overlay${sel ? ' k-publish-overlay--sel' : ''}`}
            style={{
              left: `${(x / paper.width) * 100}%`,
              top: `${(y / paper.height) * 100}%`,
              width: `${(r.width / paper.width) * 100}%`,
              height: `${(r.height / paper.height) * 100}%`,
            }}
          />
        );
      })}
      {/* Text-Overlays: Titel/Konzepttexte direkt auf dem Blatt verschieben */}
      {(sheet.texte ?? []).map((t) => {
        const zeilen = t.text.split('\n');
        const wMm = Math.max(...zeilen.map((z) => z.length)) * t.size * 0.55;
        const hMm = zeilen.length * t.size * 1.35;
        const tx = textDrag?.id === t.id ? textDrag.dx : t.x;
        const ty = (textDrag?.id === t.id ? textDrag.dy : t.y) - t.size;
        const selText = textDrag?.id === t.id;
        return (
          <div
            key={t.id}
            data-testid={`blatt-text-${t.id}`}
            title="Text verschieben — Inhalt links bearbeiten"
            onPointerDown={(e) => {
              e.preventDefault();
              setSelectedPlacement(null);
              setTextDrag({ id: t.id, dx: t.x, dy: t.y });
            }}
            className={`k-publish-overlay${selText ? ' k-publish-overlay--sel' : ''}`}
            style={{
              left: `${(tx / paper.width) * 100}%`,
              top: `${(ty / paper.height) * 100}%`,
              width: `${(Math.max(wMm, 20) / paper.width) * 100}%`,
              height: `${(Math.max(hMm, 8) / paper.height) * 100}%`,
            }}
          />
        );
      })}
      {/* Plankopf-Overlay: selektierbar, NICHT verschiebbar. */}
      {(() => {
        const hit = findePlankopfHitbox(svgMarkup);
        if (!hit) return null;
        return (
          <div
            data-testid="plankopf-overlay"
            title="Plankopf — Klick öffnet den Editor (fester Sitz unten rechts, nicht verschiebbar)"
            onPointerDown={(e) => {
              e.preventDefault();
              setSelectedPlacement(null);
              setSelectedBild(null);
              onPlankopfKlick();
            }}
            className={`k-publish-overlay-plankopf${plankopfAktiv ? ' k-publish-overlay-plankopf--sel' : ''}`}
            style={{
              left: `${(hit.x / paper.width) * 100}%`,
              top: `${(hit.y / paper.height) * 100}%`,
              width: `${(hit.width / paper.width) * 100}%`,
              height: `${(hit.height / paper.height) * 100}%`,
            }}
          />
        );
      })()}
      {/* Vorschau-Overlay «Zonen»: tönt die Ränder zwischen Papierkante und
          Zeichenfläche — rein dekorativ, `pointerEvents: 'none'`, NIE im Export. */}
      {zonenVorschau && (() => {
        const rahmen = findeRahmenRect(svgMarkup);
        if (!rahmen) return null;
        const baender = [
          { left: 0, top: 0, width: paper.width, height: rahmen.y }, // oben
          { left: 0, top: rahmen.y + rahmen.height, width: paper.width, height: paper.height - (rahmen.y + rahmen.height) }, // unten
          { left: 0, top: rahmen.y, width: rahmen.x, height: rahmen.height }, // links
          { left: rahmen.x + rahmen.width, top: rahmen.y, width: paper.width - (rahmen.x + rahmen.width), height: rahmen.height }, // rechts
        ];
        return (
          <div data-testid="plankopf-preview-zonen-overlay" className="k-publish-zonen-overlay">
            {baender.map(
              (b, i) =>
                b.width > 0.01 &&
                b.height > 0.01 && (
                  <div
                    key={i}
                    className="k-publish-zonen-band"
                    style={{
                      left: `${(b.left / paper.width) * 100}%`,
                      top: `${(b.top / paper.height) * 100}%`,
                      width: `${(b.width / paper.width) * 100}%`,
                      height: `${(b.height / paper.height) * 100}%`,
                    }}
                  />
                ),
            )}
          </div>
        );
      })()}
      {/* Vorschau-Overlay «Aussenbemassung»: B/H-Masslinien um die Zeichenfläche. */}
      {aussenbemassungVorschau && (() => {
        const rahmen = findeRahmenRect(svgMarkup);
        if (!rahmen) return null;
        const { x: fx, y: fy, width: fw, height: fh } = rahmen;
        return (
          <svg
            data-testid="plankopf-preview-aussenbemassung-overlay"
            viewBox={`0 0 ${paper.width} ${paper.height}`}
            className="k-publish-aussenbemassung-svg"
          >
            <line x1={fx} y1={fy - 3} x2={fx + fw} y2={fy - 3} stroke="currentColor" strokeWidth={0.4} />
            <line x1={fx} y1={fy - 5} x2={fx} y2={fy - 1} stroke="currentColor" strokeWidth={0.4} />
            <line x1={fx + fw} y1={fy - 5} x2={fx + fw} y2={fy - 1} stroke="currentColor" strokeWidth={0.4} />
            <text x={fx + fw / 2} y={fy - 4} textAnchor="middle" fontSize={4} fill="currentColor">
              {Math.round(fw)} mm
            </text>
            <line x1={fx - 3} y1={fy} x2={fx - 3} y2={fy + fh} stroke="currentColor" strokeWidth={0.4} />
            <line x1={fx - 5} y1={fy} x2={fx - 1} y2={fy} stroke="currentColor" strokeWidth={0.4} />
            <line x1={fx - 5} y1={fy + fh} x2={fx - 1} y2={fy + fh} stroke="currentColor" strokeWidth={0.4} />
            <text
              x={fx - 4}
              y={fy + fh / 2}
              textAnchor="middle"
              fontSize={4}
              fill="currentColor"
              transform={`rotate(-90 ${fx - 4} ${fy + fh / 2})`}
            >
              {Math.round(fh)} mm
            </text>
          </svg>
        );
      })()}
    </div>
  );
}
