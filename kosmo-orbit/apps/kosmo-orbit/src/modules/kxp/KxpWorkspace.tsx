import { useState } from 'react';
import {
  Badge,
  Hairline,
  KButton,
  KDialog,
  KIcon,
  KInput,
  KKeyValue,
  KSelect,
  KToolbar,
  Messrahmen,
  melde,
  meldeFehler,
  moduleHue,
} from '@kosmo/ui';
import type { Sheet } from '@kosmo/kernel';
import { useProject } from '../../state/project-store';
import { downloadKxp, kxpExportVorschau } from '../../state/kxp-io';
import { useKxpViewer } from '../../state/kxp-viewer-runtime';
import { KXP_PLATZHALTER_ROLLEN, KXP_STATUS_LABEL, kxpErlaubteUebergaenge, type KxpFreigabeStatus } from '../../state/kxp-format';
import './kxp.css';

/**
 * KosmoTrust — `.kxp`-Hyper-Modell-Viewer + Trust-Layer-Freigabe-Gerüst
 * (v0.8.1 / P11, `docs/V081-SPEZ.md` §7(a)/§9 C-29). Eigener Screen (kein
 * Umbau von `PublishWorkspace`/`KosmoPackage` — die Formathülle bleibt
 * eigenständig, s. Kommentar `state/kxp-format.ts`).
 *
 * Zwei Wege in dieser einen Station:
 *  1. **Export** — aus dem laufenden Projekt (`useProject`) ein `.kxp`
 *     bauen, mit Vorschau VOR dem Download (Export-Dialog).
 *  2. **Viewer + Freigabe** — ein `.kxp` (egal ob aus diesem oder einem
 *     anderen Projekt) read-only öffnen, Metadaten/Inhalte/Trust-Status
 *     zeigen, die Freigabe-Zustandsmaschine lokal bedienen.
 *
 * Ehrlich deklarierte Grenze (Owner-Auftrag, Spez §7(a)): eine echte
 * Signatur und eine echte Mehrbenutzer-Freigabe (wer darf was mit wem
 * teilen) brauchen ein Konto/die HomeStation — dieser Screen zeigt das
 * IMMER sichtbar (`kxp-grenze-hinweis`), nie stillschweigend verdeckt.
 */

const STATUS_HUE: Record<KxpFreigabeStatus, string> = {
  entwurf: 'var(--k-ink-faint)',
  zur_freigabe: 'var(--k-warning)',
  freigegeben: 'var(--k-success)',
  abgelehnt: 'var(--k-danger, var(--k-warning))',
};

function formatZeit(iso: string): string {
  try {
    return new Date(iso).toLocaleString('de-CH');
  } catch {
    return iso;
  }
}

/** Ein Plan-SVG sicher als Bild darstellen (`<img src="data:...">` statt
 *  `dangerouslySetInnerHTML`) — ein importiertes `.kxp` kann von ausserhalb
 *  stammen, ein eingebettetes `<script>` im SVG darf so nie ausgeführt werden. */
function planDataUrl(svg: string): string {
  return `data:image/svg+xml;base64,${btoa(unescape(encodeURIComponent(svg)))}`;
}

function ExportDialog({ onClose }: { onClose: () => void }) {
  const vorschau = kxpExportVorschau();
  return (
    <KDialog
      titel="Als .kxp exportieren"
      onClose={onClose}
      data-testid="kxp-export-dialog"
      fusszeile={
        <>
          <KButton size="sm" tone="ghost" onClick={onClose}>
            Abbrechen
          </KButton>
          <KButton
            size="sm"
            tone="accent"
            data-testid="kxp-export-bestaetigen"
            onClick={() => {
              downloadKxp();
              melde(`«${vorschau.projektName}.kxp» heruntergeladen.`, { ton: 'erfolg' });
              onClose();
            }}
          >
            Herunterladen
          </KButton>
        </>
      }
    >
      <p className="kxp-export-text">
        Das Paket bündelt den aktuellen Stand von «{vorschau.projektName}» — Modell, Journal und
        die vorhandenen Pläne — unter einem Dach («Hyper-Modell»).
      </p>
      <KKeyValue
        zeilen={[
          { key: 'Modell', wert: 'model/model.json (vollständiger Doc-Stand)' },
          { key: 'Journal-Einträge', wert: String(vorschau.journalAnzahl) },
          {
            key: 'Pläne',
            wert:
              vorschau.blaetterAnzahl > 0
                ? `${vorschau.blaetterAnzahl} Blatt-SVG(s)`
                : 'keine — dieses Projekt hat noch keine Blätter angelegt',
          },
          { key: 'Trust-Status', wert: 'Entwurf (Verlauf beginnt leer)' },
          { key: 'Signatur', wert: 'unsigniert — Trust-Layer braucht Konten/HomeStation' },
        ]}
      />
    </KDialog>
  );
}

