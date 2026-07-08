import { useEffect, useState, type KeyboardEvent as ReactKeyboardEvent } from 'react';
import { createPortal } from 'react-dom';
import { KButton, OrbitMark, Panel, moduleHue, type ModuleId } from '@kosmo/ui';
import { STATION_FAMILIEN, stationFamilie } from '../state/stationen';
import { werkzeugeFuerStation } from './stations-werkzeuge';

/**
 * Serie K / A2 (Owner-Befund K12, wörtlich): «Startmenü neu: personalisierte,
 * dynamische Icons mit Tiefenlayern, Hover zeigt enthaltene Tools, Info-Icon
 * je Kachel; Startanimation; Farbakzente + stromsparende Idle-Animationen.»
 *
 * Extrahiert aus der bisherigen Inline-Kachel in App.tsx (T7) — ALLE
 * bestehenden Verträge bleiben 1:1 erhalten, damit jede bestehende E2E, die
 * `module-<id>` anklickt, unverändert grün bleibt:
 *   - `data-testid="module-<id>"`, `role="button"`, `tabIndex={0}`,
 *     `aria-label="<name> öffnen"`, Enter/Space → `onOeffnen`.
 *   - Klick auf die GANZE Kachel öffnet (keine pointer-events-Tricks,
 *     keine Teilflächen) — das Info-Icon ist ein zusätzliches, kleines
 *     Element, das per `stopPropagation` NICHT mit-öffnet.
 *   - Platzhalter-Opazitätsregel (0.55, wenn weder `screen` noch
 *     `deepLink` existiert) unverändert.
 *
 * Neu: ein Halo-Tiefenlayer hinter dem OrbitMark (stationsfarben,
 * `color-mix`, sehr dezent — Gestaltungskonzept «Papier-Ruhe»), eine
 * Hover/Fokus-Werkzeugzeile aus `stations-werkzeuge.ts`, ein Info-Popover
 * (Portal — vermeidet die CSS-Containing-Block-Falle, die `transform` auf
 * `:hover` der Kachel sonst für `position: fixed`-Kinder aufspannen würde),
 * eine gestaffelte Startanimation (`animation-delay` aus `index`, Gesamtdauer
 * unter 800 ms) und ein sehr langsamer, stromsparender Idle-Puls NUR auf dem
 * Halo (reines `opacity`, ≥6 s, pausiert wenn das Dokument versteckt ist —
 * die Klasse dafür setzt der Zentrale-Container in App.tsx).
 */

export interface ZentraleKachelProps {
  id: ModuleId;
  name: string;
  desc: string;
  /** Wie bisher: nur Stationen mit `screen` oder `deepLink` sind aktiv. */
  klickbar: boolean;
  onOeffnen: () => void;
  /** Position in der Startanimations-Staffelung (steuert NUR animation-delay,
   *  keine DOM-Reihenfolge). */
  index: number;
}

/** Verzögerungsschritt der Startanimation; bei 12 Kacheln (max. Index 11)
 *  bleibt die Gesamtdauer (letzte Verzögerung + Übergangsdauer) klar unter
 *  den geforderten 800 ms. Gedeckelt, falls künftig mehr Stationen dazukommen. */
const EINBLEND_SCHRITT_MS = 30;
const EINBLEND_MAX_INDEX = 15;

function familieLabel(id: ModuleId): string {
  const familie = stationFamilie(id);
  if (familie === 'kosmo') return 'Kosmo — die steuernde Intelligenz';
  const eintrag = STATION_FAMILIEN.find((f) => f.id === familie);
  return eintrag ? eintrag.titel : 'ohne Familie';
}

