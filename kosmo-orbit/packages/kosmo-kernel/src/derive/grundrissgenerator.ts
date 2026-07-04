import type { Pt } from '../model/units';

/**
 * Grundriss-Generator v1 (der Finch-Kern, Schritt 2 nach dem Segmentierer):
 * Eine RECHTECKIGE Wohnung mit bekannter Korridorseite wird nach einem
 * CH-Wohnbau-Rezept in Zimmer geteilt und möbliert — zwei Bänder:
 *
 *   Korridorseite → Eingangsband (2.4 m tief): Diele | Bad | Küche
 *   ab 2 Zimmern  → Flurstreifen (1.2 m):      erschliesst alle Räume
 *   Fassadenseite → Wohnband (Rest):           Wohnen | Zimmer …
 *
 * v2: Der interne Flur eliminiert Durchgangszimmer — jeder Raum hat seine
 * Tür am Flur. Reicht die Tiefe nicht (Zimmer < 3 m), fällt das Rezept
 * ehrlich auf v1 ohne Flur zurück (Diagnose sagt es).
 *
 * Ehrlich klein geschnitten: Rezept statt Suche (Finch generiert aus einer
 * Plan-Library — unsere Vorlagen (F7) sind die Library, das Rezept ist der
 * Fallback, wenn keine Vorlage passt). Zimmerzahl aus der Wohnungsgrösse.
 */

export interface GenerierterRaum {
  outline: Pt[];
  name: string;
  raumTyp: 'zimmer' | 'wohnen' | 'kueche' | 'bad' | 'korridor';
  sia: 'HNF' | 'VF';
}

export interface GeneriertesMoebel {
  typ: string;
  at: Pt;
  rotationGrad: number;
}

export interface GenerierteTuer {
  at: Pt;
  breite: number;
}

export interface GenerierterGrundriss {
  raeume: GenerierterRaum[];
  moebel: GeneriertesMoebel[];
  tueren: GenerierteTuer[];
  diagnose: string[];
}

const EINGANG_TIEFE = 2400;
const FLUR_TIEFE = 1200;

const rund = (p: Pt): Pt => ({ x: Math.round(p.x), y: Math.round(p.y) });
const MIN_ZIMMER = 3000;

// ── L-Zerlegung (Vision C4) ─────────────────────────────────────────

export type Zerlegung =
  | { typ: 'rechteck' }
  | { typ: 'l'; haupt: Pt[]; fluegel: Pt[] }
  | { typ: 'unregelmaessig'; grund: string };

/**
 * Rektilineares Polygon klassieren: Rechteck, L (genau EINE Innenecke →
 * Guillotine-Schnitt in Hauptteil + Flügel, der grössere wird Hauptteil,
 * gewählt wird der Schnitt mit dem grösseren Hauptteil) oder ehrlich
 * «unregelmässig» (U/T/Z und Schrägen — der Generator lehnt ab bzw. fällt
 * bei Schrägen aufs bisherige BBox-Verhalten zurück).
 */
