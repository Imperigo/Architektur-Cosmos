import { useEffect, useMemo, useRef, useState } from 'react';
import { Badge, Hairline, KButton, OrbitMark, moduleHue } from '@kosmo/ui';
import {
  ChatSession,
  LearningJournal,
  MockProvider,
  OllamaProvider,
  greeting,
  localStorageMemory,
  personas,
  type ChatProvider,
  type Proposal,
} from '@kosmo/ai';
import type { Assembly } from '@kosmo/kernel';
import { useProject } from '../state/project-store';
import { loadReferences } from '../modules/data/DataWorkspace';
import { searchKnowledge } from '../modules/prepare/knowledge';
import { DiagnosePanel } from './Diagnose';

/**
 * KosmoPanel — der ständige Begleiter (Vision: Kosmo ist immer da).
 * Schreibende Vorschläge erscheinen als Karten: Anwenden führt den Command
 * über denselben Weg aus wie ein Handgriff des Architekten (Undo inklusive).
 */

interface Bubble {
  id: number;
  who: 'du' | 'kosmo';
  text: string;
  feedback?: 'gut' | 'schlecht';
}

const journal = new LearningJournal(localStorageMemory());

/** Wettbewerbsdossier (Phase 0) als harter Prompt-Block — Do's/Don'ts zuerst. */
function dossierPromptBlock(): string {
  const dossier = useProject.getState().doc.settings.dossier;
  if (!dossier || dossier.length === 0) return '';
  const zeile = (t: { typ: string; text: string }) =>
    t.typ === 'dont' ? `- NO-GO: ${t.text}` : t.typ === 'do' ? `- GEFORDERT: ${t.text}` : `- FAKT: ${t.text}`;
  const sortiert = [...dossier].sort(
    (a, b) => (a.typ === 'dont' ? 0 : a.typ === 'do' ? 1 : 2) - (b.typ === 'dont' ? 0 : b.typ === 'do' ? 1 : 2),
  );
  return `\n\nWettbewerbsdossier dieses Projekts (bindend):\n${sortiert.slice(0, 20).map(zeile).join('\n')}`;
}

interface PendingCard extends Proposal {
  state: 'offen' | 'angewendet' | 'abgelehnt';
}

interface KosmoSettings {
  provider: 'ollama' | 'mock';
  baseUrl: string;
  model: string;
}

const defaultSettings: KosmoSettings = {
  provider: 'ollama',
  baseUrl: 'http://localhost:11434',
  model: 'qwen3-coder:30b',
};

function loadSettings(): KosmoSettings {
  try {
    const raw = localStorage.getItem('kosmo.llm');
    if (raw) return { ...defaultSettings, ...JSON.parse(raw) };
  } catch {
    /* leer */
  }
  return defaultSettings;
}

/** Kosmo spricht (Owner-Q7): Text → Bridge-/tts → Audio. Still bei Fehlern. */
async function speak(text: string): Promise<void> {
  const bridge = (localStorage.getItem('kosmo.bridge') ?? 'http://localhost:8600').replace(/\/$/, '');
  try {
    const res = await fetch(`${bridge}/tts`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: text.slice(0, 600) }),
    });
    if (!res.ok) throw new Error(String(res.status));
    const url = URL.createObjectURL(await res.blob());
    const audio = new Audio(url);
    audio.onended = () => URL.revokeObjectURL(url);
    await audio.play();
  } catch (err) {
    console.info('Vorlesen nicht möglich (Bridge /tts):', err);
  }
}

