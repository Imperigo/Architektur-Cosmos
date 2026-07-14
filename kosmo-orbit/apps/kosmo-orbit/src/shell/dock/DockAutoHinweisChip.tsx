/**
 * DockAutoHinweisChip (v0.7.8 Welle 2 / Paket P5, «C6» — Auto-Reaktions-
 * Hinweis) — rein präsentational: zeigt einen kurzen Text-Chip, wenn
 * `DockFlaeche.tsx` eine automatische Layout-Reaktion erkennt (ein Panel
 * klappt ein, weil ein anderes aufgeht/andockt/anheftet — s.
 * `dock-zustand.ts` `eingeklappteDiff()`). Kein eigener Zustand/Timer hier —
 * `DockFlaeche` steuert Text UND Sichtbarkeitsdauer (~2,9 s), diese
 * Komponente rendert nur `text` (oder nichts).
 *
 * Reduced-motion: kein Fade/Enter-Transition hier — der Chip erscheint/
 * verschwindet durch Mounten/Unmounten (bedingtes `null`-Return), nicht
 * durch eine CSS-Transition, die eine `prefers-reduced-motion`-Ausnahme
 * bräuchte. Für Nutzer:innen ohne reduzierte Bewegung ist das ein bewusst
 * einfacher Kompromiss (kein Fade-Polish) — s. Abschlussbericht.
 */
export interface DockAutoHinweisChipProps {
  text: string | null;
}

export function DockAutoHinweisChip({ text }: DockAutoHinweisChipProps) {
  if (!text) return null;
  return (
    <div className="k-glass k-dock-auto-hinweis" data-testid="dock-auto-hinweis" role="status" aria-live="polite">
      {text}
    </div>
  );
}
