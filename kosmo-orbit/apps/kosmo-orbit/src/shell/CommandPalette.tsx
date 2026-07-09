import { useEffect, useMemo, useRef, useState } from 'react';
import { allActions, onActionsChanged, scoreAction, type PaletteAction } from './palette';
import './orbit-065.css';

/**
 * Befehlspalette — ⌘K/Ctrl+K. Zurückhaltend-präzise (Aura): ein Feld,
 * eine Liste, Pfeiltasten + Enter. Kein Fremdpaket.
 */

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [cursor, setCursor] = useState(0);
  const [tick, setTick] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => onActionsChanged(() => setTick((t) => t + 1)), []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setOpen((o) => !o);
        setQuery('');
        setCursor(0);
      } else if (e.key === 'Escape') {
        setOpen(false);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  const treffer = useMemo(() => {
    void tick;
    return allActions()
      .map((a) => ({ a, s: scoreAction(query, `${a.gruppe} ${a.titel}`) }))
      .filter((x) => x.s > 0)
      .sort((x, y) => y.s - x.s || x.a.titel.localeCompare(y.a.titel, 'de'))
      .slice(0, 12)
      .map((x) => x.a);
  }, [query, tick, open]);

  const ausfuehren = (a: PaletteAction) => {
    setOpen(false);
    a.run();
  };

  if (!open) return null;
  return (
    <div
      onClick={() => setOpen(false)}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'color-mix(in srgb, var(--k-ink) 18%, transparent)',
        display: 'grid',
        justifyItems: 'center',
        alignItems: 'start',
        paddingTop: '14vh',
        zIndex: 50,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        data-testid="command-palette"
        // Aufgabe 4 (MOTION-KONZEPT-066 §4, Overlays der Zentrale): öffnet
        // mit `--k-feder` + Translation (4-8px) + Opacity statt der
        // bisherigen Skalier-Animation (`.k-skalieren-ein`, aura.css) —
        // `.orbit065-sheet-ein` (orbit-065.css) setzt genau das um.
        className="orbit065-sheet-ein"
        style={{
          width: 480,
          maxWidth: '92vw',
          background: 'var(--k-surface)',
          border: '1px solid var(--k-line-strong)',
          borderRadius: 'var(--k-radius-md)',
          boxShadow: 'var(--k-shadow-overlay)',
          overflow: 'hidden',
        }}
      >
        <input
          ref={inputRef}
          value={query}
          data-testid="palette-input"
          onChange={(e) => {
            setQuery(e.target.value);
            setCursor(0);
          }}
          onKeyDown={(e) => {
            if (e.key === 'ArrowDown') {
              e.preventDefault();
              setCursor((c) => Math.min(c + 1, treffer.length - 1));
            } else if (e.key === 'ArrowUp') {
              e.preventDefault();
              setCursor((c) => Math.max(c - 1, 0));
            } else if (e.key === 'Enter' && treffer[cursor]) {
              ausfuehren(treffer[cursor]!);
            }
          }}
          placeholder="Befehl … (Module, Ansichten, Exporte)"
          style={{
            width: '100%',
            padding: 'var(--k-s4) var(--k-s5)',
            border: 'none',
            borderBottom: '1px solid var(--k-line)',
            background: 'transparent',
            fontSize: 'var(--k-t-lg)',
            outline: 'none',
            color: 'var(--k-ink)',
          }}
        />
        <div style={{ maxHeight: 340, overflow: 'auto', padding: 'var(--k-s2)' }}>
          {treffer.map((a, i) => (
            <div
              key={a.id}
              data-testid={`palette-item-${a.id}`}
              onMouseEnter={() => setCursor(i)}
              onClick={() => ausfuehren(a)}
              // Aufgabe 3: jedes klickbare Element trägt `.k-druck`.
              // Aufgabe 4: Kinder-Staffelung 24ms, gedeckelt bei 8 (Konzept
              // §4) — `orbit065-sheet-kind` staffelt per `animation-delay`.
              className="k-druck orbit065-sheet-kind"
              style={{
                display: 'flex',
                gap: 'var(--k-s4)',
                alignItems: 'baseline',
                padding: 'var(--k-s3) var(--k-s4)',
                borderRadius: 'var(--k-radius-sm)',
                cursor: 'pointer',
                background: i === cursor ? 'var(--k-accent-wash)' : 'transparent',
                fontSize: 'var(--k-t-md)',
                animationDelay: `${Math.min(i, 8) * 24}ms`,
              }}
            >
              <span
                style={{
                  fontSize: 'var(--k-t-xs)',
                  color: 'var(--k-ink-faint)',
                  width: 64,
                  flexShrink: 0,
                  fontFamily: 'var(--k-font-mono)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.03em',
                }}
              >
                {a.gruppe}
              </span>
              <span>{a.titel}</span>
            </div>
          ))}
          {treffer.length === 0 && (
            <div style={{ padding: 'var(--k-s3) var(--k-s4)', fontSize: 'var(--k-t-sm)', color: 'var(--k-ink-faint)' }}>
              Nichts gefunden.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
