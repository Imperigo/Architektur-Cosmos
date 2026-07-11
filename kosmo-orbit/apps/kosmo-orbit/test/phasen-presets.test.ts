import { describe, expect, it } from 'vitest';
import { empfohlenePlanPhase, type SiaPhase } from '@kosmo/kernel';
import {
  ALLE_FAEHIGKEITEN,
  empfohlenePlanPhaseFuer,
  FAEHIGKEIT_LABEL,
  PHASEN_PRESETS,
  phasenPresetFuer,
  type FaehigkeitId,
} from '../src/modules/design/phasen-presets';

/**
 * A8 (K18): reine Datentabelle, kein DOM/React nötig (Muster A4). Beweist
 * die drei Owner-Anforderungen aus dem Bauauftrag: (1) vollständig — jede
 * der (seit v0.7.2, W2-C: 8) SIA-Teilphasen hat ein Preset; (2) referenzierte
 * Fähigkeits-IDs existieren; (3) die Plan-Detaillierungs-Empfehlung läuft
 * ausschliesslich über die bestehende Kernel-Funktion `empfohlenePlanPhase`
 * (keine zweite, divergierende Quelle).
 */

const ALLE_SIA_PHASEN: readonly SiaPhase[] = [
  // v0.7.2: 'strategie' additiv (SIA 112 Ph. 1) — s. `phasen-presets.ts`.
  'strategie',
  'wettbewerb',
  'vorprojekt',
  'bauprojekt',
  'bewilligung',
  'ausschreibung',
  'ausfuehrung',
  'abnahme',
];

describe('PHASEN_PRESETS — vollständig, je SIA-Teilphase genau ein Preset', () => {
  it('kennt exakt die 8 SIA-Teilphasen (inkl. additiv "strategie"), keine mehr, keine weniger', () => {
    expect(Object.keys(PHASEN_PRESETS).sort()).toEqual([...ALLE_SIA_PHASEN].sort());
  });

  it('jedes Preset trägt seine eigene Phase (kein Copy-Paste-Fehler)', () => {
    for (const phase of ALLE_SIA_PHASEN) {
      expect(PHASEN_PRESETS[phase].phase).toBe(phase);
    }
  });

  it('jedes Preset hat mindestens eine Fähigkeit im Fokus', () => {
    for (const phase of ALLE_SIA_PHASEN) {
      expect(PHASEN_PRESETS[phase].imFokus.length).toBeGreaterThan(0);
    }
  });

  it('jede referenzierte Fähigkeits-ID existiert in ALLE_FAEHIGKEITEN', () => {
    for (const phase of ALLE_SIA_PHASEN) {
      for (const id of PHASEN_PRESETS[phase].imFokus) {
        expect(ALLE_FAEHIGKEITEN).toContain(id);
      }
    }
  });

  it('jede Fähigkeit hat ein deutsches Label', () => {
    for (const id of ALLE_FAEHIGKEITEN) {
      expect(typeof FAEHIGKEIT_LABEL[id]).toBe('string');
      expect(FAEHIGKEIT_LABEL[id].length).toBeGreaterThan(0);
    }
  });

  it('phasenPresetFuer liest exakt PHASEN_PRESETS[phase]', () => {
    for (const phase of ALLE_SIA_PHASEN) {
      expect(phasenPresetFuer(phase)).toBe(PHASEN_PRESETS[phase]);
    }
  });
});

describe('Umbau-Filter-Empfehlung — nur für die drei Phasen, in denen die Unterscheidung praktisch greift', () => {
  it('ist gesetzt für bewilligung/ausschreibung/ausfuehrung', () => {
    expect(PHASEN_PRESETS.bewilligung.umbauFilterDefault).toBe('neu');
    expect(PHASEN_PRESETS.ausschreibung.umbauFilterDefault).toBe('abbruch');
    expect(PHASEN_PRESETS.ausfuehrung.umbauFilterDefault).toBe('neu');
  });

  it('bleibt undefiniert für wettbewerb/vorprojekt/bauprojekt/abnahme — kein erfundener Wert', () => {
    expect(PHASEN_PRESETS.wettbewerb.umbauFilterDefault).toBeUndefined();
    expect(PHASEN_PRESETS.vorprojekt.umbauFilterDefault).toBeUndefined();
    expect(PHASEN_PRESETS.bauprojekt.umbauFilterDefault).toBeUndefined();
    expect(PHASEN_PRESETS.abnahme.umbauFilterDefault).toBeUndefined();
  });
});

describe('empfohlenePlanPhaseFuer — reiner Durchreicher zur Kernel-Funktion, keine Zweitquelle', () => {
  it('liefert für jede Phase exakt dasselbe wie die Kernel-Funktion empfohlenePlanPhase', () => {
    for (const phase of ALLE_SIA_PHASEN) {
      expect(empfohlenePlanPhaseFuer(phase)).toBe(empfohlenePlanPhase(phase));
    }
  });
});

describe('FaehigkeitId/ALLE_FAEHIGKEITEN — die sechs Icons der A7-Gruppe', () => {
  it('sind genau sechs, ohne Duplikate', () => {
    expect(ALLE_FAEHIGKEITEN.length).toBe(6);
    expect(new Set(ALLE_FAEHIGKEITEN).size).toBe(6);
  });

  it('enthält Sonnenstudie/Volumenstudien/KV/Bauablauf/Mängel/Submissions-Check', () => {
    const erwartet: FaehigkeitId[] = ['sonne', 'volumenstudien', 'kv', 'bauablauf', 'maengel', 'submission'];
    expect([...ALLE_FAEHIGKEITEN].sort()).toEqual([...erwartet].sort());
  });
});
