/**
 * v0.8.1 / KI4 Nachtrag, C-42 («LoRA-Export-Pipeline schliessen»,
 * `docs/V081-SPEZ.md` §3 Kandidat 7, `docs/KI-MODELL-GUIDELINE.md` Teil C) —
 * schliesst den Export-Pfad des Lernjournals: bisher endete
 * `LearningJournal.toJsonl()` (`memory.ts:116-118`) OHNE Abnehmer («später der
 * Trainingsdatensatz für die LoRA-Rezepte auf der HomeStation», `memory.ts:5-
 * 6` — ein Versprechen ohne Code dahinter). Dieses Modul liefert den echten
 * Konsumenten: Journal → `toJsonl()` → Validierung/Aufbereitung als
 * Trainingsdatensatz (untaugliche Einträge werden ehrlich mit Begründung
 * aussortiert, nicht stillschweigend verschluckt) → Übergabe an einen
 * `LoraTrainer`.
 *
 * **Bewusste Entscheidung gegen einen Bridge-Endpunkt (Begründung, s.
 * Auftrag «entscheide nach Code-Lage»):** `tools/homestation-bridge/
 * kosmo_bridge/main.py` kennt zwei Muster für Fake-Arbeit — (a) den
 * Job-Lebenszyklus (`POST /jobs`, `_fake_worker_pass()`, async, an ein
 * hochgeladenes 3D-Modell/eine Szene gebunden, `main.py:310-352`) und (b)
 * einen simplen synchronen Fake-Endpunkt wie `/embed` (`main.py:928-942`,
 * `_fake_embed`). Ein `/lora-train`-Endpunkt hätte am ehesten zu (b) gepasst
 * — ABER: nichts in `kosmo-ai`/der App ruft die Bridge heute für irgendeine
 * KI-Aufgabe per HTTP auf (Ollama/Anthropic laufen direkt aus dem Browser,
 * `provider.ts`/`anthropic.ts`); ein Endpunkt ohne EINEN einzigen Aufrufer
 * wäre selbst eine Attrappe (Owner-Entscheid 6) — Code, der nur behauptet,
 * gebraucht zu werden. Die Guideline verlangt für den Stub ausdrücklich nur
 * «eine reine Funktion ODER Schnittstelle mit Fake-Implementierung» — genau
 * das liefert dieses Modul, vollständig containertestbar per Vitest, ohne
 * einen Python-Prozess zu starten. Die `LoraTrainer`-Schnittstelle unten ist
 * bewusst so geschnitten, dass eine SPÄTERE echte HomeStation-Anbindung
 * (z.B. über einen dann wirklich gebrauchten `/lora-train`-Bridge-Endpunkt)
 * sie einfach implementieren kann, ohne dass sich an der Aufbereitung hier
 * etwas ändert.
 *
 * **Deklarierte HomeStation-Grenze:** echtes LoRA-Training (Gewichte
 * aktualisieren, GPU-Speicherbedarf, Trainingszeit) braucht die
 * RTX-5090-HomeStation und ist NICHT container-baubar. Container-baubar und
 * hier real gebaut: Datensatz-Aufbereitung + Validierung + die
 * Trainer-Schnittstelle + ein deterministischer `FakeLoraTrainer`-Stub
 * (Muster «Fake-Bridge»: ehrlich als Fake benannt, deterministisch, kein
 * erfundenes Ergebnis).
 */

import type { Learning, LearningJournal } from './memory';

/** Ein aufbereitetes Trainingsbeispiel — Prompt/Situation + Ziel-Vervollständigung. */
export interface LoraTrainingsBeispiel {
  /** Herkunfts-Zeitstempel (`Learning.ts`) — Rückverfolgung zum Journal-Eintrag. */
  quelleTs: string;
  /** Die Situation, wie sie im Journal festgehalten wurde. */
  prompt: string;
  /** Das Ziel-Verhalten, das trainiert werden soll («BEIBEHALTEN: …» / «VERMEIDE: …»). */
  vervollstaendigung: string;
}

/** Ein Journal-Eintrag, der ehrlich NICHT ins Training übernommen wurde — mit Begründung. */
export interface AussortierterJournalEintrag {
  /** Zeile/Index im Rohmaterial (fürs Debuggen fehlerhafter JSONL-Zeilen). */
  index: number;
  /** Herkunfts-Zeitstempel, falls die Zeile wenigstens so weit lesbar war. */
  quelleTs?: string;
  /** Ehrliche, deutsche Begründung — nie ein stilles Verschlucken. */
  grund: string;
}

export interface LoraDatensatz {
  beispiele: LoraTrainingsBeispiel[];
  aussortiert: AussortierterJournalEintrag[];
}

