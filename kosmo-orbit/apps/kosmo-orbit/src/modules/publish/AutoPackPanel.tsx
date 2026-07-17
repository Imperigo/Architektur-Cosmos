import { useMemo, useState } from 'react';
import {
  BLATT_PACK_DEFAULTS,
  schlageBlattBelegungVor,
  type BlattPackOptions,
  type BlattVorschlag,
  type Sheet,
} from '@kosmo/kernel';
import { Badge, Hairline, KButton, KIcon, melde, meldeFehler, moduleHue } from '@kosmo/ui';
import { useProject } from '../../state/project-store';
import './publish.css';

/**
 * AutoPackPanel (v0.8.1 P12, `docs/V081-SPEZ.md` §7(b)/C-26, «Auto-Pack-
 * Layout-Editor») — Editor-UI für die additiven `BlattPackOptions`
 * (`derive/blattfuellung.ts`): Reihenfolge/Gewichtung der Blatt-Arten und die
 * vier Raster-Abstandsmasse. Zeigt eine ECHTE Vorschau (ruft dieselbe reine
 * Ableitung `schlageBlattBelegungVor` mit dem lokalen Entwurf auf — KEINE
 * zweite, «klügere» Heuristik) und wendet den Entwurf über den bestehenden
 * `publish.blattFuellen`-Command an (EIN atomarer Undo-Schritt, wie ohne
 * Editor). Eigenständiges Panel nach demselben Muster wie `PlankopfPanel.tsx`
 * (nur `sheetId`/`onClose`-Props, eigener `useProject`-Zugriff).
 *
 * Ehrlichkeit (Auftrag: keine «KI-Magie»-Behauptung): der Text unten nennt
 * die Ableitung ausdrücklich «dasselbe Spaltenraster, das auch ohne Editor
 * läuft» — der Editor stellt reale, benannte Zahlen ein, er rät nichts.
 */

const REIHENFOLGE_STANDARD: BlattVorschlag['art'][] = [
  'grundriss',
  'schnitt',
  'situationsplan',
  'axo',
  'text',
  'bild',
];

const ART_LABEL: Record<BlattVorschlag['art'], string> = {
  grundriss: 'Grundriss (je Geschoss)',
  schnitt: 'Schnitt (bereits definiert)',
  situationsplan: 'Situationsplan',
  axo: 'Axonometrie',
  text: 'Kennzahlen',
  bild: 'Render/Platzhalter',
};

export interface AutoPackPanelProps {
  sheetId: string;
  onClose: () => void;
}

