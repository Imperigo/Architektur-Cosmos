import { useEffect, useRef, useState } from 'react';
import { Messrahmen, Badge, KButton, Panel, moduleHue } from '@kosmo/ui';
import {
  ingestFile,
  listDocs,
  removeDoc,
  searchKnowledge,
  type KnowledgeDoc,
  type KnowledgeHit,
} from './knowledge';
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
 * zitiert daraus über «grundlagen_suchen». OneDrive-Anbindung (Graph-Login)
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
