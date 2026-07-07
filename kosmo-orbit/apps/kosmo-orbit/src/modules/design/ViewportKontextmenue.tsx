/**
 * Serie J / J2 — Kontextmenü im 3D-Viewport (Rechtsklick oder Long-Press aus
 * J1b). Positioniert am Klickpunkt; ein transparenter Deckel schliesst es bei
 * Klick/Rechtsklick daneben, Escape ebenso (der Aufrufer hört auf Escape).
 * Reine Präsentation — die Aktionen (Auswählen/Fokus hier/Einpassen/Ansicht
 * zurücksetzen) reicht der Viewport als Callbacks herein.
 */

export interface KontextAktion {
  label: string;
  testid: string;
  onClick: () => void;
}

export function ViewportKontextmenue({
  x,
  y,
  aktionen,
  onClose,
}: {
  x: number;
  y: number;
  aktionen: KontextAktion[];
  onClose: () => void;
}) {
  return (
    <>
      <div
        onClick={onClose}
        onContextMenu={(e) => {
          e.preventDefault();
          onClose();
        }}
        style={{ position: 'absolute', inset: 0, zIndex: 30 }}
      />
      <div
        data-testid="viewport-kontextmenue"
        style={{
          position: 'absolute',
          left: Math.round(x),
          top: Math.round(y),
          zIndex: 31,
          minWidth: 168,
          padding: 4,
          background: 'var(--k-panel, #f7f5f0)',
          border: '1px solid var(--k-hairline, #cfcabf)',
          borderRadius: 6,
          boxShadow: '0 6px 20px rgba(0,0,0,0.18)',
          display: 'flex',
          flexDirection: 'column',
          gap: 1,
        }}
      >
        {aktionen.map((a) => (
          <button
            key={a.testid}
            data-testid={a.testid}
            onClick={() => {
              a.onClick();
              onClose();
            }}
            style={{
              textAlign: 'left',
              padding: '7px 10px',
              background: 'transparent',
              border: 'none',
              borderRadius: 4,
              font: 'inherit',
              fontSize: 13,
              color: 'var(--k-ink, #23211c)',
              cursor: 'pointer',
            }}
            onPointerEnter={(e) => (e.currentTarget.style.background = 'var(--k-hover, #ece8e0)')}
            onPointerLeave={(e) => (e.currentTarget.style.background = 'transparent')}
          >
            {a.label}
          </button>
        ))}
      </div>
    </>
  );
}
