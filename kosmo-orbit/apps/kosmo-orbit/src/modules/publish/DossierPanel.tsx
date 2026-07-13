import { useMemo, useState } from 'react';
import { jsPDF } from 'jspdf';
import { svg2pdf } from 'svg2pdf.js';
import {
  deriveKostenschaetzung,
  DOSSIER_HINWEIS,
  projektDossierSvg,
  siaPhaseLabel,
  type DossierBildSlot,
  type DossierKennzahl,
  type ProjektDossierOptionen,
} from '@kosmo/kernel';
import { Badge, Hairline, KButton, KIcon, moduleHue } from '@kosmo/ui';
import { useProject } from '../../state/project-store';

/**
 * DossierPanel (v0.7.6 Welle 3 Stream F, Report-Dossier) — eigenständiges
 * Panel für `projektDossierSvg` (`@kosmo/kernel`, `derive/dossier.ts`), nach
 * demselben Muster wie `modules/design/KvPanel.tsx`: liest Projekt-Stammdaten
 * aus `doc.settings` (Titel, Bauherr/Adresse, SIA-Phase) und ein paar
 * bereits abgeleitete Kennzahlen (`deriveKostenschaetzung`), lässt Übersicht/
 * Freigabetext lokal editieren (KEIN Doc-Feld, KEIN Command — reine Export-
 * Vorschau, siehe Kommentar unten) und exportiert das Blatt als SVG-Blob
 * ODER als Vektor-PDF (jsPDF + svg2pdf, D4-Font-Einbettung dupliziert aus
 * `export-sheets.ts`s `betteD4PdfFontsEin` — bewusst dupliziert statt
 * geteilt, damit dieses Panel als eigenständige, additive Datei lebt und
 * `export-sheets.ts` unangetastet bleibt).
 *
 * BEWUSST NOCH NICHT in `PublishWorkspace.tsx` eingehängt (Auftrag Stream F:
 * «bevorzugt eigenständiges Panel» statt Eingriff in die grosse, belegte
 * Werkstatt-Datei) — die Verdrahtung ins Stationsmenü ist vertagte
 * Folgearbeit, sobald ein Owner-Entscheid steht, WO das Dossier im
 * Publish-Modul erscheinen soll (eigener Reiter? Knopf neben «Baugesuch»?).
 *
 * Ehrlichkeit: Herkunfts-Kette und Governance-Freigabe sind reine
 * FREITEXT-Vorschau-Felder (lokaler State, nicht Teil des Doc/Undo) — sie
 * behaupten keine echte Pipeline-Herkunft, die das Modell (noch) nicht
 * mitführt. Der Bild-Slot bleibt ausdrücklich ein Platzhalter («Render/Plan
 * folgt»), bis ein echtes Bild-Einbett-Feld für dieses Blatt existiert.
 */

const fmt = (v: number) => v.toLocaleString('de-CH', { maximumFractionDigits: 0 });

/** D4-PDF-Fonts (dieselben Dateien/Registrierungsnamen wie `export-sheets.ts`s
 * `betteD4PdfFontsEin` — s. dortiger Kommentar zur bewussten Duplikation). */
const PDF_FONTS = [
  { url: '/fonts/pdf/lato-900-latin-pdf.ttf', datei: 'Lato-900.ttf', familie: 'Lato', stil: 'bold' },
  { url: '/fonts/pdf/lato-400-latin-pdf.ttf', datei: 'Lato-400.ttf', familie: 'Lato', stil: 'normal' },
  { url: '/fonts/pdf/ibm-plex-mono-400-latin-pdf.ttf', datei: 'IBMPlexMono-400.ttf', familie: 'IBM Plex Mono', stil: 'normal' },
  { url: '/fonts/pdf/ibm-plex-mono-600-latin-pdf.ttf', datei: 'IBMPlexMono-600.ttf', familie: 'IBM Plex Mono', stil: 'bold' },
] as const;

async function ladePdfFontBase64(url: string): Promise<string | null> {
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const bytes = new Uint8Array(await res.arrayBuffer());
    let binaer = '';
    const CHUNK = 0x8000;
    for (let i = 0; i < bytes.length; i += CHUNK) {
      binaer += String.fromCharCode(...bytes.subarray(i, i + CHUNK));
    }
    return btoa(binaer);
  } catch (e) {
    console.warn(`Dossier-PDF-Font konnte nicht geladen werden (${url}) — Fallback Helvetica.`, e);
    return null;
  }
}

