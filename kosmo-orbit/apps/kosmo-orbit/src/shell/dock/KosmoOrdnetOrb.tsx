import { useDockOrbRuntime } from '../../state/dock-orb-runtime';

/**
 * KosmoOrdnetOrb (v0.7.8 Welle 3 / Paket P7 — «Kosmo ordnet») — der goldene
 * Orb, der SICHTBAR macht, welches Panel Kosmo gerade über einen `ui.dock*`-
 * Befehl bedient hat. Gemountet als Kind von `DockFlaeche.tsx` (selbe
 * `position:absolute`-Koordinatenwelt wie `DockPanel.tsx`s Rechtecke, s.
 * `.k-dock-flaeche{position:absolute;inset:0}` in `dock-flaeche.css`) —
 * `DockFlaeche` schreibt die aktuellen Panel-Kopf-Rechtecke nach jedem
 * `solve()`-Lauf in `useDockOrbRuntime` (`setzeRects`), dieser Orb liest sie
 * nur, kennt den Solver selbst nicht.
 *
 * **Sichtbar nur solange `laeuft`** (Auftrag): kein Rechteck fürs aktive
 * Panel (z.B. gerade eingeklappt/geschlossen, Kopfzeile nicht mehr vorhanden)
 * ⇒ Orb bleibt unsichtbar, der Stopp-Chip aber weiterhin bedienbar (Kosmo
 * "läuft" noch, auch wenn gerade kein Ziel zu zeigen ist).
 *
 * **STOPP** (`data-testid="dock-kosmo-stopp"`): setzt `laeuft` sofort auf
 * `false` — Orb + Badge (`DockPanel.tsx`, `badgePanelId`) verschwinden ohne
 * Übergang. Kein Einfluss auf bereits geschriebene Dock-Overrides: STOPP
 * beendet nur die SICHTBARE Anzeige, macht keine Mutation rückgängig (kein
 * Undo-System im `ui.*`-Namensraum, s. `ui-befehle.ts`-Kopfkommentar).
 */
export function KosmoOrdnetOrb() {
  const laeuft = useDockOrbRuntime((s) => s.laeuft);
  const aktivPanelId = useDockOrbRuntime((s) => s.aktivPanelId);
  const rects = useDockOrbRuntime((s) => s.rects);
  const stoppen = useDockOrbRuntime((s) => s.stoppen);

  if (!laeuft) return null;

  const ziel = aktivPanelId ? rects[aktivPanelId] : undefined;

  return (
    <>
      {ziel && (
        <div
          className="k-dock-kosmo-orb"
          data-testid="dock-kosmo-orb"
          style={{ left: ziel.x + 17, top: ziel.y + 17 }}
          aria-hidden="true"
        >
          <span className="k-dock-kosmo-orb-halo" />
          <span className="k-dock-kosmo-orb-kern" />
        </div>
      )}
      <div className="k-dock-kosmo-stopp-huelle">
        <button
          type="button"
          className="k-dock-kosmo-stopp"
          data-testid="dock-kosmo-stopp"
          onClick={stoppen}
          title="Kosmo stoppen — Orb/Badge verschwinden sofort"
        >
          KOSMO ORDNET · STOPP
        </button>
      </div>
    </>
  );
}
