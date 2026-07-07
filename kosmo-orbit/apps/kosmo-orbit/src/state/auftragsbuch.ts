import { bridgeRoutes, DevJob, type DevJobResult, type Workorder } from '@kosmo/contracts';
import { vaultTx } from './project-vault';
import { bridgeFetch, BridgeHttpError } from '../modules/vis/vis-jobs';

/**
 * KosmoDev-Auftragsbuch (V1-Finish P3) — «Verbesserungen sprechen»:
 * Der Owner erfasst Verbesserungswünsche überall (Kosmo-Panel, Sprache,
 * KosmoDev-Station), das Buch sammelt sie mit Stations-Kontext, und der
 * Export macht daraus eine git-committbare Fable-Workorder (Markdown) —
 * der Auftrag an den nächsten Worker.
 *
 * V2-Technik Block 2 / AB3 (Buildplan E4): der Kreis schliesst sich —
 * `uebergebeWorkorder` schickt die offenen Aufträge über dieselbe
 * `bridgeFetch`-Naht wie KosmoVis (vis-jobs.ts, Token + BridgeHttpError
 * gratis) als Bridge-Job `dev-` los; `pruefeDevJobs` holt das Ergebnis und
 * trägt es ehrlich in `ergebnis` am Auftrag ein.
 */

export interface Auftrag {
  id: string;
  ts: string;
  text: string;
  quelle: 'gesprochen' | 'getippt' | 'kosmo';
  /** Station, in der der Auftrag erfasst wurde (Kontext-Pin). */
  station: string;
  /** Optionale Ortsangabe («wo genau»), z.B. aus dem gesprochenen Satz. */
  ort?: string;
  status: 'offen' | 'an-worker' | 'erledigt';
  /** Rückkanal des Dev-Workers (Buildplan E4/E5) — worker ist Pflicht, damit
   * ein `fake-worker` (Simulation) im UI ehrlich als solcher erkennbar bleibt. */
  ergebnis?: { worker: string; commit?: string; notiz?: string };
}

// Aktuelle Station — die App meldet jeden Stationswechsel (Kontext-Pin).
let station = 'Zentrale';
export function setzeAktuelleStation(name: string): void {
  station = name;
}
export function aktuelleStation(): string {
  return station;
}

export async function auftragErfassen(
  text: string,
  quelle: Auftrag['quelle'],
  ort?: string,
): Promise<Auftrag> {
  const auftrag: Auftrag = {
    id: `auftrag-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
    ts: new Date().toISOString(),
    text: text.trim(),
    quelle,
    station,
    ...(ort ? { ort } : {}),
    status: 'offen',
  };
  await vaultTx('auftraege', 'readwrite', (s) => s.put(auftrag));
  return auftrag;
}

export async function listeAuftraege(): Promise<Auftrag[]> {
  const alle = await vaultTx<Auftrag[]>('auftraege', 'readonly', (s) => s.getAll() as IDBRequest<Auftrag[]>);
  return alle.sort((a, b) => b.ts.localeCompare(a.ts));
}

export async function setzeAuftragStatus(id: string, status: Auftrag['status']): Promise<void> {
  const a = await vaultTx<Auftrag | undefined>('auftraege', 'readonly', (s) => s.get(id) as IDBRequest<Auftrag | undefined>);
  if (!a) return;
  await vaultTx('auftraege', 'readwrite', (s) => s.put({ ...a, status }));
}

export async function loescheAuftrag(id: string): Promise<void> {
  await vaultTx('auftraege', 'readwrite', (s) => s.delete(id));
}

/**
 * Fable-Workorder: alle offenen Aufträge als Markdown — der Owner legt die
 * Datei unter docs/auftraege/ ins Repo und gibt sie dem Worker. Erfasste
 * Aufträge wechseln danach auf «an-worker».
 */
export function alsWorkorderMd(auftraege: Auftrag[], datum: string, projekt: string): string {
  const offene = auftraege.filter((a) => a.status === 'offen');
  const zeilen: string[] = [
    `# Verbesserungsaufträge — ${datum}`,
    '',
    `Quelle: KosmoDev-Auftragsbuch (KosmoOrbit) · Projekt «${projekt}» · ${offene.length} offene Aufträge.`,
    'Arbeitsmuster: je Auftrag Feature → Tests → ROADMAP-Eintrag → deutscher Commit.',
    '',
  ];
  const stationen = [...new Set(offene.map((a) => a.station))];
  for (const st of stationen) {
    zeilen.push(`## ${st}`, '');
    for (const a of offene.filter((a) => a.station === st)) {
      const quelle = a.quelle === 'kosmo' ? 'via Kosmo strukturiert' : a.quelle;
      zeilen.push(`- [ ] ${a.text}${a.ort ? ` — _wo: ${a.ort}_` : ''} \`${quelle} · ${a.ts.slice(0, 10)}\``);
    }
    zeilen.push('');
  }
  if (offene.length === 0) zeilen.push('_Keine offenen Aufträge._', '');
  return zeilen.join('\n');
}

