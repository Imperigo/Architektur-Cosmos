import { useEffect, useState } from 'react';
import { Badge, KButton, KIcon, KInput, Panel, moduleHue } from '@kosmo/ui';
import {
  basisIndex,
  geladeneSammlungen,
  importiereBasis,
  ingestFile,
  vektorisiereFehlende,
  type BasisSammlung,
  type ImportiereBasisFortschritt,
} from './knowledge';
import { downloadFile, isIngestable, listFolder, signIn, type DriveAccount, type DriveItem } from './onedrive';

/**
 * PC4 (`docs/V084-SPEZ.md` §5 W3, C-20) — die drei geteilten Unterflüsse aus
 * `PrepareWorkspace.tsx` UNVERÄNDERT hierher verschoben (reine Ortsverlegung,
 * JSX/Logik/Testids byte-gleich, s. Git-Diff), damit sowohl der klassische
 * Manuell-Fluss (`PrepareWorkspace.tsx`) ALS AUCH die neuen Insel-Inhalte
 * (`island/inhalte/aufnahme.tsx`/`wissen.tsx`) dieselbe Komponente
 * importieren, statt sie zu duplizieren ODER einen zirkulären Import
 * `PrepareWorkspace.tsx` ↔ `island/inhalte/*.tsx` einzugehen. «Manuell
 * unverändert» bleibt dadurch exakt bewiesen: es ist buchstäblich dieselbe
 * Funktion, nur an einem anderen Ort definiert.
 */

/** OneDrive-Browser: Anmelden (MSAL/PKCE) → Ordner durchsehen → aufnehmen. */
export function OneDriveSection({ onIngested }: { onIngested: () => void }) {
  const [clientId, setClientId] = useState(localStorage.getItem('kosmo.graph.clientId') ?? '');
  const [account, setAccount] = useState<DriveAccount | null>(null);
  const [path, setPath] = useState<{ id: string | null; name: string }[]>([{ id: null, name: 'OneDrive' }]);
  const [items, setItems] = useState<DriveItem[]>([]);
  const [status, setStatus] = useState<string | null>(null);

  async function browse(folder: { id: string | null; name: string }, pushPath: boolean) {
    setStatus('Lade …');
    try {
      const list = await listFolder(clientId, folder.id);
      setItems(list);
      if (pushPath) setPath((p) => [...p, folder]);
      setStatus(null);
    } catch (err) {
      setStatus(`⚠ ${err instanceof Error ? err.message : err}`);
    }
  }

  async function connect() {
    if (!clientId.trim()) {
      setStatus('⚠ Zuerst die Azure-Client-ID eintragen (App-Registrierung, SPA, Files.Read).');
      return;
    }
    setStatus('Anmeldung …');
    try {
      const acc = await signIn(clientId.trim());
      setAccount(acc);
      await browse({ id: null, name: 'OneDrive' }, false);
    } catch (err) {
      setStatus(`⚠ ${err instanceof Error ? err.message : err}`);
    }
  }

  async function ingest(item: DriveItem) {
    setStatus(`Nehme «${item.name}» auf …`);
    try {
      const file = await downloadFile(clientId, item.id, item.name);
      await ingestFile(file, 'onedrive');
      onIngested();
      setStatus(`«${item.name}» aufgenommen.`);
    } catch (err) {
      setStatus(`⚠ ${err instanceof Error ? err.message : err}`);
    }
  }

  return (
    <Panel className="prepare-drive">
      <div className="prepare-drive-kopf">
        <div className="prepare-drive-titel">OneDrive (Hochbauzeichner-Bibliothek)</div>
        {account && <Badge hue="var(--k-success)">{account.name}</Badge>}
      </div>
      {!account ? (
        <>
          <div className="prepare-drive-hinweis">
            Einmalig: App-Registrierung im Azure-Portal (Typ SPA, Redirect-URI = App-Adresse,
            Berechtigungen <code>Files.Read</code> + <code>User.Read</code>) — dann Client-ID hier
            eintragen und anmelden. Es fliesst kein Geheimnis (PKCE).
          </div>
          <div className="prepare-drive-anmelden">
            <KInput
              value={clientId}
              onChange={(e) => {
                setClientId(e.target.value);
                localStorage.setItem('kosmo.graph.clientId', e.target.value);
              }}
              placeholder="Azure Client-ID (GUID)"
              data-testid="graph-client-id"
              className="prepare-drive-anmelden-feld"
            />
            <KButton size="sm" tone="quiet" onClick={() => void connect()} data-testid="graph-signin">
              Mit Microsoft anmelden
            </KButton>
          </div>
        </>
      ) : (
        <>
          <div className="prepare-drive-pfad">
            {path.map((p, i) => (
              <span key={`${p.id ?? 'root'}-${i}`}>
                {i > 0 && <span className="prepare-drive-pfad-trenner"> / </span>}
                <button
                  className="prepare-drive-pfad-knopf"
                  onClick={() => {
                    setPath(path.slice(0, i + 1));
                    void browse(p, false);
                  }}
                >
                  {p.name}
                </button>
              </span>
            ))}
          </div>
          <div className="prepare-drive-liste">
            {items.map((it) => (
              <div key={it.id} className="prepare-drive-item">
                <KIcon name={it.isFolder ? 'ordner' : 'dokument'} size={14} />
                {it.isFolder ? (
                  <button className="prepare-drive-item-ordner" onClick={() => void browse({ id: it.id, name: it.name }, true)}>
                    {it.name}
                  </button>
                ) : (
                  <span className={`prepare-drive-item-datei${isIngestable(it.name) ? '' : ' prepare-drive-item-datei--gesperrt'}`}>
                    {it.name}
                  </span>
                )}
                {!it.isFolder && isIngestable(it.name) && (
                  <KButton size="sm" tone="quiet" onClick={() => void ingest(it)}>
                    Aufnehmen
                  </KButton>
                )}
              </div>
            ))}
            {items.length === 0 && <div className="prepare-drive-leer">Leerer Ordner.</div>}
          </div>
        </>
      )}
      {status && <div className="prepare-drive-status">{status}</div>}
    </Panel>
  );
}

