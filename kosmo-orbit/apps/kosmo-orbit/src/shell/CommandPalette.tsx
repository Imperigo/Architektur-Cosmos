import { useEffect, useMemo, useRef, useState } from 'react';
import { allActions, onActionsChanged, scoreAction, type PaletteAction } from './palette';

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
        className="k-skalieren-ein"
        style={{
          width: 480,
          maxWidth: '92vw',
          background: 'var(--k-surface)',
          border: '1px solid var(--k-line-strong)',
          borderRadius: 12,
          boxShadow: '0 18px 50px rgba(0,0,0,0.22)',
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
            padding: '13px 16px',
            border: 'none',
            borderBottom: '1px solid var(--k-line)',
            background: 'transparent',
            fontSize: 14.5,
            outline: 'none',
            color: 'var(--k-ink)',
          }}
        />
        <div style={{ maxHeight: 340, overflow: 'auto', padding: 6 }}>
          {treffer.map((a, i) => (
            <div
              key={a.id}
              data-testid={`palette-item-${a.id}`}
              onMouseEnter={() => setCursor(i)}
              onClick={() => ausfuehren(a)}
              style={{
                display: 'flex',
                gap: 10,
                alignItems: 'baseline',
                padding: '8px 12px',
                borderRadius: 8,
                cursor: 'pointer',
                background: i === cursor ? 'var(--k-accent-wash)' : 'transparent',
                fontSize: 13.5,
              }}
            >
              <span style={{ fontSize: 11, color: 'var(--k-ink-faint)', width: 64, flexShrink: 0 }}>
                {a.gruppe}
              </span>
              <span>{a.titel}</span>
            </div>
          ))}
          {treffer.length === 0 && (
            <div style={{ padding: '10px 12px', fontSize: 13, color: 'var(--k-ink-faint)' }}>
              Nichts gefunden.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
