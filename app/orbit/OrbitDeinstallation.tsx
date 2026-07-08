import { AlertTriangle, Trash2 } from 'lucide-react';

/**
 * Deinstallations-Panel (Owner-Auftrag: «App-Deinstallieren-Menü … auf der
 * Website»). Ehrliche, betriebssystemspezifische Anleitung — KosmoOrbit ist
 * eine Tauri-App ohne eigenen Deinstaller/Updater (kein Signing-Schlüssel,
 * siehe `kosmo-orbit/docs/INSTALL.md`), das Entfernen läuft über den
 * jeweiligen OS-Weg. Genauso ehrlich: was danach lokal liegen bleibt, und wie
 * man es vollständig entfernt.
 */

const schritte: { os: string; steps: string[] }[] = [
  {
    os: 'Windows',
    steps: [
      'Einstellungen → Apps → Installierte Apps → „KosmoOrbit" suchen → Deinstallieren.',
      'Alternativ: Systemsteuerung → Programme → Programme und Features → „KosmoOrbit" → Deinstallieren.',
      'Der Installer (NSIS/MSI) entfernt die Programmdateien; Nutzerdaten (siehe unten) bleiben bewusst liegen.'
    ]
  },
  {
    os: 'macOS',
    steps: [
      'KosmoOrbit beenden (Cmd+Q).',
      'Finder → Programme → „KosmoOrbit" in den Papierkorb ziehen.',
      'Papierkorb leeren. Das entfernt das App-Bündel — Nutzerdaten (siehe unten) bleiben bewusst liegen.'
    ]
  },
  {
    os: 'Linux',
    steps: [
      'AppImage: einfach die Datei „KosmoOrbit…AppImage" löschen — es gibt keine Registrierung im System.',
      'Über .deb installiert: Paketnamen prüfen mit „dpkg -l | grep -i kosmo", dann „sudo apt remove <gefundener-name>".',
      'Über .rpm installiert: Paketnamen prüfen mit „rpm -qa | grep -i kosmo", dann „sudo dnf remove <gefundener-name>" (bzw. „sudo rpm -e <gefundener-name>").'
    ]
  }
];

export function OrbitDeinstallation() {
  return (
    <section id="deinstallation" className="border-b border-white/10 py-10">
      <div className="mb-6 max-w-3xl">
        <div className="font-mono text-[10px] font-semibold uppercase tracking-[0.12em] text-[#57b6c2]">
          Deinstallation
        </div>
        <h2 className="mt-2 text-3xl font-bold text-[#f4f6fa]">KosmoOrbit wieder entfernen</h2>
        <p className="mt-3 text-sm leading-7 text-[#b6bdcb]">
          KosmoOrbit ist eine Tauri-Desktop-App ohne eigenen Deinstaller — das Entfernen läuft über den
          Weg deines Betriebssystems, wie bei jeder anderen Desktop-Anwendung.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {schritte.map((gruppe) => (
          <article key={gruppe.os} className="rounded-lg border border-white/10 bg-[#14171f] p-5">
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-lg border border-white/10 bg-[#101319] text-[#57b6c2]">
                <Trash2 className="h-[19px] w-[19px]" aria-hidden="true" />
              </span>
              <h3 className="text-lg font-bold text-[#f4f6fa]">{gruppe.os}</h3>
            </div>
            <ol className="mt-4 space-y-2.5 text-sm leading-6 text-[#b6bdcb]">
              {gruppe.steps.map((step, i) => (
                <li key={i} className="flex gap-2">
                  <span className="font-mono text-[#57b6c2]">{i + 1}.</span>
                  <span>{step}</span>
                </li>
              ))}
            </ol>
          </article>
        ))}
      </div>

      <div className="mt-4 rounded-lg border border-amber-400/25 bg-amber-950/10 p-5">
        <div className="flex items-center gap-3 text-amber-200">
          <AlertTriangle className="h-[18px] w-[18px]" aria-hidden="true" />
          <span className="font-mono text-[10px] font-semibold uppercase tracking-[0.12em]">
            Was danach lokal liegen bleibt
          </span>
        </div>
        <p className="mt-3 text-sm leading-7 text-[#b6bdcb]">
          Projekte, Varianten und Einstellungen leben NICHT in einer separaten Tauri-Konfigurationsdatei, sondern
          im Speicher der eingebetteten Web-Ansicht der App (dieselbe Technik wie im Browser): der
          Projekt-Tresor liegt als IndexedDB-Datenbank{' '}
          <code className="rounded border border-white/10 bg-black/30 px-1.5 py-0.5 text-amber-200">
            kosmo-projekte
          </code>
          , Einstellungen (Thema, Anthropic-Schlüssel, Sync-Adresse …) als{' '}
          <code className="rounded border border-white/10 bg-black/30 px-1.5 py-0.5 text-amber-200">
            localStorage
          </code>
          -Einträge (Schlüssel <code className="text-amber-200">kosmo.*</code>). Beides steckt im
          WebView-Datenordner, den das Betriebssystem der App-Kennung{' '}
          <code className="rounded border border-white/10 bg-black/30 px-1.5 py-0.5 text-amber-200">
            ch.architekturkosmos.kosmoorbit
          </code>{' '}
          zuordnet — eine reine Deinstallation über die Wege oben löscht diesen Ordner bewusst NICHT (das ist bei
          Tauri/WebView2/WKWebView/WebKitGTK so üblich, damit ein Update die Projekte nicht mitreisst).
        </p>
        <p className="mt-3 text-sm leading-7 text-[#b6bdcb]">
          <span className="font-semibold text-[#f4f6fa]">Vor dem Entfernen sichern:</span> in der Kopfleiste auf{' '}
          <em>Speichern</em> klicken — das lädt jedes offene Projekt als <code>.kosmo</code>-Datei herunter, die du
          später wieder mit <em>Öffnen</em> laden kannst.
        </p>
        <p className="mt-3 text-sm leading-7 text-[#b6bdcb]">
          <span className="font-semibold text-[#f4f6fa]">Restlos entfernen</span> (erst NACH der Deinstallation
          oben): den WebView-Datenordner der App-Kennung von Hand löschen — je nach System z. B. unter{' '}
          <code className="rounded border border-white/10 bg-black/30 px-1.5 py-0.5 text-amber-200">
            %LOCALAPPDATA%\ch.architekturkosmos.kosmoorbit
          </code>{' '}
          (Windows/WebView2),{' '}
          <code className="rounded border border-white/10 bg-black/30 px-1.5 py-0.5 text-amber-200">
            ~/Library/WebKit/ch.architekturkosmos.kosmoorbit
          </code>{' '}
          bzw.{' '}
          <code className="rounded border border-white/10 bg-black/30 px-1.5 py-0.5 text-amber-200">
            ~/Library/Application Support/ch.architekturkosmos.kosmoorbit
          </code>{' '}
          (macOS/WKWebView) oder{' '}
          <code className="rounded border border-white/10 bg-black/30 px-1.5 py-0.5 text-amber-200">
            ~/.local/share/ch.architekturkosmos.kosmoorbit
          </code>{' '}
          bzw.{' '}
          <code className="rounded border border-white/10 bg-black/30 px-1.5 py-0.5 text-amber-200">
            ~/.cache/ch.architekturkosmos.kosmoorbit
          </code>{' '}
          (Linux/WebKitGTK). Der genaue Ordnername kann je nach Betriebssystemversion leicht abweichen — im
          Zweifel im Dateimanager nach „kosmoorbit" bzw. „architekturkosmos" suchen.
        </p>
      </div>
    </section>
  );
}
