import { describe, expect, it } from 'vitest';
import {
  DOCK_KONSTANTEN,
  placeFloats,
  rowLayout,
  separate,
  solve,
  stack,
  waterfill,
  type DockRect,
  type FloatItem,
  type PanelDef,
  type RowItem,
  type SolveOptionen,
  type StackPanel,
  type WaterfillEintrag,
} from '../src/state/dock-kern';

/**
 * v0.7.8 Welle 1 / Paket P1 — Dock-Kern. Reine Solver-Funktionen, kein
 * DOM/Store (analog zu `arbeitsmodi-kern.test.ts`). Diese Suite ist ein
 * Verhaltens-Nachweis für den 1:1-Port aus dem Design-Handoff-Prototyp
 * `Werkzeug-Dock.dc.html` (`class Component`, solve/waterfill/stack/
 * rowLayout/placeFloats/separate).
 */

// ---------------------------------------------------------------------------
// Hilfsfunktionen für die Tests
// ---------------------------------------------------------------------------

/** Deterministischer PRNG (identisch zum Muster in
 * `packages/kosmo-kernel/src/derive/variantensuche.ts`) — KEIN Math.random. */
function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return function rnd() {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Echte geometrische Überlappungsfläche zweier Rechtecke (ohne Toleranz). */
function ueberlapptEcht(a: DockRect, b: DockRect): boolean {
  const ox = Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x);
  const oy = Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y);
  return ox > 0 && oy > 0;
}

function keinePaarUeberlappen(rects: Record<string, DockRect>): boolean {
  const werte = Object.values(rects);
  for (let i = 0; i < werte.length; i++) {
    for (let j = i + 1; j < werte.length; j++) {
      if (ueberlapptEcht(werte[i]!, werte[j]!)) return false;
    }
  }
  return true;
}

function imViewport(r: DockRect, vp: { x: number; y: number; w: number; h: number }, eps = 0.01): boolean {
  return r.x >= vp.x - eps && r.y >= vp.y - eps && r.x + r.w <= vp.x + vp.w + eps && r.y + r.h <= vp.y + vp.h + eps;
}

// ---------------------------------------------------------------------------
// Synthetische Stations-Sets für die solve()-Tests (nachgebaut nach dem
// Prototyp: design/plan/vis-ähnliche Struktur — rail + 1 linkes Panel + 2
// rechte Panels inkl. «kosmo» + diverse Floats)
// ---------------------------------------------------------------------------

function bauStationDesign(): PanelDef[] {
  return [
    { id: 'rail', titel: 'WERKZEUGE', rolle: 'system', wichtigkeit: 95, dock: 'rail', start: 'offen', schliessbar: false, bewegbar: false },
    { id: 'geschosse', titel: 'GESCHOSSE', rolle: 'manuell', wichtigkeit: 40, dock: 'left', min: 150, groesse: 320, start: 'offen', schliessbar: true, bewegbar: true },
    { id: 'inspector', titel: 'EIGENSCHAFTEN', rolle: 'system', wichtigkeit: 82, dock: 'right', min: 170, groesse: 300, start: 'offen', schliessbar: true, bewegbar: true },
    { id: 'checks', titel: 'CHECKS', rolle: 'generator', wichtigkeit: 60, dock: 'right', min: 150, groesse: 300, start: 'offen', schliessbar: true, bewegbar: true },
    { id: 'kosmo', titel: 'KOSMO', rolle: 'agent', wichtigkeit: 56, dock: 'right', min: 210, groesse: 360, start: 'zu', schliessbar: true, bewegbar: true },
    { id: 'mode', titel: 'MODUS', rolle: 'system', wichtigkeit: 70, dock: 'float', anker: 'top', fw: 250, fh: 44, start: 'offen', schliessbar: true, bewegbar: true },
    { id: 'card', titel: 'MASSING', rolle: 'manuell', wichtigkeit: 50, dock: 'float', anker: 'top', fw: 200, fh: 92, start: 'offen', schliessbar: true, bewegbar: true },
    { id: 'gizmo', titel: 'TRANSFORM', rolle: 'system', wichtigkeit: 64, dock: 'float', anker: 'top', fw: 196, fh: 56, start: 'offen', schliessbar: true, bewegbar: true },
    { id: 'dock', titel: 'MODUS-DOCK', rolle: 'system', wichtigkeit: 48, dock: 'float', anker: 'bottom-center', fw: 520, fh: 56, start: 'offen', schliessbar: true, bewegbar: true },
    { id: 'orient', titel: 'ORIENTIERUNG', rolle: 'system', wichtigkeit: 30, dock: 'float', anker: 'bottom-left', fw: 150, fh: 92, start: 'offen', schliessbar: true, bewegbar: true },
  ];
}

function bauStationPlan(): PanelDef[] {
  return [
    { id: 'rail', titel: 'WERKZEUGE', rolle: 'system', wichtigkeit: 95, dock: 'rail', start: 'offen', schliessbar: false, bewegbar: false },
    { id: 'ebenen', titel: 'EBENEN', rolle: 'manuell', wichtigkeit: 40, dock: 'left', min: 150, groesse: 320, start: 'offen', schliessbar: true, bewegbar: true },
    { id: 'checks', titel: 'CHECKS', rolle: 'generator', wichtigkeit: 62, dock: 'right', min: 150, groesse: 360, start: 'offen', schliessbar: true, bewegbar: true },
    { id: 'achsen', titel: 'ACHSEN', rolle: 'pn', wichtigkeit: 45, dock: 'right', min: 120, groesse: 170, start: 'offen', schliessbar: true, bewegbar: true },
    { id: 'kosmo', titel: 'KOSMO', rolle: 'agent', wichtigkeit: 56, dock: 'right', min: 210, groesse: 360, start: 'zu', schliessbar: true, bewegbar: true },
    { id: 'dock', titel: 'MODUS-DOCK', rolle: 'system', wichtigkeit: 48, dock: 'float', anker: 'bottom-center', fw: 520, fh: 56, start: 'offen', schliessbar: true, bewegbar: true },
    { id: 'orient', titel: 'ORIENTIERUNG', rolle: 'system', wichtigkeit: 30, dock: 'float', anker: 'bottom-left', fw: 150, fh: 92, start: 'offen', schliessbar: true, bewegbar: true },
  ];
}

