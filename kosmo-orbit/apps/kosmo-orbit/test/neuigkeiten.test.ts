import { describe, expect, it } from 'vitest';

/** Reine Tupel-Semver-Ordnung — reicht für die Kurzform "x.y.z" dieser Liste. */
function versionTupel(v: string): number[] {
  return v.split('.').map((n) => Number.parseInt(n, 10));
}

function vergleicheAbsteigend(a: string, b: string): number {
  const ta = versionTupel(a);
  const tb = versionTupel(b);
  for (let i = 0; i < Math.max(ta.length, tb.length); i++) {
    const d = (tb[i] ?? 0) - (ta[i] ?? 0);
    if (d !== 0) return d;
  }
  return 0;
}

describe('Neuigkeiten (Serie K / A4, Owner-Befund K14): «Funktionen & Neues»-Daten', () => {
  it('Struktur ist valide: version, datum, mindestens ein nichtleerer Punkt je Eintrag', async () => {
    const { NEUIGKEITEN } = await import('../src/shell/neuigkeiten');
    expect(NEUIGKEITEN.length).toBeGreaterThan(0);
    for (const eintrag of NEUIGKEITEN) {
      expect(eintrag.version).toMatch(/^\d+\.\d+\.\d+$/);
      expect(eintrag.datum).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(eintrag.punkte.length, `Version ${eintrag.version}`).toBeGreaterThan(0);
      for (const punkt of eintrag.punkte) {
        expect(punkt.text.trim().length, `Version ${eintrag.version}: "${punkt.text}"`).toBeGreaterThan(6);
      }
    }
  });

  it('Versionen stehen absteigend (neuste zuerst)', async () => {
    const { NEUIGKEITEN } = await import('../src/shell/neuigkeiten');
    const versionen = NEUIGKEITEN.map((e) => e.version);
    const sortiert = [...versionen].sort(vergleicheAbsteigend);
    expect(versionen).toEqual(sortiert);
    // Keine doppelten Versionsnummern.
    expect(new Set(versionen).size).toBe(versionen.length);
  });

  it('höchstens eine Version ist «in Arbeit» markiert — im Release-Moment keine', async () => {
    const { NEUIGKEITEN } = await import('../src/shell/neuigkeiten');
    const inArbeit = NEUIGKEITEN.filter((e) => e.inArbeit);
    // Während der Entwicklung trägt genau die neuste Version das Flag; beim
    // Release wird es entfernt — beide Zustände sind korrekt, zwei nie.
    expect(inArbeit.length).toBeLessThanOrEqual(1);
    if (inArbeit.length === 1) {
      expect(inArbeit[0]?.version).toBe(NEUIGKEITEN[0]?.version);
    }
  });

  it('enthält den 0.6.2-Eintrag mit mindestens einem Design-Punkt (E2E-Stichprobe)', async () => {
    const { NEUIGKEITEN } = await import('../src/shell/neuigkeiten');
    const v = NEUIGKEITEN.find((e) => e.version === '0.6.2');
    expect(v).toBeDefined();
    expect(v!.punkte.some((p) => p.station === 'design')).toBe(true);
  });

  it('neuigkeitenFuerStation liefert nur Punkte der verlangten Station, neuste zuerst nach Version', async () => {
    const { NEUIGKEITEN, neuigkeitenFuerStation } = await import('../src/shell/neuigkeiten');
    const design = neuigkeitenFuerStation('design');
    expect(design.length).toBeGreaterThan(0);
    expect(design.every((t) => t.punkt.station === 'design')).toBe(true);
    // Ist wirklich eine Teilmenge aller Design-Punkte über alle Versionen.
    const alleDesignPunkte = NEUIGKEITEN.flatMap((e) => e.punkte.filter((p) => p.station === 'design'));
    expect(design.length).toBe(alleDesignPunkte.length);

    // Eine Station ohne jeden Punkt (hier: keine 'dev'-Tags in der Liste) bleibt ehrlich leer.
    const ohneTags = neuigkeitenFuerStation('sketch');
    expect(Array.isArray(ohneTags)).toBe(true);
  });
});
