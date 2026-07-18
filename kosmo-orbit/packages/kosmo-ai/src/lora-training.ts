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

/**
 * v0.8.2 / P5 «Trainer-Contract + Trainingspaket» (`docs/V082-SPEZ.md` §6.5)
 * — additiver Ausbau NEBEN den obigen KI4-Funktionen (die bleiben
 * byte-gleich, s. `exportiereUndTrainiere` oben). Diese Erweiterung baut das
 * kanonische `kosmo-sft/v1`-Schema (§3.1) und das `lora-train/v1`-Manifest
 * (`@kosmo/contracts`) — beides Container-baubar, kein GPU-Zugriff nötig.
 */

/** Die Adapter-Menge — identisch zur Zielkompetenz-Karte §5.1/§5.2 und zum
 * `LoraTrainAdapterId`-Enum in `@kosmo/contracts` (bewusst als eigenes,
 * lokales Literal geführt — `kosmo-ai` hängt heute an KEINEM anderen Paket
 * ausser `@kosmo/kernel`, ein neuer Cross-Package-Import nur für sechs
 * String-Literale wäre eine unnötige Kopplung; die App-Schicht validiert das
 * Ergebnis später ohnehin gegen den echten `LoraTrainManifest`-Vertrag). */
export type LoraTrainAdapterId =
  | 'kosmo-buero'
  | 'kosmo-zeichner-grundriss'
  | 'kosmo-zeichner-commands'
  | 'kosmo-buero-dpo'
  | 'whisper-ch'
  | 'kosmo-werkplan';

/** Eine Zeile der Adapter-Registry-Logik (§2.4/§5.2) — die ehrliche
 * Statuszeile je Adapter, die `TrainWorkspace` anzeigt. Eigenständig in
 * diesem Paket geführt (P1s `wissen/training/REGISTRY.md` ist ein Doku-
 * Artefakt, kein programmatischer Konsument — dateidisjunkt zu P1). */
export interface LoraAdapterStatus {
  readonly id: LoraTrainAdapterId;
  readonly ziel: string;
  readonly status: 'leer' | 'wächst' | 'reproduzierbar' | 'vollständig' | 'wartet';
  /** Ehrliche, deutsche Statuszeile — nie ein Trainingslauf-Versprechen ohne Datenlage. */
  readonly hinweis: string;
  /**
   * v0.8.4 / PD2 (additiv, `docs/V084-SPEZ.md` D14/C-23) — OPTIONALER
   * Eval-Stand für Adapter mit einer versionierten Eval-Suite unter
   * `wissen/training/eval/<adapter>/`. Fehlt das Feld (alle bisherigen
   * Zeilen), zeigt `TrainWorkspace` weiterhin nur `hinweis` — kein
   * Verhaltensunterschied für Adapter ohne Eval-Suite.
   *
   * **Entscheid Livewert-vs-statisch (dokumentiert, nicht Buildzeit-Import):**
   * `wissen/training/eval/<adapter>/eval-ergebnis.json` liegt unter `wissen/`
   * (Geschwisterverzeichnis von `kosmo-orbit/`, s. Kopfkommentar der
   * `pruefe-eval.mts`-Dateien dort) — AUSSERHALB dieses npm-Workspaces und
   * damit ausserhalb von `rootDir`/dem Vite-App-Bundle. Ein `import … from
   * '../../../wissen/…/eval-ergebnis.json'` würde die Paketgrenze nach
   * `kosmo-orbit/` durchbrechen (fragil für den App-Build/`tsc -b`, und ein
   * neuer, nirgends sonst gebrauchter Repo-Grenzüberschreiter). Statt eines
   * Buildzeit-Imports gilt darum **derselbe manuell gepflegte Spiegel-
   * Konvention wie der `hinweis`-Text zwei Zeilen unterhalb** (dort steht die
   * Zeilenzahl von `commands-v1.jsonl` bereits heute als Literal, kein
   * Datei-Import) — nach jedem `pruefe-eval.mts`-Lauf werden `quote`/`stand`
   * hier von Hand nachgezogen (P10-v0.8.3-Präzedenzfall: ein nicht
   * nachgezogener Spiegel log in der App, s. Kommentar bei der
   * `kosmo-zeichner-commands`-Zeile — dieselbe Wachsamkeit gilt jetzt auch
   * für `eval`). KEIN Fake-Livewert: die Zahlen hier sind exakt die des
   * eingecheckten `eval-ergebnis.json`, nicht neu berechnet.
   */
  readonly eval?: { readonly quote: string; readonly stand: string };
}

