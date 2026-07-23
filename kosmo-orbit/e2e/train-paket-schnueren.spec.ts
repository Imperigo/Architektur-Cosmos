import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { expect, test, type Download } from '@playwright/test';

/**
 * v0.8.2 / P5 «Trainer-Contract + Trainingspaket» (`docs/V082-SPEZ.md` §6.5)
 * — «Trainingspaket schnüren → Manifest-Download mit korrekten Hashes».
 * Deckt den Bau-Auftrag:
 *
 *  - KosmoTrain zeigt die Adapter-Registry (§2.4/§5.2, sechs Zeilen) mit
 *    ehrlicher Statuszeile je Adapter — `whisper-ch`/`kosmo-werkplan` sagen
 *    offen «wartet auf Owner/HomeStation», kein Trainingslauf-Versprechen.
 *  - Mit einem kuratierten (Notiz gesetzte) Journal-Eintrag lässt sich für
 *    `kosmo-buero` ein echtes Trainingspaket schnüren: der Schnüren-Dialog
 *    zeigt Adapter/Rezept/Visibility-Deckel + Datei-Hash-Vorschau.
 *  - **Manifest-Hash-Gate**: die zwei ausgelösten Downloads (Manifest.json +
 *    JSONL, Owner-Entscheid 3 — kein Bridge-Endpunkt) landen wirklich auf
 *    der Platte; der `sha256` im Manifest wird UNABHÄNGIG (Node-`crypto`)
 *    gegen den TATSÄCHLICHEN Inhalt der heruntergeladenen JSONL-Datei
 *    nachgerechnet — kein erfundener Wert.
 *  - Der FakeLoraTrainer-Probelauf bleibt ehrlich als `fake: true`
 *    gekennzeichnet, kein Trainings-Versprechen.
 */

const KURATIERTER_EINTRAG = {
  ts: '2026-07-16T08:00:00.000Z',
  sentiment: 'schlecht',
  context: 'Dach im Grundriss vergessen.',
  note: 'Immer zuerst nach dem Dach fragen, bevor der Grundriss weitergeht.',
};

