import { useEffect, useState } from 'react';
import { Badge, Hairline } from '@kosmo/ui';
import { KURZTASTEN } from '../modules/design/kurztasten';
import './orbit-065.css';

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

  // T3/F5 (v0.6.4): Zeichen-Kurzbefehle — nur in KosmoDesign aktiv (an
  // ArchiCAD angelehnt), aus derselben Registry wie der keydown-Handler dort
  // (kurztasten.ts). Die Leertaste (Pan im 2D-Plan, F5) hat keinen Eintrag in
  // der Werkzeug-Registry (sie wechselt kein Werkzeug) und wird hier separat
  // angehängt.
  const zeichenZeilen = [
    ...KURZTASTEN.map((k) => ({
      taste: k.taste.toUpperCase(),
      text: `Werkzeug «${k.beschrieb}» (in KosmoDesign)`,
    })),
    { taste: 'Leertaste', text: 'Halten + Ziehen: Ansicht verschieben (Pan) im 2D-Plan, wie ArchiCAD/Photoshop' },
  ];

  return (
    <div
      role="dialog"
      aria-modal
      aria-label="Kurzbefehle"
      data-testid="kurzbefehle"
      className="k-dialog-scrim"
      onClick={() => setOffen(false)}
      style={{ zIndex: 205, background: 'color-mix(in srgb, var(--k-ink) 22%, transparent)' }}
    >
      <div
        className="k-karte k-skalieren-ein k-dialog"
        onClick={(e) => e.stopPropagation()}
        style={{
          background: 'var(--k-raised)',
          padding: 'var(--k-s5) var(--k-s6)',
          width: 'min(460px, calc(100vw - 48px))',
          display: 'grid',
          gap: 'var(--k-s4)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--k-s3)' }}>
          <div className="k-titel" style={{ fontSize: 'var(--k-t-lg)' }}>
            Kurzbefehle
          </div>
          <div style={{ flex: 1 }} />
          <Badge hue="var(--k-ink-faint)">?</Badge>
        </div>
        <Hairline />
        <div style={{ display: 'grid', gap: 'var(--k-s3)' }}>{zeilen.map((z) => <Kurzbefehlzeile key={z.taste} {...z} />)}</div>
        <Hairline />
        <div style={{ fontSize: 'var(--k-t-sm)', fontWeight: 600, color: 'var(--k-ink-soft)' }}>
          Zeichnen (KosmoDesign, an ArchiCAD angelehnt)
        </div>
        <div style={{ display: 'grid', gap: 'var(--k-s3)' }}>
          {zeichenZeilen.map((z) => <Kurzbefehlzeile key={z.taste} {...z} />)}
        </div>
        <Hairline />
        <div style={{ fontSize: 'var(--k-t-xs)', color: 'var(--k-ink-faint)' }}>
          Stationen der Ziffern:{' '}
          {stationen.slice(0, 9).map((s, i) => `${i + 1} ${s.name.replace(/^Kosmo/, '')}`).join(' · ')}
        </div>
      </div>
    </div>
  );
}

/** Technik-Stimme (UI-KONZEPT-065 §2): Mono-Kürzel rechtsbündig, Beschrieb
 *  als Lauftext links — «Werte/Masse/Status in Mono» gilt auch für
 *  Tastenkürzel. */
function Kurzbefehlzeile({ taste, text }: { taste: string; text: string }) {
  return (
    <div className="orbit065-kurzbefehl-zeile">
      <span style={{ fontSize: 'var(--k-t-sm)', color: 'var(--k-ink-soft)' }}>{text}</span>
      <kbd className="orbit065-kurzbefehl-taste">{taste}</kbd>
    </div>
  );
}
