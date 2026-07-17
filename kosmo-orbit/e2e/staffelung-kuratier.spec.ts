import { expect, test } from '@playwright/test';

/**
 * v0.8.2/P6 «Staffelung + Kuratier-Flow» (`docs/V082-SPEZ.md` §6.7,
 * Owner-Entscheid 3 + C-3/C-11) — die zwei zugesagten E2E-Beweise:
 *  - Rollen-Badge sichtbar an einer echten Kosmo-Antwort (automatische
 *    Aufgabenklassen-Klassifikation ohne manuellen Schalter, `staffelung.ts`/
 *    `chat.ts`s additiver `onRolle`-Beobachter).
 *  - Kuratier-Flow bis zum Fake-Ergebnis: Journal sichten → aussortierte
 *    Einträge MIT Grund sehen → `exportiereUndTrainiere` mit dem ehrlichen
 *    `FakeLoraTrainer` (`fake: true` bleibt sichtbar).
 */

async function starteAlsMockKosmo(page: import('@playwright/test').Page) {
  await page.addInitScript(() => {
    localStorage.setItem('kosmo.llm', JSON.stringify({ provider: 'mock' }));
    localStorage.setItem('kosmo.onboarded', '1');
    // Panel-Default ist zu (Symbol zuerst) — dieselbe Öffnung wie
    // `e2e/signal-erfassung.spec.ts`, damit `kosmo-input` direkt sichtbar ist.
    localStorage.setItem('kosmo.panelOffen', '1');
  });
  await page.goto('/');
  await page.click('[data-testid="module-design"]');
}

test.describe('P6 «Staffelung»: automatisches Rollen-Badge an einer Kosmo-Antwort', () => {
  test('ein Wand-Vorschlag (werkzeug-schreibend) trägt das Kosmo-Meister-Badge, ehrlich als Ein-Modell-Betrieb benannt', async ({
    page,
  }) => {
    await starteAlsMockKosmo(page);

    await page.fill('[data-testid="kosmo-input"]', 'Zeichne eine Wand von 0,0 bis 6,0');
    await page.click('[data-testid="kosmo-send"]');

    // Die automatische Klassifikation (KEIN manueller Schalter) ordnet einen
    // einzelnen schreibenden Vorschlag der Klasse `werkzeug-schreibend` zu →
    // Rolle Meister (`staffelung.ts#AUFGABENKLASSE_ROLLE`).
    const badge = page.locator('[data-testid="rollen-badge-meister"]');
    await expect(badge).toBeVisible({ timeout: 15_000 });
    await expect(badge).toContainText('Kosmo-Meister');
    // Die App konfiguriert heute EIN Modell (MockProvider) — kein Rollen-
    // Modell-Karten-UI — das Badge benennt das ehrlich, statt einen
    // Modellwechsel vorzutäuschen, der nicht stattfindet (§6.7 Vorgabe).
    await expect(badge).toContainText('Ein-Modell-Betrieb');

    // Ins Bild scrollen (die Bubble-Liste ist ein eigener Scroll-Container,
    // `kp-verlauf` — ein reiner Seiten-Screenshot ohne diesen Schritt zeigt
    // sonst nur den noch nicht gescrollten Anfang des Gesprächs).
    await badge.scrollIntoViewIfNeeded();
    await page.screenshot({ path: 'test-results/p6-082-rollen-badge.png' });

    // Diff-Karte ist unabhängig vom Badge weiterhin da (additiv, keine
    // bestehende testid/aria angetastet).
    await expect(page.locator('[data-testid="apply-proposal"]')).toBeVisible();
  });

  test('eine gewöhnliche Frage ohne Tool-Aufruf trägt das Kosmo-Leiter-Badge (chat-standard)', async ({ page }) => {
    await starteAlsMockKosmo(page);

    await page.fill('[data-testid="kosmo-input"]', 'Wie ist das Wetter heute?');
    await page.click('[data-testid="kosmo-send"]');

    await expect(page.locator('[data-testid="rollen-badge-leiter"]')).toBeVisible({ timeout: 15_000 });
    await expect(page.locator('[data-testid="rollen-badge-leiter"]')).toContainText('Kosmo-Leiter');
  });
});

