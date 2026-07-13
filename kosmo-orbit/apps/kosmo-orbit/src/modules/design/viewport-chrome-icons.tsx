/**
 * v0.7.6 Welle 1 Stream A — kleines, eigenes Icon-Set für die 3D-Viewport-
 * Chrome (Werkzeug-Rail/HUD/Panel-Aktionen). `@kosmo/ui` `KIcon` (Registry in
 * `icons.tsx`) deckt die generischen Utility-Zeichen ab (Schliessen, Zahnrad,
 * Fit, Kamera, Hand, …) — die HIER ergänzten Namen sind reine
 * Werkzeug-Glyphen, die im bestehenden Registry fehlen (Verschieben, Rotieren,
 * Skalieren, Volumen, Bildausschnitt, Blende, Sonne, Messgerät, Lineal,
 * Schnitt, Kommentar, Begehung, Vollbild, Senden). `packages/kosmo-ui` selbst
 * bleibt unangetastet — dieses Set lebt bewusst in der App (analog zum
 * Kosmodesign-Handoff-Muster `ic()`/`ICONS()`, README §5c), damit kein
 * Fremdpaket ausserhalb der Aufgabenliste angefasst werden muss.
 *
 * Gleiche Bildsprache wie `KIcon`: 16×16-Raster, 1.75px-Stroke, `currentColor`,
 * runde Kappen — die zwei Registries sehen nebeneinander wie EIN System aus.
 */
import type { SVGProps } from 'react';

export type VIconName =
  | 'auswahl'
  | 'verschieben'
  | 'rotieren'
  | 'skalieren'
  | 'volumen'
  | 'ausschnitt'
  | 'blende'
  | 'sonne'
  | 'messgeraet'
  | 'lineal'
  | 'schnitt'
  | 'kommentar'
  | 'begehung'
  | 'vollbild'
  | 'senden';

const PFADE: Record<VIconName, string> = {
  auswahl: 'M3 2l9 8.2-4 .6L11.3 15l-1.8 1-2.5-4.5L3 14Z',
  verschieben:
    'M8 1v14M1 8h14M4 4 8 1l4 3M4 12l4 3 4-3M4 4 1 8l3 4M12 4l3 4-3 4',
  rotieren: 'M13.4 8A5.4 5.4 0 1 1 10.2 3M13.4 3v3.4h-3.4',
  skalieren: 'M2 2h4M2 2v4M2 2l4.6 4.6M14 14h-4M14 14v-4M14 14l-4.6-4.6',
  volumen: 'M8 1.4 14 4.7v6.6L8 14.6 2 11.3V4.7ZM2 4.7 8 8M14 4.7 8 8M8 8v6.6',
  ausschnitt: 'M5 1v9a1 1 0 0 0 1 1h9M11 15V6a1 1 0 0 0-1-1H1',
  blende: 'M8 8m-6 0a6 6 0 1 0 12 0a6 6 0 1 0-12 0 M8 8 5.2 4.4M8 8l4 1M8 8l-1.2 5',
  sonne:
    'M8 5.4a2.6 2.6 0 1 0 0 5.2 2.6 2.6 0 0 0 0-5.2ZM8 1.3v2M8 12.7v2M1.3 8h2M12.7 8h2M3.3 3.3l1.4 1.4M11.3 11.3l1.4 1.4M3.3 12.7l1.4-1.4M11.3 4.7l1.4-1.4',
  messgeraet: 'M2 12.5a6 6 0 0 1 12 0M8 12.5 11 8',
  lineal:
    'M2.5 11 11 2.5a1 1 0 0 1 1.4 0l1.1 1.1a1 1 0 0 1 0 1.4L5 13.5a1 1 0 0 1-1.4 0l-1.1-1.1a1 1 0 0 1 0-1.4ZM5 8.5l1.2 1.2M7 6.5l1.2 1.2M9 4.5l1.2 1.2',
  schnitt: 'M4 4m-2 0a2 2 0 1 0 4 0a2 2 0 1 0-4 0 M4 12m-2 0a2 2 0 1 0 4 0a2 2 0 1 0-4 0 M14 2 5.4 10.6M9 9l5 5M5.4 5.4 8 8',
  kommentar: 'M2 3h12v8H6.2L3.6 13.6V11H2Z',
  begehung: 'M8 8m-6.5 0a6.5 6.5 0 1 0 13 0a6.5 6.5 0 1 0-13 0 M10.4 5.6 8.9 9.5 5 11l1.5-3.9Z',
  vollbild: 'M5.5 2H2v3.5M10.5 2H14v3.5M5.5 14H2v-3.5M10.5 14H14v-3.5',
  senden: 'M14.5 1.5 8 14 6.2 8.9 1 7Z',
};

export interface VIconProps extends Omit<SVGProps<SVGSVGElement>, 'children'> {
  name: VIconName;
  size?: 14 | 15 | 16 | 20;
  title?: string;
}

/** Rendert eine der obigen Werkzeug-Glyphen — API/Optik bewusst deckungsgleich mit `KIcon`. */
export function VIcon({ name, size = 16, title, ...rest }: VIconProps) {
  return (
    <svg
      viewBox="0 0 16 16"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      {...(title !== undefined ? { role: 'img' } : { 'aria-hidden': true })}
      {...rest}
    >
      {title !== undefined && <title>{title}</title>}
      <path d={PFADE[name]} />
    </svg>
  );
}

/** Achsenkreuz-Gizmo (Soll-Bild §6.1): X/Y/Z in den drei Rollenfarben —
 *  X = `--k-rolle-generator`, Y = `--k-rolle-manuell`, Z = `--k-rolle-pn`
 *  (README §3, «Rollen-→-Modus-Mapping»). Rein dekorativ/symbolisch (kein
 *  echtes 3D-Gizmo, keine Kamera-Rotation) — der Orientierungs-TEXT daneben
 *  (in `ViewportChrome`) trägt den echten, aus der Kamera abgeleiteten Wert.
 */
export function AchsenGizmo({ size = 56 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" fill="none" aria-hidden>
      <g strokeWidth="1.75" strokeLinecap="round">
        <line x1="32" y1="32" x2="32" y2="10" stroke="var(--k-rolle-manuell)" />
        <line x1="32" y1="32" x2="52" y2="44" stroke="var(--k-rolle-generator)" />
        <line x1="32" y1="32" x2="14" y2="44" stroke="var(--k-rolle-pn)" />
        <circle cx="32" cy="8" r="2.6" fill="var(--k-rolle-manuell)" stroke="none" />
        <circle cx="54" cy="45" r="2.6" fill="var(--k-rolle-generator)" stroke="none" />
        <circle cx="12" cy="45" r="2.6" fill="var(--k-rolle-pn)" stroke="none" />
        <circle cx="32" cy="32" r="2" fill="var(--k-ink-soft)" stroke="none" />
      </g>
    </svg>
  );
}
