import { z } from 'zod';
import type { Storey } from '@kosmo/kernel';
import { ARBEITSMODI, type Arbeitsmodus } from './arbeitsmodi-kern';
import { PANEL_IDS, TOOL_IDS, VIEW_MODES, useUiZustand, type PanelId, type ToolId, type ViewMode } from './ui-zustand';
import { useProject } from './project-store';

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

// ---------------------------------------------------------------------------
// ui.geschossSetzen (Sim-Befund H-33, docs/SIM-BEFUNDE.md) — App-Zustand
// (activeStoreyId in state/project-store.ts), KEIN Doc-Patch, KEIN Undo-
// Eintrag: exakt dasselbe Muster wie die sechs Befehle oben. Der Fund: KEIN
// Kommando wechselt bisher das aktive Geschoss — design.*-Commands erwarten
// storeyId als Argument, aber die App füllt fehlende storeyId per
// `contextDefaults` (ChatSession) IMMER mit `activeStoreyId`, und das ist nach
// dem Geschoss-Stapeln kommentarlos das unterste Geschoss (EG). Ohne diesen
// Befehl landen Chat-Dächer/-Wände fürs Dachgeschoss also stillschweigend im
// EG. Dieser Befehl wechselt VOR dem Bauen ins Zielgeschoss («wechsle ins
// Dachgeschoss» → `ui.geschossSetzen` → nächster Bau-Zug trifft es).
// ---------------------------------------------------------------------------

export interface UiGeschossResultat {
  storeyId: string;
  name: string;
  index: number;
}

export const uiGeschossSetzen = registriereUiBefehl({
  id: 'ui.geschossSetzen',
  params: z.object({
    storeyId: z.string().optional().describe('Geschoss-ID (aus modell_lesen) — Alternative zu name/index'),
    name: z.string().optional().describe('Geschossname, z.B. «1.OG» — Alternative zu storeyId/index'),
    index: z.number().int().optional().describe('Geschoss-Index (0=EG, 1=1.OG, -1=1.UG) — Alternative zu storeyId/name'),
  }),
  beschreibung:
    'Setzt das AKTIVE Geschoss fürs weitere Bauen (App-Zustand, kein Doc-Patch, kein Undo-Eintrag) — genau EINES von storeyId, name oder index angeben. Ohne aktives Geschoss füllen Design-Commands ihre storeyId sonst immer mit dem untersten Geschoss. Vor dem Bauen in einem anderen Geschoss (z.B. Dachgeschoss) zuerst dieses Werkzeug rufen.',
  run: ({ storeyId, name, index }) => {
    const { doc, setActiveStorey } = useProject.getState();
    const storeys = doc.byKind<Storey>('storey');
    let ziel: Storey | undefined;
    if (storeyId !== undefined) {
      const e = doc.get(storeyId);
      ziel = e && e.kind === 'storey' ? (e as Storey) : undefined;
      if (!ziel) throw new UiBefehlError(`Geschoss «${storeyId}» existiert nicht`, 'ui.geschossSetzen');
    } else if (name !== undefined) {
      ziel = storeys.find((s) => s.name === name);
      if (!ziel) {
        throw new UiBefehlError(
          `Kein Geschoss namens «${name}» — vorhanden: ${storeys.map((s) => s.name).join(', ') || '(keine Geschosse)'}`,
          'ui.geschossSetzen',
        );
      }
    } else if (index !== undefined) {
      ziel = storeys.find((s) => s.index === index);
      if (!ziel) {
        throw new UiBefehlError(
          `Kein Geschoss mit Index ${index} — vorhanden: ${storeys.map((s) => s.index).join(', ') || '(keine Geschosse)'}`,
          'ui.geschossSetzen',
        );
      }
    } else {
      throw new UiBefehlError('ui.geschossSetzen braucht storeyId, name oder index', 'ui.geschossSetzen');
    }
    setActiveStorey(ziel.id);
    const ergebnis: UiGeschossResultat = { storeyId: ziel.id, name: ziel.name, index: ziel.index };
    return ergebnis;
  },
});
