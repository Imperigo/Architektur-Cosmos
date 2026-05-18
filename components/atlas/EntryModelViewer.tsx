'use client';

import { useEffect, useRef, useState } from 'react';
import type { CSSProperties } from 'react';

type EntryModelViewerProps = {
  modelUrl: string;
  title: string;
  accent: string;
};

type ViewerStatus = 'loading' | 'ready' | 'error';

export function EntryModelViewer({ modelUrl, title, accent }: EntryModelViewerProps) {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const [status, setStatus] = useState<ViewerStatus>('loading');

  useEffect(() => {
    let disposed = false;
    let cleanup = () => {};

    async function boot() {
      if (!mountRef.current) return;

      const [Three, { GLTFLoader }, { OrbitControls }] = await Promise.all([
        import('three'),
        import('three/examples/jsm/loaders/GLTFLoader.js'),
        import('three/examples/jsm/controls/OrbitControls.js')
      ]);

      if (disposed || !mountRef.current) return;

      const mount = mountRef.current;
      const scene = new Three.Scene();
      scene.background = new Three.Color(0x050505);
      scene.fog = new Three.Fog(0x050505, 18, 42);

      const camera = new Three.PerspectiveCamera(42, mount.clientWidth / mount.clientHeight, 0.1, 100);
      camera.position.set(16, 11, 16);

      const renderer = new Three.WebGLRenderer({ antialias: true, alpha: false, powerPreference: 'high-performance' });
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      renderer.setSize(mount.clientWidth, mount.clientHeight);
      renderer.outputColorSpace = Three.SRGBColorSpace;
      mount.appendChild(renderer.domElement);

      const controls = new OrbitControls(camera, renderer.domElement);
      controls.enableDamping = true;
      controls.dampingFactor = 0.075;
      controls.target.set(0, 3.1, 0);
      controls.minDistance = 7;
      controls.maxDistance = 36;
      controls.maxPolarAngle = Math.PI * 0.48;
      controls.update();

      scene.add(new Three.HemisphereLight(0xeefcff, 0x071315, 1.45));
      const keyLight = new Three.DirectionalLight(0xffffff, 2.2);
      keyLight.position.set(8, 12, 7);
      scene.add(keyLight);
      const accentLight = new Three.PointLight(accent, 4.5, 28);
      accentLight.position.set(-8, 5, -7);
      scene.add(accentLight);

      const grid = new Three.GridHelper(30, 30, new Three.Color(accent), new Three.Color(0x183238));
      grid.position.y = -0.02;
      scene.add(grid);

      const loader = new GLTFLoader();
      loader.load(
        modelUrl,
        (gltf) => {
          if (disposed) return;
          const model = gltf.scene;
          model.traverse((child) => {
            if ('isMesh' in child && child.isMesh) {
              child.castShadow = false;
              child.receiveShadow = true;
            }
          });
          scene.add(model);
          setStatus('ready');
        },
        undefined,
        () => {
          if (!disposed) setStatus('error');
        }
      );

      const resize = () => {
        if (!mountRef.current) return;
        camera.aspect = mountRef.current.clientWidth / mountRef.current.clientHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(mountRef.current.clientWidth, mountRef.current.clientHeight);
      };
      window.addEventListener('resize', resize);

      let frame = 0;
      const animate = () => {
        if (disposed) return;
        frame = window.requestAnimationFrame(animate);
        controls.update();
        renderer.render(scene, camera);
      };
      animate();

      cleanup = () => {
        window.removeEventListener('resize', resize);
        window.cancelAnimationFrame(frame);
        controls.dispose();
        renderer.dispose();
        mount.removeChild(renderer.domElement);
      };
    }

    boot().catch(() => {
      if (!disposed) setStatus('error');
    });

    return () => {
      disposed = true;
      cleanup();
    };
  }, [accent, modelUrl]);

  return (
    <article className="entry-model-viewer border border-white/14 bg-[#050505]">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 px-4 py-3">
        <div>
          <div className="text-[10px] uppercase tracking-[0.2em]" style={{ color: accent }}>Interactive 3D Preview</div>
          <h2 className="mt-1 text-xl text-[#f7f7f4]">{title} / diagrammatic massing</h2>
        </div>
        <div className="text-[9px] uppercase tracking-[0.14em] text-[#8d8d87]">drag rotate / scroll zoom</div>
      </div>
      <div className="relative h-[420px] min-h-[320px] w-full overflow-hidden" style={{ '--viewer-accent': accent } as CSSProperties}>
        <div ref={mountRef} className="h-full w-full" />
        {status !== 'ready' ? (
          <div className="absolute inset-0 flex items-center justify-center bg-[#050505]/82 text-[10px] uppercase tracking-[0.18em] text-[#d7d7d0]">
            {status === 'loading' ? 'loading 3d model' : '3d model could not be loaded'}
          </div>
        ) : null}
      </div>
      <div className="grid gap-3 border-t border-white/10 p-4 text-sm leading-6 text-[#b8b8b2] md:grid-cols-3">
        <div><span style={{ color: accent }}>Layer:</span> site, mass, pilotis, envelope, ramp, roof garden.</div>
        <div><span style={{ color: accent }}>Status:</span> generated low-poly reference, not measured.</div>
        <div><span style={{ color: accent }}>Use:</span> first Blender/ArchiCAD analysis body.</div>
      </div>
    </article>
  );
}
