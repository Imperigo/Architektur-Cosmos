import { useEffect, useMemo, useRef, useState } from 'react';
import { Badge, Hairline, KButton, OrbitMark, moduleHue } from '@kosmo/ui';
import {
  ChatSession,
  MockProvider,
  OllamaProvider,
  greeting,
  personas,
  type ChatProvider,
  type Proposal,
} from '@kosmo/ai';
import type { Assembly } from '@kosmo/kernel';
import { useProject } from '../state/project-store';

/**
 * KosmoPanel — der ständige Begleiter (Vision: Kosmo ist immer da).
 * Schreibende Vorschläge erscheinen als Karten: Anwenden führt den Command
 * über denselben Weg aus wie ein Handgriff des Architekten (Undo inklusive).
 */

interface Bubble {
  id: number;
  who: 'du' | 'kosmo';
  text: string;
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

export function KosmoPanel({ onClose }: { onClose: () => void }) {
  const [settings, setSettings] = useState<KosmoSettings>(loadSettings);
  const [showSettings, setShowSettings] = useState(false);
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
          if (v) currentKosmoBubble = -1;
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