/**
 * v0.8.2 / P7a (B2, ROADMAP 1318, `docs/V082-SPEZ.md` §6.6/C-24) —
 * `vektorisiereFehlende()` (`knowledge.ts`) bekommt hier ihren ersten
 * echten Aufrufer: Chunks, die `importiereBasis`/`ingestFile` ohne Vektor
 * gespeichert haben (Bridge zum Aufnahme-Zeitpunkt nicht erreichbar), sind
 * über BM25 weiter auffindbar, aber ohne den semantischen Cosine-Pfad —
 * dieser Knopf holt das nach, sobald die Bridge wieder da ist. EHRLICHES
 * Ergebnis statt stiller Erfolgsmeldung: `vektorisiert < gesamt` (Bridge
 * wieder weg mitten im Nachlauf) sagt das wörtlich, `gesamt === 0` sagt
 * «bereits vollständig vektorisiert» statt einer bedeutungslosen «0 von 0».
 */
export function NachtraeglichVektorisierenSection() {
  const [laufend, setLaufend] = useState(false);
  const [fortschritt, setFortschritt] = useState<{ erledigt: number; gesamt: number } | null>(null);
  const [ergebnis, setErgebnis] = useState<{ gesamt: number; vektorisiert: number } | null>(null);
  const [fehler, setFehler] = useState<string | null>(null);

  function starten() {
    setLaufend(true);
    setErgebnis(null);
    setFehler(null);
    setFortschritt(null);
    vektorisiereFehlende({ onProgress: (f) => setFortschritt(f) })
      .then((res) => setErgebnis(res))
      .catch((err) => setFehler(err instanceof Error ? err.message : String(err)))
      .finally(() => setLaufend(false));
  }

  return (
    <div className="prepare-sektion" data-testid="vektorisieren-sektion">
      <KButton size="sm" tone="quiet" data-testid="vektorisiere-fehlende" disabled={laufend} onClick={starten}>
        {laufend ? 'Vektorisiere …' : 'Nachträglich vektorisieren'}
      </KButton>
      {laufend && fortschritt && (
        <span className="prepare-treffer-kopf" data-testid="vektorisieren-fortschritt">
          {' '}
          {fortschritt.erledigt} / {fortschritt.gesamt} Abschnitte
        </span>
      )}
      {!laufend && ergebnis && (
        <div className="prepare-doc-meta" data-testid="vektorisieren-ergebnis">
          {ergebnis.gesamt === 0
            ? 'Alle Abschnitte sind bereits vektorisiert.'
            : ergebnis.vektorisiert === ergebnis.gesamt
              ? `${ergebnis.vektorisiert} von ${ergebnis.gesamt} Abschnitten nachträglich vektorisiert.`
              : `${ergebnis.vektorisiert} von ${ergebnis.gesamt} Abschnitten vektorisiert — Bridge nicht (mehr) erreichbar, Rest bleibt über die Stichwort-Suche auffindbar.`}
        </div>
      )}
      {fehler && <div className="prepare-ingest-fehler">⚠ {fehler}</div>}
    </div>
  );
}

