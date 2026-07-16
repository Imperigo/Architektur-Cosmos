import { useMemo, useState } from 'react';
import { LearningJournal } from '@kosmo/ai';
import { Badge, Hairline, Karteikarte, KTabs, KToolbar, Measure, Messrahmen, type KTabItem } from '@kosmo/ui';
import { DiagnosePanel } from '../../shell/Diagnose';
import { journalStore } from '../../state/journal-store';
import { entscheidFarbe, RADAR_BEREICHE, RADAR_STAND, TECH_RADAR } from './tech-radar';
import './doc.css';

/**
 * KosmoDoc — der Projektdoktor als eigenes Modul (Owner-Q24, Vision Persona 3):
 * Selbstdiagnose, Hilfe (Werkzeug-Wissen der App selbst) und Berichte
 * (Lernjournal — echte Daten, keine Attrappen).
 *
 * v0.8.0B / W8c-A (Spez §2/§3, Owner-Entscheid 16.07. «Scope-Blindpunkt jetzt
 * nachziehen»): reiner Visual-Umbau auf `doc.css` (Muster `publish.css`/
 * `data.css`) — Inline-Styles 33→<5 (Rest: Modul-Hue-Carrier `--_hue`).
 * **Signal-Audit:** KosmoDoc ist reine Diagnose/Lese-Station ohne
 * datenverändernde Aktion — bewusst KEINE gefüllte Signal-Fläche (Gesetz 1
 * verlangt eine Primäraktion nur, wo eine existiert).
 *
 * v0.8.1 / P1 (Owner-Entscheid 16.07.2026, `docs/V081-SPEZ.md` §4.1 Entscheid
 * 4/C-4, «Doc eigener Hue»): der Modul-Hue-Carrier `--_hue` (Stationskopf-
 * Rahmen, Badge, Tech-Radar-Karten, Lernjournal-Rahmen) bezog bis hierhin
 * `moduleHue.draw` — optisch nicht von KosmoDraw unterscheidbar (ehrlich
 * benannter Bestand, s. `V-NAECHSTE-KANDIDATEN.md` A). Jetzt die neue,
 * eigene Rolle `--k-rolle-doc` (`packages/kosmo-ui/src/aura.css`, additiv,
 * beide Themes) — Doc ist damit sichtbar von draw abgesetzt. Reine
 * Farbquellen-Änderung, keine Struktur-/Logik-/testid-Änderung.
 */

type Tab = 'diagnose' | 'hilfe' | 'berichte' | 'radar';

interface HilfeThema {
  titel: string;
  punkte: string[];
}

const HILFE: HilfeThema[] = [
  {
    titel: 'Zeichnen in KosmoDesign',
    punkte: [
      'Werkzeug wählen (Wand/Volumen/Zone/Dach/Treppe), im Grundriss klicken — Shift-Klick beendet eine Kette, Esc bricht ab.',
      'Aufbau-Auswahl neben den Werkzeugen bestimmt den Wandaufbau (Katalog: KosmoData → Bauteilkatalog → «Übernehmen»).',
      'Fenster/Türen: Wand anklicken (Werkzeug Auswahl), im Inspector Öffnung setzen.',
      'Rückgängig/Wiederholen jederzeit — auch für Kosmo-Vorschläge und Volumenstudien (eine Gruppe = ein Schritt).',
    ],
  },
  {
    titel: 'Ansichten & Pläne',
    punkte: [
      '3D · 3D|Plan · 4er · Grundriss — alle Ansichten leben auf demselben Modell.',
      'Schnitt: Werkzeug «Schnitt», zwei Punkte klicken; die Ansicht Süd entsteht automatisch aus dem Modell.',
      'Ansichten und Schnitte rechnen Hidden-Line (verdeckte Kanten verschwinden).',
      'PDF/SVG/IFC/DXF über die Toolbar; ganze Plansätze in KosmoPublish.',
    ],
  },
  {
    titel: 'Kosmo (Sprache & Chat)',
    punkte: [
      'Jeder Vorschlag kommt als Karte — nichts ändert das Modell ohne dein «Übernehmen».',
      'Mikrofon = Push-to-Talk über die HomeStation-Bridge (Whisper); Zahnrad = Modell/Provider.',
      '👍/👎 unter Kosmo-Antworten füttert das Lernjournal (Berichte-Tab).',
      '⌘K öffnet die Befehlspalette — jedes Modul, jede Aktion, auch Akzent/Thema.',
    ],
  },
  {
    titel: 'Wettbewerbs-Workflow',
    punkte: [
      '«Liste» in KosmoDesign = Berechnungsliste: Raumprogramm erfassen, Zonen mit Wohnungstyp zeichnen, Δ Max und Tie-out leben mit.',
      '«Varianten» erzeugt Volumenstudien in der Parzelle (letzte Zone = Parzelle).',
      '«☀ Sonne» = Schattenstudie (Datum/Uhrzeit, Innerschweiz); Checks im Kennzahlen-Panel.',
      '«Draw» = Modellbaum mit IFC-Identität + Mengenauszug.',
    ],
  },
  {
    titel: 'Abnahme & HomeStation',
    punkte: [
      'Das volle Abnahme-Drehbuch liegt im Repo: kosmo-orbit/docs/ABNAHME-DREHBUCH.md.',
      'Bridge-URL in KosmoVis eintragen; Diagnose (erster Tab) sagt konkret, was fehlt.',
      'Ohne HomeStation laufen Demo-Modus (Kosmo), lokale Pläne/Exporte und der ganze Wettbewerbs-Workflow.',
    ],
  },
];

