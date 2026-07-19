import { z } from 'zod';

/**
 * LaufPlan — v0.8.5 PA3 «Autopilot-Kern» (`docs/V085-SPEZ.md` §3 E4, C-8).
 *
 * Ein `LaufPlan` ist eine geplante Aktionsfolge über mehrere Kernel-Commands
 * (Planen→Ausführen→Prüfen, aufbauend auf dem `vis.render`-Demolauf,
 * `e2e/vis-demolauf.spec.ts`). Jeder `LaufSchritt` trägt GENAU das, was ein
 * einzelner Kosmo-Werkzeug-Vorschlag heute trägt (`Proposal` in `chat.ts`:
 * `commandId`/`params`), plus eine `begruendung` — der Lauf ist dazu da, dass
 * ein Mensch NACHVOLLZIEHEN kann, warum Kosmo diesen Schritt geplant hat,
 * bevor/während er läuft (Anzeige in `KosmoPanel.tsx`).
 *
 * Zod-Schema nach demselben Muster wie die übrigen kosmo-ai-Schemata
 * (Command-`params` selbst, `tools.ts#validateToolCall`): `safeParse` für den
 * ehrlichen Ablehnungs-Pfad (kein Wurf mitten in einer UI-Aktion), ein
 * schmaler `parse`-Wrapper für Aufrufer, die den Fehler bereits geprüft haben
 * (z.B. Tests mit bekannt validen Fixtures).
 *
 * BEWUSST kein Bezug zu `@kosmo/kernel` — ein `LaufPlan` ist reine Nutzlast
 * (Command-ID als String, `params` ungeprüft `unknown`). Ob eine `commandId`
 * wirklich existiert und `params` zum jeweiligen Command-Schema passt, prüft
 * ERST der `fuehreAus`-Aufruf zur Laufzeit (`lauf-runner.ts`) — exakt die
 * gleiche Grenze wie bei einem Kosmo-Tool-Call (`tools.ts#validateToolCall`
 * prüft ebenfalls erst beim tatsächlichen Aufruf, nicht vorab gegen die
 * gesamte Command-Registry).
 */

export const laufSchrittSchema = z.object({
  /** Kernel-Command-ID, z.B. `design.wandZeichnen` (Punkt-Notation, wie in
   * der Command-Registry — NICHT die Unterstrich-Tool-Form aus `tools.ts`). */
  commandId: z.string().min(1, 'commandId darf nicht leer sein'),
  /** Rohe Command-Parameter — geprüft erst beim Ausführen (`execute()`s
   * zod-Schema des jeweiligen Commands, über `fuehreAus`). */
  params: z.unknown(),
  /** Menschlesbare Begründung, WARUM dieser Schritt geplant ist — Pflichtfeld,
   * das ist der Sinn eines nachvollziehbaren Laufs (Anzeige `KosmoPanel.tsx`). */
  begruendung: z.string().min(1, 'begruendung darf nicht leer sein'),
});

export const laufPlanSchema = z.object({
  titel: z.string().min(1, 'titel darf nicht leer sein'),
  schritte: z.array(laufSchrittSchema).min(1, 'ein Lauf braucht mindestens einen Schritt'),
});

export type LaufSchritt = z.infer<typeof laufSchrittSchema>;
export type LaufPlan = z.infer<typeof laufPlanSchema>;

export interface LaufPlanFehler {
  ok: false;
  error: string;
}

export interface LaufPlanErgebnis {
  ok: true;
  plan: LaufPlan;
}

function formatiereZodFehler(error: z.ZodError): string {
  return error.issues.map((i) => `${i.path.join('.') || '(root)'}: ${i.message}`).join('; ');
}

/**
 * Ehrliche Validierung (Muster `tools.ts#validateToolCall`): liefert ein
 * Ergebnis statt zu werfen — der Aufrufer (z.B. `lauf-runtime.ts`, ein
 * künftiger Kosmo-Dialog) entscheidet selbst, wie ein ungültiger Plan der
 * Oberfläche gemeldet wird.
 */
export function pruefeLaufPlan(input: unknown): LaufPlanErgebnis | LaufPlanFehler {
  const parsed = laufPlanSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: formatiereZodFehler(parsed.error) };
  return { ok: true, plan: parsed.data };
}

/**
 * Wirft bei ungültiger Eingabe — für Aufrufer, die bereits wissen, dass ihre
 * Fixture/Konstante valide ist (z.B. Tests, statisch kuratierte Drehbücher),
 * und einen Programmierfehler nicht stillschweigend schlucken wollen.
 */
export function parseLaufPlan(input: unknown): LaufPlan {
  return laufPlanSchema.parse(input);
}
