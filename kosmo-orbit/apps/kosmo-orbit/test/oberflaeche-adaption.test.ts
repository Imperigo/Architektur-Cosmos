import { beforeEach, describe, expect, it } from 'vitest';
import {
  adaptionAktiv,
  adaptionZuruecksetzen,
  adaptiveFokusStufe,
  darfUmordnen,
  elementFokusStufe,
  gehobenesElementDerGruppe,
  istUnterBasis,
  LEISTEN_BASIS,
  leiteTaetigkeitsKontextAb,
  nutzungMelden,
  nutzungsProfil,
  nutzungVerfallen,
  opazitaetsKlasse,
  opazitaetsWert,
  setAdaptionAktiv,
  ZEICHEN_WERKZEUG_IDS,
  type NutzungsProfil,
  type TaetigkeitsKontext,
} from '../src/state/oberflaeche-adaption';

/**
 * Adaptions-Regelwerk (Serie J / Batch J3a — SERIE-J-BUILDPLAN.md Abschnitt 2).
 * Reine Regelfunktionen + dünner localStorage-Store, kein UI-Wiring. Muster
 * A4 (`sketch-3d.test.ts`): reine Funktionen, kein DOM/WebGL nötig. Das
 * Modul installiert selbst einen In-Memory-`localStorage`-Ersatz, falls die
 * Vitest-Umgebung (kein jsdom) keinen kennt — darum ist `localStorage` hier
 * ohne weiteres Setup verfügbar.
 */

const STORAGE_KEY = 'kosmo.adaption.v1';

function kontext(partial: Partial<TaetigkeitsKontext> = {}): TaetigkeitsKontext {
  return { tool: 'auswahl', phase: 'bauprojekt', aktionLaeuft: false, panelOffen: false, ...partial };
}

function leeresProfil(): NutzungsProfil {
  return { zaehler: {}, zuletzt: {} };
}

function profilMit(elementId: string, anzahl: number): NutzungsProfil {
  return { zaehler: { [elementId]: anzahl }, zuletzt: {} };
}

beforeEach(() => {
  localStorage.clear();
});

