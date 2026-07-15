import { VIS_KATEGORIE_HUE, VIS_NODE_KATALOG, type VisGraph } from '@kosmo/kernel';
import { KButton, KIcon, KKeyValue, Messrahmen } from '@kosmo/ui';
import { BridgeBild } from './BridgeBild';
import { herkunftChain, kurzKennung, sterneAusQa, varianteMerkmale, type KuratierKartenDaten } from './varianten-diff';
import './vis-visual.css';

/**
 * Kurations-Inspektor (Soll-Bild `Kosmo Viz Kuratierung.dc.html` §6.2, rechte
 * Spalte 340px) — grosser Vorschau-Slot, Meta-Zeilen, Herkunft-Chain,
 * Sterne-Bewertung, «Ins Projekt übernehmen». Reiner Anzeige-Baustein: alle
 * Ableitungen kommen aus `varianten-diff.ts`, alle Aktionen laufen über die
 * vom Elternteil (`KuratierFlaeche.tsx`) gereichten Handler.
 *
 * v0.8.0B / P5 (Spez §3 B-41): die Meta-Zeilen laufen jetzt über `KKeyValue`
 * (Zeilenstapel gap 1px, Key Mono faint / Wert Mono secondary) statt des
 * vorherigen Inline-Nachbaus — exakt das Muster, das B-41 als Ersatz für
 * Inspector-Label/Wert-Paare vorgibt.
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
      <aside data-testid="vis-kuratier-inspektor" className="vis-inspektor vis-inspektor--leer">
        <Messrahmen height={160} caption="Kurations-Inspektor — wähle eine Karte im Raster" />
      </aside>
    );
  }

  const qa = 'jobId' in karte.quelle ? karte.quelle.qa : undefined;
  const merkmale = varianteMerkmale(karte.node, karte.auftrag, qa);
  const kette = herkunftChain(graph, karte.node.id);
  const sterne = sterneAusQa(qa);
  const kennung = 'jobId' in karte.quelle ? kurzKennung(karte.quelle.jobId) : kurzKennung(karte.node.id);

  const metaZeilen: Array<{ key: string; wert: string }> = [
    { key: 'Node-Typ', wert: merkmale.typLabel },
    { key: 'Szene', wert: merkmale.szene },
    { key: 'Stimmung', wert: merkmale.stimmung },
    ...(merkmale.presetLabel ? [{ key: 'Preset', wert: merkmale.presetLabel }] : []),
    ...(merkmale.faithful !== undefined ? [{ key: 'Geometrie-Treue', wert: merkmale.faithful.toFixed(2) }] : []),
    ...(merkmale.samples !== undefined ? [{ key: 'Samples', wert: String(merkmale.samples) }] : []),
    ...(merkmale.qaBestanden !== undefined
      ? [{ key: 'QA-Verdikt', wert: merkmale.qaBestanden ? 'bestanden' : 'verfehlt' }]
      : []),
  ];

  return (
    <aside data-testid="vis-kuratier-inspektor" className="vis-inspektor">
      <div className="vis-inspektor-kopf">
        <span className="vis-mono-label">Kurations-Inspektor</span>
        <span className="vis-inspektor-kopf-id">
          {id}
        </span>
      </div>

      <div className="vis-inspektor-inhalt">
        <div className="slotwrap vis-inspektor-slot">
          {'dataUrl' in karte.quelle ? (
            <img
              src={karte.quelle.dataUrl}
              alt={merkmale.typLabel}
              className="vis-inspektor-slot-bild"
            />
          ) : (
            <BridgeBild
              jobId={karte.quelle.jobId}
              imageName={karte.quelle.bild}
              alt={merkmale.typLabel}
              className="vis-inspektor-slot-bild"
            />
          )}
        </div>

        <div>
          <div className="vis-inspektor-titel">Variante {id}</div>
          <div className="vis-inspektor-untertitel">
            {kennung} · {merkmale.typLabel}
          </div>
        </div>

        <KKeyValue zeilen={metaZeilen} />

        <div>
          <div className="vis-mono-label vis-kuratier-rail-titel">Herkunft</div>
          <div className="vis-inspektor-herkunft" data-testid="vis-kuratier-herkunft">
            {kette.map((n, i) => {
              const kat = VIS_NODE_KATALOG[n.typ];
              const farbe = kat ? VIS_KATEGORIE_HUE[kat.kategorie] : 'var(--k-ink-faint)';
              return (
                <span key={n.id} className="vis-inspektor-herkunft-glied">
                  <span className="vis-inspektor-herkunft-chip">
                    <span aria-hidden className="vis-inspektor-herkunft-punkt" style={{ ['--_farbe' as string]: farbe }} />
                    <span className="vis-inspektor-herkunft-label">
                      {kat?.label ?? n.typ}
                    </span>
                  </span>
                  {i < kette.length - 1 && (
                    <KIcon name="pfeil-rechts" size={14} className="vis-inspektor-herkunft-pfeil" />
                  )}
                </span>
              );
            })}
          </div>
        </div>

        <div>
          <div className="vis-mono-label vis-kuratier-rail-titel">Bewertung</div>
          <div className="vis-inspektor-bewertung" data-testid="vis-kuratier-bewertung">
            {[0, 1, 2, 3, 4].map((i) => (
              <KIcon
                key={i}
                name={i < sterne ? 'stern-voll' : 'stern'}
                size={16}
                className={i < sterne ? 'vis-inspektor-bewertung-stern--aktiv' : 'vis-inspektor-bewertung-stern'}
              />
            ))}
          </div>
          {sterne === 0 && (
            <div className="vis-inspektor-bewertung-leer">
              Keine QA-Bewertung vorhanden.
            </div>
          )}
        </div>
      </div>

      <div className="vis-inspektor-fuss">
        <div className="vis-inspektor-fuss-zeile">
          <KButton size="sm" tone="quiet" className="vis-inspektor-fuss-knopf" data-testid="vis-kuratier-inspektor-favorit" onClick={onMarkieren}>
            <KIcon name={karte.kur.markiert ? 'stern-voll' : 'stern'} size={14} className="vis-inspektor-fuss-knopf-icon" />
            Favorit
          </KButton>
          <KButton size="sm" tone="ghost" data-testid="vis-kuratier-inspektor-verwerfen" onClick={onVerwerfen}>
            <KIcon name="schliessen" size={14} />
            {karte.kur.verworfen ? 'Zurückholen' : 'Verwerfen'}
          </KButton>
        </div>
        <KButton size="sm" tone="accent" className="vis-inspektor-fuss-primaer" data-testid="vis-kuratier-inspektor-ins-projekt" onClick={onInsProjekt}>
          <KIcon name="ordner" size={14} />
          Ins Projekt übernehmen
        </KButton>
      </div>
    </aside>
  );
}
