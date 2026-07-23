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
 * weiterreicht.
 *
 * v0.8.4 PA5 (E10 §3.1, `docs/V084-SPEZ.md`, C-5 «Status-Erkennung
 * dreiwertig»): zusätzlich `invoke('claude_login_status')` — der NEUE
 * Tauri-Command `claude_login_status` (`src-tauri/src/lib.rs`), reine
 * Beobachtung ohne Login-Popup. Der Rückgabewert liegt in einem mutierbaren
 * `window.__antStatusStore` ab, damit ein Test den Status NACH dem initialen
 * Laden ändern kann (Muster für den «Erneut prüfen»-Knopf: simuliert, dass
 * der Architekt `ant` zwischen zwei Prüfungen installiert/sich anmeldet,
 * ohne die Seite neu zu laden).
 */
async function stubTauriDesktop(
  page: Page,
  fakeToken: string,
  opts: { antStatusVorLogin?: 'fehlt' | 'nicht-eingeloggt' | 'eingeloggt' } = {},
): Promise<void> {
  const antStatus = opts.antStatusVorLogin ?? 'nicht-eingeloggt';
  await page.addInitScript(
    ({ token, antStatus }: { token: string; antStatus: string }) => {
      (window as unknown as { __antStatusStore: { wert: string } }).__antStatusStore = { wert: antStatus };
      (window as unknown as { __TAURI_INTERNALS__: unknown }).__TAURI_INTERNALS__ = {
        invoke: (cmd: string) => {
          if (cmd === 'claude_login') return Promise.resolve(token);
          if (cmd === 'claude_login_status') {
            return Promise.resolve(
              (window as unknown as { __antStatusStore: { wert: string } }).__antStatusStore.wert,
            );
          }
          return Promise.reject(new Error(`Test-Stub kennt den Tauri-Command nicht: ${cmd}`));
        },
      };
    },
    { token: fakeToken, antStatus },
  );
}

/** Setzt den gestubbten ant-Status NACH dem initialen Laden (simuliert einen
 * Zustandswechsel zwischen zwei «Erneut prüfen»-Klicks) — braucht
 * `stubTauriDesktop()` vorher. */
async function setzeAntStatus(page: Page, wert: 'fehlt' | 'nicht-eingeloggt' | 'eingeloggt'): Promise<void> {
  await page.evaluate((w: string) => {
    (window as unknown as { __antStatusStore: { wert: string } }).__antStatusStore.wert = w;
  }, wert);
}

async function oeffneCloudEinstellungen(page: Page): Promise<void> {
  await page.click('[data-testid="module-design"]');
  await page.click('[aria-label="Einstellungen"]');
  await page.click('[data-testid="betriebsart-cloud"]');
  await expect(page.locator('[data-testid="cloud-login-status"]')).toBeVisible();
}

const FAKE_TOKEN = 'fake-oauth-token-e2e-xyz';