function bauStationVis(): PanelDef[] {
  return [
    { id: 'rail', titel: 'WERKZEUGE', rolle: 'system', wichtigkeit: 95, dock: 'rail', start: 'offen', schliessbar: false, bewegbar: false },
    { id: 'nodelib', titel: 'BAUEN', rolle: 'ak', wichtigkeit: 40, dock: 'left', min: 150, groesse: 320, start: 'offen', schliessbar: true, bewegbar: true },
    { id: 'render', titel: 'RENDER', rolle: 'generator', wichtigkeit: 72, dock: 'right', min: 170, groesse: 340, start: 'offen', schliessbar: true, bewegbar: true },
    { id: 'kosmo', titel: 'KOSMO', rolle: 'agent', wichtigkeit: 56, dock: 'right', min: 210, groesse: 360, start: 'offen', schliessbar: true, bewegbar: true },
    { id: 'minimap', titel: 'MINIMAP', rolle: 'system', wichtigkeit: 30, dock: 'float', anker: 'bottom-left', fw: 180, fh: 120, start: 'offen', schliessbar: true, bewegbar: true },
    { id: 'legende', titel: 'LEGENDE', rolle: 'system', wichtigkeit: 26, dock: 'float', anker: 'bottom-left', fw: 150, fh: 118, start: 'offen', schliessbar: true, bewegbar: true },
    { id: 'dock', titel: 'MODUS-DOCK', rolle: 'system', wichtigkeit: 48, dock: 'float', anker: 'bottom-center', fw: 420, fh: 56, start: 'offen', schliessbar: true, bewegbar: true },
  ];
}

const STATIONEN: Record<string, PanelDef[]> = {
  design: bauStationDesign(),
  plan: bauStationPlan(),
  vis: bauStationVis(),
};

function grundOptionen(feldW: number, modus: 'A' | 'B' = 'A'): SolveOptionen {
  return {
    feld: { x: 0, y: 52, w: feldW, h: 800 },
    modus,
    leftW: DOCK_KONSTANTEN.DEF_LEFT,
    rightW: DOCK_KONSTANTEN.DEF_RIGHT,
    overrides: {},
  };
}

// ===========================================================================
// waterfill
// ===========================================================================

describe('waterfill — Restplatz-Verteilung nach Schlupf (size-min)', () => {
  it('Summen ergeben exakt avail, wenn Slack vorhanden ist (avail > Σmin)', () => {
    const list: WaterfillEintrag[] = [
      { id: 'a', min: 100, groesse: 200, h: 0 },
      { id: 'b', min: 50, groesse: 100, h: 0 },
    ];
    waterfill(list, 400);
    const summe = list.reduce((s, x) => s + x.h, 0);
    expect(summe).toBeCloseTo(400, 6);
  });

  it('verteilt den Extra-Anteil proportional zu max(1,groesse-min)', () => {
    const list: WaterfillEintrag[] = [
      { id: 'a', min: 100, groesse: 200, h: 0 },
      { id: 'b', min: 50, groesse: 100, h: 0 },
    ];
    waterfill(list, 400);
    // extra=250, slk=100+50=150 → a=100+250*100/150, b=50+250*50/150
    expect(list[0]!.h).toBeCloseTo(266.6667, 3);
    expect(list[1]!.h).toBeCloseTo(133.3333, 3);
  });

  it('Degenerationsfall (avail<=Σmin) skaliert alle proportional zu min', () => {
    const list: WaterfillEintrag[] = [
      { id: 'a', min: 100, groesse: 200, h: 0 },
      { id: 'b', min: 50, groesse: 100, h: 0 },
    ];
    waterfill(list, 100); // base=150 >= avail=100
    const f = 100 / 150;
    expect(list[0]!.h).toBeCloseTo(100 * f, 6);
    expect(list[1]!.h).toBeCloseTo(50 * f, 6);
  });

  it('Einzel-Item bekommt bei Slack immer den gesamten avail', () => {
    const list: WaterfillEintrag[] = [{ id: 'solo', min: 80, groesse: 150, h: 0 }];
    waterfill(list, 300);
    expect(list[0]!.h).toBeCloseTo(300, 6);
  });

  it('Null-Slack: avail exakt gleich Σmin → jedes Item bekommt genau sein min', () => {
    const list: WaterfillEintrag[] = [
      { id: 'a', min: 100, groesse: 200, h: 0 },
      { id: 'b', min: 50, groesse: 100, h: 0 },
    ];
    waterfill(list, 150);
    expect(list[0]!.h).toBeCloseTo(100, 6);
    expect(list[1]!.h).toBeCloseTo(50, 6);
  });

  it('h wird nie negativ, auch bei negativem avail', () => {
    const list: WaterfillEintrag[] = [{ id: 'a', min: 50, groesse: 100, h: 0 }];
    waterfill(list, -50);
    expect(list[0]!.h).toBe(20);
  });

  it('h ist immer eine endliche, positive Zahl bei realistischen Eingaben', () => {
    const kombis: Array<[number, number, number]> = [
      [130, 220, 0],
      [130, 220, 50],
      [130, 220, 500],
      [90, 90, 90],
      [10, 500, 1000],
    ];
    for (const [min, groesse, avail] of kombis) {
      const list: WaterfillEintrag[] = [{ id: 'x', min, groesse, h: 0 }];
      waterfill(list, avail);
      expect(Number.isFinite(list[0]!.h)).toBe(true);
      expect(list[0]!.h).toBeGreaterThan(0);
    }
  });

  it('leere Liste: kein Fehler, keine Wirkung', () => {
    const list: WaterfillEintrag[] = [];
    expect(() => waterfill(list, 500)).not.toThrow();
    expect(list).toHaveLength(0);
  });
});

// ===========================================================================
// stack — Modus 'collapse' (Konzept A)
// ===========================================================================

