import type { KIconName } from './icons';
import { KIcon } from './icons';

/**
 * KTabs (W0, UI-KONZEPT-065 §3) — `role=tab`-Buttons, Label bleibt
 * sichtbarer TEXT (`toHaveText`-Verträge), Icon additiv. Aktiv: 2px-Akzent-
 * Unterstrich, KEINE Füllfläche.
 */
export interface KTabItem {
  id: string;
  label: string;
  icon?: KIconName;
  disabled?: boolean;
  /** Optionales `data-testid` je Tab-Knopf. */
  testid?: string;
}

export interface KTabsProps {
  items: readonly KTabItem[];
  aktiv: string;
  onChange: (id: string) => void;
  size?: 'sm' | 'md';
  'data-testid'?: string;
}

export function KTabs({ items, aktiv, onChange, size = 'md', ...rest }: KTabsProps) {
  return (
    <div role="tablist" className={`k-tabs k-tabs--${size}`} {...rest}>
      {items.map((item) => {
        const gewaehlt = item.id === aktiv;
        return (
          <button
            key={item.id}
            type="button"
            role="tab"
            aria-selected={gewaehlt}
            disabled={item.disabled ?? false}
            className={`k-tab${gewaehlt ? ' k-tab--aktiv' : ''} k-uebergang-schnell`}
            onClick={() => onChange(item.id)}
            {...(item.testid !== undefined ? { 'data-testid': item.testid } : {})}
          >
            {item.icon !== undefined && <KIcon name={item.icon} size={14} />}
            <span>{item.label}</span>
          </button>
        );
      })}
    </div>
  );
}
