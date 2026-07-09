import { useState } from 'react';
import { Karteikarte, Badge, KButton } from '@kosmo/ui';
import { allCommands, deriveAll } from '@kosmo/kernel';
import { BridgeHealth } from '@kosmo/contracts';
import { useProject } from '../state/project-store';
import { listDocs } from '../modules/prepare/knowledge';

/**
 * KosmoDoc-Selbstdiagnose (Owner-Q24) — prüft die lebenden Nähte des Systems:
 * Kern, Ableitung, LLM, Bridge, Sync, Wissensbasis, Speicher. Ergebnis ist
 * ehrlich dreistufig: ok / warnung / fehler mit konkretem Befund.
 */

export interface Befund {
  bereich: string;
  status: 'ok' | 'warnung' | 'fehler';
  detail: string;
}

async function fetchWithTimeout(url: string, ms: number): Promise<Response> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), ms);
  try {
    return await fetch(url, { signal: ctrl.signal });
  } finally {
    clearTimeout(t);
  }
}

/**
 * Erkennt eine Bridge-URL, die von der CSP-`connect-src`-Allowlist NICHT
 * gedeckt ist (KLEIN 9). Erlaubt sind nur `localhost` und `127.0.0.1` — eine
 * LAN-IP (z. B. `192.168.x.x` für ein iPad im Büronetz) wird still geblockt und
 * sieht dann wie «offline» aus. Die CSP kann keine CIDR-/Oktett-Wildcards, ohne
 * sie mit `http://*:*` weit aufzureissen; darum wird sie NICHT geschwächt,
 * sondern der Fall ehrlich benannt. Ein Hostname (kein reines IP-Muster) wird
 * NICHT als geblockt gemeldet — er könnte lokal auflösbar/erlaubt sein.
 */
function istWahrscheinlichCspGeblockt(bridgeUrl: string): boolean {
  try {
    const host = new URL(bridgeUrl).hostname;
    if (host === 'localhost' || host === '127.0.0.1') return false;
    // Nur echte IPv4-Adressen sicher als geblockt markieren (Hostnamen könnten
    // per /etc/hosts o. Ä. auf einen erlaubten Ursprung zeigen).
    return /^\d{1,3}(\.\d{1,3}){3}$/.test(host);
  } catch {
    return false;
  }
}

