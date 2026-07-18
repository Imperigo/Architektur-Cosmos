import { expect, test, type Page } from '@playwright/test';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { deflateSync } from 'node:zlib';

/**
 * PC5 (v0.8.4, `docs/V084-SPEZ.md` §8 C-21) — «KosmoData: Bilder für eigene
 * Referenzen + Dossier-Verknüpfung».
 *
 * Deckt Teil 1 (Bilder):
 *  - Upload-Zone existiert NUR im Dossier einer eigenen Referenz (`quelle:
 *    'eigen'`), nie beim 112er-Seed.
 *  - Ehrliche Ablehnung: falscher Dateityp UND zu grosse Datei — beide mit
 *    einer erklärenden Fehlermeldung, kein stiller Fehlschlag, kein Bild
 *    landet im Store.
 *  - Erfolgreicher Upload: sofortige Anzeige im Dossier-HeroBild-Slot
 *    (`RefHeroBild`, `ref-hero-bild-img`) UND als Mini-Thumb in der
 *    Tabellenzeile (derselbe Komponenten-Pfad, `ReferenzTabelle.tsx`).
 *  - Persistenz über einen Reload (IndexedDB-Laufzeit, kein Yjs/Doc-Eintrag).
 *  - Entfernen-Weg (Bestätigungsdialog) fällt ehrlich auf den
 *    Tusche-Platzhalter zurück.
 *  - Seed-Referenzen bleiben unberührt (kein Upload-Weg dort).
 */

async function oeffneReferenzenTab(page: Page): Promise<void> {
  await page.goto('/');
  await page.evaluate(() => localStorage.setItem('kosmo.onboarded', '1'));
  await page.reload();
  await page.click('[data-testid="module-data"]');
  await page.waitForSelector('[data-testid="ref-card"]');
}

function schreibeJson(inhalt: unknown): string {
  const dir = mkdtempSync(join(tmpdir(), 'kosmo-ref-bilder-e2e-'));
  const pfad = join(dir, 'import.json');
  writeFileSync(pfad, JSON.stringify(inhalt, null, 2));
  return pfad;
}

/* Test-PNGs werden zur LAUFZEIT gebaut statt als Base64-Literal eingebettet —
 * Repo-Konvention seit PD1 (`tools/secret-scan.mjs` schlägt auf lange
 * Base64-/Hex-Literale an; Fixtures gehören generiert, nicht eingecheckt).
 * `bauePng` erzeugt ein ECHTES, von Chrome dekodierbares PNG (Signatur +
 * IHDR + IDAT via zlib + IEND, RGB 8-Bit, Filter 0 je Zeile). */

function crc32(daten: Buffer): number {
  let crc = 0xffffffff;
  for (const byte of daten) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit++) {
      crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1));
    }
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function pngChunk(typ: string, daten: Buffer): Buffer {
  const laenge = Buffer.alloc(4);
  laenge.writeUInt32BE(daten.length, 0);
  const inhalt = Buffer.concat([Buffer.from(typ, 'ascii'), daten]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(inhalt), 0);
  return Buffer.concat([laenge, inhalt, crc]);
}

function bauePng(
  breite: number,
  hoehe: number,
  farbe: (x: number, y: number) => [number, number, number],
): Buffer {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(breite, 0);
  ihdr.writeUInt32BE(hoehe, 4);
  ihdr[8] = 8; // Bittiefe
  ihdr[9] = 2; // Farbtyp RGB
  const zeilen: Buffer[] = [];
  for (let y = 0; y < hoehe; y++) {
    const zeile = Buffer.alloc(1 + breite * 3); // Filter-Byte 0 + RGB je Pixel
    for (let x = 0; x < breite; x++) {
      const [r, g, b] = farbe(x, y);
      zeile[1 + x * 3] = r;
      zeile[2 + x * 3] = g;
      zeile[3 + x * 3] = b;
    }
    zeilen.push(zeile);
  }
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    pngChunk('IHDR', ihdr),
    pngChunk('IDAT', deflateSync(Buffer.concat(zeilen))),
    pngChunk('IEND', Buffer.alloc(0)),
  ]);
}

