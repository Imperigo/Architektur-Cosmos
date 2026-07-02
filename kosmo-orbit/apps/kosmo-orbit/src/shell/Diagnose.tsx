import { useState } from 'react';
import { Karteikarte, Badge, KButton } from '@kosmo/ui';
import { allCommands, deriveAll } from '@kosmo/kernel';
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

  // 4) HomeStation-Bridge
  try {
    const bridge = (localStorage.getItem('kosmo.bridge') ?? 'http://localhost:8600').replace(/\/$/, '');
    const res = await fetchWithTimeout(`${bridge}/health`, 3000);
    const json = (await res.json()) as { status?: string; whisper?: boolean };
    befunde.push({
      bereich: 'Bridge',
      status: res.ok ? 'ok' : 'warnung',
      detail: `erreichbar · ${JSON.stringify(json).slice(0, 80)}`,
    });
  } catch {
    befunde.push({
      bereich: 'Bridge',
      status: 'warnung',
      detail: 'nicht erreichbar — Rendern/Speak-to-Kosmo brauchen die HomeStation',
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
      {befunde?.map((b, i) => (
        <Karteikarte key={b.bereich} nr={i + 1} data-testid={`befund-${b.bereich}`}>
          <div style={{ display: 'grid', gap: 3, fontSize: 12.5 }}>
            <Badge hue={statusHue[b.status]}>{b.bereich}</Badge>
            <span style={{ color: 'var(--k-ink-soft)', lineHeight: 1.45 }}>{b.detail}</span>
          </div>
        </Karteikarte>
      ))}
    </div>
  );
}