export function zerlegeRektilinear(outline: Pt[]): Zerlegung {
  // Doppelte aufeinanderfolgende Punkte zuerst raus — sonst hätten BEIDE
  // Duplikate Kreuzprodukt 0 und die echte Ecke ginge verloren (F1-Fund)
  const pts = outline.filter((p, i) => {
    const prev = outline[(i - 1 + outline.length) % outline.length]!;
    return p.x !== prev.x || p.y !== prev.y;
  });
  // Kollineare Zwischenpunkte entfernen (Ecken zählen, nicht Stützpunkte)
  const ecken: Pt[] = [];
  for (let i = 0; i < pts.length; i++) {
    const vor = pts[(i - 1 + pts.length) % pts.length]!;
    const p = pts[i]!;
    const nach = pts[(i + 1) % pts.length]!;
    const kreuz = (p.x - vor.x) * (nach.y - p.y) - (p.y - vor.y) * (nach.x - p.x);
    if (kreuz !== 0) ecken.push(p);
  }
  for (let i = 0; i < ecken.length; i++) {
    const a = ecken[i]!;
    const b = ecken[(i + 1) % ecken.length]!;
    if (a.x !== b.x && a.y !== b.y) {
      return { typ: 'unregelmaessig', grund: 'Umriss hat schräge Kanten (v1 kann nur achsparallel)' };
    }
  }
  if (ecken.length === 4) return { typ: 'rechteck' };
  if (ecken.length !== 6) {
    return { typ: 'unregelmaessig', grund: `${ecken.length} Ecken — mehr als eine Innenecke (U/T-Form), von Hand teilen` };
  }
  // Orientierung + Innenecke (Kreuzprodukt gegen die Wicklung)
  let flaeche2 = 0;
  for (let i = 0; i < ecken.length; i++) {
    const a = ecken[i]!;
    const b = ecken[(i + 1) % ecken.length]!;
    flaeche2 += a.x * b.y - b.x * a.y;
  }
  const orient = Math.sign(flaeche2);
  const reflex: Pt[] = [];
  for (let i = 0; i < ecken.length; i++) {
    const vor = ecken[(i - 1 + ecken.length) % ecken.length]!;
    const p = ecken[i]!;
    const nach = ecken[(i + 1) % ecken.length]!;
    const kreuz = (p.x - vor.x) * (nach.y - p.y) - (p.y - vor.y) * (nach.x - p.x);
    if (Math.sign(kreuz) === -orient) reflex.push(p);
  }
  if (reflex.length !== 1) {
    return { typ: 'unregelmaessig', grund: `${reflex.length} Innenecken — von Hand teilen` };
  }
  const r = reflex[0]!;
  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
  for (const p of ecken) {
    minX = Math.min(minX, p.x); maxX = Math.max(maxX, p.x);
    minY = Math.min(minY, p.y); maxY = Math.max(maxY, p.y);
  }
  // Fehlende BBox-Ecke = die «ausgestanzte» Ecke; die Kerbe spannt M ↔ R
  const istEcke = (x: number, y: number) => ecken.some((p) => p.x === x && p.y === y);
  const fehlend = [
    { x: minX, y: minY }, { x: maxX, y: minY }, { x: maxX, y: maxY }, { x: minX, y: maxY },
  ].find((k) => !istEcke(k.x, k.y));
  if (!fehlend) return { typ: 'unregelmaessig', grund: 'Innenecke ohne Kerbe — von Hand teilen' };
  const rect = (x0: number, y0: number, x1: number, y1: number): Pt[] => [
    { x: x0, y: y0 }, { x: x1, y: y0 }, { x: x1, y: y1 }, { x: x0, y: y1 },
  ];
  const area = (p: Pt[]) => Math.abs((p[1]!.x - p[0]!.x) * (p[3]!.y - p[0]!.y));
  const mx = fehlend.x === minX; // Kerbe auf der linken Seite?
  const my = fehlend.y === minY; // Kerbe unten?
  // Zwei Guillotine-Schnitte durch die Innenecke: senkrecht (x = r.x) und
  // waagrecht (y = r.y) — der Streifen ohne Kerbe bleibt ein volles Rechteck
  const senkrecht: [Pt[], Pt[]] = [
    mx ? rect(r.x, minY, maxX, maxY) : rect(minX, minY, r.x, maxY),
    mx
      ? rect(minX, my ? r.y : minY, r.x, my ? maxY : r.y)
      : rect(r.x, my ? r.y : minY, maxX, my ? maxY : r.y),
  ];
  const waagrecht: [Pt[], Pt[]] = [
    my ? rect(minX, r.y, maxX, maxY) : rect(minX, minY, maxX, r.y),
    my
      ? rect(mx ? r.x : minX, minY, mx ? maxX : r.x, r.y)
      : rect(mx ? r.x : minX, r.y, mx ? maxX : r.x, maxY),
  ];
  const beste = [senkrecht, waagrecht].sort(
    (a, b) => Math.max(area(b[0]), area(b[1])) - Math.max(area(a[0]), area(a[1])),
  )[0]!;
  const [haupt, fluegel] = area(beste[0]) >= area(beste[1]) ? [beste[0], beste[1]] : [beste[1], beste[0]];
  return { typ: 'l', haupt, fluegel };
}

/**
 * L-Wohnung (C4): Der Hauptteil bekommt das volle Rezept, der Flügel wird
 * in Zimmer geschnitten, die sich über Türen an der Naht zum Hauptteil
 * erschliessen — ehrlich als Anstoss diagnostiziert.
 */
