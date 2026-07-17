import { useProject } from '../../state/project-store';
import { useEffect, useRef, useState } from 'react';
import { Karteikarte, Messrahmen, Badge, KButton, KIcon, KInput, KSelect, KToolbar, Panel, moduleHue } from '@kosmo/ui';
import {
  basisIndex,
  geladeneSammlungen,
  getChunk,
  importiereBasis,
  ingestFile,
  listDocs,
  removeDoc,
  searchKnowledge,
  vektorisiereFehlende,
  type BasisSammlung,
  type ImportiereBasisFortschritt,
  type KnowledgeDoc,
  type KnowledgeHit,
} from './knowledge';
import { useQuellen } from '../../state/quellen';
import {
  downloadFile,
  isIngestable,
  listFolder,
  signIn,
  type DriveAccount,
  type DriveItem,
} from './onedrive';
import './prepare.css';

/**
 * KosmoPrepare — Grundlagen. Bürodokumente (Normen-Auszüge, Wettbewerbs-
 * programme, Hochbauzeichner-Bibliothek) werden lokal aufgenommen; Kosmo
 * zitiert daraus über «quellen_suchen» mit [Qn]-Belegen. OneDrive-Anbindung (Graph-Login)
 * folgt — die Wissensbasis ist dieselbe.
 *
 * v0.8.0B / W8c-A (Spez §2/§3, Owner-Entscheid 16.07. «Scope-Blindpunkt jetzt
 * nachziehen»): reiner Visual-Umbau auf `prepare.css` (Muster `publish.css`/
 * `data.css`) — Inline-Styles 60→<5 (Rest: Modul-Hue-Carrier `--_hue`).
 * **Signal-Audit:** «Dateien wählen» bleibt die EINE gefüllte Signal-Fläche
 * der Station (der Eintrittspunkt der Wissensaufnahme, Gesetz 1); Dossier-
 * «Übernehmen», Basis-«Laden» und OneDrive-«Anmelden» sind Neben-/
 * Abschluss-Aktionen ihrer eigenen (optionalen) Unterflüsse → `tone="quiet"`.
 */

