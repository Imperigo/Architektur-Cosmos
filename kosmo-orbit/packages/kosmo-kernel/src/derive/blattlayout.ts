/**
 * Blattgeometrie (v0.8.0 / P1) — reine Mass-Ableitung für ISO-Blattformate,
 * unabhängig vom Doc-Modell. Keine Entities, keine Commands, keine Imports
 * ausser Standard-TS: alles hier ist mit Zahlen (mm) berechenbar, testbar
 * ohne Doc/Sheet-Fixtures.
 *
 * Bewusst NICHT an `derive/sheet.ts` (ISO_LANG) oder `model/entities.ts`
 * (SheetFormat) gekoppelt — dieses Modul ist der Geometrie-Vorrat für den
 * Sammelwechsel in P7, der `sheet.ts`, `derive/blattfuellung.ts` und
 * `commands/publish.ts` auf diese Werte umstellt. Bis dahin bestehen die
 * pauschalen Reserven dort unverändert weiter (siehe `plankopfReserveMm`
 * unten für die Kalibrierungs-Begründung).
 *
 * Quellen der Zahlen: Owner-Handoff v0.8.0/P1 (Formate/Ränder/Plankopf/
 * Faltmarken DIN 824/Lochung ISO 838). Die Rolle 1600×594mm ist VERTAGT —
 * absichtlich nicht Teil von `BLATT_FORMATE`.
 */

/** Unterstützte ISO-Blattformate (Querformat-Masse, siehe `BLATT_FORMATE`). */
export type BlattFormat = 'A0' | 'A1' | 'A2' | 'A3' | 'A4';

/** Blattausrichtung: 'quer' = Basis-Masse, 'hoch' = Breite/Höhe getauscht. */
export type BlattAusrichtung = 'quer' | 'hoch';

export interface BlattMasse {
  breite: number;
  hoehe: number;
}

export interface BlattRect {
  x: number;
  y: number;
  breite: number;
  hoehe: number;
}

export interface Faltmarken {
  /** x-Positionen (mm ab linkem Blattrand) für vertikale Falzmarken (an Ober-/Unterkante). */
  vertikal: number[];
  /** y-Positionen (mm ab oberem Blattrand) für horizontale Falzmarken (an Links-/Rechtskante). */
  horizontal: number[];
}

export interface Lochung {
  /** x-Position der Lochmitte (mm ab linkem Blattrand). */
  x: number;
  /** y-Position des oberen Lochs. */
  y1: number;
  /** y-Position des unteren Lochs. */
  y2: number;
  /** Lochdurchmesser (mm). */
  d: number;
}

/**
 * Blattformate (mm), Querformat als Basis. Hochformat = Breite/Höhe getauscht
 * (siehe `dims`). Quelle: ISO 216 Lang-Kante-oben-Konvention des Owner-
 * Handoffs (identisch zu den Werten, die `derive/sheet.ts` heute als
 * `ISO_LANG` pflegt — bewusst hier NICHT importiert, siehe Datei-Kopfkommentar).
 *
 * VERTAGT: Rolle 1600×594mm — kein Eintrag hier, bis das Owner-Mandat die
 * Falz-/Lochungsregeln für Rollenformate klärt (kein Heftrand-Analogon
 * definiert). Nicht bauen, nur dieser Kommentar als Platzhalter.
 */
export const BLATT_FORMATE: Record<BlattFormat, BlattMasse> = {
  A0: { breite: 1189, hoehe: 841 },
  A1: { breite: 841, hoehe: 594 },
  A2: { breite: 594, hoehe: 420 },
  A3: { breite: 420, hoehe: 297 },
  A4: { breite: 297, hoehe: 210 },
};

/**
 * Blattränder (mm). Heftrand links 20mm gilt IMMER links, auch im
 * Hochformat (nicht "oben" o.ä. bei gedrehtem Blatt) — das ist die feste
 * Ablageseite für die Lochung (ISO 838). Oben/rechts/unten je 10mm.
 */
export const BLATT_RAENDER = { links: 20, oben: 10, rechts: 10, unten: 10 } as const;

