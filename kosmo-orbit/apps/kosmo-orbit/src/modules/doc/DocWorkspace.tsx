import { useMemo, useState } from 'react';
import { LearningJournal, localStorageMemory } from '@kosmo/ai';
import { Badge, Hairline, Karteikarte, KButton, Measure, Messrahmen, moduleHue } from '@kosmo/ui';
import { DiagnosePanel } from '../../shell/Diagnose';

/**
 * KosmoDoc — der Projektdoktor als eigenes Modul (Owner-Q24, Vision Persona 3):
 * Selbstdiagnose, Hilfe (Werkzeug-Wissen der App selbst) und Berichte
 * (Lernjournal — echte Daten, keine Attrappen).
 */

type Tab = 'diagnose' | 'hilfe' | 'berichte';

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

export function DocWorkspace() {
  const [tab, setTab] = useState<Tab>('diagnose');
  const journal = useMemo(() => new LearningJournal(localStorageMemory()), []);
  const eintraege = journal.all;
  const gut = eintraege.filter((e) => e.sentiment === 'gut').length;

  return (
    <div style={{ position: 'absolute', inset: 0, overflow: 'auto' }}>
      <div style={{ maxWidth: 860, margin: '0 auto', padding: '20px 24px', display: 'grid', gap: 14 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <Badge hue={moduleHue.draw}>KosmoDoc</Badge>
          <span style={{ color: 'var(--k-ink-soft)', fontSize: 13 }}>
            Der Projektdoktor — Diagnose, Hilfe, Berichte.
          </span>
          <div style={{ flex: 1 }} />
          {(['diagnose', 'hilfe', 'berichte'] as Tab[]).map((t) => (
            <KButton
              key={t}
              size="sm"
              tone={tab === t ? 'accent' : 'ghost'}
              onClick={() => setTab(t)}
              data-testid={`doc-tab-${t}`}
            >
              {t === 'diagnose' ? 'Diagnose' : t === 'hilfe' ? 'Hilfe' : 'Berichte'}
            </KButton>
          ))}
        </div>
        <Hairline />

        {tab === 'diagnose' && (
          <div style={{ display: 'grid', gap: 10 }}>
            <DiagnosePanel />
            <span style={{ color: 'var(--k-ink-faint)', fontSize: 11.5 }}>
              Prüft Kern, Ableitung, Kosmo-LLM, Bridge, Wissensbasis und Speicher — mit konkretem
              Befund statt grüner Lampe.
            </span>
          </div>
        )}

        {tab === 'hilfe' && (
          <div style={{ display: 'grid', gap: 10 }}>
            {HILFE.map((h, i) => (
              <Karteikarte key={h.titel} nr={i + 1}>
                <div style={{ display: 'grid', gap: 6 }}>
                  <div style={{ fontFamily: 'var(--k-font-mono)', fontWeight: 700, fontSize: 13 }}>{h.titel}</div>
                  <ul style={{ margin: 0, paddingLeft: 18, display: 'grid', gap: 4, fontSize: 12.5, color: 'var(--k-ink-soft)', lineHeight: 1.5 }}>
                    {h.punkte.map((p) => (
                      <li key={p}>{p}</li>
                    ))}
                  </ul>
                </div>
              </Karteikarte>
            ))}
            <span style={{ color: 'var(--k-ink-faint)', fontSize: 12 }}>
              Für alles andere: frag Kosmo direkt im Panel rechts — er kennt Modell und Werkzeuge.
            </span>
          </div>
        )}

        {tab === 'berichte' && (
          <div style={{ display: 'grid', gap: 10 }} data-testid="doc-berichte">
            <div style={{ display: 'flex', gap: 18, alignItems: 'baseline' }}>
              <span className="k-titel" style={{ fontSize: 14 }}>Lernjournal</span>
              <Measure>{eintraege.length} Einträge</Measure>
              <Measure style={{ color: 'var(--k-success)' }}>{gut} 👍</Measure>
              <Measure style={{ color: 'var(--k-danger)' }}>{eintraege.length - gut} 👎</Measure>
            </div>
            {eintraege.length === 0 ? (
              <Messrahmen
                height={180}
                caption="Noch keine Einträge — 👍/👎 unter Kosmo-Antworten füttert das Journal (Q8: daraus wird der LoRA-Trainingssatz)"
              />
            ) : (
              <div style={{ display: 'grid', gap: 6 }}>
                {[...eintraege].reverse().slice(0, 12).map((e, i) => (
                  <Karteikarte key={`${e.ts}-${i}`}>
                    <div style={{ display: 'flex', gap: 10, alignItems: 'baseline', fontSize: 12.5 }}>
                      <span>{e.sentiment === 'gut' ? '👍' : '👎'}</span>
                      <span style={{ flex: 1, color: 'var(--k-ink-soft)', lineHeight: 1.45 }}>
                        {e.context}
                        {e.note ? ` — «${e.note}»` : ''}
                      </span>
                      <span style={{ fontFamily: 'var(--k-font-mono)', fontSize: 10.5, color: 'var(--k-ink-faint)' }}>
                        {e.ts.slice(0, 16).replace('T', ' ')}
                      </span>
                    </div>
                  </Karteikarte>
                ))}
              </div>
            )}
            <span style={{ color: 'var(--k-ink-faint)', fontSize: 11.5 }}>
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
