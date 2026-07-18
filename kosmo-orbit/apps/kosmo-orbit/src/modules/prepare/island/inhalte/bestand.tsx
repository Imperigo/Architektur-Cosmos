import { useEffect, useState } from 'react';
import { KButton, Messrahmen } from '@kosmo/ui';
import { getChunk, listDocs, removeDoc, type KnowledgeDoc } from '../../knowledge';
import { useQuellen } from '../../../../state/quellen';
import { prepareInhaltsRegistry } from './registry';
import '../prepare-island.css';

/**
 * BESTAND-Insel (PC4, `docs/V084-SPEZ.md` §5 W3, C-20) — Dokument-Liste +
 * Entfernen (frisch, liest `knowledge.ts` direkt bei jedem Mount — dieselbe
 * Frische-Garantie wie jedes andere Insel-Stufe2/3-Inhalt, das globale
 * Stores/IndexedDB direkt liest statt über Props der Bühne), Chunk-Ansicht
 * (Quellensprung aus einer Kosmo-Antwort, Muster `PrepareWorkspace.tsx`s
 * inline Sprung-Zustand — hier als eigener Insel-Inhalt statt fest im
 * zentralen Layout).
 */

function DokumenteInhalt() {
  const [docs, setDocs] = useState<KnowledgeDoc[]>([]);
  const refresh = () => void listDocs().then(setDocs);
  useEffect(refresh, []);

  const eigene = docs.filter((d) => d.source !== 'basis');

  return (
    <div className="prisl-stufe2" data-testid="island-dokumente-stufe2" onClick={(e) => e.stopPropagation()}>
      <p className="prisl-hinweis-klein">
        {eigene.length} {eigene.length === 1 ? 'Dokument' : 'Dokumente'} (ohne Basis-Bibliothek)
      </p>
      {eigene.length === 0 ? (
        <Messrahmen height={100} caption="Noch nichts aufgenommen — AUFNAHME (links)" />
      ) : (
        <div className="prisl-liste" data-testid="island-dokumente-liste">
          {eigene.map((d) => (
            <div key={d.id} className="prisl-doc-zeile" data-testid={`island-doc-${d.id}`}>
              <div>
                <div className="prisl-doc-name">{d.name}</div>
                <div className="prisl-doc-meta">
                  {d.chunkCount} Abschnitte · {d.source}
                </div>
              </div>
              <KButton
                size="sm"
                tone="ghost"
                aria-label={`${d.name} entfernen`}
                onClick={() => void removeDoc(d.id).then(refresh)}
              >
                Entfernen
              </KButton>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function ChunkInhalt() {
  const ziel = useQuellen((s) => s.ziel);
  const zielSeq = useQuellen((s) => s.zielSeq);
  const [sprung, setSprung] = useState<{ titel: string; text: string } | null>(null);

  useEffect(() => {
    if (!ziel || ziel.typ !== 'wissen' || ziel.docId === undefined || ziel.seq === undefined) return;
    void getChunk(ziel.docId, ziel.seq).then((c) => setSprung({ titel: ziel.titel, text: c?.text ?? ziel.text }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [zielSeq]);

  return (
    <div className="prisl-stufe2" data-testid="island-chunk-stufe2" onClick={(e) => e.stopPropagation()}>
      {sprung ? (
        <>
          <p className="prisl-hinweis-klein" data-testid="island-chunk-titel">
            {sprung.titel}
          </p>
          <p className="prisl-hinweis">{sprung.text}</p>
        </>
      ) : (
        <p className="prisl-hinweis">
          Noch kein Quellensprung — erscheint, sobald Kosmo aus einer Antwort mit [Qn] auf einen Abschnitt zitiert.
        </p>
      )}
    </div>
  );
}

prepareInhaltsRegistry.registriere('dokumente', { Stufe2: DokumenteInhalt, Stufe3: DokumenteInhalt });
prepareInhaltsRegistry.registriere('chunk', { Stufe2: ChunkInhalt, Stufe3: ChunkInhalt });
