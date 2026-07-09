import { z } from 'zod';
import { ARBEITSMODI, type Arbeitsmodus } from './arbeitsmodi-kern';
import { PANEL_IDS, TOOL_IDS, VIEW_MODES, useUiZustand, type PanelId, type ToolId, type ViewMode } from './ui-zustand';

/**
 * `ui.*`-Command-Namensraum (v0.6.6 BEWEGUNGSKONZEPT §6) — app-seitige
 * Registry im Stil von `registerCommand` (`packages/kosmo-kernel/src/
 * commands/core.ts`), aber EIGENSTÄNDIG und FLÜCHTIG: kein `KosmoDoc`, keine
 * `AnyPatch[]`, KEINE Doc-Patches, KEIN Undo — jeder Befehl schreibt/liest
 * direkt den `ui-zustand.ts`-Store.
 *
 * **Drei Konsumenten, ein Pfad** (Konzept §6): die Modus-Automatik
 * (`arbeitsmodi-kern.ts` + ein künftiger Bindeglied-Hook), Kosmo (Stream E
 * exportiert diese Befehle als LLM-Werkzeuge über `packages/kosmo-ai`), und
 * E2E-Tests (deterministisches Setzen ohne Klick-Choreografie) rufen
 * ausschliesslich `fuehreUiBefehlAus` — nie den Store direkt.
 */

export interface UiBefehl<P = unknown> {
  readonly id: string;
  readonly params: z.ZodType<P>;
  /** Beschreibung für Menschen UND für ein künftiges LLM-Tool-Schema (Stream E). */
  readonly beschreibung: string;
  /** Pur bzgl. Rückgabewert, mutiert aber bewusst den `ui-zustand.ts`-Store (kein Doc, kein Undo). */
  run(params: P): unknown;
}

export class UiBefehlError extends Error {
  constructor(
    message: string,
    readonly befehlId?: string,
  ) {
    super(message);
    this.name = 'UiBefehlError';
  }
}

const registry = new Map<string, UiBefehl<never>>();

export function registriereUiBefehl<P>(befehl: UiBefehl<P>): UiBefehl<P> {
  if (registry.has(befehl.id)) throw new UiBefehlError(`ui.*-Befehl doppelt registriert: ${befehl.id}`, befehl.id);
  registry.set(befehl.id, befehl as UiBefehl<never>);
  return befehl;
}

export function alleUiBefehle(): UiBefehl<unknown>[] {
  return [...registry.values()] as UiBefehl<unknown>[];
}

/** Validiert die Params gegen das Befehls-Schema, führt dann `run()` aus. */
export function fuehreUiBefehlAus(id: string, rawParams: unknown): unknown {
  const befehl = registry.get(id);
  if (!befehl) throw new UiBefehlError(`Unbekannter ui.*-Befehl: ${id}`, id);
  const parsed = befehl.params.safeParse(rawParams);
  if (!parsed.success) {
    throw new UiBefehlError(
      `Ungültige Parameter für ${id}: ${parsed.error.issues.map((i) => `${i.path.join('.') || '(root)'} — ${i.message}`).join('; ')}`,
      id,
    );
  }
  return befehl.run(parsed.data);
}

// ---------------------------------------------------------------------------
// Lese-Schnappschuss (ui.zustandLesen)
// ---------------------------------------------------------------------------

export interface UiZustandSnapshot {
  tool: ToolId;
  viewMode: ViewMode;
  panels: Record<PanelId, boolean>;
  arbeitsmodus: Arbeitsmodus | undefined;
  modusAutomatik: boolean;
  modusFesthalten: boolean;
  modusManuell: Arbeitsmodus | undefined;
  phasenFokus: string[] | null;
}

function schnappschuss(): UiZustandSnapshot {
  const s = useUiZustand.getState();
  const panels = {} as Record<PanelId, boolean>;
  for (const id of PANEL_IDS) panels[id] = s[id];
  return {
    tool: s.tool,
    viewMode: s.viewMode,
    panels,
    arbeitsmodus: s.arbeitsmodus,
    modusAutomatik: s.modusAutomatik,
    modusFesthalten: s.modusFesthalten,
    modusManuell: s.modusManuell,
    phasenFokus: s.phasenFokus ? [...s.phasenFokus] : null,
  };
}

// ---------------------------------------------------------------------------
// Die sechs Befehle (Konzept §6/§8)
// ---------------------------------------------------------------------------

const ARBEITSMODUS_TUPLE = ARBEITSMODI as [Arbeitsmodus, ...Arbeitsmodus[]];
const TOOL_TUPLE = TOOL_IDS as [ToolId, ...ToolId[]];
const VIEW_MODE_TUPLE = VIEW_MODES as [ViewMode, ...ViewMode[]];
const PANEL_TUPLE = PANEL_IDS as unknown as [PanelId, ...PanelId[]];

export const uiPanelSetzen = registriereUiBefehl({
  id: 'ui.panelSetzen',
  params: z.object({ panel: z.enum(PANEL_TUPLE), offen: z.boolean() }),
  beschreibung: 'Öffnet oder schliesst ein Panel/Menü der Design-Werkstatt (z.B. Volumenstudien, Export-Menü).',
  run: ({ panel, offen }) => {
    useUiZustand.getState().setzePanel(panel, offen);
    return schnappschuss();
  },
});

export const uiWerkzeugSetzen = registriereUiBefehl({
  id: 'ui.werkzeugSetzen',
  params: z.object({ tool: z.enum(TOOL_TUPLE) }),
  beschreibung: 'Wechselt das aktive Zeichenwerkzeug (Wand, Zone, Treppe, Mesh, …).',
  run: ({ tool }) => {
    useUiZustand.getState().setTool(tool);
    return schnappschuss();
  },
});

export const uiAnsichtSetzen = registriereUiBefehl({
  id: 'ui.ansichtSetzen',
  params: z.object({ viewMode: z.enum(VIEW_MODE_TUPLE) }),
  beschreibung: 'Wechselt die Ansicht (3D, 2D, Split, Quad).',
  run: ({ viewMode }) => {
    useUiZustand.getState().setViewMode(viewMode);
    return schnappschuss();
  },
});

export const uiModusSetzen = registriereUiBefehl({
  id: 'ui.modusSetzen',
  params: z.object({ modus: z.enum(ARBEITSMODUS_TUPLE).nullable() }),
  beschreibung: 'Setzt den Arbeitsmodus manuell (null = zurück in den Neutral-Zustand/Voll-UI). Zählt als manuelle Übersteuerung.',
  run: ({ modus }) => {
    const zielModus = modus ?? undefined;
    useUiZustand.getState().setArbeitsmodus(zielModus);
    useUiZustand.getState().setModusManuell(zielModus);
    return schnappschuss();
  },
});

export const uiModusAutomatik = registriereUiBefehl({
  id: 'ui.modusAutomatik',
  params: z.object({ automatik: z.boolean() }),
  beschreibung: 'Schaltet die Arbeitsmodus-Erkennung ein/aus (aus = heutige Voll-UI, Opt-out gemäss Ehrlichkeits-UI).',
  run: ({ automatik }) => {
    useUiZustand.getState().setModusAutomatik(automatik);
    return schnappschuss();
  },
});

export const uiZustandLesen = registriereUiBefehl({
  id: 'ui.zustandLesen',
  params: z.object({}),
  beschreibung: 'Liest einen Schnappschuss des UI-Zustands (Werkzeug, Ansicht, Panels, Arbeitsmodus).',
  run: () => schnappschuss(),
});