export async function diagnose(): Promise<Befund[]> {
  const befunde: Befund[] = [];
  const { doc, history } = useProject.getState();

  // 1) Kern
  const commands = allCommands().length;
  befunde.push({
    bereich: 'Kern',
    status: commands > 10 ? 'ok' : 'warnung',
    detail: `${doc.entities.size} Elemente · Revision ${doc.revision} · ${commands} Commands · Undo-Tiefe ${history.depth}`,
  });

  // 2) Ableitung (3D-Derivation, gemessen)
  try {
    const t0 = performance.now();
    const artifacts = deriveAll(doc);
    const ms = performance.now() - t0;
    befunde.push({
      bereich: 'Ableitung',
      status: ms < 500 ? 'ok' : 'warnung',
      detail: `${artifacts.length} Körper in ${ms.toFixed(0)} ms`,
    });
  } catch (err) {
    befunde.push({ bereich: 'Ableitung', status: 'fehler', detail: String(err) });
  }

  // 3) LLM (Ollama)
  try {
    const raw = localStorage.getItem('kosmo.llm');
    const cfg = raw ? (JSON.parse(raw) as { provider?: string; baseUrl?: string; model?: string }) : {};
    if (cfg.provider === 'mock') {
      befunde.push({ bereich: 'Kosmo-LLM', status: 'warnung', detail: 'Demo-Modus (kein LLM verbunden)' });
    } else {
      const base = (cfg.baseUrl ?? 'http://localhost:11434').replace(/\/$/, '');
      const res = await fetchWithTimeout(`${base}/api/tags`, 3000);
      const json = (await res.json()) as { models?: { name: string }[] };
      const names = (json.models ?? []).map((m) => m.name);
      const hat = cfg.model && names.some((n) => n.startsWith(cfg.model!));
      befunde.push({
        bereich: 'Kosmo-LLM',
        status: hat ? 'ok' : 'warnung',
        detail: hat
          ? `Ollama erreichbar · ${cfg.model} vorhanden`
          : `Ollama erreichbar, aber «${cfg.model}» nicht in ${names.length} Modellen`,
      });
    }
  } catch {
    befunde.push({
      bereich: 'Kosmo-LLM',
      status: 'fehler',
      detail: 'Ollama nicht erreichbar — URL in den Kosmo-Einstellungen prüfen',
    });
  }

  // 4) HomeStation-Bridge — inkl. Worker-/GPU-Zeile aus /health (HS3): die
  // Kette sagt selbst, ob ein GPU-Leerlauf-Fenster gemeldet wird. Ohne echte
  // GPU-Abfrage fehlt das Feld ehrlich (nie vorgetäuscht).
  const bridge = (localStorage.getItem('kosmo.bridge') ?? 'http://localhost:8600').replace(/\/$/, '');
  try {
    const res = await fetchWithTimeout(`${bridge}/health`, 3000);
    const roh = (await res.json()) as unknown;
    const geprueft = BridgeHealth.safeParse(roh);
    let detail: string;
    if (geprueft.success) {
      const h = geprueft.data;
      const dienste = Object.entries(h.services)
        .filter(([, an]) => an)
        .map(([name]) => name)
        .join(', ');
      const gpu = h.gpu
        ? ` · GPU: ${h.gpu.name ?? 'unbenannt'}${h.gpu.idle === undefined ? '' : h.gpu.idle ? ' (Leerlauf)' : ' (belegt)'}`
        : ' · kein GPU-/Worker-Status gemeldet';
      detail = `erreichbar · Dienste: ${dienste || '—'}${gpu}`;
    } else {
      detail = `erreichbar · ${JSON.stringify(roh).slice(0, 80)}`;
    }
    befunde.push({ bereich: 'Bridge', status: res.ok ? 'ok' : 'warnung', detail });
  } catch {
    // KLEIN 9: Eine LAN-IP-Bridge (iPad/anderer Rechner im Büronetz) wird von
    // der CSP still geblockt und sieht dann wie «offline» aus — der Hinweis
    // trennt «Firewall/Prozess tot» von «CSP deckt diese Adresse nicht».
    const cspHinweis = istWahrscheinlichCspGeblockt(bridge)
      ? ` — Achtung: die Adresse ${bridge} ist eine LAN-IP, die die CSP (connect-src) nicht erlaubt; nur localhost/127.0.0.1 sind gedeckt. Am selben Gerät die Bridge über localhost ansprechen oder die Produktions-CSP am Hosting um diesen Ursprung erweitern.`
      : '';
    befunde.push({
      bereich: 'Bridge',
      status: 'warnung',
      detail: `nicht erreichbar — Rendern/Speak-to-Kosmo brauchen die HomeStation${cspHinweis}`,
    });
  }

  // 5) Wissensbasis
  try {
    const docs = await listDocs();
    befunde.push({
      bereich: 'Wissensbasis',
      status: 'ok',
      detail: docs.length === 0 ? 'leer (KosmoPrepare füllt sie)' : `${docs.length} Dokumente`,
    });
  } catch (err) {
    befunde.push({ bereich: 'Wissensbasis', status: 'fehler', detail: String(err) });
  }

  // 6) Speicher
  try {
    const est = await navigator.storage.estimate();
    const usedMb = (est.usage ?? 0) / 1e6;
    const quotaMb = (est.quota ?? 0) / 1e6;
    befunde.push({
      bereich: 'Speicher',
      status: quotaMb > 0 && usedMb / quotaMb > 0.9 ? 'warnung' : 'ok',
      detail: `${usedMb.toFixed(1)} MB von ${quotaMb.toFixed(0)} MB belegt`,
    });
  } catch {
    befunde.push({ bereich: 'Speicher', status: 'warnung', detail: 'Storage-API nicht verfügbar' });
  }

  return befunde;
}

