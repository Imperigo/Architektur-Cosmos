import { useEffect, useMemo, useRef, useState } from 'react';
import { LearningJournal, type Learning } from '@kosmo/ai';
import { Badge, Hairline, Karteikarte, KButton, KIcon, KInput, KToolbar, Measure, Messrahmen, moduleHue } from '@kosmo/ui';
import { listDocs } from '../prepare/knowledge';
import { useQuellen } from '../../state/quellen';
import { journalStore } from '../../state/journal-store';

/**
 * KosmoTrain — das Lernprogramm als Oberfläche (Q8, Vision Persona 4):
 * Lernstand (was gesammelt ist), Kuration (was ins Training darf) und
 * das Trainingspaket (JSONL + Rezept). Das eigentliche LoRA-Training
 * läuft auf der HomeStation (docs/KOSMOTRAIN.md) — hier wird der
 * Datensatz gepflegt, ehrlich und ohne Attrappen.
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
    <div style={{ position: 'absolute', inset: 0, overflow: 'auto' }}>
      <div style={{ maxWidth: 860, margin: '0 auto', padding: 'var(--k-s5) var(--k-s6)', display: 'grid', gap: 'var(--k-s4)' }}>
        {/* v0.7.7 Stream C1: Kosmos-Kopf — reine Kopf-/Rahmen-Optik (Glass +
            Modul-Tönung, analog dem additiven Kosmos-Token-Fundament aus
            v0.7.6), Inhalt/Testids/Logik der Werkzeugleiste unverändert. */}
        <div className="k-glass" style={{ borderTopColor: `color-mix(in srgb, ${moduleHue.train} 65%, var(--k-glass-stroke, var(--k-line)))`, borderTopWidth: 2 }}>
          <KToolbar data-testid="train-werkzeugleiste" style={{ flexWrap: 'wrap', background: 'transparent', borderBottom: 'none' }}>
            <Badge hue={moduleHue.train}>KosmoTrain</Badge>
            <span style={{ color: 'var(--k-ink-soft)', fontSize: 'var(--k-t-md)' }}>
              Das System lernt DICH — Journal kuratieren, Trainingspaket schnüren.
            </span>
            <div style={{ flex: 1 }} />
            <KButton size="sm" tone="accent" onClick={exportJsonl} data-testid="train-export" disabled={eintraege.length === 0}>
              JSONL exportieren
            </KButton>
          </KToolbar>
        </div>
        <Hairline />

        {/* Lernstand */}
        <div style={{ display: 'flex', gap: 'var(--k-s5)', alignItems: 'baseline', flexWrap: 'wrap' }} data-testid="train-stand">
          <span className="k-titel" style={{ fontSize: 'var(--k-t-lg)' }}>Lernstand</span>
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
          <div style={{ display: 'grid', gap: 'var(--k-s2)' }} data-testid="train-kuration">
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
                <div style={{ display: 'grid', gap: 'var(--k-s2)', fontSize: 'var(--k-t-sm)' }}>
                  <div style={{ display: 'flex', gap: 'var(--k-s3)', alignItems: 'baseline' }}>
                    <span>{e.sentiment === 'gut' ? '👍' : '👎'}</span>
                    <span style={{ flex: 1, color: 'var(--k-ink-soft)', lineHeight: 1.45 }}>{e.context}</span>
                    <span style={{ fontFamily: 'var(--k-font-mono)', fontSize: 'var(--k-t-xs)', color: 'var(--k-ink-faint)' }}>
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
        <div style={{ display: 'grid', gap: 'var(--k-s3)' }}>
          <span className="k-titel" style={{ fontSize: 'var(--k-t-lg)' }}>Trainings-Zyklus (HomeStation)</span>
          {REZEPT.map((r, i) => (
            <Karteikarte key={i} nr={i + 1}>
              <span style={{ fontSize: 'var(--k-t-sm)', color: 'var(--k-ink-soft)', lineHeight: 1.5 }}>{r}</span>
            </Karteikarte>
          ))}
          <span style={{ color: 'var(--k-ink-faint)', fontSize: 'var(--k-t-xs)' }}>
            Ehrlich: Schritte 3–5 brauchen die 5090 — das volle Rezept steht in docs/KOSMOTRAIN.md.
            Hier entsteht der Datensatz; trainiert wird zuhause.
          </span>
        </div>
      </div>
    </div>
  );
}
