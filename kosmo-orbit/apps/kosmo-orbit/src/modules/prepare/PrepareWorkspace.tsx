import { useProject } from '../../state/project-store';
import { useEffect, useRef, useState } from 'react';
import { Karteikarte, Messrahmen, Badge, KButton, Panel, moduleHue } from '@kosmo/ui';
import {
  getChunk,
  ingestFile,
  listDocs,
  removeDoc,
  searchKnowledge,
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

/**
 * KosmoPrepare — Grundlagen. Bürodokumente (Normen-Auszüge, Wettbewerbs-
 * programme, Hochbauzeichner-Bibliothek) werden lokal aufgenommen; Kosmo
 * zitiert daraus über «quellen_suchen» mit [Qn]-Belegen. OneDrive-Anbindung (Graph-Login)
 * folgt — die Wissensbasis ist dieselbe.
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
    <div style={{ position: 'absolute', inset: 0, overflow: 'auto', padding: 24 }}>
      <div style={{ maxWidth: 860, margin: '0 auto', display: 'grid', gap: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <Badge hue={moduleHue.prepare}>Grundlagen</Badge>
          <span style={{ fontSize: 13, color: 'var(--k-ink-faint)' }}>
            Lokal aufgenommen — Dokumente verlassen das Gerät nie. Kosmo zitiert daraus.
          </span>
        </div>

        {/* Quellensprung: der von Kosmo zitierte Abschnitt, hervorgehoben */}
        {sprung && (
          <div ref={sprungRef}>
            <Panel data-testid="quelle-sprung" style={{ padding: '12px 14px', borderColor: 'var(--k-accent)', display: 'grid', gap: 6 }}>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
                <span className="k-titel" style={{ fontSize: 11.5, color: 'var(--k-accent)' }}>Quellensprung</span>
                <span style={{ fontSize: 12, color: 'var(--k-ink-faint)' }}>{sprung.titel}</span>
                <div style={{ flex: 1 }} />
                <KButton size="sm" tone="ghost" onClick={() => setSprung(null)} aria-label="Quellensprung schliessen">
                  ✕
                </KButton>
              </div>
              <div style={{ fontSize: 13, lineHeight: 1.55, whiteSpace: 'pre-wrap' }}>{sprung.text}</div>
            </Panel>
          </div>
        )}

        {/* Aufnahme-Zone */}
        <Panel
          data-testid="ingest-zone"
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
          style={{
            padding: 28,
            textAlign: 'center',
            borderStyle: 'dashed',
            borderColor: dragOver ? 'var(--k-accent)' : 'var(--k-line-strong)',
            background: dragOver ? 'var(--k-accent-wash)' : 'var(--k-surface)',
          }}
        >
          <div style={{ fontWeight: 550, marginBottom: 6 }}>
            PDF, Text oder Markdown hierher ziehen
          </div>
          <div style={{ fontSize: 12.5, color: 'var(--k-ink-faint)', marginBottom: 12 }}>
            Normen-Auszüge · Wettbewerbsprogramme · Baubeschriebe · Detailbibliothek
          </div>
          <KButton size="sm" tone="accent" onClick={pickFiles} data-testid="pick-files">
            Dateien wählen
          </KButton>
          {busy && (
            <div style={{ marginTop: 10, fontSize: 12.5, color: 'var(--k-ink-soft)' }}>
              Nehme «{busy}» auf …
            </div>
          )}
          {error && (
            <div style={{ marginTop: 10, fontSize: 12.5, color: 'var(--k-danger, #b3462e)' }}>⚠ {error}</div>
          )}
        </Panel>

        {/* Suche */}
        <div>
          <input
            data-testid="knowledge-search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Wissensbasis durchsuchen … (z.B. «Brandschutz Treppenhaus»)"
            style={{
              width: '100%',
              padding: '9px 12px',
              borderRadius: 8,
              border: '1px solid var(--k-line-strong)',
              background: 'var(--k-raised)',
              fontSize: 13.5,
            }}
          />
          {hits.length > 0 && (
            <div style={{ display: 'grid', gap: 8, marginTop: 10 }}>
              {hits.map((h) => (
                <Panel key={h.id} data-testid="knowledge-hit" style={{ padding: '10px 12px' }}>
                  <div style={{ fontSize: 11.5, color: 'var(--k-ink-faint)', marginBottom: 4 }}>
                    {h.docName} · Abschnitt {h.seq + 1}
                  </div>
                  <div style={{ fontSize: 13, lineHeight: 1.55 }}>
                    {h.text.length > 320 ? `${h.text.slice(0, 320)} …` : h.text}
                  </div>
                </Panel>
              ))}
            </div>
          )}
        </div>

        {/* Dokumente */}
        <div style={{ display: 'grid', gap: 8 }}>
          <div style={{ fontWeight: 550, fontSize: 13.5 }}>
            Aufgenommen ({docs.length})
          </div>
          {docs.length === 0 && (
            <Messrahmen
              height={180}
              caption="Noch keine Grundlagen — sobald Dokumente da sind, beantwortet Kosmo Fragen daraus"
            />
          )}
          {docs.map((d) => (
            <Panel
              key={d.id}
              data-testid={`doc-${d.id}`}
              style={{ padding: '10px 12px', display: 'flex', alignItems: 'center', gap: 12 }}
            >
              <div style={{ minWidth: 0, flex: 1 }}>
                <div style={{ fontWeight: 550, fontSize: 13.5, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {d.name}
                </div>
                <div style={{ fontSize: 11.5, color: 'var(--k-ink-faint)' }}>
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
    <Panel style={{ padding: '12px 14px', display: 'grid', gap: 10 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{ fontWeight: 550, fontSize: 13.5 }}>OneDrive (Hochbauzeichner-Bibliothek)</div>
        {account && (
          <Badge hue="var(--k-success)">{account.name}</Badge>
        )}
      </div>
      {!account ? (
        <>
          <div style={{ fontSize: 12.5, color: 'var(--k-ink-soft)' }}>
            Einmalig: App-Registrierung im Azure-Portal (Typ SPA, Redirect-URI = App-Adresse,
            Berechtigungen <code>Files.Read</code> + <code>User.Read</code>) — dann Client-ID hier
            eintragen und anmelden. Es fliesst kein Geheimnis (PKCE).
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <input
              value={clientId}
              onChange={(e) => {
                setClientId(e.target.value);
                localStorage.setItem('kosmo.graph.clientId', e.target.value);
              }}
              placeholder="Azure Client-ID (GUID)"
              data-testid="graph-client-id"
              style={{
                flex: 1,
                padding: '7px 10px',
                borderRadius: 8,
                border: '1px solid var(--k-line-strong)',
                background: 'var(--k-raised)',
                fontSize: 13,
              }}
            />
            <KButton size="sm" tone="accent" onClick={() => void connect()} data-testid="graph-signin">
              Mit Microsoft anmelden
            </KButton>
          </div>
        </>
      ) : (
        <>
          <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', fontSize: 12.5 }}>
            {path.map((p, i) => (
              <span key={`${p.id ?? 'root'}-${i}`}>
                {i > 0 && <span style={{ color: 'var(--k-ink-faint)' }}> / </span>}
                <button
                  style={{ all: 'unset', cursor: 'pointer', color: 'var(--k-accent)' }}
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
          <div style={{ display: 'grid', gap: 4, maxHeight: 260, overflow: 'auto' }}>
            {items.map((it) => (
              <div
                key={it.id}
                style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, padding: '3px 2px' }}
              >
                <span>{it.isFolder ? '📁' : '📄'}</span>
                {it.isFolder ? (
                  <button
                    style={{ all: 'unset', cursor: 'pointer', flex: 1 }}
                    onClick={() => void browse({ id: it.id, name: it.name }, true)}
                  >
                    {it.name}
                  </button>
                ) : (
                  <span style={{ flex: 1, color: isIngestable(it.name) ? 'inherit' : 'var(--k-ink-faint)' }}>
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
              <div style={{ fontSize: 12.5, color: 'var(--k-ink-faint)' }}>Leerer Ordner.</div>
            )}
          </div>
        </>
      )}
      {status && <div style={{ fontSize: 12.5, color: 'var(--k-ink-soft)' }}>{status}</div>}
    </Panel>
  );
}


/** Phase 0: Wettbewerbsdossier — Do's, Don'ts, Fakten. Kosmo beachtet sie bindend. */
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
    <div style={{ display: 'grid', gap: 8 }} data-testid="dossier">
      <div className="k-titel" style={{ fontSize: 13 }}>Phase 0 — Wettbewerbsdossier</div>
      <span style={{ fontSize: 12, color: 'var(--k-ink-faint)' }}>
        Harte Regeln und Fakten aus dem Programm. Kosmo behandelt sie in jeder Antwort als bindend.
      </span>
      {entwurf.map((e, i) => (
        <div key={i} style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          <select
            value={e.typ}
            data-testid={`dossier-typ-${i}`}
            onChange={(ev) => {
              const next = [...entwurf];
              next[i] = { ...e, typ: ev.target.value as 'do' | 'dont' | 'fakt' };
              setEntwurf(next);
            }}
            style={{ padding: '4px 6px', borderRadius: 'var(--k-radius-sm)', border: '1px solid var(--k-line-strong)', background: 'var(--k-raised)', fontSize: 12 }}
          >
            {TYPEN.map((t) => (
              <option key={t.key} value={t.key}>{t.label}</option>
            ))}
          </select>
          <input
            value={e.text}
            data-testid={`dossier-text-${i}`}
            placeholder="z.B. «Nordwohnungen ohne Direktsonne sind ein No-go»"
            onChange={(ev) => {
              const next = [...entwurf];
              next[i] = { ...e, text: ev.target.value };
              setEntwurf(next);
            }}
            style={{ flex: 1, padding: '5px 8px', borderRadius: 'var(--k-radius-sm)', border: '1px solid var(--k-line-strong)', background: 'var(--k-raised)', fontSize: 12.5 }}
          />
          <KButton size="sm" tone="ghost" onClick={() => setEntwurf(entwurf.filter((_, j) => j !== i))} aria-label="Eintrag entfernen">
            −
          </KButton>
        </div>
      ))}
      <div style={{ display: 'flex', gap: 8 }}>
        <KButton size="sm" tone="ghost" onClick={() => setEntwurf([...entwurf, { typ: 'do', text: '' }])}>
          + Eintrag
        </KButton>
        <div style={{ flex: 1 }} />
        <KButton
          size="sm"
          tone="accent"
          data-testid="dossier-uebernehmen"
          onClick={() => runCommand('design.dossierSetzen', { eintraege: entwurf.filter((e) => e.text.trim().length > 0) })}
        >
          Übernehmen
        </KButton>
      </div>
      {doc.settings.dossier.length > 0 && (
        <div style={{ display: 'grid', gap: 5 }}>
          {doc.settings.dossier.map((e, i) => {
            const zitiert = ziel?.typ === 'dossier' && ziel.index === i;
            return (
            <div
              key={i}
              ref={zitiert ? dossierSprungRef : undefined}
              {...(zitiert ? { 'data-testid': 'quelle-sprung-dossier' } : {})}
              style={zitiert ? { outline: '2px solid var(--k-accent)', borderRadius: 'var(--k-radius-sm)' } : undefined}
            >
              <Karteikarte nr={i + 1}>
                <div style={{ display: 'flex', gap: 8, alignItems: 'baseline', fontSize: 12.5 }}>
                  <span
                    style={{
                      fontFamily: 'var(--k-font-mono)',
                      fontSize: 10.5,
                      fontWeight: 700,
                      color: e.typ === 'dont' ? 'var(--k-danger)' : e.typ === 'do' ? 'var(--k-success)' : 'var(--k-ink-faint)',
                    }}
                  >
                    {e.typ === 'dont' ? 'NO-GO' : e.typ === 'do' ? 'GEFORDERT' : 'FAKT'}
                  </span>
                  <span style={{ color: 'var(--k-ink-soft)', lineHeight: 1.45 }}>{e.text}</span>
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
