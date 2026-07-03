import { useEffect, useMemo, useState } from 'react';
import {
  deriveBerechnungsliste,
  parseRaumprogrammCsv,
  segmentiere,
  sollMix,
  typFarbe,
  WOHNUNGSTYPEN,
  type RaumprogrammPosten,
  type SegmentierungsErgebnis,
  type Zone,
} from '@kosmo/kernel';
import { Badge, Hairline, KButton, Measure } from '@kosmo/ui';
import { useProject } from '../../state/project-store';

/**
 * Berechnungsliste Volumenstudien — der Owner-Excel-Workflow als lebendes
 * Panel (Phase 3, Punkt 25): Raumprogramm erfassen, beim Zeichnen zusehen,
 * wie sich «ausgezogen» gegen das aGF-Ziel füllt; Δ Max und Tie-out wachen.
 */

const fmt = (v: number) => v.toLocaleString('de-CH', { maximumFractionDigits: 0 });

export function BerechnungslistePanel({
  wohnungstyp,
  setWohnungstyp,
  onClose,
}: {
  wohnungstyp: string | null;
  setWohnungstyp: (t: string | null) => void;
  onClose: () => void;
}) {
  const revision = useProject((s) => s.revision);
  const runCommand = useProject((s) => s.runCommand);
  const doc = useProject.getState().doc;

  const liste = useMemo(
    () => deriveBerechnungsliste(doc),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [revision],
  );

  // Entwurf des Raumprogramms (lokal, bis «Übernehmen» — dann EIN Undo-Schritt)
  const [entwurf, setEntwurf] = useState<RaumprogrammPosten[]>(
    doc.settings.raumprogramm.length > 0
      ? [...doc.settings.raumprogramm]
      : [{ typ: 'marktgerecht', hnfSoll: 0 }],
  );
  const [importMeldung, setImportMeldung] = useState<string | null>(null);
  const [faktor, setFaktor] = useState(String(doc.settings.programmFaktor));
  const [maxAgf, setMaxAgf] = useState(doc.settings.maxAgf === null ? '' : String(doc.settings.maxAgf));

  const uebernehmen = () => {
    const maxWert = Number(maxAgf);
    runCommand('design.raumprogrammSetzen', {
      posten: entwurf.filter((p) => p.hnfSoll > 0),
      programmFaktor: Number(faktor) || 1.22,
      // Unlesbares oder ≤0 zählt ehrlich als «kein Maximum» statt still zu scheitern
      maxAgf: maxAgf.trim() === '' || !Number.isFinite(maxWert) || maxWert <= 0 ? null : maxWert,
    });
  };

  const exportPdf = async () => {
    const { jsPDF } = await import('jspdf');
    const pdf = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
    const name = doc.settings.projectName;
    pdf.setFont('courier', 'bold');
    pdf.setFontSize(14);
    pdf.text(`BERECHNUNGSLISTE VOLUMENSTUDIEN — ${name.toUpperCase()}`, 14, 16);
    pdf.setFontSize(9);
    pdf.setFont('courier', 'normal');
    let y = 28;
    const row = (cells: string[], bold = false, farbe?: [number, number, number]) => {
      pdf.setFont('courier', bold ? 'bold' : 'normal');
      if (farbe) pdf.setTextColor(...farbe);
      else pdf.setTextColor(26, 24, 21);
      const xs = [14, 90, 130, 170, 210, 250];
      cells.forEach((c, i) => pdf.text(c, xs[i]!, y, i > 0 ? { align: 'right' } : undefined));
      y += 6;
    };
    row(['Wohnungstyp', 'HNF-Soll', `aGF-Ziel ×${liste.programmFaktor}`, 'ausgezogen', 'Differenz'], true);
    pdf.line(14, y - 4, 270, y - 4);
    for (const z of liste.zeilen) {
      const hex = z.farbe.replace('#', '');
      const rgb: [number, number, number] = [
        parseInt(hex.slice(0, 2), 16),
        parseInt(hex.slice(2, 4), 16),
        parseInt(hex.slice(4, 6), 16),
      ];
      row([z.name, fmt(z.hnfSoll), fmt(z.agfZiel), fmt(z.ausgezogen), `${z.differenz >= 0 ? '+' : ''}${fmt(z.differenz)}`], false, rgb);
    }
    y += 2;
    row(['Total aGF', '', '', fmt(liste.totalAgf), ''], true);
    if (liste.untypisiert > 0.5) row([`davon ohne Typzuordnung: ${fmt(liste.untypisiert)} m²`, '', '', '', '']);
    if (liste.deltaMax !== null) {
      row(['Δ Max', '', fmt(liste.maxAgf!), '', `${liste.deltaMax >= 0 ? '+' : ''}${fmt(liste.deltaMax)}`], true,
        liste.deltaMax > 0 ? [163, 61, 49] : [78, 109, 73]);
    }
    y += 4;
    row(['Geschoss', 'GF', '', '', ''], true);
    pdf.line(14, y - 4, 270, y - 4);
    for (const g of liste.geschosse) if (g.gf > 0.5) row([g.name, fmt(g.gf), '', '', '']);
    if (liste.gfVolumen > 0.5) row(['Volumenkörper', fmt(liste.gfVolumen), '', '', '']);
    row(['Total GF', fmt(liste.totalGf), '', '', ''], true);
    pdf.setFontSize(7);
    pdf.setTextColor(120, 115, 100);
    pdf.text('Alle Werte m². Lebende Ableitung aus dem Modell (KosmoOrbit) — Werte folgen der Zeichnung.', 14, 200);
    pdf.save('Berechnungsliste.pdf');
  };

  const inputStyle: React.CSSProperties = {
    width: 72,
    padding: '3px 6px',
    borderRadius: 'var(--k-radius-sm)',
    border: '1px solid var(--k-line-strong)',
    background: 'var(--k-raised)',
    fontSize: 12,
    fontFamily: 'var(--k-font-mono)',
  };

  return (
    <div
      data-testid="berechnungsliste-panel"
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
        padding: 12,
        display: 'grid',
        gap: 10,
        fontSize: 12.5,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <Badge hue="var(--k-mod-design)">Berechnungsliste</Badge>
        <div style={{ flex: 1 }} />
        <KButton size="sm" tone="ghost" onClick={() => void exportPdf()} data-testid="liste-pdf">
          A4-PDF
        </KButton>
        <KButton size="sm" tone="ghost" onClick={onClose} aria-label="Schliessen">
          ✕
        </KButton>
      </div>

      {/* Raumprogramm-Erfassung */}
      <div style={{ display: 'grid', gap: 6 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div className="k-titel" style={{ fontSize: 12, color: 'var(--k-ink-soft)' }}>
            Raumprogramm (HNF-Soll)
          </div>
          <div style={{ flex: 1 }} />
          {/* V5: Wettbewerbs-Soll als CSV — nie mehr abtippen */}
          <label style={{ cursor: 'pointer' }}>
            <span className="k-btn k-btn-sm k-btn-quiet" data-testid="csv-import" style={{ fontSize: 11 }}>
              CSV importieren
            </span>
            <input
              type="file"
              accept=".csv,text/csv,text/plain"
              style={{ display: 'none' }}
              data-testid="csv-import-input"
              onChange={async (e) => {
                const datei = e.target.files?.[0];
                if (!datei) return;
                const erg = parseRaumprogrammCsv(await datei.text());
                if (erg.posten.length > 0) {
                  runCommand('design.raumprogrammSetzen', { posten: erg.posten });
                  setEntwurf(erg.posten);
                }
                setImportMeldung(
                  erg.posten.length === 0
                    ? 'Keine Wohnungstyp-Zeilen erkannt — erwartet «Typ;HNF m²».'
                    : `${erg.posten.length} Typen übernommen${erg.uebersprungen.length ? `, ${erg.uebersprungen.length} Zeilen unzuordenbar (z.B. «${erg.uebersprungen[0]!.slice(0, 40)}»)` : ''}.`,
                );
                e.target.value = '';
              }}
            />
          </label>
        </div>
        {importMeldung && (
          <div style={{ fontSize: 11, color: 'var(--k-ink-faint)' }} data-testid="csv-import-meldung">
            {importMeldung}
          </div>
        )}
        {entwurf.map((p, i) => (
          <div key={i} style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
            <select
              value={p.typ}
              onChange={(e) => {
                const next = [...entwurf];
                next[i] = { ...p, typ: e.target.value };
                setEntwurf(next);
              }}
              style={{ ...inputStyle, width: 150, fontFamily: 'var(--k-font-ui)' }}
              data-testid={`posten-typ-${i}`}
            >
              {WOHNUNGSTYPEN.map((t) => (
                <option key={t.key} value={t.key}>
                  {t.name}
                </option>
              ))}
            </select>
            <input
              type="number"
              value={p.hnfSoll === 0 ? '' : p.hnfSoll}
              placeholder="m²"
              onChange={(e) => {
                const next = [...entwurf];
                next[i] = { ...p, hnfSoll: Number(e.target.value) || 0 };
                setEntwurf(next);
              }}
              style={inputStyle}
              data-testid={`posten-hnf-${i}`}
            />
            <span style={{ color: 'var(--k-ink-faint)', fontSize: 11 }}>m² HNF</span>
            <div style={{ flex: 1 }} />
            <KButton
              size="sm"
              tone="ghost"
              onClick={() => setEntwurf(entwurf.filter((_, j) => j !== i))}
              aria-label="Posten entfernen"
            >
              −
            </KButton>
          </div>
        ))}
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          <KButton
            size="sm"
            tone="ghost"
            onClick={() => setEntwurf([...entwurf, { typ: 'preisguenstig', hnfSoll: 0 }])}
          >
            + Posten
          </KButton>
          <span style={{ color: 'var(--k-ink-faint)' }}>×</span>
          <input value={faktor} onChange={(e) => setFaktor(e.target.value)} style={{ ...inputStyle, width: 52 }} title="aGF-Faktor" />
          <span style={{ color: 'var(--k-ink-faint)' }}>Max aGF</span>
          <input
            value={maxAgf}
            onChange={(e) => setMaxAgf(e.target.value)}
            placeholder="—"
            style={inputStyle}
            data-testid="liste-max"
          />
          <div style={{ flex: 1 }} />
          <KButton size="sm" tone="accent" onClick={uebernehmen} data-testid="liste-uebernehmen">
            Übernehmen
          </KButton>
        </div>
      </div>

      <Hairline />

      {/* Lebende Tabelle */}
      {liste.zeilen.length === 0 ? (
        <span style={{ color: 'var(--k-ink-faint)' }}>
          Raumprogramm erfassen und «Übernehmen» — dann rechnet die Liste bei jedem Strich mit.
        </span>
      ) : (
        <table style={{ borderCollapse: 'collapse', width: '100%' }} data-testid="liste-tabelle">
          <thead>
            <tr style={{ textAlign: 'right', color: 'var(--k-ink-faint)', fontSize: 11 }}>
              <th style={{ fontWeight: 500, padding: '2px 4px', textAlign: 'left' }}>Typ</th>
              <th style={{ fontWeight: 500, padding: '2px 4px' }}>Soll</th>
              <th style={{ fontWeight: 500, padding: '2px 4px' }}>Ziel ×{liste.programmFaktor}</th>
              <th style={{ fontWeight: 500, padding: '2px 4px' }}>ausgezogen</th>
              <th style={{ fontWeight: 500, padding: '2px 4px' }}>+/−</th>
              <th style={{ fontWeight: 500, padding: '2px 4px' }}>%</th>
            </tr>
          </thead>
          <tbody>
            {liste.zeilen.map((z) => (
              <tr key={z.typ} style={{ borderTop: '1px solid var(--k-line)' }}>
                <td style={{ padding: '3px 4px', color: z.farbe, fontWeight: 600 }}>{z.name}</td>
                <td style={{ padding: '3px 4px', textAlign: 'right' }}><Measure>{fmt(z.hnfSoll)}</Measure></td>
                <td style={{ padding: '3px 4px', textAlign: 'right' }}><Measure>{fmt(z.agfZiel)}</Measure></td>
                <td style={{ padding: '3px 4px', textAlign: 'right', background: `${z.farbe}20` }}>
                  <Measure>{fmt(z.ausgezogen)}</Measure>
                </td>
                <td
                  style={{
                    padding: '3px 4px',
                    textAlign: 'right',
                    color: z.differenz >= 0 ? 'var(--k-success)' : 'var(--k-danger)',
                    fontWeight: 600,
                  }}
                >
                  <Measure>{`${z.differenz >= 0 ? '+' : ''}${fmt(z.differenz)}`}</Measure>
                </td>
                <td style={{ padding: '3px 4px', textAlign: 'right', color: 'var(--k-ink-soft)' }} data-testid={`erfuellung-${z.typ}`}>
                  <Measure>{z.agfZiel > 0 ? `${Math.round((z.ausgezogen / z.agfZiel) * 100)}` : '–'}</Measure>
                </td>
              </tr>
            ))}
            <tr style={{ borderTop: '1px solid var(--k-technik)', fontWeight: 600 }}>
              <td style={{ padding: '3px 4px' }}>Total aGF</td>
              <td colSpan={2} />
              <td style={{ padding: '3px 4px', textAlign: 'right' }}><Measure>{fmt(liste.totalAgf)}</Measure></td>
              <td
                style={{
                  padding: '3px 4px',
                  textAlign: 'right',
                  color:
                    liste.deltaMax === null
                      ? 'var(--k-ink-faint)'
                      : liste.deltaMax > 0
                        ? 'var(--k-danger)'
                        : 'var(--k-success)',
                }}
                data-testid="liste-delta-max"
              >
                <Measure>
                  {liste.deltaMax === null ? '—' : `${liste.deltaMax >= 0 ? '+' : ''}${fmt(liste.deltaMax)}`}
                </Measure>
              </td>
            </tr>
          </tbody>
        </table>
      )}
      {liste.untypisiert > 0.5 && (
        <div style={{ color: 'var(--k-warning)', fontSize: 11.5 }} data-testid="liste-tieout">
          ⚠ {fmt(liste.untypisiert)} m² gezeichnet ohne Typzuordnung (Tie-out) — Zonen unten einem
          Wohnungstyp zuweisen.
        </div>
      )}

      <Hairline />

      {/* Zeichnen mit Typ: das Zonen-Werkzeug schreibt den aktiven Typ */}
      <div style={{ display: 'grid', gap: 5 }}>
        <div className="k-titel" style={{ fontSize: 12, color: 'var(--k-ink-soft)' }}>
          Zeichnen als
        </div>
        <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
          <KButton size="sm" tone={wohnungstyp === null ? 'accent' : 'ghost'} onClick={() => setWohnungstyp(null)}>
            ohne Typ
          </KButton>
          {WOHNUNGSTYPEN.map((t) => (
            <KButton
              key={t.key}
              size="sm"
              tone={wohnungstyp === t.key ? 'accent' : 'quiet'}
              onClick={() => setWohnungstyp(t.key)}
              data-testid={`typ-${t.key}`}
              style={wohnungstyp === t.key ? { background: typFarbe(t.key), borderColor: typFarbe(t.key) } : { color: typFarbe(t.key), borderColor: `${typFarbe(t.key)}66` }}
            >
              {t.name}
            </KButton>
          ))}
        </div>
        <span style={{ color: 'var(--k-ink-faint)', fontSize: 11 }}>
          Neue Zonen (Werkzeug «Zone») erhalten den gewählten Typ und zählen ins «ausgezogen».
        </span>
      </div>

      {/* GF-Block */}
      <div style={{ display: 'grid', gap: 3 }} data-testid="liste-gf">
        <div className="k-titel" style={{ fontSize: 12, color: 'var(--k-ink-soft)' }}>
          GF-Block
        </div>
        {liste.geschosse.filter((g) => g.gf > 0.5).map((g) => (
          <div key={g.storeyId} style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ color: 'var(--k-ink-soft)' }}>{g.name}</span>
            <Measure>{fmt(g.gf)} m²</Measure>
          </div>
        ))}
        {liste.gfVolumen > 0.5 && (
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ color: 'var(--k-ink-soft)' }}>Volumenkörper</span>
            <Measure>{fmt(liste.gfVolumen)} m²</Measure>
          </div>
        )}
        <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 600, borderTop: '1px solid var(--k-line)', paddingTop: 3 }}>
          <span>Total GF</span>
          <Measure>{fmt(liste.totalGf)} m²</Measure>
        </div>
      </div>

      <Hairline />
      <SegmentiererSektion />
    </div>
  );
}

