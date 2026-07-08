import { KButton } from '@kosmo/ui';

/**
 * Dezenter Menüpunkt «App deinstallieren…» (Owner-Auftrag: «Baue bitte
 * App-Deinstallieren-Menü … ein, im Hauptmenü»). KosmoOrbit ist eine
 * Tauri-Desktop-App ohne eigenen Deinstaller/Update-Schlüssel (siehe
 * `docs/INSTALL.md`) — sie kann sich NICHT selbst deinstallieren (kein
 * Systemzugriff dafür). Dieser Dialog verlinkt darum nur die ehrliche,
 * betriebssystemspezifische Kurzanleitung + die ausführliche Fassung auf der
 * Website, statt eine Selbst-Deinstallation vorzutäuschen.
 */

const WEBSITE_URL = 'https://architekturkosmos.ch/orbit/';

export function AppDeinstallieren({ onClose }: { onClose: () => void }) {
  return (
    <div
      data-testid="deinstallation-dialog"
      role="dialog"
      aria-label="App deinstallieren"
      className="k-dialog-scrim"
      style={{ zIndex: 230, background: 'color-mix(in srgb, var(--k-ink) 22%, transparent)' }}
      onClick={onClose}
    >
      <div
        className="k-karte k-skalieren-ein k-dialog"
        onClick={(e) => e.stopPropagation()}
        style={{
          background: 'var(--k-raised)',
          padding: '16px 20px',
          width: 'min(560px, calc(100vw - 48px))',
          display: 'grid',
          gap: 10,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div className="k-titel" style={{ fontSize: 14, fontWeight: 650 }}>
            App deinstallieren
          </div>
          <div style={{ flex: 1 }} />
          <KButton size="sm" tone="ghost" aria-label="Schliessen" onClick={onClose}>
            ×
          </KButton>
        </div>

        <p style={{ fontSize: 12.5, color: 'var(--k-ink-soft)', lineHeight: 1.5 }}>
          KosmoOrbit kann sich nicht selbst deinstallieren — eine Tauri-App hat dafür keinen Systemzugriff. Das
          Entfernen läuft über den Weg deines Betriebssystems:
        </p>

        <div data-testid="deinstallation-windows" style={{ fontSize: 12.5, color: 'var(--k-ink-soft)', lineHeight: 1.5 }}>
          <strong style={{ color: 'var(--k-ink)' }}>Windows</strong> — Einstellungen → Apps → „KosmoOrbit" →
          Deinstallieren (oder Systemsteuerung → Programme und Features).
        </div>
        <div data-testid="deinstallation-macos" style={{ fontSize: 12.5, color: 'var(--k-ink-soft)', lineHeight: 1.5 }}>
          <strong style={{ color: 'var(--k-ink)' }}>macOS</strong> — App aus „Programme" in den Papierkorb ziehen,
          Papierkorb leeren.
        </div>
        <div data-testid="deinstallation-linux" style={{ fontSize: 12.5, color: 'var(--k-ink-soft)', lineHeight: 1.5 }}>
          <strong style={{ color: 'var(--k-ink)' }}>Linux</strong> — AppImage: Datei löschen. Über .deb/.rpm
          installiert: über den Paketmanager entfernen (<code>apt remove</code> bzw. <code>dnf remove</code>).
        </div>

        <p style={{ fontSize: 11.5, color: 'var(--k-ink-faint)', lineHeight: 1.5 }}>
          Projekte und Einstellungen bleiben danach bewusst liegen — sie stecken im Browser-Speicher der
          eingebetteten Web-Ansicht (IndexedDB/localStorage), nicht in einer eigenen Tauri-Datei. Ausführliche
          Anleitung inkl. Speicherorten und restlosem Entfernen:{' '}
          <a
            href={WEBSITE_URL}
            target="_blank"
            rel="noreferrer"
            data-testid="deinstallation-website-link"
            style={{ color: 'var(--k-technik)' }}
          >
            architekturkosmos.ch/orbit
          </a>
          .
        </p>
      </div>
    </div>
  );
}
