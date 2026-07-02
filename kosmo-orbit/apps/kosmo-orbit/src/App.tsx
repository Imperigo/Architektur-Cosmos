import { useEffect, useState } from 'react';
import {
  Badge,
  Hairline,
  KButton,
  Measure,
  OrbitMark,
  Panel,
  Wordmark,
  moduleHue,
  type ModuleId,
  type ThemeName,
} from '@kosmo/ui';

const modules: { id: ModuleId; name: string; desc: string; ready: boolean }[] = [
  { id: 'design', name: 'KosmoDesign', desc: 'Entwerfen · Modellieren · Pläne', ready: false },
  { id: 'data', name: 'KosmoData', desc: 'Referenzen · Assets · Wissen', ready: false },
  { id: 'vis', name: 'KosmoVis', desc: 'Renderings · Varianten', ready: false },
  { id: 'publish', name: 'KosmoPublish', desc: 'Plansätze · Layouts', ready: false },
  { id: 'prepare', name: 'KosmoPrepare', desc: 'Grundlagen · Ingestion', ready: false },
];

export function App() {
  const [theme, setTheme] = useState<ThemeName>('paper');

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
  }, [theme]);

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <header
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 14,
          padding: '10px 18px',
          borderBottom: '1px solid var(--k-line)',
          background: 'var(--k-surface)',
        }}
      >
        <OrbitMark module="orbit" size={26} />
        <Wordmark />
        <div style={{ flex: 1 }} />
        <Badge hue={moduleHue.kosmo}>Kosmo bereit</Badge>
        <Hairline vertical />
        <KButton tone="ghost" size="sm" onClick={() => setTheme(theme === 'paper' ? 'ink' : 'paper')}>
          {theme === 'paper' ? 'Tinte' : 'Papier'}
        </KButton>
      </header>

      <main style={{ flex: 1, overflow: 'auto', padding: '48px 24px' }}>
        <div style={{ maxWidth: 880, margin: '0 auto', display: 'grid', gap: 28 }}>
          <div>
            <div style={{ fontSize: 28, fontWeight: 550, letterSpacing: '-0.01em' }}>
              Guten Morgen.
            </div>
            <div style={{ color: 'var(--k-ink-soft)', marginTop: 6 }}>
              KosmoOrbit V1 ist im Aufbau — dies ist das lebende Gerüst. Jeder Stand wird laufend
              auf Git gesichert.
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
                style={{
                  display: 'flex',
                  gap: 12,
                  alignItems: 'center',
                  opacity: m.ready ? 1 : 0.75,
                  transition: 'border-color var(--k-motion-fast)',
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

          <Panel>
            <Badge hue={moduleHue.design}>Aura — visueller Palettentest</Badge>
            <div style={{ display: 'flex', gap: 10, marginTop: 12, flexWrap: 'wrap' }}>
              {(
                [
                  ['Akzent', 'var(--k-accent)'],
                  ['Erfolg', 'var(--k-success)'],
                  ['Warnung', 'var(--k-warning)'],
                  ['Gefahr', 'var(--k-danger)'],
                  ['Info', 'var(--k-info)'],
                ] as const
              ).map(([name, c]) => (
                <div key={name} style={{ textAlign: 'center', fontSize: 11 }}>
                  <div
                    style={{
                      width: 64,
                      height: 40,
                      borderRadius: 'var(--k-radius-sm)',
                      background: c,
                      border: '1px solid var(--k-line)',
                    }}
                  />
                  <div style={{ marginTop: 4, color: 'var(--k-ink-faint)' }}>{name}</div>
                </div>
              ))}
            </div>
            <div style={{ marginTop: 14, display: 'flex', gap: 8, alignItems: 'center' }}>
              <KButton tone="accent">Primäraktion</KButton>
              <KButton tone="quiet">Sekundär</KButton>
              <KButton tone="ghost">Still</KButton>
              <Measure>3.63 m · 10.90 m · aGF 2 814 m²</Measure>
            </div>
          </Panel>
        </div>
      </main>
    </div>
  );
}