describe('adaptiveFokusStufe — Tätigkeits-Matrix (2.2), jede Zeile/Spalte', () => {
  it('zeichnen bleibt immer primär — Basis, egal ob gezeichnet oder ausgewählt wird', () => {
    expect(adaptiveFokusStufe('zeichnen', 'primaer', kontext({ tool: 'auswahl' }), leeresProfil())).toBe('primaer');
    expect(adaptiveFokusStufe('zeichnen', 'primaer', kontext({ tool: 'wand' }), leeresProfil())).toBe('primaer');
    expect(
      adaptiveFokusStufe('zeichnen', 'primaer', kontext({ tool: 'wand', phase: 'werkplan' }), leeresProfil()),
    ).toBe('primaer');
    expect(
      adaptiveFokusStufe('zeichnen', 'primaer', kontext({ tool: 'wand', phase: 'vorprojekt' }), leeresProfil()),
    ).toBe('primaer');
  });

  it('ansicht bleibt immer sekundär — Basis, unabhängig von Werkzeug/Phase', () => {
    expect(adaptiveFokusStufe('ansicht', 'sekundaer', kontext({ tool: 'auswahl' }), leeresProfil())).toBe('sekundaer');
    expect(adaptiveFokusStufe('ansicht', 'sekundaer', kontext({ tool: 'wand' }), leeresProfil())).toBe('sekundaer');
    expect(
      adaptiveFokusStufe('ansicht', 'sekundaer', kontext({ tool: 'skizze', phase: 'werkplan' }), leeresProfil()),
    ).toBe('sekundaer');
  });

  it('export: Basis ist sekundär (tool ohne Zeichenbezug, z.B. auswahl)', () => {
    expect(adaptiveFokusStufe('export', 'sekundaer', kontext({ tool: 'auswahl' }), leeresProfil())).toBe('sekundaer');
  });

  it('export: beim Zeichnen (tool ∈ ZEICHEN_WERKZEUGE ∪ {skizze}) fällt auf selten', () => {
    expect(adaptiveFokusStufe('export', 'sekundaer', kontext({ tool: 'wand' }), leeresProfil())).toBe('selten');
    expect(adaptiveFokusStufe('export', 'sekundaer', kontext({ tool: 'skizze' }), leeresProfil())).toBe('selten');
  });

  it('export: tool=auswahl bleibt sekundär, auch in werkplan/vorprojekt', () => {
    expect(
      adaptiveFokusStufe('export', 'sekundaer', kontext({ tool: 'auswahl', phase: 'werkplan' }), leeresProfil()),
    ).toBe('sekundaer');
    expect(
      adaptiveFokusStufe('export', 'sekundaer', kontext({ tool: 'auswahl', phase: 'vorprojekt' }), leeresProfil()),
    ).toBe('sekundaer');
  });

  it('export: Phase werkplan hebt die Zeichnen-Demotion eine Stufe (selten→sekundär), gedeckelt auf Basis', () => {
    const stufe = adaptiveFokusStufe(
      'export',
      'sekundaer',
      kontext({ tool: 'wand', phase: 'werkplan' }),
      leeresProfil(),
    );
    expect(stufe).toBe('sekundaer');
  });

  it('export: Phase vorprojekt hebt NICHT — bleibt selten wie beim Zeichnen', () => {
    const stufe = adaptiveFokusStufe(
      'export',
      'sekundaer',
      kontext({ tool: 'wand', phase: 'vorprojekt' }),
      leeresProfil(),
    );
    expect(stufe).toBe('selten');
  });

  it('ebenen: Basis sekundär, beim Zeichnen selten (Textur/Sonne/… zurückgestellt)', () => {
    expect(adaptiveFokusStufe('ebenen', 'sekundaer', kontext({ tool: 'auswahl' }), leeresProfil())).toBe('sekundaer');
    expect(adaptiveFokusStufe('ebenen', 'sekundaer', kontext({ tool: 'volumen' }), leeresProfil())).toBe('selten');
  });

  it('ebenen: ein aktuell aktives/offenes Panel wird NIE gedimmt (Anti-Nerv-Wache statt Matrix-Demotion)', () => {
    // aktionLaeuft=true modelliert "ein Panel/eine Aktion läuft gerade" — die
    // Zeichnen-Demotion greift dann nicht: die Gruppe bleibt auf Basis.
    const stufe = adaptiveFokusStufe(
      'ebenen',
      'sekundaer',
      kontext({ tool: 'wand', aktionLaeuft: true }),
      leeresProfil(),
    );
    expect(stufe).toBe('sekundaer');
  });

  it('ebenen: ein offenes Ebenen-Panel (panelOffen) hält die Gruppe auf Basis — auch OHNE laufende Aktion (Fable-Review-2-Auflage J3c-0b)', () => {
    const stufe = adaptiveFokusStufe(
      'ebenen',
      'sekundaer',
      kontext({ tool: 'wand', aktionLaeuft: false, panelOffen: true }),
      leeresProfil(),
    );
    expect(stufe).toBe('sekundaer');
  });

  it('ebenen: panelOffen wirkt sich NICHT auf andere Gruppen aus (nur die Ebenen-Gruppe bleibt auf Basis)', () => {
    const stufe = adaptiveFokusStufe(
      'export',
      'sekundaer',
      kontext({ tool: 'wand', aktionLaeuft: false, panelOffen: true }),
      leeresProfil(),
    );
    expect(stufe).toBe('selten'); // export demotet trotz offenem Ebenen-Panel weiter
  });

  it('ebenen: Phase ändert nichts an der Demotion (anders als bei export) — beide Phasen gleich', () => {
    const werkplan = adaptiveFokusStufe(
      'ebenen',
      'sekundaer',
      kontext({ tool: 'wand', phase: 'werkplan' }),
      leeresProfil(),
    );
    const vorprojekt = adaptiveFokusStufe(
      'ebenen',
      'sekundaer',
      kontext({ tool: 'wand', phase: 'vorprojekt' }),
      leeresProfil(),
    );
    expect(werkplan).toBe('selten');
    expect(vorprojekt).toBe('selten');
  });

  it('projekt bleibt immer selten — Basis, unabhängig von Werkzeug/Phase', () => {
    expect(adaptiveFokusStufe('projekt', 'selten', kontext({ tool: 'auswahl' }), leeresProfil())).toBe('selten');
    expect(adaptiveFokusStufe('projekt', 'selten', kontext({ tool: 'wand' }), leeresProfil())).toBe('selten');
    expect(
      adaptiveFokusStufe('projekt', 'selten', kontext({ tool: 'wand', phase: 'werkplan' }), leeresProfil()),
    ).toBe('selten');
  });

  it('verlauf bleibt immer primär — Basis, unabhängig von Werkzeug/Phase (Undo/Redo)', () => {
    expect(adaptiveFokusStufe('verlauf', 'primaer', kontext({ tool: 'auswahl' }), leeresProfil())).toBe('primaer');
    expect(adaptiveFokusStufe('verlauf', 'primaer', kontext({ tool: 'wand' }), leeresProfil())).toBe('primaer');
  });

  // A7 (K17): `faehigkeiten` — dieselbe Basis-Spalte wie `ebenen` (sekundär,
  // beim Zeichnen selten), UND dieselbe Anti-Dimm-Ausnahme bei offenem Panel
  // (Submissions-Check teilt sich `panelOffen` mit den Ebenen-Panels, s.
  // Kommentar in `oberflaeche-adaption.ts`).
  it('faehigkeiten: Basis sekundär, beim Zeichnen selten — wie ebenen', () => {
    expect(adaptiveFokusStufe('faehigkeiten', 'sekundaer', kontext({ tool: 'auswahl' }), leeresProfil())).toBe(
      'sekundaer',
    );
    expect(adaptiveFokusStufe('faehigkeiten', 'sekundaer', kontext({ tool: 'volumen' }), leeresProfil())).toBe(
      'selten',
    );
  });

  it('faehigkeiten: ein offenes Panel (panelOffen) hält die Gruppe auf Basis — wie ebenen', () => {
    const stufe = adaptiveFokusStufe(
      'faehigkeiten',
      'sekundaer',
      kontext({ tool: 'wand', aktionLaeuft: false, panelOffen: true }),
      leeresProfil(),
    );
    expect(stufe).toBe('sekundaer');
  });

  it('ein unbekanntes/neutrales Werkzeug verhält sich wie auswahl (bleibt auf Basis)', () => {
    expect(adaptiveFokusStufe('export', 'sekundaer', kontext({ tool: 'irgendwas' }), leeresProfil())).toBe(
      'sekundaer',
    );
    expect(adaptiveFokusStufe('ebenen', 'sekundaer', kontext({ tool: 'irgendwas' }), leeresProfil())).toBe(
      'sekundaer',
    );
  });
});

