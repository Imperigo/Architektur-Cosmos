import { useEffect, useRef, useState } from 'react';
import { Badge, KButton, Panel, moduleHue } from '@kosmo/ui';
import {
  ingestFile,
  listDocs,
  removeDoc,
  searchKnowledge,
  type KnowledgeDoc,
  type KnowledgeHit,
} from './knowledge';

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
            <div style={{ fontSize: 13, color: 'var(--k-ink-faint)' }}>
              Noch keine Grundlagen. Sobald Dokumente da sind, beantwortet Kosmo Fragen daraus —
              frag z.B. «Was sagt das Wettbewerbsprogramm zur Nutzfläche?»
            </div>
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

        <Panel style={{ padding: '12px 14px', fontSize: 12.5, color: 'var(--k-ink-soft)' }}>
          <b>OneDrive (Hochbauzeichner-Bibliothek):</b> Die Graph-Anbindung mit Microsoft-Login
          kommt als nächster Ausbau dieses Moduls — aufgenommene Dokumente landen in derselben
          Wissensbasis. Bis dahin: Ordner lokal syncen und hier hineinziehen.
        </Panel>
      </div>
    </div>
  );
}
