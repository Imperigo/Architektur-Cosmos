import { createPortal } from 'react-dom';
import { Hairline, KDialog } from '@kosmo/ui';
import { stationsPanels, type DockStation } from '../../state/dock-stationen';
import type { DockZone } from '../../state/dock-kern';

/**
 * DockRegeln (v0.7.8 Welle 3 / Paket P8 — «Regeln-Panel») — statisches
 * Erklär-Panel neben dem «Layout zurücksetzen»-Knopf (`DesignWorkspace.tsx`):
 * zeigt die Rangfolge (unwichtigstes zuerst) UND die drei Regeln, nach denen
 * `dock-kern.ts`s Solver bei Platzmangel entscheidet.
 *
 * Die Rangfolge-Tabelle wird aus der Registry (`dock-stationen.ts`s
 * `stationsPanels()`) GENERIERT (nach `wichtigkeit` sortiert), NICHT
 * hartkodiert — ändert sich künftig ein Panel oder seine Wichtigkeit dort,
 * zieht dieses Panel automatisch mit, ohne zweite Pflegestelle.
 *
 * **`createPortal` nach `document.body`** (wie `Einstellungen.tsx`):
 * `KDialog` (@kosmo/ui) ist selbst NICHT portaled (reines `position:fixed`-
 * Markup) — von hier aus tief in `DesignWorkspace.tsx`s Baum gerendert, ohne
 * Portal, ankerte der Dialog nachweislich an einem transformierten
 * Vorfahren (`.k-einblenden` o.ä.) und öffnete unsichtbar/off-screen —
 * derselbe H-47-Bug-Typ wie beim früheren Modul-Editor-Dialog (ROADMAP-
 * Eintrag zu dessen Fix). Portal nach `document.body` löst das Problem
 * an der Wurzel statt es zu kaschieren.
 */
export interface DockRegelnProps {
  station: DockStation;
  onClose: () => void;
}

const ZONEN_LABEL: Record<DockZone, string> = {
  rail: 'Rail',
  left: 'Links',
  right: 'Rechts',
  float: 'Schwebend',
};

export function DockRegeln({ station, onClose }: DockRegelnProps) {
  const rangfolge = [...stationsPanels(station)].sort((a, b) => a.wichtigkeit - b.wichtigkeit);

  return createPortal(
    <KDialog titel="Wie das Dock entscheidet" onClose={onClose} breite={640} data-testid="dock-regeln">
      <div style={{ display: 'grid', gap: 14 }}>
        <section>
          <div style={{ fontSize: 12.5, fontWeight: 650, marginBottom: 6 }}>Die drei Regeln</div>
          <ol
            style={{
              margin: 0,
              paddingLeft: 18,
              display: 'grid',
              gap: 4,
              fontSize: 12.5,
              color: 'var(--k-ink-soft)',
              lineHeight: 1.5,
            }}
          >
            <li>Der Viewport hat die höchste Priorität — er schrumpft als Allerletztes.</li>
            <li>Wird der Platz knapp, klappt das UNWICHTIGSTE offene Panel zuerst zu einem Tab ein.</li>
            <li>Angeheftete Panels sind geschützt — sie behalten ihre Grösse, andere weichen aus.</li>
          </ol>
        </section>
        <Hairline />
        <section>
          <div style={{ fontSize: 12.5, fontWeight: 650, marginBottom: 6 }}>
            Rangfolge dieser Station — unwichtigstes zuerst
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table data-testid="dock-regeln-rangfolge" style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
              <thead>
                <tr
                  style={{
                    textAlign: 'left',
                    color: 'var(--k-ink-faint)',
                    fontFamily: 'var(--k-font-mono)',
                    fontSize: 10.5,
                    textTransform: 'uppercase',
                    letterSpacing: '0.06em',
                  }}
                >
                  <th style={{ padding: '4px 8px' }}>Panel</th>
                  <th style={{ padding: '4px 8px' }}>Wichtigkeit</th>
                  <th style={{ padding: '4px 8px' }}>Zone</th>
                </tr>
              </thead>
              <tbody>
                {rangfolge.map((def) => (
                  <tr key={def.id} data-testid={`dock-regeln-zeile-${def.id}`} style={{ borderTop: '1px solid var(--k-line)' }}>
                    <td style={{ padding: '4px 8px' }}>{def.titel}</td>
                    <td style={{ padding: '4px 8px', fontFamily: 'var(--k-font-mono)' }}>{def.wichtigkeit}</td>
                    <td style={{ padding: '4px 8px' }}>{ZONEN_LABEL[def.dock]}</td>
                  </tr>
                ))}
                {rangfolge.length === 0 && (
                  <tr>
                    <td colSpan={3} style={{ padding: '4px 8px', color: 'var(--k-ink-faint)' }}>
                      Diese Station hat keine Dock-Panels.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
        <Hairline />
        <section style={{ fontSize: 12.5, color: 'var(--k-ink-soft)', lineHeight: 1.5 }}>
          <strong>Konzept A (Orbit-Zonen)</strong> lässt Panels bei Platznot einklappen und erlaubt schwebende HUDs.{' '}
          <strong>Konzept B (Raster-Kachel)</strong> lässt nichts schweben und nichts einklappen — alle teilen sich
          stattdessen proportional den Raum.
        </section>
        {/* v0.8.0 / Paket PD2 (Default-Oberflächen) — additiver Hinweis, kein
            Umbau: wer diese Rangfolge nicht von Hand nachbauen will, findet
            in den Einstellungen fertig kuratierte Presets. */}
        <section style={{ fontSize: 12.5, color: 'var(--k-ink-soft)', lineHeight: 1.5 }}>
          <strong>Presets</strong> (Einstellungen → Darstellung: Fokus/Arbeiten/Prüfen) wenden eine kuratierte
          Auswahl dieser Regeln fertig an, statt jedes Panel einzeln einzurichten.
        </section>
      </div>
    </KDialog>,
    document.body,
  );
}