/** Die 6 Adapter-Zeilen (Zielkompetenz-Karte §5.1, Registry-Zeilen 1-6 §5.2). */
export const LORA_ADAPTER_REGISTRY: readonly LoraAdapterStatus[] = [
  {
    id: 'kosmo-buero',
    ziel: 'Persona/Bürostil',
    status: 'wächst',
    hinweis: 'Wächst aus dem Lernjournal — heute real befüllbar (Journal-Export unten).',
  },
  {
    id: 'kosmo-zeichner-grundriss',
    ziel: 'Grundriss-Generierung',
    status: 'reproduzierbar',
    hinweis: 'Datensatz liegt im Repo (wissen/training/sft/kosmo-zeichner-grundriss/) — reproduzierbarer Generator.',
  },
  {
    // P10 v0.8.3 (Rundgang-Fund): P4 hat den Datensatz real gefüllt
    // (wissen/training/sft/kosmo-zeichner-commands/commands-v1.jsonl, 372
    // seeded Zeilen, REGISTRY.md «reproduzierbar») — die alte 'leer'-Zeile
    // hier war ein nicht nachgezogener Spiegel und log damit in der App.
    id: 'kosmo-zeichner-commands',
    ziel: 'Software-Bedienung/Tool-Calling',
    status: 'reproduzierbar',
    hinweis: 'Datensatz liegt im Repo (commands-v1.jsonl, 372 seeded Zeilen über alle Commands, P4 v0.8.3) — reproduzierbarer Generator, noch nicht trainiert.',
    // v0.8.4 / PD2: manuell nachgezogener Spiegel des eingecheckten
    // `wissen/training/eval/kosmo-zeichner-commands/eval-ergebnis.json`
    // (Stand des PD2-Laufs) — Begründung fürs manuelle statt Buildzeit-
    // Nachziehen am `eval`-Feld oben.
    eval: {
      quote: '25/25 (100 %)',
      stand: 'PD2 v0.8.4 — ScriptedProvider/ChatSession-Integrationsbeweis (Plumbing/Schema-Drift, kein Modell-Eval)',
    },
  },
  {
    id: 'kosmo-buero-dpo',
    ziel: 'Präferenzen (DPO)',
    status: 'leer',
    hinweis: 'Heute leer — wächst erst mit der Signal-Erfassung (Ablehnung+Korrektur, P3).',
  },
  {
    id: 'whisper-ch',
    ziel: 'CH-Deutsch-STT',
    status: 'wartet',
    hinweis: 'Wartet auf Owner/HomeStation — Audio bleibt Wegwerf-Tmp, kein Datensatz.',
  },
  {
    id: 'kosmo-werkplan',
    ziel: 'Werkplan-Bildstil',
    status: 'wartet',
    hinweis: 'Wartet auf Owner/HomeStation — 4 Owner-Entscheide offen (docs/LORA-KONZEPT.md §6).',
  },
];

/** Eine Chat-Zeile im kanonischen `kosmo-sft/v1`-Beispiel (§3.1). */
export interface KosmoSftMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

/** Provenienz — NIE ein Trainingsfeld, nur Herkunft/Qualität (§3.1). */
export interface KosmoSftMeta {
  id: string;
  adapter: LoraTrainAdapterId;
  quelle: string;
  visibility: 'public' | 'private';
  qualitaet: { checksBestanden: boolean; hinweise: string[] };
}

/** Ein Beispiel im kanonischen `kosmo-sft/v1`-Schema. */
export interface KosmoSftBeispiel {
  messages: KosmoSftMessage[];
  meta: KosmoSftMeta;
}

const KOSMO_BUERO_SYSTEM = 'Du bist Kosmo, die Büro-KI des Architekturbüros Andrin. Antworte im gelernten Bürostil.';

/**
 * Playbook `journal-zu-sft.md` (§1.4) als Code: ein kuratierter Journal-
 * Eintrag (Learning MIT gesetzter Notiz — dieselbe Regel wie
 * `architekturKorpus()`, `apps/kosmo-orbit/src/state/training-korpus.ts:80-
 * 95`) wird zu einem `kosmo-sft/v1`-Beispiel für `kosmo-buero`. Anders als
 * `bewerteEintrag()` oben (die auch Einträge OHNE Notiz zulässt, Kontext als
 * Ersatz) verlangt diese Funktion bewusst die Notiz — «die Notiz ist der
 * Trainings-Kern», nicht der rohe Kontext.
 */
