import { describe, expect, it } from 'vitest';
import { klassifiziereZug, rolleFuerAufgabe, type Aufgabenklasse } from '../src';

/**
 * v0.8.2/P6 («Staffelung + Kuratier-Flow», `docs/V082-SPEZ.md` §6.7,
 * Owner-Entscheid 3 + C-3/C-11) — `klassifiziereZug()` ist die neue,
 * regelbasierte Zug-Klassifikation (KEIN LLM-Aufruf). Diese Datei beweist für
 * ALLE 7 Aufgabenklassen (`staffelung.ts:129-136`), dass ein repräsentativer
 * Eingabe-Fall die richtige Klasse UND — über `rolleFuerAufgabe` — die
 * richtige Rolle liefert. Bestehende `staffelung.test.ts` (25 Tests) bleibt
 * unverändert — diese Datei ist rein additiv.
 */

function klasseUndRolle(eingabe: Parameters<typeof klassifiziereZug>[0]) {
  const klasse = klassifiziereZug(eingabe);
  return { klasse, rolle: rolleFuerAufgabe(klasse) };
}

describe('klassifiziereZug — 7 Aufgabenklassen, je mit erwarteter Rolle', () => {
  it('werkzeug-schreibend (genau EIN Vorschlag) → meister', () => {
    const { klasse, rolle } = klasseUndRolle({
      userText: 'Zeichne eine Wand von 0,0 bis 6,0',
      schreibendAnzahl: 1,
      nurLesendAufgerufen: false,
    });
    expect(klasse).toBe('werkzeug-schreibend');
    expect(rolle).toBe('meister');
  });

  it('strategie-urteil (Entwurfs-/Grundsatzfrage OHNE Tool-Aufruf) → meister', () => {
    const { klasse, rolle } = klasseUndRolle({
      userText: 'Das ist ein echter Entwurfsentscheid: welche Richtung empfiehlst du für die Fassade?',
      schreibendAnzahl: 0,
      nurLesendAufgerufen: false,
    });
    expect(klasse).toBe('strategie-urteil');
    expect(rolle).toBe('meister');
  });

  it('orchestrierung (mehrere Vorschläge im selben Zug = ein Paket) → leiter', () => {
    const { klasse, rolle } = klasseUndRolle({
      userText: 'Baue mir ein Haus',
      schreibendAnzahl: 6,
      nurLesendAufgerufen: false,
    });
    expect(klasse).toBe('orchestrierung');
    expect(rolle).toBe('leiter');
  });

  it('chat-standard (gewöhnlicher Gesprächszug, kein Tool-Aufruf, kein Schlüsselwort) → leiter', () => {
    const { klasse, rolle } = klasseUndRolle({
      userText: 'Wie ist das Wetter heute?',
      schreibendAnzahl: 0,
      nurLesendAufgerufen: false,
    });
    expect(klasse).toBe('chat-standard');
    expect(rolle).toBe('leiter');
  });

  it('werkzeug-lesend (ausschliesslich Lese-Werkzeuge, kein Vorschlag) → zeichner', () => {
    const { klasse, rolle } = klasseUndRolle({
      userText: 'Was sagen die Grundlagen zu Beton?',
      schreibendAnzahl: 0,
      nurLesendAufgerufen: true,
    });
    expect(klasse).toBe('werkzeug-lesend');
    expect(rolle).toBe('zeichner');
  });

  it('zusammenfassung (Diff-Karten-Zusammenfassung, Kontext-Flag) → zeichner', () => {
    const { klasse, rolle } = klasseUndRolle({
      userText: 'design.wandZeichnen',
      schreibendAnzahl: 0,
      nurLesendAufgerufen: false,
      istZusammenfassung: true,
    });
    expect(klasse).toBe('zusammenfassung');
    expect(rolle).toBe('zeichner');
  });

  it('journal (Lernjournal-Buchhaltung, Kontext-Flag) → zeichner', () => {
    const { klasse, rolle } = klasseUndRolle({
      userText: 'Hilfreich, weiter so',
      schreibendAnzahl: 0,
      nurLesendAufgerufen: false,
      istJournalAufgabe: true,
    });
    expect(klasse).toBe('journal');
    expect(rolle).toBe('zeichner');
  });

  it('jede der 7 Aufgabenklassen ist über mindestens einen Eingabe-Fall erreichbar (keine tote Klasse)', () => {
    const alle: Aufgabenklasse[] = [
      'werkzeug-schreibend',
      'strategie-urteil',
      'orchestrierung',
      'chat-standard',
      'werkzeug-lesend',
      'zusammenfassung',
      'journal',
    ];
    const erreicht = new Set<Aufgabenklasse>();
    erreicht.add(klassifiziereZug({ userText: 'x', schreibendAnzahl: 1, nurLesendAufgerufen: false }));
    erreicht.add(
      klassifiziereZug({ userText: 'Warum ist das so?', schreibendAnzahl: 0, nurLesendAufgerufen: false }),
    );
    erreicht.add(klassifiziereZug({ userText: 'x', schreibendAnzahl: 2, nurLesendAufgerufen: false }));
    erreicht.add(klassifiziereZug({ userText: 'Hallo', schreibendAnzahl: 0, nurLesendAufgerufen: false }));
    erreicht.add(klassifiziereZug({ userText: 'x', schreibendAnzahl: 0, nurLesendAufgerufen: true }));
    erreicht.add(
      klassifiziereZug({ userText: 'x', schreibendAnzahl: 0, nurLesendAufgerufen: false, istZusammenfassung: true }),
    );
    erreicht.add(
      klassifiziereZug({ userText: 'x', schreibendAnzahl: 0, nurLesendAufgerufen: false, istJournalAufgabe: true }),
    );
    for (const k of alle) expect(erreicht).toContain(k);
    expect(erreicht.size).toBe(7);
  });
});

describe('klassifiziereZug — Vorrang-Reihenfolge (spezifischstes zuerst)', () => {
  it('istJournalAufgabe schlägt alles andere (auch mehrere Vorschläge)', () => {
    expect(
      klassifiziereZug({
        userText: 'Warum?',
        schreibendAnzahl: 3,
        nurLesendAufgerufen: true,
        istJournalAufgabe: true,
      }),
    ).toBe('journal');
  });

  it('istZusammenfassung schlägt Schreibend/Lesend, aber nicht istJournalAufgabe', () => {
    expect(
      klassifiziereZug({ userText: 'x', schreibendAnzahl: 1, nurLesendAufgerufen: false, istZusammenfassung: true }),
    ).toBe('zusammenfassung');
  });

  it('ein Schlüsselwort im Text ändert NICHTS, wenn bereits ein Vorschlag entstand (schreibendAnzahl gewinnt)', () => {
    expect(
      klassifiziereZug({ userText: 'Warum baust du das so?', schreibendAnzahl: 1, nurLesendAufgerufen: false }),
    ).toBe('werkzeug-schreibend');
  });

  it('nurLesendAufgerufen ohne echten Lese-Aufruf (false) + kein Schlüsselwort → chat-standard, kein Fehlschluss', () => {
    expect(
      klassifiziereZug({ userText: 'Danke, das reicht.', schreibendAnzahl: 0, nurLesendAufgerufen: false }),
    ).toBe('chat-standard');
  });
});
