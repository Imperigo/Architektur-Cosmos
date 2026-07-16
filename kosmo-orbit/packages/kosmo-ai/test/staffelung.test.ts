import { describe, expect, it } from 'vitest';
import {
  CLOUD_MODELL_MIN,
  KOSMO_ROLLEN,
  STANDARD_ROLLEN_MODELL_KARTE,
  anthropicConfigFuerRolle,
  loeseRollenModelle,
  ollamaConfigFuerRolle,
  rolleFuerAufgabe,
  staffelungIstZusammengefasst,
  waehleModellFuerAufgabe,
  waehleModellFuerRolle,
  type Aufgabenklasse,
  type KosmoRolle,
} from '../src';

describe('Aufgabenklasse → Rolle (Mapping, begründet an der KI-Modell-Guideline)', () => {
  it('Meister-würdige Klassen: schreibender Werkzeug-Vorschlag + Entwurfsurteil', () => {
    expect(rolleFuerAufgabe('werkzeug-schreibend')).toBe('meister');
    expect(rolleFuerAufgabe('strategie-urteil')).toBe('meister');
  });

  it('Leiter-Klassen: Orchestrierung + Standard-Gesprächszug', () => {
    expect(rolleFuerAufgabe('orchestrierung')).toBe('leiter');
    expect(rolleFuerAufgabe('chat-standard')).toBe('leiter');
  });

  it('Zeichner-Klassen: lesende Werkzeuge, Zusammenfassung, Journal', () => {
    expect(rolleFuerAufgabe('werkzeug-lesend')).toBe('zeichner');
    expect(rolleFuerAufgabe('zusammenfassung')).toBe('zeichner');
    expect(rolleFuerAufgabe('journal')).toBe('zeichner');
  });

  it('jede Aufgabenklasse hat GENAU eine Rolle (keine Lücke, keine Doppeldeutigkeit)', () => {
    const klassen: Aufgabenklasse[] = [
      'werkzeug-schreibend',
      'strategie-urteil',
      'orchestrierung',
      'chat-standard',
      'werkzeug-lesend',
      'zusammenfassung',
      'journal',
    ];
    for (const k of klassen) {
      expect(KOSMO_ROLLEN).toContain(rolleFuerAufgabe(k));
    }
  });
});

describe('waehleModellFuerRolle — lokal (Ollama), Standard-Karte', () => {
  it('jede Rolle bekommt ein eigenes Modell aus der Guideline-Vorschlagskarte', () => {
    expect(waehleModellFuerRolle('meister', { provider: 'ollama' })).toBe(
      STANDARD_ROLLEN_MODELL_KARTE.lokal.meister,
    );
    expect(waehleModellFuerRolle('leiter', { provider: 'ollama' })).toBe(
      STANDARD_ROLLEN_MODELL_KARTE.lokal.leiter,
    );
    expect(waehleModellFuerRolle('zeichner', { provider: 'ollama' })).toBe(
      STANDARD_ROLLEN_MODELL_KARTE.lokal.zeichner,
    );
  });

  it('die drei lokalen Standard-Modelle sind paarweise verschieden (echte Staffelung, kein Etikettenschwindel)', () => {
    const { meister, leiter, zeichner } = STANDARD_ROLLEN_MODELL_KARTE.lokal;
    expect(new Set([meister, leiter, zeichner]).size).toBe(3);
  });

  it('Teil-Karte überschreibt nur die genannte Rolle, Rest bleibt Standard', () => {
    const konfig = { provider: 'ollama' as const, karte: { lokal: { zeichner: 'mein-schnelles-modell' } } };
    expect(waehleModellFuerRolle('zeichner', konfig)).toBe('mein-schnelles-modell');
    expect(waehleModellFuerRolle('meister', konfig)).toBe(STANDARD_ROLLEN_MODELL_KARTE.lokal.meister);
    expect(waehleModellFuerRolle('leiter', konfig)).toBe(STANDARD_ROLLEN_MODELL_KARTE.lokal.leiter);
  });
});

