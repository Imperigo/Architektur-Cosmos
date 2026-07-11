// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { AbspielSchritt } from '../src/state/abspiel-anschluss';

/**
 * Abspiel-Ebene (v0.7.2 §7 «Kosmo zeichnet sichtbar», Stream W3-E) —
 * `state/abspiel-ebene.ts`: Registrierung am Anschluss (über
 * `meldeOverlayAn`), alle Abbruch-Pfade (webdriver / reduced-motion /
 * Einstellung `kosmo.abspielen` / kein Overlay), Pause/Stopp, die
 * Sicherheits-Wache und der MEHRSPURIGE API-Formfaktor (Schwarm 0.7.3 —
 * Stufe 1 nutzt eine Spur, die API trägt N).
 *
 * Muster `sounds.test.ts`: `vi.resetModules()` + dynamischer Import je Test,
 * damit die Modul-Singletons (Anschluss-Registrierung, Overlay-Zähler,
 * zustand-Store) jedes Mal frisch entstehen.
 */

function schritt(teil?: Partial<AbspielSchritt>): AbspielSchritt {
  return {
    commandId: 'design.wandZeichnen',
    params: { a: { x: 0, y: 0 }, b: { x: 4000, y: 0 } },
    summary: 'Wand 4,00 m',
    vorschau: null,
    ...teil,
  };
}

/** navigator.webdriver ist read-only — per defineProperty übersteuern. */
function setzeWebdriver(v: boolean | undefined): void {
  Object.defineProperty(window.navigator, 'webdriver', { value: v, configurable: true });
}

/** matchMedia fehlt in jsdom — minimaler, steuerbarer Ersatz. */
function setzeReducedMotion(matches: boolean): void {
  Object.defineProperty(window, 'matchMedia', {
    configurable: true,
    writable: true,
    value: (query: string) => ({
      matches: query.includes('prefers-reduced-motion') ? matches : false,
      media: query,
      addEventListener: () => undefined,
      removeEventListener: () => undefined,
    }),
  });
}

async function ladeEbene() {
  const anschluss = await import('../src/state/abspiel-anschluss');
  const ebene = await import('../src/state/abspiel-ebene');
  return { anschluss, ebene };
}

beforeEach(() => {
  localStorage.clear();
  vi.resetModules();
  setzeWebdriver(undefined);
  setzeReducedMotion(false);
});

afterEach(() => {
  vi.useRealTimers();
  delete (window as unknown as Record<string, unknown>)['matchMedia'];
  setzeWebdriver(undefined);
});

describe('abspielenAktiv — Abbruch-Pfade (Spec §7, dokumentierter Testpfad)', () => {
  it('ist AN per Default (keine Einstellung, kein webdriver, keine reduced-motion)', async () => {
    const { ebene } = await ladeEbene();
    expect(ebene.abspielenAktiv()).toBe(true);
  });

  it('Einstellung kosmo.abspielen="0" schaltet ab (Default bleibt AN — W4-H baut nur den Schalter)', async () => {
    const { ebene } = await ladeEbene();
    localStorage.setItem('kosmo.abspielen', '0');
    expect(ebene.abspielenAktiv()).toBe(false);
    localStorage.removeItem('kosmo.abspielen');
    expect(ebene.abspielenAktiv()).toBe(true);
  });

  it('navigator.webdriver schaltet ab — ausser der Test-Hook "erzwingen" hebt genau das auf', async () => {
    const { ebene } = await ladeEbene();
    setzeWebdriver(true);
    expect(ebene.abspielenAktiv()).toBe(false);
    localStorage.setItem('kosmo.abspielen', 'erzwingen');
    expect(ebene.abspielenAktiv()).toBe(true);
  });

  it('prefers-reduced-motion schaltet ab — und gewinnt auch gegen "erzwingen"', async () => {
    const { ebene } = await ladeEbene();
    setzeReducedMotion(true);
    expect(ebene.abspielenAktiv()).toBe(false);
    localStorage.setItem('kosmo.abspielen', 'erzwingen');
    expect(ebene.abspielenAktiv()).toBe(false);
  });

  it('fehlendes matchMedia (alte Umgebung) gilt als "keine reduced-motion" — kein Abschalten', async () => {
    const { ebene } = await ladeEbene();
    delete (window as unknown as Record<string, unknown>)['matchMedia'];
    expect(ebene.abspielenAktiv()).toBe(true);
  });
});

