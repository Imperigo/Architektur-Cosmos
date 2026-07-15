import type { DockModus, DockZone } from '../../state/dock-kern';

/**
 * DockSnapZonen (v0.7.8 Welle 2 / Paket P4 — Header-Drag & Neu-Andocken) —
 * rein visuelles Overlay während eines Header-Drags EINES angedockten Panels
 * («redock»-Drag, s. `DockFlaeche.tsx`s Kopfkommentar): drei gestrichelte
 * Zonen (LINKS/RECHTS/SCHWEBEND — SCHWEBEND nur Konzept A) + ein Geist-
 * Rechteck unter dem Zeiger. Reine Darstellung — die Zonenlogik (`hitZone()`)
 * UND die eigentliche Store-Mutation beim Loslassen leben in
 * `DockFlaeche.tsx`; diese Komponente bekommt nur das fertige Ergebnis
 * (welche Zone gerade aktiv ist, wo der Geist steht) zum Anzeigen.
 */

export interface DockGeistZustand {
  id: string;
  x: number;
  y: number;
  w: number;
  h: number;
  zone: DockZone;
}

export interface DockSnapZonenProps {
  feld: { x: number; y: number; w: number; h: number };
  leftW: number;
  rightW: number;
  modus: DockModus;
  geist: DockGeistZustand;
  /**
   * v0.7.9 (A3, Teil B — Snap-Zonen für Schwebende, ROADMAP-359-Restpunkt) —
   * beim Ziehen eines BEREITS schwebenden Panels (`DockFlaeche.tsx`s
   * `floatDragStart`) gibt es keine sinnvolle "wieder schwebend lassen"-Zone
   * (das Panel IST schon schwebend, ein Drop dort setzt einfach das
   * bisherige `floatmove` fort) — nur LINKS/RECHTS sind dort echte
   * Andock-Ziele. Default `true` (unverändertes Verhalten beim Redock-Drag
   * eines angedockten Panels, das die mittlere Zone weiterhin braucht, um
   * überhaupt schwebend werden zu können). */
  mitSchwebendZone?: boolean;
}

/** Muss 1:1 dem `SNAP_ZONE_STRAHL` in `DockFlaeche.tsx`s `hitZone()`
 *  entsprechen — sonst zeigt das Overlay eine andere Zone an, als tatsächlich
 *  beim Loslassen greift. Als Modulkonstante dupliziert statt importiert,
 *  weil `DockFlaeche.tsx`s Konstante nicht exportiert ist (kein Bedarf für
 *  einen dritten Konsumenten) — beide Werte stehen nebeneinander im selben
 *  Ordner, eine Abweichung fiele in `dock-interaktion.spec.ts` sofort auf. */
const SNAP_ZONE_STRAHL = 70;

/** v0.8.0B / W3 (Spez §4, B-57) — Move-Ghost «Kopf-only»: die Ghost-Höhe
 *  bleibt auf die Kopfzeile begrenzt (`DockPanel.tsx`s Kopf ist 28px hoch,
 *  `dock-flaeche.css`) statt der vollen Panel-Höhe (`geist.h`) — nur die
 *  BREITE (`geist.w`, unverändert die Panel-Breite) bleibt wie gezogen. */
const GEIST_KOPF_HOEHE = 28;

export function DockSnapZonen({ feld, leftW, rightW, modus, geist, mitSchwebendZone = true }: DockSnapZonenProps) {
  const linksBreite = Math.min(feld.w, leftW + SNAP_ZONE_STRAHL);
  const rechtsBreite = Math.min(feld.w, rightW + SNAP_ZONE_STRAHL);

  return (
    <>
      <div
        className="k-dock-snap-zone"
        data-testid="dock-snap-links"
        data-aktiv={geist.zone === 'left'}
        style={{ left: feld.x, top: feld.y, width: linksBreite, height: feld.h }}
      >
        <span className="k-dock-snap-zone-label" aria-hidden="true">
          ← LINKS
        </span>
      </div>
      <div
        className="k-dock-snap-zone"
        data-testid="dock-snap-rechts"
        data-aktiv={geist.zone === 'right'}
        style={{ left: feld.x + feld.w - rechtsBreite, top: feld.y, width: rechtsBreite, height: feld.h }}
      >
        <span className="k-dock-snap-zone-label" aria-hidden="true">
          RECHTS →
        </span>
      </div>
      {modus === 'A' && mitSchwebendZone && (
        <div
          className="k-dock-snap-zone k-dock-snap-zone-schwebend"
          data-testid="dock-snap-schwebend"
          data-aktiv={geist.zone === 'float'}
          style={{
            left: feld.x + linksBreite,
            top: feld.y,
            width: Math.max(0, feld.w - linksBreite - rechtsBreite),
            height: feld.h,
          }}
        >
          <span className="k-dock-snap-zone-label" aria-hidden="true">
            SCHWEBEND
          </span>
        </div>
      )}
      <div
        className="k-dock-drag-geist"
        data-testid="dock-drag-geist"
        style={{ left: geist.x, top: geist.y, width: geist.w, height: GEIST_KOPF_HOEHE }}
      />
    </>
  );
}