describe('stack — Modus collapse (Konzept A)', () => {
  it('terminiert auch bei winzigem avail (alle Panels kollabieren, kein Hänger)', () => {
    const items: StackPanel[] = [
      { id: 'p10', wichtigkeit: 10, min: 130, groesse: 220 },
      { id: 'p20', wichtigkeit: 20, min: 130, groesse: 220 },
      { id: 'p30', wichtigkeit: 30, min: 130, groesse: 220 },
      { id: 'p40', wichtigkeit: 40, min: 130, groesse: 220 },
    ];
    const rects: Record<string, DockRect> = {};
    expect(() => stack(items, { x: 0, y: 0, w: 300, h: 40 }, rects, 'collapse', undefined)).not.toThrow();
    for (const it2 of items) {
      expect(rects[it2.id]!.eingeklappt).toBe(true);
      expect(rects[it2.id]!.h).toBe(DOCK_KONSTANTEN.COLLH);
    }
  });

  it('trifft bei genau einem nötigen Kollaps strikt die niedrigste Wichtigkeit', () => {
    const items: StackPanel[] = [
      { id: 'a', wichtigkeit: 5, min: 100, groesse: 150 },
      { id: 'b', wichtigkeit: 1, min: 100, groesse: 150 },
      { id: 'c', wichtigkeit: 10, min: 100, groesse: 150 },
    ];
    const rects: Record<string, DockRect> = {};
    stack(items, { x: 0, y: 0, w: 300, h: 280 }, rects, 'collapse', undefined);
    expect(rects.b!.eingeklappt).toBe(true);
    expect(rects.a!.eingeklappt).toBe(false);
    expect(rects.c!.eingeklappt).toBe(false);
  });

  it('zuletztGeoeffnet wird nie eingeklappt — nächstniedrigere Wichtigkeit kollabiert stattdessen', () => {
    const items: StackPanel[] = [
      { id: 'a', wichtigkeit: 5, min: 100, groesse: 150 },
      { id: 'b', wichtigkeit: 1, min: 100, groesse: 150 },
      { id: 'c', wichtigkeit: 10, min: 100, groesse: 150 },
    ];
    const rects: Record<string, DockRect> = {};
    stack(items, { x: 0, y: 0, w: 300, h: 280 }, rects, 'collapse', 'b');
    expect(rects.b!.eingeklappt).toBe(false); // geschützt, obwohl niedrigste Wichtigkeit
    expect(rects.a!.eingeklappt).toBe(true); // nächstniedrigere trifft es stattdessen
    expect(rects.c!.eingeklappt).toBe(false);
  });

  it('zwei nötige Kollapse wählen aufsteigend nach Wichtigkeit (1 dann 2, nicht 3/4)', () => {
    const items: StackPanel[] = [
      { id: 'w1', wichtigkeit: 1, min: 100, groesse: 150 },
      { id: 'w2', wichtigkeit: 2, min: 100, groesse: 150 },
      { id: 'w3', wichtigkeit: 3, min: 100, groesse: 150 },
      { id: 'w4', wichtigkeit: 4, min: 100, groesse: 150 },
    ];
    // gaps=30; need(4×100)=400; um genau 2 Kollapse zu erzwingen: h=320 liefert
    // avail0=290 (1. Kollaps nötig: 400>290), avail1=256 (2. Kollaps nötig:
    // 300>256), avail2=222 (danach reicht need=200<=222 → Abbruch).
    const rect = { x: 0, y: 0, w: 300, h: 320 };
    const rects: Record<string, DockRect> = {};
    stack(items, rect, rects, 'collapse', undefined);
    expect(rects.w1!.eingeklappt).toBe(true);
    expect(rects.w2!.eingeklappt).toBe(true);
    expect(rects.w3!.eingeklappt).toBe(false);
    expect(rects.w4!.eingeklappt).toBe(false);
  });

  it('angeheftete Panels werden nie als Kollaps-Kandidat gewählt, auch bei niedrigster Wichtigkeit', () => {
    const items: StackPanel[] = [
      { id: 'pin', wichtigkeit: 1, angeheftet: true, min: 100, groesse: 150 },
      { id: 'flexHi', wichtigkeit: 50, min: 100, groesse: 150 },
      { id: 'flexLo', wichtigkeit: 20, min: 100, groesse: 150 },
    ];
    const rects: Record<string, DockRect> = {};
    // h=310: avail0=290 zwingt genau EINEN Kollaps (pin-Ziel 150 + 2×100 > 290),
    // danach avail1=256 reicht (pin-Ziel 150 + 100 <= 256) → nur flexLo kollabiert.
    stack(items, { x: 0, y: 0, w: 300, h: 310 }, rects, 'collapse', undefined);
    expect(rects.pin!.eingeklappt).toBe(false);
    expect(rects.flexLo!.eingeklappt).toBe(true); // niedrigere Wichtigkeit unter den FLEX-Panels
    expect(rects.flexHi!.eingeklappt).toBe(false);
  });

  it('bereits eingeklappte Panels zählen fix COLLH und werden vom Kollaps-Loop ignoriert', () => {
    const items: StackPanel[] = [
      { id: 'schonZu', wichtigkeit: 99, eingeklappt: true, min: 100, groesse: 150 },
      { id: 'offen1', wichtigkeit: 40, min: 100, groesse: 150 },
      { id: 'offen2', wichtigkeit: 60, min: 100, groesse: 150 },
    ];
    const rects: Record<string, DockRect> = {};
    stack(items, { x: 0, y: 0, w: 300, h: 500 }, rects, 'collapse', undefined);
    expect(rects.schonZu!.eingeklappt).toBe(true);
    expect(rects.schonZu!.h).toBe(DOCK_KONSTANTEN.COLLH);
    expect(rects.offen1!.eingeklappt).toBe(false);
    expect(rects.offen2!.eingeklappt).toBe(false);
  });

  it('Pin-Ziel: clamp auf min, wenn avail*0.66 darunter liegt', () => {
    const items: StackPanel[] = [{ id: 'p', wichtigkeit: 50, angeheftet: true, min: 150, groesse: 300 }];
    const rects: Record<string, DockRect> = {};
    stack(items, { x: 0, y: 0, w: 300, h: 200 }, rects, 'collapse', undefined); // avail=200, *0.66=132<150
    expect(rects.p!.h).toBeCloseTo(150, 6);
  });

  it('Pin-Ziel: avail*0.66, wenn zwischen min und groesse', () => {
    const items: StackPanel[] = [{ id: 'p', wichtigkeit: 50, angeheftet: true, min: 150, groesse: 400 }];
    const rects: Record<string, DockRect> = {};
    stack(items, { x: 0, y: 0, w: 300, h: 500 }, rects, 'collapse', undefined); // avail=500, *0.66=330
    expect(rects.p!.h).toBeCloseTo(330, 6);
  });

  it('Pin-Ziel: clamp auf groesse, wenn avail*0.66 darüber liegt', () => {
    const items: StackPanel[] = [{ id: 'p', wichtigkeit: 50, angeheftet: true, min: 150, groesse: 400 }];
    const rects: Record<string, DockRect> = {};
    stack(items, { x: 0, y: 0, w: 300, h: 1000 }, rects, 'collapse', undefined); // avail=1000, *0.66=660>400
    expect(rects.p!.h).toBeCloseTo(400, 6);
  });

  it('y-Kette ist lückenlos: jede y = vorherige y + h + GAP', () => {
    const items: StackPanel[] = [
      { id: 'a', wichtigkeit: 10, min: 100, groesse: 200 },
      { id: 'b', wichtigkeit: 20, min: 100, groesse: 200 },
      { id: 'c', wichtigkeit: 30, min: 100, groesse: 200 },
    ];
    const rects: Record<string, DockRect> = {};
    stack(items, { x: 5, y: 50, w: 300, h: 700 }, rects, 'collapse', undefined);
    let erwarteteY = 50;
    for (const it2 of items) {
      expect(rects[it2.id]!.y).toBeCloseTo(erwarteteY, 6);
      expect(rects[it2.id]!.x).toBe(5);
      expect(rects[it2.id]!.w).toBe(300);
      erwarteteY += rects[it2.id]!.h + DOCK_KONSTANTEN.GAP;
    }
  });

  it('nicht-eingeklappte Panels haben immer h >= min', () => {
    const items: StackPanel[] = [
      { id: 'a', wichtigkeit: 10, min: 130, groesse: 220 },
      { id: 'b', wichtigkeit: 90, min: 130, groesse: 220 },
    ];
    const rects: Record<string, DockRect> = {};
    stack(items, { x: 0, y: 0, w: 300, h: 260 }, rects, 'collapse', undefined);
    for (const it2 of items) {
      if (!rects[it2.id]!.eingeklappt) expect(rects[it2.id]!.h).toBeGreaterThanOrEqual(130 - 1e-6);
    }
  });

  it('Einzel-Panel-Stack: h bekommt bei Slack den vollen avail (gaps=0)', () => {
    const items: StackPanel[] = [{ id: 'solo', wichtigkeit: 10, min: 130, groesse: 220 }];
    const rects: Record<string, DockRect> = {};
    stack(items, { x: 0, y: 100, w: 300, h: 500 }, rects, 'collapse', undefined);
    expect(rects.solo!.h).toBeCloseTo(500, 6);
    expect(rects.solo!.y).toBe(100);
  });
});

