import { describe, expect, it } from 'vitest';
import { pruefeGolden } from './golden-helfer';
import {
  DOSSIER_HINWEIS,
  DOSSIER_ROLLEN,
  projektDossierSvg,
  type ProjektDossierOptionen,
} from '../src/derive/dossier';
import { escapeXml } from '../src/derive/plansvg';

/**
 * v0.7.6 Welle 3 Stream F: Report-Dossier — neuer, additiver Kernel-Deriver
 * (`derive/dossier.ts`) nach dem Muster `kvblatt.test.ts`/`studienbericht.
 * test.ts`: erst Verhalten (Ehrlichkeit, Determinismus, Escaping), dann EIN
 * Golden-Block. Berührt keinen der fünf bestehenden Report-Deriver/-Goldens.
 */

function fixtureOpts(): ProjektDossierOptionen {
  return {
    titel: 'Umbau Speicher K4',
    untertitel: 'Nordfassade — Aufstockung und Umnutzung zu Atelier- und Wohnflächen',
    projektNr: '204',
    bauherr: 'Atelier Nord',
    siaPhase: 'bauprojekt',
    datum: '12.07.2026',
    uebersichtLead:
      'Aufstockung und Umnutzung eines Betonspeichers von 1968 zu Atelier- und Wohnflächen.',
    uebersichtText:
      'Dieses Dossier fasst den kuratierten Entwurfsstand zusammen: Kennzahlen, die freigegebene Visualisierungs-Variante und ihre Herkunft in der Pipeline.',
    kennzahlen: [
      { wert: '182 m²', label: 'Nutzfläche neu' },
      { wert: '4', label: 'Geschosse' },
      { wert: '14.0 m', label: 'Spannweite' },
      { wert: "2'840 m³", label: 'Bauvolumen' },
      { wert: '−18 %', label: 'GWP ggü. Neubau' },
      { wert: '2027', label: 'Fertigstellung' },
    ],
    bildSlots: [{ bildunterschrift: 'Abb. 1 — Visualisierung Nordfassade, Abendstimmung · Variante V-03 · Seed 48213.' }],
    parameter: [
      { label: 'Variante', wert: 'V-03 · abgeleitet von Seed 48211' },
      { label: 'Seed', wert: '48213' },
      { label: 'Stil', wert: 'Atmosphäre' },
      { label: 'Licht', wert: 'Abend · 21.06 · 14:00' },
      { label: 'Brennweite', wert: '35 mm' },
    ],
    herkunft: [
      { label: 'Kosmo Data', rolle: 'database' },
      { label: 'Gebäudeerkennung', rolle: 'pna' },
      { label: 'Visualisierung', rolle: 'generator' },
      { label: 'Kuratierung', rolle: 'system' },
    ],
    governance: {
      freigabeText:
        'Freigabe erteilt — Rendering in 3840² auf lokaler GPU, Risk-Stufe L2. Die Entscheidung liegt beim Architekten; die AI blieb Instrument.',
      freigegebenVon: 'Atelier Nord',
      datum: '12.07.2026',
    },
  };
}

