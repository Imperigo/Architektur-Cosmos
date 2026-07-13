import { useEffect, useMemo, useState } from 'react';
import { VIS_KATEGORIE_HUE, VIS_NODE_KATALOG, type VisGraph } from '@kosmo/kernel';
import { KButton, KIcon, melde, meldeFehler } from '@kosmo/ui';
import { BridgeBild } from './BridgeBild';
import { aufnahmeAufsBlatt, bildAufsBlatt } from './vis-jobs';
import { KuratierInspektor } from './KuratierInspektor';
import {
  kartenId,
  kurzKennung,
  varianteDiff,
  varianteMerkmale,
  type KuratierKartenDaten,
} from './varianten-diff';

/**
 * Vis-Kuratierfläche (Welle 1 — Soll-Bild `Kosmo Viz Kuratierung.dc.html`
 * §6.2) — Vollflächen-Raster statt des früheren schwebenden Overlays: links
 * ein schlanker Herkunft-Rail (die EHRLICHE Entsprechung der Soll-Bild-
 * Node-Palette — echte Graph-Abstammung statt erfundener Drag-Chips, siehe
 * `README.md` §6.2 vs. tatsächliche Datenlage), Mitte Raster/Vergleich,
 * rechts der Kurations-Inspektor. Reine Anzeige/Interaktion — Kuration
 * (Stern/Ablage) bleibt in `vis-runtime.ts` (Laufzeit ≠ Modell), «Ins
 * Projekt» nutzt den bestehenden `bildAufsBlatt`/`aufnahmeAufsBlatt`-Weg
 * (KosmoPublish), kein neuer Mechanismus.
 */

type Filter = 'alle' | 'favoriten' | 'verworfen';
type Ansicht = 'raster' | 'vergleich';

const FILTER_LABEL: Record<Filter, string> = { alle: 'Alle', favoriten: 'Favoriten', verworfen: 'Verworfen' };

const monoLabel: React.CSSProperties = {
  fontFamily: 'var(--k-font-mono)',
  fontSize: 10,
  letterSpacing: '0.16em',
  textTransform: 'uppercase',
  color: 'var(--k-ink-faint)',
};