/** Bauwissen-Basis: wissen/-Korpora aus dem Kosmos-Repo, je Sammlung ladbar. */
export function BasisSection({ onGeladen }: { onGeladen: () => void }) {
  const [sammlungen, setSammlungen] = useState<BasisSammlung[]>([]);
  const [geladen, setGeladen] = useState<Set<string>>(new Set());
  const [laufend, setLaufend] = useState<string | null>(null);
  const [fehler, setFehler] = useState<string | null>(null);
  // v0.8.2 / P7a (B2, ROADMAP 1318): `importiereBasis`s `onProgress`-Callback
  // (seit v0.8.1/KI1 gebaut, s. `knowledge.ts`) bekommt hier seinen ersten
  // Aufrufer — je Sammlung der zuletzt gemeldete Fortschritt, damit die
  // Ladeanzeige bei grossen Korpora (~22'883 Abschnitte bei `buecher`) mehr
  // sagt als ein unbestimmtes «Lade …».
  const [fortschritt, setFortschritt] = useState<ImportiereBasisFortschritt | null>(null);
  useEffect(() => {
    void basisIndex().then(setSammlungen);
    void geladeneSammlungen().then(setGeladen);
  }, []);
  if (sammlungen.length === 0) return null;
  return (
    <div className="prepare-sektion" data-testid="basis-sektion">
      <div className="prepare-sektion-titel">Bauwissen-Basis (Kosmos-Bibliothek)</div>
      {sammlungen.map((sa) => (
        <Panel key={sa.sammlung} data-testid={`basis-${sa.sammlung}`} className="prepare-doc-zeile">
          <div className="prepare-doc-info">
            <div className="prepare-doc-name">{sa.label}</div>
            <div className="prepare-doc-meta">
              {sa.quellen} Quellen · {sa.chunks} Abschnitte · {(sa.kb / 1024).toFixed(1)} MB
            </div>
            {laufend === sa.sammlung && fortschritt && (
              <div className="prepare-doc-meta" data-testid={`basis-fortschritt-${sa.sammlung}`}>
                Quelle {fortschritt.quelle} / {fortschritt.quellenGesamt} · {fortschritt.chunksVektorisiert} /{' '}
                {fortschritt.chunksGesamt} Abschnitte vektorisiert
              </div>
            )}
          </div>
          {geladen.has(sa.sammlung) ? (
            <Badge hue={moduleHue.prepare}>geladen</Badge>
          ) : (
            <KButton
              size="sm"
              tone="quiet"
              data-testid={`basis-laden-${sa.sammlung}`}
              disabled={laufend !== null}
              onClick={() => {
                setLaufend(sa.sammlung);
                setFehler(null);
                setFortschritt(null);
                importiereBasis(sa.sammlung, { onProgress: (f) => setFortschritt(f) })
                  .then(() => {
                    setGeladen((g) => new Set([...g, sa.sammlung]));
                    onGeladen();
                  })
                  .catch((err) => setFehler(err instanceof Error ? err.message : String(err)))
                  .finally(() => setLaufend(null));
              }}
            >
              {laufend === sa.sammlung ? 'Lade …' : 'Laden'}
            </KButton>
          )}
        </Panel>
      ))}
      {fehler && <div className="prepare-ingest-fehler">⚠ {fehler}</div>}
    </div>
  );
}
