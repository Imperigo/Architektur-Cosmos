import { useMemo, useRef, useState } from 'react';
import { Hairline, Messrahmen, Badge, KButton, KIcon, KInput, KSelect, KToolbar, KToolGruppe, Panel, moduleHue, melde, meldeFehler } from '@kosmo/ui';
import {
  imagePaperBounds,
  placementPaperBounds,
  planToDxf,
  sheetPaperSize,
  sheetToSvg,
  transmittalCsv,
  type Sheet,
  type SheetFormat,
  type Storey,
} from '@kosmo/kernel';
import { bootstrapProject, useProject } from '../../state/project-store';
import { exportSetSvgs, exportSheetSetPdf } from './export-sheets';
import { DossierPanel } from './DossierPanel';

/**
 * KosmoPublish — Blatteditor. Blätter sind Kernel-Entities (Undo/Sync/.kosmo
 * inklusive); die Vorschau ist das echte Druck-SVG, Platzierungen werden per
 * Drag direkt auf dem Papier verschoben (Command beim Loslassen).
 */

const FORMATS: SheetFormat[] = ['A0', 'A1', 'A2', 'A3', 'A4'];
const SCALES = [50, 100, 200, 500];

export interface PublishWorkspaceProps {
  /** Serie K / A4: öffnet das zentrale Einstellungs-Panel, vorgefiltert auf
   *  KosmoPublish. Optional — nur `App.tsx` kennt diesen Weg. */
  onEinstellungen?: () => void;
}

