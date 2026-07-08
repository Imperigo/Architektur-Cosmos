import { KButton, OrbitMark, Panel } from '@kosmo/ui';

export interface ErsteStartFrageProps {
  /** «Ja, zeig mir den Rundgang» — startet den Starter-Guide. */
  onJa: () => void;
  /** «Nein, ich kenne mich aus» — markiert den Rundgang als erledigt, Frage kommt nie wieder. */
  onNein: () => void;
}

/**
 * ErsteStartFrage (Serie K / A3, Owner-Befund K13 wörtlich: «Erster Start:
 * Kosmo fragt ‹neu hier?› → Guide; sonst nie wieder (Einstellung
 * reaktivierbar)»). Ersetzt den bisherigen Guide-AUTOSTART (V1.6 Block E):
 * der Rundgang drängt sich nicht mehr auf, Kosmo fragt zuerst.
 *
 * Bewusst eine Karte IM Home-Fluss (wie die «Erste Schritte»-Karte) statt
 * eines fixed-Overlays: sie erscheint nur in der Zentrale, verschiebt Layout
 * statt es zu überdecken — nichts fängt Klicks über den Kacheln ab (die
 * Lehre aus dem Guide-Karten-Befund, ROADMAP 221).
 *
 * «Nie wieder» nutzt dasselbe Flag wie der Guide selbst
 * (`kosmo.starterGuide.done`): Ablehnen = beendet. Die Reaktivierung ist der
 * bestehende «?»-Knopf in der Kopfleiste (starter-guide-start) — er startet
 * den Rundgang unabhängig vom Flag.
 */
export function ErsteStartFrage({ onJa, onNein }: ErsteStartFrageProps) {
  return (
    <Panel data-testid="erste-start-frage" style={{ padding: '16px 18px', display: 'grid', gap: 10 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <OrbitMark module="kosmo" size={26} />
        <div style={{ fontWeight: 600 }}>Neu hier?</div>
      </div>
      <div style={{ fontSize: 13.5, lineHeight: 1.6, color: 'var(--k-ink-soft)', maxWidth: 560 }}>
        Ich bin Kosmo, die steuernde Intelligenz dieses Programms. Wenn du magst, führe ich dich in sechs
        kurzen Schritten einmal durch — vom ersten Strich bis zum Export.
      </div>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <KButton size="sm" tone="accent" data-testid="erste-start-ja" onClick={onJa}>
          Ja, zeig mir den Rundgang
        </KButton>
        <KButton size="sm" tone="ghost" data-testid="erste-start-nein" onClick={onNein}>
          Nein, ich kenne mich aus
        </KButton>
      </div>
      <div style={{ fontSize: 11.5, color: 'var(--k-ink-faint)' }}>
        Du findest den Rundgang später jederzeit über das «?» in der Kopfleiste.
      </div>
    </Panel>
  );
}
