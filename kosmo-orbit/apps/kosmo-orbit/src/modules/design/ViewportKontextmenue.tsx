/**
 * Serie J / J2 — Kontextmenü im 3D-Viewport (Rechtsklick oder Long-Press aus
 * J1b). Positioniert am Klickpunkt; ein transparenter Deckel schliesst es bei
 * Klick/Rechtsklick daneben, Escape ebenso (der Aufrufer hört auf Escape).
 * Reine Präsentation — die Aktionen (Auswählen/Fokus hier/Einpassen/Ansicht
 * zurücksetzen) reicht der Viewport als Callbacks herein.
 *
 * W3-Phantom-Token-Fix (UI-KONZEPT-065 Diagnose §1.4): dieses Menü stand auf
 * drei erfundenen CSS-Variablen, die in `aura.css` nie existiert haben (nur
 * die Hex-Fallbacks griffen, daher folgte das Menü keinem Thema-/
 * Akzentwechsel). Jetzt ausschliesslich echte Tokens (`--k-raised`,
 * `--k-line`, `--k-accent-wash`, `--k-shadow-overlay`, `--k-radius-md`) und
 * CSS statt JS-Hover (`.k-kontext-item` + `.k-uebergang-schnell`, analog zu
 * `.k-menu-item` in aura.css).
 */

export interface KontextAktion {
  label: string;
  testid: string;
  onClick: () => void;
}

/**
 * Lokale Styles für die Menü-Zeilen: `aura.css` (kosmo-ui, W0-Freeze) trägt
 * bereits ein nahezu identisches `.k-menu-item`, aber dieses Menü lebt in der
 * App (nicht in kosmo-ui) — ein scoped `<style>`-Block statt eines Eingriffs
 * in die eingefrorene `aura.css` hält den Fix innerhalb dieser Datei. Nur
 * Tokens, kein Hex; Hover läuft über die echte CSS-Pseudoklasse statt JS.
 */
const KONTEXT_ITEM_STYLE = `
  .k-kontext-item {
    all: unset;
    box-sizing: border-box;
    display: block;
    width: 100%;
    text-align: left;
    padding: var(--k-s3) var(--k-s4);
    border-radius: var(--k-radius-sm);
    font-size: var(--k-t-md);
    color: var(--k-ink);
    cursor: pointer;
  }
  .k-kontext-item:hover,
  .k-kontext-item:focus-visible {
    background: var(--k-accent-wash);
  }
`;

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
          padding: 'var(--k-s2)',
          background: 'var(--k-raised)',
          border: '1px solid var(--k-line)',
          borderRadius: 'var(--k-radius-md)',
          boxShadow: 'var(--k-shadow-overlay)',
          display: 'flex',
          flexDirection: 'column',
          gap: 'var(--k-s1)',
        }}
      >
        <style>{KONTEXT_ITEM_STYLE}</style>
        {aktionen.map((a) => (
          <button
            key={a.testid}
            data-testid={a.testid}
            onClick={() => {
              a.onClick();
              onClose();
            }}
            className="k-kontext-item k-uebergang-schnell"
          >
            {a.label}
          </button>
        ))}
      </div>
    </>
  );
}
