import { useMemo, useState } from 'react';
import {
  MANGEL_GEWERK_VORSCHLAEGE,
  deriveAbnahmeprotokoll,
  abnahmeprotokollSvg,
  ABNAHME_HINWEIS,
  siaPhaseLabel,
  type Mangel,
} from '@kosmo/kernel';
import { Badge, Hairline, Karteikarte, KButton, KIcon, KInput, KPanelZweiStufen, meldeFehler } from '@kosmo/ui';
import { useProject } from '../../state/project-store';
import { stufeUmschalten, useDockZustand } from '../../state/dock-zustand';
import './design-panels.css';

/**
 * Mängel-Panel — Abschlussphase «Gebäudeabnahme» (v0.6.3,
 * `docs/V063-VOLLPROJEKT-KONZEPT.md` Abschnitt 4, Lücken-Batch 5,
 * Owner-Hauptaufgabe K22): erfassen, Status umschalten, Abnahmeprotokoll
 * exportieren — gleiche Panel-Anordnung wie KV/Bauablauf (links neben dem
 * Plan), derselbe Ehrlichkeits-Grundsatz bleibt permanent sichtbar.
 *
 * AUSDRÜCKLICH kein rechtsgültiges Abnahmeprotokoll: `ABNAHME_HINWEIS` steht
 * hier UND im Export-SVG, nicht nur beim Export.
 *
 * v0.8.1 Welle 4 / Paket P5c (Zwei-Stufen-Rollout, `docs/V081-SPEZ.md`
 * §2.4) — migriert auf `KPanelZweiStufen`: Kernkennzahl ist die Zeilenzahl
 * («N Einträge», §2.2 Tabellen-Rezept). EIN Tab (bewusst kein Liste/Erfassen-
 * Split, s. Abschlussbericht P5c): `e2e/maengel.spec.ts` füllt das Erfassen-
 * Formular UND prüft `maengel-liste`/den `dp-meta`-Text im SELBEN Zug, ohne
 * einen Tab-Wechsel — ein echter Zwei-Tab-Schnitt (Formular getrennt von der
 * Liste) hätte diesen bestehenden, unveränderten Vertrag zerschnitten. Die
 * alte Badge («Mängel») entfällt (der neue Kopf trägt den Titel bereits),
 * Export-/Schliessen-Knopf bleiben als eigene, schlanke Kopfzeile VOR
 * `KPanelZweiStufen` (Doppel-Chrome-Bestandsschutz wie `DockPanel.tsx`
 * dokumentiert — die testids/aria-labels bleiben byte-gleich).
 */

function heute(): string {
  return new Date().toLocaleDateString('de-CH');
}