export function PrepareWorkspace() {
  const [docs, setDocs] = useState<KnowledgeDoc[]>([]);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [hits, setHits] = useState<KnowledgeHit[]>([]);
  const [dragOver, setDragOver] = useState(false);
  const searchSeq = useRef(0);

  const refresh = () => void listDocs().then(setDocs);
  useEffect(refresh, []);

  // Quellensprung aus einer Kosmo-Antwort: zitierten Abschnitt zeigen
  const ziel = useQuellen((s) => s.ziel);
  const zielSeq = useQuellen((s) => s.zielSeq);
  const [sprung, setSprung] = useState<{ titel: string; text: string } | null>(null);
  const sprungRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!ziel || ziel.typ !== 'wissen' || ziel.docId === undefined || ziel.seq === undefined) return;
    void getChunk(ziel.docId, ziel.seq).then((c) => {
      setSprung({ titel: ziel.titel, text: c?.text ?? ziel.text });
      setTimeout(() => sprungRef.current?.scrollIntoView({ block: 'start', behavior: 'smooth' }), 60);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [zielSeq]);

  useEffect(() => {
    const q = query.trim();
    const seq = ++searchSeq.current;
    if (q.length < 3) {
      setHits([]);
      return;
    }
    void searchKnowledge(q, 6).then((h) => {
      if (searchSeq.current === seq) setHits(h);
    });
  }, [query]);

  async function addFiles(files: FileList | File[]) {
    setError(null);
    for (const f of Array.from(files)) {
      setBusy(f.name);
      try {
        await ingestFile(f);
      } catch (err) {
        setError(err instanceof Error ? err.message : String(err));
      }
    }
    setBusy(null);
    refresh();
  }

  function pickFiles() {
    const input = document.createElement('input');
    input.type = 'file';
    input.multiple = true;
    input.accept = '.pdf,.txt,.md,text/plain,application/pdf';
    input.onchange = () => input.files && void addFiles(input.files);
    input.click();
  }

  return (
    <div className="prepare-viewport">
      <div className="prepare-content">
        {/* Kosmos-Kopf — reine Kopf-/Rahmen-Optik (Glass + Modul-Tönung),
            Inhalt/Testids/Logik der Werkzeugleiste unverändert. */}
        <div className="k-glass prepare-kopf" style={{ ['--_hue' as string]: moduleHue.prepare }}>
          <KToolbar data-testid="prepare-werkzeugleiste" className="prepare-kopf-leiste">
            <Badge hue={moduleHue.prepare}>Grundlagen</Badge>
            <span className="prepare-kopf-satz">
              Lokal aufgenommen — Dokumente verlassen das Gerät nie. Kosmo zitiert daraus.
            </span>
          </KToolbar>
        </div>

        {/* Quellensprung: der von Kosmo zitierte Abschnitt, hervorgehoben */}
        {sprung && (
          <div ref={sprungRef}>
            <Panel data-testid="quelle-sprung" className="prepare-sprung">
              <div className="prepare-sprung-kopf">
                <span className="k-titel prepare-sprung-titel">Quellensprung</span>
                <span className="prepare-sprung-quelle">{sprung.titel}</span>
                <div className="prepare-dossier-spacer" />
                <KButton size="sm" tone="ghost" onClick={() => setSprung(null)} aria-label="Quellensprung schliessen">
                  <KIcon name="schliessen" size={14} title="Quellensprung schliessen" />
                </KButton>
              </div>
              <div className="prepare-sprung-text">{sprung.text}</div>
            </Panel>
          </div>
        )}

        {/* Aufnahme-Zone — Glass + dezente Prepare-Hue-Note (40%) im
            Ruhezustand; der aktive Drag-Zustand (Akzentfarbe/-Wash) bleibt
            unverändert Vorrang. */}
        <Panel
          className={`k-glass prepare-ingest${dragOver ? ' prepare-ingest--drag' : ''}`}
          data-testid="ingest-zone"
          style={{ ['--_hue' as string]: moduleHue.prepare }}
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragOver(false);
            if (e.dataTransfer.files.length) void addFiles(e.dataTransfer.files);
          }}
        >
          <div className="prepare-ingest-titel">
            PDF, Text oder Markdown hierher ziehen
          </div>
          <div className="prepare-ingest-hinweis">
            Normen-Auszüge · Wettbewerbsprogramme · Baubeschriebe · Detailbibliothek
          </div>
          <KButton size="sm" tone="accent" onClick={pickFiles} data-testid="pick-files">
            Dateien wählen
          </KButton>
          {busy && (
            <div className="prepare-ingest-status">
              Nehme «{busy}» auf …
            </div>
          )}
          {error && (
            <div className="prepare-ingest-fehler">⚠ {error}</div>
          )}
        </Panel>

        {/* Suche */}
        <div>
          <KInput
            data-testid="knowledge-search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Wissensbasis durchsuchen … (z.B. «Brandschutz Treppenhaus»)"
            className="prepare-w-full"
          />
          {hits.length > 0 && (
            <div className="prepare-treffer-liste">
              {hits.map((h) => (
                <Panel
                  key={h.id}
                  className="k-glass prepare-treffer"
                  data-testid="knowledge-hit"
                  style={{ ['--_hue' as string]: moduleHue.prepare }}
                >
                  <div className="prepare-treffer-kopf">
                    {h.docName} · Abschnitt {h.seq + 1}
                  </div>
                  <div className="prepare-treffer-text">
                    {h.text.length > 320 ? `${h.text.slice(0, 320)} …` : h.text}
                  </div>
                </Panel>
              ))}
            </div>
          )}
        </div>

        <NachtraeglichVektorisierenSection />

        <BasisSection onGeladen={refresh} />

        {/* Dokumente (Basis-Sammlungen erscheinen kompakt oben, nicht als Einzelzeilen) */}
        <div className="prepare-sektion">
          <div className="prepare-sektion-titel">
            Aufgenommen ({docs.filter((d) => d.source !== 'basis').length})
          </div>
          {docs.filter((d) => d.source !== 'basis').length === 0 && (
            <Messrahmen
              height={180}
              caption="Noch keine Grundlagen — sobald Dokumente da sind, beantwortet Kosmo Fragen daraus"
            />
          )}
          {docs.filter((d) => d.source !== 'basis').map((d) => (
            <Panel key={d.id} data-testid={`doc-${d.id}`} className="prepare-doc-zeile">
              <div className="prepare-doc-info">
                <div className="prepare-doc-name">
                  {d.name}
                </div>
                <div className="prepare-doc-meta">
                  {d.pages ? `${d.pages} ${d.pages === 1 ? 'Seite' : 'Seiten'} · ` : ''}
                  {d.chunkCount} Abschnitte · {new Date(d.addedAt).toLocaleDateString('de-CH')} · {d.source}
                </div>
              </div>
              <KButton
                size="sm"
                tone="ghost"
                onClick={() => void removeDoc(d.id).then(refresh)}
                aria-label={`${d.name} entfernen`}
              >
                Entfernen
              </KButton>
            </Panel>
          ))}
        </div>

        <DossierSection />
        <OneDriveSection onIngested={refresh} />
      </div>
    </div>
  );
}