export function learningZuKosmoSftBeispiel(
  l: Learning,
  visibility: 'public' | 'private' = 'private',
): { ok: true; beispiel: KosmoSftBeispiel } | { ok: false; grund: string } {
  if (l.sentiment !== 'gut' && l.sentiment !== 'schlecht') {
    return { ok: false, grund: `sentiment fehlt oder ungültig (erwartet 'gut'|'schlecht', war ${JSON.stringify(l.sentiment)})` };
  }
  if (!istNichtLeer(l.context)) {
    return { ok: false, grund: 'context ist leer — kein Trainingswert ohne Situationsbeschrieb' };
  }
  if (!istNichtLeer(l.ts)) {
    return { ok: false, grund: 'ts fehlt oder ist leer — kein Rückverfolgen zur Quelle möglich' };
  }
  if (!istNichtLeer(l.note)) {
    return {
      ok: false,
      grund: 'Notiz fehlt — nur kuratierte Einträge (mit Notiz) werden zu kosmo-sft/v1-Beispielen (dieselbe Regel wie architekturKorpus()).',
    };
  }
  const anweisung = l.sentiment === 'schlecht' ? `Vermeide künftig: ${l.note.trim()}` : `Beibehalten: ${l.note.trim()}`;
  return {
    ok: true,
    beispiel: {
      messages: [
        { role: 'system', content: KOSMO_BUERO_SYSTEM },
        { role: 'user', content: l.context.trim() },
        { role: 'assistant', content: anweisung },
      ],
      meta: {
        id: `journal-${l.ts}`,
        adapter: 'kosmo-buero',
        quelle: `journal:${l.ts}`,
        visibility,
        qualitaet: { checksBestanden: true, hinweise: [] },
      },
    },
  };
}

/** Batch-Variante über ein ganzes Journal — verworfene Einträge (ohne Notiz
 * o.ä.) gehen nicht verloren, sondern werden ehrlich mit Begründung geführt
 * (dasselbe Muster wie `baueLoraDatensatzAusEintraegen`). */
export function baueKosmoSftAusJournal(
  eintraege: readonly Learning[],
  visibility: 'public' | 'private' = 'private',
): { beispiele: KosmoSftBeispiel[]; verworfen: AussortierterJournalEintrag[] } {
  const beispiele: KosmoSftBeispiel[] = [];
  const verworfen: AussortierterJournalEintrag[] = [];
  eintraege.forEach((e, index) => {
    const r = learningZuKosmoSftBeispiel(e, visibility);
    if (r.ok) beispiele.push(r.beispiel);
    else verworfen.push({ index, ...(istNichtLeer(e.ts) ? { quelleTs: e.ts } : {}), grund: r.grund });
  });
  return { beispiele, verworfen };
}

/**
 * sha256-Hex über Text — Web Crypto (`crypto.subtle.digest`), NICHT Node-
 * `crypto`: läuft identisch im Browser (App-Bundle) wie unter Vitest/Node
 * (≥19, `globalThis.crypto` ist die Web-Crypto-Implementierung), kein
 * Polyfill nötig (dieselbe Bundle-Begründung wie `djb2Hash` oben, aber hier
 * ist ein echter sha256 verlangt — Manifest-Hash-Gate, §6.5).
 */