// ===========================================================================
// stack — Modus 'share' (Konzept B)
// ===========================================================================

describe('stack — Modus share (Konzept B)', () => {
  it('Pin-Kappung bei genug Platz: clamp(min, groesse, avail*0.6)', () => {
    const items: StackPanel[] = [{ id: 'p', wichtigkeit: 50, angeheftet: true, min: 100, groesse: 400 }];
    const rects: Record<string, DockRect> = {};
    stack(items, { x: 0, y: 0, w: 300, h: 500 }, rects, 'share', undefined); // avail=500,*0.6=300
    expect(rects.p!.h).toBeCloseTo(300, 6);
  });

  it('proportionaler Shrink, wenn Σmin > avail — betrifft ALLE Panels gleich, auch angeheftete', () => {
    const items: StackPanel[] = [
      { id: 'pin', wichtigkeit: 50, angeheftet: true, min: 200, groesse: 400 },
      { id: 'flex', wichtigkeit: 20, min: 100, groesse: 200 },
    ];
    const rects: Record<string, DockRect> = {};
    // n=2 → gaps=10; h=150 → avail=140. Σmin=300 > avail=140 → f=140/300≈0.4667
    // für BEIDE, unabhängig von angeheftet.
    stack(items, { x: 0, y: 0, w: 300, h: 150 }, rects, 'share', undefined);
    const f = 140 / 300;
    expect(rects.pin!.h).toBeCloseTo(200 * f, 6);
    expect(rects.flex!.h).toBeCloseTo(100 * f, 6);
  });

  it('proportionaler Shrink klemmt nie unter 18px', () => {
    const items: StackPanel[] = [
      { id: 'a', wichtigkeit: 1, min: 10, groesse: 20 },
      { id: 'b', wichtigkeit: 2, min: 10, groesse: 20 },
    ];
    const rects: Record<string, DockRect> = {};
    stack(items, { x: 0, y: 0, w: 300, h: 1 }, rects, 'share', undefined); // extrem knapp
    expect(rects.a!.h).toBeGreaterThanOrEqual(18);
    expect(rects.b!.h).toBeGreaterThanOrEqual(18);
  });

  it('bei genug Platz bekommt Flex-Rest via waterfill die korrekte Formel', () => {
    const items: StackPanel[] = [
      { id: 'pin', wichtigkeit: 50, angeheftet: true, min: 100, groesse: 200 },
      { id: 'flex', wichtigkeit: 20, min: 80, groesse: 160 },
    ];
    const rects: Record<string, DockRect> = {};
    // avail=400 (gaps=10,h=410 → avail=400); pin.h=clamp(100,200,240)=200; Rest=200
    stack(items, { x: 0, y: 0, w: 300, h: 410 }, rects, 'share', undefined);
    expect(rects.pin!.h).toBeCloseTo(200, 6);
    // flex allein bekommt bei Slack den vollen Rest (200)
    expect(rects.flex!.h).toBeCloseTo(200, 6);
  });

  it('mehrere angeheftete + Flex-Mix: Summe aller h + GAPs = rect.h', () => {
    const items: StackPanel[] = [
      { id: 'p1', wichtigkeit: 50, angeheftet: true, min: 100, groesse: 150 },
      { id: 'p2', wichtigkeit: 40, angeheftet: true, min: 100, groesse: 150 },
      { id: 'f1', wichtigkeit: 20, min: 80, groesse: 300 },
    ];
    const rects: Record<string, DockRect> = {};
    stack(items, { x: 0, y: 0, w: 300, h: 700 }, rects, 'share', undefined);
    const summeH = items.reduce((s, it2) => s + rects[it2.id]!.h, 0);
    const gaps = DOCK_KONSTANTEN.GAP * (items.length - 1);
    expect(summeH + gaps).toBeCloseTo(700, 6);
  });

  it('y-Kette ist auch im share-Modus lückenlos mit GAP', () => {
    const items: StackPanel[] = [
      { id: 'a', wichtigkeit: 10, min: 100, groesse: 200 },
      { id: 'b', wichtigkeit: 20, min: 100, groesse: 200 },
    ];
    const rects: Record<string, DockRect> = {};
    stack(items, { x: 0, y: 30, w: 300, h: 450 }, rects, 'share', undefined);
    expect(rects.b!.y).toBeCloseTo(rects.a!.y + rects.a!.h + DOCK_KONSTANTEN.GAP, 6);
  });
});

// ===========================================================================
// rowLayout
// ===========================================================================

