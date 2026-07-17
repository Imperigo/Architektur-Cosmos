import type { LearningVisibility } from '@kosmo/ai';
import { vaultTx } from './project-vault';

/**
 * Vorschlags-Log (v0.8.2/P3 «Signal-Erfassung», `docs/V082-SPEZ.md` §4.1/
 * §4.5, neu) — hält fest, was heute beim Karten-Abbau spurlos verloren geht:
 * jeden Diff-Karten-Ausgang (§4.1/C-18/C-19), jede Parameter-Reparatur
 * (§4.2/C-21) und jedes Auto-Pack-Layout-Signal (§4.5/C-30). Die Einträge
 * liegen bereits im `kosmo-signal/v1`-Schema (§3.2) am Speicher — der Export
 * (§4.4/§5, `KosmoPanel.tsx`) muss sie beim Schreiben nur noch filtern und
 * zusammenführen, nicht mehr konvertieren.
 *
 * Persistenz-Muster wie `state/journal-store.ts` (`journalStore()`):
 * localStorage ist die synchrone Quelle der Wahrheit, IndexedDB
 * (`project-vault.ts` v6, Store `vorschlagslog`) ein fire-and-forget-Spiegel
 * für Speicherplatz-Druck. Bewusst UNGEKAPPT (kein `.slice(...)`, anders als
 * `journalStore()`/`memory.ts`): dieser Log bedient kein Prompt-Fenster,
 * jeder Eintrag ist ein Trainingssignal, das nicht still verworfen werden
 * darf (§4.1).
 *
 * Default-Sichtbarkeit bewusst `'public'` (anders als `Learning.visibility`,
 * das `'private'` defaultet): ein Diff-Karten-Ausgang/eine Layout-Präferenz
 * ist ein Tool-Nutzungs-/Struktursignal (commandId+params, Rastermasse) ohne
 * persönlichen Büro-Kontext — vergleichbar den bereits git-erfassten
 * `kosmo-zeichner-*`-Adaptern, nicht dem privaten Lernjournal. Ein Aufrufer
 * kann trotzdem explizit `'private'` übergeben (z.B. künftig eine UI-
 * Sichtbarkeitsumschaltung, analog `LearningJournal.setzeVisibility`).
 */

export type ProposalAusgang = 'angenommen' | 'abgelehnt' | 'fehlgeschlagen';

export interface ProposalKorrekturSchritt {
  commandId: string;
  params: unknown;
  summary: string;
}

export interface ProposalPayload {
  commandId: string;
  params: unknown;
  summary: string;
  ausgang: ProposalAusgang;
  grund?: string;
  /** DPO-Rohpaar-Kern (§4.1/C-19): die nächste MANUELLE Aktion nach einer
   * Ablehnung, verknüpft über `verknuepfeNaechsteKorrektur()`. */
  folgeKorrektur?: ProposalKorrekturSchritt;
}

export interface ReparaturPayload {
  /** Die rohen (unreparierten) Modell-Argumente. */
  vorher: unknown;
  nachher: { commandId: string; params: unknown; summary: string };
}

export interface LayoutPayload {
  sheetId: string;
  /** Heuristik-Default (REIHENFOLGE_STANDARD + BLATT_PACK_DEFAULTS). */
  vorschlag: unknown;
  /** Tatsächlich angewendeter Entwurf. */
  endzustand: unknown;
  /** Identisch zu `endzustand`, redundant im Payload für Klarheit (§4.5). */
  optionen: unknown;
}

export type SignalArt = 'proposal' | 'reparatur' | 'layout';
export type SignalPayload = ProposalPayload | ReparaturPayload | LayoutPayload;

/** `kosmo-signal/v1` (§3.2) — die Einträge liegen bereits in dieser Form am Speicher. */
export interface SignalEintrag<A extends SignalArt = SignalArt, P extends SignalPayload = SignalPayload> {
  art: A;
  ts: string;
  visibility: LearningVisibility;
  payload: P;
  meta: { quelle: string; sessionId?: string };
}

export interface ProposalLogStore {
  load(): SignalEintrag[];
  save(entries: SignalEintrag[]): void;
}

const KEY = 'kosmo.vorschlagslog';

export function proposalLogStore(): ProposalLogStore {
  return {
    load() {
      try {
        return JSON.parse(localStorage.getItem(KEY) ?? '[]') as SignalEintrag[];
      } catch {
        return [];
      }
    },
    save(entries) {
      localStorage.setItem(KEY, JSON.stringify(entries));
      // Fire-and-forget IndexedDB-Spiegel, Muster `journalStore()`: NIE einen
      // kleineren Stand über einen grösseren schreiben (Merge über `ts`, das
      // hier — anders als beim Journal — bereits eindeutig ist, da jeder
      // Eintrag `new Date().toISOString()` beim Erfassen bekommt).
      void (async () => {
        const alt = await vaultTx<{ id: string; entries: SignalEintrag[] } | undefined>(
          'vorschlagslog',
          'readonly',
          (s) => s.get('log') as IDBRequest<{ id: string; entries: SignalEintrag[] } | undefined>,
        );
        const bekannt = new Set(entries.map((e) => e.ts));
        const nurAlt = (alt?.entries ?? []).filter((e) => !bekannt.has(e.ts));
        await vaultTx('vorschlagslog', 'readwrite', (s) =>
          s.put({ id: 'log', entries: [...nurAlt, ...entries] }),
        );
      })().catch(() => undefined);
    },
  };
}

