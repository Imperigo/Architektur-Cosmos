import { describe, expect, it } from 'vitest';
import { LORA_ADAPTER_REGISTRY } from '../src';

/**
 * v0.8.4 / PD2 «Eval-Harness kosmo-zeichner-commands» (`docs/V084-SPEZ.md`
 * D14/C-23) — additiver Regressionsschutz für das NEUE, optionale `eval`-Feld
 * auf `LoraAdapterStatus` (`lora-training.ts`). Eigene Datei statt Erweiterung
 * von `lora-training-sft.test.ts` (dessen bestehende 2 Tests im
 * `LORA_ADAPTER_REGISTRY`-Describe bleiben unangetastet — keine Notwendigkeit,
 * eine laufende, bereits grüne Datei anzufassen, um rein additives Verhalten
 * zu prüfen).
 */

describe('LoraAdapterStatus.eval (v0.8.4/PD2, additiv)', () => {
  it('kosmo-zeichner-commands trägt einen eval-Spiegel, der den eingecheckten eval-ergebnis.json-Stand nennt', () => {
    const zeile = LORA_ADAPTER_REGISTRY.find((r) => r.id === 'kosmo-zeichner-commands');
    expect(zeile?.eval).toBeDefined();
    // Der Spiegel zitiert die reale 35/35-Quote aus
    // wissen/training/eval/kosmo-zeichner-commands/eval-ergebnis.json (Feld
    // gesamt.bestanden/gesamt.von, PB2 v0.8.5: 25→35) — hier ehrlich als
    // String, kein rückgerechneter Prozentwert, der die Quelle verdeckt.
    expect(zeile?.eval?.quote).toContain('35/35');
    expect(zeile?.eval?.stand).toMatch(/PB2/);
    expect(zeile?.eval?.stand).toMatch(/kein Modell-Eval/i);
  });

  it('alle anderen fünf Adapter bleiben OHNE eval-Feld (additiv, kein erfundener Eval-Stand ohne Eval-Suite)', () => {
    const ohneEval = LORA_ADAPTER_REGISTRY.filter((r) => r.id !== 'kosmo-zeichner-commands');
    expect(ohneEval).toHaveLength(5);
    for (const r of ohneEval) {
      expect(r.eval).toBeUndefined();
    }
  });
});