describe('darfUmordnen — Anti-Nerv-Wache (2.3, Regel 2)', () => {
  it('friert bei laufender Aktion ein (aktionLaeuft=true → false)', () => {
    expect(darfUmordnen(kontext({ aktionLaeuft: true }))).toBe(false);
  });

  it('erlaubt Neuberechnung, wenn keine Aktion läuft', () => {
    expect(darfUmordnen(kontext({ aktionLaeuft: false }))).toBe(true);
  });
});

describe('Nutzer-Adaption — Top-3 je Gruppe heben maximal eine Stufe (2.2, Schlussabsatz)', () => {
  it('ein oft genutztes Element hebt seine (zurückgestellte) Gruppe von selten auf sekundär', () => {
    const nutzung = profilMit('export:pdf', 5); // >= Schwelle
    const stufe = adaptiveFokusStufe('export', 'sekundaer', kontext({ tool: 'wand' }), nutzung);
    expect(stufe).toBe('sekundaer');
  });

  it('ein einzelner/seltener Klick reicht NICHT zur Hebung (unter der Nutzungs-Schwelle)', () => {
    const nutzung = profilMit('export:pdf', 1);
    const stufe = adaptiveFokusStufe('export', 'sekundaer', kontext({ tool: 'wand' }), nutzung);
    expect(stufe).toBe('selten');
  });

  it('die Hebung geht nie über primär hinaus (zeichnen bleibt primär trotz hoher Nutzung)', () => {
    const nutzung = profilMit('zeichnen:wand', 99);
    const stufe = adaptiveFokusStufe('zeichnen', 'primaer', kontext({ tool: 'wand' }), nutzung);
    expect(stufe).toBe('primaer');
  });

  it('Nutzung einer ANDEREN Gruppe hebt die eigene Gruppe nicht (Top-3 ist je Gruppe, nicht global)', () => {
    const nutzung = profilMit('ebenen:sonne', 99);
    const stufe = adaptiveFokusStufe('export', 'sekundaer', kontext({ tool: 'wand' }), nutzung);
    expect(stufe).toBe('selten');
  });

  it('die Hebung hebt nie unter die Matrix-Stufe von etwas gerade Aktivem (rein additiv)', () => {
    // aktionLaeuft hält die Gruppe schon auf Basis (sekundär) — die
    // Nutzungs-Hebung kann das nur bestätigen, nie unterschreiten.
    const nutzung = profilMit('ebenen:sonne', 5);
    const stufe = adaptiveFokusStufe(
      'ebenen',
      'sekundaer',
      kontext({ tool: 'wand', aktionLaeuft: true }),
      nutzung,
    );
    expect(stufe).toBe('sekundaer');
  });
});

