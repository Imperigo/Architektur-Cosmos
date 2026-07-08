import { useState } from 'react';
import { OrbitMark } from '@kosmo/ui';
import { greeting } from '@kosmo/ai';
import { useKosmoStatus, kurzform } from '../state/kosmo-status';
import { useProject } from '../state/project-store';

export interface KosmoSymbolProps {
  /** Öffnet das grosse Panel (Klick ODER Tastatur — natives <button>). */
  onOpen: () => void;
}

/**
 * KosmoSymbol — das schwebende Copilot-Symbol (K11, Owner-Befund wörtlich:
 * «Kosmo als Copilot-Symbol, nicht Dauerchat: Hover = Mini-Popup (letzte
 * Aktivität), Klick = entfaltet, volle Interaktion = grosses Panel; Animation
 * wenn Kosmo arbeitet»). Rendert NUR, solange das grosse Panel zu ist
 * (App.tsx) — unten rechts, fixed, über dem Inhalt.
 *
 * Arbeitet Kosmo gerade (Sende-Lebenszyklus, `state/kosmo-status.ts`),
 * pulsiert das Symbol per CSS-Klasse (`.k-kosmo-symbol-beschaeftigt`,
 * aura.css) — der globale `prefers-reduced-motion`-Block in aura.css
 * killt jede Animation/Transition, auch diese, ohne Sonderfall hier.
 */
export function KosmoSymbol({ onOpen }: KosmoSymbolProps) {
  const beschaeftigt = useKosmoStatus((s) => s.beschaeftigt);
  const letzteAktivitaet = useKosmoStatus((s) => s.letzteAktivitaet);
  const [zeigePopup, setZeigePopup] = useState(false);

  // Fallback fürs Mini-Popup, solange Kosmo noch NIE geantwortet hat (Panel
  // seit Programmstart nie geöffnet): dieselbe Begrüssungszeile, die das
  // Panel selbst beim ersten Mount zeigen würde (KosmoPanel.tsx) — kein
  // erfundener Platzhaltertext.
  const begruessung = () => {
    const { doc } = useProject.getState();
    return greeting(new Date(), doc.settings.projectName, {
      walls: doc.byKind('wall').length,
      storeys: doc.byKind('storey').length,
    });
  };
  const popupText = letzteAktivitaet ?? kurzform(begruessung());

  return (
    <div
      style={{
        position: 'fixed',
        right: 22,
        bottom: 22,
        zIndex: 110,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'flex-end',
        gap: 8,
      }}
    >
      {zeigePopup && (
        <div
          data-testid="kosmo-mini"
          role="status"
          className="k-einblenden"
          style={{
            maxWidth: 260,
            padding: '10px 12px',
            borderRadius: 'var(--k-radius-md)',
            background: 'var(--k-raised)',
            border: '1px solid var(--k-line)',
            boxShadow: 'var(--k-shadow-overlay)',
            fontSize: 12.5,
            lineHeight: 1.5,
            color: 'var(--k-ink-soft)',
          }}
        >
          <div style={{ fontWeight: 600, color: 'var(--k-ink)', marginBottom: 3 }}>
            {beschaeftigt ? 'Kosmo arbeitet …' : 'Kosmo'}
          </div>
          {popupText}
        </div>
      )}
      <button
        data-testid="kosmo-symbol"
        onClick={onOpen}
        onMouseEnter={() => setZeigePopup(true)}
        onMouseLeave={() => setZeigePopup(false)}
        onFocus={() => setZeigePopup(true)}
        onBlur={() => setZeigePopup(false)}
        aria-label={beschaeftigt ? 'Kosmo öffnen — arbeitet gerade' : 'Kosmo öffnen'}
        title="Kosmo"
        className={beschaeftigt ? 'k-kosmo-symbol k-kosmo-symbol-beschaeftigt' : 'k-kosmo-symbol'}
        style={{
          all: 'unset',
          cursor: 'pointer',
          width: 52,
          height: 52,
          borderRadius: 999,
          display: 'grid',
          placeItems: 'center',
          background: 'var(--k-surface)',
          border: '1px solid var(--k-line-strong)',
          boxShadow: 'var(--k-shadow-overlay)',
        }}
      >
        <OrbitMark module="kosmo" size={30} />
      </button>
    </div>
  );
}