function TrustGrenzeHinweis() {
  return (
    <div data-testid="kxp-grenze-hinweis" className="kxp-grenze">
      <KIcon name="schloss" size={14} style={{ color: 'var(--k-warning)' }} />
      <span>
        Diese Zustandsmaschine läuft vollständig lokal, mit Platzhalter-Rollen statt echten
        Konten. Eine echte Signatur und eine echte Mehrbenutzer-Freigabe (wer darf was mit wem
        teilen) brauchen ein Konto bzw. die HomeStation — beides fehlt in diesem Container
        bewusst, statt vorgetäuscht zu werden.
      </span>
    </div>
  );
}

function FreigabeAktionen() {
  const paket = useKxpViewer((s) => s.paket);
  const wechsleStatus = useKxpViewer((s) => s.wechsleStatus);
  const ladeAktuellenStandHerunter = useKxpViewer((s) => s.ladeAktuellenStandHerunter);
  const [rolle, setRolle] = useState<string>(KXP_PLATZHALTER_ROLLEN[0]);
  const [notiz, setNotiz] = useState('');
  if (!paket) return null;
  const erlaubt = kxpErlaubteUebergaenge(paket.manifest.trust.status);

  return (
    <div className="kxp-freigabe-aktionen" data-testid="kxp-freigabe-aktionen">
      <KSelect
        data-testid="kxp-rolle-wahl"
        value={rolle}
        onChange={(e) => setRolle(e.target.value)}
      >
        {KXP_PLATZHALTER_ROLLEN.map((r) => (
          <option key={r} value={r}>
            {r}
          </option>
        ))}
      </KSelect>
      <KInput
        data-testid="kxp-notiz"
        placeholder="Notiz (optional)"
        value={notiz}
        onChange={(e) => setNotiz(e.target.value)}
      />
      <div className="kxp-freigabe-knoepfe">
        {erlaubt.length === 0 && (
          <span className="kxp-freigabe-terminal">Freigegeben — kein weiterer Übergang im Gerüst.</span>
        )}
        {erlaubt.map((nach) => (
          <KButton
            key={nach}
            size="sm"
            tone={nach === 'abgelehnt' ? 'danger' : nach === 'freigegeben' ? 'accent' : 'quiet'}
            data-testid={`kxp-uebergang-${nach}`}
            onClick={() => {
              const ergebnis = wechsleStatus(nach, rolle, notiz);
              if (!ergebnis.ok) {
                meldeFehler(ergebnis.fehler);
                return;
              }
              setNotiz('');
              melde(`Status → ${KXP_STATUS_LABEL[nach]}`, { ton: 'erfolg' });
            }}
          >
            → {KXP_STATUS_LABEL[nach]}
          </KButton>
        ))}
      </div>
      {paket.unheruntergeladeneAenderung && (
        <div className="kxp-unheruntergeladen">
          <span>Der Freigabe-Verlauf hat sich geändert — im geöffneten Fenster, noch nicht als Datei gesichert.</span>
          <KButton size="sm" tone="ghost" data-testid="kxp-re-export" onClick={ladeAktuellenStandHerunter}>
            Aktualisiertes Paket herunterladen
          </KButton>
        </div>
      )}
    </div>
  );
}