/**
 * Baut die Workorder-Hülle (Contract `kosmodev.workorder/v1`, Buildplan E2/E4)
 * aus den offenen Aufträgen — reine Funktion, unit-testbar ohne IndexedDB.
 * Die Client-Wahrheit wandert 1:1 (exakt id/ts/text/quelle/station/ort?),
 * nichts wird umbenannt oder angereichert.
 */
export function bauWorkorder(offene: Auftrag[], projekt: string, erzeugtUm: string): Workorder {
  if (offene.length === 0) throw new Error('Keine offenen Aufträge für eine Workorder');
  return {
    schema: 'kosmodev.workorder/v1',
    projekt,
    erzeugt_um: erzeugtUm,
    auftraege: offene.map((a) => ({
      id: a.id,
      ts: a.ts,
      text: a.text,
      quelle: a.quelle,
      station: a.station,
      ...(a.ort !== undefined ? { ort: a.ort } : {}),
    })),
  };
}

/**
 * Findet im Result eines Dev-Jobs das Ergebnis für einen konkreten Auftrag
 * und formt es auf `Auftrag['ergebnis']` — reine Funktion. `worker` wird
 * unverändert durchgereicht (Buildplan E5: `fake-worker` bleibt `fake-worker`,
 * daran hängt das «Simulation»-Label im UI).
 */
export function ergebnisFuerAuftrag(result: DevJobResult, auftragId: string): Auftrag['ergebnis'] | null {
  const treffer = result.ergebnisse.find((e) => e.auftrag_id === auftragId);
  if (!treffer) return null;
  return {
    worker: result.worker,
    ...(treffer.commit !== undefined ? { commit: treffer.commit } : {}),
    ...(treffer.notiz !== undefined ? { notiz: treffer.notiz } : {}),
  };
}

export async function setzeAuftragErgebnis(id: string, ergebnis: NonNullable<Auftrag['ergebnis']>): Promise<void> {
  const a = await vaultTx<Auftrag | undefined>('auftraege', 'readonly', (s) => s.get(id) as IDBRequest<Auftrag | undefined>);
  if (!a) return;
  await vaultTx('auftraege', 'readwrite', (s) => s.put({ ...a, ergebnis }));
}

/**
 * Alle offenen Aufträge an die HomeStation-Bridge übergeben (Buildplan E4):
 * Workorder bauen, per POST /jobs/dev senden, Antwort gegen den Vertrag
 * prüfen (safeParse statt blindem `as` — HS1-Prinzip aus vis-jobs.ts), danach
 * die übergebenen Aufträge auf «an-worker» setzen und den Job für den Poll
 * merken. Wirft `BridgeHttpError` bei HTTP-Fehlern — der Aufrufer (UI) zeigt
 * dieselben ehrlichen Zustände wie KosmoVis (Offline/CSP/Auth).
 */
export async function uebergebeWorkorder(projekt: string): Promise<DevJob> {
  const alle = await listeAuftraege();
  const offene = alle.filter((a) => a.status === 'offen');
  const workorder = bauWorkorder(offene, projekt, new Date().toISOString());
  const res = await bridgeFetch(bridgeRoutes.jobsDev, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(workorder),
  });
  if (!res.ok) throw new BridgeHttpError(res.status, 'Workorder');
  const geprueft = DevJob.safeParse(await res.json());
  if (!geprueft.success) throw new Error('Bridge-Antwort passt nicht zum Dev-Job-Vertrag');
  const job = geprueft.data;
  await Promise.all(offene.map((a) => setzeAuftragStatus(a.id, 'an-worker')));
  merkeDevJob(job.job_id);
  return job;
}