function istNichtLeer(s: string | undefined): s is string {
  return typeof s === 'string' && s.trim() !== '';
}

/**
 * Ein einzelner geparster Journal-Eintrag → Trainingsbeispiel ODER Absage,
 * je mit Begründung. Dieselbe Kern-Logik wie `LearningJournal.toPromptBlock()`
 * (`memory.ts:98-113`: Notiz ist der Trainings-Kern, sonst der Kontext) — hier
 * aber für JEDEN Eintrag (nicht nur die jüngsten 8) und mit einer expliziten
 * Tauglichkeitsprüfung statt stillschweigender Übernahme.
 */
function bewerteEintrag(
  roh: unknown,
  index: number,
): { ok: true; beispiel: LoraTrainingsBeispiel } | { ok: false; fehler: AussortierterJournalEintrag } {
  if (typeof roh !== 'object' || roh === null) {
    return { ok: false, fehler: { index, grund: 'kein JSON-Objekt' } };
  }
  const e = roh as Partial<Learning>;
  const quelleTs = typeof e.ts === 'string' && e.ts.trim() !== '' ? e.ts : undefined;
  if (e.sentiment !== 'gut' && e.sentiment !== 'schlecht') {
    return {
      ok: false,
      fehler: { index, ...(quelleTs ? { quelleTs } : {}), grund: `sentiment fehlt oder ungültig (erwartet 'gut'|'schlecht', war ${JSON.stringify(e.sentiment)})` },
    };
  }
  if (!istNichtLeer(e.context)) {
    return { ok: false, fehler: { index, ...(quelleTs ? { quelleTs } : {}), grund: 'context ist leer — kein Trainingswert ohne Situationsbeschrieb' } };
  }
  if (!quelleTs) {
    return { ok: false, fehler: { index, grund: 'ts fehlt oder ist leer — kein Rückverfolgen zur Quelle möglich' } };
  }
  const kern = istNichtLeer(e.note) ? e.note.trim() : e.context.trim();
  const vervollstaendigung = e.sentiment === 'schlecht' ? `VERMEIDE: ${kern}` : `BEIBEHALTEN: ${kern}`;
  return {
    ok: true,
    beispiel: {
      quelleTs,
      prompt: `Situation im Büro: ${e.context.trim()}`,
      vervollstaendigung,
    },
  };
}

/**
 * Rohes Lernjournal (aus `LearningJournal.all` — bereits geparste Einträge)
 * → aufbereiteter Trainingsdatensatz + ehrlich aussortierte Untaugliche.
 * Reine Funktion, kein I/O.
 */
export function baueLoraDatensatzAusEintraegen(eintraege: readonly Learning[]): LoraDatensatz {
  const beispiele: LoraTrainingsBeispiel[] = [];
  const aussortiert: AussortierterJournalEintrag[] = [];
  eintraege.forEach((e, index) => {
    const bewertung = bewerteEintrag(e, index);
    if (bewertung.ok) beispiele.push(bewertung.beispiel);
    else aussortiert.push(bewertung.fehler);
  });
  return { beispiele, aussortiert };
}

/**
 * Der wörtliche Export-Pfad aus dem Abnahmekriterium: `journal.toJsonl()`
 * (`memory.ts:116-118`, EINE Zeile pro Eintrag) → Datensatz. Jede Zeile wird
 * einzeln geparst; eine kaputte einzelne Zeile wirft den Rest des Exports
 * NICHT weg (dieselbe Fehlertoleranz wie überall sonst in diesem Paket, z.B.
 * `validateToolCall`/`jsonrepair`-Pfad in `tools.ts`).
 */
export function baueLoraDatensatzAusJsonl(jsonl: string): LoraDatensatz {
  const zeilen = jsonl.split('\n').filter((z) => z.trim() !== '');
  const beispiele: LoraTrainingsBeispiel[] = [];
  const aussortiert: AussortierterJournalEintrag[] = [];
  zeilen.forEach((zeile, index) => {
    let geparst: unknown;
    try {
      geparst = JSON.parse(zeile);
    } catch {
      aussortiert.push({ index, grund: 'Zeile ist kein gültiges JSON' });
      return;
    }
    const bewertung = bewerteEintrag(geparst, index);
    if (bewertung.ok) beispiele.push(bewertung.beispiel);
    else aussortiert.push(bewertung.fehler);
  });
  return { beispiele, aussortiert };
}

