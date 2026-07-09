/**
 * NavLeiste (T3) — On-Screen-Navigations-Symbole für 2D-Plan und 3D-Viewport:
 * Orbit/Pan/Zoom-Modus + Home/Fit, jeweils mit Hover-Tooltip (nativ per
 * `title`, barrierefrei per `aria-label`). Rein darstellend — die eigentliche
 * Kamera-/View-Logik bleibt bei Viewport3D/PlanView, damit die bestehende
 * Maus-/Touch-Navigation unverändert bleibt (Knöpfe ergänzen, ersetzen nichts).
 */

export interface NavAktion {
  id: string;
  icon: string;
  /** Tooltip-Text beim Hover — beschreibt, was der Knopf tut. */
  titel: string;
  aktiv?: boolean;
  onClick: () => void;
}

export function NavLeiste({ aktionen, testid }: { aktionen: NavAktion[]; testid: string }) {
  return (
    <div
      data-testid={testid}
      style={{
        position: 'absolute',
        // v0.6.5 (W2, SK-D5): vorher `left:8` — stapelte sich optisch mit der
        // Geschossleiste/dem Entwurfs-Dock, die beide an der linken Kante
        // sitzen. Wandert nach unten RECHTS (Owner-Befund «Statuszeile +
        // Viewport-Nav-Pillen stapeln sich in derselben Ecke»); die
        // Statusleiste (DesignWorkspace.tsx) bleibt unten LINKS — beide
        // Ecken sind jetzt entstapelt. testids/aria-labels unverändert.
        right: 8,
        // Bewusst über der Statuszeile (bottom:12, ~30px hoch) — sonst
        // überlappen sich Cursor-Koordinaten und die Nav-Knöpfe.
        bottom: 50,
        zIndex: 5,
        display: 'flex',
        gap: 3,
        background: 'var(--k-surface)',
        border: '1px solid var(--k-line)',
        borderRadius: 'var(--k-radius-md)',
        padding: 3,
        boxShadow: 'var(--k-shadow-raised)',
      }}
    >
      {aktionen.map((a) => (
        <button
          key={a.id}
          type="button"
          title={a.titel}
          aria-label={a.titel}
          aria-pressed={a.aktiv}
          data-testid={`nav-${a.id}`}
          onClick={a.onClick}
          style={{
            width: 28,
            height: 28,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: 'var(--k-radius-sm)',
            border: '1px solid transparent',
            cursor: 'pointer',
            background: a.aktiv ? 'var(--k-accent)' : 'transparent',
            color: a.aktiv ? 'white' : 'var(--k-ink-soft)',
            fontSize: 14,
            lineHeight: 1,
          }}
        >
          {a.icon}
        </button>
      ))}
    </div>
  );
}
