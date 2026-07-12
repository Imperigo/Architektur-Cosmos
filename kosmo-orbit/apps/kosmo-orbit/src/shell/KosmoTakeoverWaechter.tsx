import { useKosmoStatus } from '../state/kosmo-status';
import { KosmoTakeoverRahmen } from './KosmoOrb';

/**
 * v0.7.4 Welle 3 P9 — schliesst eine Mount-Lücke, die beim Verdrahten des
 * echten Takeover-Auslösers (`KosmoPanel.applyPaket`, grosses autonomes
 * Paket) sichtbar wurde:
 *
 * `KosmoOrb` — und damit der Vollbild-Takeover-Rahmen (`KosmoTakeoverRahmen`,
 * `shell/KosmoOrb.tsx`) — lebt NUR in `KosmoSymbol.tsx` (direkt auf der
 * Zentrale/Home ODER eingebettet im `BodenDock` in einer Modul-Ansicht).
 * BEIDE Stellen mounten ausschliesslich, wenn das KosmoPanel GESCHLOSSEN
 * ist (`!kosmoOpen`, Einzel-Instanz-Invariante aus Welle 2: „kosmo-symbol
 * nie doppelt"). Der einzige Ort, der `zustand==='takeover'` je auslöst
 * (`applyPaket`, s.o.), läuft aber ausschliesslich bei OFFENEM Panel — die
 * „Anwenden"-Knöpfe für ein Paket liegen im Panel selbst. Ohne diese Wache
 * bliebe der Rahmen exakt dann unsichtbar, wenn er gebraucht wird.
 *
 * Diese Wache übernimmt GENAU den komplementären Fall: sie rendert den
 * Rahmen NUR bei offenem Panel. Damit gilt app-weit: entweder Symbol/
 * BodenDock zeigen ihn (Panel zu) ODER diese Wache (Panel offen) — NIE
 * beide gleichzeitig, NIE keiner — `kosmo-orb-takeover` bleibt so exakt
 * einmal im DOM, sobald der Zustand aktiv ist (dieselbe Härte wie bei
 * `kosmo-symbol`, nur für den Takeover-Rahmen).
 */
export function KosmoTakeoverWaechter({ kosmoOpen }: { kosmoOpen: boolean }) {
  const zustand = useKosmoStatus((s) => s.zustand);
  if (!kosmoOpen || zustand !== 'takeover') return null;
  return <KosmoTakeoverRahmen />;
}
