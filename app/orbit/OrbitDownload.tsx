import { Download } from 'lucide-react';

/**
 * Download-Panel für KosmoOrbit (Owner-Auftrag: «App-Deinstallieren-Menü …
 * und die neuste Installer-Version zum Herunterladen auf der Website»).
 *
 * Die Links zeigen auf den GitHub-Release-Tag `desktop-latest`
 * (`.github/workflows/kosmo-orbit-desktop.yml`): jeder erfolgreiche
 * Desktop-Build lädt seine Installer unter DENSELBEN Dateinamen auf DENSELBEN
 * Tag hoch (`softprops/action-gh-release`, kein neuer Tag je Version) — die
 * URL bleibt für immer gleich, zeigt aber immer auf den zuletzt gebauten
 * Installer. Darum genügt es, diese Seite EINMAL zu bauen: „neuste
 * Installer-Version auf der Website“ ist damit dauerhaft erfüllt, ohne dass
 * je eine Datei von Hand hochgeladen oder ein Link angepasst werden muss.
 */

const RELEASE_BASE = 'https://github.com/Imperigo/Architektur-Cosmos/releases/download/desktop-latest/';

type EditionKey = 'standard' | 'remote' | 'cloud';

const editions: { key: EditionKey; name: string; detail: string }[] = [
  {
    key: 'standard',
    name: 'Standard',
    detail: 'Für den Büro-/Heim-PC — volle Werkzeuge lokal, HomeStation-Bridge für Render/Sprache, sobald sie läuft.'
  },
  {
    key: 'remote',
    name: 'Remote',
    detail: 'Dieselbe App, verbindet sich per VPN mit der HomeStation von unterwegs.'
  },
  {
    key: 'cloud',
    name: 'Cloud',
    detail: 'Startet direkt im Claude-Modus — Anthropic-Schlüssel in Kosmo ⚙ Einstellungen eintragen, kein Heimnetz nötig.'
  }
];

type PlatformFile = { label: string; filename: string };
type PlatformGroup = { name: string; files: PlatformFile[] };

function platformsFor(edition: EditionKey): PlatformGroup[] {
  return [
    {
      name: 'Windows',
      files: [
        { label: 'Setup (.exe)', filename: `KosmoOrbit-${edition}-windows-setup.exe` },
        { label: 'Installer (.msi)', filename: `KosmoOrbit-${edition}-windows.msi` }
      ]
    },
    {
      name: 'macOS',
      files: [{ label: 'Disk Image (.dmg)', filename: `KosmoOrbit-${edition}-macos.dmg` }]
    },
    {
      name: 'Linux',
      files: [
        { label: 'AppImage', filename: `KosmoOrbit-${edition}-linux.AppImage` },
        { label: 'Debian/Ubuntu (.deb)', filename: `KosmoOrbit-${edition}-linux.deb` },
        { label: 'Fedora/openSUSE (.rpm)', filename: `KosmoOrbit-${edition}-linux.rpm` }
      ]
    }
  ];
}

export function OrbitDownload() {
  return (
    <section id="download" className="border-b border-white/10 py-10">
      <div className="mb-6 max-w-3xl">
        <div className="font-mono text-[10px] font-semibold uppercase tracking-[0.12em] text-[#57b6c2]">
          Installer
        </div>
        <h2 className="mt-2 text-3xl font-bold text-[#f4f6fa]">KosmoOrbit herunterladen</h2>
        <p className="mt-3 text-sm leading-7 text-[#b6bdcb]">
          Drei Editionen je Plattform. Jeder Link zeigt dauerhaft auf den zuletzt gebauten Installer — es gibt
          nichts nachzuführen, wenn ein neuer Stand erscheint.
        </p>
      </div>

      <div className="mb-6 rounded-lg border border-[#57b6c2]/30 bg-[#101319] p-5">
        <p className="text-sm leading-7 text-[#b6bdcb]">
          <span className="font-semibold text-[#f4f6fa]">Warum die Links nie veralten:</span> jeder Build lädt
          seine Installer unter denselben Dateinamen auf denselben GitHub-Release-Tag{' '}
          <code className="rounded border border-white/10 bg-black/30 px-1.5 py-0.5 text-[#57b6c2]">
            desktop-latest
          </code>{' '}
          hoch und ersetzt die vorherige Fassung. Diese Seite verweist auf genau diesen Tag — „neuste
          Installer-Version zum Herunterladen“ ist damit dauerhaft erfüllt, ohne dass hier je eine Datei von Hand
          ausgetauscht wird.
        </p>
        <p className="mt-3 text-sm leading-7 text-[#b6bdcb]">
          <span className="font-semibold text-[#f4f6fa]">Unsigniert:</span> Windows zeigt SmartScreen (
          <em>Weitere Informationen → Trotzdem ausführen</em>), macOS Gatekeeper (
          <em>Rechtsklick → Öffnen → Öffnen bestätigen</em>, ab macOS 15 zusätzlich{' '}
          <em>Systemeinstellungen → Datenschutz &amp; Sicherheit → Dennoch öffnen</em>). Kein Signing-Schlüssel
          vorhanden — ein Update ist immer ein neuer Installer, kein Auto-Update.
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        {editions.map((edition) => (
          <article key={edition.key} className="rounded-lg border border-white/10 bg-[#14171f] p-5">
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-lg border border-white/10 bg-[#101319] text-[#57b6c2]">
                <Download className="h-[19px] w-[19px]" aria-hidden="true" />
              </span>
              <h3 className="text-lg font-bold text-[#f4f6fa]">{edition.name}</h3>
            </div>
            <p className="mt-3 text-sm leading-6 text-[#b6bdcb]">{edition.detail}</p>

            <div className="mt-4 space-y-4">
              {platformsFor(edition.key).map((group) => (
                <div key={group.name}>
                  <div className="font-mono text-[9px] font-semibold uppercase tracking-[0.1em] text-[#8b92a2]">
                    {group.name}
                  </div>
                  <ul className="mt-1.5 space-y-1">
                    {group.files.map((file) => (
                      <li key={file.filename}>
                        <a
                          href={`${RELEASE_BASE}${file.filename}`}
                          className="inline-flex items-center gap-1.5 text-sm text-[#57b6c2] underline decoration-[#57b6c2]/30 underline-offset-4 transition hover:text-[#8fd6e0] hover:decoration-[#8fd6e0]"
                        >
                          {file.label}
                        </a>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