export function MaengelPanel({ onClose }: { onClose: () => void }) {
  const revision = useProject((s) => s.revision);
  const runCommand = useProject((s) => s.runCommand);
  const doc = useProject.getState().doc;

  const maengel = useMemo(
    () => doc.byKind<Mangel>('mangel'),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [revision],
  );
  const protokoll = useMemo(
    () => deriveAbnahmeprotokoll(doc),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [revision],
  );

  const [ort, setOrt] = useState('');
  const [beschreibung, setBeschreibung] = useState('');
  const [gewerk, setGewerk] = useState('');
  const [frist, setFrist] = useState('');

  const bereitZumErfassen = ort.trim().length > 0 && beschreibung.trim().length > 0 && gewerk.trim().length > 0;

  const modus = useDockZustand((s) => s.modus);
  const layouts = useDockZustand((s) => s.layouts);
  const panelOverrideSetzen = useDockZustand((s) => s.panelOverrideSetzen);
  const stufeRoh = layouts[`${modus}:design`]?.panels['maengelOffen']?.stufe;
  const stufe = stufeRoh ?? 'offen';

  const erfassen = () => {
    if (!bereitZumErfassen) return;
    try {
      runCommand('design.mangelErfassen', {
        ort: ort.trim(),
        beschreibung: beschreibung.trim(),
        gewerk: gewerk.trim(),
        erfasstAm: heute(),
        ...(frist.trim() ? { frist: frist.trim() } : {}),
      });
      setOrt('');
      setBeschreibung('');
      setGewerk('');
      setFrist('');
    } catch (err) {
      meldeFehler(err);
    }
  };

  const statusUmschalten = (m: Mangel) => {
    try {
      runCommand('design.mangelStatusSetzen', {
        mangelId: m.id,
        status: m.status === 'offen' ? 'behoben' : 'offen',
        ...(m.status === 'offen' ? { behobenAm: heute() } : {}),
      });
    } catch (err) {
      meldeFehler(err);
    }
  };

  const loeschen = (m: Mangel) => {
    try {
      runCommand('design.mangelLoeschen', { mangelId: m.id });
    } catch (err) {
      meldeFehler(err);
    }
  };

  const exportSvg = () => {
    const svg = abnahmeprotokollSvg(protokoll, {
      ...(doc.settings.projectName ? { titel: doc.settings.projectName } : {}),
      datum: heute(),
      siaPhase: doc.settings.siaPhase,
    });
    const blob = new Blob([svg], { type: 'image/svg+xml' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'abnahmeprotokoll.svg';
    a.click();
    URL.revokeObjectURL(a.href);
  };

  return (
    <div data-testid="maengel-panel" className="dp-dialog">
      {/* Gate-Nachtrag (P5c): die Action-Row rendert NUR in Stufe 'offen' —
          `KPanelZweiStufen`s Kopf muss in Stufe 'kompakt' das ERSTE sichtbar
          gemalte Element im Panel-Inhalt sein (kein Vorlauf davor), sonst
          landet der Kopf unterhalb des vom Solver zugeteilten, kleinen
          Kompakt-Rechtecks. Der äussere DockPanel-Kopf trägt ohnehin schon
          einen eigenen Schliessen-Knopf (Doppel-Chrome), der bleibt auch in
          Stufe 'kompakt' erreichbar. */}
      {stufe === 'offen' && (
        <div className="dp-kopf">
          <div className="dp-fuell" />
          <KButton size="sm" tone="ghost" onClick={exportSvg} data-testid="maengel-protokoll">
            Abnahmeprotokoll (SVG)
          </KButton>
          <KButton size="sm" tone="ghost" onClick={onClose} aria-label="Schliessen">
            <KIcon name="schliessen" size={14} />
          </KButton>
        </div>
      )}

      <KPanelZweiStufen
        data-testid="maengel-panel-koerper"
        titel="Mängel"
        kernkennzahl={`${maengel.length} Einträge`}
        stufe={stufe}
        onStufeUmschalten={() => panelOverrideSetzen('design', 'maengelOffen', { stufe: stufeUmschalten(stufeRoh) })}
        aktiverTab="uebersicht"
        onTabWechseln={() => {}}
        tabs={[
          {
            id: 'uebersicht',
            label: 'Übersicht',
            inhalt: (
              <div className="mg-koerper">
                <div data-testid="maengel-hinweis" className="dp-hinweis">
                  {ABNAHME_HINWEIS}
                </div>

                <div className="dp-meta">
                  {protokoll.anzahlOffen} offen / {protokoll.anzahlBehoben} behoben ({protokoll.anzahlTotal} total)
                  {' · '}
                  {siaPhaseLabel(doc.settings.siaPhase)}
                </div>

                <Hairline />

                <div data-testid="maengel-form" className="dp-spalte">
                  <div className="k-titel dp-titel-block">Mangel erfassen</div>
                  <div className="mg-formreihe">
                    <KInput
                      size="sm"
                      data-testid="maengel-ort"
                      placeholder="Ort, z.B. «Bad 2.OG»"
                      value={ort}
                      onChange={(e) => setOrt(e.target.value)}
                      className="mg-feld-ort"
                    />
                    <KInput
                      size="sm"
                      data-testid="maengel-gewerk"
                      placeholder="Gewerk"
                      list="maengel-gewerk-vorschlaege"
                      value={gewerk}
                      onChange={(e) => setGewerk(e.target.value)}
                      className="mg-feld-gewerk"
                    />
                    <datalist id="maengel-gewerk-vorschlaege">
                      {MANGEL_GEWERK_VORSCHLAEGE.map((g) => (
                        <option key={g} value={g} />
                      ))}
                    </datalist>
                    <KInput
                      size="sm"
                      data-testid="maengel-frist"
                      placeholder="Frist (optional)"
                      value={frist}
                      onChange={(e) => setFrist(e.target.value)}
                      className="mg-feld-frist"
                    />
                  </div>
                  <textarea
                    data-testid="maengel-beschreibung"
                    placeholder="Beschreibung"
                    value={beschreibung}
                    onChange={(e) => setBeschreibung(e.target.value)}
                    rows={2}
                    className="k-input k-input--sm mg-beschreibung"
                  />
                  <KButton
                    size="sm"
                    tone="quiet"
                    data-testid="maengel-erfassen"
                    onClick={erfassen}
                    disabled={!bereitZumErfassen}
                  >
                    Mangel erfassen
                  </KButton>
                </div>

                <Hairline />

                {maengel.length === 0 ? (
                  <div data-testid="maengel-leer" className="dp-leer">
                    Noch keine Mängel erfasst — die Liste bleibt leer, bis die Schlussbegehung beginnt.
                  </div>
                ) : (
                  <div data-testid="maengel-liste" className="dp-spalte">
                    {maengel.map((m, i) => (
                      <Karteikarte key={m.id} nr={i + 1} data-testid={`maengel-zeile-${m.id}`}>
                        <div className="mg-zeile">
                          <div className="dp-reihe">
                            <span className="mg-ort">{m.ort}</span>
                            <Badge hue={m.status === 'behoben' ? 'var(--k-success)' : 'var(--k-warning)'}>{m.gewerk}</Badge>
                            <div className="dp-fuell" />
                            <KButton
                              size="sm"
                              tone="quiet"
                              data-testid={`maengel-status-${m.id}`}
                              onClick={() => statusUmschalten(m)}
                            >
                              {m.status === 'offen' ? 'Als behoben markieren' : 'Wieder öffnen'}
                            </KButton>
                            <KButton
                              size="sm"
                              tone="ghost"
                              aria-label="Mangel löschen"
                              data-testid={`maengel-loeschen-${m.id}`}
                              onClick={() => loeschen(m)}
                            >
                              <KIcon name="schliessen" size={14} />
                            </KButton>
                          </div>
                          <span className="mg-beschreibungstext">{m.beschreibung}</span>
                          <span className="dp-fussnote">
                            {m.status === 'behoben' ? `Behoben ${m.behobenAm ?? ''}` : `Erfasst ${m.erfasstAm}`}
                            {m.frist ? ` · Frist ${m.frist}` : ''}
                          </span>
                        </div>
                      </Karteikarte>
                    ))}
                  </div>
                )}

                <Hairline />

                <span className="dp-fussnote">
                  Nur ein interner Anstoss zur Schlussbegehung, kein rechtsgültiges Abnahmeprotokoll — die reale
                  Abnahme (Bauherr, Architekt, Unternehmer vor Ort) bleibt Sache der Parteien (SIA 118).
                </span>
              </div>
            ),
          },
        ]}
      />
    </div>
  );
}