export class ProposalLog {
  private entries: SignalEintrag[];
  /** Array-Index des letzten `abgelehnt`-Eintrags, der noch auf eine
   * Folge-Korrektur wartet — `null`, wenn keiner offen ist. Index statt
   * `ts`, weil `ts` nur Millisekunden-Auflösung hat (Kollisionsrisiko bei
   * schnellen Doppel-Aktionen, s. Kommentar bei `protokolliere()`). */
  private wartendIdx: number | null = null;

  constructor(private store: ProposalLogStore) {
    this.entries = store.load();
  }

  reload(): void {
    this.entries = this.store.load();
    // `wartendIdx` zeigt in die ALTE `entries`-Referenz — nach einem Reload
    // (z.B. Multi-Tab) ehrlich verwerfen statt möglicherweise die falsche
    // Zeile zu treffen; ein noch offenes Warten geht dabei verloren, ist
    // aber sicherer als eine falsche Verknüpfung.
    this.wartendIdx = null;
  }

  get all(): readonly SignalEintrag[] {
    return this.entries;
  }

  private protokolliere<A extends SignalArt, P extends SignalPayload>(
    art: A,
    payload: P,
    opts?: { visibility?: LearningVisibility; sessionId?: string },
  ): number {
    const ts = new Date().toISOString();
    const eintrag: SignalEintrag<A, P> = {
      art,
      ts,
      visibility: opts?.visibility ?? 'public',
      payload,
      meta: { quelle: 'proposal-log.ts', ...(opts?.sessionId !== undefined ? { sessionId: opts.sessionId } : {}) },
    };
    this.entries = [...this.entries, eintrag as SignalEintrag];
    this.store.save(this.entries);
    // Der Array-INDEX statt `ts` ist der interne Schlüssel fürs Warten
    // (unten): `ts` hat nur Millisekunden-Auflösung — zwei Ablehnungen in
    // derselben Millisekunde (schneller Klick-Test/reale Doppelklicks)
    // würden sonst kollidieren und BEIDE Zeilen träfen (Bug, per Test
    // gefunden). Der Index ist eindeutig, weil `entries` nur je EINEN neuen
    // Eintrag ans Ende anhängt, nie umsortiert.
    return this.entries.length - 1;
  }

  /** §4.1 (C-18/C-19) — ein Diff-Karten-Ausgang. Eine `abgelehnt`-Zeile
   * öffnet automatisch das Warten auf die nächste manuelle Korrektur. */
  protokolliereProposal(payload: ProposalPayload, opts?: { visibility?: LearningVisibility }): void {
    const idx = this.protokolliere('proposal', payload, opts);
    this.wartendIdx = payload.ausgang === 'abgelehnt' ? idx : this.wartendIdx;
  }

  /** §4.2 (C-21) — chat.ts' `onReparatur`-Hook landet hier. */
  protokolliereReparatur(payload: ReparaturPayload, opts?: { visibility?: LearningVisibility }): void {
    this.protokolliere('reparatur', payload, opts);
  }

  /** §4.5 (C-30) — Auto-Pack-Anwenden-Weg. */
  protokolliereLayout(payload: LayoutPayload, opts?: { visibility?: LearningVisibility }): void {
    this.protokolliere('layout', payload, opts);
  }

  /**
   * DPO-Rohpaar-Kern (§4.1/C-19): verknüpft die NÄCHSTE manuelle Aktion nach
   * einer offenen Ablehnung als `folgeKorrektur` — einmalig (die erste
   * manuelle Aktion danach schliesst das Warten, unabhängig davon, ob sie
   * inhaltlich mit der Ablehnung zusammenhängt; das ist der pragmatische,
   * ehrliche Vertrag aus §4.1: „Ablehnung → nächste manuelle Aktion“, kein
   * Versuch, Kausalität zu erraten).
   */
  verknuepfeNaechsteKorrektur(aktion: ProposalKorrekturSchritt): void {
    if (this.wartendIdx === null) return;
    const idx = this.wartendIdx;
    this.wartendIdx = null;
    const ziel = this.entries[idx];
    if (!ziel || ziel.art !== 'proposal') return;
    this.entries = this.entries.map((e, i) =>
      i === idx ? { ...e, payload: { ...(e.payload as ProposalPayload), folgeKorrektur: aktion } } : e,
    );
    this.store.save(this.entries);
  }

  /**
   * §4.4/§5 — `kosmo-signal/v1`-JSONL, visibility-gefiltert. Default
   * `'public'` (Owner-Entscheid 1): nur das darf je ein Repo verlassen.
   */
  toKosmoSignalJsonl(visibility: LearningVisibility | 'alle' = 'public'): string {
    return this.entries
      .filter((e) => visibility === 'alle' || e.visibility === visibility)
      .map((e) => JSON.stringify(e))
      .join('\n');
  }
}

/** Modul-Singleton (Muster `journal` in `KosmoPanel.tsx`) — von
 * `KosmoPanel.tsx` UND `AutoPackPanel.tsx` gemeinsam genutzt. */
export const proposalLog = new ProposalLog(proposalLogStore());
