import { expect, test, type Page } from '@playwright/test';

/**
 * v0.7.1 E1/2A («Blick-Cloud-UI») — Härtetest des «Mit Claude-Abo anmelden»-
 * Flows (`shell/cloud-login.ts`, existiert seit dem Owner-Auftrag
 * Cloud-Login/0.6.x). `e2e/cloud-login.spec.ts` beweist bereits den
 * WEB/PWA-Zweig (kein Tauri → ehrlicher Desktop-Hinweis, kein Login-Knopf).
 * Diese Spec beweist den DESKTOP-Zweig, den Playwright im echten Chromium
 * sonst nie sieht.
 *
 * EHRLICHKEITSGRENZE (bewusst dokumentiert, nicht gefakt):
 * Der echte Login-Weg verlässt den Browser vollständig — `claudeAboAnmeldung()`
 * ruft den Tauri-Command `claude_login` (`src-tauri/src/lib.rs`), der als
 * natives Rust/`std::process::Command` die Anthropic-CLI `ant` aufruft:
 * `ant auth print-credentials` und, falls kein Login aktiv ist, `ant auth
 * login` — LETZTERES öffnet einen ECHTEN System-Browser-Popup beim
 * Anthropic-Konto. Das ist weder ein HTTP-Request (also nicht per
 * `page.route` abfangbar) noch überhaupt im Browser-Prozess, den Playwright
 * steuert — es ist ein Popup ausserhalb der Seite, in einem Prozess, den
 * Tauri erst zur Laufzeit der Desktop-App startet. Playwright hat schlicht
 * keinen Zugriff auf diese Ebene.
 *
 * Was diese Spec darum WIRKLICH testet: die Tauri-IPC-Grenze selbst wird
 * gestubbt (`window.__TAURI_INTERNALS__.invoke`, exakt die Funktion, die
 * `@tauri-apps/api/core`'s `invoke()` unter der Haube aufruft — siehe
 * `node_modules/@tauri-apps/api/core.js`: `invoke(cmd,...) { return
 * window.__TAURI_INTERNALS__.invoke(cmd, args, options); }`). Das ist die
 * ECHTE Bibliothek, kein Mock-Ersatz — nur die IPC-Transportschicht dahinter
 * (die in einem echten Tauri-Fenster zur nativen Runtime führt) wird durch
 * ein Test-Double ersetzt. Damit prüft diese Spec ECHT: `istTauriDesktop()`,
 * `claudeAboAnmeldung()`, die Token-Übernahme in `KosmoSettings`, die
 * Anzeige (`cloud-login-status`) und die Persistenz über `localStorage`/
 * Reload — NICHT geprüft: der reale `claude_login`-Rust-Code, `ant` selbst,
 * der echte Browser-Popup. Das bleibt Owner-Abnahme (Desktop-Build).
 *
 * «Abmelden» (v0.7.1 Stream 5B, Härtung des Befunds aus Stream 2A): bis
 * hierhin hatte die App KEINEN dedizierten Abmelden-Knopf für den Abo-Login,
 * und ein Alt-Token blieb nach dem Wechsel auf den API-Schlüssel-Weg
 * ungenutzt in `localStorage` liegen (`anthropicOauthToken` wurde nie
 * gelöscht). Beide Lücken sind jetzt behoben (`shell/cloud-login.ts`,
 * `mitAbmeldung`/`mitApiSchluessel` — reine, unit-testbare Zustandsfunktionen,
 * `KosmoPanel.tsx` ruft nur noch diese auf):
 *  - ein neuer «Abmelden»-Knopf (`data-testid="oauth-abmelden"`), sichtbar
 *    GENAU DANN, wenn ein Abo-Token vorhanden ist — er löscht NUR das
 *    OAuth-Token (der API-Schlüssel bleibt unangetastet) und setzt
 *    `cloudAuth` ehrlich auf `'schluessel'` zurück;
 *  - ein neuer API-Schlüssel-Eintrag (der bisherige einzige Weg aus dem
 *    Abo-Zustand) löscht ein liegengebliebenes Alt-Token jetzt MIT, statt es
 *    unbemerkt liegen zu lassen.
 * Die letzten beiden Tests unten beweisen genau diese zwei Verhalten.
 */