/** Fixe Plankopf-Masse (mm), unabhängig vom Blattformat. */
export const PLANKOPF_MM = { b: 180, h: 55 } as const;

/**
 * Aussenmasse eines Blatts für Format+Ausrichtung. 'quer' liefert die
 * Basis-Masse aus `BLATT_FORMATE`, 'hoch' vertauscht Breite/Höhe.
 */
export function dims(format: BlattFormat, ausrichtung: BlattAusrichtung): BlattMasse {
  const basis = BLATT_FORMATE[format];
  return ausrichtung === 'quer'
    ? { breite: basis.breite, hoehe: basis.hoehe }
    : { breite: basis.hoehe, hoehe: basis.breite };
}

/**
 * Zeichenfläche = Blattmass abzüglich aller Ränder: Breite − (links+rechts),
 * Höhe − (oben+unten) = (B−30)×(H−20) bei den obigen Rändern.
 */
export function zeichenflaeche(w: number, h: number): BlattMasse {
  return {
    breite: w - (BLATT_RAENDER.links + BLATT_RAENDER.rechts),
    hoehe: h - (BLATT_RAENDER.oben + BLATT_RAENDER.unten),
  };
}

/**
 * Rahmen (Volllinie entlang der Ränder) — deckt sich in Breite/Höhe exakt
 * mit der Zeichenfläche, positioniert bei (links, oben) ab der Blattecke.
 */
export function rahmenRect(w: number, h: number): BlattRect {
  const flaeche = zeichenflaeche(w, h);
  return { x: BLATT_RAENDER.links, y: BLATT_RAENDER.oben, breite: flaeche.breite, hoehe: flaeche.hoehe };
}

/**
 * Plankopf-Position: fix 180×55mm, Ecke unten rechts INNERHALB des Rahmens
 * — die rechte/untere Kante des Plankopfs liegt exakt auf der rechten/
 * unteren Rahmenlinie (kein zusätzlicher Abstand zum Rahmen selbst).
 */
export function plankopfRect(w: number, h: number): BlattRect {
  const rahmen = rahmenRect(w, h);
  const rechteKante = rahmen.x + rahmen.breite;
  const untereKante = rahmen.y + rahmen.hoehe;
  return {
    x: rechteKante - PLANKOPF_MM.b,
    y: untereKante - PLANKOPF_MM.h,
    breite: PLANKOPF_MM.b,
    hoehe: PLANKOPF_MM.h,
  };
}

// --- Faltmarken DIN 824 ------------------------------------------------
//
// Ziel: A4-Endpaket nach Zickzack-Faltung, Schriftfeld (Plankopf, unten
// rechts) liegt nach dem Falten zuoberst. Dafür wird die rechte, 210mm
// breite Zone (= Aussenmass, das den Plankopf mitsamt Luft aufnimmt) zur
// Deckfläche; die weiteren Zonen sind 190mm breit, bis zum Heftrand.
const FALTMARKE_ERSTE_MM = 210;
const FALTMARKE_SCHRITT_MM = 190;
// Ab dieser Breite braucht es keinen Vertikal-Falz mehr — A4 quer (297mm)
// passt bereits ins Zielmass, "A4 = keine Marken".
const FALTMARKE_MIN_BREITE_MM = 297;
// Horizontal-Falz zielt auf die A4-Hochformat-Höhe (297mm).
const FALTMARKE_HORIZONTAL_ZIEL_MM = 297;
// Schwelle bewusst > 297 (nicht ==): bei H knapp über 297 läge die Marke
// (H−297) zu nah am Rand, um noch sinnvoll gefalzt zu werden.
const FALTMARKE_HORIZONTAL_SCHWELLE_MM = 300;

/**
 * Falzmarken nach DIN 824. `vertikal`: x-Positionen für kurze Striche an
 * Ober-/Unterkante (Zickzack-Falz in Breitenrichtung), von rechts beginnend
 * bei 210mm, dann alle 190mm, bis der Heftrand erreicht ist. `horizontal`:
 * y-Position(en) für Striche an Links-/Rechtskante (Querfalz), nur wenn
 * H > 300mm, bei H−297mm. A4 (Breite 297, Höhe 210) liefert beide Listen leer.
 */
