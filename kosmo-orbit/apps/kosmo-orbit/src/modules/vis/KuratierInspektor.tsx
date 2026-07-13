import { VIS_KATEGORIE_HUE, VIS_NODE_KATALOG, type VisGraph } from '@kosmo/kernel';
import { KButton, KIcon, Messrahmen } from '@kosmo/ui';
import { BridgeBild } from './BridgeBild';
import { herkunftChain, kurzKennung, sterneAusQa, varianteMerkmale, type KuratierKartenDaten } from './varianten-diff';

/**
 * Kurations-Inspektor (Soll-Bild `Kosmo Viz Kuratierung.dc.html` §6.2, rechte
 * Spalte 340px) — grosser Vorschau-Slot, Meta-Zeilen, Herkunft-Chain,
 * Sterne-Bewertung, «Ins Projekt übernehmen». Reiner Anzeige-Baustein: alle
 * Ableitungen kommen aus `varianten-diff.ts`, alle Aktionen laufen über die
 * vom Elternteil (`KuratierFlaeche.tsx`) gereichten Handler.
 */
export function KuratierInspektor({
  graph,
  karte,
  id,
  onMarkieren,
  onVerwerfen,
  onInsProjekt,
}: {
  graph: VisGraph;
  /** `null`, solange keine Karte existiert/gewählt ist — der Guard unten
   * zeigt dann einen Messrahmen statt eines halbleeren Panels. */
  karte: KuratierKartenDaten | null;
  id: string;
  onMarkieren: () => void;
  onVerwerfen: () => void;
  onInsProjekt: () => void;
}) {
  if (!karte) {
    return (
      <aside
        data-testid="vis-kuratier-inspektor"
        style={{
          width: 340,
          flex: 'none',
          borderLeft: '1px solid var(--k-line)',
          background: 'var(--k-surface)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 18,
        }}
      >
        <Messrahmen height={160} caption="Kurations-Inspektor — wähle eine Karte im Raster" />
      </aside>
    );
  }

  const qa = 'jobId' in karte.quelle ? karte.quelle.qa : undefined;
  const merkmale = varianteMerkmale(karte.node, karte.auftrag, qa);
  const kette = herkunftChain(graph, karte.node.id);
  const sterne = sterneAusQa(qa);
  const kennung = 'jobId' in karte.quelle ? kurzKennung(karte.quelle.jobId) : kurzKennung(karte.node.id);

  const metaZeilen: Array<[string, string]> = [
    ['Node-Typ', merkmale.typLabel],
    ['Szene', merkmale.szene],
    ['Stimmung', merkmale.stimmung],
    ...(merkmale.presetLabel ? ([['Preset', merkmale.presetLabel]] as Array<[string, string]>) : []),
    ...(merkmale.faithful !== undefined ? ([['Geometrie-Treue', merkmale.faithful.toFixed(2)]] as Array<[string, string]>) : []),
    ...(merkmale.samples !== undefined ? ([['Samples', String(merkmale.samples)]] as Array<[string, string]>) : []),
    ...(merkmale.qaBestanden !== undefined
      ? ([['QA-Verdikt', merkmale.qaBestanden ? 'bestanden' : 'verfehlt']] as Array<[string, string]>)
      : []),
  ];

  const monoLabel: React.CSSProperties = {
    fontFamily: 'var(--k-font-mono)',
    fontSize: 10,
    letterSpacing: '0.14em',
    textTransform: 'uppercase',
    color: 'var(--k-ink-faint)',
  };

  return (
    <aside
      data-testid="vis-kuratier-inspektor"
      style={{
        width: 340,
        flex: 'none',
        borderLeft: '1px solid var(--k-line)',
        background: 'var(--k-surface)',
        display: 'flex',
        flexDirection: 'column',
        minHeight: 0,
      }}
    >
      <div
        style={{
          height: 44,
          flex: 'none',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 14px',
          borderBottom: '1px solid var(--k-line)',
        }}
      >
        <span style={monoLabel}>Kurations-Inspektor</span>
        <span
          style={{
            fontFamily: 'var(--k-font-mono)',
            fontSize: 10.5,
            padding: '2px 8px',
            borderRadius: 'var(--k-radius-pill)',
            color: 'var(--k-accent)',
            background: 'var(--k-accent-wash)',
          }}
        >
          {id}
        </span>
      </div>

      <div style={{ flex: 1, minHeight: 0, overflow: 'auto', padding: 16, display: 'grid', gap: 16 }}>
        <div
          className="slotwrap"
          style={{
            position: 'relative',
            aspectRatio: '4 / 3',
            borderRadius: 'var(--k-radius-md)',
            overflow: 'hidden',
            border: '1px solid var(--k-accent)',
            boxShadow: 'var(--k-glow-cyan, none)',
          }}
        >
          {'dataUrl' in karte.quelle ? (
            <img
              src={karte.quelle.dataUrl}
              alt={merkmale.typLabel}
              style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
            />
          ) : (
            <BridgeBild
              jobId={karte.quelle.jobId}
              imageName={karte.quelle.bild}
              alt={merkmale.typLabel}
              style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
            />
          )}
        </div>

        <div>
          <div style={{ fontWeight: 700, fontSize: 17, color: 'var(--k-ink)' }}>Variante {id}</div>
          <div style={{ fontFamily: 'var(--k-font-mono)', fontSize: 11.5, color: 'var(--k-ink-soft)', marginTop: 2 }}>
            {kennung} · {merkmale.typLabel}
          </div>
        </div>

        <div style={{ display: 'grid', gap: 1, borderRadius: 'var(--k-radius-sm)', overflow: 'hidden', border: '1px solid var(--k-line)' }}>
          {metaZeilen.map(([k, v]) => (
            <div
              key={k}
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                gap: 10,
                padding: '7px 10px',
                background: 'var(--k-raised)',
                fontSize: 11.5,
              }}
            >
              <span style={{ fontFamily: 'var(--k-font-mono)', fontSize: 10.5, letterSpacing: '0.04em', color: 'var(--k-ink-faint)' }}>{k}</span>
              <span style={{ fontFamily: 'var(--k-font-mono)', color: 'var(--k-ink-soft)' }}>{v}</span>
            </div>
          ))}
        </div>

        <div>
          <div style={{ ...monoLabel, marginBottom: 8 }}>Herkunft</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }} data-testid="vis-kuratier-herkunft">
            {kette.map((n, i) => {
              const kat = VIS_NODE_KATALOG[n.typ];
              const farbe = kat ? VIS_KATEGORIE_HUE[kat.kategorie] : 'var(--k-ink-faint)';
              return (
                <span key={n.id} style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                  <span
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 5,
                      padding: '3px 8px',
                      borderRadius: 'var(--k-radius-pill)',
                      background: 'var(--k-raised)',
                      border: '1px solid var(--k-line-strong)',
                    }}
                  >
                    <span aria-hidden style={{ width: 6, height: 6, borderRadius: 999, background: farbe }} />
                    <span style={{ fontFamily: 'var(--k-font-mono)', fontSize: 10, color: 'var(--k-ink-soft)' }}>
                      {kat?.label ?? n.typ}
                    </span>
                  </span>
                  {i < kette.length - 1 && (
                    <KIcon name="pfeil-rechts" size={14} style={{ color: 'var(--k-ink-faint)' }} />
                  )}
                </span>
              );
            })}
          </div>
        </div>

        <div>
          <div style={{ ...monoLabel, marginBottom: 8 }}>Bewertung</div>
          <div style={{ display: 'flex', gap: 5 }} data-testid="vis-kuratier-bewertung">
            {[0, 1, 2, 3, 4].map((i) => (
              <KIcon
                key={i}
                name={i < sterne ? 'stern-voll' : 'stern'}
                size={16}
                style={{ color: i < sterne ? 'var(--k-rolle-agent)' : 'var(--k-line-strong)' }}
              />
            ))}
          </div>
          {sterne === 0 && (
            <div style={{ fontSize: 10.5, color: 'var(--k-ink-faint)', fontStyle: 'italic', marginTop: 4 }}>
              Keine QA-Bewertung vorhanden.
            </div>
          )}
        </div>
      </div>

      <div style={{ flex: 'none', padding: 14, borderTop: '1px solid var(--k-line)', display: 'grid', gap: 8 }}>
        <div style={{ display: 'flex', gap: 8 }}>
          <KButton size="sm" tone="quiet" style={{ flex: 1 }} data-testid="vis-kuratier-inspektor-favorit" onClick={onMarkieren}>
            <KIcon name={karte.kur.markiert ? 'stern-voll' : 'stern'} size={14} style={{ color: 'var(--k-rolle-agent)' }} />
            Favorit
          </KButton>
          <KButton size="sm" tone="ghost" data-testid="vis-kuratier-inspektor-verwerfen" onClick={onVerwerfen}>
            <KIcon name="schliessen" size={14} />
            {karte.kur.verworfen ? 'Zurückholen' : 'Verwerfen'}
          </KButton>
        </div>
        <KButton size="sm" tone="accent" style={{ width: '100%' }} data-testid="vis-kuratier-inspektor-ins-projekt" onClick={onInsProjekt}>
          <KIcon name="ordner" size={14} />
          Ins Projekt übernehmen
        </KButton>
      </div>
    </aside>
  );
}