describe('waehleModellFuerRolle — Cloud (Anthropic): Meister/Leiter mindestens-Opus-gesichert', () => {
  it('Standard-Karte: Meister UND Leiter auf dem Opus-Boden, Zeichner günstiger', () => {
    expect(waehleModellFuerRolle('meister', { provider: 'anthropic' })).toBe(CLOUD_MODELL_MIN);
    expect(waehleModellFuerRolle('leiter', { provider: 'anthropic' })).toBe(CLOUD_MODELL_MIN);
    expect(waehleModellFuerRolle('zeichner', { provider: 'anthropic' })).toBe('claude-sonnet-5');
  });

  it('eine explizite (nicht-leere) Karten-Wahl für Meister/Leiter bleibt unangetastet (F1-Owner-Semantik, wie mindestensOpus)', () => {
    const konfig = {
      provider: 'anthropic' as const,
      karte: { cloud: { meister: 'claude-opus-4-8', leiter: 'claude-opus-4-8' } },
    };
    expect(waehleModellFuerRolle('meister', konfig)).toBe('claude-opus-4-8');
    expect(waehleModellFuerRolle('leiter', konfig)).toBe('claude-opus-4-8');
  });

  it('eine leere Karten-Wahl fällt für Meister/Leiter auf Opus zurück (mindestensOpus-Garantie greift auch über die Karte)', () => {
    const konfig = { provider: 'anthropic' as const, karte: { cloud: { meister: '', leiter: '   ' } } };
    expect(waehleModellFuerRolle('meister', konfig)).toBe(CLOUD_MODELL_MIN);
    expect(waehleModellFuerRolle('leiter', konfig)).toBe(CLOUD_MODELL_MIN);
  });

  it('Zeichner ist NICHT an Opus gebunden — ein günstigeres Cloud-Modell bleibt möglich', () => {
    const konfig = { provider: 'anthropic' as const, karte: { cloud: { zeichner: 'claude-haiku-4-5-20251001' } } };
    expect(waehleModellFuerRolle('zeichner', konfig)).toBe('claude-haiku-4-5-20251001');
  });
});

describe('einzelModell — ehrlicher Fallback für die bisherige Ein-Modell-Welt', () => {
  it('lokal: alle drei Rollen spielen dasselbe konfigurierte Modell', () => {
    const konfig = { provider: 'ollama' as const, einzelModell: 'llama3.1:8b' };
    expect(loeseRollenModelle(konfig)).toEqual({
      meister: 'llama3.1:8b',
      leiter: 'llama3.1:8b',
      zeichner: 'llama3.1:8b',
    });
    expect(staffelungIstZusammengefasst(konfig)).toBe(true);
  });

  it('Cloud: einzelModell respektiert weiterhin die mindestensOpus-Garantie für Meister/Leiter', () => {
    const gesetzt = { provider: 'anthropic' as const, einzelModell: 'claude-sonnet-5' };
    expect(waehleModellFuerRolle('meister', gesetzt)).toBe('claude-sonnet-5');
    expect(waehleModellFuerRolle('leiter', gesetzt)).toBe('claude-sonnet-5');
    expect(waehleModellFuerRolle('zeichner', gesetzt)).toBe('claude-sonnet-5');

    const leer = { provider: 'anthropic' as const, einzelModell: '' };
    expect(waehleModellFuerRolle('meister', leer)).toBe(CLOUD_MODELL_MIN);
    expect(waehleModellFuerRolle('leiter', leer)).toBe(CLOUD_MODELL_MIN);
  });

  it('einzelModell hat Vorrang vor karte UND lokalEinGpuModell', () => {
    const konfig = {
      provider: 'ollama' as const,
      einzelModell: 'gewinnt',
      lokalEinGpuModell: 'verliert',
      karte: { lokal: { meister: 'verliert-auch' } },
    };
    expect(loeseRollenModelle(konfig)).toEqual({ meister: 'gewinnt', leiter: 'gewinnt', zeichner: 'gewinnt' });
  });
});