describe('nutzungVerfallen — Halbwertszeit 7 Tage (rein)', () => {
  it('halbiert nach genau einer Halbwertszeit (7 Tage)', () => {
    const verfallen = nutzungVerfallen({ zaehler: { a: 10 }, zuletzt: {} }, 7);
    expect(verfallen.zaehler['a']).toBeCloseTo(5, 6);
  });

  it('viertelt nach zwei Halbwertszeiten (14 Tage)', () => {
    const verfallen = nutzungVerfallen({ zaehler: { a: 8 }, zuletzt: {} }, 14);
    expect(verfallen.zaehler['a']).toBeCloseTo(2, 6);
  });

  it('lässt den Zähler unverändert, wenn keine Zeit verstrichen ist', () => {
    const verfallen = nutzungVerfallen({ zaehler: { a: 10 }, zuletzt: {} }, 0);
    expect(verfallen.zaehler['a']).toBe(10);
  });

  it('entfernt verschwindend kleine Reste ganz, statt sie endlos weiterzuschleppen', () => {
    const verfallen = nutzungVerfallen({ zaehler: { a: 1 }, zuletzt: {} }, 700); // 100 Halbwertszeiten
    expect(verfallen.zaehler['a']).toBeUndefined();
  });
});

describe('Laufzeit-Store — localStorage kosmo.adaption.v1 (Laufzeit ≠ Modell)', () => {
  it('adaptionAktiv() ist standardmässig an, solange nichts gespeichert wurde', () => {
    expect(localStorage.getItem(STORAGE_KEY)).toBeNull();
    expect(adaptionAktiv()).toBe(true);
  });

  it('ein kaputter localStorage-Eintrag führt zum Basiszustand statt zum Crash', () => {
    localStorage.setItem(STORAGE_KEY, '{ nicht: gueltiges json ][');
    expect(() => adaptionAktiv()).not.toThrow();
    expect(adaptionAktiv()).toBe(true);
  });

  it('ein strukturell falscher (aber gültiger) JSON-Eintrag führt ebenfalls zum Basiszustand', () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ irgendwas: 'anderes' }));
    expect(() => adaptionAktiv()).not.toThrow();
    expect(adaptionAktiv()).toBe(true);
  });

  it('deaktivierte Adaption (adaptionAktiv()==false) — Aufrufer liefern dann exakt die Basis-Stufe', () => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ version: 1, aktiv: false, profil: { zaehler: {}, zuletzt: {} }, gespeichertAm: Date.now() }),
    );
    expect(adaptionAktiv()).toBe(false);
    const basis = 'sekundaer' as const;
    const angewandteStufe = adaptionAktiv()
      ? adaptiveFokusStufe('export', basis, kontext({ tool: 'wand' }), leeresProfil())
      : basis;
    // ohne Opt-out wäre das Ergebnis 'selten' (beim Zeichnen) — mit
    // deaktivierter Adaption bleibt es exakt die Basis-Stufe.
    expect(angewandteStufe).toBe(basis);
  });

  it('nutzungMelden erhöht den gewichteten Zähler für das Element', () => {
    nutzungMelden('export:pdf');
    nutzungMelden('export:pdf');
    const roh = JSON.parse(localStorage.getItem(STORAGE_KEY)!) as {
      profil: NutzungsProfil;
    };
    expect(roh.profil.zaehler['export:pdf']).toBe(2);
  });

  it('nutzungMelden setzt einen Zeitstempel für die letzte Nutzung', () => {
    nutzungMelden('ebenen:sonne');
    const roh = JSON.parse(localStorage.getItem(STORAGE_KEY)!) as {
      profil: NutzungsProfil;
    };
    expect(roh.profil.zuletzt['ebenen:sonne']).toBeGreaterThan(0);
  });

  it('adaptionZuruecksetzen() löscht NUR das gelernte Profil, nicht den kompletten Eintrag (Fable-Review-2-Auflage J3c-1)', () => {
    nutzungMelden('export:pdf');
    expect(nutzungsProfil().zaehler['export:pdf']).toBe(1);
    adaptionZuruecksetzen();
    expect(nutzungsProfil()).toEqual({ zaehler: {}, zuletzt: {} });
    expect(adaptionAktiv()).toBe(true);
  });

  it('adaptionZuruecksetzen() lässt einen zuvor gesetzten Opt-out (Schalter aus) unangetastet — Reset darf ein Opt-out nicht heimlich rückgängig machen', () => {
    setAdaptionAktiv(false);
    nutzungMelden('export:pdf');
    adaptionZuruecksetzen();
    expect(adaptionAktiv()).toBe(false); // Schalter bleibt aus
    expect(nutzungsProfil()).toEqual({ zaehler: {}, zuletzt: {} }); // Profil trotzdem geleert
  });

  it('setAdaptionAktiv() schreibt NUR den Schalter — wischt nie ein vorhandenes gelerntes Profil', () => {
    nutzungMelden('export:pdf');
    nutzungMelden('export:pdf');
    setAdaptionAktiv(false);
    expect(adaptionAktiv()).toBe(false);
    expect(nutzungsProfil().zaehler['export:pdf']).toBe(2); // Profil unangetastet
    setAdaptionAktiv(true);
    expect(adaptionAktiv()).toBe(true);
    expect(nutzungsProfil().zaehler['export:pdf']).toBe(2); // immer noch unangetastet
  });

  it('nutzungsProfil() liest exakt das per nutzungMelden gespeicherte Profil zurück', () => {
    expect(nutzungsProfil()).toEqual({ zaehler: {}, zuletzt: {} });
    nutzungMelden('export:pdf');
    nutzungMelden('export:pdf');
    expect(nutzungsProfil().zaehler['export:pdf']).toBe(2);
  });

  it('nutzungsProfil() liefert nach kaputtem Eintrag das leere Basisprofil, kein Crash', () => {
    localStorage.setItem(STORAGE_KEY, '{ kaputt ][');
    expect(() => nutzungsProfil()).not.toThrow();
    expect(nutzungsProfil()).toEqual({ zaehler: {}, zuletzt: {} });
  });
});