test('Trainingspaket schnüren → Manifest-Download mit korrekten Hashes (kosmo-buero)', async ({ page }) => {
  await page.goto('/');
  await page.evaluate((eintrag) => {
    localStorage.setItem('kosmo.onboarded', '1');
    localStorage.setItem('kosmo.lernjournal', JSON.stringify([eintrag]));
  }, KURATIERTER_EINTRAG);
  await page.reload();

  // P-F2 (v0.9.2): «Train» ist keine Zentrale-Kachel mehr — jetzt am
  // Kosmo-Orb-Rechtsklick-Menü, `module-train` bleibt dieselbe Testid.
  await page.click('[data-testid="kosmo-symbol"]', { button: 'right' });
  await page.click('[data-testid="module-train"]');
  await expect(page.locator('[data-testid="train-werkzeugleiste"]')).toBeVisible();

  // Adapter-Registry: alle 6 Zeilen der Zielkompetenz-Karte, ehrliche Statuszeilen.
  const registry = page.locator('[data-testid="train-adapter-registry"]');
  await expect(registry).toBeVisible();
  for (const id of [
    'kosmo-buero',
    'kosmo-zeichner-grundriss',
    'kosmo-zeichner-commands',
    'kosmo-buero-dpo',
    'whisper-ch',
    'kosmo-werkplan',
  ]) {
    await expect(page.locator(`[data-testid="train-adapter-${id}"]`)).toBeVisible();
  }
  await expect(page.locator('[data-testid="train-adapter-status-kosmo-buero"]')).toContainText('wächst');
  await expect(page.locator('[data-testid="train-adapter-status-whisper-ch"]')).toContainText(
    'wartet auf Owner/HomeStation',
  );

  await page.screenshot({ path: 'test-results/p5-082-adapter-status.png' });

  // Schnüren: mit dem kuratierten Eintrag ist der Knopf aktiv.
  const schnuerenKnopf = page.locator('[data-testid="train-paket-schnueren"]');
  await expect(schnuerenKnopf).toBeEnabled();
  await schnuerenKnopf.click();

  const dialog = page.locator('[data-testid="train-paket-dialog"]');
  await expect(dialog).toBeVisible();
  await expect(dialog).toContainText('kosmo-buero');
  await expect(dialog).toContainText('docs/KOSMOTRAIN.md §3');
  await expect(dialog).toContainText('private');
  await expect(dialog.locator('[data-testid="train-paket-datei"]')).toContainText('kosmo-buero-sft.jsonl');

  // Element-Screenshot statt Seiten-Screenshot: `.k-dialog-scrim` ist
  // `position: fixed` (aura.css) — ein Seiten-Screenshot dieser tief
  // verschachtelten Station hat sich als unzuverlässig erwiesen (Playwright
  // erfasst dann gelegentlich einen Frame VOR dem Compositing des fixed-
  // Overlays); ein direkter Element-Screenshot auf den Dialog selbst zeigt
  // ihn deterministisch.
  await dialog.screenshot({ path: 'test-results/p5-082-schnueren-dialog.png' });

  // Manifest-Hash-Gate: zwei echte Downloads (Manifest.json + JSONL), der
  // sha256 im Manifest muss gegen den REALEN JSONL-Inhalt stimmen.
  const downloads: Download[] = [];
  page.on('download', (d) => downloads.push(d));
  await page.click('[data-testid="train-paket-download"]');
  await expect.poll(() => downloads.length, { timeout: 15_000 }).toBe(2);

  const manifestDownload = downloads.find((d) => d.suggestedFilename().endsWith('.json'));
  const jsonlDownload = downloads.find((d) => d.suggestedFilename().endsWith('.jsonl'));
  expect(manifestDownload?.suggestedFilename()).toBe('kosmo-buero-manifest.json');
  expect(jsonlDownload?.suggestedFilename()).toBe('kosmo-buero-sft.jsonl');

  const manifestPfad = await manifestDownload!.path();
  const jsonlPfad = await jsonlDownload!.path();
  expect(manifestPfad).not.toBeNull();
  expect(jsonlPfad).not.toBeNull();

  const manifest = JSON.parse(readFileSync(manifestPfad!, 'utf8')) as {
    schema: string;
    adapter: string;
    visibility: string;
    dateien: Array<{ pfad: string; sha256: string; anzahlZeilen: number }>;
  };
  const jsonlInhalt = readFileSync(jsonlPfad!, 'utf8');

  expect(manifest.schema).toBe('kosmo.lora-train/v1');
  expect(manifest.adapter).toBe('kosmo-buero');
  expect(manifest.visibility).toBe('private');
  expect(manifest.dateien).toHaveLength(1);
  expect(manifest.dateien[0]?.pfad).toBe('kosmo-buero-sft.jsonl');
  expect(manifest.dateien[0]?.anzahlZeilen).toBe(1);

  // Der Beweis: unabhängig (Node-crypto) über den REALEN Datei-Inhalt neu
  // gehasht — muss exakt dem Manifest-Eintrag entsprechen.
  const nachgerechneterHash = createHash('sha256').update(jsonlInhalt, 'utf8').digest('hex');
  expect(manifest.dateien[0]?.sha256).toBe(nachgerechneterHash);
  expect(manifest.dateien[0]?.sha256).toMatch(/^[0-9a-f]{64}$/);

  // Der JSONL-Inhalt selbst trägt das kuratierte Beispiel (kosmo-sft/v1-Form).
  const zeile = JSON.parse(jsonlInhalt.trim().split('\n')[0]!) as {
    messages: Array<{ role: string; content: string }>;
    meta: { adapter: string; quelle: string; visibility: string };
  };
  expect(zeile.messages).toHaveLength(3);
  expect(zeile.messages[2]?.content).toContain('Immer zuerst nach dem Dach fragen');
  expect(zeile.meta.adapter).toBe('kosmo-buero');
  expect(zeile.meta.quelle).toBe(`journal:${KURATIERTER_EINTRAG.ts}`);
  expect(zeile.meta.visibility).toBe('private');

  await dialog.locator('[aria-label="Schliessen"]').click();
  await expect(dialog).toBeHidden();

  // Fake-Probelauf bleibt ehrlich als fake gekennzeichnet.
  await page.click('[data-testid="train-fake-probelauf"]');
  const bericht = page.locator('[data-testid="train-fake-bericht"]');
  await expect(bericht).toBeVisible();
  await expect(bericht).toContainText('fake=true');
});