export function generiereGrundrissL(
  haupt: Pt[],
  fluegel: Pt[],
  korridorKante: 'unten' | 'oben' | 'links' | 'rechts',
): GenerierterGrundriss {
  const g = generiereGrundriss(haupt, korridorKante);
  if (g.raeume.length === 0) return g;
  const bb = (poly: Pt[]) => {
    let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity;
    for (const p of poly) {
      x0 = Math.min(x0, p.x); x1 = Math.max(x1, p.x);
      y0 = Math.min(y0, p.y); y1 = Math.max(y1, p.y);
    }
    return { x0, x1, y0, y1 };
  };
  const H = bb(haupt);
  const F = bb(fluegel);
  // Naht: die gemeinsame Kante (senkrecht bei x-Kontakt, sonst waagrecht)
  const senkrechteNaht = F.x1 === H.x0 || F.x0 === H.x1;
  const nahtFix = senkrechteNaht ? (F.x1 === H.x0 ? F.x1 : F.x0) : (F.y1 === H.y0 ? F.y1 : F.y0);
  const von = senkrechteNaht ? Math.max(F.y0, H.y0) : Math.max(F.x0, H.x0);
  const bis = senkrechteNaht ? Math.min(F.y1, H.y1) : Math.min(F.x1, H.x1);
  const nahtLen = bis - von;
  if (nahtLen < 900) {
    g.diagnose.push('Flügel-Naht unter 90 cm — Flügel ausgelassen, von Hand anbinden.');
    return g;
  }
  const anzahl = Math.max(1, Math.floor(nahtLen / 3500));
  const schritt = nahtLen / anzahl;
  const tiefeVon = senkrechteNaht ? F.x0 : F.y0;
  const tiefeBis = senkrechteNaht ? F.x1 : F.y1;
  for (let i = 0; i < anzahl; i++) {
    const s0 = Math.round(von + i * schritt);
    const s1 = Math.round(von + (i + 1) * schritt);
    const outline = senkrechteNaht
      ? [{ x: tiefeVon, y: s0 }, { x: tiefeBis, y: s0 }, { x: tiefeBis, y: s1 }, { x: tiefeVon, y: s1 }]
      : [{ x: s0, y: tiefeVon }, { x: s1, y: tiefeVon }, { x: s1, y: tiefeBis }, { x: s0, y: tiefeBis }];
    g.raeume.push({ outline, name: `Zimmer Flügel ${i + 1}`, raumTyp: 'zimmer', sia: 'HNF' });
    const mitteS = Math.round((s0 + s1) / 2);
    g.tueren.push({
      at: senkrechteNaht ? { x: nahtFix, y: mitteS } : { x: mitteS, y: nahtFix },
      breite: 800,
    });
    // Bett an der nahtfernen Flügelseite, Bewegungsfläche zeigt zur Naht
    const fern = senkrechteNaht
      ? (nahtFix === F.x1 ? F.x0 + 100 : F.x1 - 100)
      : (nahtFix === F.y1 ? F.y0 + 100 : F.y1 - 100);
    g.moebel.push({
      typ: i === 0 && anzahl > 1 ? 'bett-doppel' : 'bett-einzel',
      at: senkrechteNaht ? { x: fern, y: mitteS } : { x: mitteS, y: fern },
      rotationGrad: senkrechteNaht ? (nahtFix === F.x1 ? 270 : 90) : (nahtFix === F.y1 ? 0 : 180),
    });
  }
  g.diagnose.push(
    `L-Wohnung: Hauptteil per Rezept, ${anzahl} Flügelzimmer über Türen an der Naht — Anstoss, von Hand verfeinern.`,
  );
  return g;
}

/**
 * wohnung: achsparalleles Rechteck (BBox wird verwendet).
 * korridorKante: 'unten' | 'oben' | 'links' | 'rechts' — wo der Zugang liegt.
 */