describe('ZEICHEN_WERKZEUG_IDS — EINE Quelle der Werkzeugliste (Fable-Review-1-Auflage)', () => {
  it('enthält exakt die sieben Zeichenwerkzeuge (Spiegel des DesignWorkspace-ToolId-Sets ohne auswahl/skizze)', () => {
    expect([...ZEICHEN_WERKZEUG_IDS].sort()).toEqual(
      ['dach', 'schnitt', 'stuetze', 'treppe', 'volumen', 'wand', 'zone'].sort(),
    );
  });

  it('adaptiveFokusStufe erkennt jedes exportierte Werkzeug als Zeichenkontext', () => {
    for (const id of ZEICHEN_WERKZEUG_IDS) {
      expect(adaptiveFokusStufe('export', 'sekundaer', kontext({ tool: id }), leeresProfil())).toBe('selten');
    }
  });
});

describe('LEISTEN_BASIS — T7-Basis je Gruppe (2.2, Basis-Spalte), einzige Quelle für DesignWorkspace', () => {
  it('entspricht exakt der Buildplan-Tabelle', () => {
    expect(LEISTEN_BASIS).toEqual({
      zeichnen: 'primaer',
      ansicht: 'sekundaer',
      export: 'sekundaer',
      ebenen: 'sekundaer',
      faehigkeiten: 'sekundaer',
      projekt: 'selten',
      verlauf: 'primaer',
    });
  });
});