/** OneDrive-Browser: Anmelden (MSAL/PKCE) → Ordner durchsehen → aufnehmen. */
function OneDriveSection({ onIngested }: { onIngested: () => void }) {
  const [clientId, setClientId] = useState(localStorage.getItem('kosmo.graph.clientId') ?? '');
  const [account, setAccount] = useState<DriveAccount | null>(null);
  const [path, setPath] = useState<{ id: string | null; name: string }[]>([
    { id: null, name: 'OneDrive' },
  ]);
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
        {account && (
          <Badge hue="var(--k-success)">{account.name}</Badge>
        )}
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
                  <button
                    className="prepare-drive-item-ordner"
                    onClick={() => void browse({ id: it.id, name: it.name }, true)}
                  >
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
            {items.length === 0 && (
              <div className="prepare-drive-leer">Leerer Ordner.</div>
            )}
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
function NachtraeglichVektorisierenSection() {
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
      <KButton
        size="sm"
        tone="quiet"
        data-testid="vektorisiere-fehlende"
        disabled={laufend}
        onClick={starten}
      >
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

/** Phase 0: Wettbewerbsdossier — Do's, Don'ts, Fakten. Kosmo beachtet sie bindend. */
/** Bauwissen-Basis: wissen/-Korpora aus dem Kosmos-Repo, je Sammlung ladbar. */
function BasisSection({ onGeladen }: { onGeladen: () => void }) {
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
                Quelle {fortschritt.quelle} / {fortschritt.quellenGesamt} ·{' '}
                {fortschritt.chunksVektorisiert} / {fortschritt.chunksGesamt} Abschnitte vektorisiert
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

function DossierSection() {
  const revision = useProject((s) => s.revision);
  const runCommand = useProject((s) => s.runCommand);
  const doc = useProject.getState().doc;
  // Quellensprung: zitierten Dossier-Eintrag markieren
  const ziel = useQuellen((s) => s.ziel);
  const zielSeq = useQuellen((s) => s.zielSeq);
  const dossierSprungRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (ziel?.typ === 'dossier') {
      setTimeout(() => dossierSprungRef.current?.scrollIntoView({ block: 'center', behavior: 'smooth' }), 60);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [zielSeq]);
  // Entwurf lokal, «Übernehmen» = ein Undo-Schritt
  const [entwurf, setEntwurf] = useState<{ typ: 'do' | 'dont' | 'fakt'; text: string }[]>(() =>
    doc.settings.dossier.length > 0 ? [...doc.settings.dossier] : [{ typ: 'dont', text: '' }],
  );
  void revision;

  const TYPEN = [
    { key: 'do', label: 'Gefordert' },
    { key: 'dont', label: 'No-go' },
    { key: 'fakt', label: 'Fakt' },
  ] as const;

  return (
    // Glass-Rahmen + dezente Prepare-Hue-Note (40%) um den ganzen
    // Dossier-Block — reine Kartenoptik, Inhalt/Testid/Logik unverändert.
    <div className="k-glass prepare-dossier" style={{ ['--_hue' as string]: moduleHue.prepare }} data-testid="dossier">
      <div className="k-titel prepare-dossier-titel">Phase 0 — Wettbewerbsdossier</div>
      <span className="prepare-dossier-satz">
        Harte Regeln und Fakten aus dem Programm. Kosmo behandelt sie in jeder Antwort als bindend.
      </span>
      {entwurf.map((e, i) => (
        <div key={i} className="prepare-dossier-zeile">
          <KSelect
            size="sm"
            value={e.typ}
            data-testid={`dossier-typ-${i}`}
            onChange={(ev) => {
              const next = [...entwurf];
              next[i] = { ...e, typ: ev.target.value as 'do' | 'dont' | 'fakt' };
              setEntwurf(next);
            }}
          >
            {TYPEN.map((t) => (
              <option key={t.key} value={t.key}>{t.label}</option>
            ))}
          </KSelect>
          <KInput
            size="sm"
            value={e.text}
            data-testid={`dossier-text-${i}`}
            placeholder="z.B. «Nordwohnungen ohne Direktsonne sind ein No-go»"
            onChange={(ev) => {
              const next = [...entwurf];
              next[i] = { ...e, text: ev.target.value };
              setEntwurf(next);
            }}
            className="prepare-dossier-input"
          />
          <KButton size="sm" tone="ghost" onClick={() => setEntwurf(entwurf.filter((_, j) => j !== i))} aria-label="Eintrag entfernen">
            <KIcon name="minus" size={14} title="Eintrag entfernen" />
          </KButton>
        </div>
      ))}
      <div className="prepare-dossier-fuss">
        <KButton size="sm" tone="ghost" onClick={() => setEntwurf([...entwurf, { typ: 'do', text: '' }])}>
          <KIcon name="plus" size={14} /> Eintrag
        </KButton>
        <div className="prepare-dossier-spacer" />
        <KButton
          size="sm"
          tone="quiet"
          data-testid="dossier-uebernehmen"
          onClick={() => runCommand('design.dossierSetzen', { eintraege: entwurf.filter((e) => e.text.trim().length > 0) })}
        >
          Übernehmen
        </KButton>
      </div>
      {doc.settings.dossier.length > 0 && (
        <div className="prepare-sektion">
          {doc.settings.dossier.map((e, i) => {
            const zitiert = ziel?.typ === 'dossier' && ziel.index === i;
            return (
            <div
              key={i}
              ref={zitiert ? dossierSprungRef : undefined}
              {...(zitiert ? { 'data-testid': 'quelle-sprung-dossier' } : {})}
              className={zitiert ? 'prepare-dossier-eintrag--zitiert' : undefined}
            >
              <Karteikarte nr={i + 1}>
                <div className="prepare-dossier-zeile">
                  <span
                    className={`prepare-dossier-typ prepare-dossier-typ--${e.typ}`}
                  >
                    {e.typ === 'dont' ? 'NO-GO' : e.typ === 'do' ? 'GEFORDERT' : 'FAKT'}
                  </span>
                  <span className="prepare-dossier-eintrag-text">{e.text}</span>
                </div>
              </Karteikarte>
            </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