/** Ein ehrlicher Trainingsbericht — NIE ein erfundenes Ergebnis (Owner-Entscheid 6). */
export interface LoraTrainBericht {
  trainerId: string;
  /** IMMER `true` beim mitgelieferten `FakeLoraTrainer` — eine echte HomeStation-Implementierung setzt `false`. */
  fake: boolean;
  anzahlBeispiele: number;
  anzahlAussortiert: number;
  /**
   * Deterministisches Kennzeichen des (Fake-)Laufs — z.B. ein Hash über die
   * Beispiele. Explizit KEIN echtes Modellgewicht, keine Datei — nur ein
   * reproduzierbarer Fingerabdruck, damit zwei Läufe mit demselben Datensatz
   * vergleichbar sind.
   */
  laufKennzeichen: string;
  /** Menschenlesbare, ehrliche Einordnung (z.B. Fake-Hinweis, leerer Datensatz). */
  hinweis: string;
}

/**
 * Ein Trainer nimmt einen aufbereiteten Datensatz entgegen und liefert einen
 * Bericht. Die Schnittstelle ist absichtlich so schmal, dass eine echte
 * HomeStation-Anbindung (RTX 5090, tatsächliches LoRA-Fine-Tuning) sie ohne
 * Änderung an der Aufbereitung oben implementieren kann — deklarierte
 * Grenze, hier NICHT gebaut.
 */
export interface LoraTrainer {
  readonly id: string;
  trainiere(datensatz: LoraDatensatz): LoraTrainBericht | Promise<LoraTrainBericht>;
}

/**
 * Simpler, deterministischer Hash (djb2-Variante) — kein kryptografischer
 * Anspruch, nur ein reproduzierbarer Fingerabdruck für den Fake-Bericht.
 * Bewusst ohne externe Abhängigkeit (Node-`crypto` würde im Browser-Bundle
 * einen Polyfill brauchen, den dieses Paket sonst nirgends braucht).
 */
function djb2Hash(text: string): string {
  let h = 5381;
  for (let i = 0; i < text.length; i++) {
    h = (h * 33) ^ text.charCodeAt(i);
  }
  return (h >>> 0).toString(16).padStart(8, '0');
}

/**
 * Fake-Trainer-Stub (Muster «Fake-Bridge», analog `_fake_embed`/`MockProvider`):
 * «trainiert» deterministisch — d.h. es berechnet nur einen reproduzierbaren
 * Fingerabdruck über den Datensatz, verändert NIE ein echtes Modellgewicht
 * und braucht keine GPU/kein Netz. Ehrlich als Fake benannt (`fake: true`,
 * `id` trägt «fake» im Namen) — für Container-Tests der Export-Pipeline,
 * NICHT für echtes Training.
 */
export class FakeLoraTrainer implements LoraTrainer {
  readonly id = 'fake-lora-trainer-stub';

  trainiere(datensatz: LoraDatensatz): LoraTrainBericht {
    const fingerabdruckQuelle = datensatz.beispiele
      .map((b) => `${b.quelleTs}|${b.prompt}|${b.vervollstaendigung}`)
      .join('\n');
    const hinweis =
      datensatz.beispiele.length === 0
        ? 'Fake-Trainer-Stub: kein einziges taugliches Beispiel im Datensatz — kein Lauf durchgeführt.'
        : `Fake-Trainer-Stub (kein echtes Training, keine GPU) — ${datensatz.beispiele.length} Beispiel(e) verarbeitet. Echtes LoRA-Fine-Tuning läuft auf der HomeStation (RTX 5090), deklarierte Grenze.`;
    return {
      trainerId: this.id,
      fake: true,
      anzahlBeispiele: datensatz.beispiele.length,
      anzahlAussortiert: datensatz.aussortiert.length,
      laufKennzeichen: `fake-lora-${djb2Hash(fingerabdruckQuelle)}`,
      hinweis,
    };
  }
}

/**
 * Der geschlossene Export-Pfad in EINEM Aufruf: nimmt ein echtes
 * `LearningJournal` (`memory.ts:58-119`), liest `toJsonl()` — DAS ist der
 * bisher abnehmerlose Export aus dem Abnahmekriterium —, bereitet den
 * Datensatz auf und übergibt ihn an den Trainer (Default: der
 * containertestbare `FakeLoraTrainer`; eine echte HomeStation-Anbindung wird
 * hier später nur als anderes `trainer`-Argument eingesetzt, keine Änderung
 * an dieser Funktion nötig).
 */
export async function exportiereUndTrainiere(
  journal: Pick<LearningJournal, 'toJsonl'>,
  trainer: LoraTrainer = new FakeLoraTrainer(),
): Promise<{ datensatz: LoraDatensatz; bericht: LoraTrainBericht }> {
  const datensatz = baueLoraDatensatzAusJsonl(journal.toJsonl());
  const bericht = await trainer.trainiere(datensatz);
  return { datensatz, bericht };
}
