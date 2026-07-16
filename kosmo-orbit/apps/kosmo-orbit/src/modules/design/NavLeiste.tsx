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
        // Integration-Fix: `right:8` schob nav-fit UNTER das fixe Kosmo-Symbol
        // (right:22/bottom:22, 54px, z-110) — dessen Container fing die Klicks
        // ab (eingabe-3d.spec komplett rot). 88px = 22+54+12 Abstand lassen
        // dem Symbol seine Ecke; die Pillen sitzen links daneben.
        right: 88,
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
          // v0.6.6 MOTION-KONZEPT-066 §3: «jedes klickbare Element trägt
          // .k-druck» — dieser Knopf ist roh (kein KButton, das die Klasse
          // bereits automatisch trägt), darum hier explizit nachgezogen.
          // v0.8.0B P8b (Matrix-Abnahme, Gesetz-1-Fix): volle Akzent-Füllung
          // ersetzt durch die Kreis-Grammatik (`k-werkzeug-kreis`, dasselbe
          // Muster wie `EntwurfsDock.tsx`, W3/P3) — Ring + 4px-Punkt statt
          // Volltonfläche. `data-testid`/`aria-label`/`aria-pressed`/`title`/
          // `onClick` bleiben byte-gleich.
          className={`k-druck k-werkzeug-kreis${a.aktiv ? ' k-werkzeug-kreis--aktiv' : ''}`}
          title={a.titel}
          aria-label={a.titel}
          aria-pressed={a.aktiv}
          data-testid={`nav-${a.id}`}
          onClick={a.onClick}
          style={{
            width: 28,
            height: 28,
            fontSize: 14,
            lineHeight: 1,
          }}
        >
          {a.icon}
          {a.aktiv && <span className="k-werkzeug-kreis-punkt" aria-hidden="true" />}
        </button>
      ))}
    </div>
  );
}