function PaketViewer() {
  const paket = useKxpViewer((s) => s.paket);
  const schliessen = useKxpViewer((s) => s.schliessen);
  if (!paket) return null;
  const { manifest, doc, journal, plaene } = paket;
  const storeys = doc.storeysOrdered();
  const sheets = doc.byKind<Sheet>('sheet');

  return (
    <div data-testid="kxp-viewer" className="kxp-viewer">
      <div className="kxp-viewer-kopf">
        <Badge hue={moduleHue.trust}>{manifest.name}</Badge>
        <span data-testid="kxp-trust-status">
          <Badge hue={STATUS_HUE[manifest.trust.status]}>{KXP_STATUS_LABEL[manifest.trust.status]}</Badge>
        </span>
        <div className="kxp-fill" />
        <KButton size="sm" tone="ghost" data-testid="kxp-schliessen" onClick={schliessen}>
          Schliessen
        </KButton>
      </div>

      <div className="kxp-label">Manifest</div>
      <KKeyValue
        data-testid="kxp-manifest"
        zeilen={[
          { key: 'Herkunfts-Projekt', wert: manifest.quelle_projekt.name },
          { key: 'Exportiert am', wert: formatZeit(manifest.exportiert_um) },
          { key: 'Geschosse (Modell)', wert: String(storeys.length) },
          { key: 'Blätter (Modell)', wert: String(sheets.length) },
          { key: 'Journal-Einträge', wert: String(journal.length) },
          { key: 'Pläne im Paket', wert: String(plaene.length) },
          { key: 'Signatur', wert: manifest.trust.signatur.hinweis },
        ]}
      />

      {plaene.length > 0 && (
        <>
          <div className="kxp-label">Pläne</div>
          <div data-testid="kxp-plaene" className="kxp-plaene-grid">
            {plaene.map((p) => (
              <details key={p.name} className="kxp-plan-karte">
                <summary>{p.name}</summary>
                <img src={planDataUrl(p.svg)} alt={p.name} className="kxp-plan-bild" />
              </details>
            ))}
          </div>
        </>
      )}

      <div className="kxp-label">Trust-Layer · Freigabe-Workflow</div>
      <TrustGrenzeHinweis />
      <FreigabeAktionen />

      {manifest.trust.verlauf.length > 0 && (
        <>
          <div className="kxp-label">Verlauf</div>
          <ol data-testid="kxp-verlauf" className="kxp-verlauf-liste">
            {manifest.trust.verlauf.map((e, i) => (
              <li key={i} data-testid="kxp-verlauf-eintrag">
                <span className="kxp-mono">{formatZeit(e.ts)}</span>
                <span>
                  {e.von ? KXP_STATUS_LABEL[e.von] : '—'} → {KXP_STATUS_LABEL[e.nach]}
                </span>
                <span className="kxp-c-soft">{e.akteur}</span>
                {e.notiz && <span className="kxp-c-faint">«{e.notiz}»</span>}
              </li>
            ))}
          </ol>
        </>
      )}
    </div>
  );
}

export interface KxpWorkspaceProps {
  onEinstellungen?: () => void;
}

export function KxpWorkspace({ onEinstellungen }: KxpWorkspaceProps = {}) {
  const paket = useKxpViewer((s) => s.paket);
  const ladeFehler = useKxpViewer((s) => s.ladeFehler);
  const ladeLaeuft = useKxpViewer((s) => s.ladeLaeuft);
  const ladeDatei = useKxpViewer((s) => s.ladeDatei);
  const [exportOffen, setExportOffen] = useState(false);
  const projektName = useProject((s) => s.doc.settings.projectName);

  const oeffneDatei = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.kxp,application/zip';
    input.onchange = () => {
      const f = input.files?.[0];
      if (f) void ladeDatei(f);
    };
    input.click();
  };

  return (
    <div className="k-einblenden kxp-viewport">
      <div className="kxp-scroll">
        <div className="kxp-content">
          <div className="k-glass kxp-kopf" style={{ ['--_hue' as string]: moduleHue.trust }}>
            <KToolbar data-testid="kxp-werkzeugleiste" className="kxp-kopf-leiste">
              <Badge hue={moduleHue.trust}>KosmoTrust</Badge>
              <span className="kxp-kopf-text">.kxp-Hyper-Modell · Viewer · Trust-Layer</span>
              <div className="kxp-fill" />
              <KButton size="sm" tone="quiet" data-testid="kxp-export-oeffnen" onClick={() => setExportOffen(true)}>
                <KIcon name="plus" size={14} /> Als .kxp exportieren
              </KButton>
              <KButton size="sm" tone="ghost" data-testid="kxp-oeffnen" onClick={oeffneDatei} disabled={ladeLaeuft}>
                {ladeLaeuft ? 'Lädt …' : '.kxp-Datei öffnen'}
              </KButton>
              {onEinstellungen && (
                <KButton
                  size="sm"
                  tone="ghost"
                  data-testid="station-einstellungen-kxp"
                  title="Einstellungen — KosmoTrust"
                  aria-label="Einstellungen — KosmoTrust"
                  onClick={onEinstellungen}
                >
                  <KIcon name="zahnrad" size={14} />
                </KButton>
              )}
            </KToolbar>
          </div>
          <Hairline />

          <span className="kxp-hinweis">
            Export bündelt den Stand von «{projektName}» als <code>.kxp</code>-Paket. Der Viewer
            zeigt ein geöffnetes Paket read-only — auch ein Paket aus einem anderen Projekt.
          </span>

          {ladeFehler && (
            <div data-testid="kxp-ladefehler" className="kxp-fehler">
              <KIcon name="warnung" size={14} />
              <span>«{ladeFehler}» — die Datei wurde NICHT geladen.</span>
            </div>
          )}

          {!paket && !ladeFehler && (
            <div data-testid="kxp-leerzustand">
              <Messrahmen height={200} caption="Noch kein Paket geladen — «.kxp-Datei öffnen» oben rechts" />
            </div>
          )}

          {paket && <PaketViewer />}
        </div>
      </div>

      {exportOffen && <ExportDialog onClose={() => setExportOffen(false)} />}
    </div>
  );
}
