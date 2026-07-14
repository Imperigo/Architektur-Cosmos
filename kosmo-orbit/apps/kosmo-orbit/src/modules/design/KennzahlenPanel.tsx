import { useMemo, useState } from 'react';
import { Badge, Hairline, KButton, KIcon, Measure, moduleHue } from '@kosmo/ui';
import { areaReport, kennzahlenAuswerten, pruefeGrundriss } from '@kosmo/kernel';
import { useProject } from '../../state/project-store';

/**
 * Live-Kennzahlen (Vorform/Finch-Muster, Owner-Methodik):
 * SIA-416-Flächen aus Zonen, aGF-Ziel = HNF × Faktor, GF-Schätzung mit
 * Fassadenzuschlag, GF aus Volumenstudien nach Nutzung. Läuft bei jedem
 * Befehl live mit — das Excel stirbt.
 */

const fmt = (m2: number) =>
  m2 >= 100 ? Math.round(m2).toLocaleString('de-CH') : m2.toFixed(1);

export function KennzahlenPanel() {
  const revision = useProject((s) => s.revision);
  const doc = useProject.getState().doc;
  const activeStoreyId = useProject((s) => s.activeStoreyId);
  const [open, setOpen] = useState(true);
  // H-15/H-17 (Sim-Befunde): kein 6er-Deckel mehr — die Liste zeigt alle
  // Befunde, gruppiert nach Schwere; ein einfacher Filter blendet Warnungen/
  // Hinweise aus, wenn nur die Fehler interessieren.
  const [checksFilter, setChecksFilter] = useState<'alle' | 'fehler'>('alle');
  const report = useMemo(() => areaReport(doc), [doc, revision]);
  const befunde = useMemo(
    () => (activeStoreyId ? pruefeGrundriss(doc, activeStoreyId) : []),
    [doc, revision, activeStoreyId],
  );
  // UI-Selbstkritik 0.6.4 (SK-D2): identische Befundtexte (z.B. zwei gleich
  // schmale «Küche»-Zonen) erscheinen nicht mehr als Wiederholung, sondern
  // EINMAL mit «2×»-Zähler — die Einzelbefunde selbst bleiben unverändert
  // (pruefeGrundriss ist Kernel, hier nur Anzeige-Gruppierung).
  const befundeGruppiert = useMemo(() => {
    const m = new Map<string, { schwere: (typeof befunde)[number]['schwere']; text: string; n: number }>();
    for (const b of befunde) {
      const k = `${b.schwere}|${b.text}`;
      const e = m.get(k);
      if (e) e.n++;
      else m.set(k, { schwere: b.schwere, text: b.text, n: 1 });
    }
    return [...m.values()];
  }, [befunde]);

  const hasZones = report.totalNgf > 0;
  const hasMasses = report.gfVolumen > 0;

  return (
    <div
      data-testid="kennzahlen"
      // K3 (Owner S. 8): «Popup-Texte dürfen niemals den Block verlassen» —
      // dieselbe zentrale Overflow-Regel wie alle anderen Panels (T4b).
      //
      // v0.7.8 Welle 2 (P4, Rechts-Stack-Migration): vorher ein eigener
      // `position:'absolute'`-Overlay (`right`/`top:44`/`width:240`/
      // `maxHeight`) — jetzt ein Dock-Panel-INHALT (`dock-stationen.ts`
      // `'kennzahlen'`, wichtigkeit 60), Chrome/Position/Grösse kommen von
      // `DockPanel.tsx`/`dock-kern.ts`s Solver. Doppel-Chrome bewusst (wie
      // `RasterPanel.tsx`): Hintergrund/Rahmen/Schatten bleiben, nur
      // Position/Breite/Höhen-Deckel entfallen — der äussere
      // `.k-dock-panel-inhalt` (dock-flaeche.css) übernimmt das Scrollen.
      className="k-dialog"
      style={{
        background: 'var(--k-surface)',
        border: '1px solid var(--k-line)',
        borderRadius: 'var(--k-radius-md)',
        boxShadow: 'var(--k-shadow-raised)',
        fontSize: 'var(--k-t-sm)',
      }}
    >
      <button
        onClick={() => setOpen(!open)}
        style={{
          all: 'unset',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          gap: 'var(--k-s3)',
          padding: 'var(--k-s3) var(--k-s4)',
          width: 'calc(100% - 24px)',
        }}
      >
        <Badge hue={moduleHue.design}>Kennzahlen</Badge>
        {befunde.length > 0 && (
          <Badge hue={befunde[0]!.schwere === 'fehler' ? 'var(--k-danger, #b3462e)' : 'var(--k-warning)'}>
            {befunde.length} Check{befunde.length > 1 ? 's' : ''}
          </Badge>
        )}
        <span style={{ flex: 1 }} />
        <KIcon name={open ? 'minus' : 'plus'} size={14} style={{ color: 'var(--k-ink-faint)' }} />
      </button>
      {open && (
        <div style={{ padding: '0 var(--k-s4) var(--k-s4)', display: 'grid', gap: 'var(--k-s3)' }}>
          {!hasZones && !hasMasses && (
            <div style={{ color: 'var(--k-ink-faint)' }}>
              Zeichne Zonen oder Volumen — die Flächen laufen hier live mit.
            </div>
          )}
          {hasZones && (
            <>
              {(['HNF', 'NNF', 'VF', 'FF', 'KF'] as const).map(
                (k) =>
                  report.total[k] > 0 && (
                    <Row key={k} label={k} value={`${fmt(report.total[k])} m²`} />
                  ),
              )}
              <Hairline />
              <Row label="NGF" value={`${fmt(report.totalNgf)} m²`} strong />
              <Row
                label={`aGF-Ziel (×${doc.settings.agfFactor})`}
                value={`${fmt(report.agfZiel)} m²`}
                strong
              />
              <Row
                label={`GF-Schätzung (×${doc.settings.facadeFactor})`}
                value={`${fmt(report.gfSchaetzung)} m²`}
              />
            </>
          )}
          {hasMasses && (
            <>
              {hasZones && <Hairline />}
              <Row label="GF Volumenstudie" value={`${fmt(report.gfVolumen)} m²`} strong />
              {Object.entries(report.gfVolumenNachProgramm).map(([prog, gf]) => (
                <Row key={prog} label={`· ${prog}`} value={`${fmt(gf)} m²`} />
              ))}
            </>
          )}
          {kennzahlenAuswerten(doc, report).length > 0 && (
            <>
              <Hairline />
              <div style={{ display: 'grid', gap: 3 }} data-testid="custom-kennzahlen">
                {kennzahlenAuswerten(doc, report).map((k) => (
                  <Row
                    key={k.name}
                    label={`${k.name} (${k.basis})`}
                    value={`${k.betrag.toLocaleString('de-CH')} ${k.einheit}`}
                    strong
                  />
                ))}
              </div>
            </>
          )}
          {befunde.length > 0 && (
            <>
              <Hairline />
              <div style={{ display: 'flex', gap: 'var(--k-s2)' }}>
                <KButton
                  size="sm"
                  tone={checksFilter === 'alle' ? 'accent' : 'ghost'}
                  data-testid="checks-filter-alle"
                  onClick={() => setChecksFilter('alle')}
                >
                  Alle
                </KButton>
                <KButton
                  size="sm"
                  tone={checksFilter === 'fehler' ? 'accent' : 'ghost'}
                  data-testid="checks-filter-fehler"
                  onClick={() => setChecksFilter('fehler')}
                >
                  Nur Fehler
                </KButton>
              </div>
              <div style={{ display: 'grid', gap: 'var(--k-s3)' }} data-testid="checks">
                {(['fehler', 'warnung', 'hinweis'] as const)
                  .filter((schwere) => checksFilter === 'alle' || schwere === 'fehler')
                  .map((schwere) => {
                    const gruppe = befundeGruppiert.filter((b) => b.schwere === schwere);
                    if (gruppe.length === 0) return null;
                    return (
                      <div
                        key={schwere}
                        data-testid={`checks-gruppe-${schwere}`}
                        style={{ display: 'grid', gap: 'var(--k-s2)' }}
                      >
                        <span
                          style={{
                            fontSize: 'var(--k-t-xs)',
                            fontWeight: 600,
                            letterSpacing: '0.02em',
                            textTransform: 'uppercase',
                            color: 'var(--k-ink-faint)',
                          }}
                        >
                          {schwere} ({gruppe.length})
                        </span>
                        {gruppe.map((b, i) => (
                          <div key={i} style={{ display: 'flex', gap: 'var(--k-s3)', alignItems: 'baseline' }}>
                            {b.schwere === 'hinweis' ? (
                              <span title={b.schwere} style={{ color: 'var(--k-ink-faint)', fontWeight: 700 }}>
                                ·
                              </span>
                            ) : (
                              <KIcon
                                name="warnung"
                                size={14}
                                title={b.schwere}
                                style={{
                                  color: b.schwere === 'fehler' ? 'var(--k-danger, #b3462e)' : 'var(--k-warning)',
                                  flex: '0 0 auto',
                                }}
                              />
                            )}
                            <span style={{ color: 'var(--k-ink-soft)', lineHeight: 1.4 }}>
                              {b.n > 1 ? `${b.n}× ` : ''}
                              {b.text}
                            </span>
                          </div>
                        ))}
                      </div>
                    );
                  })}
                <span style={{ color: 'var(--k-ink-faint)', fontSize: 'var(--k-t-xs)' }}>
                  Richtwerte-Checks — kein Normersatz.
                </span>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}

function Row({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
      <span style={{ color: strong ? 'var(--k-ink)' : 'var(--k-ink-soft)', fontWeight: strong ? 550 : 400 }}>
        {label}
      </span>
      <Measure style={{ fontWeight: strong ? 600 : 400 }}>{value}</Measure>
    </div>
  );
}
