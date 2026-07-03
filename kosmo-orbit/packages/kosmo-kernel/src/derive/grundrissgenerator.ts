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
    const poly = [welt(u0, v0), welt(u1, v0), welt(u1, v1), welt(u0, v1)];
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
  if (zimmerZahl === 0) diagnose.push('Zu schmal für separate Zimmer — nur Wohnen/Essen generiert.');
  if (zimmerZahl >= 2 && !mitFlur) {
    diagnose.push('Zu flach für einen internen Flur — v1-Rezept, Zimmer 2+ als Durchgangszimmer.');
  }
  diagnose.push(`${2.5 + zimmerZahl - 0.5}-Zimmer-Rezept: Eingangsband ${(EINGANG_TIEFE / 1000).toFixed(1)} m, ${zimmerZahl} Zimmer à ${(zimmerB / 1000).toFixed(1)} m.`);
  return { raeume, moebel, tueren, diagnose };
}
