import { useEffect, useRef } from 'react';
import type { CSSProperties } from 'react';
import type { KosmoZustand } from '../state/kosmo-status';
import { klick } from '../state/sounds';
import './kosmo-feedback.css';

export interface KosmoOrbProps {
  /** Aktueller Kosmo-Zustand (`state/kosmo-status.ts`) — treibt die Darstellung über `data-zustand`. */
  zustand: KosmoZustand;
  /** Durchmesser in px (Default 32 — passt ins 52px-`KosmoSymbol`). */
  size?: number;
  /**
   * NUR bei `zustand === 'writing'` sinnvoll: der bisher gestreamte Text.
   * Die letzten Wörter werden als fallende Pills gezeigt, das jüngste teal
   * (§6 Punkt 4, wörtlich «aktuelles Wort teal»).
   */
  text?: string;
  /**
   * NUR bei `zustand === 'dispatching'` sinnvoll: die Rollenfarbe, in der
   * die Punkte rausschiessen (§6 Punkt 5, «Punkte schiessen in Rollenfarbe
   * raus») — z.B. `var(--k-rolle-agent)`. Ohne Angabe fällt der Orb auf
   * `--k-signal` zurück (kein falscher Rollen-Anschein ohne echte Rolle).
   */
  rollenfarbe?: string;
}

/**
 * KosmoOrb (v0.7.2 §6, Stream W2-D) — wiederverwendbarer Orb: `KosmoSymbol.tsx`
 * ersetzt damit nur sein Inneres (Testids/DOM-Vertrag dort bleiben exakt),
 * das Charakter-Fenster (Paket 07, Stream W3-F) bindet denselben Orb später
 * ohne Änderung hier ein — reines `data-zustand`-Attribut steuert JEDE
 * Darstellung über CSS-Attribut-Selektoren (`kosmo-feedback.css`), kein
 * Zustand hängt sich an einen anderen an (Morph-Regel, §0.6).
 *
 * `takeover` (Stufe 1, §6 Punkt 8) rendert ZUSÄTZLICH einen fixed-position
 * Fensterrahmen-Overlay (Bildschirm bleibt sichtbar) — unabhängig von der
 * Grösse/Position, an der der kompakte Orb selbst eingebettet ist (52px im
 * Symbol, ~200×220 im Charakter-Fenster).
 */
export function KosmoOrb({ zustand, size = 32, text, rollenfarbe }: KosmoOrbProps) {
  const zuvorZustand = useRef<KosmoZustand>(zustand);
  useEffect(() => {
    // Sound «klick» beim Erreichen von 'done' (§6 Punkt 6, wörtlich) — NUR
    // beim ÜBERGANG (nicht bei jedem Re-Render mit gleichbleibendem Zustand),
    // `sounds.ts` selbst ist feature-detected + Default AUS.
    if (zustand === 'done' && zuvorZustand.current !== 'done') klick();
    zuvorZustand.current = zustand;
  }, [zustand]);

  const kernGroesse = Math.round(size * 0.36);
  const woerter = zustand === 'writing' && text ? text.trim().split(/\s+/).filter(Boolean).slice(-4) : [];

  return (
    <div
      className="kosmo-orb"
      data-testid="kosmo-orb"
      data-zustand={zustand}
      style={{
        width: size,
        height: size,
        ...(rollenfarbe !== undefined ? ({ '--kosmo-orb-rollenfarbe': rollenfarbe } as CSSProperties) : {}),
      }}
    >
      <div className="kosmo-orb-kern" style={{ width: kernGroesse, height: kernGroesse }} />
      <div className="kosmo-orb-punkte" aria-hidden="true">
        <span className="kosmo-orb-punkt kosmo-orb-punkt-1" />
        <span className="kosmo-orb-punkt kosmo-orb-punkt-2" />
        <span className="kosmo-orb-punkt kosmo-orb-punkt-3" />
        <span className="kosmo-orb-punkt kosmo-orb-punkt-4" />
      </div>

      {zustand === 'speaking' && (
        <div className="kosmo-orb-equalizer-huelle" aria-hidden="true">
          <div className="k-fb-equalizer" data-testid="kosmo-orb-equalizer">
            <span className="k-fb-equalizer-b" />
            <span className="k-fb-equalizer-b" />
            <span className="k-fb-equalizer-b" />
            <span className="k-fb-equalizer-b" />
          </div>
        </div>
      )}

      {zustand === 'writing' && woerter.length > 0 && (
        <div className="kosmo-orb-woerter" data-testid="kosmo-orb-woerter" aria-hidden="true">
          {woerter.map((wort, i) => (
            <span
              key={`${i}-${wort}`}
              className={i === woerter.length - 1 ? 'kosmo-orb-wort kosmo-orb-wort-aktuell' : 'kosmo-orb-wort'}
              style={{ animationDelay: `${i * 90}ms` }}
            >
              {wort}
            </span>
          ))}
        </div>
      )}

      {zustand === 'takeover' && (
        <div className="kosmo-orb-takeover" data-testid="kosmo-orb-takeover" aria-hidden="true">
          <div className="kosmo-orb-takeover-rand k-fb-rand-lauf" />
          <span className="kosmo-orb-takeover-ecke kosmo-orb-takeover-ecke--oben-links" />
          <span className="kosmo-orb-takeover-ecke kosmo-orb-takeover-ecke--oben-rechts" />
          <span className="kosmo-orb-takeover-ecke kosmo-orb-takeover-ecke--unten-rechts" />
          <span className="kosmo-orb-takeover-ecke kosmo-orb-takeover-ecke--unten-links" />
          <span className="kosmo-orb-takeover-chip">KOSMO ARBEITET · ESC BRICHT AB</span>
        </div>
      )}
    </div>
  );
}
