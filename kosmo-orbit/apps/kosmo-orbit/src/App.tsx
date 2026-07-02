import { useEffect, useState } from 'react';
import {
  Badge,
  Hairline,
  KButton,
  OrbitMark,
  Panel,
  Wordmark,
  moduleHue,
  type ModuleId,
  type ThemeName,
} from '@kosmo/ui';
import { DesignWorkspace } from './modules/design/DesignWorkspace';
import { KosmoPanel } from './shell/KosmoPanel';
import { VisWorkspace } from './modules/vis/VisWorkspace';
import { DataWorkspace } from './modules/data/DataWorkspace';
import { useProject } from './state/project-store';
import { downloadProject, openProjectFile } from './state/project-io';
import { loadTkbDemo } from './state/demo-tkb';

type Screen = 'home' | 'design' | 'vis' | 'data';

const modules: { id: ModuleId; screen: Screen | null; name: string; desc: string }[] = [
  { id: 'design', screen: 'design', name: 'KosmoDesign', desc: 'Entwerfen · Modellieren · Pläne' },
  { id: 'data', screen: 'data', name: 'KosmoData', desc: 'Referenzen · Assets · Wissen' },
  { id: 'vis', screen: 'vis', name: 'KosmoVis', desc: 'Renderings · Varianten' },
  { id: 'publish', screen: null, name: 'KosmoPublish', desc: 'Plansätze · Layouts' },
  { id: 'prepare', screen: null, name: 'KosmoPrepare', desc: 'Grundlagen · Ingestion' },
];

export function App() {
  const [theme, setTheme] = useState<ThemeName>('paper');
  const [screen, setScreen] = useState<Screen>('home');
  const [kosmoOpen, setKosmoOpen] = useState(true);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
  }, [theme]);

  // Test-Hook für Playwright/KosmoDoc: deterministische Modell-Aufbauten
  useEffect(() => {
    (window as never as Record<string, unknown>)['__kosmo'] = {
      run: (commandId: string, params: unknown) =>
        useProject.getState().runCommand(commandId, params),
      state: () => useProject.getState(),
      open: (s: Screen) => setScreen(s),
    };
  }, []);

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <header
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 14,
          padding: '8px 16px',
          borderBottom: '1px solid var(--k-line)',
          background: 'var(--k-surface)',
          zIndex: 3,
        }}
      >
        <button
          onClick={() => setScreen('home')}
          style={{ all: 'unset', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 12 }}
          aria-label="Zur Zentrale"
        >
          <OrbitMark module="orbit" size={24} />
          <Wordmark size={16} />
        </button>
        {screen !== 'home' && (
          <>
            <Hairline vertical />
            <Badge hue={screen === 'vis' ? moduleHue.vis : screen === 'data' ? moduleHue.data : moduleHue.design}>
              {screen === 'vis' ? 'KosmoVis' : screen === 'data' ? 'KosmoData' : 'KosmoDesign'}
            </Badge>
          </>
        )}
        <div style={{ flex: 1 }} />
        <KButton size="sm" tone="ghost" onClick={downloadProject} data-testid="save-project">
          Speichern
        </KButton>
        <KButton
          size="sm"
          tone="ghost"
          data-testid="open-project"
          onClick={() => {
            const input = document.createElement('input');
            input.type = 'file';
            input.accept = '.kosmo,application/zip';
            input.onchange = () => {
              const f = input.files?.[0];
              if (f) void openProjectFile(f).then(() => setScreen('design'));
            };
            input.click();
          }}
        >
          Öffnen
        </KButton>
        <Hairline vertical />
        <button
          onClick={() => setKosmoOpen(!kosmoOpen)}
          data-testid="kosmo-toggle"
          style={{ all: 'unset', cursor: 'pointer' }}
          aria-label="Kosmo öffnen/schliessen"
        >
          <Badge hue={moduleHue.kosmo}>{kosmoOpen ? 'Kosmo' : 'Kosmo öffnen'}</Badge>
        </button>
        <Hairline vertical />
        <KButton tone="ghost" size="sm" onClick={() => setTheme(theme === 'paper' ? 'ink' : 'paper')}>
          {theme === 'paper' ? 'Tinte' : 'Papier'}
        </KButton>
      </header>

      <main style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
        <div style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
        {screen === 'design' ? (
          <DesignWorkspace />
        ) : screen === 'vis' ? (
          <VisWorkspace />
        ) : screen === 'data' ? (
          <DataWorkspace />
        ) : (
          <div style={{ position: 'absolute', inset: 0, overflow: 'auto', padding: '48px 24px' }}>
            <div style={{ maxWidth: 880, margin: '0 auto', display: 'grid', gap: 28 }}>
              <div>
                <div style={{ fontSize: 28, fontWeight: 550, letterSpacing: '-0.01em' }}>
                  Guten Morgen.
                </div>
                <div style={{ color: 'var(--k-ink-soft)', marginTop: 6 }}>
                  Womit beginnen wir? KosmoDesign ist bereit zum Zeichnen.
                </div>
                <div style={{ marginTop: 12 }}>
                  <KButton
                    size="sm"
                    tone="quiet"
                    data-testid="load-tkb"
                    onClick={() => {
                      loadTkbDemo();
                      setScreen('design');
                    }}
                  >
                    Beispielprojekt laden — TKB Bibliothek Hönggerberg
                  </KButton>
                </div>
              </div>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))',
                  gap: 14,
                }}
              >
                {modules.map((m) => (
                  <Panel
                    key={m.id}
                    onClick={() => m.screen && setScreen(m.screen)}
                    data-testid={`module-${m.id}`}
                    style={{
                      display: 'flex',
                      gap: 12,
                      alignItems: 'center',
                      cursor: m.screen ? 'pointer' : 'default',
                      opacity: m.screen ? 1 : 0.55,
                      transition: 'border-color var(--k-motion-fast), box-shadow var(--k-motion-fast)',
                    }}
                    onMouseEnter={(e) => {
                      if (m.screen) (e.currentTarget as HTMLElement).style.borderColor = 'var(--k-accent)';
                    }}
                    onMouseLeave={(e) => {
                      (e.currentTarget as HTMLElement).style.borderColor = 'var(--k-line)';
                    }}
                  >
                    <OrbitMark module={m.id} size={34} />
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontWeight: 550 }}>{m.name}</div>
                      <div style={{ fontSize: 12.5, color: 'var(--k-ink-faint)' }}>{m.desc}</div>
                    </div>
                  </Panel>
                ))}
              </div>
            </div>
          </div>
        )}
        </div>
        {kosmoOpen && <KosmoPanel onClose={() => setKosmoOpen(false)} />}
      </main>
    </div>
  );
}