test('Desktop-Stub: «Mit Claude-Abo anmelden» setzt das Token, die Anzeige wechselt auf «Claude-Abo (lokale CLI)»', async ({
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

  await expect(page.locator('[data-testid="cloud-login-status"]')).toContainText('Claude-Abo (lokale CLI)');
  const nachLogin = await page.evaluate(() => JSON.parse(localStorage.getItem('kosmo.llm')!));
  expect(nachLogin.anthropicOauthToken).toBe(FAKE_TOKEN);
  expect(nachLogin.cloudAuth).toBe('abo');
});

test('Token-Persistenz über Reload: «Claude-Abo (lokale CLI)» bleibt nach einem vollen Reload bestehen', async ({
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
  await expect(page.locator('[data-testid="cloud-login-status"]')).toContainText('Claude-Abo (lokale CLI)');

  // Voller Reload — kein Test-Hook, keine Wiederholung des Logins. Das Token
  // lebt in `localStorage` (KosmoSettings), nicht im Laufzeit-Speicher.
  await page.reload();
  await oeffneCloudEinstellungen(page);
  await expect(page.locator('[data-testid="cloud-login-status"]')).toContainText('Claude-Abo (lokale CLI)');
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
  await expect(page.locator('[data-testid="cloud-login-status"]')).toContainText('Claude-Abo (lokale CLI)');
  await expect(page.locator('[data-testid="oauth-abmelden"]')).toBeVisible();

  await page.click('[data-testid="oauth-abmelden"]');

  // Die ANZEIGE ist ehrlich zurückgesetzt — kein «Claude-Abo (lokale CLI)» mehr,
  // ohne hinterlegten Schlüssel bleibt «nicht angemeldet».
  await expect(page.locator('[data-testid="cloud-login-status"]')).toContainText('nicht angemeldet');
  await expect(page.locator('[data-testid="cloud-login-status"]')).not.toContainText('Claude-Abo (lokale CLI)');
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
  await expect(page.locator('[data-testid="cloud-login-status"]')).toContainText('Claude-Abo (lokale CLI)');

  // Statt «Abmelden» zu drücken, trägt der Architekt direkt einen neuen
  // API-Schlüssel ein — auch DIESER Weg darf das alte Token nicht liegen
  // lassen (der ehrlich benannte Rest-Befund aus Stream 2A).
  await page.getByLabel('API-Schlüssel (bleibt auf diesem Gerät)').fill('sk-ant-anderer-weg');

  await expect(page.locator('[data-testid="cloud-login-status"]')).toContainText('API-Schlüssel hinterlegt');
  await expect(page.locator('[data-testid="cloud-login-status"]')).not.toContainText('Claude-Abo (lokale CLI)');
  // Der Abmelden-Knopf ist konsequent auch weg — es gibt kein Token mehr,
  // von dem man sich abmelden könnte.
  await expect(page.locator('[data-testid="oauth-abmelden"]')).toHaveCount(0);

  const stand = await page.evaluate(() => JSON.parse(localStorage.getItem('kosmo.llm')!));
  expect(stand.cloudAuth).toBe('schluessel');
  expect(stand.anthropicKey).toBe('sk-ant-anderer-weg');
  // Behoben (Stream 5B): das alte OAuth-Token bleibt NICHT mehr liegen.
  expect(stand.anthropicOauthToken).toBe('');
});

/**
 * v0.8.4 PA5 (E10 §3.1, `docs/V084-SPEZ.md`, C-5 «Status-Erkennung
 * dreiwertig») — der ant-CLI-Status VOR jedem Klick auf «Mit Claude-Abo
 * anmelden» (neuer Tauri-Command `claude_login_status`, gestubbt über
 * `stubTauriDesktop`s `antStatusVorLogin`). Ersetzt den reinen
 * «CLI fehlt ja/nein»-Beweis der Vorversion durch alle drei Zustände +
 * den «Erneut prüfen»-Knopf.
 */
test.describe('ant-CLI-Status (dreiwertig, E10 §3.1)', () => {
  test('«fehlt»: Hinweistext + Installations-Anleitung erscheinen SOFORT, ohne Klick', async ({ page }) => {
    await stubTauriDesktop(page, FAKE_TOKEN, { antStatusVorLogin: 'fehlt' });
    await page.goto('/');
    await page.evaluate(() => {
      localStorage.setItem('kosmo.onboarded', '1');
      localStorage.setItem('kosmo.panelOffen', '1');
    });
    await page.reload();
    await oeffneCloudEinstellungen(page);

    await expect(page.locator('[data-testid="cloud-login-ant-status"]')).toContainText('nicht gefunden');
    await expect(page.locator('[data-testid="cloud-login-anleitung"]')).toBeVisible();
    await expect(page.locator('[data-testid="cloud-login-anleitung"]')).toContainText(
      'npm i -g @anthropic-ai/claude-code',
    );
  });

  test('«nicht-eingeloggt»: Hinweis sagt den Browser-Popup voraus, keine Anleitung', async ({ page }) => {
    await stubTauriDesktop(page, FAKE_TOKEN, { antStatusVorLogin: 'nicht-eingeloggt' });
    await page.goto('/');
    await page.evaluate(() => {
      localStorage.setItem('kosmo.onboarded', '1');
      localStorage.setItem('kosmo.panelOffen', '1');
    });
    await page.reload();
    await oeffneCloudEinstellungen(page);

    await expect(page.locator('[data-testid="cloud-login-ant-status"]')).toContainText('noch nicht angemeldet');
    await expect(page.locator('[data-testid="cloud-login-anleitung"]')).toHaveCount(0);
  });

  test('«eingeloggt»: Hinweis sagt voraus, dass nur noch das Token geholt wird', async ({ page }) => {
    await stubTauriDesktop(page, FAKE_TOKEN, { antStatusVorLogin: 'eingeloggt' });
    await page.goto('/');
    await page.evaluate(() => {
      localStorage.setItem('kosmo.onboarded', '1');
      localStorage.setItem('kosmo.panelOffen', '1');
    });
    await page.reload();
    await oeffneCloudEinstellungen(page);

    await expect(page.locator('[data-testid="cloud-login-ant-status"]')).toContainText('holt das Token');
    await expect(page.locator('[data-testid="cloud-login-anleitung"]')).toHaveCount(0);
  });

  test('«Erneut prüfen» fragt den Status neu ab — die Anzeige wechselt ohne Reload', async ({ page }) => {
    await stubTauriDesktop(page, FAKE_TOKEN, { antStatusVorLogin: 'fehlt' });
    await page.goto('/');
    await page.evaluate(() => {
      localStorage.setItem('kosmo.onboarded', '1');
      localStorage.setItem('kosmo.panelOffen', '1');
    });
    await page.reload();
    await oeffneCloudEinstellungen(page);
    await expect(page.locator('[data-testid="cloud-login-ant-status"]')).toContainText('nicht gefunden');
    await expect(page.locator('[data-testid="cloud-login-anleitung"]')).toBeVisible();

    // Der Architekt installiert `ant` (in diesem Test simuliert, ohne Reload)
    // und klickt «Erneut prüfen» — die Anzeige muss den NEUEN Stand zeigen,
    // nicht den von vor dem Klick.
    await setzeAntStatus(page, 'nicht-eingeloggt');
    await page.click('[data-testid="cloud-login-erneut-pruefen"]');

    await expect(page.locator('[data-testid="cloud-login-ant-status"]')).toContainText('noch nicht angemeldet');
    await expect(page.locator('[data-testid="cloud-login-anleitung"]')).toHaveCount(0);
  });

  test('Ein erfolgreicher Login aktualisiert den ant-Status auf «eingeloggt»', async ({ page }) => {
    await stubTauriDesktop(page, FAKE_TOKEN, { antStatusVorLogin: 'nicht-eingeloggt' });
    await page.goto('/');
    await page.evaluate(() => {
      localStorage.setItem('kosmo.onboarded', '1');
      localStorage.setItem('kosmo.panelOffen', '1');
    });
    await page.reload();
    await oeffneCloudEinstellungen(page);
    await expect(page.locator('[data-testid="cloud-login-ant-status"]')).toContainText('noch nicht angemeldet');

    // Der Stub-Login liefert das Fake-Token; ein echtes `ant auth login`
    // hinterliesse `ant` danach angemeldet — das simulieren wir hier mit.
    await setzeAntStatus(page, 'eingeloggt');
    await page.click('[data-testid="cloud-login-abo"]');

    await expect(page.locator('[data-testid="cloud-login-status"]')).toContainText('Claude-Abo (lokale CLI)');
    await expect(page.locator('[data-testid="cloud-login-ant-status"]')).toContainText('holt das Token');
  });
});
