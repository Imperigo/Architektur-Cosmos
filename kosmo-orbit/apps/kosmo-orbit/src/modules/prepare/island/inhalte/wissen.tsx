import { useEffect, useRef, useState } from 'react';
import { KInput } from '@kosmo/ui';
import { searchKnowledge, type KnowledgeHit } from '../../knowledge';
import { BasisSection, NachtraeglichVektorisierenSection } from '../../prepare-sections';
import { prepareInhaltsRegistry } from './registry';
import '../prepare-island.css';

/**
 * WISSEN-Insel (PC4, `docs/V084-SPEZ.md` §5 W3, C-20) — Suche (frisch,
 * ruft `searchKnowledge` direkt, Muster `PrepareWorkspace.tsx`s früheres
 * inline Suchfeld), Basis-Import und Nachträglich vektorisieren (beide
 * unverändert aus `prepare-sections.tsx` wiederverwendet — dieselbe
 * Komponente wie im Manuell-Modus, s. dortiger Kopfkommentar).
 */

function SucheInhalt() {
  const [query, setQuery] = useState('');
  const [hits, setHits] = useState<KnowledgeHit[]>([]);
  const seq = useRef(0);

  useEffect(() => {
    const q = query.trim();
    const eigeneSeq = ++seq.current;
    if (q.length < 3) {
      setHits([]);
      return;
    }
    void searchKnowledge(q, 6).then((h) => {
      if (seq.current === eigeneSeq) setHits(h);
    });
  }, [query]);

  return (
    <div className="prisl-stufe2" data-testid="island-suche-stufe2" onClick={(e) => e.stopPropagation()}>
      <KInput
        data-testid="island-knowledge-search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Wissensbasis durchsuchen …"
      />
      {hits.length > 0 && (
        <div className="prisl-liste" data-testid="island-knowledge-hits">
          {hits.map((h) => (
            <div key={h.id} className="prisl-doc-zeile" data-testid="island-knowledge-hit">
              <div>
                <div className="prisl-doc-name">
                  {h.docName} · Abschnitt {h.seq + 1}
                </div>
                <div className="prisl-doc-meta">{h.text.length > 160 ? `${h.text.slice(0, 160)} …` : h.text}</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function BasisInhalt() {
  return (
    <div className="prisl-stufe2" data-testid="island-basis-stufe2" onClick={(e) => e.stopPropagation()}>
      <BasisSection onGeladen={() => {}} />
    </div>
  );
}

function VektorisierenInhalt() {
  return (
    <div className="prisl-stufe2" data-testid="island-vektorisieren-stufe2" onClick={(e) => e.stopPropagation()}>
      <NachtraeglichVektorisierenSection />
    </div>
  );
}

prepareInhaltsRegistry.registriere('suche', { Stufe2: SucheInhalt, Stufe3: SucheInhalt });
prepareInhaltsRegistry.registriere('basis', { Stufe2: BasisInhalt, Stufe3: BasisInhalt });
prepareInhaltsRegistry.registriere('vektorisieren', { Stufe2: VektorisierenInhalt, Stufe3: VektorisierenInhalt });
