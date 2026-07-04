import { vaultTx } from './project-vault';

/**
 * KosmoDev-Auftragsbuch (V1-Finish P3) — «Verbesserungen sprechen»:
 * Der Owner erfasst Verbesserungswünsche überall (Kosmo-Panel, Sprache,
 * KosmoDev-Station), das Buch sammelt sie mit Stations-Kontext, und der
 * Export macht daraus eine git-committbare Fable-Workorder (Markdown) —
 * der Auftrag an den nächsten Worker.
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
