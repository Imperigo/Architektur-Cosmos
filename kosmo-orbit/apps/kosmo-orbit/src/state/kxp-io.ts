import { strToU8, strFromU8, zipSync, unzipSync } from 'fflate';
import {
  type KosmoDoc,
  type JournalEntry,
  type Sheet,
  parseKosmoSafe,
  safeJsonParse,
  sheetToSvg,
  sheetPlancode,
} from '@kosmo/kernel';
import { useProject } from './project-store';
import { baueHerkunft, ermittleEditionId, svgMitHerkunft } from './herkunft';
import { KxpManifestSchema, type KxpManifest } from './kxp-format';

/**
 * `.kxp`-Paket (Zip) — Export aus dem laufenden Projekt / Import mit
 * Validierung (v0.8.1 / P11, `docs/V081-SPEZ.md` §7(a)). Struktur/Härtung
 * gespiegelt von `state/project-io.ts`s `.kosmo`-Weg (Grössendeckel VOR dem
 * Entpacken, reine `{ok,...}`-Parse-Funktionen, nie ein Throw nach aussen).
 *
 * Inhalt: `kxp.manifest.json` (Trust-Manifest, s. `kxp-format.ts`) +
 * `model/model.json` (derselbe geprüfte Doc-Weg wie `.kosmo`) +
 * `memory/journal.jsonl` (optional) + `plans/<Plancode>.svg` je Blatt des
 * Quellprojekts (reale, bereits im Kernel vorhandene `sheetToSvg`-Ableitung —
 * dieselbe Funktion, die `modules/publish/export-sheets.ts` für den echten
 * Set-SVG-Export nutzt; hier nur GELESEN, nicht verändert).
 */

const MAX_PAKET_BYTES = 200 * 1024 * 1024;

export interface KxpPlan {
  name: string;
  svg: string;
}

export type KxpPaketResult =
  | { ok: true; manifest: KxpManifest; doc: KosmoDoc; journal: JournalEntry[]; plaene: KxpPlan[] }
  | { ok: false; fehler: string };

/**
 * Reine, wurf-freie Funktion (Muster `parseKosmoPaket`): Zip-Bytes → geprüftes
 * `{manifest, doc, journal, plaene}` oder ein definierter Fehler. Das Manifest
 * läuft durch `KxpManifestSchema.safeParse` — ein Paket mit kaputtem/fremdem
 * Manifest wird ehrlich abgelehnt statt stillschweigend mit Lücken geladen.
 */
