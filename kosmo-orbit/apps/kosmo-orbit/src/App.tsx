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
import { PublishWorkspace } from './modules/publish/PublishWorkspace';
import { PrepareWorkspace } from './modules/prepare/PrepareWorkspace';
import { CommandPalette } from './shell/CommandPalette';
import { registerActions } from './shell/palette';
import {
  aktivesProjektId,
  initVault,
  listeProjekte,
  loescheProjekt,
  neuesProjekt,
  oeffneProjekt,
  type VaultEintrag,
} from './state/project-vault';
import { useProject } from './state/project-store';
import { downloadProject, openProjectFile } from './state/project-io';
import { loadTkbDemo } from './state/demo-tkb';
import { connectSync, disconnectSync, onSyncStatus, type SyncStatus } from './state/project-sync';

type Screen = 'home' | 'design' | 'vis' | 'data' | 'publish' | 'prepare';

function tagesgruss(): string {
  const h = new Date().getHours();
  if (h < 5) return 'Späte Stunde.';
  if (h < 11) return 'Guten Morgen.';
  if (h < 14) return 'Guten Tag.';
  if (h < 18) return 'Guten Nachmittag.';
  return 'Guten Abend.';
}

const modules: { id: ModuleId; screen: Screen | null; name: string; desc: string }[] = [
  { id: 'design', screen: 'design', name: 'KosmoDesign', desc: 'Entwerfen · Modellieren · Pläne' },
  { id: 'data', screen: 'data', name: 'KosmoData', desc: 'Referenzen · Assets · Wissen' },
  { id: 'vis', screen: 'vis', name: 'KosmoVis', desc: 'Renderings · Varianten' },
  { id: 'publish', screen: 'publish', name: 'KosmoPublish', desc: 'Plansätze · Layouts' },
  { id: 'prepare', screen: 'prepare', name: 'KosmoPrepare', desc: 'Grundlagen · Ingestion' },
];

/** Wählbare Farbakzente (Gestaltungskonzept «Werkplan»): Standard = Tusche. */
const AKZENTE: { key: string; name: string; farbe: string | null }[] = [
  { key: 'tusche', name: 'Tusche', farbe: null },
  { key: 'kupfer', name: 'Kupfer', farbe: '#a84b2b' },
  { key: 'signal', name: 'Signal', farbe: '#c8501e' },
  { key: 'blau', name: 'Blau', farbe: '#2455a4' },
  { key: 'gruen', name: 'Grün', farbe: '#1e6b47' },
];