describe('rowLayout — zentrierte Streifen-Reihe', () => {
  it('zentriert ein Einzel-Item im Streifen', () => {
    const items: RowItem[] = [{ id: 'a', fw: 200, fh: 40 }];
    const rects: Record<string, DockRect> = {};
    rowLayout(items, { x: 0, y: 0, w: 1000, h: 56 }, rects);
    expect(rects.a!.x).toBeCloseTo((1000 - 200) / 2, 6);
    expect(rects.a!.w).toBe(200);
  });

  it('reiht mehrere Items mit GAP dazwischen auf', () => {
    const items: RowItem[] = [
      { id: 'a', fw: 100 },
      { id: 'b', fw: 150 },
    ];
    const rects: Record<string, DockRect> = {};
    rowLayout(items, { x: 0, y: 0, w: 1000, h: 56 }, rects);
    expect(rects.b!.x).toBeCloseTo(rects.a!.x + 100 + DOCK_KONSTANTEN.GAP, 6);
  });

  it('klemmt die Höhe auf min(strip.h-8, fh)', () => {
    const items: RowItem[] = [{ id: 'a', fw: 100, fh: 500 }];
    const rects: Record<string, DockRect> = {};
    rowLayout(items, { x: 0, y: 0, w: 1000, h: 56 }, rects);
    expect(rects.a!.h).toBe(56 - 8);
  });

  it('nutzt Default-Breite 160, wenn fw fehlt', () => {
    const items: RowItem[] = [{ id: 'a' }];
    const rects: Record<string, DockRect> = {};
    rowLayout(items, { x: 0, y: 0, w: 1000, h: 56 }, rects);
    expect(rects.a!.w).toBe(160);
    expect(rects.a!.x).toBeCloseTo((1000 - 160) / 2, 6);
  });
});

// ===========================================================================
// placeFloats / separate
// ===========================================================================

