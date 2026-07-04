import { useEffect, useState } from 'react';
import { Badge, Hairline } from '@kosmo/ui';

/**
 * Globales Kurzbefehl-Schema (V1-Finish P1): Ziffern 1–9 springen zu den
 * Stationen (in der Kachel-Reihenfolge der Rolle), 0 zur Zentrale, `?`
 * öffnet diese Übersicht. Greift nie in Eingabefelder oder offene Dialoge.
 */

export interface StationsKurzbefehl {
  name: string;
  oeffne: () => void;
}

const IST_MAC = typeof navigator !== 'undefined' && /Mac|iP(hone|ad|od)/.test(navigator.userAgent);
const MOD = IST_MAC ? '⌘' : 'Ctrl';

function inEingabe(target: EventTarget | null): boolean {
  const el = target as HTMLElement | null;
  if (!el) return false;
  const tag = el.tagName;
  return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || el.isContentEditable;
}

export function Kurzbefehle({
  stationen,
  zurZentrale,
}: {
  stationen: StationsKurzbefehl[];
  zurZentrale: () => void;
}) {
  const [offen, setOffen] = useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (inEingabe(e.target)) return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      // Offene Dialoge (Bestätigung, Palette) behalten die Tastatur
      if (document.querySelector('[role="dialog"]') && !offen) return;
      if (e.key === '?') {
        e.preventDefault();
        setOffen((o) => !o);
        return;
      }
      if (e.key === 'Escape' && offen) {
        setOffen(false);
        return;
      }
      if (offen) return;
      if (e.key === '0') {
        zurZentrale();
        return;
      }
      const n = Number(e.key);
      if (Number.isInteger(n) && n >= 1 && n <= Math.min(9, stationen.length)) {
        stationen[n - 1]?.oeffne();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [stationen, zurZentrale, offen]);

  if (!offen) return null;

  const zeilen: { taste: string; text: string }[] = [
    { taste: `${MOD} K`, text: 'Befehlspalette — alles suchen und ausführen' },
    { taste: '1–9', text: 'Station öffnen (Reihenfolge wie die Kacheln der Zentrale)' },
    { taste: '0', text: 'Zur Zentrale' },
    { taste: `${MOD} Z`, text: 'Rückgängig — gilt für jede Änderung, auch von Kosmo' },
    { taste: `${MOD} ⇧ Z`, text: 'Wiederherstellen' },
    { taste: 'Esc', text: 'Werkzeug oder Dialog verlassen' },
    { taste: '?', text: 'Diese Übersicht ein-/ausblenden' },
  ];

  return (
    <div
      role="dialog"
      aria-modal
      aria-label="Kurzbefehle"
      data-testid="kurzbefehle"
      onClick={() => setOffen(false)}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 205,
        background: 'color-mix(in srgb, var(--k-ink) 22%, transparent)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <div
        className="k-karte k-skalieren-ein"
        onClick={(e) => e.stopPropagation()}
        style={{
          background: 'var(--k-raised)',
          padding: '18px 20px',
          width: 'min(460px, calc(100vw - 48px))',
          display: 'grid',
          gap: 10,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div className="k-titel" style={{ fontSize: 13, fontWeight: 650 }}>
            Kurzbefehle
          </div>
          <div style={{ flex: 1 }} />
          <Badge hue="var(--k-ink-faint)">?</Badge>
        </div>
        <Hairline />
        <div style={{ display: 'grid', gap: 7 }}>
          {zeilen.map((z) => (
            <div
              key={z.taste}
              style={{ display: 'grid', gridTemplateColumns: '76px 1fr', gap: 12, alignItems: 'baseline' }}
            >
              <kbd
                style={{
                  fontFamily: 'var(--k-font-mono)',
                  fontSize: 11.5,
                  padding: '2px 6px',
                  border: '1px solid var(--k-line-strong)',
                  borderRadius: 'var(--k-radius-sm)',
                  background: 'var(--k-surface)',
                  textAlign: 'center',
                }}
              >
                {z.taste}
              </kbd>
              <span style={{ fontSize: 12.5, color: 'var(--k-ink-soft)' }}>{z.text}</span>
            </div>
          ))}
        </div>
        <Hairline />
        <div style={{ fontSize: 11.5, color: 'var(--k-ink-faint)' }}>
          Stationen der Ziffern:{' '}
          {stationen.slice(0, 9).map((s, i) => `${i + 1} ${s.name.replace(/^Kosmo/, '')}`).join(' · ')}
        </div>
      </div>
    </div>
  );
}