export function App() {
  const [theme, setTheme] = useState<ThemeName>(
    (localStorage.getItem('kosmo.thema') as ThemeName | null) ?? 'paper',
  );
  const [akzent, setAkzent] = useState(localStorage.getItem('kosmo.akzent') ?? 'tusche');
  const [screen, setScreen] = useState<Screen>('home');
  const [kosmoOpen, setKosmoOpen] = useState(true);
  const [syncOpen, setSyncOpen] = useState(false);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>('aus');
  const [onboarding, setOnboarding] = useState(localStorage.getItem('kosmo.onboarded') !== '1');
  const [peers, setPeers] = useState(0);
  const [syncUrl, setSyncUrl] = useState(localStorage.getItem('kosmo.sync.url') ?? 'ws://localhost:8700');
  const [syncRoom, setSyncRoom] = useState(localStorage.getItem('kosmo.sync.room') ?? 'projekt-1');

  useEffect(() => {
    onSyncStatus((s, p) => {
      setSyncStatus(s);
      setPeers(p);
    });
    void initVault();
  }, []);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    localStorage.setItem('kosmo.thema', theme);
  }, [theme]);

  useEffect(() => {
    document.documentElement.dataset.akzent = akzent;
    localStorage.setItem('kosmo.akzent', akzent);
  }, [akzent]);

  // Globale Palette-Aktionen (⌘K)
  useEffect(() => {
    return registerActions('app', [
      ...modules
        .filter((m) => m.screen)
        .map((m) => ({
          id: `nav-${m.id}`,
          titel: m.name,
          gruppe: 'Module',
          run: () => setScreen(m.screen!),
        })),
      { id: 'nav-home', titel: 'Zentrale', gruppe: 'Module', run: () => setScreen('home') },
      {
        id: 'theme',
        titel: 'Thema wechseln (Papier/Tinte)',
        gruppe: 'Ansicht',
        run: () => setTheme((t) => (t === 'paper' ? 'ink' : 'paper')),
      },
      ...AKZENTE.map((a) => ({
        id: `akzent-${a.key}`,
        titel: `Akzent: ${a.name}`,
        gruppe: 'Ansicht',
        run: () => setAkzent(a.key),
      })),
      { id: 'kosmo', titel: 'Kosmo ein-/ausblenden', gruppe: 'Ansicht', run: () => setKosmoOpen((k) => !k) },
      { id: 'save', titel: 'Projekt speichern (.kosmo)', gruppe: 'Projekt', run: downloadProject },
      {
        id: 'tkb',
        titel: 'Beispielprojekt TKB laden',
        gruppe: 'Projekt',
        run: () => {
          loadTkbDemo();
          setScreen('design');
        },
      },
    ]);
  }, []);

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
            <Badge hue={moduleHue[screen as ModuleId] ?? moduleHue.design}>
              {modules.find((m) => m.screen === screen)?.name ?? 'KosmoDesign'}
            </Badge>
          </>
        )}
        <div style={{ flex: 1 }} />
        <button
          onClick={() => setSyncOpen(!syncOpen)}
          data-testid="sync-toggle"
          style={{ all: 'unset', cursor: 'pointer' }}
        >
          <Badge
            hue={
              syncStatus === 'live'
                ? 'var(--k-success)'
                : syncStatus === 'aus'
                  ? 'var(--k-ink-faint)'
                  : 'var(--k-warning)'
            }
          >
            {syncStatus === 'live' ? `Sync live · ${peers}` : syncStatus === 'aus' ? 'Sync aus' : syncStatus}
          </Badge>
        </button>
        <Hairline vertical />
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
        <span style={{ display: 'inline-flex', gap: 6, alignItems: 'center', marginLeft: 4 }}>
          {AKZENTE.map((a) => (
            <button
              key={a.key}
              onClick={() => setAkzent(a.key)}
              title={`Akzent ${a.name}`}
              aria-label={`Akzent ${a.name}`}
              data-testid={`akzent-${a.key}`}
              style={{
                all: 'unset',
                cursor: 'pointer',
                width: 12,
                height: 12,
                borderRadius: 999,
                background: a.farbe ?? 'var(--k-technik)',
                boxShadow:
                  akzent === a.key
                    ? '0 0 0 1.5px var(--k-field), 0 0 0 3px var(--k-technik)'
                    : '0 0 0 1px var(--k-line-strong)',
              }}
            />
          ))}
        </span>
      </header>

      {syncOpen && (
        <div
          style={{
            display: 'flex',
            gap: 8,
            alignItems: 'center',
            padding: '8px 16px',
            borderBottom: '1px solid var(--k-line)',
            background: 'var(--k-surface)',
            fontSize: 12.5,
          }}
        >
          <span style={{ color: 'var(--k-ink-faint)' }}>Sync-Server (HomeStation)</span>
          <input
            value={syncUrl}
            onChange={(e) => {
              setSyncUrl(e.target.value);
              localStorage.setItem('kosmo.sync.url', e.target.value);
            }}
            data-testid="sync-url"
            style={{ padding: '4px 8px', borderRadius: 6, border: '1px solid var(--k-line-strong)', background: 'var(--k-raised)', width: 210 }}
          />
          <span style={{ color: 'var(--k-ink-faint)' }}>Raum</span>
          <input
            value={syncRoom}
            onChange={(e) => {
              setSyncRoom(e.target.value);
              localStorage.setItem('kosmo.sync.room', e.target.value);
            }}
            data-testid="sync-room"
            style={{ padding: '4px 8px', borderRadius: 6, border: '1px solid var(--k-line-strong)', background: 'var(--k-raised)', width: 130 }}
          />
          {syncStatus === 'aus' || syncStatus === 'getrennt' ? (
            <KButton size="sm" tone="accent" data-testid="sync-connect" onClick={() => connectSync(syncUrl, syncRoom)}>
              Verbinden
            </KButton>
          ) : (
            <KButton size="sm" tone="quiet" onClick={disconnectSync}>
              Trennen
            </KButton>
          )}
          <span style={{ color: 'var(--k-ink-faint)' }}>
            Desktop und iPad im selben Raum arbeiten live am selben Modell.
          </span>
        </div>
      )}
      <main style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
        <div style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
        {screen === 'design' ? (
          <DesignWorkspace />
        ) : screen === 'vis' ? (
          <VisWorkspace />
        ) : screen === 'data' ? (
          <DataWorkspace />
        ) : screen === 'publish' ? (
          <PublishWorkspace />
        ) : screen === 'prepare' ? (
          <PrepareWorkspace />
        ) : (
          <div style={{ position: 'absolute', inset: 0, overflow: 'auto', padding: '48px 24px' }}>
            <div style={{ maxWidth: 880, margin: '0 auto', display: 'grid', gap: 28 }}>
              <div>
                <div className="k-titel" style={{ fontSize: 34 }}>
                  {tagesgruss()}
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
              {onboarding && (
                <Panel data-testid="onboarding" style={{ padding: '16px 18px', display: 'grid', gap: 10 }}>
                  <div style={{ fontWeight: 550 }}>Erste Schritte</div>
                  <ol style={{ margin: 0, paddingLeft: 18, fontSize: 13.5, lineHeight: 1.7, color: 'var(--k-ink-soft)' }}>
                    <li>
                      <b>Zeichnen:</b> In KosmoDesign Wände klicken (Snap aufs Raster), Fenster und Türen in die
                      Wand setzen — Grundriss, Schnitt und Kennzahlen laufen live mit.
                    </li>
                    <li>
                      <b>Kosmo fragen:</b> Rechts im Panel, z.&nbsp;B. «Zeichne eine Wand von 0,0 nach 8,0» —
                      Vorschläge wendest du per Karte an, Rückgängig gilt immer.
                    </li>
                    <li>
                      <b>Schnell springen:</b> ⌘K/Ctrl+K öffnet die Befehlspalette (Module, Ansichten, Exporte).
                    </li>
                  </ol>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <KButton
                      size="sm"
                      tone="accent"
                      data-testid="onboarding-start"
                      onClick={() => {
                        localStorage.setItem('kosmo.onboarded', '1');
                        setOnboarding(false);
                        setScreen('design');
                      }}
                    >
                      Los geht's — KosmoDesign öffnen
                    </KButton>
                    <KButton
                      size="sm"
                      tone="ghost"
                      onClick={() => {
                        localStorage.setItem('kosmo.onboarded', '1');
                        setOnboarding(false);
                      }}
                    >
                      Ausblenden
                    </KButton>
                  </div>
                </Panel>
              )}
              <ProjektListe onOpen={() => setScreen('design')} />
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
      <CommandPalette />
    </div>
  );
}

