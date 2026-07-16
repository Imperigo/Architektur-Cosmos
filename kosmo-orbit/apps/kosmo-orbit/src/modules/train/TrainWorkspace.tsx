import { useEffect, useMemo, useRef, useState } from 'react';
import { LearningJournal, type Learning } from '@kosmo/ai';
import { Badge, Hairline, Karteikarte, KButton, KIcon, KInput, KToolbar, Measure, Messrahmen, moduleHue } from '@kosmo/ui';
import { listDocs } from '../prepare/knowledge';
import { useQuellen } from '../../state/quellen';
import { journalStore } from '../../state/journal-store';
import './train.css';

/**
 * KosmoTrain — das Lernprogramm als Oberfläche (Q8, Vision Persona 4):
 * Lernstand (was gesammelt ist), Kuration (was ins Training darf) und
 * das Trainingspaket (JSONL + Rezept). Das eigentliche LoRA-Training
 * läuft auf der HomeStation (docs/KOSMOTRAIN.md) — hier wird der
 * Datensatz gepflegt, ehrlich und ohne Attrappen.
 *
 * v0.8.0B / W8c-A (Spez §2/§3, Owner-Entscheid 16.07. «Scope-Blindpunkt jetzt
 * nachziehen»): reiner Visual-Umbau auf `train.css` (Muster `publish.css`/
 * `data.css`) — Inline-Styles 20→<5 (Rest: Modul-Hue-Carrier `--_hue`).
 * **Signal-Audit:** «JSONL exportieren» war bereits die einzige gefüllte
 * Signal-Fläche (Gesetz 1 schon erfüllt), keine Änderung nötig.
 */