export function generiereGrundriss(
  wohnung: Pt[],
  korridorKante: 'unten' | 'oben' | 'links' | 'rechts',
): GenerierterGrundriss {
  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
  for (const p of wohnung) {
    minX = Math.min(minX, p.x); maxX = Math.max(maxX, p.x);
    minY = Math.min(minY, p.y); maxY = Math.max(maxY, p.y);
  }
  // Lokales System: u läuft der Korridorkante entlang, v von ihr weg
  const vertikal = korridorKante === 'links' || korridorKante === 'rechts';
  const breite = vertikal ? maxY - minY : maxX - minX;
  const tiefe = vertikal ? maxX - minX : maxY - minY;
  const welt = (u: number, v: number): Pt => {
    switch (korridorKante) {
      case 'unten': return { x: minX + u, y: minY + v };
      case 'oben': return { x: minX + u, y: maxY - v };
      case 'links': return { x: minX + v, y: minY + u };
      case 'rechts': return { x: maxX - v, y: minY + u };
    }
  };
  const rect = (u0: number, v0: number, u1: number, v1: number): Pt[] => {
    const poly = [welt(u0, v0), welt(u1, v0), welt(u1, v1), welt(u0, v1)].map(rund);
    let s = 0;
    for (let i = 0; i < poly.length; i++) {
      const a = poly[i]!;
      const b = poly[(i + 1) % poly.length]!;
      s += a.x * b.y - b.x * a.y;
    }
    return s < 0 ? poly.reverse() : poly;
  };

  const diagnose: string[] = [];
  if (breite < 6000 || tiefe < 6000) {
    return { raeume: [], moebel: [], tueren: [], diagnose: [`Wohnung ${(breite / 1000).toFixed(1)} × ${(tiefe / 1000).toFixed(1)} m — unter 6 × 6 m generiere ich nicht (von Hand besser).`] };
  }

  const raeume: GenerierterRaum[] = [];
  const moebel: GeneriertesMoebel[] = [];
  // Rotation: Möbel-Rückkante an v0-Wand des Raums, Bewegungsfläche zeigt +v
  const rot = { unten: 0, oben: 180, links: 270, rechts: 90 }[korridorKante];
  const gegenRot = (rot + 180) % 360;

  // ── Eingangsband: Diele | Bad | Küche ─────────────────────────────
  const dieleB = 1600;
  const badB = 2400;
  const kuecheB = breite - dieleB - badB;
  raeume.push({ outline: rect(0, 0, dieleB, EINGANG_TIEFE), name: 'Diele', raumTyp: 'korridor', sia: 'VF' });
  raeume.push({ outline: rect(dieleB, 0, dieleB + badB, EINGANG_TIEFE), name: 'Bad', raumTyp: 'bad', sia: 'HNF' });
  raeume.push({ outline: rect(dieleB + badB, 0, breite, EINGANG_TIEFE), name: 'Küche', raumTyp: 'kueche', sia: 'HNF' });
  // Türen: Wohnungstür (Korridor→Diele), Diele→Bad, Diele→Wohnen
  const tueren: GenerierteTuer[] = [
    { at: rund(welt(dieleB / 2, 0)), breite: 900 },
    { at: rund(welt(dieleB, EINGANG_TIEFE / 2)), breite: 800 },
    { at: rund(welt(dieleB / 2, EINGANG_TIEFE)), breite: 900 },
  ];
  const badMitte = welt(dieleB + badB / 2, 400);
  moebel.push({ typ: 'wc', at: { x: Math.round(badMitte.x), y: Math.round(badMitte.y) }, rotationGrad: rot });
  const kuecheMitte = welt(dieleB + badB + kuecheB / 2, 300);
  moebel.push({ typ: 'kuechenzeile', at: { x: Math.round(kuecheMitte.x), y: Math.round(kuecheMitte.y) }, rotationGrad: rot });

  // ── Wohnband: Wohnen + Zimmer, ab 2 Zimmern mit internem Flur ─────
  const wohnenB = Math.max(3600, Math.round(breite * 0.4 / 100) * 100);
  const zimmerZone = breite - wohnenB;
  const zimmerZahl = Math.max(0, Math.floor(zimmerZone / MIN_ZIMMER));
  const zimmerB = zimmerZahl > 0 ? zimmerZone / zimmerZahl : 0;
  // Interner Flur (1.2 m) nur, wenn er sich lohnt UND die Zimmer tief genug bleiben
  const mitFlur = zimmerZahl >= 2 && tiefe - EINGANG_TIEFE - FLUR_TIEFE >= MIN_ZIMMER;
  const wohnbandV = mitFlur ? EINGANG_TIEFE + FLUR_TIEFE : EINGANG_TIEFE;

  if (mitFlur) {
    raeume.push({ outline: rect(0, EINGANG_TIEFE, breite, wohnbandV), name: 'Flur', raumTyp: 'korridor', sia: 'VF' });
    // Türen: Diele→Flur ersetzt Diele→Wohnen; Flur erschliesst Küche + Wohnen
    tueren.pop(); // Diele→Wohnen aus dem Eingangsband raus
    tueren.push({ at: rund(welt(dieleB / 2, EINGANG_TIEFE)), breite: 900 }); // Diele→Flur
    tueren.push({ at: rund(welt(dieleB + badB + kuecheB / 2, EINGANG_TIEFE)), breite: 900 }); // Flur→Küche
    tueren.push({ at: rund(welt(wohnenB / 2, wohnbandV)), breite: 900 }); // Flur→Wohnen
    diagnose.push(`Interner Flur ${(FLUR_TIEFE / 1000).toFixed(1)} m × ${(breite / 1000).toFixed(1)} m — keine Durchgangszimmer.`);
  }

  raeume.push({ outline: rect(0, wohnbandV, wohnenB, tiefe), name: 'Wohnen/Essen', raumTyp: 'wohnen', sia: 'HNF' });
  const tischAt = welt(wohnenB / 2, wohnbandV + (tiefe - wohnbandV) / 2 - 450);
  moebel.push({ typ: 'esstisch', at: { x: Math.round(tischAt.x), y: Math.round(tischAt.y) }, rotationGrad: rot });
  for (let i = 0; i < zimmerZahl; i++) {
    const u0 = wohnenB + i * zimmerB;
    raeume.push({ outline: rect(u0, wohnbandV, u0 + zimmerB, tiefe), name: `Zimmer ${i + 1}`, raumTyp: 'zimmer', sia: 'HNF' });
    if (mitFlur) {
      tueren.push({ at: rund(welt(u0 + zimmerB / 2, wohnbandV)), breite: 800 }); // Flur→Zimmer
    }
    // Bett an der Fassadenwand (Rückkante aussen, Bewegungsfläche zum Raum)
    const bettAt = welt(u0 + zimmerB / 2, tiefe - 100);
    moebel.push({
      typ: i === 0 ? 'bett-doppel' : 'bett-einzel',
      at: { x: Math.round(bettAt.x), y: Math.round(bettAt.y) },
      rotationGrad: gegenRot,
    });
  }
  if (!mitFlur) {
    // v1 ohne Flur: kein Raum darf türlos bleiben (Review-Befund 3)
    const kuecheUeberlapp = Math.min(breite, wohnenB) - (dieleB + badB);
    if (kuecheUeberlapp >= 900) {
      // Küche ↔ Wohnen über die gemeinsame Kante v = EINGANG_TIEFE
      tueren.push({ at: rund(welt(dieleB + badB + kuecheUeberlapp / 2, EINGANG_TIEFE)), breite: 900 });
    } else {
      diagnose.push('Küche ohne Türanschluss (Wohnen überlappt < 90 cm) — von Hand nachführen.');
    }
    if (zimmerZahl >= 1) {
      // Wohnen → Zimmer 1, dann Kette Zimmer_i → Zimmer_{i+1} (Durchgangszimmer, ehrlich mit Tür)
      const vMitte = wohnbandV + (tiefe - wohnbandV) / 2;
      tueren.push({ at: rund(welt(wohnenB, vMitte)), breite: 800 });
      for (let i = 1; i < zimmerZahl; i++) {
        tueren.push({ at: rund(welt(wohnenB + i * zimmerB, vMitte)), breite: 800 });
      }
    }
  }
  if (zimmerZahl === 0) diagnose.push('Zu schmal für separate Zimmer — nur Wohnen/Essen generiert.');
  if (zimmerZahl >= 2 && !mitFlur) {
    diagnose.push('Zu flach für einen internen Flur — v1-Rezept, Zimmer 2+ als Durchgangszimmer (mit Türen).');
  }
  diagnose.push(`${2.5 + zimmerZahl - 0.5}-Zimmer-Rezept: Eingangsband ${(EINGANG_TIEFE / 1000).toFixed(1)} m, ${zimmerZahl} Zimmer à ${(zimmerB / 1000).toFixed(1)} m.`);
  return { raeume, moebel, tueren, diagnose };
}