describe('istUnterBasis — Vergleichshilfe für den Adaptions-Hinweis (2.3.5)', () => {
  it('erkennt eine demotete Stufe als unter der Basis', () => {
    expect(istUnterBasis('selten', 'sekundaer')).toBe(true);
  });

  it('eine Stufe auf/über der Basis gilt nicht als "unter Basis"', () => {
    expect(istUnterBasis('sekundaer', 'sekundaer')).toBe(false);
    expect(istUnterBasis('primaer', 'sekundaer')).toBe(false);
  });
});

describe('leiteTaetigkeitsKontextAb — Kontext-Ableitung aus DesignWorkspace-State (J3b/J3c-0b)', () => {
  it('aktionLaeuft ist falsch, wenn weder eine Punktkette offen ist noch gezogen wird', () => {
    const k = leiteTaetigkeitsKontextAb({
      tool: 'auswahl',
      phase: 'bauprojekt',
      punkteOffen: false,
      ziehtElement: false,
      panelOffen: false,
    });
    expect(k).toEqual({ tool: 'auswahl', phase: 'bauprojekt', aktionLaeuft: false, panelOffen: false });
  });

  it('aktionLaeuft ist wahr, solange eine Punktkette offen ist (points.length>0)', () => {
    const k = leiteTaetigkeitsKontextAb({
      tool: 'wand',
      phase: 'bauprojekt',
      punkteOffen: true,
      ziehtElement: false,
      panelOffen: false,
    });
    expect(k.aktionLaeuft).toBe(true);
  });

  it('aktionLaeuft ist wahr, solange ein Element gezogen wird (dragEntity !== null)', () => {
    const k = leiteTaetigkeitsKontextAb({
      tool: 'auswahl',
      phase: 'bauprojekt',
      punkteOffen: false,
      ziehtElement: true,
      panelOffen: false,
    });
    expect(k.aktionLaeuft).toBe(true);
  });

  it('aktionLaeuft bleibt wahr, wenn beides gleichzeitig zutrifft', () => {
    const k = leiteTaetigkeitsKontextAb({
      tool: 'wand',
      phase: 'werkplan',
      punkteOffen: true,
      ziehtElement: true,
      panelOffen: false,
    });
    expect(k.aktionLaeuft).toBe(true);
  });

  it('übernimmt tool/phase unverändert (reine Durchreichung)', () => {
    const k = leiteTaetigkeitsKontextAb({
      tool: 'skizze',
      phase: 'vorprojekt',
      punkteOffen: false,
      ziehtElement: false,
      panelOffen: false,
    });
    expect(k.tool).toBe('skizze');
    expect(k.phase).toBe('vorprojekt');
  });

  it('panelOffen wird unverändert durchgereicht (Fable-Review-2-Auflage J3c-0b: sonneOffen||drawOffen||…)', () => {
    const offen = leiteTaetigkeitsKontextAb({
      tool: 'wand',
      phase: 'bauprojekt',
      punkteOffen: false,
      ziehtElement: false,
      panelOffen: true,
    });
    expect(offen.panelOffen).toBe(true);
    const zu = leiteTaetigkeitsKontextAb({
      tool: 'wand',
      phase: 'bauprojekt',
      punkteOffen: false,
      ziehtElement: false,
      panelOffen: false,
    });
    expect(zu.panelOffen).toBe(false);
  });
});