export function KosmoPanel({ onClose }: { onClose: () => void }) {
  const [settings, setSettings] = useState<KosmoSettings>(loadSettings);
  const [showSettings, setShowSettings] = useState(false);
  const [ttsOn, setTtsOn] = useState(localStorage.getItem('kosmo.tts') === '1');
  const lastKosmoText = useRef('');
  const ttsRef = useRef(ttsOn);
  ttsRef.current = ttsOn;
  const [bubbles, setBubbles] = useState<Bubble[]>([]);
  const [cards, setCards] = useState<PendingCard[]>([]);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const bubbleSeq = useRef(0);
  const runCommand = useProject((s) => s.runCommand);

  const session = useMemo(() => {
    const provider: ChatProvider =
      settings.provider === 'mock'
        ? new MockProvider()
        : new OllamaProvider({ baseUrl: settings.baseUrl, model: settings.model });
    const { doc } = useProject.getState();
    let currentKosmoBubble = -1;
    const push = (who: Bubble['who'], text: string) => {
      const id = ++bubbleSeq.current;
      setBubbles((b) => [...b, { id, who, text }]);
      return id;
    };
    const s = new ChatSession(
      provider,
      doc,
      {
        onText: (delta) => {
          // Ausserhalb des Updaters akkumulieren — React batcht Updater,
          // onBusy(false) käme sonst vor dem letzten Textstück
          lastKosmoText.current += delta;
          setBubbles((b) => {
            const last = b[b.length - 1];
            if (last && last.who === 'kosmo' && last.id === currentKosmoBubble) {
              return [...b.slice(0, -1), { ...last, text: last.text + delta }];
            }
            currentKosmoBubble = ++bubbleSeq.current;
            return [...b, { id: currentKosmoBubble, who: 'kosmo', text: delta }];
          });
        },
        onProposal: (p) => setCards((c) => [...c, { ...p, state: 'offen' }]),
        onBusy: (v) => {
          setBusy(v);
          if (v) {
            currentKosmoBubble = -1;
            lastKosmoText.current = '';
          } else if (ttsRef.current && lastKosmoText.current.trim()) {
            void speak(lastKosmoText.current);
          }
        },
        onError: (msg) => push('kosmo', `⚠ ${msg}`),
      },
      personas.kosmo.systemPrompt,
      () => {
        const st = useProject.getState();
        const wallAssembly = st.doc
          .byKind<Assembly>('assembly')
          .find((a) => a.target === 'wall');
        return {
          ...(st.activeStoreyId ? { storeyId: st.activeStoreyId } : {}),
          ...(wallAssembly ? { assemblyId: wallAssembly.id } : {}),
        };
      },
      [
        {
          name: 'referenzen_suchen',
          description:
            'Durchsucht KosmoData (Architektur-Referenzbibliothek, 112 kuratierte Bauwerke der Architekturgeschichte) nach Stichwort. Liefert Titel, Jahr, Ort, Architekten, Themen, Material. Nutze es, wenn der Architekt nach Referenzen, Vorbildern oder Vergleichen fragt.',
          parameters: {
            type: 'object',
            properties: {
              suchbegriff: { type: 'string', description: 'z.B. «Beton», «Moschee», «Le Corbusier», «Holz»' },
            },
            required: ['suchbegriff'],
            additionalProperties: false,
          },
          execute: async (args) => {
            const q = String((args as { suchbegriff?: string })?.suchbegriff ?? '').toLowerCase();
            const refs = await loadReferences();
            const hits = refs
              .filter((e) => {
                const hay = [e.title, e.city, e.country, e.style_sector, e.program, ...(e.authors ?? []), ...(e.themes ?? []), ...(e.materials ?? [])]
                  .filter(Boolean)
                  .join(' ')
                  .toLowerCase();
                return hay.includes(q);
              })
              .slice(0, 8);
            if (hits.length === 0) return `Keine Referenz zu «${q}» in KosmoData.`;
            return hits
              .map(
                (e) =>
                  `- ${e.title} (${e.year_start ?? '?'}, ${[e.city, e.country].filter(Boolean).join(', ')}) — ${(e.authors ?? []).join(', ') || 'unbekannt'}; Themen: ${(e.themes ?? []).join(', ')}${e.one_sentence ? ` — ${e.one_sentence}` : ''}`,
              )
              .join('\n');
          },
        },
        {
          name: 'grundlagen_suchen',
          description:
            'Durchsucht die Wissensbasis des Projekts (in KosmoPrepare aufgenommene Grundlagen: Normen-Auszüge, Wettbewerbsprogramme, Baubeschriebe). Liefert die relevantesten Abschnitte mit Quellenangabe. Nutze es, wenn der Architekt nach Vorgaben, Programmen oder Bürowissen fragt.',
          parameters: {
            type: 'object',
            properties: {
              suchbegriff: { type: 'string', description: 'z.B. «Nutzfläche», «Brandschutz Treppenhaus», «Stützenraster»' },
            },
            required: ['suchbegriff'],
            additionalProperties: false,
          },
          execute: async (args) => {
            const q = String((args as { suchbegriff?: string })?.suchbegriff ?? '');
            const hits = await searchKnowledge(q, 4);
            if (hits.length === 0) {
              return `Nichts zu «${q}» in der Wissensbasis. (Grundlagen werden in KosmoPrepare aufgenommen.)`;
            }
            return hits
              .map((h) => `[${h.docName} · Abschnitt ${h.seq + 1}] ${h.text.slice(0, 600)}`)
              .join('\n---\n');
          },
        },
      ],
      journal.toPromptBlock() + dossierPromptBlock(),
    );
    return s;
    // Session bewusst pro Provider-Konfiguration neu
  }, [settings]);

  useEffect(() => {
    const { doc } = useProject.getState();
    const text = greeting(new Date(), doc.settings.projectName, {
      walls: doc.byKind('wall').length,
      storeys: doc.byKind('storey').length,
    });
    setBubbles([{ id: ++bubbleSeq.current, who: 'kosmo', text }]);
  }, []);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [bubbles, cards]);

  const send = () => {
    const text = input.trim();
    if (!text || busy) return;
    setInput('');
    setBubbles((b) => [...b, { id: ++bubbleSeq.current, who: 'du', text }]);
    void session.send(text);
  };

  // KosmoSpeak: Push-to-Talk → Bridge-Whisper (Schweizerdeutsch)
  const [recording, setRecording] = useState(false);
  const recorderRef = useRef<MediaRecorder | null>(null);

  const toggleMic = async () => {
    if (recording) {
      recorderRef.current?.stop();
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const rec = new MediaRecorder(stream);
      const parts: Blob[] = [];
      rec.ondataavailable = (e) => parts.push(e.data);
      rec.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        setRecording(false);
        const audio = new Blob(parts, { type: rec.mimeType });
        const bridge = (localStorage.getItem('kosmo.bridge') ?? 'http://localhost:8600').replace(/\/$/, '');
        try {
          const form = new FormData();
          form.append('audio', audio, 'aufnahme.webm');
          const res = await fetch(`${bridge}/stt`, { method: 'POST', body: form });
          if (!res.ok) throw new Error(`STT ${res.status}`);
          const { text } = (await res.json()) as { text: string };
          if (text) {
            setBubbles((b) => [...b, { id: ++bubbleSeq.current, who: 'du', text: `🎙 ${text}` }]);
            void session.send(text);
          }
        } catch (err) {
          setBubbles((b) => [
            ...b,
            {
              id: ++bubbleSeq.current,
              who: 'kosmo',
              text: `⚠ Speak-to-Kosmo braucht die Bridge (${bridge}/stt): ${err instanceof Error ? err.message : err}`,
            },
          ]);
        }
      };
      recorderRef.current = rec;
      rec.start();
      setRecording(true);
    } catch {
      setBubbles((b) => [
        ...b,
        { id: ++bubbleSeq.current, who: 'kosmo', text: '⚠ Kein Mikrofonzugriff.' },
      ]);
    }
  };

  const applyCard = (card: PendingCard) => {
    try {
      const result = runCommand(card.commandId, card.params, { actor: 'kosmo' });
      setCards((c) => c.map((x) => (x.callId === card.callId ? { ...x, state: 'angewendet' } : x)));
      void session.resolveApplied(card.callId, result.summary);
    } catch (err) {
      setCards((c) => c.map((x) => (x.callId === card.callId ? { ...x, state: 'abgelehnt' } : x)));
      void session.resolveRejected(
        card.callId,
        err instanceof Error ? err.message : 'Ausführung fehlgeschlagen',
      );
    }
  };

  const rejectCard = (card: PendingCard) => {
    setCards((c) => c.map((x) => (x.callId === card.callId ? { ...x, state: 'abgelehnt' } : x)));
    void session.resolveRejected(card.callId);
  };

  return (
    <aside
      data-testid="kosmo-panel"
      style={{
        width: 340,
        display: 'flex',
        flexDirection: 'column',
        borderLeft: '1px solid var(--k-line)',
        background: 'var(--k-surface)',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px' }}>
        <OrbitMark module="kosmo" size={24} />
        <div style={{ fontWeight: 550 }}>Kosmo</div>
        <Badge hue={settings.provider === 'mock' ? 'var(--k-warning)' : moduleHue.kosmo}>
          {settings.provider === 'mock' ? 'Demo' : settings.model}
        </Badge>
        <div style={{ flex: 1 }} />
        <KButton size="sm" tone="ghost" onClick={() => setShowSettings(!showSettings)} aria-label="Einstellungen">
          ⚙
        </KButton>
        <KButton size="sm" tone="ghost" onClick={onClose} aria-label="Schliessen">
          ×
        </KButton>
      </div>
      <Hairline />

      {showSettings && (
        <div style={{ padding: 14, display: 'grid', gap: 8, borderBottom: '1px solid var(--k-line)' }}>
          <label style={{ fontSize: 12, color: 'var(--k-ink-soft)' }}>
            Verbindung
            <select
              value={settings.provider}
              onChange={(e) => {
                const s = { ...settings, provider: e.target.value as KosmoSettings['provider'] };
                setSettings(s);
                localStorage.setItem('kosmo.llm', JSON.stringify(s));
              }}
              style={selectStyle}
            >
              <option value="ollama">Ollama (HomeStation)</option>
              <option value="mock">Demo-Modus (ohne LLM)</option>
            </select>
          </label>
          {settings.provider === 'ollama' && (
            <>
              <label style={{ fontSize: 12, color: 'var(--k-ink-soft)' }}>
                Ollama-URL
                <input
                  value={settings.baseUrl}
                  onChange={(e) => {
                    const s = { ...settings, baseUrl: e.target.value };
                    setSettings(s);
                    localStorage.setItem('kosmo.llm', JSON.stringify(s));
                  }}
                  style={inputStyle}
                />
              </label>
              <label style={{ fontSize: 12, color: 'var(--k-ink-soft)' }}>
                Modell
                <input
                  value={settings.model}
                  onChange={(e) => {
                    const s = { ...settings, model: e.target.value };
                    setSettings(s);
                    localStorage.setItem('kosmo.llm', JSON.stringify(s));
                  }}
                  style={inputStyle}
                />
              </label>
            </>
          )}
          <label style={{ fontSize: 12.5, color: 'var(--k-ink-soft)', display: 'flex', gap: 8, alignItems: 'center' }}>
            <input
              type="checkbox"
              data-testid="tts-toggle"
              checked={ttsOn}
              onChange={(e) => {
                setTtsOn(e.target.checked);
                localStorage.setItem('kosmo.tts', e.target.checked ? '1' : '0');
              }}
            />
            Antworten vorlesen (Stimme über die HomeStation-Bridge)
          </label>
          <KButton
            size="sm"
            tone="ghost"
            data-testid="journal-export"
            onClick={() => {
              const jsonl = journal.toJsonl();
              if (!jsonl) return;
              const url = URL.createObjectURL(new Blob([jsonl], { type: 'application/jsonl' }));
              const a = document.createElement('a');
              a.href = url;
              a.download = `kosmo-lernjournal-${new Date().toISOString().slice(0, 10)}.jsonl`;
              document.body.appendChild(a);
              a.click();
              a.remove();
              setTimeout(() => URL.revokeObjectURL(url), 10_000);
            }}
          >
            Lernjournal exportieren (JSONL fürs LoRA-Training)
          </KButton>
          <Hairline />
          <DiagnosePanel />
        </div>
      )}

      <div ref={scrollRef} style={{ flex: 1, overflow: 'auto', padding: 14, display: 'grid', gap: 10, alignContent: 'start' }}>
        {bubbles.map((b) => (
          <div
            key={b.id}
            style={{
              justifySelf: b.who === 'du' ? 'end' : 'start',
              maxWidth: '88%',
              padding: '8px 12px',
              borderRadius: 12,
              fontSize: 13.5,
              lineHeight: 1.5,
              whiteSpace: 'pre-wrap',
              background: b.who === 'du' ? 'var(--k-accent-wash)' : 'var(--k-raised)',
              border: '1px solid var(--k-line)',
            }}
          >
            {b.text}
            {b.who === 'kosmo' && !b.text.startsWith('⚠') && (
              <div style={{ display: 'flex', gap: 6, marginTop: 6, opacity: b.feedback ? 1 : 0.55 }}>
                {(['gut', 'schlecht'] as const).map((f) => (
                  <button
                    key={f}
                    aria-label={f === 'gut' ? 'Hilfreich' : 'Nicht hilfreich'}
                    data-testid={`fb-${f}`}
                    onClick={() => {
                      journal.add({ sentiment: f, context: b.text });
                      setBubbles((all) => all.map((x) => (x.id === b.id ? { ...x, feedback: f } : x)));
                    }}
                    style={{
                      all: 'unset',
                      cursor: 'pointer',
                      fontSize: 12,
                      padding: '1px 6px',
                      borderRadius: 6,
                      background: b.feedback === f ? 'var(--k-accent-wash)' : 'transparent',
                    }}
                  >
                    {f === 'gut' ? '👍' : '👎'}
                  </button>
                ))}
              </div>
            )}
          </div>
        ))}

        {cards
          .filter((c) => c.state !== 'abgelehnt')
          .map((c) => (
            <div
              key={c.callId}
              data-testid="proposal-card"
              style={{
                border: `1px solid ${c.state === 'angewendet' ? 'var(--k-success)' : 'var(--k-accent)'}`,
                borderRadius: 10,
                padding: 10,
                display: 'grid',
                gap: 8,
                background: 'var(--k-raised)',
              }}
            >
              <div style={{ fontSize: 12, color: 'var(--k-ink-faint)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Vorschlag von Kosmo
              </div>
              <div style={{ fontWeight: 550, fontSize: 13.5 }}>{c.summary}</div>
              {c.state === 'offen' ? (
                <div style={{ display: 'flex', gap: 6 }}>
                  <KButton size="sm" tone="accent" onClick={() => applyCard(c)} data-testid="apply-proposal">
                    Anwenden
                  </KButton>
                  <KButton size="sm" tone="ghost" onClick={() => rejectCard(c)}>
                    Ablehnen
                  </KButton>
                </div>
              ) : (
                <Badge hue="var(--k-success)">Angewendet — mit ↩ rückgängig</Badge>
              )}
            </div>
          ))}

        {busy && <div style={{ color: 'var(--k-ink-faint)', fontSize: 12.5 }}>Kosmo denkt …</div>}
      </div>

      <div style={{ padding: 12, borderTop: '1px solid var(--k-line)', display: 'flex', gap: 8 }}>
        <KButton
          size="sm"
          tone={recording ? 'accent' : 'ghost'}
          onClick={() => void toggleMic()}
          aria-label="Speak to Kosmo"
          data-testid="kosmo-mic"
          style={recording ? { animation: 'none' } : undefined}
        >
          {recording ? '● Stopp' : '🎙'}
        </KButton>
        <input
          data-testid="kosmo-input"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && send()}
          placeholder="Sprich mit Kosmo … (@kosmodoc für Hilfe)"
          style={{ ...inputStyle, flex: 1, marginTop: 0 }}
        />
        <KButton tone="accent" size="sm" onClick={send} disabled={busy} data-testid="kosmo-send">
          Senden
        </KButton>
      </div>
    </aside>
  );
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  marginTop: 4,
  padding: '6px 10px',
  borderRadius: 'var(--k-radius-sm)',
  border: '1px solid var(--k-line-strong)',
  background: 'var(--k-raised)',
  fontSize: 13,
};

const selectStyle: React.CSSProperties = { ...inputStyle };
