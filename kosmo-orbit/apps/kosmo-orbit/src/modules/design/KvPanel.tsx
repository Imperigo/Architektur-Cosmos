import { useMemo } from 'react';
import { deriveKostenschaetzung, kvBlattSvg, KV_HINWEIS, siaPhaseLabel, type KvKennwerte } from '@kosmo/kernel';
import { Badge, Hairline, KButton, KIcon, KInput, Measure } from '@kosmo/ui';
import { useProject } from '../../state/project-store';
import './design-panels.css';

/**
 * KV-Panel — Kostenvoranschlag-**Grobschätzung** (v0.6.3,
 * `docs/V063-VOLLPROJEKT-KONZEPT.md` Abschnitt 4, Lücken-Batch 3,
 * Owner-Hauptaufgabe K22). Zeigt `derive/kostenschaetzung.ts` als
 * editierbares Panel neben der Berechnungsliste: Tabelle der BKP-Positionen,
 * Summe, ein prominenter Ehrlichkeits-Hinweis («Richtwert, kein Devis») und
 * die Kennwert-Felder, die den Command `design.kvKennwerteSetzen` direkt
 * feuern (analog `sia-phase-select`/`bemassung-stil` — sofortige,
 * undo-fähige Settings-Änderung, keine separate «Übernehmen»-Stufe).
 *
 * AUSDRÜCKLICH kein Devis: keine CRB/NPK-Positionen, keine eBKP-
 * Feingliederung — der Hinweis steht permanent sichtbar, nicht nur beim
 * Export.
 */

const fmt = (v: number) => v.toLocaleString('de-CH', { maximumFractionDigits: 0 });

export function KvPanel({ onClose }: { onClose: () => void }) {
  const revision = useProject((s) => s.revision);
  const runCommand = useProject((s) => s.runCommand);
  const doc = useProject.getState().doc;

  const kv = useMemo(
    () => deriveKostenschaetzung(doc),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [revision],
  );

  const setzen = (feld: keyof KvKennwerte, wert: number): void => {
    if (!Number.isFinite(wert)) return;
    runCommand('design.kvKennwerteSetzen', { [feld]: wert });
  };

  const exportSvg = () => {
    const svg = kvBlattSvg(kv, {
      ...(doc.settings.projectName ? { titel: doc.settings.projectName } : {}),
      datum: new Date().toLocaleDateString('de-CH'),
      siaPhase: doc.settings.siaPhase,
    });
    const blob = new Blob([svg], { type: 'image/svg+xml' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'kv-blatt.svg';
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const kennwertFeld = (
    label: string,
    feld: keyof KvKennwerte,
    testid: string,
    proz: boolean,
    titel: string,
  ) => (
    <label className="dp-feld-inline" title={titel}>
      {label}
      <KInput
        size="sm"
        mono
        type="number"
        value={proz ? Math.round(kv.kennwerte[feld] * 100) : kv.kennwerte[feld]}
        data-testid={testid}
        onChange={(e) => {
          const roh = Number(e.target.value);
          setzen(feld, proz ? roh / 100 : roh);
        }}
        className="dp-w76"
      />
      {proz ? '%' : 'CHF/m²'}
    </label>
  );

  return (
    <div data-testid="kv-panel" className="dp-dialog dp-dialog--scroll">
      <div className="dp-kopf">
        <Badge hue="var(--k-mod-design)">Kostenschätzung</Badge>
        <div className="dp-fuell" />
        <KButton size="sm" tone="ghost" onClick={exportSvg} data-testid="kv-blatt">
          KV-Blatt (SVG)
        </KButton>
        <KButton size="sm" tone="ghost" onClick={onClose} aria-label="Schliessen">
          <KIcon name="schliessen" size={14} />
        </KButton>
      </div>

      <div data-testid="kv-hinweis" className="dp-hinweis">
        {KV_HINWEIS}
      </div>

      <div className="dp-meta">
        GF-Basis: <Measure>{kv.flaecheGf > 0 ? `${fmt(kv.flaecheGf)} m²` : '—'}</Measure>
        {' · '}
        {siaPhaseLabel(doc.settings.siaPhase)}
      </div>

      <Hairline />

      {kv.positionen.length === 0 ? (
        <div data-testid="kv-leer" className="dp-leer">
          Keine Geometrie gezeichnet — zuerst Decken oder Volumenkörper anlegen, dann rechnet die
          Schätzung mit.
        </div>
      ) : (
        <table className="dp-tabelle" data-testid="kv-tabelle">
          <thead>
            <tr>
              <th>BKP</th>
              <th>Bezeichnung</th>
              <th>CHF</th>
            </tr>
          </thead>
          <tbody>
            {kv.positionen.map((p) => (
              <tr key={p.bkp}>
                <td>{p.bkp}</td>
                <td>{p.bezeichnung}</td>
                <td className="dp-num">
                  <Measure>{fmt(p.betrag)}</Measure>
                </td>
              </tr>
            ))}
            <tr className="dp-tabelle-summe">
              <td colSpan={2}>Total</td>
              <td className="dp-num" data-testid="kv-summe">
                <Measure>{fmt(kv.total)}</Measure>
              </td>
            </tr>
          </tbody>
        </table>
      )}

      <Hairline />

      <div className="dp-spalte">
        <div className="k-titel dp-titel-block">Kennwerte (Annahme Owner-Guideline, kein verbindlicher Wert)</div>
        <div className="dp-reihe">
          {kennwertFeld('BKP 2 Basis', 'chfProM2Gf', 'kv-chf-m2', false, 'CHF pro m² GF für BKP 2 (Gebäude)')}
          {kennwertFeld('Rohbau', 'anteilRohbau', 'kv-anteil-rohbau', true, 'Anteil Rohbau am BKP-2-Basiswert')}
          {kennwertFeld('Ausbau', 'anteilAusbau', 'kv-anteil-ausbau', true, 'Anteil Ausbau am BKP-2-Basiswert')}
          {kennwertFeld('Technik', 'anteilTechnik', 'kv-anteil-technik', true, 'Anteil Gebäudetechnik am BKP-2-Basiswert')}
          {kennwertFeld('Umgebung (BKP 4)', 'zuschlagUmgebung', 'kv-zuschlag-umgebung', true, 'Zuschlag BKP 4 als Anteil der BKP-2-Summe')}
          {kennwertFeld('Baunebenkosten (BKP 5)', 'zuschlagBaunebenkosten', 'kv-zuschlag-baunebenkosten', true, 'Zuschlag BKP 5 als Anteil der BKP-2-Summe')}
          {kennwertFeld('Reserve', 'reserve', 'kv-reserve', true, 'Reserve als Anteil der Zwischensumme BKP 2+4+5')}
        </div>
        <span className="dp-fussnote">
          Jede Änderung ist ein eigener Undo-Schritt (Command design.kvKennwerteSetzen).
        </span>
      </div>
    </div>
  );
}