/** 1×1-PNG — für die Ablehnungs-Fälle (Typ/Grösse), wo der Bildinhalt
 *  selbst irrelevant ist. */
const PNG_1X1 = bauePng(1, 1, () => [200, 200, 200]);

/** 48×34-Terrakotta-Farbverlauf — für den erfolgreichen Upload, damit die
 *  Screenshots ein sichtbares Bild statt eines 1×1-Pixels zeigen (Beweiswert
 *  für Menschen, die den Screenshot lesen). */
const PNG_GRADIENT = bauePng(48, 34, (x, y) => [
  Math.min(255, 168 + x + y),
  Math.max(0, 96 + Math.round(x / 2) - y),
  Math.max(0, 72 - Math.round(y / 2)),
]);

async function importiereEigeneVilla(page: Page): Promise<void> {
  const batch = schreibeJson([{ id: 'e2e-bild-villa', title: 'E2E Bild Villa', city: 'Zürich' }]);
  await page.setInputFiles('[data-testid="ref-import-input"]', batch);
  await expect(page.locator('[data-testid="meldung-info"], [data-testid="meldung-erfolg"]').first()).toBeVisible();
}

async function oeffneDossierFuer(page: Page, titel: string): Promise<void> {
  await page.fill('[data-testid="data-search"]', titel);
  await expect(page.locator('[data-testid="ref-card"]')).toHaveCount(1);
  await page.click('[data-testid="ref-card"]');
  await expect(page.locator('[data-testid="ref-detail-dossier"]')).toBeVisible();
}