export function faltmarken(w: number, h: number): Faltmarken {
  const vertikal: number[] = [];
  if (w > FALTMARKE_MIN_BREITE_MM) {
    let offset = FALTMARKE_ERSTE_MM;
    let x = w - offset;
    while (x > BLATT_RAENDER.links) {
      vertikal.push(x);
      offset += FALTMARKE_SCHRITT_MM;
      x = w - offset;
    }
  }
  const horizontal: number[] = [];
  if (h > FALTMARKE_HORIZONTAL_SCHWELLE_MM) {
    horizontal.push(h - FALTMARKE_HORIZONTAL_ZIEL_MM);
  }
  return { vertikal, horizontal };
}

// --- Lochung ISO 838 ----------------------------------------------------
//
// Bewusste Korrektur gegenüber dem px-Prototyp: 2 Löcher Ø6mm, 80mm
// Mittenabstand, symmetrisch um H/2, Lochmitte 10mm vom linken Blattrand
// (mittig im 20mm-Heftrand). Nur sinnvoll, wenn der Heftrand aktiv ist —
// bei allen fünf Formaten × beiden Ausrichtungen (BLATT_FORMATE × dims) ist
// das der Fall, siehe BLATT_RAENDER.links. `x` ist deshalb direkt aus
// BLATT_RAENDER.links abgeleitet (10 = 20/2), statt eine zweite Konstante
// zu pflegen.
const LOCHUNG_MITTENABSTAND_MM = 80;
const LOCHUNG_DURCHMESSER_MM = 6;

export function lochungMm(h: number): Lochung {
  const x = BLATT_RAENDER.links / 2;
  const halberAbstand = LOCHUNG_MITTENABSTAND_MM / 2;
  return { x, y1: h / 2 - halberAbstand, y2: h / 2 + halberAbstand, d: LOCHUNG_DURCHMESSER_MM };
}

// --- Plankopf-Reserve für Auto-Layout/Blattfüllung ----------------------
//
// Kalibrierung: `derive/blattfuellung.ts` reserviert heute pauschal 40mm
// Höhe zusätzlich zu einem generischen RAND=14mm (10mm Rahmen + 4mm Luft) —
// macht 54mm Gesamt-Abstand von der Papierkante. `commands/publish.ts`
// nutzt für den Ausnützungsnachweis ebenfalls pauschal 40mm. Beide Werte
// sind grosszügig geschätzt, nicht aus PLANKOPF_MM abgeleitet.
//
// Diese Funktion ersetzt die Schätzung durch eine begründete Rechnung:
// PLANKOPF_MM (180×55) + ein Rand, der exakt dem äusseren Blattrand
// entspricht (10mm, wie BLATT_RAENDER.oben/rechts/unten) — die reservierte
// Zone bekommt also denselben visuellen Luftabstand zum übrigen Blattinhalt
// wie der Rahmen selbst zur Papierkante, ohne eine weitere Zahl zu erfinden.
// Ergebnis: breite=190mm, hoehe=65mm — etwas grosszügiger als die bisherigen
// 40mm (die schon fast zufällig nah an 54mm lagen), weil hier zusätzlich zur
// Plankopf-Höhe noch ein expliziter Sicherheitsabstand zum übrigen Inhalt
// eingerechnet ist statt nur zur Papierkante. Konsumenten (blattfuellung.ts,
// publish.ts) werden erst im Sammelwechsel P7 umgestellt — bis dahin bleibt
// ihr Verhalten unverändert.
const PLANKOPF_RESERVE_RAND_MM = 10;

export function plankopfReserveMm(): BlattMasse {
  return {
    breite: PLANKOPF_MM.b + PLANKOPF_RESERVE_RAND_MM,
    hoehe: PLANKOPF_MM.h + PLANKOPF_RESERVE_RAND_MM,
  };
}