/** Stubbt die Tauri-IPC-Grenze VOR jeder Navigation (gilt auch über
 * `page.reload()` hinweg, solange dieselbe Page-Instanz läuft) — macht
 * `istTauriDesktop()` wahr und beantwortet `invoke('claude_login')` mit
 * einem Fake-Token, exakt wie die echte `@tauri-apps/api/core`
 * `invoke()`-Implementierung es an `window.__TAURI_INTERNALS__.invoke`
 * weiterreicht. */
async function stubTauriDesktop(page: Page, fakeToken: string): Promise<void> {
  await page.addInitScript((token: string) => {
    (window as unknown as { __TAURI_INTERNALS__: unknown }).__TAURI_INTERNALS__ = {
      invoke: (cmd: string) =>
        cmd === 'claude_login'
          ? Promise.resolve(token)
          : Promise.reject(new Error(`Test-Stub kennt den Tauri-Command nicht: ${cmd}`)),
    };
  }, fakeToken);
}

async function oeffneCloudEinstellungen(page: Page): Promise<void> {
  await page.click('[data-testid="module-design"]');
  await page.click('[aria-label="Einstellungen"]');
  await page.click('[data-testid="betriebsart-cloud"]');
  await expect(page.locator('[data-testid="cloud-login-status"]')).toBeVisible();
}

const FAKE_TOKEN = 'fake-oauth-token-e2e-xyz';

test('Desktop-Stub: «Mit Claude-Abo anmelden» setzt das Token, die Anzeige wechselt auf «angemeldet als Abo»', async ({
  page,
}) => {
  await stubTauriDesktop(page, FAKE_TOKEN);
  await page.goto('/');
  await page.evaluate(() => {
    localStorage.setItem('kosmo.onboarded', '1');
    localStorage.setItem('kosmo.panelOffen', '1');
  });
  await page.reload();
  await oeffneCloudEinstellungen(page);

  // Mit dem Tauri-Stub zeigt sich der echte Desktop-Zweig: der Login-Knopf
  // statt des Web/PWA-Hinweises (Gegenprobe zu `e2e/cloud-login.spec.ts`).
  await expect(page.locator('[data-testid="cloud-login-abo"]')).toBeVisible();
  await expect(page.locator('[data-testid="cloud-login-hinweis"]')).toHaveCount(0);
  await expect(page.locator('[data-testid="cloud-login-status"]')).toContainText('nicht angemeldet');

  await page.click('[data-testid="cloud-login-abo"]');

  await expect(page.locator('[data-testid="cloud-login-status"]')).toContainText('angemeldet als Abo');
  const nachLogin = await page.evaluate(() => JSON.parse(localStorage.getItem('kosmo.llm')!));
  expect(nachLogin.anthropicOauthToken).toBe(FAKE_TOKEN);
  expect(nachLogin.cloudAuth).toBe('abo');
});

test('Token-Persistenz über Reload: «angemeldet als Abo» bleibt nach einem vollen Reload bestehen', async ({
  page,
}) => {
  await stubTauriDesktop(page, FAKE_TOKEN);
  await page.goto('/');
  await page.evaluate(() => {
    localStorage.setItem('kosmo.onboarded', '1');
    localStorage.setItem('kosmo.panelOffen', '1');
  });
  await page.reload();
  await oeffneCloudEinstellungen(page);
  await page.click('[data-testid="cloud-login-abo"]');
  await expect(page.locator('[data-testid="cloud-login-status"]')).toContainText('angemeldet als Abo');

  // Voller Reload — kein Test-Hook, keine Wiederholung des Logins. Das Token
  // lebt in `localStorage` (KosmoSettings), nicht im Laufzeit-Speicher.
  await page.reload();
  await oeffneCloudEinstellungen(page);
  await expect(page.locator('[data-testid="cloud-login-status"]')).toContainText('angemeldet als Abo');
  const nachReload = await page.evaluate(() => JSON.parse(localStorage.getItem('kosmo.llm')!));
  expect(nachReload.anthropicOauthToken).toBe(FAKE_TOKEN);
});