describe('Element-Hebung (2.2 Schlussabsatz, Fable-Review-2-Auflage J3c-2)', () => {
  it('gehobenesElementDerGruppe liefert undefined ohne Nutzung', () => {
    expect(gehobenesElementDerGruppe('ebenen', leeresProfil())).toBeUndefined();
  });

  it('gehobenesElementDerGruppe liefert das oft genutzte Element (>= Schwelle), wenn es in den Top-3 der Gruppe ist', () => {
    const nutzung = profilMit('ebenen:sonne', 5);
    expect(gehobenesElementDerGruppe('ebenen', nutzung)).toBe('ebenen:sonne');
  });

  it('gehobenesElementDerGruppe ignoriert Elemente unter der Schwelle', () => {
    const nutzung = profilMit('ebenen:sonne', 1);
    expect(gehobenesElementDerGruppe('ebenen', nutzung)).toBeUndefined();
  });

  it('gehobenesElementDerGruppe ignoriert Elemente ANDERER Gruppen', () => {
    const nutzung = profilMit('export:pdf', 5);
    expect(gehobenesElementDerGruppe('ebenen', nutzung)).toBeUndefined();
  });

  it('elementFokusStufe hebt das gehobene Element eine Stufe über die Gruppen-Stufe (selten→sekundär)', () => {
    expect(elementFokusStufe('ebenen:sonne', 'selten', 'ebenen:sonne')).toBe('sekundaer');
  });

  it('elementFokusStufe hebt nie über primär hinaus (gedeckelt)', () => {
    expect(elementFokusStufe('zeichnen:wand', 'primaer', 'zeichnen:wand')).toBe('primaer');
  });

  it('elementFokusStufe lässt ein NICHT gehobenes Element exakt auf der Gruppen-Stufe (kein Layout-Shift für Geschwister)', () => {
    expect(elementFokusStufe('ebenen:textur', 'selten', 'ebenen:sonne')).toBe('selten');
  });

  it('elementFokusStufe bleibt auf Gruppen-Stufe, wenn kein Element gehoben ist (gehobenesElement===undefined)', () => {
    expect(elementFokusStufe('ebenen:sonne', 'sekundaer', undefined)).toBe('sekundaer');
  });

  it('opazitaetsKlasse liefert die reine k-opazitaet-* Klasse (kein font-size/font-weight — 2.3.1)', () => {
    expect(opazitaetsKlasse('primaer')).toBe('k-opazitaet-primaer');
    expect(opazitaetsKlasse('sekundaer')).toBe('k-opazitaet-sekundaer');
    expect(opazitaetsKlasse('selten')).toBe('k-opazitaet-selten');
  });

  it('opazitaetsWert spiegelt exakt die aura.css-Werte von .k-primaer/.k-sekundaer/.k-selten', () => {
    expect(opazitaetsWert('primaer')).toBe(1);
    expect(opazitaetsWert('sekundaer')).toBe(0.92);
    expect(opazitaetsWert('selten')).toBe(0.6);
  });

  it('Praxisfall: ein oft genutztes Ebenen-Element bleibt eine Stufe höher als seine (aktuelle) Gruppen-Stufe, Geschwister bleiben auf der Gruppen-Stufe', () => {
    // "Sonne" ist oft genutzt (>= Schwelle) — dieselbe Nutzung hebt hier
    // BEIDES: die Gruppe selbst (2.2, Schlussabsatz: Top-3 hebt selten→
    // sekundär) UND, obendrauf, "Sonne" nochmals eine Stufe über die
    // (bereits gehobene) Gruppe (J3c-2: Element-Hebung ist additiv zur
    // Gruppen-Hebung, nicht deren Ersatz). Ein NICHT gehobenes Geschwister
    // (Textur) bleibt exakt auf der Gruppen-Stufe.
    const nutzung = profilMit('ebenen:sonne', 5);
    const gruppenStufe = adaptiveFokusStufe('ebenen', 'sekundaer', kontext({ tool: 'wand' }), nutzung);
    expect(gruppenStufe).toBe('sekundaer'); // von selten (Zeichnen-Demotion) auf sekundär gehoben
    const gehoben = gehobenesElementDerGruppe('ebenen', nutzung);
    const sonneStufe = elementFokusStufe('ebenen:sonne', gruppenStufe, gehoben);
    const texturStufe = elementFokusStufe('ebenen:textur', gruppenStufe, gehoben);
    expect(sonneStufe).toBe('primaer'); // eine Stufe höher als die (bereits gehobene) Gruppe
    expect(texturStufe).toBe(gruppenStufe); // Geschwister bleiben auf der Gruppen-Stufe
  });
});