describe('Registrierung am Anschluss (meldeOverlayAn)', () => {
  it('ohne gemountetes Overlay bleibt abspielVorspiel ein No-op (Direkt-Apply)', async () => {
    const { anschluss } = await ladeEbene();
    expect(anschluss.abspielVorspiel([schritt()])).toBeUndefined();
  });

  it('mit Overlay liefert abspielVorspiel ein Promise und legt genau EINE Spur an', async () => {
    const { anschluss, ebene } = await ladeEbene();
    const abmelden = ebene.meldeOverlayAn();
    const vorspiel = anschluss.abspielVorspiel([schritt()]);
    expect(vorspiel).toBeInstanceOf(Promise);
    expect(ebene.useAbspielEbene.getState().spuren).toHaveLength(1);
    ebene.useAbspielEbene.getState().stoppeAlle();
    await vorspiel;
    abmelden();
  });

  it('nach dem Abmelden des letzten Overlays ist der Anschluss wieder frei (No-op)', async () => {
    const { anschluss, ebene } = await ladeEbene();
    const abmelden = ebene.meldeOverlayAn();
    abmelden();
    expect(anschluss.abspielVorspiel([schritt()])).toBeUndefined();
    // Doppeltes Abmelden ist harmlos (StrictMode-Doppel-Effekte).
    expect(() => abmelden()).not.toThrow();
  });

  it('Abmelden MITTEN im Abspiel stoppt die Spuren und löst das wartende Promise auf', async () => {
    const { anschluss, ebene } = await ladeEbene();
    const abmelden = ebene.meldeOverlayAn();
    const vorspiel = anschluss.abspielVorspiel([schritt()]) as Promise<void>;
    expect(ebene.useAbspielEbene.getState().spuren).toHaveLength(1);
    abmelden();
    await expect(vorspiel).resolves.toBeUndefined();
    expect(ebene.useAbspielEbene.getState().spuren).toHaveLength(0);
  });

  it('leere Schrittliste und webdriver/reduced-motion lösen trotz Overlay sofort auf (No-op)', async () => {
    const { anschluss, ebene } = await ladeEbene();
    const abmelden = ebene.meldeOverlayAn();
    expect(anschluss.abspielVorspiel([])).toBeUndefined();
    setzeWebdriver(true);
    expect(anschluss.abspielVorspiel([schritt()])).toBeUndefined();
    setzeWebdriver(undefined);
    setzeReducedMotion(true);
    expect(anschluss.abspielVorspiel([schritt()])).toBeUndefined();
    abmelden();
  });
});

describe('Pause / Stopp', () => {
  it('pauseUmschalten toggelt; spurFertig der letzten Spur setzt die Pause zurück', async () => {
    const { ebene } = await ladeEbene();
    const st = ebene.useAbspielEbene.getState();
    expect(st.pausiert).toBe(false);
    st.pauseUmschalten();
    expect(ebene.useAbspielEbene.getState().pausiert).toBe(true);
    st.pauseUmschalten();
    expect(ebene.useAbspielEbene.getState().pausiert).toBe(false);
    // Pausiert + letzte Spur fertig → Pause darf nicht «hängen» bleiben.
    const vorspiel = ebene.starteVorspiel([schritt()]);
    st.pauseUmschalten();
    const spurId = ebene.useAbspielEbene.getState().spuren[0]!.id;
    ebene.useAbspielEbene.getState().spurFertig(spurId);
    await vorspiel;
    expect(ebene.useAbspielEbene.getState().pausiert).toBe(false);
  });

  it('stoppeAlle löst ALLE offenen Vorspiel-Promises auf und leert die Spuren', async () => {
    const { ebene } = await ladeEbene();
    const v1 = ebene.starteVorspiel([schritt()]);
    const v2 = ebene.starteVorspiel([schritt(), schritt()]);
    expect(ebene.useAbspielEbene.getState().spuren).toHaveLength(2);
    ebene.useAbspielEbene.getState().stoppeAlle();
    await expect(Promise.all([v1, v2])).resolves.toBeDefined();
    expect(ebene.useAbspielEbene.getState().spuren).toHaveLength(0);
  });

  it('spurFertig ist idempotent (Overlay-Ende + ESC dürfen sich überschneiden)', async () => {
    const { ebene } = await ladeEbene();
    const vorspiel = ebene.starteVorspiel([schritt()]);
    const spurId = ebene.useAbspielEbene.getState().spuren[0]!.id;
    ebene.useAbspielEbene.getState().spurFertig(spurId);
    expect(() => ebene.useAbspielEbene.getState().spurFertig(spurId)).not.toThrow();
    await vorspiel;
  });
});

describe('Sicherheits-Wache — der Apply hängt NIE unbegrenzt', () => {
  it('eine nie beendete Spur löst nach wacheMs von selbst auf', async () => {
    vi.useFakeTimers();
    const { ebene } = await ladeEbene();
    const schritte = [schritt(), schritt()];
    const vorspiel = ebene.starteVorspiel(schritte);
    expect(ebene.useAbspielEbene.getState().spuren).toHaveLength(1);
    vi.advanceTimersByTime(ebene.wacheMs(schritte.length) + 1);
    await vorspiel;
    expect(ebene.useAbspielEbene.getState().spuren).toHaveLength(0);
  });

  it('wacheMs wächst mit der Schrittzahl und ist hart gedeckelt', async () => {
    const { ebene } = await ladeEbene();
    expect(ebene.wacheMs(1)).toBeLessThan(ebene.wacheMs(5));
    expect(ebene.wacheMs(1000)).toBe(45000);
  });
});