export function ZentraleKachel({ id, name, desc, klickbar, onOeffnen, index }: ZentraleKachelProps) {
  const [infoOffen, setInfoOffen] = useState(false);
  const werkzeuge = werkzeugeFuerStation(id);
  const hue = moduleHue[id];

  // Escape schliesst das Info-Panel (Muster wie Kurzbefehle.tsx); der
  // globale `role="dialog"`-Guard dort lässt diesem Panel die Tastatur.
  useEffect(() => {
    if (!infoOffen) return;
    const onKey = (e: globalThis.KeyboardEvent) => {
      if (e.key === 'Escape') setInfoOffen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [infoOffen]);

  const verzoegerung = Math.min(index, EINBLEND_MAX_INDEX) * EINBLEND_SCHRITT_MS;

  return (
    <Panel
      onClick={onOeffnen}
      role="button"
      tabIndex={0}
      aria-label={`${name} öffnen`}
      onKeyDown={(e: ReactKeyboardEvent<HTMLDivElement>) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onOeffnen();
        }
      }}
      data-testid={`module-${id}`}
      className="k-kachel k-kachel-einblenden"
      style={{
        position: 'relative',
        display: 'flex',
        gap: 12,
        alignItems: 'center',
        cursor: klickbar ? 'pointer' : 'default',
        opacity: klickbar ? 1 : 0.55,
        animationDelay: `${verzoegerung}ms`,
      }}
    >
      <button
        type="button"
        data-testid={`kachel-info-${id}`}
        aria-label={`${name} — Info`}
        className="k-kachel-info"
        onClick={(e) => {
          e.stopPropagation();
          setInfoOffen(true);
        }}
        onKeyDown={(e) => {
          // NUR Enter/Space stoppen (die würden sonst zusätzlich das
          // Panel-onKeyDown triggern und gleichzeitig `onOeffnen` auslösen).
          // Alles andere — allen voran Escape — muss weiter bis zum
          // Escape-Listener oben bubbeln; das Info-Icon behält nach dem
          // Öffnen den Fokus, ein pauschales stopPropagation würde Escape
          // sonst hier schon abfangen.
          if (e.key === 'Enter' || e.key === ' ') {
            e.stopPropagation();
          }
        }}
      >
        ⓘ
      </button>
      {/* Tiefenlayer: fester Anker gleicher Grösse wie der OrbitMark, damit
          der Halo unabhängig von der (variablen) Texthöhe exakt hinter dem
          Icon sitzt — Paint-Reihenfolge (CSS-Spec, positionierte Elemente
          mit z-index:auto in DOM-Reihenfolge) legt das Icon automatisch
          darüber, ganz ohne z-index-Hacks. */}
      <div style={{ position: 'relative', width: 34, height: 34, flexShrink: 0 }}>
        <span
          aria-hidden
          className="k-kachel-halo"
          style={{ background: `radial-gradient(circle, color-mix(in srgb, ${hue} 38%, transparent) 0%, transparent 72%)` }}
        />
        <OrbitMark module={id} size={34} style={{ position: 'relative' }} />
      </div>
      <div style={{ minWidth: 0, flex: 1 }}>
        <div style={{ fontWeight: 550 }}>{name}</div>
        <div style={{ fontSize: 12.5, color: 'var(--k-ink-faint)' }}>{desc}</div>
        {werkzeuge.length > 0 && (
          <div className="k-kachel-werkzeuge" data-testid={`kachel-werkzeuge-${id}`}>
            {werkzeuge.join(' · ')}
          </div>
        )}
      </div>
      {infoOffen &&
        createPortal(
          <div
            role="dialog"
            aria-modal
            aria-label={`${name} — Info`}
            data-testid="kachel-info-panel"
            className="k-dialog-scrim"
            style={{ zIndex: 240, background: 'color-mix(in srgb, var(--k-ink) 22%, transparent)' }}
            onClick={(e) => {
              e.stopPropagation();
              setInfoOffen(false);
            }}
          >
            <div
              className="k-karte k-skalieren-ein k-dialog"
              onClick={(e) => e.stopPropagation()}
              style={{
                background: 'var(--k-raised)',
                padding: '16px 20px',
                width: 'min(380px, calc(100vw - 48px))',
                display: 'grid',
                gap: 10,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div className="k-titel" style={{ fontSize: 14, fontWeight: 650 }}>
                  {name}
                </div>
                <div style={{ flex: 1 }} />
                <KButton
                  size="sm"
                  tone="ghost"
                  aria-label="Schliessen"
                  onClick={(e) => {
                    e.stopPropagation();
                    setInfoOffen(false);
                  }}
                >
                  ×
                </KButton>
              </div>
              <div style={{ fontSize: 11, color: 'var(--k-ink-faint)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                {familieLabel(id)}
              </div>
              <p style={{ fontSize: 12.5, color: 'var(--k-ink-soft)', lineHeight: 1.5, margin: 0 }}>{desc}</p>
              {werkzeuge.length > 0 && (
                <ul style={{ margin: 0, paddingLeft: 18, fontSize: 12.5, color: 'var(--k-ink-soft)', lineHeight: 1.6 }}>
                  {werkzeuge.map((w) => (
                    <li key={w}>{w}</li>
                  ))}
                </ul>
              )}
            </div>
          </div>,
          document.body,
        )}
    </Panel>
  );
}