export function parseKxpPaket(bytes: Uint8Array): KxpPaketResult {
  if (bytes.byteLength === 0) return { ok: false, fehler: 'leere Datei' };
  if (bytes.byteLength > MAX_PAKET_BYTES) {
    return { ok: false, fehler: `Paket zu gross (> ${Math.round(MAX_PAKET_BYTES / (1024 * 1024))} MB)` };
  }
  let files: ReturnType<typeof unzipSync>;
  try {
    files = unzipSync(bytes);
  } catch (err) {
    return { ok: false, fehler: `kein gültiges .kxp-Paket (Zip kaputt): ${err instanceof Error ? err.message : String(err)}` };
  }

  const manifestRaw = files['kxp.manifest.json'];
  if (!manifestRaw) return { ok: false, fehler: 'kein kxp.manifest.json im Paket' };
  let manifestText: string;
  try {
    manifestText = strFromU8(manifestRaw);
  } catch (err) {
    return { ok: false, fehler: `kxp.manifest.json nicht lesbar: ${err instanceof Error ? err.message : String(err)}` };
  }
  const manifestRoh = safeJsonParse(manifestText);
  if (!manifestRoh.ok) return { ok: false, fehler: `kxp.manifest.json: ${manifestRoh.fehler}` };
  const manifestGeprueft = KxpManifestSchema.safeParse(manifestRoh.value);
  if (!manifestGeprueft.success) {
    return { ok: false, fehler: `kxp.manifest.json passt nicht zum .kxp-Format: ${manifestGeprueft.error.issues[0]?.message ?? 'ungültige Struktur'}` };
  }
  const manifest = manifestGeprueft.data;

  const modelRaw = files[manifest.contents.model];
  if (!modelRaw) return { ok: false, fehler: `kein ${manifest.contents.model} im Paket` };
  let modelText: string;
  try {
    modelText = strFromU8(modelRaw);
  } catch (err) {
    return { ok: false, fehler: `${manifest.contents.model} nicht lesbar: ${err instanceof Error ? err.message : String(err)}` };
  }
  const modell = parseKosmoSafe(modelText);
  if (!modell.ok) return { ok: false, fehler: `${manifest.contents.model}: ${modell.fehler}` };

  const journal: JournalEntry[] = [];
  if (manifest.contents.journal) {
    const journalRaw = files[manifest.contents.journal];
    if (journalRaw) {
      let journalText: string;
      try {
        journalText = strFromU8(journalRaw);
      } catch (err) {
        return { ok: false, fehler: `${manifest.contents.journal} nicht lesbar: ${err instanceof Error ? err.message : String(err)}` };
      }
      for (const zeile of journalText.split('\n')) {
        if (!zeile) continue;
        const geparst = safeJsonParse(zeile);
        if (!geparst.ok) return { ok: false, fehler: `${manifest.contents.journal}: ${geparst.fehler}` };
        journal.push(geparst.value as JournalEntry);
      }
    }
  }

  const plaene: KxpPlan[] = [];
  for (const name of manifest.contents.plaene) {
    const pfad = `plans/${name}`;
    const raw = files[pfad];
    if (!raw) return { ok: false, fehler: `Plan «${name}» im Manifest angekündigt, aber nicht im Paket` };
    try {
      plaene.push({ name, svg: strFromU8(raw) });
    } catch (err) {
      return { ok: false, fehler: `${pfad} nicht lesbar: ${err instanceof Error ? err.message : String(err)}` };
    }
  }

  return { ok: true, manifest, doc: modell.doc, journal, plaene };
}

export interface KxpExportVorschau {
  projektName: string;
  blaetterAnzahl: number;
  journalAnzahl: number;
}

/** Was ein Export JETZT bündeln würde — für den Export-Dialog, BEVOR ein
 *  Download ausgelöst wird (Owner-Vertrag «der Nutzer sieht, was er
 *  exportiert», Muster `pdfSetDateiname`/Set-Vorschau in `PublishWorkspace`). */
export function kxpExportVorschau(): KxpExportVorschau {
  const { doc, journal } = useProject.getState();
  return {
    projektName: doc.settings.projectName,
    blaetterAnzahl: doc.byKind<Sheet>('sheet').length,
    journalAnzahl: journal.length,
  };
}

export interface PackKxpOptions {
  exportedAt?: string;
}

/** Baut das `.kxp`-Paket aus dem laufenden Projekt (`useProject`). Reine
 *  Ableitung + Zip — kein State-Write. */