describe('adaptiveFokusStufe — Feinjustierung durch rolle/siaPhase/arbeitsmodus (Stream B, W1b, BEWEGUNGSKONZEPT-066 §4/§7)', () => {
  it('ohne die neuen Signale bleibt das Verhalten byte-identisch (optionale Felder wirken nie, wenn sie fehlen)', () => {
    const leer = leeresProfil();
    expect(adaptiveFokusStufe('faehigkeiten', 'sekundaer', kontext({ tool: 'wand' }), leer)).toBe('selten');
    expect(adaptiveFokusStufe('export', 'sekundaer', kontext({ tool: 'wand' }), leer)).toBe('selten');
  });

  it('rolle="ausfuehrung" hält die Fähigkeiten-Gruppe erreichbar (sekundär statt selten) während des Zeichnens', () => {
    const leer = leeresProfil();
    const stufe = adaptiveFokusStufe('faehigkeiten', 'sekundaer', kontext({ tool: 'wand', rolle: 'ausfuehrung' }), leer);
    expect(stufe).toBe('sekundaer');
  });

  it('siaPhase="ausschreibung"/"ausfuehrung" hebt die Fähigkeiten-Gruppe genauso wie die Rolle — nie über die eigene Basis hinaus', () => {
    const leer = leeresProfil();
    expect(adaptiveFokusStufe('faehigkeiten', 'sekundaer', kontext({ tool: 'wand', siaPhase: 'ausschreibung' }), leer)).toBe('sekundaer');
    expect(adaptiveFokusStufe('faehigkeiten', 'sekundaer', kontext({ tool: 'wand', siaPhase: 'ausfuehrung' }), leer)).toBe('sekundaer');
    // Eine andere Phase (z.B. das Standard-`wettbewerb`) hebt NICHT — sonst
    // wäre die Zeichnen-Demotion der Gruppe wirkungslos geworden.
    expect(adaptiveFokusStufe('faehigkeiten', 'sekundaer', kontext({ tool: 'wand', siaPhase: 'wettbewerb' }), leer)).toBe('selten');
  });

  it('arbeitsmodus="exportieren" hält die Export-Gruppe erreichbar (Schicht-1-Modus und Schicht-2-Dimmung bleiben konsistent)', () => {
    const leer = leeresProfil();
    const stufe = adaptiveFokusStufe('export', 'sekundaer', kontext({ tool: 'wand', arbeitsmodus: 'exportieren' }), leer);
    expect(stufe).toBe('sekundaer');
    // Ein anderer Modus (z.B. "zeichnen") hebt die Export-Gruppe NICHT an.
    expect(adaptiveFokusStufe('export', 'sekundaer', kontext({ tool: 'wand', arbeitsmodus: 'zeichnen' }), leer)).toBe('selten');
  });

  it('leiteTaetigkeitsKontextAb reicht rolle/siaPhase/station/arbeitsmodus additiv durch, ohne die Pflichtfelder anzutasten', () => {
    const k = leiteTaetigkeitsKontextAb({
      tool: 'wand',
      phase: 'werkplan',
      punkteOffen: false,
      ziehtElement: false,
      panelOffen: false,
      rolle: 'ausfuehrung',
      siaPhase: 'ausschreibung',
      station: 'design',
      arbeitsmodus: 'exportieren',
    });
    expect(k.rolle).toBe('ausfuehrung');
    expect(k.siaPhase).toBe('ausschreibung');
    expect(k.station).toBe('design');
    expect(k.arbeitsmodus).toBe('exportieren');

    // Ohne die optionalen Felder: unverändert nicht gesetzt (kein "undefined"
    // im Objekt — exactOptionalPropertyTypes-konform).
    const kOhne = leiteTaetigkeitsKontextAb({ tool: 'auswahl', phase: 'vorprojekt', punkteOffen: false, ziehtElement: false, panelOffen: false });
    expect('rolle' in kOhne).toBe(false);
    expect('siaPhase' in kOhne).toBe(false);
    expect('station' in kOhne).toBe(false);
    expect('arbeitsmodus' in kOhne).toBe(false);
  });
});
