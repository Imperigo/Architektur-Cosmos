import { useMemo, useState } from 'react';
import { Badge, Hairline, Karteikarte, KButton, melde, meldeFehler } from '@kosmo/ui';
import { useProject } from '../../state/project-store';
import './design-panels.css';
import {
  baueKarten,
  commandFuerKarte,
  importBerichtText,
  useUnternehmerplan,
  type UnternehmerKarte,
} from './unternehmerplan';

/**
 * Unternehmerplan-Panel (V1.6 Block C / C4b, C-E4 in
 * `docs/SUBMISSION-KONZEPT.md`) — die Diff-Karten aus dem DXF-Rücklauf des
 * Unternehmers, kompakt wie `RasterPanel.tsx`. Daten-Guard: nur sichtbar,
 * solange der Laufzeit-Store einen geladenen `dxf` trägt (Regel
 * «Laufzeit ≠ Modell» — kein eigener Sichtbarkeits-Zustand nötig, das
 * Vorhandensein der Daten IST der Zustand).
 *
 * Stufe 1 («Übernehmen») läuft — der eiserne Grundsatz — AUSSCHLIESSLICH
 * über `commandFuerKarte` + `runCommand` (Regel R3: derselbe Weg wie ein
 * Klick oder ein bestätigter Kosmo-Vorschlag, `apply-proposal` in
 * `KosmoPanel.tsx`). Findet `commandFuerKarte` keine eindeutige Wand
 * (Doppeldeutigkeit, `findeWandFuerBefund` liefert `null`), wird NICHT
 * geraten: die Karte wird ehrlich auf «manuell» herabgestuft — das Modell
 * bleibt unverändert, der Architekt zeichnet selbst. Stufe 2 hat bewusst
 * keinen Anwenden-Knopf — nur Titel/Detail + Badge «markiert».
 *
 * Nacht v0.6.2 (C5/PDF): ohne geladenen DXF, aber mit einem `pdfHinweis`
 * (der Unternehmer hat ein PDF geschickt, `DesignWorkspace.tsx` hat es
 * erkannt und NICHT geparst), zeigt das Panel statt der Karten den
 * ehrlichen Betriebsarten-Gate-Text (`pdf-hinweis`) — kein Karten-Rendering,
 * keine Attrappe.
 */

type KartenStatus = 'offen' | 'uebernommen' | 'manuell';

export function UnternehmerplanPanel() {
  const dxf = useUnternehmerplan((s) => s.dxf);
  const abgleich = useUnternehmerplan((s) => s.abgleich);
  const dateiname = useUnternehmerplan((s) => s.dateiname);
  const pdfHinweis = useUnternehmerplan((s) => s.pdfHinweis);
  const runCommand = useProject((s) => s.runCommand);
  const doc = useProject((s) => s.doc);
  const [status, setStatus] = useState<Record<string, KartenStatus>>({});

  const karten = useMemo<UnternehmerKarte[]>(() => {
    if (!dxf || !abgleich) return [];
    return baueKarten(abgleich, dxf.bericht);
  }, [dxf, abgleich]);

  // Daten-Guard: ohne geladenen DXF gibt es entweder den ehrlichen
  // PDF-Hinweis oder gar kein Panel.
  if (!dxf || !abgleich) {
    if (!pdfHinweis) return null;
    return (
      <div data-testid="unternehmerplan-panel" className="k-dialog dp-dialog dp-dialog--scroll">
        <div className="dp-kopf">
          <Badge hue="var(--k-mod-design)">Unternehmerplan</Badge>
          <span className="up-dateiname">{pdfHinweis.dateiname}</span>
        </div>
        <span data-testid="pdf-hinweis" className="up-hinweistext">
          {pdfHinweis.text}
        </span>
        {/* K5 (Owner-Rundgang 0.6.2, S. 10): die ausführliche Begründung
            (WARUM keine automatische Analyse möglich ist) steckt nicht mehr
            als Dauer-Textblock im Panel, sondern hinter einem einklappbaren
            «?»-Hinweis — die Kernaussage oben bleibt immer sichtbar. */}
        {pdfHinweis.detail && (
          <details data-testid="pdf-hinweis-mehr">
            <summary className="up-mehr-titel">? Warum keine automatische Analyse</summary>
            <p className="up-mehr-text">{pdfHinweis.detail}</p>
          </details>
        )}
      </div>
    );
  }

  const berichtText = importBerichtText(dxf.bericht, abgleich);

  const uebernehmen = (karte: UnternehmerKarte) => {
    const command = commandFuerKarte(doc, karte);
    if (!command) {
      setStatus((s) => ({ ...s, [karte.id]: 'manuell' }));
      melde(
        `«${karte.titel}» ist nicht eindeutig zuordenbar — bitte manuell übernehmen.`,
        { ton: 'fehler' },
      );
      return;
    }
    try {
      // Derselbe runCommand-Weg wie ein Klick oder `apply-proposal` in
      // KosmoPanel.tsx — atomare Undo-Gruppe, Yjs-Sync, Journal. Nie stilles
      // Überschreiben (C-E4).
      const result = runCommand(command.id, command.params);
      setStatus((s) => ({ ...s, [karte.id]: 'uebernommen' }));
      melde(`«${karte.titel}» übernommen: ${result.summary}.`, { ton: 'erfolg' });
    } catch (err) {
      meldeFehler(err);
    }
  };

  return (
    <div data-testid="unternehmerplan-panel" className="k-dialog dp-dialog dp-dialog--anker">
      <div className="dp-kopf">
        <Badge hue="var(--k-mod-design)">Unternehmerplan</Badge>
        {dateiname && <span className="up-dateiname">{dateiname}</span>}
      </div>

      <span className="up-bericht">{berichtText}</span>

      <Hairline />

      {karten.length === 0 ? (
        <span className="dp-leer">Keine Karten.</span>
      ) : (
        <div className="dp-spalte" data-testid="unternehmerplan-karten">
          {karten.map((karte, i) => {
            const st = status[karte.id] ?? 'offen';
            const zeigeAnwenden = karte.stufe === 1 && st === 'offen';
            return (
              <Karteikarte key={karte.id} nr={i + 1} data-testid={`karte-${karte.id}`}>
                <div className="up-karte-koerper">
                  <div className="up-karte-kopf">
                    <span className="up-karte-titel">{karte.titel}</span>
                    {st === 'uebernommen' ? (
                      <Badge hue="var(--k-success)">übernommen ✓</Badge>
                    ) : st === 'manuell' ? (
                      <Badge hue="var(--k-warning)">manuell</Badge>
                    ) : karte.stufe === 1 ? (
                      <Badge hue="var(--k-info)">Stufe 1</Badge>
                    ) : (
                      <Badge hue="var(--k-ink-faint)">markiert</Badge>
                    )}
                  </div>
                  <span className="dp-fussnote">{karte.detail}</span>
                  {zeigeAnwenden && (
                    <div>
                      <KButton
                        size="sm"
                        tone="accent"
                        data-testid={`karte-anwenden-${karte.id}`}
                        onClick={() => uebernehmen(karte)}
                      >
                        Übernehmen
                      </KButton>
                    </div>
                  )}
                </div>
              </Karteikarte>
            );
          })}
        </div>
      )}
    </div>
  );
}