export async function sha256Hex(text: string): Promise<string> {
  const bytes = new TextEncoder().encode(text);
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

function zaehleJsonlZeilen(inhalt: string): number {
  return inhalt.split('\n').filter((z) => z.trim() !== '').length;
}

/** Eine Rohdatei, bevor sie gehasht wird — Eingabe für `baueLoraTrainDateien`/`baueLoraTrainManifest`. */
export interface LoraTrainDateiEingabe {
  pfad: string;
  inhalt: string;
  format: 'kosmo-sft/v1' | 'kosmo-dpo/v1' | 'kosmo-signal/v1';
  visibility: 'public' | 'private';
}

/** Dieselbe Datei, jetzt mit Hash + Zeilenzahl — Manifest-Zeile ohne den `@kosmo/contracts`-Import. */
export interface LoraTrainDateiMitHash {
  pfad: string;
  sha256: string;
  format: 'kosmo-sft/v1' | 'kosmo-dpo/v1' | 'kosmo-signal/v1';
  visibility: 'public' | 'private';
  anzahlZeilen: number;
}

/** Hasht eine Liste roher Dateien — deterministisch: derselbe Inhalt liefert
 * immer denselben Hash, ein geänderter Inhalt IMMER einen anderen (Manifest-
 * Hash-Gate). */
export async function baueLoraTrainDateien(
  dateien: readonly LoraTrainDateiEingabe[],
): Promise<LoraTrainDateiMitHash[]> {
  return Promise.all(
    dateien.map(async (d) => ({
      pfad: d.pfad,
      sha256: await sha256Hex(d.inhalt),
      format: d.format,
      visibility: d.visibility,
      anzahlZeilen: zaehleJsonlZeilen(d.inhalt),
    })),
  );
}

/** Eingabe für ein volles `lora-train/v1`-Manifest (Feldnamen 1:1 zum Vertrag in `@kosmo/contracts`). */
export interface LoraTrainManifestEingabe {
  adapter: LoraTrainAdapterId;
  dateien: readonly LoraTrainDateiEingabe[];
  /** z.B. "docs/KOSMOTRAIN.md §3". */
  rezept: string;
  evalSuite?: string;
  visibility: 'public' | 'private';
  hinweis?: string;
}

/** Die reine Manifest-Nutzlast (noch nicht zod-geparst — das tut die
 * App-/Test-Schicht gegen `LoraTrainManifest` aus `@kosmo/contracts`, die
 * hier bewusst NICHT importiert wird, s. Kopfkommentar `LoraTrainAdapterId`). */
export interface LoraTrainManifestDaten {
  schema: 'kosmo.lora-train/v1';
  adapter: LoraTrainAdapterId;
  erzeugt_um: string;
  dateien: LoraTrainDateiMitHash[];
  rezept: string;
  evalSuite?: string;
  visibility: 'public' | 'private';
  hinweis?: string;
}

/** Baut ein vollständiges Manifest aus einer Dateiliste — hasht jede Datei
 * und setzt `erzeugt_um` auf jetzt. */
export async function baueLoraTrainManifest(eingabe: LoraTrainManifestEingabe): Promise<LoraTrainManifestDaten> {
  const dateien = await baueLoraTrainDateien(eingabe.dateien);
  return {
    schema: 'kosmo.lora-train/v1',
    adapter: eingabe.adapter,
    erzeugt_um: new Date().toISOString(),
    dateien,
    rezept: eingabe.rezept,
    ...(eingabe.evalSuite !== undefined ? { evalSuite: eingabe.evalSuite } : {}),
    visibility: eingabe.visibility,
    ...(eingabe.hinweis !== undefined ? { hinweis: eingabe.hinweis } : {}),
  };
}

/** Die verallgemeinerte Bericht-Form (1:1 zu `LoraTrainBerichtV1` aus
 * `@kosmo/contracts`) — nie ein anderer Feldname als der Vertrag. */
export interface LoraTrainBerichtGeneralisiert {
  schema: 'kosmo.lora-train-bericht/v1';
  adapter: LoraTrainAdapterId;
  trainerId: string;
  fake: boolean;
  beispiele: number;
  verworfen: number;
  fingerprint: string;
  hinweise: string[];
  erzeugt_um: string;
}

/** Übersetzt einen bestehenden `LoraTrainBericht` (KI4, s. oben) — egal ob
 * vom `FakeLoraTrainer` oder einem künftigen echten Trainer — in die
 * verallgemeinerte, adapterbezogene Form. Reine Feld-Umbenennung/-Ergänzung,
 * KEINE neue Logik, KEIN verändertes Ergebnis. */
export function generalisiereLoraTrainBericht(
  bericht: LoraTrainBericht,
  adapter: LoraTrainAdapterId,
): LoraTrainBerichtGeneralisiert {
  return {
    schema: 'kosmo.lora-train-bericht/v1',
    adapter,
    trainerId: bericht.trainerId,
    fake: bericht.fake,
    beispiele: bericht.anzahlBeispiele,
    verworfen: bericht.anzahlAussortiert,
    fingerprint: bericht.laufKennzeichen,
    hinweise: [bericht.hinweis],
    erzeugt_um: new Date().toISOString(),
  };
}
