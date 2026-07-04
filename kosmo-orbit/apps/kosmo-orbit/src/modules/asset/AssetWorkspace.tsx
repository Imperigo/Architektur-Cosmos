import { useEffect, useRef, useState } from 'react';
import { Badge, Hairline, Karteikarte, KButton, KLade, Measure, Messrahmen, bestaetigen, melde, meldeFehler, moduleHue } from '@kosmo/ui';
import { BauteilkatalogView, MaterialkatalogView } from '../data/DataWorkspace';
import { setGlbContext } from '../design/Viewport3D';
import { listeGlb, loescheGlb, speichereGlb, type GlbObjekt } from '../../state/asset-bibliothek';

/**
 * KosmoAsset (V1-Finish P3, Owner-Q14) — die Bibliothek der Dinge:
 * Materialkarten (PBR), CH-Bauteilkatalog (Übernehmen als Aufbau) und die
 * GLB-Objekt-Bibliothek. Objekte liegen projektübergreifend in IndexedDB
 * (nie Megabytes durch Undo/Yjs); «Ins Modell» lädt sie als studierbaren
 * Referenz-Kontext in den Design-Viewport.
 */

export function AssetWorkspace() {
  const [tab, setTab] = useState<'objekte' | 'bauteile' | 'materialien'>('objekte');
  const [objekte, setObjekte] = useState<GlbObjekt[] | null>(null);

  const laden = () => {
    void listeGlb()
      .then(setObjekte)
      .catch((err) => {
        setObjekte([]);
        meldeFehler(err);
      });
  };
  useEffect(laden, []);

  const importieren = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.glb';
    input.multiple = true;
    input.onchange = async () => {
      try {
        for (const f of [...(input.files ?? [])]) await speichereGlb(f);
        laden();
        melde(`${input.files?.length ?? 0} Objekt(e) in der Bibliothek`, { ton: 'erfolg' });
      } catch (err) {
        meldeFehler(err);
      }
    };
    input.click();
  };

  return (
    <div className="k-einblenden" style={{ position: 'absolute', inset: 0, overflow: 'auto', padding: 20 }}>
      <div style={{ maxWidth: 980, margin: '0 auto', display: 'grid', gap: 14 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <Badge hue={moduleHue.asset}>KosmoAsset</Badge>
          <KButton size="sm" tone={tab === 'objekte' ? 'accent' : 'ghost'} onClick={() => setTab('objekte')} data-testid="tab-objekte">
            Objekte (GLB)
          </KButton>
          <KButton size="sm" tone={tab === 'bauteile' ? 'accent' : 'ghost'} onClick={() => setTab('bauteile')} data-testid="asset-tab-bauteile">
            Bauteilkatalog CH
          </KButton>
          <KButton size="sm" tone={tab === 'materialien' ? 'accent' : 'ghost'} onClick={() => setTab('materialien')} data-testid="asset-tab-materialien">
            Materialien
          </KButton>
          <div style={{ flex: 1 }} />
          {tab === 'objekte' && (
            <KButton size="sm" tone="accent" onClick={importieren} data-testid="glb-import">
              + GLB importieren
            </KButton>
          )}
        </div>
        <Hairline />

        {tab === 'bauteile' && <BauteilkatalogView />}
        {tab === 'materialien' && <MaterialkatalogView />}

        {tab === 'objekte' && (
          <>
            <span style={{ fontSize: 12.5, color: 'var(--k-ink-soft)' }}>
              Projektübergreifende Objekt-Bibliothek — Möbel, Bäume, Kontextbauten als GLB.
              «Ins Modell» legt das Objekt als Referenz-Kontext in den Design-Viewport
              (studierbar, nicht Teil der Pläne). Blender exportiert GLB direkt.
            </span>
            {objekte === null && <KLade text="Bibliothek laden …" height={160} />}
            {objekte !== null && objekte.length === 0 && (
              <Messrahmen height={220} caption="Noch keine Objekte — «+ GLB importieren» füllt die Bibliothek" />
            )}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 12 }}>
              {(objekte ?? []).map((o, i) => (
                <Karteikarte key={o.id} nr={i + 1}>
                  <div style={{ display: 'grid', gap: 6 }} data-testid="glb-karte">
                    <GlbVorschau objekt={o} />
                    <div style={{ display: 'flex', gap: 8, alignItems: 'baseline' }}>
                      <span style={{ fontWeight: 600, fontSize: 12.5, overflowWrap: 'anywhere' }}>{o.name}</span>
                      <div style={{ flex: 1 }} />
                      <Measure>{(o.bytes / 1024).toFixed(0)} KB</Measure>
                    </div>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <KButton
                        size="sm"
                        tone="quiet"
                        data-testid="glb-ins-modell"
                        onClick={() => {
                          const url = URL.createObjectURL(new Blob([o.daten], { type: 'model/gltf-binary' }));
                          setGlbContext(url);
                          melde(`«${o.name}» liegt als Referenz-Kontext im Design-Viewport`, { ton: 'erfolg' });
                        }}
                      >
                        Ins Modell
                      </KButton>
                      <KButton
                        size="sm"
                        tone="ghost"
                        aria-label={`${o.name} löschen`}
                        onClick={() => {
                          void bestaetigen({
                            titel: `Objekt «${o.name}» löschen?`,
                            gefaehrlich: true,
                            bestaetigen: 'Löschen',
                          }).then((ok) => { if (ok) void loescheGlb(o.id).then(laden); });
                        }}
                      >
                        Löschen
                      </KButton>
                    </div>
                  </div>
                </Karteikarte>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

/** Kleine statische three-Vorschau — lädt das GLB einmal und rendert ein Standbild. */
function GlbVorschau({ objekt }: { objekt: GlbObjekt }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const [fehler, setFehler] = useState(false);

  useEffect(() => {
    let verworfen = false;
    let url = '';
    void (async () => {
      // P6-Review #4: WebGL-Kontexte sind knapp (~8–16 pro Browser). Der
      // Renderer lebt nur für EIN Standbild auf einem Wegwerf-Canvas, das
      // Ergebnis wandert per drawImage in den sichtbaren 2D-Canvas, und der
      // Kontext wird im finally HART freigegeben (forceContextLoss).
      let renderer: import('three').WebGLRenderer | null = null;
      try {
        const [THREE, { GLTFLoader }] = await Promise.all([
          import('three'),
          import('three/examples/jsm/loaders/GLTFLoader.js'),
        ]);
        if (verworfen || !ref.current) return;
        const ziel = ref.current;
        const breite = ziel.clientWidth || 208;
        const offscreen = document.createElement('canvas');
        renderer = new THREE.WebGLRenderer({ canvas: offscreen, antialias: true, alpha: true });
        renderer.setSize(breite, 120, false);
        const scene = new THREE.Scene();
        scene.add(new THREE.AmbientLight(0xffffff, 1.1));
        const sonne = new THREE.DirectionalLight(0xffffff, 1.4);
        sonne.position.set(3, 5, 4);
        scene.add(sonne);
        url = URL.createObjectURL(new Blob([objekt.daten], { type: 'model/gltf-binary' }));
        const gltf = await new GLTFLoader().loadAsync(url);
        if (verworfen) return;
        scene.add(gltf.scene);
        // Kamera auf den Inhalt einpassen (leichte Vogelperspektive)
        const box = new THREE.Box3().setFromObject(gltf.scene);
        const mitte = box.getCenter(new THREE.Vector3());
        const groesse = Math.max(box.getSize(new THREE.Vector3()).length(), 0.001);
        const camera = new THREE.PerspectiveCamera(40, breite / 120, groesse / 100, groesse * 10);
        camera.position.set(mitte.x + groesse * 0.7, mitte.y + groesse * 0.5, mitte.z + groesse * 0.7);
        camera.lookAt(mitte);
        renderer.render(scene, camera);
        ziel.width = breite;
        ziel.height = 120;
        ziel.getContext('2d')?.drawImage(offscreen, 0, 0);
      } catch {
        if (!verworfen) setFehler(true);
      } finally {
        if (renderer) {
          renderer.forceContextLoss();
          renderer.dispose();
        }
        if (url) URL.revokeObjectURL(url);
      }
    })();
    return () => {
      verworfen = true;
    };
  }, [objekt]);

  if (fehler) return <Messrahmen height={120} caption="Vorschau nicht lesbar — GLB prüfen" />;
  return <canvas ref={ref} style={{ width: '100%', height: 120, border: '1px solid var(--k-line)', background: 'var(--k-plan-paper)' }} />;
}