test('PC5: Bild-Upload für eigene Referenzen — Ablehnung, Erfolg, Tabellen-Thumb, Persistenz, Entfernen', async ({ page }) => {
  await oeffneReferenzenTab(page);
  await importiereEigeneVilla(page);
  await oeffneDossierFuer(page, 'E2E Bild Villa');

  // Upload-Zone existiert nur für eigene Referenzen — sichtbarer Beweis.
  const uploadZone = page.locator('[data-testid="ref-bild-upload-zone"]');
  await expect(uploadZone).toBeVisible();
  await expect(page.locator('[data-testid="ref-bild-upload-button"]')).toContainText('Bild hochladen');

  // Vor jedem Upload: der bestehende Slot zeigt ehrlich «kein Bild hinterlegt»
  // (auf den Dossier-Slot beschränkt — die Tabellenzeile dahinter zeigt den
  // gleichnamigen Platzhalter ebenfalls, da beide `RefHeroBild` verwenden).
  const dossierHero = page.locator('[data-testid="ref-dossier-bild"]');
  await expect(dossierHero.locator('[data-testid="ref-bild-platzhalter"]')).toBeVisible();
  await expect(dossierHero.locator('img')).toHaveCount(0);
  await expect(dossierHero.locator('[data-testid="ref-bild-quelle"]')).toContainText('kein Bild hinterlegt');

  // 1) Falscher Dateityp — ehrliche Fehlermeldung, kein Bild gespeichert.
  await page.setInputFiles('[data-testid="ref-bild-upload-input"]', {
    name: 'falsch.gif',
    mimeType: 'image/gif',
    buffer: PNG_1X1,
  });
  // `.last()`: Fehler-Meldungen stapeln sich (Auto-Dismiss erst nach 8s) —
  // die jeweils NEUESTE ist die für diesen Upload-Versuch relevante.
  const fehlerTyp = page.locator('[data-testid="meldung-fehler"]').last();
  await expect(fehlerTyp).toBeVisible();
  await expect(fehlerTyp).toContainText('image/gif');
  await expect(page.locator('[data-testid="ref-dossier-bild"] img')).toHaveCount(0);

  // 2) Zu grosse Datei (>2 MB) — ehrliche Grössen-Fehlermeldung.
  const zuGross = Buffer.alloc(2 * 1024 * 1024 + 1024, 1);
  await page.setInputFiles('[data-testid="ref-bild-upload-input"]', {
    name: 'riesig.png',
    mimeType: 'image/png',
    buffer: zuGross,
  });
  const fehlerGroesse = page.locator('[data-testid="meldung-fehler"]').last();
  await expect(fehlerGroesse).toBeVisible();
  await expect(fehlerGroesse).toContainText('2 MB');
  await expect(page.locator('[data-testid="ref-dossier-bild"] img')).toHaveCount(0);

  // 3) Gültiger Upload — sofortige Anzeige im Dossier-Slot, kein Reload nötig.
  await page.setInputFiles('[data-testid="ref-bild-upload-input"]', {
    name: 'villa.png',
    mimeType: 'image/png',
    buffer: PNG_GRADIENT,
  });
  // `.last()`: der frühere «importiert»-Erfolgstoast (aus `importiereEigeneVilla`)
  // kann noch sichtbar sein (4s Auto-Dismiss) — die neueste Meldung zählt.
  await expect(page.locator('[data-testid="meldung-erfolg"]').last()).toContainText('Bild für');
  const dossierBild = page.locator('[data-testid="ref-dossier-bild"] img[data-testid="ref-hero-bild-img"]');
  await expect(dossierBild).toBeVisible();
  await expect(page.locator('[data-testid="ref-bild-platzhalter"]')).toHaveCount(0);
  await expect(page.locator('[data-testid="ref-bild-upload-button"]')).toContainText('Bild ersetzen');
  await expect(page.locator('[data-testid="ref-bild-entfernen"]')).toBeVisible();
  await page.screenshot({ path: 'e2e-results/pc5-dossier-eigenes-bild.png' });

  // 4) Mini-Thumb in der Tabelle — dieselbe RefHeroBild-Komponente, ohne
  //    weiteren Upload: die Tabellenzeile zeigt das Bild bereits.
  const zeile = page.locator('[data-testid="ref-card"]');
  await expect(zeile).toHaveCount(1);
  await expect(zeile.locator('img[data-testid="ref-hero-bild-img"]')).toBeVisible();
  await page.screenshot({ path: 'e2e-results/pc5-tabelle-thumb.png' });

  // 5) Persistenz über einen Reload — IndexedDB-Laufzeit, kein Yjs/Doc-Eintrag.
  await page.reload();
  await page.click('[data-testid="module-data"]');
  await page.waitForSelector('[data-testid="ref-card"]');
  await page.fill('[data-testid="data-search"]', 'E2E Bild Villa');
  await expect(page.locator('[data-testid="ref-card"]')).toHaveCount(1);
  await expect(page.locator('[data-testid="ref-card"] img[data-testid="ref-hero-bild-img"]')).toBeVisible();
  await page.click('[data-testid="ref-card"]');
  await expect(page.locator('[data-testid="ref-detail-dossier"] img[data-testid="ref-hero-bild-img"]')).toBeVisible();

  // 6) Entfernen-Weg — Bestätigungsdialog, danach ehrlich zurück auf den
  //    Tusche-Platzhalter, die Referenz selbst bleibt (kein Löschen der Referenz).
  await page.click('[data-testid="ref-bild-entfernen"]');
  await expect(page.locator('[data-testid="bestaetigung"]')).toBeVisible();
  await page.click('[data-testid="bestaetigung-ja"]');
  await expect(page.locator('[data-testid="meldung-info"]')).toBeVisible();
  await expect(dossierHero.locator('img')).toHaveCount(0);
  await expect(dossierHero.locator('[data-testid="ref-bild-platzhalter"]')).toBeVisible();
  await expect(page.locator('[data-testid="ref-bild-entfernen"]')).toHaveCount(0);
  await expect(page.locator('[data-testid="ref-detail-dossier"]')).toBeVisible(); // Referenz selbst bleibt

  await page.screenshot({ path: 'e2e-results/pc5-nach-entfernen.png' });
});

test('PC5: Seed-Referenzen zeigen KEINE Bild-Upload-Zone (Bilder nur für quelle:"eigen")', async ({ page }) => {
  await oeffneReferenzenTab(page);
  await oeffneDossierFuer(page, 'Pantheon');
  await expect(page.locator('[data-testid="ref-eigen-badge"]')).toHaveCount(0);
  await expect(page.locator('[data-testid="ref-bild-upload-zone"]')).toHaveCount(0);
});