/** Projektverwaltung: Autosave-Stände aus dem Tresor — öffnen, löschen, neu. */
function ProjektListe({ onOpen }: { onOpen: () => void }) {
  const [projekte, setProjekte] = useState<Omit<VaultEintrag, 'json'>[]>([]);
  const [neuName, setNeuName] = useState('');
  const refresh = () => void listeProjekte().then(setProjekte).catch(() => undefined);
  useEffect(refresh, []);

  return (
    <div style={{ display: 'grid', gap: 8 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{ fontWeight: 550, fontSize: 13.5 }}>Projekte</div>
        <span style={{ fontSize: 11.5, color: 'var(--k-ink-faint)' }}>
          Autosave — jede Änderung landet hier. .kosmo bleibt fürs Weitergeben.
        </span>
      </div>
      {projekte.length === 0 && (
        <div style={{ fontSize: 12.5, color: 'var(--k-ink-faint)' }}>
          Noch keine gesicherten Stände — sobald du zeichnest, erscheint dein Projekt hier.
        </div>
      )}
      <div style={{ display: 'grid', gap: 6 }}>
        {projekte.map((p) => (
          <Panel
            key={p.id}
            data-testid={`projekt-${p.id}`}
            style={{ padding: '8px 12px', display: 'flex', alignItems: 'center', gap: 10 }}
          >
            <div style={{ minWidth: 0, flex: 1 }}>
              <span style={{ fontWeight: 550, fontSize: 13 }}>{p.name}</span>
              {p.id === aktivesProjektId() && (
                <span style={{ marginLeft: 8 }}>
                  <Badge hue="var(--k-success)">aktiv</Badge>
                </span>
              )}
              <div style={{ fontSize: 11.5, color: 'var(--k-ink-faint)' }}>
                {p.elemente} Elemente · {new Date(p.updatedAt).toLocaleString('de-CH')}
              </div>
            </div>
            {p.id !== aktivesProjektId() && (
              <KButton
                size="sm"
                tone="quiet"
                data-testid={`projekt-oeffnen-${p.id}`}
                onClick={() => void oeffneProjekt(p.id).then(onOpen)}
              >
                Öffnen
              </KButton>
            )}
            <KButton
              size="sm"
              tone="ghost"
              aria-label={`${p.name} löschen`}
              onClick={() => {
                if (confirm(`Projekt «${p.name}» endgültig löschen?`)) {
                  void loescheProjekt(p.id).then(refresh);
                }
              }}
            >
              Löschen
            </KButton>
          </Panel>
        ))}
      </div>
      <div style={{ display: 'flex', gap: 8 }}>
        <input
          value={neuName}
          data-testid="projekt-neu-name"
          onChange={(e) => setNeuName(e.target.value)}
          placeholder="Neues Projekt — Name"
          style={{
            padding: '6px 10px',
            borderRadius: 8,
            border: '1px solid var(--k-line-strong)',
            background: 'var(--k-raised)',
            fontSize: 13,
            width: 240,
          }}
        />
        <KButton
          size="sm"
          tone="quiet"
          data-testid="projekt-neu"
          onClick={() => {
            neuesProjekt(neuName.trim());
            setNeuName('');
            onOpen();
          }}
        >
          + Neues Projekt
        </KButton>
      </div>
    </div>
  );
}
