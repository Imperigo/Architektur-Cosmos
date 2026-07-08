import { useEffect, useMemo, useState } from 'react';
import { Badge, Hairline, KButton, melde, moduleHue } from '@kosmo/ui';
import type { Betriebsart } from '@kosmo/ai';
import { installBefehleFuer, plattformAus, werkzeugeFuer, type Plattform, type Pruefung, type Werkzeug } from '../state/werkzeuge';
import { werkzeugHolen } from './werkzeug-holen';
import { istTauriDesktop } from './cloud-login';

/** Lauf-Status des «Holen»-Knopfs je Werkzeug (V1.6 Block A / A2–A3). */
type HolStatus = 'ruht' | 'laeuft' | 'fertig' | 'fehler';

/**
 * Setup-Assistent «Werkzeuge» (Owner: alle Tools zur Auswahl bereitstellen).
 * Zeigt für die aktive Betriebsart, was ein vollumfängliches KosmoOrbit
 * braucht, prüft die erreichbaren Dienste live und gibt für den Rest den
 * copy-fertigen Hol-Befehl. Ehrlich: die schweren Brocken lädt man gezielt,
 * sie stecken nicht in der .exe.
 */

type Status = 'pruefe' | 'da' | 'fehlt' | 'manuell' | 'konto';

const STATUS_TEXT: Record<Status, string> = {
  pruefe: 'prüfe …',
  da: 'läuft',
  fehlt: 'nicht erreichbar',
  manuell: 'selbst prüfen',
  konto: 'Schlüssel nötig',
};
const STATUS_FARBE: Record<Status, string> = {
  pruefe: 'var(--k-ink-soft)',
  da: 'var(--k-success)',
  fehlt: 'var(--k-warning)',
  manuell: 'var(--k-ink-soft)',
  konto: 'var(--k-warning)',
};

async function erreichbar(url: string, pfad: string): Promise<boolean> {
  if (!url) return false;
  try {
    const ctl = new AbortController();
    const t = setTimeout(() => ctl.abort(), 1400);
    const res = await fetch(`${url.replace(/\/$/, '')}${pfad}`, { signal: ctl.signal });
    clearTimeout(t);
    return res.ok;
  } catch {
    return false;
  }
}

async function pruefe(art: Pruefung): Promise<Status> {
  if (art === 'manuell') return 'manuell';
  if (art === 'konto') {
    try {
      const s = JSON.parse(localStorage.getItem('kosmo.llm') ?? '{}');
      return s.anthropicKey?.trim() ? 'da' : 'konto';
    } catch {
      return 'konto';
    }
  }
  if (art === 'ollama') {
    const base = (() => {
      try {
        return JSON.parse(localStorage.getItem('kosmo.llm') ?? '{}').baseUrl ?? 'http://localhost:11434';
      } catch {
        return 'http://localhost:11434';
      }
    })();
    return (await erreichbar(base, '/api/tags')) ? 'da' : 'fehlt';
  }
  if (art === 'bridge') {
    const bridge = localStorage.getItem('kosmo.bridge') ?? 'http://localhost:8600';
    return (await erreichbar(bridge, '/health')) ? 'da' : 'fehlt';
  }
  // sync: ws-URL → http für den /raeume-Ping
  const sync = (localStorage.getItem('kosmo.sync.url') ?? 'ws://localhost:8700').replace(/^ws/, 'http');
  return (await erreichbar(sync, '/raeume')) ? 'da' : 'fehlt';
}

const HOL_TEXT: Record<HolStatus, string> = {
  ruht: 'Holen',
  laeuft: 'holt …',
  fertig: 'geholt ✓',
  fehler: 'erneut holen',
};

