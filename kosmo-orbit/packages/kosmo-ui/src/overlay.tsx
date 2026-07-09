import {
  cloneElement,
  useEffect,
  useRef,
  useState,
  type MouseEvent as ReactMouseEvent,
  type ReactElement,
  type ReactNode,
} from 'react';
import type { KIconName } from './icons';
import { KIcon } from './icons';

/**
 * KMenu + KDialog (W0, UI-KONZEPT-065 §3) — die zwei Overlay-Bausteine.
 * KMenu ersetzt Link-Reihen (ANSICHT/EXPORT/EBENEN) durch Dropdowns; KDialog
 * ersetzt Ad-hoc-Popups. Beide teilen sich Esc-/Aussenklick-Verhalten.
 */

// ── KMenu ───────────────────────────────────────────────────────────

export type KMenuItem =
  | 'trenner'
  | {
      id: string;
      label: string;
      icon?: KIconName;
      /** Kurztaste, rechtsbündig in Mono dargestellt (z.B. "⌘K"). */
      kuerzel?: string;
      /** Rot markiert (destruktive Aktion). */
      gefahr?: boolean;
      disabled?: boolean;
      testid?: string;
    };

interface KMenuTriggerProps {
  onClick?: (e: ReactMouseEvent<HTMLElement>) => void;
  'aria-haspopup'?: boolean | 'menu';
  'aria-expanded'?: boolean;
}

export interface KMenuProps {
  /** Der Bedienknopf — bekommt aria-haspopup/-expanded und einen Klick-
   * Handler per `cloneElement` angeklont (kein Wrapper-Element nötig). */
  trigger: ReactElement<KMenuTriggerProps>;
  items: readonly KMenuItem[];
  onSelect: (id: string) => void;
  'data-testid'?: string;
}

export function KMenu({ trigger, items, onSelect, ...rest }: KMenuProps) {
  const [offen, setOffen] = useState(false);
  const wrapRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!offen) return undefined;
    const schliesseAussen = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOffen(false);
    };
    const schliesseEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOffen(false);
    };
    document.addEventListener('mousedown', schliesseAussen);
    document.addEventListener('keydown', schliesseEsc);
    return () => {
      document.removeEventListener('mousedown', schliesseAussen);
      document.removeEventListener('keydown', schliesseEsc);
    };
  }, [offen]);

  // `trigger` ist beliebig (KButton, ein natives <button>, …) — dessen
  // konkreter Props-Typ ist mit `cloneElement` nicht variantensicher zu
  // vereinen (das generische `onClick` kollidiert kontravariant mit
  // spezifischeren Handlern wie `MouseEventHandler<HTMLButtonElement>`).
  // Der Cast ist bewusst auf diese eine Stelle begrenzt; die ÖFFENTLICHE
  // Prop bleibt oben sauber typisiert (`ReactElement<KMenuTriggerProps>`).
  const triggerProps = trigger.props as KMenuTriggerProps;
  const geklonterTrigger = cloneElement(trigger as ReactElement<Record<string, unknown>>, {
    'aria-haspopup': 'menu',
    'aria-expanded': offen,
    onClick: (e: ReactMouseEvent<HTMLElement>) => {
      triggerProps.onClick?.(e);
      setOffen((o) => !o);
    },
  });

  return (
    <div className="k-menu-wrap" ref={wrapRef} {...rest}>
      {geklonterTrigger}
      <div role="menu" className={`k-menu k-uebergang-schnell${offen ? ' offen' : ''}`} aria-hidden={!offen}>
        {items.map((item, i) =>
          item === 'trenner' ? (
            // eslint-disable-next-line react/no-array-index-key -- Trenner tragen keine eigene Identität
            <div key={`trenner-${i}`} role="separator" className="k-menu-trenner" />
          ) : (
            <button
              key={item.id}
              type="button"
              role="menuitem"
              disabled={item.disabled ?? false}
              tabIndex={offen ? 0 : -1}
              className={`k-menu-item${item.gefahr ? ' k-menu-item--gefahr' : ''}`}
              onClick={() => {
                onSelect(item.id);
                setOffen(false);
              }}
              {...(item.testid !== undefined ? { 'data-testid': item.testid } : {})}
            >
              {item.icon !== undefined && <KIcon name={item.icon} size={14} />}
              <span className="k-menu-item-label">{item.label}</span>
              {item.kuerzel !== undefined && <span className="k-menu-item-kuerzel">{item.kuerzel}</span>}
            </button>
          ),
        )}
      </div>
    </div>
  );
}

// ── KDialog ─────────────────────────────────────────────────────────

export interface KDialogProps {
  titel: string;
  onClose: () => void;
  children: ReactNode;
  /** Rechtsbündige Aktionen, z.B. Abbrechen/Bestätigen-Knöpfe. */
  fusszeile?: ReactNode;
  breite?: number;
  'data-testid'?: string;
}

/** Gestalteter Dialog — Kopf in Plakat-Versalien + Schliessen-KIcon +
 * Hairline; Scrim (`.k-dialog-scrim`, bestehend) + Höhen-/Umbruch-Regeln
 * (`.k-dialog`, bestehend) werden wiederverwendet, nicht neu erfunden.
 * Esc + Scrim-Klick schliessen. KEINE 45°-Ecke (die gehört den Karteikarten). */
export function KDialog({ titel, onClose, children, fusszeile, breite = 560, ...rest }: KDialogProps) {
  useEffect(() => {
    const schliesseEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', schliesseEsc);
    return () => document.removeEventListener('keydown', schliesseEsc);
  }, [onClose]);

  return (
    <div
      role="dialog"
      aria-modal
      aria-label={titel}
      className="k-dialog-scrim"
      onClick={() => onClose()}
      {...rest}
    >
      <div
        className="k-dialog-box k-dialog k-skalieren-ein"
        onClick={(e) => e.stopPropagation()}
        style={{ width: `min(${breite}px, calc(100vw - 48px))` }}
      >
        <div className="k-dialog-kopf">
          <span className="k-titel k-dialog-kopf-titel">{titel}</span>
          <button
            type="button"
            aria-label="Schliessen"
            className="k-dialog-kopf-schliessen"
            onClick={() => onClose()}
          >
            <KIcon name="schliessen" size={16} />
          </button>
        </div>
        <div className="k-dialog-koerper">{children}</div>
        {fusszeile !== undefined && <div className="k-dialog-fuss">{fusszeile}</div>}
      </div>
    </div>
  );
}