describe('Mehrspur-API-Formfaktor (Schwarm-Vorbereitung 0.7.3)', () => {
  it('mehrere Spuren koexistieren mit fortlaufendem Orb-Index; spurFertig löst nur SEINE Spur auf', async () => {
    const { ebene } = await ladeEbene();
    let ersteFertig = false;
    let zweiteFertig = false;
    const v1 = ebene.starteVorspiel([schritt()]).then(() => {
      ersteFertig = true;
    });
    const v2 = ebene.starteVorspiel([schritt()]).then(() => {
      zweiteFertig = true;
    });
    const spuren = ebene.useAbspielEbene.getState().spuren;
    expect(spuren).toHaveLength(2);
    expect(spuren[0]!.orb).toBe(0);
    expect(spuren[1]!.orb).toBe(1);
    expect(spuren[0]!.id).not.toBe(spuren[1]!.id);

    ebene.useAbspielEbene.getState().spurFertig(spuren[0]!.id);
    await v1;
    expect(ersteFertig).toBe(true);
    expect(zweiteFertig).toBe(false);
    expect(ebene.useAbspielEbene.getState().spuren).toHaveLength(1);

    ebene.useAbspielEbene.getState().spurFertig(spuren[1]!.id);
    await v2;
    expect(zweiteFertig).toBe(true);
    expect(ebene.useAbspielEbene.getState().spuren).toHaveLength(0);
  });

  it('jede Spur trägt ihre eigenen Schritte (readonly-Stapel, unverändert durchgereicht)', async () => {
    const { ebene } = await ladeEbene();
    const meine = [schritt({ summary: 'Wand 24 cm · Beton' })];
    const vorspiel = ebene.starteVorspiel(meine);
    const spur = ebene.useAbspielEbene.getState().spuren[0]!;
    expect(spur.schritte).toBe(meine);
    ebene.useAbspielEbene.getState().stoppeAlle();
    await vorspiel;
  });
});

describe('weltPfadeFuerSchritt — Pfad-Quellen (params → Vorschau → leer)', () => {
  it('a/b-Params (Wand/Träger/Achse) ergeben eine offene Linie', async () => {
    const { ebene } = await ladeEbene();
    const pfade = ebene.weltPfadeFuerSchritt(schritt());
    expect(pfade).toHaveLength(1);
    expect(pfade[0]!.geschlossen).toBe(false);
    expect(pfade[0]!.art).toBe('element');
    expect(pfade[0]!.punkte).toEqual([
      { x: 0, y: 0 },
      { x: 4000, y: 0 },
    ]);
  });

  it('outline-Params (Decke/Zone/…) ergeben ein geschlossenes Polygon', async () => {
    const { ebene } = await ladeEbene();
    const outline = [
      { x: 0, y: 0 },
      { x: 3000, y: 0 },
      { x: 3000, y: 3000 },
    ];
    const pfade = ebene.weltPfadeFuerSchritt(schritt({ params: { outline } }));
    expect(pfade).toHaveLength(1);
    expect(pfade[0]!.geschlossen).toBe(true);
    expect(pfade[0]!.punkte).toEqual(outline);
  });

  it('at-Params (Stütze/Möbel) ergeben eine geschlossene Marker-Raute um den Punkt', async () => {
    const { ebene } = await ladeEbene();
    const pfade = ebene.weltPfadeFuerSchritt(schritt({ params: { at: { x: 1000, y: 2000 } } }));
    expect(pfade).toHaveLength(1);
    expect(pfade[0]!.geschlossen).toBe(true);
    expect(pfade[0]!.punkte).toHaveLength(4);
    expect(pfade[0]!.punkte[0]!.y).toBe(2000);
  });

  it('ohne Geometrie-Params fällt es auf die Vorschau-Umkreisung zurück (viewBox → Welt-Rechteck)', async () => {
    const { ebene } = await ladeEbene();
    const pfade = ebene.weltPfadeFuerSchritt(
      schritt({
        params: { irgendeineId: 'x' },
        vorschau: {
          storeyId: 's1',
          vorherSvg: '<svg viewBox="0 0 1 1"></svg>',
          nachherSvg: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="-800 -4800 5600 5600"></svg>',
          eintraege: [],
          typologieHinweis: null,
        },
      }),
    );
    expect(pfade).toHaveLength(1);
    expect(pfade[0]!.art).toBe('umkreisung');
    expect(pfade[0]!.geschlossen).toBe(true);
    // SVG-y = −Welt-y: minY −4800 ⇒ Welt-y +4800 (obere Kante).
    expect(pfade[0]!.punkte[0]).toEqual({ x: -800, y: 4800 });
    expect(pfade[0]!.punkte[2]).toEqual({ x: 4800, y: -800 });
  });

  it('weder Geometrie noch Vorschau ⇒ leere Liste (Overlay zeigt dann nur Orb + Chip)', async () => {
    const { ebene } = await ladeEbene();
    const pfade = ebene.weltPfadeFuerSchritt(schritt({ params: { nurText: true } }));
    expect(pfade).toEqual([]);
  });
});
