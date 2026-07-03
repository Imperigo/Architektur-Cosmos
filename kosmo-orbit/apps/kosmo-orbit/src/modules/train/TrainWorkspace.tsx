import { useEffect, useMemo, useRef, useState } from 'react';
import { LearningJournal, localStorageMemory, type Learning } from '@kosmo/ai';
import { Badge, Hairline, Karteikarte, KButton, Measure, Messrahmen, moduleHue } from '@kosmo/ui';
import { listDocs } from '../prepare/knowledge';
import { useQuellen } from '../../state/quellen';

/**
 * KosmoTrain — das Lernprogramm als Oberfläche (Q8, Vision Persona 4):
 * Lernstand (was gesammelt ist), Kuration (was ins Training darf) und
 * das Trainingspaket (JSONL + Rezept). Das eigentliche LoRA-Training
 * läuft auf der HomeStation (docs/KOSMOTRAIN.md) — hier wird der
 * Datensatz gepflegt, ehrlich und ohne Attrappen.
 */

export function TrainWorkspace() {
  const journal = useMemo(() => new LearningJournal(localStorageMemory()), []);
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
    <div style={{ position: 'absolute', inset: 0, overflow: 'auto' }}>
      <div style={{ maxWidth: 860, margin: '0 auto', padding: '20px 24px', display: 'grid', gap: 14 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <Badge hue={moduleHue.train}>KosmoTrain</Badge>
          <span style={{ color: 'var(--k-ink-soft)', fontSize: 13 }}>
            Das System lernt DICH — Journal kuratieren, Trainingspaket schnüren.
          </span>
          <div style={{ flex: 1 }} />
          <KButton size="sm" tone="accent" onClick={exportJsonl} data-testid="train-export" disabled={eintraege.length === 0}>
            JSONL exportieren
          </KButton>
        </div>
        <Hairline />

        {/* Lernstand */}
        <div style={{ display: 'flex', gap: 20, alignItems: 'baseline', flexWrap: 'wrap' }} data-testid="train-stand">
          <span className="k-titel" style={{ fontSize: 14 }}>Lernstand</span>
          <Measure>{eintraege.length} Journal-Einträge</Measure>
          <Measure style={{ color: 'var(--k-success)' }}>{gut} 👍</Measure>
          <Measure style={{ color: 'var(--k-danger)' }}>{eintraege.length - gut} 👎</Measure>
          <Measure>{wissen ? `${wissen.docs} Grundlagen-Dokumente` : '… Wissensbasis'}</Measure>
        </div>

        {/* Kuration */}
        {eintraege.length === 0 ? (
          <Messrahmen
            height={180}
            caption="Noch nichts zu kuratieren — 👍/👎 unter Kosmo-Antworten sammelt Beispiele"
          />
        ) : (
          <div style={{ display: 'grid', gap: 6 }} data-testid="train-kuration">
            {[...eintraege].reverse().map((e) => {
              const zitiert = ziel?.typ === 'journal' && ziel.ts === e.ts;
              return (
              <div
                key={e.ts}
                ref={zitiert ? sprungRef : undefined}
                {...(zitiert ? { 'data-testid': 'quelle-sprung-journal' } : {})}
                style={zitiert ? { outline: '2px solid var(--k-accent)', borderRadius: 'var(--k-radius-sm)' } : undefined}
              >
              <Karteikarte>
                <div style={{ display: 'grid', gap: 5, fontSize: 12.5 }}>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'baseline' }}>
                    <span>{e.sentiment === 'gut' ? '👍' : '👎'}</span>
                    <span style={{ flex: 1, color: 'var(--k-ink-soft)', lineHeight: 1.45 }}>{e.context}</span>
                    <span style={{ fontFamily: 'var(--k-font-mono)', fontSize: 10.5, color: 'var(--k-ink-faint)' }}>
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
                      ✕
                    </KButton>
                  </div>
                  <input
                    defaultValue={e.note ?? ''}
                    placeholder="Notiz schärfen — sie ist der Trainings-Kern (z.B. «nie Fenster unter 900 Brüstung vorschlagen»)"
                    onBlur={(ev) => {
                      if (ev.target.value !== (e.note ?? '')) {
                        journal.notieren(e.ts, ev.target.value);
                        refresh();
                      }
                    }}
                    style={{
                      padding: '4px 8px',
                      borderRadius: 'var(--k-radius-sm)',
                      border: '1px solid var(--k-line)',
                      background: 'var(--k-surface)',
                      fontSize: 12,
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
        <div style={{ display: 'grid', gap: 8 }}>
          <span className="k-titel" style={{ fontSize: 14 }}>Trainings-Zyklus (HomeStation)</span>
          {REZEPT.map((r, i) => (
            <Karteikarte key={i} nr={i + 1}>
              <span style={{ fontSize: 12.5, color: 'var(--k-ink-soft)', lineHeight: 1.5 }}>{r}</span>
            </Karteikarte>
          ))}
          <span style={{ color: 'var(--k-ink-faint)', fontSize: 11.5 }}>
            Ehrlich: Schritte 3–5 brauchen die 5090 — das volle Rezept steht in docs/KOSMOTRAIN.md.
            Hier entsteht der Datensatz; trainiert wird zuhause.
          </span>
        </div>
      </div>
    </div>
  );
}
