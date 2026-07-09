import type { SelectHTMLAttributes } from 'react';

/**
 * KSelect (W0, UI-KONZEPT-065 §3) — bleibt ein ECHTES natives `<select>`
 * (E2E bedient 31 Stück per `selectOption`, das bricht bei einem Custom-
 * Dropdown-Popup). Styling: 1px-Tusche-Rahmen, `--k-radius-sm`, eigener
 * SVG-Chevron über `background-image` (siehe `.k-select` in aura.css für
 * die dokumentierte `currentColor`-Grenze dieses Ansatzes).
 */
export interface KSelectProps extends Omit<SelectHTMLAttributes<HTMLSelectElement>, 'size'> {
  size?: 'sm' | 'md';
}

export function KSelect({ size = 'md', className, ...rest }: KSelectProps) {
  const klassen = ['k-select', `k-select--${size}`, className].filter(Boolean).join(' ');
  return <select {...rest} className={klassen} />;
}
