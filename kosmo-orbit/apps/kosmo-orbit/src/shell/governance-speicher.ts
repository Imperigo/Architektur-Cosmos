/**
 * Governance-Speicher (v0.7.7 Stream B1) — persistente localStorage-Allowlist
 * für die GovernanceGate-Stufe «Für den Job erlauben»
 * (`shell/GovernanceGate.tsx`, Props `onFuerJob`/`fuerJobAktiv`). Reiner
 * Laufzeit-/Einstellungs-Speicher, dasselbe Muster wie die bestehenden
 * `kosmo.*`-Keys (`kosmo.panelOffen` in `App.tsx`, `kosmo.eigencursor` in
 * `state/cursor-zustand.ts`) — läuft NIE durch Yjs/Undo, betrifft nie das
 * Doc. `shell/GovernanceGate.tsx` selbst bleibt eingefroren; die Persistenz
 * gehört bewusst in die beiden Aufrufer (`KosmoPanel.tsx`/`Companion.tsx`),
 * die hier lesen/schreiben.
 *
 * Zwei Aufrufer, zwei «Arten» von Job-Identität:
 *  - `'command'` — `KosmoPanel.tsx`: Schlüssel ist `commandId` eines echten
 *    Kosmo-Vorschlags (`proposal-card`), Auto-Anwenden über denselben
 *    `applyCard`-Weg wie «Einmal erlauben».
 *  - `'vis'`     — `Companion.tsx`: Schlüssel ist `nodeId` eines Vis-Render-
 *    Knotens (`companion-job-*`), Auto-Freigeben über denselben
 *    `freigebenJob`-Weg wie «Einmal erlauben».
 *
 * EHRLICHKEIT — wann eine Erlaubnis endet: weder ein Kosmo-`commandId` noch
 * ein Vis-`nodeId` hat im bestehenden Code ein zuverlässiges «Job fertig»-
 * Ereignis. Ein `commandId` ist ein wiederkehrender Command-TYP, kein
 * Einzelvorgang; ein `nodeId` bekommt laut `Companion.tsx`-Kopfkommentar
 * ausdrücklich «mehrere Render-Läufe nacheinander» — genau DAS ist der Sinn
 * von «für den Job erlauben»: für ALLE künftigen Läufe/Vorschläge dieser
 * Identität, nicht nur den gerade offenen. Diese Datei erfindet darum KEIN
 * automatisches Jobende/Verfallsdatum — eine Erlaubnis bleibt bestehen, auch
 * über einen Reload hinweg, bis sie EXPLIZIT widerrufen wird:
 *  - einzeln über `widerrufeFuerJob` — der bestehende «… · widerrufen»-Knopf
 *    im Gate (`fuerJobAktiv`/`onFuerJob`) bleibt dafür in beiden Aufrufern
 *    IMMER erreichbar, auch wenn der Auto-Pfad gerade läuft.
 *  - gesammelt über `alleWiderrufen` — z.B. für einen künftigen «Governance
 *    zurücksetzen»/Abmelden-Weg; wird von den beiden Aufrufern aktuell nicht
 *    automatisch ausgelöst, weil kein ehrliches Jobende-Ereignis existiert.
 * Ein stillschweigendes Verfallsdatum vorzutäuschen wäre unehrlich, wenn es
 * keines gibt — s. auch `GovernanceGate.tsx`-Kopfkommentar («jede der vier
 * Aktionen muss echte Wirkung haben», «Risk-Level nur, wenn real ableitbar»,
 * dieselbe Ehrlichkeits-Leitplanke).
 */

export type GovernanceArt = 'command' | 'vis';

const SPEICHER_KEY = 'kosmo.governance.fuerJob';

interface GovernanceSpeicherForm {
  command: string[];
  vis: string[];
}

function leererSpeicher(): GovernanceSpeicherForm {
  return { command: [], vis: [] };
}

function istStringArray(x: unknown): x is string[] {
  return Array.isArray(x) && x.every((e) => typeof e === 'string');
}

function ladeSpeicher(): GovernanceSpeicherForm {
  try {
    if (typeof localStorage === 'undefined') return leererSpeicher();
    const raw = localStorage.getItem(SPEICHER_KEY);
    if (!raw) return leererSpeicher();
    const parsed = JSON.parse(raw) as Partial<GovernanceSpeicherForm> | null;
    return {
      command: istStringArray(parsed?.command) ? parsed.command : [],
      vis: istStringArray(parsed?.vis) ? parsed.vis : [],
    };
  } catch {
    // Kaputtes/fremdes JSON in diesem Key — ehrlich leer statt zu werfen
    // (dieselbe defensive Haltung wie `loadSettings()` in `KosmoPanel.tsx`).
    return leererSpeicher();
  }
}

function schreibeSpeicher(speicher: GovernanceSpeicherForm): void {
  try {
    if (typeof localStorage === 'undefined') return;
    localStorage.setItem(SPEICHER_KEY, JSON.stringify(speicher));
  } catch {
    // localStorage kann in seltenen Umgebungen werfen (privates Fenster,
    // Kontingent voll) — die Erlaubnis bleibt dann Laufzeit-only für diese
    // Sitzung (der Aufrufer hält ohnehin einen reaktiven UI-Spiegel), kein
    // harter Fehler für einen reinen Komfort-/Persistenz-Pfad.
  }
}

/** Ist `id` (commandId bei `'command'`, nodeId bei `'vis'`) aktuell «für den
 *  Job erlaubt»? Überlebt einen Reload, endet NIE von selbst — nur über
 *  `widerrufeFuerJob`/`alleWiderrufen` (s. Kopfkommentar «Ehrlichkeit»). */
export function istFuerJobErlaubt(art: GovernanceArt, id: string): boolean {
  return ladeSpeicher()[art].includes(id);
}

/** Alle aktuell erlaubten IDs einer Art — zum einmaligen Einlesen beim Mount
 *  eines reaktiven UI-Spiegels (s. `KosmoPanel.tsx`s `autoErlaubt`,
 *  `Companion.tsx`s `autoFreigabeNodes`). */
export function alleFuerJobErlaubt(art: GovernanceArt): readonly string[] {
  return ladeSpeicher()[art];
}

/** Trägt `id` in die Allowlist ein — wirkungslos, wenn schon erlaubt. */
export function erlaubeFuerJob(art: GovernanceArt, id: string): void {
  const speicher = ladeSpeicher();
  if (speicher[art].includes(id)) return;
  speicher[art] = [...speicher[art], id];
  schreibeSpeicher(speicher);
}

/** Entfernt `id` aus der Allowlist — der reguläre Weg, wie eine Erlaubnis vor
 *  einem gesammelten `alleWiderrufen()` endet (s. Kopfkommentar). */
export function widerrufeFuerJob(art: GovernanceArt, id: string): void {
  const speicher = ladeSpeicher();
  if (!speicher[art].includes(id)) return;
  speicher[art] = speicher[art].filter((x) => x !== id);
  schreibeSpeicher(speicher);
}

/** Räumt die GESAMTE Allowlist (beide Arten) in einem Zug. */
export function alleWiderrufen(): void {
  schreibeSpeicher(leererSpeicher());
}