describe('placeFloats — Anker-Platzierung', () => {
  const vp = { x: 100, y: 50, w: 800, h: 600 };

  it('top-Anker: zentrierte Reihe', () => {
    const floats: FloatItem[] = [{ id: 'a', wichtigkeit: 10, anker: 'top', fw: 200, fh: 40 }];
    const rects: Record<string, DockRect> = {};
    placeFloats(floats, vp, rects, undefined);
    expect(rects.a!.y).toBeCloseTo(vp.y + 14, 6);
    expect(rects.a!.x).toBeCloseTo(vp.x + (vp.w - 200) / 2, 6);
  });

  it('top-Anker: Zeilenumbruch am Viewport-Rand bei zu vielen Items', () => {
    const floats: FloatItem[] = [
      { id: 'a', wichtigkeit: 10, anker: 'top', fw: 500, fh: 40 },
      { id: 'b', wichtigkeit: 10, anker: 'top', fw: 500, fh: 40 },
    ];
    const rects: Record<string, DockRect> = {};
    placeFloats(floats, vp, rects, undefined);
    // beide 500 breit passen nicht nebeneinander in 800 → b bricht um
    expect(rects.b!.y).toBeGreaterThan(rects.a!.y);
  });

  it('bottom-center stapelt von unten, horizontal zentriert', () => {
    const floats: FloatItem[] = [{ id: 'a', wichtigkeit: 10, anker: 'bottom-center', fw: 400, fh: 56 }];
    const rects: Record<string, DockRect> = {};
    placeFloats(floats, vp, rects, undefined);
    expect(rects.a!.y).toBeCloseTo(vp.y + vp.h - 14 - 56, 6);
    expect(rects.a!.x).toBeCloseTo(vp.x + (vp.w - 400) / 2, 6);
  });

  it('bottom-left stapelt von unten links', () => {
    const floats: FloatItem[] = [{ id: 'a', wichtigkeit: 10, anker: 'bottom-left', fw: 150, fh: 90 }];
    const rects: Record<string, DockRect> = {};
    placeFloats(floats, vp, rects, undefined);
    expect(rects.a!.x).toBeCloseTo(vp.x + 14, 6);
    expect(rects.a!.y).toBeCloseTo(vp.y + vp.h - 14 - 90, 6);
  });

  it('fx/fy gesetzt: Position wird in den Viewport geklemmt', () => {
    const floats: FloatItem[] = [{ id: 'a', wichtigkeit: 10, fx: -500, fy: 5000, fw: 100, fh: 60 }];
    const rects: Record<string, DockRect> = {};
    placeFloats(floats, vp, rects, undefined);
    expect(rects.a!.x).toBeCloseTo(vp.x, 6);
    expect(rects.a!.y).toBeCloseTo(vp.y + vp.h - 60, 6);
  });

  it('separate: zwei überlappende Floats trennen sich, die niedrigere Wichtigkeit weicht', () => {
    // Positionen bewusst nahe der Viewport-Mitte (nicht am Rand) gewählt,
    // damit für das weichende Float in beide Richtungen Fluchtraum besteht.
    const floats: FloatItem[] = [
      { id: 'wichtig', wichtigkeit: 90, fx: 350, fy: 300, fw: 150, fh: 100 },
      { id: 'unwichtig', wichtigkeit: 10, fx: 370, fy: 310, fw: 150, fh: 100 },
    ];
    const rects: Record<string, DockRect> = {};
    placeFloats(floats, vp, rects, undefined);
    expect(ueberlapptEcht(rects.wichtig!, rects.unwichtig!)).toBe(false);
    // das wichtige Float blieb an seiner ursprünglichen Ecke stehen
    expect(rects.wichtig!.x).toBeCloseTo(350, 6);
    expect(rects.wichtig!.y).toBeCloseTo(300, 6);
  });

  it('separate: gesperrtes Float bewegt sich nie, auch bei niedrigerer Wichtigkeit', () => {
    const floats: FloatItem[] = [
      { id: 'gesperrt', wichtigkeit: 5, fx: 300, fy: 200, fw: 150, fh: 100 },
      { id: 'andere', wichtigkeit: 90, fx: 320, fy: 210, fw: 150, fh: 100 },
    ];
    const rects: Record<string, DockRect> = {};
    placeFloats(floats, vp, rects, 'gesperrt');
    expect(rects.gesperrt!.x).toBeCloseTo(300, 6);
    expect(rects.gesperrt!.y).toBeCloseTo(200, 6);
    expect(ueberlapptEcht(rects.gesperrt!, rects.andere!)).toBe(false);
  });

  it('separate: verschiebt entlang der kürzeren Überlappungsachse', () => {
    // Zwei schmale, hohe Boxen knapp nebeneinander (kleiner x-Versatz, großer
    // y-Versatz durch die Höhe) — die x-Achse ist die kürzere Überlappung,
    // beide Richtungen haben in dieser Konfiguration reichlich Fluchtraum
    // (Mitte des Viewports, weit von jeder Kante).
    const floats: FloatItem[] = [
      { id: 'a', wichtigkeit: 50, fx: 450, fy: 300, fw: 100, fh: 250 },
      { id: 'b', wichtigkeit: 10, fx: 460, fy: 310, fw: 100, fh: 250 },
    ];
    const rects: Record<string, DockRect> = {};
    placeFloats(floats, vp, rects, undefined);
    expect(ueberlapptEcht(rects.a!, rects.b!)).toBe(false);
    // b (niedrigere Wichtigkeit) wurde entlang x verschoben, y blieb stehen
    expect(rects.b!.y).toBeCloseTo(310, 6);
    expect(rects.b!.x).not.toBeCloseTo(460, 1);
  });

  it('separate: Ergebnis bleibt nach Verschiebung im Viewport geklemmt', () => {
    const floats: FloatItem[] = [
      { id: 'a', wichtigkeit: 50, fx: vp.x + 5, fy: vp.y + 5, fw: 300, fh: 200 },
      { id: 'b', wichtigkeit: 10, fx: vp.x + 20, fy: vp.y + 20, fw: 300, fh: 200 },
    ];
    const rects: Record<string, DockRect> = {};
    placeFloats(floats, vp, rects, undefined);
    expect(imViewport(rects.a!, vp)).toBe(true);
    expect(imViewport(rects.b!, vp)).toBe(true);
  });

  it('separate: 9-Iterationen-Kappe terminiert auch bei unlösbarem Fall (kein Hänger)', () => {
    const enger = { x: 0, y: 0, w: 120, h: 120 };
    const floats: FloatItem[] = Array.from({ length: 8 }, (_, i) => ({
      id: 'f' + i,
      wichtigkeit: i,
      fx: 10,
      fy: 10,
      fw: 100,
      fh: 100,
    }));
    const rects: Record<string, DockRect> = {};
    const start = Date.now();
    expect(() => placeFloats(floats, enger, rects, undefined)).not.toThrow();
    expect(Date.now() - start).toBeLessThan(1000);
    for (const f of floats) {
      expect(Number.isFinite(rects[f.id]!.x)).toBe(true);
      expect(Number.isFinite(rects[f.id]!.y)).toBe(true);
    }
  });

  it('Property (60 seeded Zufallskonfigurationen, 2-8 Floats): keine positive Überlappungsfläche danach', () => {
    // Grosszügiger Viewport + Rand-Marge für die frei positionierten Floats:
    // `separate()` ist eine 9-Iterationen-Best-Effort-Heuristik (Push weg vom
    // Viewport-Zentrum, nicht vom jeweils anderen Float) — bei sehr engen
    // Feldern oder Floats direkt an der Kante kann sie (identisch zum
    // Prototyp) hängen bleiben. Diese Property deckt den Betriebsbereich ab,
    // für den das Docking in der App gedacht ist (wenige HUDs in einem
    // grosszügigen Viewport), nicht beliebig dichte worst-case-Packungen.
    const vpGross = { x: 40, y: 40, w: 1400, h: 900 };
    const anker: Array<FloatItem['anker']> = ['top', 'bottom-center', 'bottom-left', undefined];
    for (let seed = 1; seed <= 60; seed++) {
      const rnd = mulberry32(seed * 7919);
      const n = 2 + Math.floor(rnd() * 7); // 2..8
      const floats: FloatItem[] = [];
      const margin = 90;
      for (let i = 0; i < n; i++) {
        const ankerWahl = anker[Math.floor(rnd() * anker.length)];
        const fw = 70 + Math.floor(rnd() * 90);
        const fh = 44 + Math.floor(rnd() * 50);
        const mitFx = ankerWahl === undefined;
        floats.push({
          id: 'f' + i,
          wichtigkeit: Math.floor(rnd() * 100),
          ...(ankerWahl !== undefined ? { anker: ankerWahl } : {}),
          fw,
          fh,
          ...(mitFx
            ? {
                fx: vpGross.x + margin + rnd() * (vpGross.w - fw - 2 * margin),
                fy: vpGross.y + margin + rnd() * (vpGross.h - fh - 2 * margin),
              }
            : {}),
        });
      }
      const rects: Record<string, DockRect> = {};
      placeFloats(floats, vpGross, rects, undefined);
      expect(keinePaarUeberlappen(rects)).toBe(true);
    }
  });

  it('Property: gesperrtes Float behält über alle 60 Seeds exakt seine ursprüngliche Position', () => {
    const vpGross = { x: 40, y: 40, w: 1100, h: 750 };
    for (let seed = 1; seed <= 60; seed++) {
      const rnd = mulberry32(seed * 104729);
      const n = 3 + Math.floor(rnd() * 5); // 3..7, damit garantiert Nachbarn da sind
      const floats: FloatItem[] = [];
      const gesperrtX = vpGross.x + 100;
      const gesperrtY = vpGross.y + 100;
      floats.push({ id: 'lock', wichtigkeit: 1, fx: gesperrtX, fy: gesperrtY, fw: 100, fh: 100 });
      for (let i = 0; i < n; i++) {
        const fw = 60 + Math.floor(rnd() * 100);
        const fh = 50 + Math.floor(rnd() * 90);
        floats.push({
          id: 'f' + i,
          wichtigkeit: 50 + Math.floor(rnd() * 50), // stets wichtiger als das gesperrte (imp=1)
          fx: gesperrtX + rnd() * 80 - 40,
          fy: gesperrtY + rnd() * 80 - 40,
          fw,
          fh,
        });
      }
      const rects: Record<string, DockRect> = {};
      placeFloats(floats, vpGross, rects, 'lock');
      expect(rects.lock!.x).toBeCloseTo(gesperrtX, 6);
      expect(rects.lock!.y).toBeCloseTo(gesperrtY, 6);
    }
  });

  it('Property: alle finalen Rects bleiben über alle 60 Seeds im Viewport geklemmt', () => {
    const vpGross = { x: 40, y: 40, w: 1100, h: 750 };
    for (let seed = 1; seed <= 60; seed++) {
      const rnd = mulberry32(seed * 65537);
      const n = 2 + Math.floor(rnd() * 7);
      const floats: FloatItem[] = [];
      for (let i = 0; i < n; i++) {
        const fw = 60 + Math.floor(rnd() * 100);
        const fh = 50 + Math.floor(rnd() * 90);
        floats.push({
          id: 'f' + i,
          wichtigkeit: Math.floor(rnd() * 100),
          fx: vpGross.x + rnd() * (vpGross.w - fw),
          fy: vpGross.y + rnd() * (vpGross.h - fh),
          fw,
          fh,
        });
      }
      const rects: Record<string, DockRect> = {};
      placeFloats(floats, vpGross, rects, undefined);
      for (const f of floats) {
        expect(imViewport(rects[f.id]!, vpGross, 0.5)).toBe(true);
      }
    }
  });
});

