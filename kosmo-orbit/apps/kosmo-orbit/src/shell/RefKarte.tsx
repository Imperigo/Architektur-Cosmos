import type { RefEntry } from '@kosmo/data';
import { Badge, Karteikarte, Measure, moduleHue } from '@kosmo/ui';
import { RefHeroBild } from '../modules/data/RefHeroBild';
import './kosmo-panel.css';

/**
 * RefKarte (v0.8.3/P2, `docs/V083-SPEZ.md` §6.3/E6c) — die reiche
 * Referenz-Karte im Chat-Quellenbereich: wird gerendert, sobald ein
 * `[Qn]`-Klick (`KosmoPanel.tsx`, `kp-marken-reihe`) auf eine
 * KosmoData-Referenz statt eine Wissen/Journal/Dossier/Asset-Quelle zeigt.
 *
 * Wiederverwendet zwei bestehende Bausteine statt neuer Bild-/Karten-Logik:
 *  - `RefHeroBild` (`modules/data/RefHeroBild.tsx`) — dasselbe lokal-first
 *    Hero-Bild + `tuschePfade`-Strichsignet wie im KosmoData-Dossier
 *    (`DataWorkspace.tsx:1081`).
 *  - `Karteikarte` (`@kosmo/ui`) — dasselbe «geschnittene Ecke + Mono-
 *    Laufnummer»-Kartenmuster, das `DataWorkspace.tsx` für Werkplan-/
 *    Referenzkarten nutzt.
 *
 * Additive `data-testid`s (§11 Sanktionsliste Punkt 6): `ref-karte`,
 * `ref-karte-titel`, `ref-karte-bild`, `ref-karte-kurztext`,
 * `ref-karte-schliessen` — keine Streichung/Umbenennung bestehender.
 */
export function RefKarte({
  entry,
  nr,
  onClose,
}: {
  entry: RefEntry;
  /** [Qn]-Nummer, für die Mono-Laufnummer der Karteikarte (optional — die Karte funktioniert auch ohne). */
  nr?: number;
  onClose?: () => void;
}) {
  const jahr =
    entry.year_start == null
      ? '—'
      : entry.year_start < 0
        ? `${Math.abs(entry.year_start)} v. Chr.`
        : String(entry.year_start);
  const ort = [entry.city, entry.country].filter(Boolean).join(', ');
  const autoren = entry.authors ?? [];
  const themen = (entry.themes ?? []).slice(0, 5);

  return (
    <div data-testid="ref-karte" className="kp-refkarte k-einblenden">
      <Karteikarte {...(nr !== undefined ? { nr } : {})}>
        <div className="kp-refkarte-kopf">
          <div data-testid="ref-karte-bild" className="kp-refkarte-bild">
            <RefHeroBild entry={entry} signetGroesse={44} zeigeQuelle={false} />
          </div>
          <div className="kp-refkarte-text">
            <div className="kp-refkarte-titel" data-testid="ref-karte-titel">
              {entry.title}
            </div>
            <Measure>{[jahr, ort].filter(Boolean).join(' · ')}</Measure>
            {autoren.length > 0 && <div className="kp-refkarte-autoren">{autoren.join(', ')}</div>}
          </div>
          {onClose && (
            <button
              className="k-druck kp-refkarte-schliessen"
              data-testid="ref-karte-schliessen"
              aria-label="Referenzkarte schliessen"
              onClick={onClose}
            >
              ×
            </button>
          )}
        </div>
        {entry.one_sentence && (
          <div className="kp-refkarte-kurztext" data-testid="ref-karte-kurztext">
            {entry.one_sentence}
          </div>
        )}
        {themen.length > 0 && (
          <div className="kp-refkarte-themen">
            {themen.map((t) => (
              <Badge key={t} hue={moduleHue.data}>
                {t}
              </Badge>
            ))}
          </div>
        )}
      </Karteikarte>
    </div>
  );
}