// Offene Dev-Jobs (Buildplan E4) leben bewusst NICHT im Doc (kein Kernel-
// Bezug, siehe E1) — localStorage reicht für «worauf wartet dieser Browser
// gerade». Defensive JSON-Behandlung: ein kaputter Eintrag darf den Poll nie
// zum Absturz bringen, sondern liefert ehrlich eine leere Liste.
const DEV_JOBS_KEY = 'kosmo.dev.jobs';

export function offeneDevJobs(): string[] {
  if (typeof localStorage === 'undefined') return [];
  try {
    const parsed: unknown = JSON.parse(localStorage.getItem(DEV_JOBS_KEY) ?? '[]');
    return Array.isArray(parsed) ? parsed.filter((x): x is string => typeof x === 'string') : [];
  } catch {
    return [];
  }
}

export function merkeDevJob(id: string): void {
  if (typeof localStorage === 'undefined') return;
  const liste = offeneDevJobs();
  if (!liste.includes(id)) localStorage.setItem(DEV_JOBS_KEY, JSON.stringify([...liste, id]));
}

export function vergissDevJob(id: string): void {
  if (typeof localStorage === 'undefined') return;
  localStorage.setItem(DEV_JOBS_KEY, JSON.stringify(offeneDevJobs().filter((x) => x !== id)));
}

/** Ergebnis EINER Poll-Runde je Job — auch Fehlzustände sind ein ehrlicher
 * Eintrag (Fable-Auflage AB3-1, dieselbe Lehre wie Block-1-KLEIN-8): ein
 * Offline-/Auth-Problem darf die Statuszeile nicht still verschwinden lassen. */
export interface DevJobPruefung {
  jobId: string;
  job?: DevJob;
  angewendet: number;
  /** Warum kein Job-Record da ist: offline (Netz), auth (401/403), vertrag
   * (Antwort passt nicht zum Contract), http (anderer HTTP-Fehler). */
  problem?: 'offline' | 'auth' | 'http' | 'vertrag';
}

/**
 * Pollt jeden gemerkten Dev-Job, wendet fertige Ergebnisse ehrlich an
 * (an-worker → erledigt + `ergebnis`) und räumt den lokalen Merker auf.
 * Buildplan E4/E5: bei `cancelled`/`error` bleiben die an-worker-Aufträge
 * unangetastet stehen (kein vorgetäuschter Fortschritt); nur `cancelled`
 * vergisst den Job — ein `error` bleibt gemerkt, damit die Meldung sichtbar
 * bleibt, bis der Owner reagiert. Ein Fehler bei einem Job (Netz, kaputte
 * Antwort) stoppt die übrigen nicht und wird als `problem` zurückgegeben —
 * der Aufrufer (UI) zeigt ihn, statt ihn zu verschlucken.
 */
export async function pruefeDevJobs(): Promise<DevJobPruefung[]> {
  const treffer: DevJobPruefung[] = [];
  for (const id of offeneDevJobs()) {
    try {
      const res = await bridgeFetch(bridgeRoutes.jobDev(id));
      if (!res.ok) {
        treffer.push({
          jobId: id,
          angewendet: 0,
          problem: res.status === 401 || res.status === 403 ? 'auth' : 'http',
        });
        continue;
      }
      const geprueft = DevJob.safeParse(await res.json());
      if (!geprueft.success) {
        treffer.push({ jobId: id, angewendet: 0, problem: 'vertrag' });
        continue;
      }
      const job = geprueft.data;
      let angewendet = 0;
      if (job.status === 'done' && job.result) {
        for (const e of job.result.ergebnisse) {
          const ergebnis = ergebnisFuerAuftrag(job.result, e.auftrag_id);
          if (!ergebnis) continue;
          await setzeAuftragStatus(e.auftrag_id, 'erledigt');
          await setzeAuftragErgebnis(e.auftrag_id, ergebnis);
          angewendet++;
        }
        vergissDevJob(id);
      } else if (job.status === 'cancelled') {
        vergissDevJob(id);
      }
      treffer.push({ jobId: id, job, angewendet });
    } catch {
      // Netzfehler: ehrlich als offline melden — der nächste Poll fasst nach.
      treffer.push({ jobId: id, angewendet: 0, problem: 'offline' });
    }
  }
  return treffer;
}
