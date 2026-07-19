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

  /**
   * Verdichteter Gesamtstatus für die UI (z.B. Panel-Badge/Titelzeile,
   * KosmoPanel-Fortsetzen-/Wiederholen-Knöpfe).
   *
   * v0.8.8 PA5 (E4-Zustandslücke, dokumentierter Entscheid): `wiederholeSchritt`
   * kann einen `'fehler'`-Schritt gezielt auf `'ok'` heben, während SPÄTERE
   * Schritte weiterhin `'offen'` bleiben (sie liefen ja nie) — ohne die
   * letzte Zeile unten (`some(status === 'ok')`) würde das Array dann WEDER
   * `'fehler'` noch `'jeder ok'` zeigen, `laeuftGerade`/`abgebrochenFlag`
   * sind ebenfalls beide falsch → der Fall würde ohne diese Zeile fälschlich
   * auf `'offen'` fallen, als hätte der Lauf NIE begonnen. Das ist der
   * EINZIGE Weg, wie «ein Teil ok, ein Teil offen, kein Fehler, nicht am
   * Laufen, nie explizit abgebrochen» entstehen kann (`fortsetzenAb` läuft
   * immer bis zum Ende/Fehler/Abbruch durch, kann also KEINE derartige
   * Lücke hinterlassen). Entscheid: dieser Zwischenzustand zählt als
   * `'abgebrochen'` (nicht als neuer fünfter Wert) — «angehalten, mit
   * bereits erledigten Schritten, wartet auf die nächste explizite
   * Nutzeraktion» ist exakt die Semantik, die C-6 den Fortsetzen-/
   * Wiederholen-Knöpfen ohnehin schon für `'abgebrochen'` zuweist.
   */
  get gesamtStatus(): LaufGesamtStatus {
    if (this.zustaende.some((z) => z.status === 'fehler')) return 'fehler';
    if (this.zustaende.every((z) => z.status === 'ok')) return 'fertig';
    if (this.laeuftGerade) return 'laeuft';
    if (this.abgebrochenFlag) return 'abgebrochen';
    if (this.zustaende.some((z) => z.status === 'ok')) return 'abgebrochen';
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
    await this.fuehreSchritteAus(0);
  }

  /**
   * v0.8.8 PA5 «Autopilot-Fortsetzung» (`docs/V088-SPEZ.md` §3 E4, C-6) —
   * führt den Plan ab `index` fort, mit DERSELBEN Macrotask-Yield+Abbruch-
   * Mechanik wie `starte()` (jeder Schritt bleibt unterbrechbar, EIN
   * Undo je Schritt über denselben `fuehreAus`-Callback).
   *
   * ZULÄSSIGKEITS-VERTRAG (E4-Sanktion v0.8.5 gilt fort, V088-SPEZ §6
   * Sanktion 4): NUR zulässig, wenn der Runner GERADE in `gesamtStatus`
   * `'fehler'` oder `'abgebrochen'` steht — also NIEMALS während `starte()`
   * noch läuft und NIEMALS auf einen frischen/bereits fertigen Lauf.
   * Entscheid (dokumentiert statt still zu schlucken): ein Verstoss WIRFT
   * einen `Error` mit dem aktuellen Zustand in der Meldung — kein
   * begründungsloses No-Op, das der Aufrufer stillschweigend übersehen
   * könnte. Die App (`lauf-runtime.ts#fortsetzen`) prüft den Zustand VOR
   * dem Aufruf zusätzlich selbst (No-Op-Schicht für die UI) — dieser Wurf
   * ist die zweite, unabhängige Verteidigungslinie direkt im Runner.
   *
   * Ein vorheriger `abbrechen()`-Aufruf gilt für den fortgesetzten Lauf
   * NICHT mehr automatisch als aktiver Abbruchwunsch (sonst würde die
   * Schleife sofort wieder am ersten Check `abgebrochenFlag` scheitern) —
   * die Flagge wird hier zurückgesetzt. Ein NEUER `abbrechen()`-Aufruf
   * WÄHREND des fortgesetzten Laufs wirkt wieder ganz normal (derselbe
   * Vertrag wie bei `starte()`).
   */
  async fortsetzenAb(index: number): Promise<void> {
    this.pruefeFortsetzbar('fortsetzenAb');
    this.abgebrochenFlag = false;
    await this.fuehreSchritteAus(index);
  }

  /**
   * v0.8.8 PA5 — führt GENAU EINEN Schritt erneut aus (derselbe
   * Zulässigkeits-Vertrag wie `fortsetzenAb`, s.o.: nur aus `'fehler'`/
   * `'abgebrochen'`, sonst Wurf). Zusätzlich muss der Schritt selbst gerade
   * `'fehler'` ODER `'offen'` sein (ein bereits `'ok'`/`'laeuft'`-Schritt
   * erneut auszuführen wäre ein stiller Doppel-Vollzug — Sanktion 4 zieht
   * das ausdrücklich in Betracht: «kein Doppel-Vollzug»). Bei Erfolg wird
   * der Schritt-Zustand auf `ok` gesetzt, der Gesamtzustand ergibt sich
   * unverändert aus `gesamtStatus` (neu ermittelt anhand des aktualisierten
   * `zustaende`-Arrays — keine separate Buchführung nötig).
   *
   * Auch hier derselbe Macrotask-Yield wie `starte()`/`fortsetzenAb` VOR
   * der Ausführung (Konsistenz der Mechanik, V088-SPEZ §3 E4) — bewusst
   * OHNE einen erneuten Abbruch-Check danach: `wiederholeSchritt` ist ein
   * einzelner, expliziter Nutzerklick auf GENAU einen Schritt, keine
   * Schleife, die unterbrochen werden müsste. Ein `abbrechen()`-Aufruf
   * während dieses einzelnen Schritts wirkt nur auf einen SPÄTEREN
   * `fortsetzenAb`, nicht auf den bereits angestossenen Wiederholungs-
   * Versuch (derselbe Vertrag wie ein `starte()`-Schritt, der schon
   * `fuehreAus` betreten hat — der läuft auch ehrlich zu Ende).
   */
  async wiederholeSchritt(index: number): Promise<void> {
    this.pruefeFortsetzbar('wiederholeSchritt');
    const bisherig = this.zustaende[index];
    if (!bisherig || (bisherig.status !== 'fehler' && bisherig.status !== 'offen')) {
      throw new Error(
        `wiederholeSchritt(${index}) ist nur für einen Schritt im Zustand 'fehler' oder 'offen' zulässig ` +
          `(Schritt ${index} steht aktuell auf '${bisherig?.status ?? 'unbekannt'}').`,
      );
    }
    this.laeuftGerade = true;
    try {
      await new Promise<void>((resolve) => setTimeout(resolve, 0));
      const schritt = this.plan.schritte[index]!;
      this.setStatus(index, { status: 'laeuft' });
      try {
        const ergebnis = await this.fuehreAus(schritt.commandId, schritt.params);
        this.setStatus(index, { status: 'ok', ergebnis });
      } catch (err) {
        const meldung = err instanceof Error ? err.message : String(err);
        this.setStatus(index, { status: 'fehler', fehler: meldung });
      }
    } finally {
      this.laeuftGerade = false;
    }
  }

  /** Gemeinsamer Zulässigkeits-Check für `fortsetzenAb`/`wiederholeSchritt`. */
  private pruefeFortsetzbar(methode: 'fortsetzenAb' | 'wiederholeSchritt'): void {
    if (this.laeuftGerade) {
      throw new Error(`${methode}() kann nicht aufgerufen werden, während der Lauf noch läuft.`);
    }
    const status = this.gesamtStatus;
    if (status !== 'fehler' && status !== 'abgebrochen') {
      throw new Error(
        `${methode}() ist nur aus dem Zustand 'fehler' oder 'abgebrochen' zulässig (aktuell: '${status}').`,
      );
    }
  }

  /** Gemeinsame Schrittschleife für `starte()`/`fortsetzenAb()` — identische
   * Yield+Abbruch-Mechanik (C-11), nur der Startindex unterscheidet sich. */
  private async fuehreSchritteAus(vonIndex: number): Promise<void> {
    this.laeuftGerade = true;
    try {
      for (let i = vonIndex; i < this.plan.schritte.length; i++) {
        if (this.abgebrochenFlag) return;
        // C-11-Matrix-Fund (v0.8.6-C): ein Macrotask-Yield VOR jedem Schritt.
        // Ohne ihn lief die Schleife über rein synchrone Kernel-Commands in
        // einem einzigen Task durch — der «Abbrechen»-Knopf war für ECHTE
        // Klicks nie erreichbar (nur der Sync-Trick der Unit-Tests kam je an)
        // und die Schrittliste sprang von offen direkt auf fertig. Mit dem
        // Yield verarbeitet der Browser zwischen den Schritten Eingaben und
        // Renders; der Abbruch-Check danach fängt einen Klick aus genau
        // diesem Fenster.
        await new Promise<void>((resolve) => setTimeout(resolve, 0));
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