const statusHue: Record<Befund['status'], string> = {
  ok: 'var(--k-success)',
  warnung: 'var(--k-warning)',
  fehler: 'var(--k-danger, #b3462e)',
};

/**
 * R1-Fix (Kritik-065 p-10/i-10, «KosmoDoc-Leerfläche unter der
 * Diagnosekarte»): vor dem ersten Klick auf «Prüfen» blieb `befunde === null`
 * — `befunde?.map(...)` rendert dann nichts, die ganze Seite unter der Karte
 * blieb leer. Gezeichnetes Signet + EIN ehrlicher Satz statt der leeren
 * Fläche (Muster `DataLeerbild`, `modules/data/DataLeerbild.tsx`: 1.5px-
 * Stroke, `--k-ink-faint`, kein Fill) — sagt genau, was hier erscheint,
 * sobald geprüft wurde.
 */
function DiagnoseLeerbild() {
  return (
    <div style={{ display: 'grid', justifyItems: 'center', alignContent: 'center', gap: 8, padding: '28px 16px' }}>
      <svg
        data-testid="diagnose-leerbild"
        aria-hidden="true"
        viewBox="0 0 40 40"
        width={32}
        height={32}
        fill="none"
        stroke="var(--k-ink-faint)"
        strokeWidth={1.5}
        strokeLinejoin="round"
        strokeLinecap="round"
      >
        {/* Klemmbrett/Befundblatt mit Puls-/Kurvenlinie — «Projektdoktor». */}
        <path d="M11 8h18v27H11Z" />
        <path d="M15 4h10v5H15Z" />
        <path d="M15 16h4M15 21h9" />
        <path d="M14 28h4l2 -5 3 9 2.5 -6.5 1.5 2.5h4" />
      </svg>
      <span style={{ fontSize: 'var(--k-t-xs)', color: 'var(--k-ink-faint)', textAlign: 'center', maxWidth: 340, lineHeight: 1.5 }}>
        Noch keine Prüfung gelaufen — «Prüfen» zeigt hier den Befund zu Kern, Ableitung, Kosmo-LLM,
        Bridge, Wissensbasis und Speicher.
      </span>
    </div>
  );
}

export function DiagnosePanel() {
  const [befunde, setBefunde] = useState<Befund[] | null>(null);
  const [laueft, setLaueft] = useState(false);

  return (
    <div style={{ display: 'grid', gap: 8 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ fontSize: 12, color: 'var(--k-ink-soft)' }}>KosmoDoc — Systemdiagnose</span>
        <div style={{ flex: 1 }} />
        <KButton
          size="sm"
          tone="quiet"
          data-testid="diagnose-run"
          disabled={laueft}
          onClick={() => {
            setLaueft(true);
            void diagnose()
              .then(setBefunde)
              .finally(() => setLaueft(false));
          }}
        >
          {laueft ? 'Prüfe …' : 'Prüfen'}
        </KButton>
      </div>
      {befunde === null ? (
        <DiagnoseLeerbild />
      ) : (
        befunde.map((b, i) => (
          <Karteikarte key={b.bereich} nr={i + 1} data-testid={`befund-${b.bereich}`}>
            <div style={{ display: 'grid', gap: 3, fontSize: 12.5 }}>
              <Badge hue={statusHue[b.status]}>{b.bereich}</Badge>
              <span style={{ color: 'var(--k-ink-soft)', lineHeight: 1.45 }}>{b.detail}</span>
            </div>
          </Karteikarte>
        ))
      )}
    </div>
  );
}
