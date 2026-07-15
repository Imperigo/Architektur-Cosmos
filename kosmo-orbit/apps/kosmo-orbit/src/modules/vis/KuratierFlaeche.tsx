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
import './vis-visual.css';

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
      // zIndex 35 statt 8 (v0.7.8 Welle 3/P6): die früheren z-5-Overlays
      // (Palette/Minimap/Legende/Ausrichten) sind jetzt Dock-Panels mit
      // z-14 (gedockt) bzw. z-30 (schwebend, `DockPanel.tsx`) — die
      // Vollbild-Kuratier-Fläche muss weiterhin ÜBER ihnen liegen (wie 8
      // vorher über 5 lag). Ihr Schliessen-Knopf (`vis-kuratier-toggle`,
      // NodeCanvas.tsx) liegt eine Stufe höher (36).
      className="k-einblenden vis-kuratier-flaeche"
    >
      <div className="vis-kuratier-mitte">
        {/* Herkunft-Rail (Entsprechung Soll-Bild "Node-Palette 268") */}
        <aside className="vis-kuratier-rail">
          <span className="vis-mono-label vis-kuratier-rail-titel">Aktiver Zweig</span>
          {zweig.length === 0 ? (
            <span className="vis-kuratier-rail-leer">Graph ist leer.</span>
          ) : (
            zweig.map((n) => {
              const kat = VIS_NODE_KATALOG[n.typ];
              const farbe = kat ? VIS_KATEGORIE_HUE[kat.kategorie] : 'var(--k-ink-faint)';
              return (
                <div key={n.id} className="vis-kuratier-rail-zeile">
                  <span aria-hidden className="vis-kuratier-rail-icon" style={{ ['--_farbe' as string]: farbe }} />
                  <span className="vis-kuratier-rail-label">
                    {kat?.label ?? n.typ}
                  </span>
                </div>
              );
            })
          )}
          <div className="vis-kuratier-rail-trenner" />
          <span className="vis-kuratier-rail-fuss">
            {karten.length} Varianten insgesamt
          </span>
        </aside>

        {/* Mitte: Sub-Toolbar + Raster/Vergleich */}
        <div className="vis-kuratier-spalte">
          <div className="vis-kuratier-subtoolbar">
            <KIcon name="auge" size={16} className="vis-kuratier-subtoolbar-icon" />
            <span className="vis-kuratier-subtoolbar-titel">{quellKat?.label ?? 'Varianten'}</span>
            <span className="vis-kuratier-subtoolbar-zahl">
              · {karten.length} Varianten
            </span>
            <div className="vis-kuratier-spacer" />
            <div className="vis-kuratier-segment">
              {(['alle', 'favoriten', 'verworfen'] as const).map((f) => (
                <button
                  key={f}
                  type="button"
                  data-testid={`vis-kuratier-filter-${f}`}
                  aria-pressed={filter === f}
                  onClick={() => setFilter(f)}
                  className={`vis-kuratier-segment-eintrag${filter === f ? ' vis-kuratier-segment-eintrag--aktiv' : ''}`}
                >
                  {FILTER_LABEL[f]}
                </button>
              ))}
            </div>
            <div className="vis-kuratier-segment">
              {(['raster', 'vergleich'] as const).map((a) => (
                <button
                  key={a}
                  type="button"
                  data-testid={`vis-kuratier-ansicht-${a}`}
                  aria-pressed={ansicht === a}
                  onClick={() => setAnsicht(a)}
                  className={`vis-kuratier-segment-eintrag${ansicht === a ? ' vis-kuratier-segment-eintrag--aktiv' : ''}`}
                >
                  {a === 'raster' ? 'Raster' : 'Vergleich'}
                </button>
              ))}
            </div>
          </div>

          <div className="vis-kuratier-inhalt">
            {ansicht === 'raster' ? (
              hauptKarten.length === 0 && !ablageSichtbar ? (
                <LeerRaster filter={filter} />
              ) : (
                <div className="vis-kuratier-raster-stapel">
                  {hauptKarten.length > 0 && (
                    <div className="vis-kuratier-raster">
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
                    <div className="vis-kuratier-ablage-stapel">
                      <span className="vis-mono-label">Ablage ({ablage.length})</span>
                      <div data-testid="vis-kuratier-ablage" className="vis-kuratier-raster">
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
              <div className="vis-kuratier-leerzustand">
                <span className="vis-kuratier-leerzustand-text">
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
      <div className="vis-kuratier-statuszeile">
        <span
          data-testid="vis-kuratier-status"
          className="vis-kuratier-statuszeile-text"
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
    <div className="vis-kuratier-leerzustand">
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
      <span className="vis-kuratier-leerzustand-text">{text}</span>
    </div>
  );
}

/** Eine Raster-Karte — KVariantenKarte-Anatomie (Spez §3 B-45/§9.12 B-93:
 * `aspect-ratio 4/3`, ID-Pill-Scrim `rgba(5,6,8,.6)`, FAVORIT-Badge, gewählt =
 * 1.5px Accent+Glow). Nutzt die `vis-raster-karte-*`-Klassen statt der
 * `KVariantenKarte`-Komponente selbst: die Karte lebt hier von zwei
 * unterschiedlichen Bildquellen (`BridgeBild`s async Blob-Fetch fürs
 * CSP-geschützte Bridge-Artefakt ODER eine direkte `dataUrl`-Aufnahme,
 * s. `KuratierKartenDaten`), die generische Komponente kennt nur ein
 * statisches `bild`-URL/`background-image` — dieselbe Optik (byte-identische
 * Klassenwerte), ohne den Blob-Fetch nachzubauen. Kein RENDERT-Badge/Scan:
 * `kuratierKarten` enthält laut `NodeCanvas.tsx` ausschliesslich `fertig`e
 * Render-Läufe + vorhandene Aufnahmen — ein «läuft»-Zustand kommt hier nie
 * vor (Ehrlichkeits-Gebot, keine Attrappe für einen Zustand ohne echte Daten). */
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

  const rahmenKlasse = ausgewaehlt
    ? 'vis-raster-karte--gewaehlt'
    : karte.kur.markiert
      ? 'vis-raster-karte--favorit'
      : '';

  return (
    <div
      data-testid="vis-kuratier-karte"
      onClick={onWahl}
      className={['vis-raster-karte', rahmenKlasse, karte.kur.verworfen ? 'vis-raster-karte--verworfen' : ''].filter(Boolean).join(' ')}
    >
      {'dataUrl' in karte.quelle ? (
        <img
          src={karte.quelle.dataUrl}
          alt={merkmale.typLabel}
          className="vis-raster-karte-bild"
        />
      ) : (
        <BridgeBild
          jobId={karte.quelle.jobId}
          imageName={karte.quelle.bild}
          alt={merkmale.typLabel}
          className="vis-raster-karte-bild"
        />
      )}

      {/* ID-Pill + Favorit-Badge */}
      <div className="vis-raster-karte-embleme">
        <span
          className={`vis-raster-karte-id${ausgewaehlt ? ' vis-raster-karte-id--aktiv' : ''}`}
        >
          {id}
        </span>
        {karte.kur.markiert && (
          <span className="vis-raster-karte-badge">
            FAVORIT
          </span>
        )}
      </div>

      {/* Fusszeile: Meta + Aktionen */}
      <div className="vis-raster-karte-fuss">
        <span className="vis-raster-karte-meta">
          {kennung} · {merkmale.szene !== '—' ? merkmale.szene : merkmale.stimmung}
        </span>
        <div className="vis-raster-karte-aktionen">
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
            className={`vis-raster-karte-knopf${karte.kur.markiert ? ' vis-raster-karte-knopf--markiert' : ''}`}
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
            className={`vis-raster-karte-knopf${karte.kur.verworfen ? ' vis-raster-karte-knopf--verworfen' : ''}`}
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
            className="vis-raster-karte-knopf"
          >
            <KIcon name="ordner" size={14} />
          </button>
          <label
            className="vis-raster-karte-vgl"
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
    return (
      <div
        key={k.node.id}
        className={`vis-vergleich-karte vis-vergleich-karte--${label.toLowerCase()}`}
      >
        {'dataUrl' in k.quelle ? (
          <img src={k.quelle.dataUrl} alt={`Variante ${label}`} className="vis-vergleich-karte-bild" />
        ) : (
          <BridgeBild jobId={k.quelle.jobId} imageName={k.quelle.bild} alt={`Variante ${label}`} className="vis-vergleich-karte-bild" />
        )}
        <div className="vis-vergleich-karte-kopf">
          <span className={`vis-vergleich-karte-label vis-vergleich-karte-label--${label.toLowerCase()}`}>
            {label}
          </span>
          <span className="vis-vergleich-karte-id">
            {id}
          </span>
        </div>
      </div>
    );
  };

  return (
    <div data-testid="vis-kuratier-vergleich-flaeche" className="vis-vergleich-flaeche">
      <div className="vis-vergleich-paar">
        {bildKarte(a, 'A', idA)}
        {bildKarte(b, 'B', idB)}
      </div>
      <div className="vis-vergleich-tabelle">
        <div className="vis-vergleich-tabelle-kopf">
          <span className="vis-mono-label vis-vergleich-tabelle-kopf-a">Variante A</span>
          <span className="vis-mono-label vis-vergleich-tabelle-kopf-label">Parameter</span>
          <span className="vis-mono-label vis-vergleich-tabelle-kopf-b">Variante B</span>
        </div>
        {zeilen.map((z) => (
          <div key={z.label} className="vis-vergleich-zeile">
            <span
              className={`vis-vergleich-zeile-wert vis-vergleich-zeile-wert--a${z.abweichend ? ' vis-vergleich-zeile-wert--abweichend-a' : ''}`}
            >
              {z.a}
            </span>
            <span className="vis-mono-label vis-vergleich-zeile-label">{z.label}</span>
            <span
              className={`vis-vergleich-zeile-wert${z.abweichend ? ' vis-vergleich-zeile-wert--abweichend-b' : ''}`}
            >
              {z.b}
            </span>
          </div>
        ))}
      </div>
      <div className="vis-vergleich-aktionen">
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
