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
  type BasisSammlung,
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
    <div style={{ position: 'absolute', inset: 0, overflow: 'auto', padding: 'var(--k-s6)' }}>
      <div style={{ maxWidth: 860, margin: '0 auto', display: 'grid', gap: 'var(--k-s5)' }}>
        {/* v0.7.7 Stream C1: Kosmos-Kopf — reine Kopf-/Rahmen-Optik (Glass +
            Modul-Tönung, analog dem additiven Kosmos-Token-Fundament aus
            v0.7.6), Inhalt/Testids/Logik der Werkzeugleiste unverändert. */}
        <div className="k-glass" style={{ borderTopColor: `color-mix(in srgb, ${moduleHue.prepare} 65%, var(--k-glass-stroke, var(--k-line)))`, borderTopWidth: 2 }}>
          <KToolbar data-testid="prepare-werkzeugleiste" style={{ background: 'transparent', borderBottom: 'none' }}>
            <Badge hue={moduleHue.prepare}>Grundlagen</Badge>
            <span style={{ fontSize: 'var(--k-t-md)', color: 'var(--k-ink-faint)' }}>
              Lokal aufgenommen — Dokumente verlassen das Gerät nie. Kosmo zitiert daraus.
            </span>
          </KToolbar>
        </div>

        {/* Quellensprung: der von Kosmo zitierte Abschnitt, hervorgehoben */}
        {sprung && (
          <div ref={sprungRef}>
            <Panel data-testid="quelle-sprung" style={{ padding: 'var(--k-s4)', borderColor: 'var(--k-accent)', display: 'grid', gap: 'var(--k-s2)' }}>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 'var(--k-s3)' }}>
                <span className="k-titel" style={{ fontSize: 'var(--k-t-sm)', color: 'var(--k-accent)' }}>Quellensprung</span>
                <span style={{ fontSize: 'var(--k-t-sm)', color: 'var(--k-ink-faint)' }}>{sprung.titel}</span>
                <div style={{ flex: 1 }} />
                <KButton size="sm" tone="ghost" onClick={() => setSprung(null)} aria-label="Quellensprung schliessen">
                  <KIcon name="schliessen" size={14} title="Quellensprung schliessen" />
                </KButton>
              </div>
              <div style={{ fontSize: 'var(--k-t-md)', lineHeight: 1.55, whiteSpace: 'pre-wrap' }}>{sprung.text}</div>
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
            padding: 'var(--k-s6)',
            textAlign: 'center',
            borderStyle: 'dashed',
            borderColor: dragOver ? 'var(--k-accent)' : 'var(--k-line-strong)',
            background: dragOver ? 'var(--k-accent-wash)' : 'var(--k-surface)',
          }}
        >
          <div style={{ fontWeight: 550, marginBottom: 'var(--k-s2)' }}>
            PDF, Text oder Markdown hierher ziehen
          </div>
          <div style={{ fontSize: 'var(--k-t-sm)', color: 'var(--k-ink-faint)', marginBottom: 'var(--k-s4)' }}>
            Normen-Auszüge · Wettbewerbsprogramme · Baubeschriebe · Detailbibliothek
          </div>
          <KButton size="sm" tone="accent" onClick={pickFiles} data-testid="pick-files">
            Dateien wählen
          </KButton>
          {busy && (
            <div style={{ marginTop: 'var(--k-s3)', fontSize: 'var(--k-t-sm)', color: 'var(--k-ink-soft)' }}>
              Nehme «{busy}» auf …
            </div>
          )}
          {error && (
            <div style={{ marginTop: 'var(--k-s3)', fontSize: 'var(--k-t-sm)', color: 'var(--k-danger, #b3462e)' }}>⚠ {error}</div>
          )}
        </Panel>

        {/* Suche */}
        <div>
          <KInput
            data-testid="knowledge-search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Wissensbasis durchsuchen … (z.B. «Brandschutz Treppenhaus»)"
            style={{ width: '100%' }}
          />
          {hits.length > 0 && (
            <div style={{ display: 'grid', gap: 'var(--k-s3)', marginTop: 'var(--k-s3)' }}>
              {hits.map((h) => (
                <Panel key={h.id} data-testid="knowledge-hit" style={{ padding: 'var(--k-s3) var(--k-s4)' }}>
                  <div style={{ fontSize: 'var(--k-t-sm)', color: 'var(--k-ink-faint)', marginBottom: 'var(--k-s1)' }}>
                    {h.docName} · Abschnitt {h.seq + 1}
                  </div>
                  <div style={{ fontSize: 'var(--k-t-md)', lineHeight: 1.55 }}>
                    {h.text.length > 320 ? `${h.text.slice(0, 320)} …` : h.text}
                  </div>
                </Panel>
              ))}
            </div>
          )}
        </div>

        <BasisSection onGeladen={refresh} />

        {/* Dokumente (Basis-Sammlungen erscheinen kompakt oben, nicht als Einzelzeilen) */}
        <div style={{ display: 'grid', gap: 'var(--k-s3)' }}>
          <div style={{ fontWeight: 550, fontSize: 'var(--k-t-md)' }}>
            Aufgenommen ({docs.filter((d) => d.source !== 'basis').length})
          </div>
          {docs.filter((d) => d.source !== 'basis').length === 0 && (
            <Messrahmen
              height={180}
              caption="Noch keine Grundlagen — sobald Dokumente da sind, beantwortet Kosmo Fragen daraus"
            />
          )}
          {docs.filter((d) => d.source !== 'basis').map((d) => (
            <Panel
              key={d.id}
              data-testid={`doc-${d.id}`}
              style={{ padding: 'var(--k-s3) var(--k-s4)', display: 'flex', alignItems: 'center', gap: 'var(--k-s4)' }}
            >
              <div style={{ minWidth: 0, flex: 1 }}>
                <div style={{ fontWeight: 550, fontSize: 'var(--k-t-md)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {d.name}
                </div>
                <div style={{ fontSize: 'var(--k-t-sm)', color: 'var(--k-ink-faint)' }}>
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
    <Panel style={{ padding: 'var(--k-s4)', display: 'grid', gap: 'var(--k-s3)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--k-s3)' }}>
        <div style={{ fontWeight: 550, fontSize: 'var(--k-t-md)' }}>OneDrive (Hochbauzeichner-Bibliothek)</div>
        {account && (
          <Badge hue="var(--k-success)">{account.name}</Badge>
        )}
      </div>
      {!account ? (
        <>
          <div style={{ fontSize: 'var(--k-t-sm)', color: 'var(--k-ink-soft)' }}>
            Einmalig: App-Registrierung im Azure-Portal (Typ SPA, Redirect-URI = App-Adresse,
            Berechtigungen <code>Files.Read</code> + <code>User.Read</code>) — dann Client-ID hier
            eintragen und anmelden. Es fliesst kein Geheimnis (PKCE).
          </div>
          <div style={{ display: 'flex', gap: 'var(--k-s3)' }}>
            <KInput
              value={clientId}
              onChange={(e) => {
                setClientId(e.target.value);
                localStorage.setItem('kosmo.graph.clientId', e.target.value);
              }}
              placeholder="Azure Client-ID (GUID)"
              data-testid="graph-client-id"
              style={{ flex: 1 }}
            />
            <KButton size="sm" tone="accent" onClick={() => void connect()} data-testid="graph-signin">
              Mit Microsoft anmelden
            </KButton>
          </div>
        </>
      ) : (
        <>
          <div style={{ display: 'flex', gap: 'var(--k-s2)', flexWrap: 'wrap', fontSize: 'var(--k-t-sm)' }}>
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
          <div style={{ display: 'grid', gap: 'var(--k-s2)', maxHeight: 260, overflow: 'auto' }}>
            {items.map((it) => (
              <div
                key={it.id}
                style={{ display: 'flex', alignItems: 'center', gap: 'var(--k-s3)', fontSize: 'var(--k-t-md)', padding: 'var(--k-s1)' }}
              >
                <KIcon name={it.isFolder ? 'ordner' : 'dokument'} size={14} />
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
              <div style={{ fontSize: 'var(--k-t-sm)', color: 'var(--k-ink-faint)' }}>Leerer Ordner.</div>
            )}
          </div>
        </>
      )}
      {status && <div style={{ fontSize: 'var(--k-t-sm)', color: 'var(--k-ink-soft)' }}>{status}</div>}
    </Panel>
  );
}


/** Phase 0: Wettbewerbsdossier — Do's, Don'ts, Fakten. Kosmo beachtet sie bindend. */
/** Bauwissen-Basis: wissen/-Korpora aus dem Kosmos-Repo, je Sammlung ladbar. */
function BasisSection({ onGeladen }: { onGeladen: () => void }) {
  const [sammlungen, setSammlungen] = useState<BasisSammlung[]>([]);
  const [geladen, setGeladen] = useState<Set<string>>(new Set());
  const [laufend, setLaufend] = useState<string | null>(null);
  const [fehler, setFehler] = useState<string | null>(null);
  useEffect(() => {
    void basisIndex().then(setSammlungen);
    void geladeneSammlungen().then(setGeladen);
  }, []);
  if (sammlungen.length === 0) return null;
  return (
    <div style={{ display: 'grid', gap: 'var(--k-s3)' }} data-testid="basis-sektion">
      <div style={{ fontWeight: 550, fontSize: 'var(--k-t-md)' }}>Bauwissen-Basis (Kosmos-Bibliothek)</div>
      {sammlungen.map((sa) => (
        <Panel
          key={sa.sammlung}
          data-testid={`basis-${sa.sammlung}`}
          style={{ padding: 'var(--k-s3) var(--k-s4)', display: 'flex', alignItems: 'center', gap: 'var(--k-s4)' }}
        >
          <div style={{ minWidth: 0, flex: 1 }}>
            <div style={{ fontWeight: 550, fontSize: 'var(--k-t-md)' }}>{sa.label}</div>
            <div style={{ fontSize: 'var(--k-t-sm)', color: 'var(--k-ink-faint)' }}>
              {sa.quellen} Quellen · {sa.chunks} Abschnitte · {(sa.kb / 1024).toFixed(1)} MB
            </div>
          </div>
          {geladen.has(sa.sammlung) ? (
            <Badge hue={moduleHue.prepare}>geladen</Badge>
          ) : (
            <KButton
              size="sm"
              tone="accent"
              data-testid={`basis-laden-${sa.sammlung}`}
              disabled={laufend !== null}
              onClick={() => {
                setLaufend(sa.sammlung);
                setFehler(null);
                importiereBasis(sa.sammlung)
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
      {fehler && <div style={{ fontSize: 'var(--k-t-sm)', color: 'var(--k-danger, #b3462e)' }}>⚠ {fehler}</div>}
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
    <div style={{ display: 'grid', gap: 'var(--k-s3)' }} data-testid="dossier">
      <div className="k-titel" style={{ fontSize: 'var(--k-t-md)' }}>Phase 0 — Wettbewerbsdossier</div>
      <span style={{ fontSize: 'var(--k-t-sm)', color: 'var(--k-ink-faint)' }}>
        Harte Regeln und Fakten aus dem Programm. Kosmo behandelt sie in jeder Antwort als bindend.
      </span>
      {entwurf.map((e, i) => (
        <div key={i} style={{ display: 'flex', gap: 'var(--k-s2)', alignItems: 'center' }}>
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
            style={{ flex: 1 }}
          />
          <KButton size="sm" tone="ghost" onClick={() => setEntwurf(entwurf.filter((_, j) => j !== i))} aria-label="Eintrag entfernen">
            <KIcon name="minus" size={14} title="Eintrag entfernen" />
          </KButton>
        </div>
      ))}
      <div style={{ display: 'flex', gap: 'var(--k-s3)' }}>
        <KButton size="sm" tone="ghost" onClick={() => setEntwurf([...entwurf, { typ: 'do', text: '' }])}>
          <KIcon name="plus" size={14} /> Eintrag
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
        <div style={{ display: 'grid', gap: 'var(--k-s2)' }}>
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
                <div style={{ display: 'flex', gap: 'var(--k-s3)', alignItems: 'baseline', fontSize: 'var(--k-t-sm)' }}>
                  <span
                    style={{
                      fontFamily: 'var(--k-font-mono)',
                      fontSize: 'var(--k-t-xs)',
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
