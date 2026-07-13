/**
 * v0.7.6 Welle 1 Stream A — 3D-Viewport-Chrome: reine Daten + Ableitungen
 * (kein React, gut testbar). Portiert die DREI Bearbeitungsmodi aus dem
 * ClaudeDesign-Soll-Bild (`Kosmo Viz Viewport.dc.html`, `MODES()`) auf den
 * echten Rollen-Token-Satz aus `aura.css` (README-Handoff §3):
 *   Modellieren = Rolle manuell (sage) · Kamera = Rolle generator (clayred)
 *   · Review = Rolle system/`--k-signal` (teal/Accent).
 *
 * WICHTIG (Ehrlichkeit vor Politur, CLAUDE.md): anders als das Soll-Bild
 * (statische Platzhalter-Werte «35 mm · f/4.0 · ISO 200») liefert dieses
 * Modul NUR die STRUKTUR/BESCHRIFTUNG je Modus — die tatsächlichen HUD-/
 * Panel-WERTE berechnet `ViewportChrome.tsx` aus echten Laufzeitdaten
 * (Kamera-FOV, aktives Geschoss, Kontext-Mesh-Anzahl, Leistungsstufe, …),
 * die `Viewport3D.tsx` hereinreicht. Keine erfundene Kamera-/Belichtungs-
 * Telemetrie, wo keine existiert.
 */
import type { VIconName } from './viewport-chrome-icons';

export type ViewportModusId = 'modellieren' | 'kamera' | 'review';

export const VIEWPORT_MODUS_REIHENFOLGE: readonly ViewportModusId[] = ['modellieren', 'kamera', 'review'];

export interface ViewportRolle {
  farbe: string;
  fill: string;
  linie: string;
}

/** Rollen-→-Modus-Mapping, wörtlich aus dem Handoff-README §3. */
export const VIEWPORT_ROLLEN: Record<ViewportModusId, ViewportRolle> = {
  modellieren: {
    farbe: 'var(--k-rolle-manuell)',
    fill: 'var(--k-rolle-manuell-fill)',
    linie: 'var(--k-rolle-manuell-line)',
  },
  kamera: {
    farbe: 'var(--k-rolle-generator)',
    fill: 'var(--k-rolle-generator-fill)',
    linie: 'var(--k-rolle-generator-line)',
  },
  review: {
    farbe: 'var(--k-signal)',
    fill: 'var(--k-signal-fill)',
    linie: 'var(--k-signal-line)',
  },
};

export interface ViewportModusText {
  badge: string;
  tagLabel: string;
  titel: string;
  sub: string;
  tabLabel: string;
  tabIcon: VIconName;
  hudTitel: string;
  aktionLabel: string;
  aktionIcon: VIconName;
}

export const VIEWPORT_MODUS_TEXT: Record<ViewportModusId, ViewportModusText> = {
  modellieren: {
    badge: 'MODELLIEREN',
    tagLabel: 'MANUELL',
    titel: 'Massing bearbeiten',
    sub: 'Volumen · Snapping · Achsen',
    tabLabel: 'Modellieren',
    tabIcon: 'verschieben',
    hudTitel: 'Viewport',
    aktionLabel: 'Einpassen',
    aktionIcon: 'auswahl',
  },
  kamera: {
    badge: 'KAMERA',
    tagLabel: 'BINDET AN VIZ',
    titel: 'Kamera & Render-Setup',
    sub: 'Objektiv · Blende · Belichtung',
    tabLabel: 'Kamera',
    tabIcon: 'blende',
    hudTitel: 'Kamera-HUD',
    aktionLabel: 'An Visualisierung senden',
    aktionIcon: 'senden',
  },
  review: {
    badge: 'REVIEW',
    tagLabel: 'BEGEHUNG',
    titel: 'Prüfen & Begehen',
    sub: 'Schnitt · Messen · Kommentar',
    tabLabel: 'Review',
    tabIcon: 'lineal',
    hudTitel: 'Review-HUD',
    aktionLabel: 'Für Vis aufnehmen',
    aktionIcon: 'kommentar',
  },
};

export interface ViewportWerkzeug {
  id: string;
  icon: VIconName;
  label: string;
}

/** Je Modus 6 Werkzeuge (README §6.1) — reine Rail-Chrome: das Klicken hebt
 *  lokal das aktive Werkzeug hervor, löst (noch) keine eigene 3D-Aktion aus
 *  (kein Auswahl-/Transform-Werkzeugsatz in diesem Umbau-Schritt — bewusst
 *  vertagt, s. Abschlussbericht). Reale Kamera-Navigation bleibt bei der
 *  bestehenden `NavLeiste` (Orbit/Pan/Zoom/Fit), unverändert. */