test.describe('P6 «Kuratier-Flow»: Journal sichten → aussortieren MIT Grund → Fake-Training', () => {
  test('aussortierte Journal-Einträge zeigen ihren Grund; Fake-Probelauf bleibt ehrlich fake:true', async ({
    page,
  }) => {
    await page.addInitScript(() => {
      localStorage.setItem('kosmo.onboarded', '1');
      localStorage.setItem('kosmo.starterGuide.done', '1');
      // Drei Einträge, bewusst gemischt (Muster `e2e/module.spec.ts` «Dossier
      // + KosmoTrain»): #1 ohne Notiz (verworfen NUR aus der kuratierten
      // kosmo-sft-Sicht, die eine Notiz verlangt), #2 ohne Zeitstempel
      // (aussortiert in BEIDEN Sichten — auch der rohe Export braucht `ts`
      // fürs Rückverfolgen), #3 vollständig kuratiert (fliesst überall ein).
      localStorage.setItem(
        'kosmo.lernjournal',
        JSON.stringify([
          { ts: '2026-07-01T08:00:00.000Z', sentiment: 'schlecht', context: 'Wand ohne Aufbau vorgeschlagen' },
          { ts: '', sentiment: 'gut', context: 'Ohne Zeitstempel erfasst' },
          {
            ts: '2026-07-02T09:00:00.000Z',
            sentiment: 'gut',
            context: 'Fenster korrekt platziert',
            note: 'Immer Fensterbank ab 900mm.',
          },
        ]),
      );
    });
    await page.goto('/');
    await page.evaluate(() => window.__kosmo.open('train'));

    await expect(page.locator('[data-testid="train-stand"]')).toContainText('3 Journal-Einträge');

    // 1) Sichten: die Kuratier-Flow-Fläche zeigt die aus der kuratierten
    // kosmo-sft-Sicht aussortierten Einträge MIT Grund (Journal → Kuration).
    const verworfen = page.locator('[data-testid="train-kuratier-verworfen-eintrag"]');
    await expect(verworfen).toHaveCount(2);
    await expect(page.locator('[data-testid="train-kuratier-verworfen"]')).toContainText('Notiz fehlt');
    await expect(page.locator('[data-testid="train-kuratier-verworfen"]')).toContainText(
      'ts fehlt oder ist leer',
    );

    await page.locator('[data-testid="train-kuratier-verworfen"]').scrollIntoViewIfNeeded();
    await page.screenshot({ path: 'test-results/p6-082-kuratier-verworfen.png' });

    // 2) «Trainingspaket schnüren» ist NICHT gesperrt — der eine vollständig
    // kuratierte Eintrag (#3) reicht für ein `kosmo-sft/v1`-Beispiel.
    await expect(page.locator('[data-testid="train-paket-schnueren"]')).toBeEnabled();

    // 3) exportiereUndTrainiere über den Fake-Probelauf-Knopf — der ehrliche
    // `FakeLoraTrainer` bleibt `fake: true` SICHTBAR, kein echtes Training
    // vorgetäuscht; die HomeStation-Grenze bleibt im Rezept-Text unten klar.
    await page.click('[data-testid="train-fake-probelauf"]');
    const bericht = page.locator('[data-testid="train-fake-bericht"]');
    await expect(bericht).toBeVisible();
    await expect(bericht).toContainText('fake=true');

    // Derselbe Lauf zeigt zusätzlich die Aussortierungs-Gründe aus dem
    // rohen Journal-Export (bewerteEintrag-Pfad) — hier NUR der Eintrag ohne
    // Zeitstempel (#2), weil dieser Pfad Notizen NICHT verlangt.
    await expect(page.locator('[data-testid="train-kuratier-aussortiert-eintrag"]')).toHaveCount(1);
    await expect(page.locator('[data-testid="train-kuratier-aussortiert"]')).toContainText('ts fehlt oder ist leer');

    await bericht.scrollIntoViewIfNeeded();
    await page.screenshot({ path: 'test-results/p6-082-fake-training.png' });

    // Ehrlichkeit vor Politur: die HomeStation-Grenze bleibt im Rezept-Text
    // klar benannt (bestehende, unveränderte Zeile aus P5).
    await expect(page.locator('.train-zyklus-fuss')).toContainText('brauchen die 5090');
  });
});