export function PublishWorkspace({ onEinstellungen }: PublishWorkspaceProps = {}) {
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
  const [neuesSetName, setNeuesSetName] = useState('');
  const [placeStoreyId, setPlaceStoreyId] = useState<string | null>(null);
  const [placeScale, setPlaceScale] = useState(100);
  const [selectedPlacement, setSelectedPlacement] = useState<string | null>(null);
  const [selectedBild, setSelectedBild] = useState<string | null>(null);
  const [drag, setDrag] = useState<{ id: string; dx: number; dy: number } | null>(null);
  const [textDrag, setTextDrag] = useState<{ id: string; dx: number; dy: number } | null>(null);
  const [bildDrag, setBildDrag] = useState<{ id: string; dx: number; dy: number } | null>(null);
  // Stream A1: Report-Dossier-Panel — lokaler Ein/Aus-Zustand wie in
  // DesignWorkspace.tsx (kvOffen/bauablaufOffen/…), aber ohne globalen
  // ui-zustand-Store, weil DossierPanel bewusst ein eigenständiges Panel
  // bleibt (nur `onClose`-Prop, kein Doc-/Undo-Zustand).
  const [dossierOffen, setDossierOffen] = useState(false);
  const svgHostRef = useRef<HTMLDivElement>(null);
  const bildDateiRef = useRef<HTMLInputElement>(null);

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

  /**
   * T4a-Bug2: «Set speichern» tat bislang scheinbar nichts — kein Feedback bei
   * Erfolg, kein Feedback beim stillen No-op (leerer Name/kein Blatt), kein
   * try/catch um den Command. Jetzt: klare Meldung in JEDEM Fall, Set landet
   * über `publish.setSpeichern` im Doc (dort, wo die Liste unten liest) und
   * taucht sofort in der Sets-Liste auf (Undo/Sync/.kosmo inklusive).
   */
  function setSpeichern() {
    const name = neuesSetName.trim();
    if (!name) {
      melde('Erst einen Set-Namen eingeben.', { ton: 'fehler' });
      return;
    }
    if (sheets.length === 0) {
      melde('Kein Blatt im Plansatz — erst «+ Blatt» oder ein Plakat anlegen.', { ton: 'fehler' });
      return;
    }
    try {
      runCommand('publish.setSpeichern', {
        name,
        sheetIds: sheets.map((s) => s.id),
      });
      setNeuesSetName('');
      melde(`Set «${name}» gespeichert (${sheets.length} ${sheets.length === 1 ? 'Blatt' : 'Blätter'})`, { ton: 'erfolg' });
    } catch (err) {
      meldeFehler(err);
    }
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

  function placeAxo() {
    if (!sheet || !paper) return;
    runCommand('publish.ansichtPlatzieren', {
      sheetId: sheet.id,
      view: 'axo',
      scale: placeScale * 2, // Axo grosszügiger skalieren (halb so gross wie 1:scale)
      x: paper.width / 2,
      y: (paper.height - 30) / 2,
    });
  }

  /** Schnitt-/Ansichtslinie aus der Modell-Bbox (Blick = linke Normale a→b). */
  function schnittLinie(richtung: 'schnitt' | 'nord' | 'ost' | 'sued' | 'west') {
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
    if (minX === Infinity) return null;
    const midY = Math.round((minY + maxY) / 2);
    const linien = {
      schnitt: { a: { x: minX - 1000, y: midY }, b: { x: maxX + 1000, y: midY }, titel: 'Schnitt' },
      sued: { a: { x: minX - 1000, y: minY - 2000 }, b: { x: maxX + 1000, y: minY - 2000 }, titel: 'Ansicht Süd' },
      nord: { a: { x: maxX + 1000, y: maxY + 2000 }, b: { x: minX - 1000, y: maxY + 2000 }, titel: 'Ansicht Nord' },
      ost: { a: { x: maxX + 2000, y: minY - 1000 }, b: { x: maxX + 2000, y: maxY + 1000 }, titel: 'Ansicht Ost' },
      west: { a: { x: minX - 2000, y: maxY + 1000 }, b: { x: minX - 2000, y: minY - 1000 }, titel: 'Ansicht West' },
    } as const;
    return linien[richtung];
  }

  /** Schnitt durch die Mitte oder Ansicht von aussen (N/O/S/W). */
  function placeSchnitt(richtung: 'schnitt' | 'nord' | 'ost' | 'sued' | 'west') {
    if (!sheet || !paper) return;
    const l = schnittLinie(richtung);
    if (!l) return;
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

  /** Leerer Bild-Slot in Blattmitte — Platzhalter, bis Renders (KosmoVis) da sind. */
  function placeBildSlot() {
    if (!sheet || !paper) return;
    const w = Math.min(120, paper.width * 0.35);
    runCommand('publish.bildPlatzieren', {
      sheetId: sheet.id,
      x: Math.round(paper.width / 2 - w / 2),
      y: Math.round((paper.height - 30) / 2 - w / 3),
      w: Math.round(w),
    });
  }

  /**
   * «Blatt füllen» (Owner-Befund K10): schlägt die Kosmo-Ableitung vor, was
   * noch fehlt (Grundrisse, im Modell bereits definierte Schnitte, Axo,
   * Kennzahlen, Renderbild/Platzhalter), und platziert es — EIN atomarer
   * Undo-Schritt (publish.blattFuellen liefert genau EINEN Patch). Die
   * Meldung nennt ehrlich, was platziert wurde UND was das Modell (noch)
   * nicht hergibt, statt es stillschweigend zu verschweigen.
   */
  function blattFuellen() {
    if (!sheet) return;
    try {
      const res = runCommand('publish.blattFuellen', { sheetId: sheet.id });
      const hatHinweise = res.summary.includes('Fehlt im Modell');
      melde(res.summary, { ton: hatHinweise ? 'info' : 'erfolg', dauerMs: hatHinweise ? 9000 : 4000 });
    } catch (err) {
      meldeFehler(err);
    }
  }

  /** Datei-Picker: gewähltes Bild in den ausgewählten Slot einbetten. */
  function bildDateiGewaehlt(file: File | undefined) {
    if (!file || !sheet || !selectedBild) return;
    const reader = new FileReader();
    reader.onload = () => {
      runCommand('publish.bildFuellen', { sheetId: sheet.id, bildId: selectedBild, dataUrl: String(reader.result) });
    };
    reader.readAsDataURL(file);
  }

  /**
   * Baugesuch-Blattsatz (v0.6.3 VP2, Owner-Hauptaufgabe K22): stellt den
   * kuratierten Blattsatz fürs CH-Baugesuch zusammen — Situation, Grundriss
   * je Geschoss, die bereits definierten Schnitte und ein
   * Ausnützungsnachweis-Blatt — und bündelt sie als Publikations-Set
   * «Baugesuch». EIN atomarer Undo-Schritt (publish.baugesuchErstellen
   * liefert alle Patches in einem Command). Die Meldung nennt ehrlich, was
   * erstellt wurde UND was das Modell (noch) nicht hergibt (keine Parzelle,
   * kein Schnitt) — die Einreichung bei der Behörde bleibt real, dies ist
   * nur die Zusammenstellung der Unterlagen.
   */
  function baugesuchErstellen() {
    try {
      const res = runCommand('publish.baugesuchErstellen', {});
      const hatLuecken = res.summary.includes('Fehlt/Lücke');
      melde(res.summary, { ton: hatLuecken ? 'info' : 'erfolg', dauerMs: hatLuecken ? 10000 : 4500 });
    } catch (err) {
      meldeFehler(err);
    }
  }

  /** Toolkit 5: A0-Wettbewerbsplakat mit vorplatzierten Slots — EIN Undo-Schritt. */
  function erzeugePlakat(layout: 'klassisch' | 'spalte') {
    const { history } = useProject.getState();
    const name = doc.settings.projectName;
    history.beginGroup();
    try {
      const res = runCommand('publish.blattErstellen', {
        name: `Plakat ${sheets.filter((s) => s.name.startsWith('Plakat')).length + 1}`,
        format: 'A0',
        orientation: 'hoch',
      });
      const sheetId = (res.patches[0] as { id: string }).id;
      // A0 hoch: 841 × 1189 mm
      const titelX = layout === 'spalte' ? 60 : 60;
      runCommand('publish.textSetzen', {
        sheetId, x: titelX, y: 90, size: 34, titel: true,
        text: name.toUpperCase(),
      });
      runCommand('publish.textSetzen', {
        sheetId, x: titelX, y: 112, size: 8,
        text: 'Projektwettbewerb · Beitrag «…»',
      });
      runCommand('publish.textSetzen', {
        sheetId, x: titelX, y: layout === 'spalte' ? 200 : 1000, size: 5,
        text: 'Konzept\nStädtebau, Setzung und Adresse — hier den\nProjekttext einsetzen (Klick links im Text-Feld).',
      });
      const slots =
        layout === 'klassisch'
          ? { axo: { x: 590, y: 320 }, plan: { x: 260, y: 560 }, ansicht: { x: 260, y: 900 }, schnitt: { x: 590, y: 900 } }
          : { axo: { x: 560, y: 300 }, plan: { x: 560, y: 640 }, ansicht: { x: 560, y: 940 }, schnitt: { x: 260, y: 940 } };
      runCommand('publish.ansichtPlatzieren', { sheetId, view: 'axo', scale: 400, x: slots.axo.x, y: slots.axo.y });
      const storeyId = placeStoreyId ?? storeys[0]?.id;
      if (storeyId) {
        runCommand('publish.ansichtPlatzieren', { sheetId, view: 'grundriss', storeyId, scale: 200, x: slots.plan.x, y: slots.plan.y });
      }
      const sued = schnittLinie('sued');
      if (sued) {
        runCommand('publish.ansichtPlatzieren', { sheetId, view: 'schnitt', a: sued.a, b: sued.b, scale: 200, x: slots.ansicht.x, y: slots.ansicht.y, title: sued.titel });
      }
      const schnitt = schnittLinie('schnitt');
      if (schnitt) {
        runCommand('publish.ansichtPlatzieren', { sheetId, view: 'schnitt', a: schnitt.a, b: schnitt.b, scale: 200, x: slots.schnitt.x, y: slots.schnitt.y, title: schnitt.titel });
      }
      // Render-Slot: leer platziert, gefüllt sobald KosmoVis liefert («Aufs Blatt»)
      const bildSlot = layout === 'klassisch' ? { x: 90, y: 160, w: 380 } : { x: 60, y: 300, w: 380 };
      runCommand('publish.bildPlatzieren', { sheetId, ...bildSlot, title: 'Visualisierung' });
      setActiveSheetId(sheetId);
    } finally {
      history.endGroup();
    }
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
    // v0.7.1 3A: EIN DXF-Exporter im Kernel (vorher zwei) — bewusster
    // Verhaltenswechsel fürs Publish-DXF: jetzt y-gespiegelt (Norden oben,
    // konsistent mit dem Design-Modul-Export/-Import) und mit semantischen
    // Layern statt der alten KOSMO-*-Layer (docs/INTEROP.md).
    const dxf = planToDxf(doc, storeyId);
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
          padding: 'var(--k-s3)',
          display: 'flex',
          flexDirection: 'column',
          gap: 'var(--k-s3)',
          overflow: 'auto',
        }}
      >
        <div data-testid="publish-werkzeugleiste" style={{ display: 'flex', alignItems: 'center', gap: 'var(--k-s2)' }}>
          <Badge hue={moduleHue.publish}>Plansatz</Badge>
          <div style={{ flex: 1 }} />
          {/* Stream A1: Report-Dossier (DossierPanel.tsx) war bislang ein
              eigenständiges, aber ungehängtes Panel — hier der Zugang dazu,
              in derselben Werkzeugleiste wie der Einstellungen-Knopf. Guard:
              «Projekt geladen» heisst im Publish-Modul konkret «mind. ein
              Geschoss existiert» (Zeile ~37/129, `bootstrapProject()` legt
              das beim Öffnen der Station immer an) — dasselbe Kriterium, das
              auch `placeGrundriss`/`placeAxo` u.a. voraussetzen. Anders als
              «Baugesuch» (keine Sperre, meldet Lücken im Ergebnistext) ist
              das Dossier hier vorsorglich gesperrt, weil es KEIN Command mit
              Lücken-Meldung ist, sondern eine reine Editor-/Export-Vorschau
              — ein leeres Panel ohne jedes Geschoss wäre ein «leeres Blatt
              vortäuschen». */}
          <KButton
            size="sm"
            tone={dossierOffen ? 'accent' : 'ghost'}
            data-testid="publish-dossier"
            title="Projekt-Dossier — Report-Blatt mit Kennzahlen, Übersicht und optionaler Governance-Freigabe (SVG-/PDF-Export)"
            aria-label="Projekt-Dossier öffnen"
            disabled={storeys.length === 0}
            onClick={() => setDossierOffen((v) => !v)}
          >
            <KIcon name="dokument" size={14} title="Projekt-Dossier" /> Dossier
          </KButton>
          {onEinstellungen && (
            <KButton
              size="sm"
              tone="ghost"
              data-testid="station-einstellungen-publish"
              title="Einstellungen — KosmoPublish"
              aria-label="Einstellungen — KosmoPublish"
              onClick={onEinstellungen}
            >
              <KIcon name="zahnrad" size={14} title="Einstellungen — KosmoPublish" />
            </KButton>
          )}
        </div>
        {sheets.map((s) => (
          <Panel
            key={s.id}
            data-testid={`sheet-${s.index}`}
            onClick={() => setActiveSheetId(s.id)}
            style={{
              padding: 'var(--k-s3) var(--k-s4)',
              cursor: 'pointer',
              borderColor: sheet?.id === s.id ? 'var(--k-accent)' : 'var(--k-line)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--k-s2)' }}>
              <div style={{ fontWeight: 550, fontSize: 'var(--k-t-sm)', flex: 1 }}>{s.name}</div>
              <button
                aria-label="Blatt entfernen"
                data-testid={`blatt-entfernen-${s.index}`}
                onClick={(ev) => {
                  ev.stopPropagation();
                  runCommand('publish.blattEntfernen', { sheetId: s.id });
                  if (activeSheetId === s.id) setActiveSheetId(null);
                }}
                style={{ all: 'unset', cursor: 'pointer', color: 'var(--k-ink-faint)', display: 'flex', padding: '0 var(--k-s1)' }}
              >
                <KIcon name="schliessen" size={14} title="Blatt entfernen" />
              </button>
            </div>
            <div style={{ fontSize: 'var(--k-t-sm)', color: 'var(--k-ink-faint)' }}>
              {s.format} {s.orientation} · {s.placements.length} Ansichten
              {(s.bilder?.length ?? 0) > 0 ? ` · ${s.bilder!.length} ${s.bilder!.length === 1 ? 'Bild' : 'Bilder'}` : ''}
            </div>
          </Panel>
        ))}
        <div style={{ display: 'flex', gap: 'var(--k-s2)', alignItems: 'center' }}>
          <KSelect
            size="sm"
            value={newFormat}
            onChange={(e) => setNewFormat(e.target.value as SheetFormat)}
          >
            {FORMATS.map((f) => (
              <option key={f} value={f}>{f}</option>
            ))}
          </KSelect>
          <KButton size="sm" tone="quiet" onClick={addSheet} data-testid="add-sheet">
            <KIcon name="plus" size={14} /> Blatt
          </KButton>
        </div>
        <Hairline />
        <div style={{ display: 'grid', gap: 'var(--k-s2)' }}>
          <span className="k-titel" style={{ fontSize: 'var(--k-t-sm)', color: 'var(--k-ink-soft)' }}>
            Baugesuch (SIA 33)
          </span>
          {/* R1-Fix (Kritik-065 p-09/i-09, «Füllflächen-Inkonsistenz»):
              «Baugesuch», «Plansatz PDF» (unten) und «Blatt füllen»
              (Werkzeugleiste) waren alle drei `tone="accent"` — drei
              gleich laut schreiende schwarze Flächen ohne erkennbare
              Rangfolge. §2-Muster: EIN Primär-Knopf pro Bereich darf
              Akzent-Füllung tragen — «Plansatz PDF» bleibt das (der
              Abschluss der ganzen Seite), «Blatt füllen» bleibt es in
              seiner eigenen Werkzeuggruppe. «Baugesuch» ist eine
              Kurzstart-Aktion wie «Klassisch»/«Spalte» (A0-Plakat, beide
              `tone="quiet"`) — bekommt dieselbe Kontur-Optik, plus einen
              Akzent-Eckpunkt (KdKarte-Muster, `DataWorkspace.tsx`
              `.k-orbit-mitte`-Nachbar) statt Füllung: aktiv/besonders
              ≠ gefüllt. */}
          {/* Kritik-Runde 2: als Grid-Kind wurde der Span auf volle Spalten-
              breite gestreckt — der absolute Akzent-Eckpunkt sass dadurch frei
              schwebend am rechten Panelrand statt an der Knopfecke.
              justifySelf begrenzt den Span auf die Knopfbreite. */}
          <span style={{ position: 'relative', display: 'inline-block', justifySelf: 'start' }}>
            <KButton
              size="sm"
              tone="quiet"
              onClick={baugesuchErstellen}
              data-testid="baugesuch-erstellen"
              title="Stellt Situation, Grundriss je Geschoss, die definierten Schnitte und ein Ausnützungsnachweis-Blatt zusammen und bündelt sie als Publikations-Set «Baugesuch» — EIN Undo-Schritt. Zusammenstellung für die Eingabe, keine Bewilligung."
              style={{ borderWidth: 1.5, borderColor: 'var(--k-accent)' }}
            >
              Baugesuch
            </KButton>
            <span
              aria-hidden
              style={{ position: 'absolute', top: 0, right: 0, width: 6, height: 6, background: 'var(--k-accent)' }}
            />
          </span>
        </div>
        <Hairline />
        <div style={{ display: 'grid', gap: 'var(--k-s2)' }}>
          <span className="k-titel" style={{ fontSize: 'var(--k-t-sm)', color: 'var(--k-ink-soft)' }}>
            A0-Plakat (Toolkit 5)
          </span>
          <div style={{ display: 'flex', gap: 'var(--k-s2)' }}>
            <KButton size="sm" tone="quiet" onClick={() => erzeugePlakat('klassisch')} data-testid="plakat-klassisch">
              Klassisch
            </KButton>
            <KButton size="sm" tone="quiet" onClick={() => erzeugePlakat('spalte')} data-testid="plakat-spalte">
              Spalte
            </KButton>
          </div>
        </div>
        {sheet && (sheet.texte?.length ?? 0) > 0 && (
          <div style={{ display: 'grid', gap: 'var(--k-s3)' }} data-testid="text-editor">
            <span className="k-titel" style={{ fontSize: 'var(--k-t-sm)', color: 'var(--k-ink-soft)' }}>Texte</span>
            {sheet.texte!.map((t) => (
              <textarea
                key={t.id}
                defaultValue={t.text}
                rows={Math.min(t.text.split('\n').length + 1, 5)}
                data-testid={`text-${t.id}`}
                onBlur={(e) => {
                  if (e.target.value !== t.text) {
                    runCommand('publish.textSetzen', { sheetId: sheet.id, textId: t.id, text: e.target.value });
                  }
                }}
                style={{
                  padding: 'var(--k-s2) var(--k-s3)',
                  borderRadius: 'var(--k-radius-sm)',
                  border: '1px solid var(--k-line-strong)',
                  background: 'var(--k-raised)',
                  fontSize: 'var(--k-t-sm)',
                  fontFamily: t.titel ? 'var(--k-font-titel)' : 'var(--k-font-ui)',
                  resize: 'vertical',
                }}
              />
            ))}
          </div>
        )}
        <Hairline />
        <div style={{ display: 'grid', gap: 'var(--k-s2)' }} data-testid="pubsets">
          <span className="k-titel" style={{ fontSize: 'var(--k-t-sm)', color: 'var(--k-ink-soft)' }}>
            Publikations-Sets
          </span>
          {(doc.settings.publikationsSets ?? []).map((set) => (
            <div
              key={set.name}
              data-testid="pubset-karte"
              style={{ display: 'flex', gap: 'var(--k-s2)', alignItems: 'center', fontSize: 'var(--k-t-sm)' }}
            >
              <span style={{ flex: 1, fontWeight: 550 }}>
                {set.name}{' '}
                <span style={{ color: 'var(--k-ink-faint)', fontWeight: 400 }}>
                  · {set.sheetIds.length} Blätter
                </span>
              </span>
              <KButton size="sm" tone="quiet" data-testid="pubset-pdf" onClick={() => void exportSheetSetPdf(set)}>
                PDF
              </KButton>
              <KButton size="sm" tone="ghost" data-testid="pubset-svg" onClick={() => exportSetSvgs(set)}>
                SVGs
              </KButton>
              <KButton
                size="sm"
                tone="ghost"
                data-testid="pubset-transmittal"
                title="Transmittal-Liste (Begleitliste zum Planversand): Blatt, Format, Massstab, Revision"
                aria-label="Transmittal-Liste exportieren"
                onClick={() => {
                  const csv = transmittalCsv(useProject.getState().doc, set);
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
              <button
                aria-label={`Set ${set.name} entfernen`}
                onClick={() => runCommand('publish.setEntfernen', { name: set.name })}
                style={{ all: 'unset', cursor: 'pointer', color: 'var(--k-ink-faint)', display: 'flex', padding: '0 var(--k-s1)' }}
              >
                <KIcon name="schliessen" size={14} title="Set entfernen" />
              </button>
            </div>
          ))}
          <div style={{ display: 'flex', gap: 'var(--k-s2)', flexWrap: 'wrap' }}>
            <KInput
              size="sm"
              value={neuesSetName}
              onChange={(e) => setNeuesSetName(e.target.value)}
              /* R1-Fix (Kritik-065 p-09/i-09, «Set-Name-Placeholder hart
                 abgeschnitten»): die schmale Sidebar liess vom Beispiel nur
                 «Set-Name (z.B.» stehen — gekürzt statt der Sidebar-Breite
                 (die auch andere Bereiche trägt) hinterherzujagen. */
              placeholder="Set-Name…"
              title="Set-Name, z.B. «Wettbewerb»"
              data-testid="pubset-name"
              style={{ flex: 1, minWidth: 0 }}
            />
            <KButton
              size="sm"
              tone="quiet"
              data-testid="pubset-speichern"
              title="Speichert die aktuellen Blätter in Reihenfolge als benanntes Set — Dateinamen nach «P-{nr}_{blatt}_{massstab}»"
              onClick={setSpeichern}
            >
              Set speichern
            </KButton>
          </div>
        </div>
        <div style={{ flex: 1 }} />
        {/* R1-Fix (Kritik-065 p-09/i-09, «Blatt SVG»/«Grundriss DXF» als
            nackte Textlinks): beide waren `tone="ghost"` OHNE sichtbaren
            Rand — neben dem gefüllten «Plansatz PDF» wirkten sie wie reine
            Textlinks statt wie gleichrangige Export-Aktionen. Jetzt in einer
            gerahmten Gruppe mit «Plansatz PDF» (Panel-Rand), beide mit
            Export-KIcon und sichtbarem Rand — bleiben `tone="ghost"`
            (Kontur statt Füllung, §2-Muster: nur «Plansatz PDF» akzentuiert). */}
        <div
          style={{
            display: 'grid',
            gap: 'var(--k-s2)',
            padding: 'var(--k-s3)',
            border: '1px solid var(--k-line)',
            borderRadius: 'var(--k-radius-sm)',
          }}
        >
          <KButton size="sm" tone="accent" onClick={() => void exportSheetSetPdf()} data-testid="export-set">
            <KIcon name="export" size={14} /> Plansatz PDF
          </KButton>
          <KButton
            size="sm"
            tone="ghost"
            onClick={exportSvg}
            data-testid="export-blatt-svg"
            style={{ borderColor: 'var(--k-line)' }}
          >
            <KIcon name="export" size={14} /> Blatt SVG
          </KButton>
          <KButton
            size="sm"
            tone="ghost"
            onClick={exportDxfFile}
            data-testid="export-dxf"
            style={{ borderColor: 'var(--k-line)' }}
          >
            <KIcon name="export" size={14} /> Grundriss DXF
          </KButton>
        </div>
      </div>

      {/* Blattfläche */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, position: 'relative' }}>
        <KToolbar data-testid="blattflaeche-werkzeugleiste" dicht style={{ flexWrap: 'wrap' }}>
          <KToolGruppe label="Platzieren">
            <KSelect
              size="sm"
              value={placeStoreyId ?? storeys[0]?.id ?? ''}
              onChange={(e) => setPlaceStoreyId(e.target.value)}
              data-testid="place-storey"
            >
              {storeys.map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </KSelect>
            <KSelect
              size="sm"
              value={placeScale}
              onChange={(e) => setPlaceScale(Number(e.target.value))}
            >
              {SCALES.map((s) => (
                <option key={s} value={s}>1:{s}</option>
              ))}
            </KSelect>
            <KButton size="sm" tone="quiet" onClick={placeGrundriss} data-testid="place-plan" disabled={!sheet}>
              Grundriss
            </KButton>
            <KButton size="sm" tone="quiet" onClick={placeAxo} data-testid="place-axo" disabled={!sheet}>
              Axo
            </KButton>
            <KButton size="sm" tone="quiet" onClick={() => placeSchnitt('schnitt')} data-testid="place-section" disabled={!sheet}>
              Schnitt
            </KButton>
            <KButton size="sm" tone="quiet" onClick={placeBildSlot} data-testid="place-bildslot" disabled={!sheet}>
              Bild-Slot
            </KButton>
            <KButton
              size="sm"
              tone="accent"
              onClick={blattFuellen}
              data-testid="blatt-fuellen"
              disabled={!sheet}
              title="Kosmo schlägt fehlende Ansichten/Schnitte vor und platziert sie — Blatt immer vollständig, ehrlich über Lücken im Modell"
            >
              Blatt füllen
            </KButton>
          </KToolGruppe>
          <KToolGruppe label="Ansicht">
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
          </KToolGruppe>
          {selectedPlacement && sheet && (() => {
            const pl = sheet.placements.find((x) => x.id === selectedPlacement);
            if (!pl) return null;
            return (
              <KToolGruppe label="Auswahl">
                <KSelect
                  size="sm"
                  value={pl.scale}
                  data-testid="auswahl-massstab"
                  onChange={(e) =>
                    runCommand('publish.ansichtAnpassen', {
                      sheetId: sheet.id,
                      placementId: pl.id,
                      scale: Number(e.target.value),
                    })
                  }
                >
                  {(SCALES.includes(pl.scale) ? SCALES : [pl.scale, ...SCALES]).map((sc) => (
                    <option key={sc} value={sc}>1:{sc}</option>
                  ))}
                </KSelect>
                <KSelect
                  size="sm"
                  value={pl.umbau ?? ''}
                  data-testid="auswahl-umbau"
                  title="Umbau-Filter: Abbruch- und Neubauplan aus einem Modell"
                  onChange={(e) =>
                    runCommand('publish.ansichtAnpassen', {
                      sheetId: sheet.id,
                      placementId: pl.id,
                      umbau: e.target.value === '' ? null : e.target.value,
                    })
                  }
                >
                  <option value="">Kombiniert</option>
                  <option value="bestand">Bestand</option>
                  <option value="abbruch">Abbruchplan</option>
                  <option value="neu">Neubauplan</option>
                </KSelect>
                {(doc.settings.themen ?? []).length > 0 && (
                  <KSelect
                    size="sm"
                    value={pl.thema ?? ''}
                    data-testid="auswahl-thema"
                    title="Themenplan: Regeln aus design.themenPlanSpeichern tönen die Platzierung"
                    onChange={(e) =>
                      runCommand('publish.ansichtAnpassen', {
                        sheetId: sheet.id,
                        placementId: pl.id,
                        thema: e.target.value === '' ? null : e.target.value,
                      })
                    }
                  >
                    <option value="">Kein Thema</option>
                    {(doc.settings.themen ?? []).map((t) => (
                      <option key={t.name} value={t.name}>{t.name}</option>
                    ))}
                  </KSelect>
                )}
                <KInput
                  size="sm"
                  defaultValue={pl.title ?? ''}
                  key={pl.id}
                  placeholder="Titel"
                  data-testid="auswahl-titel"
                  onBlur={(e) => {
                    if (e.target.value !== (pl.title ?? '')) {
                      runCommand('publish.ansichtAnpassen', { sheetId: sheet.id, placementId: pl.id, title: e.target.value });
                    }
                  }}
                  style={{ width: 130 }}
                />
                <KButton
                  size="sm"
                  tone="ghost"
                  data-testid="auswahl-entfernen"
                  onClick={() => {
                    runCommand('publish.ansichtEntfernen', { sheetId: sheet.id, placementId: selectedPlacement });
                    setSelectedPlacement(null);
                  }}
                >
                  Entfernen
                </KButton>
              </KToolGruppe>
            );
          })()}
          {selectedBild && sheet && (() => {
            const b = (sheet.bilder ?? []).find((x) => x.id === selectedBild);
            if (!b) return null;
            return (
              <KToolGruppe label="Bild">
                <KInput
                  size="sm"
                  type="number"
                  defaultValue={Math.round(b.w)}
                  key={`w-${b.id}-${b.w}`}
                  data-testid="bild-breite"
                  title="Breite in Papier-mm"
                  mono
                  onBlur={(e) => {
                    const w = Number(e.target.value);
                    if (Number.isFinite(w) && w >= 10 && w !== b.w) {
                      runCommand('publish.bildAnpassen', { sheetId: sheet.id, bildId: b.id, w });
                    }
                  }}
                  style={{ width: 62 }}
                />
                <KInput
                  size="sm"
                  defaultValue={b.title ?? ''}
                  key={`t-${b.id}`}
                  placeholder="Bildtitel"
                  data-testid="bild-titel"
                  onBlur={(e) => {
                    if (e.target.value !== (b.title ?? '')) {
                      runCommand('publish.bildAnpassen', { sheetId: sheet.id, bildId: b.id, title: e.target.value });
                    }
                  }}
                  style={{ width: 110 }}
                />
                <KButton size="sm" tone="quiet" data-testid="bild-laden" onClick={() => bildDateiRef.current?.click()}>
                  Bild laden…
                </KButton>
                <KButton
                  size="sm"
                  tone="ghost"
                  data-testid="bild-entfernen"
                  onClick={() => {
                    runCommand('publish.bildEntfernen', { sheetId: sheet.id, bildId: b.id });
                    setSelectedBild(null);
                  }}
                >
                  Entfernen
                </KButton>
              </KToolGruppe>
            );
          })()}
          <input
            ref={bildDateiRef}
            type="file"
            accept="image/png,image/jpeg,image/webp"
            style={{ display: 'none' }}
            onChange={(e) => {
              bildDateiGewaehlt(e.target.files?.[0]);
              e.target.value = '';
            }}
          />
          <div style={{ flex: 1 }} />
          <KButton size="sm" tone="ghost" onClick={undo}>
            <KIcon name="pfeil-links" size={14} /> Rückgängig
          </KButton>
        </KToolbar>

        <div
          style={{
            flex: 1,
            overflow: 'auto',
            display: 'grid',
            placeItems: 'center',
            background: 'var(--k-field)',
            padding: 'var(--k-s6)',
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
                      borderRadius: 'var(--k-radius-sm)',
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
                    style={{
                      position: 'absolute',
                      left: `${(x / paper.width) * 100}%`,
                      top: `${(y / paper.height) * 100}%`,
                      width: `${(r.width / paper.width) * 100}%`,
                      height: `${(r.height / paper.height) * 100}%`,
                      border: sel ? '1.5px solid var(--k-accent)' : '1px dashed transparent',
                      cursor: 'move',
                      borderRadius: 'var(--k-radius-sm)',
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
              {/* Text-Overlays: Titel/Konzepttexte direkt auf dem Blatt verschieben */}
              {(sheet.texte ?? []).map((t) => {
                const zeilen = t.text.split('\n');
                const wMm = Math.max(...zeilen.map((z) => z.length)) * t.size * 0.55;
                const hMm = zeilen.length * t.size * 1.35;
                const tx = textDrag?.id === t.id ? textDrag.dx : t.x;
                const ty = (textDrag?.id === t.id ? textDrag.dy : t.y) - t.size;
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
                    style={{
                      position: 'absolute',
                      left: `${(tx / paper.width) * 100}%`,
                      top: `${(ty / paper.height) * 100}%`,
                      width: `${(Math.max(wMm, 20) / paper.width) * 100}%`,
                      height: `${(Math.max(hMm, 8) / paper.height) * 100}%`,
                      border: textDrag?.id === t.id ? '1.5px solid var(--k-accent)' : '1px dashed transparent',
                      cursor: 'move',
                    }}
                    onMouseEnter={(e) => {
                      if (textDrag?.id !== t.id) (e.currentTarget as HTMLElement).style.border = '1px dashed var(--k-accent)';
                    }}
                    onMouseLeave={(e) => {
                      if (textDrag?.id !== t.id) (e.currentTarget as HTMLElement).style.border = '1px dashed transparent';
                    }}
                  />
                );
              })}
            </div>
          ) : (
            /* R1-Fix (Kritik-065 p-09/i-09, «Blattbereich-Leersatz von
               Mono-Versal auf Lauftext-Stimme umstellen»): `Messrahmen`
               (kosmo-ui, eingefroren) rendert seine `caption` fest in
               Mono-Versal (Vermessungs-Anmutung, für Passermarken/Achsen
               dort korrekt) — für einen ganzen Satz an Anleitung liest sich
               das wie eine Fehlermeldung, nicht wie ein Hinweis. `caption`
               bleibt leer (die Passermarken/Achsen/Eckwinkel bleiben), der
               eigentliche Satz kommt als eigenes, normal gesetztes Element
               darüber (`--k-font-ui`/`--k-t-sm`) — Wortlaut unverändert
               (e2e/module.spec.ts:491 prüft `getByText('Noch kein Blatt im
               Plansatz', …)`, nur EINE sichtbare Fundstelle im DOM). */
            <div style={{ position: 'relative', width: 520, maxWidth: '90%' }}>
              <Messrahmen height={280} caption="" style={{ width: '100%' }} />
              <div
                style={{
                  position: 'absolute',
                  inset: 0,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: '0 16%',
                  textAlign: 'center',
                  fontFamily: 'var(--k-font-ui)',
                  fontSize: 'var(--k-t-sm)',
                  color: 'var(--k-ink-soft)',
                  lineHeight: 1.5,
                  pointerEvents: 'none',
                }}
              >
                Noch kein Blatt im Plansatz — links Format wählen und «+ Blatt», dann Grundrisse, Schnitte und
                Ansichten platzieren
              </div>
            </div>
          )}
        </div>
        {dossierOffen && <DossierPanel onClose={() => setDossierOffen(false)} />}
      </div>
    </div>
  );
}