export const VIEWPORT_WERKZEUGE: Record<ViewportModusId, ViewportWerkzeug[]> = {
  modellieren: [
    { id: 'auswahl', icon: 'auswahl', label: 'Auswahl' },
    { id: 'verschieben', icon: 'verschieben', label: 'Verschieben' },
    { id: 'rotieren', icon: 'rotieren', label: 'Rotieren' },
    { id: 'skalieren', icon: 'skalieren', label: 'Skalieren' },
    { id: 'volumen', icon: 'volumen', label: 'Volumen' },
    { id: 'ausschnitt', icon: 'ausschnitt', label: 'Ausschnitt' },
  ],
  kamera: [
    { id: 'auswahl', icon: 'auswahl', label: 'Auswahl' },
    { id: 'kamera-setzen', icon: 'ausschnitt', label: 'Kamera setzen' },
    { id: 'bildausschnitt', icon: 'skalieren', label: 'Bildausschnitt' },
    { id: 'blende', icon: 'blende', label: 'Blende' },
    { id: 'belichtung', icon: 'sonne', label: 'Belichtung' },
    { id: 'iso', icon: 'messgeraet', label: 'ISO' },
  ],
  review: [
    { id: 'auswahl', icon: 'auswahl', label: 'Auswahl' },
    { id: 'messen', icon: 'lineal', label: 'Messen' },
    { id: 'schnitt', icon: 'schnitt', label: 'Schnitt' },
    { id: 'kommentar', icon: 'kommentar', label: 'Kommentar' },
    { id: 'begehung', icon: 'begehung', label: 'Begehung' },
    { id: 'sonnenstand', icon: 'sonne', label: 'Sonnenstand' },
  ],
};

// ---------------------------------------------------------------------------
// Reine Ableitungen aus echten Laufzeitwerten (kein React, testbar).
// ---------------------------------------------------------------------------

/** Azimut (Radiant, camera-controls `azimuthAngle`, 0 = Süd wie in Viewport3D
 *  bereits für die Sonnenberechnung verwendet) → 8-Punkt-Kompasslabel. */
export function kompassLabel(azimutRad: number): string {
  const grad = ((-azimutRad * 180) / Math.PI + 360) % 360;
  const punkte = ['SÜD', 'SW', 'WEST', 'NW', 'NORD', 'NO', 'OST', 'SO'];
  const index = Math.round(grad / 45) % 8;
  return punkte[index]!;
}

/** 35mm-äquivalente Brennweite aus dem echten Kamera-FOV (Grad, vertikal) —
 *  Kleinbild-Sensorhöhe 24 mm als Referenz (Standardformel). */
export function brennweiteAusFov(fovGrad: number, sensorHoeheMm = 24): number {
  const fovRad = (fovGrad * Math.PI) / 180;
  return Math.round(sensorHoeheMm / 2 / Math.tan(fovRad / 2));
}

/** Kurzform des Seitenverhältnisses («16:9», «4:3», sonst `x.xx:1`). */
export function aspektLabel(breite: number, hoehe: number): string {
  if (hoehe <= 0) return '—';
  const verhaeltnis = breite / hoehe;
  const bekannte: [number, string][] = [
    [16 / 9, '16:9'],
    [4 / 3, '4:3'],
    [3 / 2, '3:2'],
    [1, '1:1'],
  ];
  for (const [wert, label] of bekannte) {
    if (Math.abs(verhaeltnis - wert) < 0.02) return label;
  }
  return `${verhaeltnis.toFixed(2)}:1`;
}

/** Zoom-Prozent relativ zur beim Mount gespeicherten Ausgangsdistanz (100 %
 *  = Ausgangslage). `distanzAktuell`/`distanzStart` sind camera-controls-
 *  Distanzen (Meter) — kleiner werdende Distanz = grösserer Prozentwert. */
export function zoomProzent(distanzAktuell: number, distanzStart: number): number {
  if (distanzAktuell <= 0 || distanzStart <= 0) return 100;
  return Math.round((distanzStart / distanzAktuell) * 100);
}

/** Menschenlesbares Sonnenstand-Label — «Studio» ist der ehrliche Fallback,
 *  solange kein Datum gesetzt ist (Q12-Verhalten, s. Viewport3D `sunDate`). */
export function sonnenLabel(datum: Date | null): string {
  if (!datum) return 'Studio (kein Datum)';
  const tag = String(datum.getDate()).padStart(2, '0');
  const monat = String(datum.getMonth() + 1).padStart(2, '0');
  const stunde = String(datum.getHours()).padStart(2, '0');
  const minute = String(datum.getMinutes()).padStart(2, '0');
  return `${tag}.${monat} · ${stunde}:${minute}`;
}