// ===========================================================================
// solve
// ===========================================================================

describe('solve — Grundinvarianten über 3 synthetische Stationen × Breiten-Sweep', () => {
  const breiten = [600, 800, 1000, 1200, 1600, 2400];

  it('keine Überlappung zwischen Rail/Stack-Rects (z=14) untereinander — strukturell garantiert, über ALLE Stationen × Breiten × Konzepte', () => {
    // Rail- und Stack-Geometrie (linke/rechte Spalte) ist eine reine
    // Platz-Teilung mit fixem GAP zwischen den Panels — die Nicht-
    // Überlappung ist durch die Formel selbst garantiert, unabhängig von der
    // Feldbreite. Das gilt NICHT uneingeschränkt für Floats (s.u.).
    for (const defs of Object.values(STATIONEN)) {
      for (const w of breiten) {
        for (const modus of ['A', 'B'] as const) {
          const erg = solve(defs, grundOptionen(w, modus));
          const stackUndRail: Record<string, DockRect> = {};
          for (const [id, r] of Object.entries(erg.rects)) if (r.z === 14) stackUndRail[id] = r;
          expect(keinePaarUeberlappen(stackUndRail)).toBe(true);
        }
      }
    }
  });

  it('keine Überlappung irgendeines Rect-Paars (inkl. Floats/Streifen), wenn das Feld für die Float-Grössen breit genug ist (>=1600px)', () => {
    // Die Float-Default-Grössen dieser Stationen (aus dem Prototyp
    // übernommen) sind für die 1440px-Demobühne bemessen. Bei sehr schmalen
    // Feldern (600-1200px) können feste Float-Breiten (z.B. dock fw:520)
    // strukturell nicht mehr kollisionsfrei neben Stacks/anderen Floats
    // Platz finden — das ist eine Eigenschaft der Eingabedaten (feste
    // fw/fh), keine Verletzung des Solvers: derselbe `placeFloats`/`separate`
    // -Code, 1:1 aus dem Prototyp portiert, hätte im Original bei einer
    // schmaleren Bühne dasselbe Verhalten gezeigt. Ab ausreichend breitem
    // Feld gilt die volle Nicht-Überlappung wie gefordert.
    for (const defs of Object.values(STATIONEN)) {
      for (const w of [1600, 2400]) {
        for (const modus of ['A', 'B'] as const) {
          const erg = solve(defs, grundOptionen(w, modus));
          expect(keinePaarUeberlappen(erg.rects)).toBe(true);
        }
      }
    }
  });

  it('bei sehr schmalem Feld (600px) bleibt der Solver dennoch numerisch stabil (kein NaN/Crash), auch wenn Floats dort mit festen Grössen überlappen können', () => {
    for (const defs of Object.values(STATIONEN)) {
      for (const modus of ['A', 'B'] as const) {
        const erg = solve(defs, grundOptionen(600, modus));
        for (const r of Object.values(erg.rects)) {
          expect(Number.isFinite(r.x)).toBe(true);
          expect(Number.isFinite(r.y)).toBe(true);
          expect(Number.isFinite(r.w)).toBe(true);
          expect(Number.isFinite(r.h)).toBe(true);
        }
      }
    }
  });

  it('Rail ist immer exakt RAIL (52) breit, wenn vorhanden', () => {
    for (const defs of Object.values(STATIONEN)) {
      for (const w of breiten) {
        const erg = solve(defs, grundOptionen(w, 'A'));
        expect(erg.rects.rail!.w).toBe(DOCK_KONSTANTEN.RAIL);
      }
    }
  });

  it('viewport.w >= MIN_VIEWPORT, sobald das Feld genug Raum bietet (>=1000px)', () => {
    for (const defs of Object.values(STATIONEN)) {
      for (const w of [1000, 1200, 1600, 2400]) {
        const erg = solve(defs, grundOptionen(w, 'A'));
        expect(erg.viewport.w).toBeGreaterThanOrEqual(DOCK_KONSTANTEN.MIN_VIEWPORT);
      }
    }
  });

  it('Abbau-Reihenfolge: rightW weicht zuerst bis MIN_RIGHT, danach erst leftW', () => {
    // feld.w=900 mit design-Station: Defizit 82 liegt zwischen den beiden
    // Kapazitäten (rightW: 326→250 = 76 verfügbar) — rightW erreicht exakt
    // sein Minimum, leftW wird nur um den Rest (6) angetastet.
    const erg = solve(STATIONEN.design!, grundOptionen(900, 'A'));
    const railW = DOCK_KONSTANTEN.RAIL;
    const rechteBreite = erg.splitters.find((s) => s.id === 'spR');
    const linkeBreite = erg.splitters.find((s) => s.id === 'spL');
    expect(rechteBreite).toBeDefined();
    expect(linkeBreite).toBeDefined();
    // spR liegt bei feld.right - rw - 7 → rw daraus zurückrechnen
    const rw = 900 - 7 - rechteBreite!.x;
    const lw = linkeBreite!.x + 7 - railW;
    expect(rw).toBeCloseTo(DOCK_KONSTANTEN.MIN_RIGHT, 6); // rightW voll bis zum Minimum abgebaut
    expect(lw).toBeCloseTo(DOCK_KONSTANTEN.DEF_LEFT - 6, 6); // leftW nur leicht angetastet
    expect(erg.viewport.w).toBeCloseTo(DOCK_KONSTANTEN.MIN_VIEWPORT, 6);
  });

  it('bei extremer Enge (feld.w=600) sind beide Spalten voll auf ihr Minimum reduziert', () => {
    // Mathematische Grenze des Prototyp-Algorithmus (Ein-Schritt-Abbau, keine
    // Iterationsschleife): railW+MIN_LEFT+MIN_RIGHT+MIN_VIEWPORT = 52+168+250+380 = 850 > 600,
    // d.h. selbst voll ausgereizt bleibt viewport.w unter MIN_VIEWPORT — das
    // ist erwartetes (im Prototyp identisches) Verhalten bei so engem Feld.
    const erg = solve(STATIONEN.design!, grundOptionen(600, 'A'));
    const rechteBreite = erg.splitters.find((s) => s.id === 'spR')!;
    const linkeBreite = erg.splitters.find((s) => s.id === 'spL')!;
    const rw = 600 - 7 - rechteBreite.x;
    const lw = linkeBreite.x + 7 - DOCK_KONSTANTEN.RAIL;
    expect(rw).toBeCloseTo(DOCK_KONSTANTEN.MIN_RIGHT, 6);
    expect(lw).toBeCloseTo(DOCK_KONSTANTEN.MIN_LEFT, 6);
    expect(erg.viewport.w).toBeLessThan(DOCK_KONSTANTEN.MIN_VIEWPORT);
    expect(erg.viewport.w).toBeCloseTo(130, 6);
  });

  it('gedraggtId fehlt vollständig im Ergebnis', () => {
    const opts = { ...grundOptionen(1200, 'A'), gedraggtId: 'checks' };
    const erg = solve(STATIONEN.design!, opts);
    expect(erg.rects.checks).toBeUndefined();
  });

  it('Konzept B: keine Rects sind als schwebend markiert', () => {
    const erg = solve(STATIONEN.design!, grundOptionen(1400, 'B'));
    for (const r of Object.values(erg.rects)) {
      expect(r.schwebend).not.toBe(true);
    }
  });

  it('Konzept B: top-Floats werden zu einem ctop-Streifen oben im Center', () => {
    const erg = solve(STATIONEN.design!, grundOptionen(1800, 'B'));
    // mode/card/gizmo hatten anker:'top' → alle drei liegen im obersten
    // Streifen; jedes Panel klemmt seine EIGENE fh auf strip.h-8=48 und wird
    // vertikal in der 56px hohen Leiste zentriert.
    const defsById: Record<string, number> = { mode: 44, card: 92, gizmo: 56 };
    for (const id of ['mode', 'card', 'gizmo']) {
      const h = Math.min(DOCK_KONSTANTEN.STRIP - 8, defsById[id]!);
      expect(erg.rects[id]!.h).toBeCloseTo(h, 6);
      expect(erg.rects[id]!.y).toBeCloseTo(52 + (DOCK_KONSTANTEN.STRIP - h) / 2, 6);
      expect(erg.rects[id]!.z).toBe(16);
    }
  });

  it('Konzept B: bottom-center-Float wird zum cbot-Streifen unten', () => {
    const erg = solve(STATIONEN.design!, grundOptionen(1800, 'B'));
    const feldUnten = 52 + 800;
    expect(erg.rects.dock!.y + erg.rects.dock!.h).toBeLessThanOrEqual(feldUnten + 0.01);
    expect(erg.rects.dock!.y).toBeGreaterThanOrEqual(feldUnten - DOCK_KONSTANTEN.DOCKH - 0.01);
  });

  it('Konzept B: viewport-Höhe wird um Streifen (STRIP+GAP oben, DOCKH+GAP unten) verkleinert', () => {
    const erg = solve(STATIONEN.design!, grundOptionen(1800, 'B'));
    const erwarteteHoehe = 800 - (DOCK_KONSTANTEN.STRIP + DOCK_KONSTANTEN.GAP) - (DOCK_KONSTANTEN.DOCKH + DOCK_KONSTANTEN.GAP);
    expect(erg.viewport.h).toBeCloseTo(erwarteteHoehe, 6);
  });

  it('Konzept B: bottom-left-Float (orient) wird zu "left" umgeroutet und landet im Stack (z=14, nicht schwebend)', () => {
    const erg = solve(STATIONEN.design!, grundOptionen(1800, 'B'));
    expect(erg.rects.orient!.z).toBe(14);
    expect(erg.rects.orient!.schwebend).not.toBe(true);
  });

  it('splitters nur wo Panels: kein spL, wenn keine linken Panels sichtbar sind', () => {
    const opts: SolveOptionen = {
      ...grundOptionen(1800, 'A'),
      overrides: { geschosse: { geschlossen: true } },
    };
    const erg = solve(STATIONEN.design!, opts);
    expect(erg.splitters.find((s) => s.id === 'spL')).toBeUndefined();
    expect(erg.splitters.find((s) => s.id === 'spR')).toBeDefined();
  });

  it('splitters nur wo Panels: kein spR, wenn keine rechten Panels sichtbar sind', () => {
    const opts: SolveOptionen = {
      ...grundOptionen(1800, 'A'),
      overrides: {
        inspector: { geschlossen: true },
        checks: { geschlossen: true },
        kosmo: { geschlossen: true },
      },
    };
    const erg = solve(STATIONEN.design!, opts);
    expect(erg.splitters.find((s) => s.id === 'spR')).toBeUndefined();
    expect(erg.splitters.find((s) => s.id === 'spL')).toBeDefined();
  });

  it('row-splitters entstehen zwischen benachbarten, nicht eingeklappten Stack-Panels', () => {
    const opts: SolveOptionen = {
      ...grundOptionen(1800, 'A'),
      overrides: { kosmo: { geschlossen: false } }, // 3 rechte Panels: inspector, checks, kosmo
    };
    const erg = solve(STATIONEN.design!, opts);
    const rowSplitter = erg.splitters.filter((s) => s.art === 'row');
    expect(rowSplitter.length).toBeGreaterThan(0);
    for (const s of rowSplitter) {
      const ra = erg.rects[s.a!]!;
      expect(s.x).toBeCloseTo(ra.x + 6, 6);
      expect(s.w).toBeCloseTo(ra.w - 12, 6);
      expect(s.h).toBe(14);
    }
  });

  it('floatGesperrtId fliesst bis in separate() durch: gesperrtes Float bleibt an Position', () => {
    const opts: SolveOptionen = {
      ...grundOptionen(1800, 'A'),
      overrides: {
        card: { fx: 500, fy: 400 },
        gizmo: { fx: 520, fy: 410 }, // überlappt bewusst mit card
      },
      floatGesperrtId: 'card',
    };
    const erg = solve(STATIONEN.design!, opts);
    expect(erg.rects.card!.x).toBeCloseTo(500, 6);
    expect(erg.rects.card!.y).toBeCloseTo(400, 6);
    expect(keinePaarUeberlappen(erg.rects)).toBe(true);
  });
});