export function TrainWorkspace() {
  const journal = useMemo(() => new LearningJournal(journalStore()), []);
  const [eintraege, setEintraege] = useState<readonly Learning[]>(journal.all);
  const [wissen, setWissen] = useState<{ docs: number } | null>(null);

  useEffect(() => {
    void listDocs().then((d) => setWissen({ docs: d.length }));
  }, []);

  // Quellensprung: von Kosmo zitierten Journal-Eintrag markieren
  const ziel = useQuellen((s) => s.ziel);
  const zielSeq = useQuellen((s) => s.zielSeq);
  const sprungRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (ziel?.typ === 'journal') {
      setTimeout(() => sprungRef.current?.scrollIntoView({ block: 'center', behavior: 'smooth' }), 60);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [zielSeq]);

  const gut = eintraege.filter((e) => e.sentiment === 'gut').length;
  const refresh = () => setEintraege([...journal.all]);

  const exportJsonl = () => {
    const url = URL.createObjectURL(new Blob([journal.toJsonl()], { type: 'application/jsonl' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = 'kosmo-lernjournal.jsonl';
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 10_000);
  };

  const REZEPT = [
    'Journal hier kuratieren: schlechte Beispiele schärfen (Notiz!), Unbrauchbares löschen.',
    'JSONL exportieren und auf die HomeStation legen.',
    'Unsloth-QLoRA nach docs/KOSMOTRAIN.md auf der 5090 laufen lassen (~Stunden, nicht Tage).',
    'GGUF exportieren → «ollama create kosmo-buero» → in den Kosmo-Einstellungen als Modell wählen.',
    'Eine Woche arbeiten, wieder kuratieren — der Zyklus macht Kosmo zum Büro-Kosmo.',
  ];

  return (
    <div className="train-viewport">
      <div className="train-content">
        {/* Kosmos-Kopf — reine Kopf-/Rahmen-Optik (Glass + Modul-Tönung),
            Inhalt/Testids/Logik der Werkzeugleiste unverändert. */}
        <div className="k-glass train-kopf" style={{ ['--_hue' as string]: moduleHue.train }}>
          <KToolbar data-testid="train-werkzeugleiste" className="train-kopf-leiste">
            <Badge hue={moduleHue.train}>KosmoTrain</Badge>
            <span className="train-kopf-satz">
              Das System lernt DICH — Journal kuratieren, Trainingspaket schnüren.
            </span>
            <div className="train-kopf-spacer" />
            {/* Dezenter Train-Hue-Glow (35%) auf der Primäraktion — reine
                Optik, Logik/Testid unverändert. */}
            <KButton
              size="sm"
              tone="accent"
              onClick={exportJsonl}
              data-testid="train-export"
              disabled={eintraege.length === 0}
              className="train-export-knopf"
            >
              JSONL exportieren
            </KButton>
          </KToolbar>
        </div>
        <Hairline />

        {/* Lernstand — Glass + dezente Train-Hue-Note (40%). */}
        <div className="k-glass train-stand" style={{ ['--_hue' as string]: moduleHue.train }} data-testid="train-stand">
          <span className="k-titel train-stand-titel">Lernstand</span>
          <Measure>{eintraege.length} Journal-Einträge</Measure>
          {/* `Measure` (kosmo-ui) nimmt kein `className` — die Farbe erbt
              darum über einen klassenbasierten Wrapper. */}
          <span className="train-stand-gut"><Measure>{gut} 👍</Measure></span>
          <span className="train-stand-schlecht"><Measure>{eintraege.length - gut} 👎</Measure></span>
          <Measure>{wissen ? `${wissen.docs} Grundlagen-Dokumente` : '… Wissensbasis'}</Measure>
        </div>

        {/* Kuration */}
        {eintraege.length === 0 ? (
          <Messrahmen
            height={180}
            caption="Noch nichts zu kuratieren — 👍/👎 unter Kosmo-Antworten sammelt Beispiele"
          />
        ) : (
          // Glass-Rahmen + dezente Train-Hue-Note (40%) um die Kuration-
          // Liste — die einzelnen Karteikarte-Einträge behalten ihre eigene
          // (geschnittene) Kartenoptik unangetastet.
          <div
            className="k-glass train-kuration"
            style={{ ['--_hue' as string]: moduleHue.train }}
            data-testid="train-kuration"
          >
            {[...eintraege].reverse().map((e) => {
              const zitiert = ziel?.typ === 'journal' && ziel.ts === e.ts;
              return (
              <div
                key={e.ts}
                ref={zitiert ? sprungRef : undefined}
                {...(zitiert ? { 'data-testid': 'quelle-sprung-journal' } : {})}
                className={zitiert ? 'train-kuration-eintrag--zitiert' : undefined}
              >
              <Karteikarte>
                <div className="train-kuration-zeile">
                  <div className="train-kuration-kopf">
                    <span>{e.sentiment === 'gut' ? '👍' : '👎'}</span>
                    <span className="train-kuration-text">{e.context}</span>
                    <span className="train-kuration-zeit">
                      {e.ts.slice(0, 16).replace('T', ' ')}
                    </span>
                    <KButton
                      size="sm"
                      tone="ghost"
                      aria-label="Eintrag löschen"
                      onClick={() => {
                        journal.entfernen(e.ts);
                        refresh();
                      }}
                    >
                      <KIcon name="schliessen" size={14} title="Eintrag löschen" />
                    </KButton>
                  </div>
                  <KInput
                    size="sm"
                    defaultValue={e.note ?? ''}
                    placeholder="Notiz schärfen — sie ist der Trainings-Kern (z.B. «nie Fenster unter 900 Brüstung vorschlagen»)"
                    onBlur={(ev) => {
                      if (ev.target.value !== (e.note ?? '')) {
                        journal.notieren(e.ts, ev.target.value);
                        refresh();
                      }
                    }}
                  />
                </div>
              </Karteikarte>
              </div>
              );
            })}
          </div>
        )}

        <Hairline />

        {/* Trainings-Zyklus */}
        <div className="train-zyklus">
          <span className="k-titel train-zyklus-titel">Trainings-Zyklus (HomeStation)</span>
          {REZEPT.map((r, i) => (
            <Karteikarte key={i} nr={i + 1}>
              <span className="train-zyklus-text">{r}</span>
            </Karteikarte>
          ))}
          <span className="train-zyklus-fuss">
            Ehrlich: Schritte 3–5 brauchen die 5090 — das volle Rezept steht in docs/KOSMOTRAIN.md.
            Hier entsteht der Datensatz; trainiert wird zuhause.
          </span>
        </div>
      </div>
    </div>
  );
}
