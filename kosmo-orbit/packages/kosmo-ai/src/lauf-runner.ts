import type { LaufPlan } from './lauf-plan';

/**
 * LaufRunner — führt einen `LaufPlan` Schritt für Schritt aus (v0.8.5 PA3
 * «Autopilot-Kern», `docs/V085-SPEZ.md` §3 E4, C-8).
 *
 * ENTKOPPLUNG (wie `ChatSession`, `chat.ts`): `kosmo-ai` ruft NIE selbst
 * `execute()`/`runCommand` aus `@kosmo/kernel` auf. `ChatSession` reicht
 * schreibende Vorschläge an die App weiter und erfährt das Ergebnis erst über
 * `resolveApplied()`/`resolveRejected()` — dieser Runner bekommt seinen
 * Ausführungsweg genauso von AUSSEN injiziert (`fuehreAus`). Die App
 * (`apps/kosmo-orbit/src/state/lauf-runtime.ts`) verdrahtet `fuehreAus` mit
 * dem ECHTEN `useProject().runCommand` — DENSELBEN Weg, über den auch ein
 * Handgriff des Architekten läuft (Diff-Karten-Semantik bleibt, Sanktion 3
 * V085-SPEZ §6: «Autopilot-Schritt an `runCommand` vorbei = Paket ungültig»).
 * Das hält dieses Paket kernel-frei testbar (reine Fakes in
 * `test/lauf-runner.test.ts`, kein `KosmoDoc` nötig).
 *
 * EHRLICHKEIT bei Fehlern (E4): ein Schritt, der wirft, STOPPT den Lauf
 * sofort — der Rest bleibt `offen`, es gibt kein automatisches Weiterlaufen.
 * `abbrechen()` wirkt vor dem NÄCHSTEN Schritt (der aktuell laufende Schritt
 * wird nicht mitten in `fuehreAus` unterbrochen — derselbe Vertrag wie ein
 * `runCommand`-Aufruf, der synchron durchläuft).
 *
 * KEIN AUTO-START (C-10): diese Klasse startet nie von selbst — `starte()`
 * muss explizit gerufen werden, niemand im Konstruktor tut das.
 */

export type LaufSchrittStatus = 'offen' | 'laeuft' | 'ok' | 'fehler';

export interface LaufSchrittZustand {
  status: LaufSchrittStatus;
  /** Zusammenfassung des Commands (z.B. `ExecutionResult.summary`) — nur bei `status: 'ok'`. */
  ergebnis?: string;
  /** Fehlermeldung — nur bei `status: 'fehler'`. */
  fehler?: string;
}

export type LaufGesamtStatus = 'offen' | 'laeuft' | 'fertig' | 'fehler' | 'abgebrochen';

/**
 * Der eine Ausführungsweg, den die App injiziert. Wirft bei Fehlschlag
 * (Muster `execute()` aus `@kosmo/kernel/commands/core.ts`, das eine
 * `CommandError` wirft statt ein Fehlerergebnis zurückzugeben) — der Runner
 * fängt den Wurf und macht daraus einen ehrlichen `status: 'fehler'`.
 * Rückgabewert = die Zusammenfassung des ausgeführten Schritts.
 */
export type FuehreAus = (commandId: string, params: unknown) => string | Promise<string>;

export interface LaufRunnerEvents {
  /** Feuert nach JEDER Statusänderung eines Schritts — die UI (`KosmoPanel.tsx`
   * über `lauf-runtime.ts`) hält damit die Schrittliste live nach. */
  onFortschritt?(schritte: readonly LaufSchrittZustand[]): void;
}

export class LaufRunner {
  private readonly zustaende: LaufSchrittZustand[];
  private abgebrochenFlag = false;
  private gestartet = false;
  private laeuftGerade = false;

  constructor(
    readonly plan: LaufPlan,
    private readonly fuehreAus: FuehreAus,
    private readonly events: LaufRunnerEvents = {},
  ) {
    this.zustaende = plan.schritte.map(() => ({ status: 'offen' }));
  }

  /** Momentaufnahme des Schritt-Status — neues Array je Aufruf (kein Alias auf internen Zustand). */
  get schritte(): readonly LaufSchrittZustand[] {
    return this.zustaende.slice();
  }

  get istAbgebrochen(): boolean {
    return this.abgebrochenFlag;
  }

  get laeuft(): boolean {
    return this.laeuftGerade;
  }

  /** Verdichteter Gesamtstatus für die UI (z.B. Panel-Badge/Titelzeile). */
  get gesamtStatus(): LaufGesamtStatus {
    if (this.zustaende.some((z) => z.status === 'fehler')) return 'fehler';
    if (this.zustaende.every((z) => z.status === 'ok')) return 'fertig';
    if (this.laeuftGerade) return 'laeuft';
    if (this.abgebrochenFlag) return 'abgebrochen';
    return 'offen';
  }

  /**
   * Bricht VOR dem nächsten Schritt ab — kein Wirkung auf einen bereits
   * laufenden Schritt (der läuft ehrlich zu Ende), kein Effekt nach
   * Lauf-Ende (No-Op, Mehrfachaufruf sicher).
   */
  abbrechen(): void {
    this.abgebrochenFlag = true;
  }

  private melde(): void {
    this.events.onFortschritt?.(this.schritte);
  }

  private setStatus(index: number, zustand: LaufSchrittZustand): void {
    this.zustaende[index] = zustand;
    this.melde();
  }

  /**
   * Führt den Plan Schritt für Schritt aus. Zweiter Aufruf (egal ob während
   * eines laufenden oder nach einem abgeschlossenen Laufs) ist ein No-Op —
   * ein `LaufRunner` führt seinen Plan GENAU EINMAL aus; ein neuer Lauf
   * braucht eine neue Instanz (Muster: neuer `LaufPlan` → neuer Runner, so
   * verdrahtet `lauf-runtime.ts`).
   */
  async starte(): Promise<void> {
    if (this.gestartet) return;
    this.gestartet = true;
    this.laeuftGerade = true;
    try {
      for (let i = 0; i < this.plan.schritte.length; i++) {
        if (this.abgebrochenFlag) return;
        const schritt = this.plan.schritte[i]!;
        this.setStatus(i, { status: 'laeuft' });
        try {
          const ergebnis = await this.fuehreAus(schritt.commandId, schritt.params);
          this.setStatus(i, { status: 'ok', ergebnis });
        } catch (err) {
          const meldung = err instanceof Error ? err.message : String(err);
          this.setStatus(i, { status: 'fehler', fehler: meldung });
          return; // ehrlicher Stopp — Rest bleibt 'offen', kein Weiterlaufen (E4)
        }
      }
    } finally {
      this.laeuftGerade = false;
    }
  }
}