test('«Abmelden»: der Knopf erscheint nur mit aktivem Abo-Token, löscht NUR das Token und setzt die Anzeige ehrlich zurück', async ({
  page,
}) => {
  await stubTauriDesktop(page, FAKE_TOKEN);
  await page.goto('/');
  await page.evaluate(() => {
    localStorage.setItem('kosmo.onboarded', '1');
    localStorage.setItem('kosmo.panelOffen', '1');
  });
  await page.reload();
  await oeffneCloudEinstellungen(page);

  // Vor dem Login: noch kein Abo-Token, also auch kein Abmelden-Knopf.
  await expect(page.locator('[data-testid="oauth-abmelden"]')).toHaveCount(0);

  await page.click('[data-testid="cloud-login-abo"]');
  await expect(page.locator('[data-testid="cloud-login-status"]')).toContainText('angemeldet als Abo');
  await expect(page.locator('[data-testid="oauth-abmelden"]')).toBeVisible();

  await page.click('[data-testid="oauth-abmelden"]');

  // Die ANZEIGE ist ehrlich zurückgesetzt — kein «angemeldet als Abo» mehr,
  // ohne hinterlegten Schlüssel bleibt «nicht angemeldet».
  await expect(page.locator('[data-testid="cloud-login-status"]')).toContainText('nicht angemeldet');
  await expect(page.locator('[data-testid="cloud-login-status"]')).not.toContainText('angemeldet als Abo');
  // Der Knopf selbst verschwindet wieder (kein Token mehr, das er löschen könnte).
  await expect(page.locator('[data-testid="oauth-abmelden"]')).toHaveCount(0);

  const stand = await page.evaluate(() => JSON.parse(localStorage.getItem('kosmo.llm')!));
  expect(stand.cloudAuth).toBe('schluessel');
  expect(stand.anthropicOauthToken).toBe('');
  // Der API-Schlüssel wurde von «Abmelden» nicht angefasst (war/bleibt leer).
  expect(stand.anthropicKey).toBe('');
});

test('Wechsel auf einen API-Schlüssel löscht ein liegengebliebenes Alt-Token mit', async ({ page }) => {
  await stubTauriDesktop(page, FAKE_TOKEN);
  await page.goto('/');
  await page.evaluate(() => {
    localStorage.setItem('kosmo.onboarded', '1');
    localStorage.setItem('kosmo.panelOffen', '1');
  });
  await page.reload();
  await oeffneCloudEinstellungen(page);
  await page.click('[data-testid="cloud-login-abo"]');
  await expect(page.locator('[data-testid="cloud-login-status"]')).toContainText('angemeldet als Abo');

  // Statt «Abmelden» zu drücken, trägt der Architekt direkt einen neuen
  // API-Schlüssel ein — auch DIESER Weg darf das alte Token nicht liegen
  // lassen (der ehrlich benannte Rest-Befund aus Stream 2A).
  await page.getByLabel('API-Schlüssel (bleibt auf diesem Gerät)').fill('sk-ant-anderer-weg');

  await expect(page.locator('[data-testid="cloud-login-status"]')).toContainText('API-Schlüssel hinterlegt');
  await expect(page.locator('[data-testid="cloud-login-status"]')).not.toContainText('angemeldet als Abo');
  // Der Abmelden-Knopf ist konsequent auch weg — es gibt kein Token mehr,
  // von dem man sich abmelden könnte.
  await expect(page.locator('[data-testid="oauth-abmelden"]')).toHaveCount(0);

  const stand = await page.evaluate(() => JSON.parse(localStorage.getItem('kosmo.llm')!));
  expect(stand.cloudAuth).toBe('schluessel');
  expect(stand.anthropicKey).toBe('sk-ant-anderer-weg');
  // Behoben (Stream 5B): das alte OAuth-Token bleibt NICHT mehr liegen.
  expect(stand.anthropicOauthToken).toBe('');
});