describe('lokalEinGpuModell — Ein-GPU-Fall der Guideline (Leiter+Zeichner teilen, Meister bleibt eigen)', () => {
  it('Leiter und Zeichner teilen sich das Modell, Meister bleibt auf der Standard-Karte', () => {
    const konfig = { provider: 'ollama' as const, lokalEinGpuModell: 'qwen3-coder:30b' };
    const geloest = loeseRollenModelle(konfig);
    expect(geloest.leiter).toBe('qwen3-coder:30b');
    expect(geloest.zeichner).toBe('qwen3-coder:30b');
    expect(geloest.meister).toBe(STANDARD_ROLLEN_MODELL_KARTE.lokal.meister);
    expect(geloest.meister).not.toBe(geloest.leiter);
  });

  it('staffelungIstZusammengefasst meldet den Ein-GPU-Fall ehrlich', () => {
    expect(staffelungIstZusammengefasst({ provider: 'ollama', lokalEinGpuModell: 'ein-modell' })).toBe(true);
    expect(staffelungIstZusammengefasst({ provider: 'ollama' })).toBe(false);
  });

  it('wird bei Cloud ignoriert (kein Speicher-Limit dort)', () => {
    const konfig = { provider: 'anthropic' as const, lokalEinGpuModell: 'irrelevant-fuer-cloud' };
    expect(waehleModellFuerRolle('leiter', konfig)).toBe(CLOUD_MODELL_MIN);
    expect(waehleModellFuerRolle('zeichner', konfig)).toBe('claude-sonnet-5');
  });
});

describe('waehleModellFuerAufgabe — Aufgabenklasse direkt zum Modell', () => {
  it('ein schreibender Werkzeug-Vorschlag zieht lokal das Meister-Modell', () => {
    expect(waehleModellFuerAufgabe('werkzeug-schreibend', { provider: 'ollama' })).toBe(
      STANDARD_ROLLEN_MODELL_KARTE.lokal.meister,
    );
  });

  it('ein lesendes Werkzeug zieht cloud das Zeichner-Modell (kein Opus-Zwang)', () => {
    expect(waehleModellFuerAufgabe('werkzeug-lesend', { provider: 'anthropic' })).toBe('claude-sonnet-5');
  });

  it('Journal-Buchhaltung zieht dieselbe Rolle wie Zusammenfassung (beide Zeichner)', () => {
    const konfig = { provider: 'ollama' as const };
    expect(waehleModellFuerAufgabe('journal', konfig)).toBe(waehleModellFuerAufgabe('zusammenfassung', konfig));
  });

  it('Orchestrierung und Standard-Chat ziehen dieselbe Rolle (beide Leiter)', () => {
    const konfig = { provider: 'anthropic' as const };
    expect(waehleModellFuerAufgabe('orchestrierung', konfig)).toBe(waehleModellFuerAufgabe('chat-standard', konfig));
  });
});

describe('ollamaConfigFuerRolle / anthropicConfigFuerRolle — vollständige Provider-Configs, reines Zusammensetzen', () => {
  it('baut eine OllamaConfig mit dem rollenspezifischen Modell, restliche Felder unverändert durchgereicht', () => {
    const cfg = ollamaConfigFuerRolle('zeichner', { baseUrl: 'http://localhost:11434', temperature: 0.3 });
    expect(cfg).toEqual({
      baseUrl: 'http://localhost:11434',
      temperature: 0.3,
      model: STANDARD_ROLLEN_MODELL_KARTE.lokal.zeichner,
    });
  });

  it('baut eine AnthropicConfig; Meister ist mindestens-Opus-gesichert', () => {
    const cfg = anthropicConfigFuerRolle('meister', { apiKey: 'sk-test' });
    expect(cfg).toEqual({ apiKey: 'sk-test', model: CLOUD_MODELL_MIN });
  });

  it('AnthropicConfig für Zeichner nutzt das güngstigere Standard-Cloud-Modell', () => {
    const cfg = anthropicConfigFuerRolle('zeichner', { apiKey: 'sk-test' });
    expect(cfg.model).toBe('claude-sonnet-5');
  });
});

describe('KOSMO_ROLLEN — Konstante ist vollständig und stabil', () => {
  it('enthält genau die drei Rollen, in Meister/Leiter/Zeichner-Reihenfolge', () => {
    expect(KOSMO_ROLLEN).toEqual<KosmoRolle[]>(['meister', 'leiter', 'zeichner']);
  });
});