export function KuratierFlaeche({
  graph,
  karten,
  vergleichAuswahl,
  onMarkieren,
  onVerwerfen,
  onVergleichWahl,
}: {
  graph: VisGraph;
  karten: readonly KuratierKartenDaten[];
  vergleichAuswahl: readonly string[];
  onMarkieren: (nodeId: string) => void;
  onVerwerfen: (nodeId: string) => void;
  onVergleichWahl: (nodeId: string) => void;
}) {
  const [filter, setFilter] = useState<Filter>('alle');
  const [ansicht, setAnsicht] = useState<Ansicht>('raster');
  const [auswahl, setAuswahl] = useState<string | null>(null);

  const idVon = useMemo(() => {
    const m = new Map<string, string>();
    karten.forEach((k, i) => m.set(k.node.id, kartenId(k.node.typ, i)));
    return m;
  }, [karten]);

  const aktiv = karten.filter((k) => !k.kur.verworfen);
  const favoriten = aktiv.filter((k) => k.kur.markiert);
  const ablage = karten.filter((k) => k.kur.verworfen);
  // «Alle» zeigt die Ablage weiterhin GLEICHZEITIG darunter (nicht verdrängt
  // durch einen Filter) — Verwerfen bleibt «in eine Ablage, nichts wird
  // gelöscht» (bestehender Vertrag `vis-oberflaeche.spec.ts`): eine Karte
  // verschwindet beim Verwerfen NIE aus dem DOM, sie wandert nur ins zweite
  // Segment. «Favoriten»/«Verworfen» sind fokussierte ZUSATZ-Filter obendrauf.
  const hauptKarten = filter === 'favoriten' ? favoriten : filter === 'verworfen' ? [] : aktiv;
  const ablageSichtbar = filter !== 'favoriten' && ablage.length > 0;
  const sichtbar = filter === 'favoriten' ? favoriten : filter === 'verworfen' ? ablage : karten;

  // Die Auswahl fürs Inspektor-Panel folgt der sichtbaren Liste — verschwindet
  // die gewählte Karte (Filter/Verwerfen/neuer Graph), springt sie auf die
  // erste sichtbare Karte statt leerzulaufen.
  useEffect(() => {
    if (auswahl && karten.some((k) => k.node.id === auswahl)) return;
    setAuswahl(sichtbar[0]?.node.id ?? karten[0]?.node.id ?? null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [karten, filter]);

  const ausgewaehlteKarte = karten.find((k) => k.node.id === auswahl) ?? null;
  const vergleichKarten = karten.filter((k) => vergleichAuswahl.includes(k.node.id));

  // Zwei angehakte Karten zeigen die Vergleichsfläche AUTOMATISCH (bestehender
  // Vertrag `vis-oberflaeche.spec.ts`: die Checkbox allein genügt, kein Klick
  // auf den Raster/Vergleich-Umschalter nötig). Der Umschalter bleibt trotzdem
  // bedienbar — ein manueller Wechsel zurück ins Raster ist jederzeit möglich.
  useEffect(() => {
    if (vergleichAuswahl.length === 2) setAnsicht('vergleich');
  }, [vergleichAuswahl]);

  const insProjekt = async (k: KuratierKartenDaten, titel: string) => {
    try {
      const name =
        'dataUrl' in k.quelle
          ? await aufnahmeAufsBlatt(k.quelle.dataUrl, titel)
          : await bildAufsBlatt(k.quelle.jobId, k.quelle.bild, titel);
      melde(`«${titel}» liegt auf «${name}» — im KosmoPublish weiterschieben`, { ton: 'erfolg' });
    } catch (err) {
      meldeFehler(err);
    }
  };

  const quellKat = karten[0] ? VIS_NODE_KATALOG[karten[0].node.typ] : undefined;
  // Herkunft-Rail: die realen Zulieferer-Typen im Graphen (Modell/Kombinierer/
  // Render/Aufnahme) — keine erfundene Generatoren-Bibliothek ohne echte
  // Wirkung (das Soll-Bild zeigt draggable Chips; hier gibt es dafür bereits
  // die separate Node-Palette, `vis-palette`, mit echten Katalog-Einträgen).
  const zweig = graph.nodes.filter((n) =>
    ['modell', 'material', 'kombinierer', 'stimmung', 'render', 'aufnahme'].includes(n.typ),
  );

  return (
    <div
      data-testid="vis-kuratier-flaeche"
      className="k-einblenden"
      style={{ position: 'absolute', inset: 0, zIndex: 8, display: 'flex', flexDirection: 'column', background: 'var(--k-field)' }}
    >
      <div style={{ flex: 1, minHeight: 0, display: 'flex' }}>
        {/* Herkunft-Rail (Entsprechung Soll-Bild "Node-Palette 268") */}
        <aside
          style={{
            width: 220,
            flex: 'none',
            borderRight: '1px solid var(--k-line)',
            background: 'var(--k-surface)',
            padding: 16,
            display: 'grid',
            gap: 4,
            alignContent: 'start',
            overflow: 'auto',
          }}
        >
          <span style={{ ...monoLabel, marginBottom: 8 }}>Aktiver Zweig</span>
          {zweig.length === 0 ? (
            <span style={{ fontSize: 11, color: 'var(--k-ink-faint)', fontStyle: 'italic' }}>Graph ist leer.</span>
          ) : (
            zweig.map((n) => {
              const kat = VIS_NODE_KATALOG[n.typ];
              const farbe = kat ? VIS_KATEGORIE_HUE[kat.kategorie] : 'var(--k-ink-faint)';
              return (
                <div key={n.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '5px 0' }}>
                  <span
                    aria-hidden
                    style={{
                      width: 18,
                      height: 18,
                      flex: 'none',
                      borderRadius: 6,
                      background: `color-mix(in srgb, ${farbe} 16%, transparent)`,
                      border: `1px solid color-mix(in srgb, ${farbe} 45%, transparent)`,
                    }}
                  />
                  <span style={{ fontFamily: 'var(--k-font-mono)', fontSize: 10.5, color: 'var(--k-ink-soft)' }}>
                    {kat?.label ?? n.typ}
                  </span>
                </div>
              );
            })
          )}
          <div style={{ height: 1, background: 'var(--k-line)', margin: '10px 0' }} />
          <span style={{ fontFamily: 'var(--k-font-mono)', fontSize: 10.5, color: 'var(--k-ink-faint)' }}>
            {karten.length} Varianten insgesamt
          </span>
        </aside>

        {/* Mitte: Sub-Toolbar + Raster/Vergleich */}
        <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
          <div
            style={{
              height: 48,
              flex: 'none',
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              padding: '0 16px',
              borderBottom: '1px solid var(--k-line)',
              background: 'var(--k-surface)',
            }}
          >
            <KIcon name="auge" size={16} style={{ color: 'var(--k-mod-vis)' }} />
            <span style={{ fontWeight: 700, fontSize: 13.5, color: 'var(--k-ink)' }}>{quellKat?.label ?? 'Varianten'}</span>
            <span style={{ fontFamily: 'var(--k-font-mono)', fontSize: 11, color: 'var(--k-ink-faint)' }}>
              · {karten.length} Varianten
            </span>
            <div style={{ flex: 1 }} />
            <div style={{ display: 'flex', gap: 2, padding: 3, borderRadius: 'var(--k-radius-sm)', background: 'var(--k-field)', border: '1px solid var(--k-line)' }}>
              {(['alle', 'favoriten', 'verworfen'] as const).map((f) => (
                <button
                  key={f}
                  type="button"
                  data-testid={`vis-kuratier-filter-${f}`}
                  aria-pressed={filter === f}
                  onClick={() => setFilter(f)}
                  style={{
                    height: 26,
                    padding: '0 11px',
                    borderRadius: 6,
                    border: 'none',
                    cursor: 'pointer',
                    background: filter === f ? 'var(--k-accent-wash)' : 'transparent',
                    color: filter === f ? 'var(--k-accent)' : 'var(--k-ink-soft)',
                    fontFamily: 'var(--k-font-mono)',
                    fontSize: 10.5,
                    letterSpacing: '0.06em',
                    textTransform: 'uppercase',
                  }}
                >
                  {FILTER_LABEL[f]}
                </button>
              ))}
            </div>
            <div style={{ display: 'flex', gap: 2, padding: 3, borderRadius: 'var(--k-radius-sm)', background: 'var(--k-field)', border: '1px solid var(--k-line)' }}>
              {(['raster', 'vergleich'] as const).map((a) => (
                <button
                  key={a}
                  type="button"
                  data-testid={`vis-kuratier-ansicht-${a}`}
                  aria-pressed={ansicht === a}
                  onClick={() => setAnsicht(a)}
                  style={{
                    height: 26,
                    padding: '0 11px',
                    borderRadius: 6,
                    border: 'none',
                    cursor: 'pointer',
                    background: ansicht === a ? 'var(--k-accent-wash)' : 'transparent',
                    color: ansicht === a ? 'var(--k-accent)' : 'var(--k-ink-soft)',
                    fontFamily: 'var(--k-font-mono)',
                    fontSize: 10.5,
                    letterSpacing: '0.06em',
                    textTransform: 'uppercase',
                  }}
                >
                  {a === 'raster' ? 'Raster' : 'Vergleich'}
                </button>
              ))}
            </div>
          </div>

          <div style={{ flex: 1, minHeight: 0, overflow: 'auto', padding: 20 }}>
            {ansicht === 'raster' ? (
              hauptKarten.length === 0 && !ablageSichtbar ? (
                <LeerRaster filter={filter} />
              ) : (
                <div style={{ display: 'grid', gap: 24 }}>
                  {hauptKarten.length > 0 && (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
                      {hauptKarten.map((k) => (
                        <RasterKarte
                          key={k.node.id}
                          karte={k}
                          id={idVon.get(k.node.id) ?? '—'}
                          ausgewaehlt={auswahl === k.node.id}
                          imVergleich={vergleichAuswahl.includes(k.node.id)}
                          onWahl={() => setAuswahl(k.node.id)}
                          onMarkieren={() => onMarkieren(k.node.id)}
                          onVerwerfen={() => onVerwerfen(k.node.id)}
                          onVergleichWahl={() => onVergleichWahl(k.node.id)}
                          onInsProjekt={() => void insProjekt(k, `Variante ${idVon.get(k.node.id) ?? ''}`)}
                        />
                      ))}
                    </div>
                  )}
                  {ablageSichtbar && (
                    <div style={{ display: 'grid', gap: 10 }}>
                      <span style={{ ...monoLabel, color: 'var(--k-ink-faint)' }}>Ablage ({ablage.length})</span>
                      <div data-testid="vis-kuratier-ablage" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
                        {ablage.map((k) => (
                          <RasterKarte
                            key={k.node.id}
                            karte={k}
                            id={idVon.get(k.node.id) ?? '—'}
                            ausgewaehlt={auswahl === k.node.id}
                            imVergleich={vergleichAuswahl.includes(k.node.id)}
                            onWahl={() => setAuswahl(k.node.id)}
                            onMarkieren={() => onMarkieren(k.node.id)}
                            onVerwerfen={() => onVerwerfen(k.node.id)}
                            onVergleichWahl={() => onVergleichWahl(k.node.id)}
                            onInsProjekt={() => void insProjekt(k, `Variante ${idVon.get(k.node.id) ?? ''}`)}
                          />
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )
            ) : vergleichKarten.length === 2 ? (
              <VergleichAnsicht
                a={vergleichKarten[0]!}
                b={vergleichKarten[1]!}
                idA={idVon.get(vergleichKarten[0]!.node.id) ?? 'A'}
                idB={idVon.get(vergleichKarten[1]!.node.id) ?? 'B'}
                onABehalten={() => onVerwerfen(vergleichKarten[1]!.node.id)}
                onBInsProjekt={() => void insProjekt(vergleichKarten[1]!, `Variante ${idVon.get(vergleichKarten[1]!.node.id) ?? ''}`)}
              />
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, alignItems: 'center', padding: '40px 4px', textAlign: 'center' }}>
                <span style={{ fontSize: 11.5, color: 'var(--k-ink-faint)', fontStyle: 'italic' }}>
                  Wähle zwei Karten im Raster («Vergleichen»-Häkchen), um sie hier gegenüberzustellen.
                </span>
              </div>
            )}
          </div>
        </div>

        <KuratierInspektor
          graph={graph}
          karte={ausgewaehlteKarte}
          id={ausgewaehlteKarte ? (idVon.get(ausgewaehlteKarte.node.id) ?? '—') : '—'}
          onMarkieren={() => ausgewaehlteKarte && onMarkieren(ausgewaehlteKarte.node.id)}
          onVerwerfen={() => ausgewaehlteKarte && onVerwerfen(ausgewaehlteKarte.node.id)}
          onInsProjekt={() =>
            ausgewaehlteKarte &&
            void insProjekt(ausgewaehlteKarte, `Variante ${idVon.get(ausgewaehlteKarte.node.id) ?? ''}`)
          }
        />
      </div>

      {/* Statusleiste (Soll-Bild §6.2) */}
      <div
        style={{
          height: 28,
          flex: 'none',
          display: 'flex',
          alignItems: 'center',
          gap: 16,
          padding: '0 14px',
          borderTop: '1px solid var(--k-line)',
          background: 'var(--k-statusbar, var(--k-sunken, var(--k-surface)))',
        }}
      >
        <span
          data-testid="vis-kuratier-status"
          style={{ fontFamily: 'var(--k-font-mono)', fontSize: 10.5, color: 'var(--k-ink-faint)' }}
        >
          {karten.length} Varianten · {favoriten.length} Favoriten · {ablage.length} verworfen
        </span>
      </div>
    </div>
  );
}

function LeerRaster({ filter }: { filter: Filter }) {
  const text =
    filter === 'favoriten'
      ? 'Noch keine Favoriten — der Stern an einer Karte markiert sie hier.'
      : filter === 'verworfen'
        ? 'Die Ablage ist leer — nichts wurde verworfen.'
        : 'Noch keine Renderbilder oder Aufnahmen — «Ausführen» an einem Render-Node oder eine Viewport-Aufnahme füllt das Raster.';
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6, alignItems: 'center', padding: '40px 4px', textAlign: 'center' }}>
      <svg width="26" height="22" viewBox="0 0 26 22" aria-hidden focusable="false">
        <rect x="1.5" y="2.5" width="17" height="14" rx="1.5" fill="none" stroke="var(--k-ink-faint)" strokeWidth="1.4" />
        <path
          d="M13 4.6 14.4 8 18 8.3 15.3 10.6 16.1 14.1 13 12.2 9.9 14.1 10.7 10.6 8 8.3 11.6 8Z"
          fill="none"
          stroke="var(--k-ink-faint)"
          strokeWidth="1.2"
          strokeLinejoin="round"
        />
      </svg>
      <span style={{ fontSize: 11.5, color: 'var(--k-ink-faint)', fontStyle: 'italic', maxWidth: 360 }}>{text}</span>
    </div>
  );
}

/** Eine Raster-Karte (Soll-Bild §6.2: `aspect-ratio 4/3`, ID-Pill, FAVORIT-
 * Badge, Meta-Fusszeile, Aktionen). Ausgewählt = Accent-Rahmen+Glow, Favorit
 * (ohne Auswahl) = golden getönter Rahmen (Rollenfarbe `agent`). */
function RasterKarte({
  karte,
  id,
  ausgewaehlt,
  imVergleich,
  onWahl,
  onMarkieren,
  onVerwerfen,
  onVergleichWahl,
  onInsProjekt,
}: {
  karte: KuratierKartenDaten;
  id: string;
  ausgewaehlt: boolean;
  imVergleich: boolean;
  onWahl: () => void;
  onMarkieren: () => void;
  onVerwerfen: () => void;
  onVergleichWahl: () => void;
  onInsProjekt: () => void;
}) {
  const qa = 'jobId' in karte.quelle ? karte.quelle.qa : undefined;
  const merkmale = varianteMerkmale(karte.node, karte.auftrag, qa);
  const kennung = 'jobId' in karte.quelle ? kurzKennung(karte.quelle.jobId) : kurzKennung(karte.node.id);

  const rahmen = ausgewaehlt
    ? '1.5px solid var(--k-accent)'
    : karte.kur.markiert
      ? '1px solid var(--k-rolle-agent-line)'
      : '1px solid var(--k-line-strong)';

  return (
    <div
      data-testid="vis-kuratier-karte"
      onClick={onWahl}
      style={{
        position: 'relative',
        aspectRatio: '4 / 3',
        borderRadius: 'var(--k-radius-md)',
        overflow: 'hidden',
        cursor: 'pointer',
        border: rahmen,
        boxShadow: ausgewaehlt ? 'var(--k-glow-cyan, none)' : 'none',
        opacity: karte.kur.verworfen ? 0.6 : 1,
        transition: 'border-color var(--k-motion-fast, 120ms), box-shadow var(--k-motion-fast, 120ms)',
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

      {/* ID-Pill + Favorit-Badge */}
      <div style={{ position: 'absolute', top: 8, left: 8, right: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', pointerEvents: 'none' }}>
        <span
          style={{
            fontFamily: 'var(--k-font-mono)',
            fontSize: 10,
            fontWeight: 600,
            letterSpacing: '0.08em',
            padding: '3px 8px',
            borderRadius: 999,
            color: ausgewaehlt ? 'var(--k-accent)' : '#f4f6fa',
            background: 'rgba(5, 6, 8, 0.6)',
            border: `1px solid ${ausgewaehlt ? 'var(--k-accent)' : 'rgba(255,255,255,0.14)'}`,
          }}
        >
          {id}
        </span>
        {karte.kur.markiert && (
          <span
            style={{
              fontFamily: 'var(--k-font-mono)',
              fontSize: 9,
              fontWeight: 600,
              letterSpacing: '0.1em',
              padding: '3px 8px',
              borderRadius: 999,
              color: 'var(--k-rolle-agent)',
              background: 'rgba(5, 6, 8, 0.6)',
              border: '1px solid var(--k-rolle-agent-line)',
            }}
          >
            FAVORIT
          </span>
        )}
      </div>

      {/* Fusszeile: Meta + Aktionen */}
      <div
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          bottom: 0,
          padding: '9px 10px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-end',
          gap: 6,
          background: 'linear-gradient(transparent, rgba(5, 6, 8, 0.88))',
        }}
      >
        <span style={{ fontFamily: 'var(--k-font-mono)', fontSize: 9.5, letterSpacing: '0.04em', color: '#dfe3ea' }}>
          {kennung} · {merkmale.szene !== '—' ? merkmale.szene : merkmale.stimmung}
        </span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
          <button
            type="button"
            data-testid="vis-kuratier-stern"
            title={karte.kur.markiert ? 'Markierung entfernen' : 'Bild markieren'}
            aria-label={karte.kur.markiert ? 'Markierung entfernen' : 'Bild markieren'}
            aria-pressed={karte.kur.markiert}
            onClick={(e) => {
              e.stopPropagation();
              onMarkieren();
            }}
            style={knopfStil(karte.kur.markiert ? 'var(--k-rolle-agent)' : undefined)}
          >
            <KIcon name={karte.kur.markiert ? 'stern-voll' : 'stern'} size={14} />
          </button>
          <button
            type="button"
            data-testid="vis-kuratier-verwerfen"
            title={karte.kur.verworfen ? 'Aus der Ablage zurückholen' : 'Verwerfen (in die Ablage — nicht gelöscht)'}
            aria-label={karte.kur.verworfen ? 'Aus der Ablage zurückholen' : 'Verwerfen'}
            aria-pressed={karte.kur.verworfen}
            onClick={(e) => {
              e.stopPropagation();
              onVerwerfen();
            }}
            style={knopfStil(karte.kur.verworfen ? 'var(--k-danger)' : undefined)}
          >
            <KIcon name="schliessen" size={14} />
          </button>
          <button
            type="button"
            data-testid="vis-kuratier-ins-projekt"
            title="Ins Projekt (KosmoPublish)"
            aria-label="Ins Projekt"
            onClick={(e) => {
              e.stopPropagation();
              onInsProjekt();
            }}
            style={knopfStil()}
          >
            <KIcon name="ordner" size={14} />
          </button>
          <label
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 3,
              fontSize: 9,
              fontFamily: 'var(--k-font-mono)',
              color: '#c7ccd6',
              cursor: 'pointer',
              paddingLeft: 2,
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <input type="checkbox" data-testid="vis-kuratier-vergleich-wahl" checked={imVergleich} onChange={onVergleichWahl} />
            VGL
          </label>
        </div>
      </div>
    </div>
  );
}

function knopfStil(farbe?: string): React.CSSProperties {
  return {
    width: 22,
    height: 22,
    borderRadius: 6,
    display: 'grid',
    placeItems: 'center',
    cursor: 'pointer',
    background: 'rgba(5, 6, 8, 0.55)',
    border: '1px solid rgba(255,255,255,0.14)',
    color: farbe ?? '#c7ccd6',
  };
}

/** Vergleich (Soll-Bild §6.2): 2-up A/B + Parameter-Diff-Tabelle. A trägt die
 * Rollenfarbe `generator` (Heimatrolle der Kuratierung), B die Accent-Farbe
 * (die aktuell im Fokus stehende Wahl) — exakt das Soll-Bild-Mapping. */
function VergleichAnsicht({
  a,
  b,
  idA,
  idB,
  onABehalten,
  onBInsProjekt,
}: {
  a: KuratierKartenDaten;
  b: KuratierKartenDaten;
  idA: string;
  idB: string;
  onABehalten: () => void;
  onBInsProjekt: () => void;
}) {
  const qaA = 'jobId' in a.quelle ? a.quelle.qa : undefined;
  const qaB = 'jobId' in b.quelle ? b.quelle.qa : undefined;
  const merkmaleA = varianteMerkmale(a.node, a.auftrag, qaA);
  const merkmaleB = varianteMerkmale(b.node, b.auftrag, qaB);
  const zeilen = varianteDiff(merkmaleA, merkmaleB);

  const bildKarte = (k: KuratierKartenDaten, label: 'A' | 'B', id: string) => {
    const farbe = label === 'A' ? 'var(--k-rolle-generator)' : 'var(--k-accent)';
    const rahmen = label === 'A' ? 'var(--k-rolle-generator-line)' : 'var(--k-accent)';
    return (
      <div
        key={k.node.id}
        style={{
          position: 'relative',
          aspectRatio: '16 / 10',
          borderRadius: 'var(--k-radius-lg)',
          overflow: 'hidden',
          border: `1px solid ${rahmen}`,
          boxShadow: label === 'B' ? 'var(--k-glow-cyan, none)' : 'none',
        }}
      >
        {'dataUrl' in k.quelle ? (
          <img src={k.quelle.dataUrl} alt={`Variante ${label}`} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
        ) : (
          <BridgeBild jobId={k.quelle.jobId} imageName={k.quelle.bild} alt={`Variante ${label}`} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
        )}
        <div style={{ position: 'absolute', top: 12, left: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ width: 24, height: 24, borderRadius: 7, display: 'grid', placeItems: 'center', fontFamily: 'var(--k-font-mono)', fontWeight: 700, fontSize: 12, color: '#050608', background: farbe }}>
            {label}
          </span>
          <span style={{ fontFamily: 'var(--k-font-mono)', fontSize: 10.5, color: '#e6e9ef', padding: '3px 9px', borderRadius: 999, background: 'rgba(5,6,8,.6)' }}>
            {id}
          </span>
        </div>
      </div>
    );
  };

  return (
    <div data-testid="vis-kuratier-vergleich-flaeche" style={{ display: 'grid', gap: 18, maxWidth: 1100, margin: '0 auto' }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        {bildKarte(a, 'A', idA)}
        {bildKarte(b, 'B', idB)}
      </div>
      <div style={{ borderRadius: 'var(--k-radius-md)', border: '1px solid var(--k-line)', overflow: 'hidden' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', padding: '10px 16px', background: 'var(--k-surface)', borderBottom: '1px solid var(--k-line)' }}>
          <span style={{ ...monoLabel, color: 'var(--k-rolle-generator)', textAlign: 'right' }}>Variante A</span>
          <span style={{ ...monoLabel, padding: '0 20px' }}>Parameter</span>
          <span style={{ ...monoLabel, color: 'var(--k-accent)' }}>Variante B</span>
        </div>
        {zeilen.map((z) => (
          <div
            key={z.label}
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr auto 1fr',
              alignItems: 'center',
              padding: '9px 16px',
              background: 'var(--k-raised)',
              borderBottom: '1px solid var(--k-line)',
            }}
          >
            <span style={{ fontFamily: 'var(--k-font-mono)', fontSize: 12, textAlign: 'right', color: z.abweichend ? 'var(--k-rolle-generator)' : 'var(--k-ink-faint)', fontWeight: z.abweichend ? 700 : 400 }}>
              {z.a}
            </span>
            <span style={{ ...monoLabel, padding: '0 20px', minWidth: 130, textAlign: 'center', color: 'var(--k-ink-faint)' }}>{z.label}</span>
            <span style={{ fontFamily: 'var(--k-font-mono)', fontSize: 12, color: z.abweichend ? 'var(--k-accent)' : 'var(--k-ink-faint)', fontWeight: z.abweichend ? 700 : 400 }}>
              {z.b}
            </span>
          </div>
        ))}
      </div>
      <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
        <KButton size="sm" tone="quiet" data-testid="vis-kuratier-vergleich-a-behalten" onClick={onABehalten}>
          Variante A behalten
        </KButton>
        <KButton size="sm" tone="accent" data-testid="vis-kuratier-vergleich-b-projekt" onClick={onBInsProjekt}>
          <KIcon name="haken" size={14} />
          Variante B ins Projekt
        </KButton>
      </div>
    </div>
  );
}