function WerkzeugZeile({
  w,
  status,
  plattform,
  holStatus,
  onHolen,
}: {
  w: Werkzeug;
  status: Status;
  plattform: Plattform;
  holStatus: HolStatus;
  onHolen: (w: Werkzeug) => void;
}) {
  // «Holen» erscheint nur, wenn es für dieses Werkzeug auf dieser Plattform
  // geprüfte Auto-Befehle gibt (fail closed über installBefehleFuer).
  const autoBefehle = installBefehleFuer(w, plattform);
  return (
    <div
      data-testid={`werkzeug-${w.id}`}
      style={{ display: 'grid', gap: 4, padding: '7px 0', borderBottom: '1px solid var(--k-line)' }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
        <div style={{ fontWeight: 550, fontSize: 13, overflowWrap: 'anywhere' }}>{w.name}</div>
        {w.pflicht ? (
          <Badge hue={moduleHue.kosmo}>Kern</Badge>
        ) : (
          <Badge hue="var(--k-ink-soft)">optional</Badge>
        )}
        <div style={{ flex: 1 }} />
        <span data-testid={`werkzeug-status-${w.id}`} style={{ fontSize: 11.5, color: STATUS_FARBE[status] }}>
          ● {STATUS_TEXT[status]}
        </span>
      </div>
      <div style={{ fontSize: 12, color: 'var(--k-ink-soft)', lineHeight: 1.4 }}>{w.zweck}</div>
      <div style={{ display: 'flex', gap: 6, alignItems: 'flex-start', flexWrap: 'wrap' }}>
        <code
          style={{
            flex: '1 1 160px',
            fontSize: 11,
            background: 'var(--k-surface)',
            border: '1px solid var(--k-line)',
            borderRadius: 4,
            padding: '4px 7px',
            overflowWrap: 'anywhere',
            whiteSpace: 'pre-wrap',
          }}
        >
          {w.holen}
        </code>
        <span style={{ fontSize: 11, color: 'var(--k-ink-soft)', whiteSpace: 'nowrap', alignSelf: 'center' }}>
          {w.groesse}
        </span>
        {autoBefehle && (
          <KButton
            size="sm"
            tone="accent"
            data-testid={`werkzeug-holen-${w.id}`}
            disabled={holStatus === 'laeuft'}
            aria-label={`Auto-Holen: ${w.name}`}
            onClick={() => onHolen(w)}
          >
            {HOL_TEXT[holStatus]}
          </KButton>
        )}
        <KButton
          size="sm"
          tone="ghost"
          aria-label={`Befehl kopieren: ${w.name}`}
          onClick={() => {
            void navigator.clipboard?.writeText(w.holen).then(
              () => melde(`Befehl für «${w.name}» kopiert.`, { ton: 'erfolg' }),
              () => melde('Kopieren nicht möglich — bitte von Hand markieren.', { ton: 'fehler' }),
            );
          }}
        >
          ⧉
        </KButton>
      </div>
    </div>
  );
}

export function WerkzeugSetup({ betriebsart, onClose }: { betriebsart: Betriebsart; onClose: () => void }) {
  const werkzeuge = werkzeugeFuer(betriebsart);
  const [status, setStatus] = useState<Record<string, Status>>(() =>
    Object.fromEntries(werkzeuge.map((w) => [w.id, 'pruefe' as Status])),
  );
  const [holStatus, setHolStatus] = useState<Record<string, HolStatus>>({});

  // Plattform einmal aus dem Browser/Betriebssystem ableiten (rein testbar in
  // werkzeuge.ts). Bestimmt, welche Auto-Befehle «Holen» anbietet.
  const plattform = useMemo(
    () => plattformAus(typeof navigator !== 'undefined' ? navigator.platform || navigator.userAgent : ''),
    [],
  );
  const desktop = istTauriDesktop();

  const pruefeAlle = () => {
    setStatus(Object.fromEntries(werkzeuge.map((w) => [w.id, 'pruefe' as Status])));
    for (const w of werkzeuge) {
      void pruefe(w.pruefung).then((s) => setStatus((prev) => ({ ...prev, [w.id]: s })));
    }
  };

  useEffect(pruefeAlle, [betriebsart]);

  const holen = (w: Werkzeug) => {
    // Grosse Downloads (LLM-Gewichte) erst nach ausdrücklichem OK — die Grösse
    // steht im UI, hier die letzte Rückfrage (Buildplan Block A / A4).
    if (/\bGB\b/.test(w.groesse) && !window.confirm(`«${w.name}» ist ${w.groesse}. Jetzt herunterladen?`)) {
      return;
    }
    setHolStatus((p) => ({ ...p, [w.id]: 'laeuft' }));
    void werkzeugHolen(w, plattform).then(
      () => {
        setHolStatus((p) => ({ ...p, [w.id]: 'fertig' }));
        melde(`«${w.name}» geholt — «Neu prüfen», sobald der Dienst läuft.`, { ton: 'erfolg' });
        void pruefe(w.pruefung).then((s) => setStatus((prev) => ({ ...prev, [w.id]: s })));
      },
      (e: unknown) => {
        setHolStatus((p) => ({ ...p, [w.id]: 'fehler' }));
        melde(e instanceof Error ? e.message : 'Holen fehlgeschlagen.', { ton: 'fehler' });
      },
    );
  };

  const nochOffen = werkzeuge.filter((w) => w.pflicht && status[w.id] !== 'da').length;

  return (
    <div
      data-testid="werkzeug-setup"
      role="dialog"
      aria-label="Werkzeuge einrichten"
      className="k-dialog-scrim"
      style={{ zIndex: 220, background: 'color-mix(in srgb, var(--k-ink) 22%, transparent)' }}
      onClick={onClose}
    >
      <div
        className="k-karte k-skalieren-ein k-dialog"
        onClick={(e) => e.stopPropagation()}
        style={{
          background: 'var(--k-raised)',
          padding: '16px 20px',
          width: 'min(780px, calc(100vw - 48px))',
          display: 'grid',
          gap: 6,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <div className="k-titel" style={{ fontSize: 14, fontWeight: 650 }}>
            Werkzeuge einrichten
          </div>
          <Badge hue={moduleHue.kosmo}>
            {betriebsart === 'standard' ? 'HomePC' : betriebsart === 'remote' ? 'Remote (VPN)' : 'Cloud'}
          </Badge>
          <div style={{ flex: 1 }} />
          <KButton size="sm" tone="ghost" onClick={pruefeAlle}>
            Neu prüfen
          </KButton>
          <KButton size="sm" tone="ghost" aria-label="Schliessen" onClick={onClose}>
            ×
          </KButton>
        </div>
        <div style={{ fontSize: 12.5, color: 'var(--k-ink-soft)', lineHeight: 1.5 }}>
          {betriebsart === 'cloud'
            ? 'Der Cloud-Modus braucht nur einen Claude-Schlüssel. Renders/Whisper laufen als Browser-Fallback.'
            : nochOffen === 0
              ? 'Alle Kern-Werkzeuge laufen — KosmoOrbit ist vollumfänglich.'
              : `Noch ${nochOffen} Kern-Werkzeug${nochOffen === 1 ? '' : 'e'} einzurichten. «Holen» in der Desktop-App, sonst Befehl kopieren, ausführen, «Neu prüfen».`}
        </div>
        <div data-testid="werkzeug-holen-hinweis" style={{ fontSize: 11.5, color: 'var(--k-ink-faint)', lineHeight: 1.5 }}>
          {desktop
            ? `«Holen» führt den geprüften Installations-Befehl direkt aus (${plattform === 'win' ? 'winget' : plattform === 'mac' ? 'brew' : 'curl/pip'}). Grosse Downloads fragen vorher nach.`
            : 'Auto-«Holen» läuft nur in der Desktop-App (Systemzugriff). Im Browser den Befehl kopieren und im Terminal ausführen — der Knopf sagt es ehrlich.'}
        </div>
        <Hairline />
        {/* Zweispaltig ab genug Breite (T4b) — hält die Liste kompakt, damit
            das Popup ohne Scrollen aufgeht, auch bei allen Werkzeugen. */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', columnGap: 22 }}>
          {werkzeuge.map((w) => (
            <WerkzeugZeile
              key={w.id}
              w={w}
              status={status[w.id] ?? 'pruefe'}
              plattform={plattform}
              holStatus={holStatus[w.id] ?? 'ruht'}
              onHolen={holen}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
