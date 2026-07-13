/**
 * Fortschrittsbalken (v0.7.6 Welle 3 Stream E) — schlichte Anzeige eines
 * ECHTEN Verhältnisses (erledigt/gesamt), kein simulierter Prozentwert.
 * Genutzt vom Onboarding-Wizard Schritt 03 («Modelle & Core laden»): die
 * Füllung spiegelt, wie viele Kern-Werkzeuge der aktuellen Betriebsart
 * tatsächlich erreichbar sind — bricht bei 0/0 auf 0%, nie NaN.
 */
export function Fortschrittsbalken({
  anteil,
  farbe = 'var(--k-accent)',
  'data-testid': testid,
}: {
  /** 0..1 — bereits geteilt, kein Prozentwert. */
  anteil: number;
  farbe?: string;
  'data-testid'?: string;
}) {
  const prozent = Number.isFinite(anteil) ? Math.max(0, Math.min(1, anteil)) * 100 : 0;
  return (
    <div
      data-testid={testid}
      role="progressbar"
      aria-valuenow={Math.round(prozent)}
      aria-valuemin={0}
      aria-valuemax={100}
      style={{
        height: 4,
        borderRadius: 'var(--k-radius-pill, 999px)',
        background: 'var(--k-line)',
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          height: '100%',
          width: `${prozent}%`,
          borderRadius: 'var(--k-radius-pill, 999px)',
          background: farbe,
          transition: 'width var(--k-motion-base, 200ms)',
        }}
      />
    </div>
  );
}