export function packKxp(opts: PackKxpOptions = {}): Uint8Array {
  const { doc, journal } = useProject.getState();
  const exportedAt = opts.exportedAt ?? new Date().toISOString();
  const herkunft = baueHerkunft({ json: doc.toJSON(), editionId: ermittleEditionId(), exportedAt });

  const sheets = doc.byKind<Sheet>('sheet').sort((a, b) => a.index - b.index);
  const planDateien: Record<string, Uint8Array> = {};
  const planNamen: string[] = [];
  sheets.forEach((sheet, i) => {
    const stamm = (sheetPlancode(doc, sheet) ?? sheet.name ?? `Blatt-${i + 1}`).replace(/[^a-zA-Z0-9._-]+/g, '_');
    let name = `${stamm}.svg`;
    // Kollisionsschutz bei doppelten Plancodes/Namen im selben Export.
    let n = 2;
    while (planNamen.includes(name)) {
      name = `${stamm}-${n}.svg`;
      n++;
    }
    planNamen.push(name);
    const svg = svgMitHerkunft(sheetToSvg(doc, sheet.id, { projectName: doc.settings.projectName }), herkunft);
    planDateien[`plans/${name}`] = strToU8(svg);
  });

  const manifest: KxpManifest = KxpManifestSchema.parse({
    id: doc.settings.projectName.toLowerCase().replace(/[^a-z0-9]+/g, '-') || 'projekt',
    name: doc.settings.projectName,
    quelle_projekt: { id: doc.settings.projectName, name: doc.settings.projectName },
    exportiert_um: exportedAt,
    contents: {
      model: 'model/model.json',
      journal: 'memory/journal.jsonl',
      plaene: planNamen,
    },
  });

  return zipSync({
    'kxp.manifest.json': strToU8(JSON.stringify(manifest, null, 2)),
    'model/model.json': strToU8(JSON.stringify(doc.toJSON())),
    'memory/journal.jsonl': strToU8(journal.map((j) => JSON.stringify(j)).join('\n')),
    ...planDateien,
  });
}

/** Baut aus einem bereits geladenen `.kxp`-Stand (z.B. nach einem
 *  Freigabe-Übergang im Viewer) erneut ein Zip-Paket — für den «Aktualisiertes
 *  Paket herunterladen»-Weg. Reine Funktion, kein State-Zugriff. */
export function repackKxp(manifest: KxpManifest, doc: KosmoDoc, journal: JournalEntry[], plaene: KxpPlan[]): Uint8Array {
  const planDateien: Record<string, Uint8Array> = {};
  for (const p of plaene) planDateien[`plans/${p.name}`] = strToU8(p.svg);
  return zipSync({
    'kxp.manifest.json': strToU8(JSON.stringify(manifest, null, 2)),
    'model/model.json': strToU8(JSON.stringify(doc.toJSON())),
    'memory/journal.jsonl': strToU8(journal.map((j) => JSON.stringify(j)).join('\n')),
    ...planDateien,
  });
}

function loeseDateiNamen(name: string): string {
  return `${name.replace(/\s+/g, '-') || 'Paket'}.kxp`;
}

function download(bytes: Uint8Array, dateiname: string): void {
  const url = URL.createObjectURL(new Blob([bytes.buffer as ArrayBuffer], { type: 'application/zip' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = dateiname;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}

/** Exportiert das laufende Projekt als `.kxp`-Download. */
export function downloadKxp(): void {
  const bytes = packKxp();
  download(bytes, loeseDateiNamen(useProject.getState().doc.settings.projectName));
}

/** Lädt einen bereits geladenen/aktualisierten `.kxp`-Stand erneut herunter
 *  (z.B. nach einem Freigabe-Übergang) — die einzige Art, wie der Trust-
 *  Verlauf hier lokal «gespeichert» wird: das Paket selbst trägt seinen
 *  Verlauf, es gibt keinen Server, der ihn hält. */
export function downloadKxpStand(manifest: KxpManifest, doc: KosmoDoc, journal: JournalEntry[], plaene: KxpPlan[]): void {
  const bytes = repackKxp(manifest, doc, journal, plaene);
  download(bytes, loeseDateiNamen(manifest.name));
}

/** Liest eine ausgewählte Datei und liefert das Parse-Ergebnis — wirft nie,
 *  DOM-Zugriff (`file.arrayBuffer()`) bleibt die einzige async-Grenze. */
export async function openKxpFile(file: File): Promise<KxpPaketResult> {
  try {
    const bytes = new Uint8Array(await file.arrayBuffer());
    return parseKxpPaket(bytes);
  } catch (err) {
    return { ok: false, fehler: `Datei nicht lesbar: ${err instanceof Error ? err.message : String(err)}` };
  }
}