async function betteD4PdfFontsEin(pdf: jsPDF): Promise<void> {
  for (const f of PDF_FONTS) {
    const b64 = await ladePdfFontBase64(f.url);
    if (!b64) continue;
    pdf.addFileToVFS(f.datei, b64);
    pdf.addFont(f.datei, f.familie, f.stil);
  }
}

export function DossierPanel({ onClose }: { onClose: () => void }) {
  const revision = useProject((s) => s.revision);
  const doc = useProject.getState().doc;

  const kv = useMemo(
    () => deriveKostenschaetzung(doc),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [revision],
  );

  const [uebersichtLead, setUebersichtLead] = useState('');
  const [uebersichtText, setUebersichtText] = useState('');
  const [freigabeText, setFreigabeText] = useState('');
  const [freigegebenVon, setFreigegebenVon] = useState(doc.settings.projekt?.bauherr ?? '');

  const kennzahlen: DossierKennzahl[] = [];
  if (kv.flaecheGf > 0) kennzahlen.push({ wert: `${fmt(kv.flaecheGf)} m²`, label: 'Geschossfläche (GF)' });
  if (kv.total > 0) kennzahlen.push({ wert: `${fmt(kv.total)} CHF`, label: 'KV-Grobschätzung' });

  const bildSlots: DossierBildSlot[] = [{ bildunterschrift: 'Übersichtsplan/Render — folgt aus KosmoVis.' }];

  function baueOptionen(): ProjektDossierOptionen {
    return {
      ...(doc.settings.projectName ? { titel: doc.settings.projectName } : {}),
      ...(doc.settings.projekt?.adresse ? { untertitel: doc.settings.projekt.adresse } : {}),
      ...(doc.settings.projekt?.bauherr ? { bauherr: doc.settings.projekt.bauherr } : {}),
      siaPhase: doc.settings.siaPhase,
      datum: new Date().toLocaleDateString('de-CH'),
      ...(uebersichtLead.trim() ? { uebersichtLead: uebersichtLead.trim() } : {}),
      ...(uebersichtText.trim() ? { uebersichtText: uebersichtText.trim() } : {}),
      ...(kennzahlen.length > 0 ? { kennzahlen } : {}),
      bildSlots,
      ...(freigabeText.trim()
        ? {
            governance: {
              freigabeText: freigabeText.trim(),
              ...(freigegebenVon.trim() ? { freigegebenVon: freigegebenVon.trim() } : {}),
              datum: new Date().toLocaleDateString('de-CH'),
            },
          }
        : {}),
    };
  }

  function exportSvg() {
    const svg = projektDossierSvg(baueOptionen());
    const blob = new Blob([svg], { type: 'image/svg+xml' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `${(doc.settings.projectName || 'Projekt').replace(/\s+/g, '-')}-Dossier.svg`;
    a.click();
    URL.revokeObjectURL(a.href);
  }

  async function exportPdf() {
    const markup = projektDossierSvg(baueOptionen());
    const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    await betteD4PdfFontsEin(pdf);
    const holder = document.createElement('div');
    holder.innerHTML = markup;
    const svgEl = holder.querySelector('svg')!;
    document.body.appendChild(svgEl);
    try {
      // viewBox ist 794×1123 «Papier-Pixel» — A4 hoch ist 210×297 mm, dieselbe
      // Skala wie `kvBlattSvg`s Exportweg (Faktor ≈ 3.78 px/mm).
      await svg2pdf(svgEl, pdf, { x: 0, y: 0, width: 210, height: 297 });
    } finally {
      svgEl.remove();
    }
    pdf.save(`${(doc.settings.projectName || 'Projekt').replace(/\s+/g, '-')}-Dossier.pdf`);
  }

  return (
    <div
      data-testid="dossier-panel"
      style={{
        position: 'absolute',
        left: 90,
        top: 52,
        zIndex: 20,
        width: 430,
        maxHeight: 'calc(100% - 90px)',
        overflow: 'auto',
        background: 'var(--k-raised)',
        border: '1px solid var(--k-technik)',
        boxShadow: 'var(--k-shadow-overlay)',
        padding: 'var(--k-s4)',
        display: 'grid',
        gap: 'var(--k-s4)',
        fontSize: 'var(--k-t-sm)',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--k-s3)' }}>
        <Badge hue={moduleHue.publish}>Projekt-Dossier</Badge>
        <div style={{ flex: 1 }} />
        <KButton size="sm" tone="ghost" onClick={exportSvg} data-testid="dossier-export-svg">
          SVG
        </KButton>
        <KButton size="sm" tone="accent" onClick={() => void exportPdf()} data-testid="dossier-export-pdf">
          <KIcon name="export" size={14} /> PDF
        </KButton>
        <KButton size="sm" tone="ghost" onClick={onClose} aria-label="Schliessen">
          <KIcon name="schliessen" size={14} />
        </KButton>
      </div>

      <div
        data-testid="dossier-hinweis"
        style={{
          background: 'var(--k-warning-wash, #f6f2e6)',
          border: '1px solid var(--k-warning-line, #c9bfa0)',
          borderRadius: 'var(--k-radius-sm)',
          padding: 'var(--k-s3) var(--k-s4)',
          fontWeight: 600,
          color: 'var(--k-ink)',
        }}
      >
        {DOSSIER_HINWEIS}
      </div>

      <div style={{ color: 'var(--k-ink-faint)', fontSize: 'var(--k-t-sm)' }}>
        {doc.settings.projectName || '(kein Projektname)'} · {siaPhaseLabel(doc.settings.siaPhase)}
        {kennzahlen.length > 0 && (
          <>
            {' · '}
            {kennzahlen.map((k) => `${k.label}: ${k.wert}`).join(' · ')}
          </>
        )}
      </div>

      <Hairline />

      <div style={{ display: 'grid', gap: 'var(--k-s2)' }}>
        <span className="k-titel" style={{ fontSize: 'var(--k-t-sm)', color: 'var(--k-ink-soft)' }}>
          Übersicht (Export-Vorschau, nicht Teil des Doc)
        </span>
        <textarea
          value={uebersichtLead}
          onChange={(e) => setUebersichtLead(e.target.value)}
          placeholder="Leitsatz — ein Satz zum Projektstand …"
          rows={2}
          data-testid="dossier-uebersicht-lead"
          style={{
            padding: 'var(--k-s2) var(--k-s3)',
            borderRadius: 'var(--k-radius-sm)',
            border: '1px solid var(--k-line-strong)',
            background: 'var(--k-field)',
            fontSize: 'var(--k-t-sm)',
            fontFamily: 'var(--k-font-ui)',
            resize: 'vertical',
          }}
        />
        <textarea
          value={uebersichtText}
          onChange={(e) => setUebersichtText(e.target.value)}
          placeholder="Fliesstext — was das Dossier zusammenfasst …"
          rows={3}
          data-testid="dossier-uebersicht-text"
          style={{
            padding: 'var(--k-s2) var(--k-s3)',
            borderRadius: 'var(--k-radius-sm)',
            border: '1px solid var(--k-line-strong)',
            background: 'var(--k-field)',
            fontSize: 'var(--k-t-sm)',
            fontFamily: 'var(--k-font-ui)',
            resize: 'vertical',
          }}
        />
      </div>

      <Hairline />

      <div style={{ display: 'grid', gap: 'var(--k-s2)' }}>
        <span className="k-titel" style={{ fontSize: 'var(--k-t-sm)', color: 'var(--k-ink-soft)' }}>
          Governance & Freigabe (optional)
        </span>
        <textarea
          value={freigabeText}
          onChange={(e) => setFreigabeText(e.target.value)}
          placeholder="Freigabetext — leer lassen, damit der Abschnitt entfällt (Ehrlichkeits-Guard)."
          rows={2}
          data-testid="dossier-freigabe-text"
          style={{
            padding: 'var(--k-s2) var(--k-s3)',
            borderRadius: 'var(--k-radius-sm)',
            border: '1px solid var(--k-line-strong)',
            background: 'var(--k-field)',
            fontSize: 'var(--k-t-sm)',
            fontFamily: 'var(--k-font-ui)',
            resize: 'vertical',
          }}
        />
        <input
          value={freigegebenVon}
          onChange={(e) => setFreigegebenVon(e.target.value)}
          placeholder="Freigegeben durch …"
          data-testid="dossier-freigegeben-von"
          style={{
            padding: 'var(--k-s2) var(--k-s3)',
            borderRadius: 'var(--k-radius-sm)',
            border: '1px solid var(--k-line-strong)',
            background: 'var(--k-field)',
            fontSize: 'var(--k-t-sm)',
          }}
        />
      </div>

      <span style={{ color: 'var(--k-ink-faint)', fontSize: 'var(--k-t-xs)' }}>
        Bild-Slot, Parameter und Herkunfts-Kette folgen als eigene Felder, sobald KosmoVis/Kosmo-Data
        entsprechende Daten am Doc mitführen — bis dahin bleibt der Bild-Slot ein ehrlicher Platzhalter.
      </span>
    </div>
  );
}