export function AutoPackPanel({ sheetId, onClose }: AutoPackPanelProps) {
  useProject((s) => s.revision); // re-rendern, wenn sich das Doc ändert
  const { doc, runCommand } = useProject.getState();
  const [reihenfolge, setReihenfolge] = useState<BlattVorschlag['art'][]>(REIHENFOLGE_STANDARD);
  const [spaltenZielMm, setSpaltenZielMm] = useState(BLATT_PACK_DEFAULTS.spaltenZielMm);
  const [maxSpalten, setMaxSpalten] = useState(BLATT_PACK_DEFAULTS.maxSpalten);
  const [zeilenHoeheMm, setZeilenHoeheMm] = useState(BLATT_PACK_DEFAULTS.zeilenHoeheMm);
  const [gutterMm, setGutterMm] = useState(BLATT_PACK_DEFAULTS.gutterMm);
  const [randMm, setRandMm] = useState(BLATT_PACK_DEFAULTS.randMm);

  const sheet = doc.get<Sheet>(sheetId);

  const entwurf: BlattPackOptions = useMemo(
    () => ({ reihenfolge, spaltenZielMm, maxSpalten, zeilenHoeheMm, gutterMm, randMm }),
    [reihenfolge, spaltenZielMm, maxSpalten, zeilenHoeheMm, gutterMm, randMm],
  );

  const vorschau = useMemo(
    () => (sheet ? schlageBlattBelegungVor(doc, sheet, entwurf) : null),
    [doc, sheet, entwurf],
  );

  if (!sheet || sheet.kind !== 'sheet') return null;

  function rauf(art: BlattVorschlag['art']) {
    setReihenfolge((liste) => {
      const i = liste.indexOf(art);
      if (i <= 0) return liste;
      const kopie = [...liste];
      [kopie[i - 1], kopie[i]] = [kopie[i]!, kopie[i - 1]!];
      return kopie;
    });
  }

  function runter(art: BlattVorschlag['art']) {
    setReihenfolge((liste) => {
      const i = liste.indexOf(art);
      if (i === -1 || i >= liste.length - 1) return liste;
      const kopie = [...liste];
      [kopie[i], kopie[i + 1]] = [kopie[i + 1]!, kopie[i]!];
      return kopie;
    });
  }

  function zuruecksetzen() {
    setReihenfolge(REIHENFOLGE_STANDARD);
    setSpaltenZielMm(BLATT_PACK_DEFAULTS.spaltenZielMm);
    setMaxSpalten(BLATT_PACK_DEFAULTS.maxSpalten);
    setZeilenHoeheMm(BLATT_PACK_DEFAULTS.zeilenHoeheMm);
    setGutterMm(BLATT_PACK_DEFAULTS.gutterMm);
    setRandMm(BLATT_PACK_DEFAULTS.randMm);
  }

  function anwenden() {
    try {
      const res = runCommand('publish.blattFuellen', { sheetId, optionen: entwurf });
      const hatHinweise = res.summary.includes('Fehlt im Modell');
      melde(res.summary, { ton: hatHinweise ? 'info' : 'erfolg', dauerMs: hatHinweise ? 9000 : 4000 });
    } catch (err) {
      meldeFehler(err);
    }
  }

  return (
    <div data-testid="autopack-panel" className="k-publish-panel">
      <div className="k-publish-panel-kopf">
        <Badge hue={moduleHue.publish}>Auto-Pack-Editor</Badge>
        <div className="k-publish-spacer k-publish-meta-zeile">{sheet.name}</div>
        <KButton size="sm" tone="ghost" onClick={onClose} aria-label="Schliessen" data-testid="autopack-schliessen">
          <KIcon name="schliessen" size={14} />
        </KButton>
      </div>

      <Hairline />

      <div className="k-publish-abschnitt">
        <span className="k-publish-hinweis-klein" data-testid="autopack-ehrlichkeit-hinweis">
          Kein «KI»-Layout: dasselbe Spaltenraster wie «Blatt füllen» ohne Editor — hier werden nur die
          Reihenfolge und die vier Rastermasse benannt eingestellt und in der Vorschau sofort real
          nachgerechnet, nichts wird geraten.
        </span>
      </div>

      <Hairline />

      {/* Reihenfolge/«Gewichtung» — Rang bestimmt die Platzierungspriorität. */}
      <div className="k-publish-abschnitt">
        <span className="k-publish-abschnitt-label">Reihenfolge (Priorität)</span>
        {reihenfolge.map((art, i) => (
          <div key={art} className="k-publish-reihe" data-testid={`autopack-reihenfolge-${art}`}>
            <span className="k-publish-spacer">{ART_LABEL[art]}</span>
            <KButton
              size="sm"
              tone="ghost"
              aria-label={`${ART_LABEL[art]} nach oben`}
              data-testid={`autopack-rauf-${art}`}
              disabled={i === 0}
              onClick={() => rauf(art)}
            >
              ↑
            </KButton>
            <KButton
              size="sm"
              tone="ghost"
              aria-label={`${ART_LABEL[art]} nach unten`}
              data-testid={`autopack-runter-${art}`}
              disabled={i === reihenfolge.length - 1}
              onClick={() => runter(art)}
            >
              ↓
            </KButton>
          </div>
        ))}
      </div>

      <Hairline />

      {/* Abstände/Slots — dieselben vier Zahlen, die `schlageBlattBelegungVor`
          heute hartcodiert benutzt (`BLATT_PACK_DEFAULTS`). */}
      <div className="k-publish-abschnitt">
        <span className="k-publish-abschnitt-label">Raster-Abstände (mm) &amp; Slots</span>
        <label className="k-publish-reihe">
          <span className="k-publish-spacer">Ziel-Spaltenbreite</span>
          <input
            type="number"
            min={50}
            className="k-publish-input"
            data-testid="autopack-spaltenziel"
            value={spaltenZielMm}
            onChange={(e) => setSpaltenZielMm(Number(e.target.value) || BLATT_PACK_DEFAULTS.spaltenZielMm)}
          />
        </label>
        <label className="k-publish-reihe">
          <span className="k-publish-spacer">Max. Spalten (Slots)</span>
          <input
            type="number"
            min={1}
            max={6}
            className="k-publish-input"
            data-testid="autopack-maxspalten"
            value={maxSpalten}
            onChange={(e) => setMaxSpalten(Math.max(1, Math.round(Number(e.target.value) || 1)))}
          />
        </label>
        <label className="k-publish-reihe">
          <span className="k-publish-spacer">Zeilenhöhe</span>
          <input
            type="number"
            min={30}
            className="k-publish-input"
            data-testid="autopack-zeilenhoehe"
            value={zeilenHoeheMm}
            onChange={(e) => setZeilenHoeheMm(Number(e.target.value) || BLATT_PACK_DEFAULTS.zeilenHoeheMm)}
          />
        </label>
        <label className="k-publish-reihe">
          <span className="k-publish-spacer">Zellen-Innenabstand (Gutter)</span>
          <input
            type="number"
            min={0}
            className="k-publish-input"
            data-testid="autopack-gutter"
            value={gutterMm}
            onChange={(e) => setGutterMm(Math.max(0, Number(e.target.value) || 0))}
          />
        </label>
        <label className="k-publish-reihe">
          <span className="k-publish-spacer">Aussenrand</span>
          <input
            type="number"
            min={0}
            className="k-publish-input"
            data-testid="autopack-rand"
            value={randMm}
            onChange={(e) => setRandMm(Math.max(0, Number(e.target.value) || 0))}
          />
        </label>
        <KButton size="sm" tone="ghost" onClick={zuruecksetzen} data-testid="autopack-zuruecksetzen">
          Auf Alt-Default zurücksetzen
        </KButton>
      </div>

      <Hairline />

      {/* Echte Vorschau der Pack-Entscheidung — dieselbe Ableitung, die
          «Anwenden» gleich ausführt, hier nur berechnet statt platziert. */}
      <div className="k-publish-abschnitt">
        <span className="k-publish-abschnitt-label">Vorschau</span>
        {vorschau && vorschau.vorschlaege.length > 0 ? (
          <ul className="k-autopack-vorschau-liste" data-testid="autopack-vorschau-liste">
            {vorschau.vorschlaege.map((v, i) => (
              <li key={i} className="k-autopack-vorschau-eintrag" data-testid={`autopack-vorschau-eintrag-${i}`}>
                {i + 1}. {ART_LABEL[v.art]}
                {'scale' in v ? ` — 1:${v.scale}` : ''} @ ({Math.round(v.x)}, {Math.round(v.y)})
              </li>
            ))}
          </ul>
        ) : (
          <span className="k-publish-hinweis-klein" data-testid="autopack-vorschau-leer">
            Nichts zu ergänzen — das Blatt ist mit diesen Einstellungen bereits vollständig.
          </span>
        )}
        {vorschau && vorschau.hinweise.length > 0 && (
          <ul className="k-autopack-hinweis-liste" data-testid="autopack-vorschau-hinweise">
            {vorschau.hinweise.map((h, i) => (
              <li key={i} data-testid={`autopack-vorschau-hinweis-${i}`} className="k-publish-hinweis-klein">
                {h}
              </li>
            ))}
          </ul>
        )}
      </div>

      <Hairline />

      <div className="k-publish-abschnitt">
        <KButton
          size="sm"
          tone="quiet"
          onClick={anwenden}
          data-testid="autopack-anwenden"
          disabled={!vorschau || vorschau.vorschlaege.length === 0}
          title="Platziert die Vorschau — EIN atomarer Undo-Schritt, wie «Blatt füllen» ohne Editor"
        >
          Anwenden
        </KButton>
      </div>
    </div>
  );
}