/** F5: Soll-Mix → Wohnungen am Korridor schneiden (gated Übernahme). */
function SegmentiererSektion() {
  const revision = useProject((s) => s.revision);
  const activeStoreyId = useProject((s) => s.activeStoreyId);
  const runCommand = useProject((s) => s.runCommand);
  const [ergebnis, setErgebnis] = useState<SegmentierungsErgebnis | null>(null);
  const [hinweis, setHinweis] = useState<string | null>(null);
  // F6: Dialog statt Batch — Parameter ändern rechnet sofort neu
  const [minBreite, setMinBreite] = useState(4500);
  const [groessenFaktor, setGroessenFaktor] = useState(1);
  void revision;

  const schneiden = () => {
    const { doc } = useProject.getState();
    const mix = sollMix(doc);
    if (mix.length === 0) {
      setHinweis('Zuerst das Raumprogramm erfassen — daraus entsteht der Soll-Mix.');
      return;
    }
    const zonen = doc.byKind<Zone>('zone').filter((z) => z.storeyId === activeStoreyId);
    const korridor = zonen.find((z) => z.raumTyp === 'korridor');
    if (!korridor) {
      setHinweis('Eine Zone mit Raumtyp «korridor» zeichnen — daran werden die Wohnungen geschnitten.');
      return;
    }
    const rest = zonen.filter((z) => z.id !== korridor.id);
    const footprint = rest.sort((a, b) => flaeche(b.outline) - flaeche(a.outline))[0];
    if (!footprint) {
      setHinweis('Eine Footprint-Zone (Geschossfläche) zeichnen — sie wird geteilt.');
      return;
    }
    setHinweis(null);
    const groessen = Object.fromEntries(mix.map((m) => [m.typ, Math.round(m.groesse * groessenFaktor)]));
    setErgebnis(segmentiere(footprint.outline, korridor.outline, mix, { minBreite, groessen }));
  };

  // F6: Anytime-Gefühl — Sliderbewegung rechnet den Vorschlag sofort neu
  useEffect(() => {
    if (ergebnis) schneiden();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [minBreite, groessenFaktor]);

  const flaeche = (outline: { x: number; y: number }[]) => {
    let s2 = 0;
    for (let i = 0; i < outline.length; i++) {
      const p = outline[i]!;
      const q = outline[(i + 1) % outline.length]!;
      s2 += p.x * q.y - q.x * p.y;
    }
    return Math.abs(s2) / 2;
  };

  const uebernehmen = () => {
    if (!ergebnis || !activeStoreyId) return;
    const { history } = useProject.getState();
    history.beginGroup();
    try {
      let i = 0;
      for (const w of ergebnis.wohnungen) {
        i++;
        runCommand('design.zoneErstellen', {
          storeyId: activeStoreyId,
          outline: w.outline,
          name: w.typ ? `Whg ${i} (${w.typ})` : 'Restfläche',
          sia: 'HNF',
          ...(w.typ ? { program: w.typ } : {}),
        });
      }
    } finally {
      history.endGroup();
    }
    setErgebnis(null);
  };

  return (
    <div style={{ display: 'grid', gap: 6 }} data-testid="segmentierer">
      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
        <span style={{ fontWeight: 600, fontSize: 12 }}>Wohnungen schneiden</span>
        <div style={{ flex: 1 }} />
        <KButton size="sm" tone="quiet" data-testid="segmentierer-lauf" onClick={schneiden}>
          Vorschlag
        </KButton>
        {ergebnis && ergebnis.wohnungen.length > 0 && (
          <KButton size="sm" tone="accent" data-testid="segmentierer-uebernehmen" onClick={uebernehmen}>
            Übernehmen
          </KButton>
        )}
      </div>
      {hinweis && <div style={{ fontSize: 11.5, color: 'var(--k-ink-faint)' }}>{hinweis}</div>}
      {ergebnis && (
        <div style={{ display: 'grid', gap: 4, fontSize: 11.5 }}>
          <label style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <span style={{ width: 92, color: 'var(--k-ink-soft)' }}>Min-Breite</span>
            <input
              type="range" min={3500} max={7000} step={250} value={minBreite}
              data-testid="segmentierer-minbreite"
              onChange={(e) => setMinBreite(Number(e.target.value))}
              style={{ flex: 1 }}
            />
            <Measure>{(minBreite / 1000).toFixed(2)} m</Measure>
          </label>
          <label style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <span style={{ width: 92, color: 'var(--k-ink-soft)' }}>Wohnungsgrösse</span>
            <input
              type="range" min={0.8} max={1.2} step={0.05} value={groessenFaktor}
              data-testid="segmentierer-groesse"
              onChange={(e) => setGroessenFaktor(Number(e.target.value))}
              style={{ flex: 1 }}
            />
            <Measure>×{groessenFaktor.toFixed(2)}</Measure>
          </label>
        </div>
      )}
      {ergebnis && (
        <div style={{ display: 'grid', gap: 3, fontSize: 11.5 }} data-testid="segmentierer-ergebnis">
          {ergebnis.mix.map((m) => (
            <div key={m.typ} style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: typFarbe(m.typ) ?? 'var(--k-ink-soft)' }}>{m.typ}</span>
              <Measure>
                {m.ist}/{m.soll}
              </Measure>
            </div>
          ))}
          {ergebnis.diagnose.map((d, i) => (
            <div key={i} style={{ color: 'var(--k-warning)', lineHeight: 1.4 }}>
              {d}
            </div>
          ))}
          <span style={{ color: 'var(--k-ink-faint)' }}>
            Übernahme legt Zonen an — ein Undo-Schritt.
          </span>
        </div>
      )}
    </div>
  );
}