const TAB_ITEMS: readonly KTabItem[] = [
  { id: 'diagnose', label: 'Diagnose', testid: 'doc-tab-diagnose' },
  { id: 'hilfe', label: 'Hilfe', testid: 'doc-tab-hilfe' },
  { id: 'berichte', label: 'Berichte', testid: 'doc-tab-berichte' },
  { id: 'radar', label: 'Tech-Radar', testid: 'doc-tab-radar' },
];

export function DocWorkspace() {
  const [tab, setTab] = useState<Tab>('diagnose');
  const journal = useMemo(() => new LearningJournal(journalStore()), []);
  const eintraege = journal.all;
  const gut = eintraege.filter((e) => e.sentiment === 'gut').length;

  return (
    <div className="doc-viewport">
      <div className="doc-content">
        {/* Kosmos-Kopf — reine Kopf-/Rahmen-Optik (Glass + Modul-Tönung),
            Inhalt/Testids/Logik der Werkzeugleiste unverändert. */}
        <div className="k-glass doc-kopf" style={{ ['--_hue' as string]: 'var(--k-rolle-doc)' }}>
          <KToolbar data-testid="doc-werkzeugleiste" className="doc-kopf-leiste">
            <Badge hue="var(--k-rolle-doc)">KosmoDoc</Badge>
            <span className="doc-kopf-satz">
              Der Projektdoktor — Diagnose, Hilfe, Berichte.
            </span>
            <div className="doc-kopf-spacer" />
            <KTabs items={TAB_ITEMS} aktiv={tab} onChange={(id) => setTab(id as Tab)} size="sm" />
          </KToolbar>
        </div>
        <Hairline />

        {tab === 'diagnose' && (
          <div className="doc-tab-inhalt">
            <DiagnosePanel />
            <span className="doc-diagnose-hinweis">
              Prüft Kern, Ableitung, Kosmo-LLM, Bridge, Wissensbasis und Speicher — mit konkretem
              Befund statt grüner Lampe.
            </span>
          </div>
        )}

        {tab === 'hilfe' && (
          <div className="doc-tab-inhalt">
            {HILFE.map((h, i) => (
              <Karteikarte key={h.titel} nr={i + 1}>
                <div className="doc-hilfe-karte">
                  <div className="doc-hilfe-titel">{h.titel}</div>
                  <ul className="doc-hilfe-liste">
                    {h.punkte.map((p) => (
                      <li key={p}>{p}</li>
                    ))}
                  </ul>
                </div>
              </Karteikarte>
            ))}
            <span className="doc-hilfe-fuss">
              Für alles andere: frag Kosmo direkt im Panel rechts — er kennt Modell und Werkzeuge.
            </span>
          </div>
        )}

        {tab === 'radar' && (
          <div className="doc-tab-inhalt doc-radar-tab" data-testid="doc-radar">
            <span className="doc-radar-intro">
              Worauf diese Software technisch steht — und was beobachtet wird. {RADAR_STAND}.
              Posten mit ⚠ stammen aus den Notion-Scans und sind noch nicht selbst verifiziert.
            </span>
            {RADAR_BEREICHE.map((bereich) => (
              <div key={bereich} className="doc-radar-abschnitt">
                <div className="k-titel doc-radar-titel">{bereich}</div>
                {/* Glass + dezente Doc-Hue-Note (40%, passend zum
                    Stationskopf, der die eigene `--k-rolle-doc`-Farbe trägt,
                    s. v0.8.1/P1 Entscheid 4/C-4 unten) je Radar-Zeile —
                    reine Kartenoptik. */}
                {TECH_RADAR.filter((p) => p.bereich === bereich).map((p) => (
                  <div
                    key={p.baustein}
                    className="k-glass doc-radar-posten"
                    data-testid="radar-posten"
                    style={{ ['--_hue' as string]: 'var(--k-rolle-doc)' }}
                  >
                    <span
                      className="doc-radar-entscheid"
                      style={{ color: entscheidFarbe(p.entscheid) }}
                      title={p.unverifiziert ? 'Scan-Aussage — noch nicht selbst verifiziert' : undefined}
                    >
                      {p.entscheid}
                      {p.unverifiziert ? ' ⚠' : ''}
                    </span>
                    <span className="doc-radar-baustein">{p.baustein}</span>
                    <span className="doc-radar-kommentar">
                      {p.kommentar}
                      {p.paket ? (
                        <span className="doc-radar-paket">
                          {' '}· {p.paket}{p.lizenz ? ` (${p.lizenz})` : ''}
                        </span>
                      ) : null}
                    </span>
                  </div>
                ))}
              </div>
            ))}
            <span className="doc-radar-fuss">
              Vollständige, begründete Fassung inkl. Lizenz-Politik: kosmo-orbit/docs/TECH-RADAR.md.
            </span>
          </div>
        )}

        {tab === 'berichte' && (
          // Glass-Rahmen + dezente Doc-Hue-Note (40%, passend zum
          // Stationskopf) — die einzelnen Karteikarte-Einträge behalten ihre
          // eigene Kartenoptik unangetastet.
          <div
            className="k-glass doc-berichte"
            style={{ ['--_hue' as string]: 'var(--k-rolle-doc)' }}
            data-testid="doc-berichte"
          >
            <div className="doc-berichte-kopf">
              <span className="k-titel doc-berichte-titel">Lernjournal</span>
              <Measure>{eintraege.length} Einträge</Measure>
              {/* `Measure` (kosmo-ui) nimmt kein `className` — die Farbe
                  erbt darum über einen klassenbasierten Wrapper. */}
              <span className="doc-berichte-gut"><Measure>{gut} 👍</Measure></span>
              <span className="doc-berichte-schlecht"><Measure>{eintraege.length - gut} 👎</Measure></span>
            </div>
            {eintraege.length === 0 ? (
              <Messrahmen
                height={180}
                caption="Noch keine Einträge — 👍/👎 unter Kosmo-Antworten füttert das Journal (Q8: daraus wird der LoRA-Trainingssatz)"
              />
            ) : (
              <div className="doc-berichte-liste">
                {[...eintraege].reverse().slice(0, 12).map((e, i) => (
                  <Karteikarte key={`${e.ts}-${i}`}>
                    <div className="doc-berichte-eintrag">
                      <span>{e.sentiment === 'gut' ? '👍' : '👎'}</span>
                      <span className="doc-berichte-eintrag-text">
                        {e.context}
                        {e.note ? ` — «${e.note}»` : ''}
                      </span>
                      <span className="doc-berichte-eintrag-zeit">
                        {e.ts.slice(0, 16).replace('T', ' ')}
                      </span>
                    </div>
                  </Karteikarte>
                ))}
              </div>
            )}
            <span className="doc-berichte-fuss">
              Export als JSONL im Kosmo-Panel (Zahnrad) — das Rezept für den Trainings-Zyklus auf der
              HomeStation steht in docs/KOSMOTRAIN.md. Code-Qualität wacht in der CI (Unit + Golden +
              E2E bei jedem Push).
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