describe('projektDossierSvg', () => {
  it('liefert ein wohlgeformtes, eigenständiges A4-hoch-SVG (beginnt mit <svg, endet mit </svg>)', () => {
    const svg = projektDossierSvg(fixtureOpts());
    expect(svg.startsWith('<svg xmlns="http://www.w3.org/2000/svg"')).toBe(true);
    expect(svg.endsWith('</svg>')).toBe(true);
    expect(svg).toContain('viewBox="0 0 794 1123"');
  });

  it('ohne jegliche Optionen bleibt es ein gültiges, nicht-leeres SVG mit Leer-Hinweis (kein Absturz)', () => {
    const svg = projektDossierSvg();
    expect(svg.startsWith('<svg')).toBe(true);
    expect(svg.endsWith('</svg>')).toBe(true);
    expect(svg).toContain('Dossier noch leer');
    expect(svg).toContain(DOSSIER_HINWEIS);
  });

  it('Determinismus: zweimaliger Aufruf mit identischen Eingaben liefert byte-identisches SVG', () => {
    const opts = fixtureOpts();
    const a = projektDossierSvg(opts);
    const b = projektDossierSvg(opts);
    expect(a).toBe(b);
  });

  it('Ehrlichkeits-Block (DOSSIER_HINWEIS) erscheint immer, auch ohne Inhalt', () => {
    expect(projektDossierSvg()).toContain(DOSSIER_HINWEIS);
    expect(projektDossierSvg(fixtureOpts())).toContain(DOSSIER_HINWEIS);
  });

  it('Abschnitte erscheinen NUR, wenn die jeweiligen Daten übergeben werden (kein leeres Kachel-/Tabellen-Gerüst)', () => {
    const ohneKennzahlen = projektDossierSvg({ titel: 'X', uebersichtLead: 'Ein Satz.' });
    expect(ohneKennzahlen).not.toContain('KENNZAHLEN');
    expect(ohneKennzahlen).not.toContain('PARAMETER');
    expect(ohneKennzahlen).not.toContain('HERKUNFT');
    expect(ohneKennzahlen).not.toContain('GOVERNANCE');
    expect(ohneKennzahlen).not.toContain('PLÄNE');

    const mit = projektDossierSvg(fixtureOpts());
    expect(mit).toContain('KENNZAHLEN');
    expect(mit).toContain('PARAMETER');
    expect(mit).toContain('HERKUNFT');
    expect(mit).toContain('GOVERNANCE');
  });

  it('Kennzahlen erscheinen mit Wert und Label je Kachel', () => {
    const opts = fixtureOpts();
    const svg = projektDossierSvg(opts);
    for (const k of opts.kennzahlen!) {
      expect(svg).toContain(escapeXml(k.wert));
    }
  });

  it('Rollen-Hairlines: jede Herkunfts-Rolle rendert ihre eigene Hairline-Farbe', () => {
    const svg = projektDossierSvg(fixtureOpts());
    expect(svg).toContain(`stroke="${DOSSIER_ROLLEN.database}"`);
    expect(svg).toContain(`stroke="${DOSSIER_ROLLEN.pna}"`);
    expect(svg).toContain(`stroke="${DOSSIER_ROLLEN.generator}"`);
    expect(svg).toContain(`stroke="${DOSSIER_ROLLEN.system}"`);
  });

  it('Herkunfts-Kettenglied ohne Rollen-Schlüssel bekommt eine neutrale graue Hairline', () => {
    const svg = projektDossierSvg({
      herkunft: [{ label: 'Unbekannt' }],
    });
    expect(svg).toContain('stroke="#999999"');
  });

  it('Bild-Slot rendert einen gestrichelten Platzhalter-Rahmen mit Bildunterschrift', () => {
    const svg = projektDossierSvg(fixtureOpts());
    expect(svg).toContain('stroke-dasharray="6 3"');
    expect(svg).toContain('Bild-Slot — Plan/Render');
    expect(svg).toContain(escapeXml('Abb. 1 — Visualisierung Nordfassade, Abendstimmung · Variante V-03 · Seed 48213.'));
  });

  it('Governance-Box zeigt Freigabetext und Signaturzeilen nur, wenn übergeben', () => {
    const ohneSign = projektDossierSvg({
      governance: { freigabeText: 'Freigabe erteilt.' },
    });
    expect(ohneSign).toContain('Freigabe erteilt.');
    expect(ohneSign).not.toContain('FREIGEGEBEN ·');

    const mitSign = projektDossierSvg(fixtureOpts());
    expect(mitSign).toContain('FREIGEGEBEN · ATELIER NORD');
    expect(mitSign).toContain('DATUM · 12.07.2026');
  });

  it('Kopf: Titel, Untertitel, Meta-Zeile (Bauherr/SIA-Phase/Datum) und Projekt-Nr. erscheinen nur, wenn übergeben', () => {
    const ohne = projektDossierSvg({});
    expect(ohne).not.toContain('PROJEKT #');
    expect(ohne).toContain('PROJEKT-DOSSIER');

    const mit = projektDossierSvg(fixtureOpts());
    expect(mit).toContain('PROJEKT-DOSSIER — UMBAU SPEICHER K4');
    expect(mit).toContain('PROJEKT #204');
    expect(mit).toContain('Nordfassade — Aufstockung und Umnutzung zu Atelier- und Wohnflächen');
    expect(mit).toContain('12.07.2026');
  });

  it('Sonderzeichen in Titel/Untertitel/Bauherr werden XML-escaped (keine kaputten Attribute/Tags)', () => {
    const svg = projektDossierSvg({ titel: 'A & B <Test>', untertitel: 'Zone "X"', bauherr: 'Büro & Co' });
    expect(svg).not.toContain('A & B <Test>');
    expect(svg).toContain('A &#38; B &#60;TEST&#62;');
    expect(svg).toContain('Zone &#34;X&#34;');
  });

  it('leere Arrays ([]) zählen als NICHT übergeben — kein leerer Abschnitt', () => {
    const svg = projektDossierSvg({ kennzahlen: [], parameter: [], herkunft: [], bildSlots: [] });
    expect(svg).not.toContain('KENNZAHLEN');
    expect(svg).not.toContain('PARAMETER');
    expect(svg).not.toContain('HERKUNFT');
    expect(svg).not.toContain('PLÄNE');
    expect(svg).toContain('Dossier noch leer');
  });

  it('Herkunfts-Kette bricht bei zu vielen Kettengliedern in eine zweite Zeile um (kein Überlauf über die viewBox)', () => {
    const svg = projektDossierSvg({
      herkunft: Array.from({ length: 12 }, (_, i) => ({ label: `Kettenglied-Nr-${i}-mit-langem-Namen`, rolle: 'system' as const })),
    });
    expect(svg.startsWith('<svg')).toBe(true);
    expect(svg.endsWith('</svg>')).toBe(true);
  });
});

describe('Golden-SVG (Projekt-Dossier)', () => {
  it('Dossier der Fixtur (Umbau Speicher K4) ist byte-identisch zur committeten Referenz', () => {
    const svg = projektDossierSvg(fixtureOpts());
    pruefeGolden(svg, new URL('./golden/dossier.svg', import.meta.url));
  });
});
