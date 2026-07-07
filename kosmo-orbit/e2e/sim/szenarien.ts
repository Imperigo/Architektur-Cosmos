import type { Pt } from '@kosmo/kernel';

/**
 * Serie H (Buildplan `docs/SERIE-H-BUILDPLAN.md`, Abschnitt 1.2) —
 * deterministischer CH-Szenario-Datensatz je Haustyp. Reine Daten, offline,
 * kein Netz: LV95-Koordinaten und Zonenwerte sind plausible, realistische
 * Fixtures — kein GIS-/AV-Import (Restgrenze 9 des Buildplans). Die
 * WGS84-lat/lon-Werte sind aus den LV95-Koordinaten (e/n) über die
 * amtliche Näherungsformel (swisstopo) gerundet abgeleitet.
 *
 * `umbau` und `mfh` sind aus den zwei grünen Saat-Specs (`sim-umbau.spec.ts`,
 * `sim-mfh.spec.ts`) übernommen, damit die H1a-Refaktorierung deckungsgleich
 * bleibt. `efh`, `stadthaus`, `blockrand`, `hochhaus` sind für H2 vorbereitet
 * (noch unbenutzt in H1a), aber vollständig befüllt.
 */

export interface SimSzenario {
  key: 'umbau' | 'mfh' | 'efh' | 'stadthaus' | 'blockrand' | 'hochhaus';
  titel: string;
  standort: { label: string; lat: number; lon: number; e: number; n: number; hoeheM: number };
  parzelle: {
    outline: Pt[];
    maxHoehe: number | null;
    grenzabstand: number | null;
  };
  zonenRegel: {
    name: string;
    az?: number;
    maxHoehe?: number;
    maxVollgeschosse?: number;
    grenzabstandKlein?: number;
    grenzabstandGross?: number;
  };
  raumprogramm: { typ: string; hnfSoll: number }[];
  gestaltung: {
    leitidee: string;
    material: string;
    dossier: { typ: 'do' | 'dont'; text: string }[];
  };
  geometrie: Record<string, unknown>;
}

export const SZENARIEN: Record<SimSzenario['key'], SimSzenario> = {
  umbau: {
    key: 'umbau',
    titel: 'Altbau-Sanierung Hohlstrasse, Zürich-Aussersihl',
    standort: {
      label: 'Hohlstrasse 42, Zürich-Aussersihl (Parzelle AS-2231)',
      lat: 47.3755,
      lon: 8.5217,
      e: 2_681_800,
      n: 1_247_800,
      hoeheM: 408,
    },
    parzelle: {
      outline: [
        { x: -2000, y: -1000 },
        { x: 14000, y: -1000 },
        { x: 14000, y: 7000 },
        { x: -2000, y: 7000 },
      ],
      maxHoehe: null,
      grenzabstand: null, // Blockrand: seitlich an Brandmauern, kein eigener Grenzabstand
    },
    zonenRegel: {
      name: 'Kernzone K2 (Zürich-Aussersihl, Bestandesschutz)',
      az: 2.0,
      maxHoehe: 18000,
      maxVollgeschosse: 5,
    },
    raumprogramm: [{ typ: 'preisguenstig', hnfSoll: 90 }],
    gestaltung: {
      leitidee: 'Entkernung im Erdgeschoss für einen offenen Wohn-/Essbereich, Gartenausgang mit neuer Terrasse.',
      material: 'Bestehendes Verputzmauerwerk ~1910, neue Gartenstützmauer in Sichtbeton.',
      dossier: [
        {
          typ: 'dont',
          text: 'Die denkmalgeschützte Fassade zur Hohlstrasse darf beim Umbau nicht verändert werden.',
        },
      ],
    },
    geometrie: {
      fussabdruck: { breite: 8000, tiefe: 6000 },
      gartenmauer: { a: { x: 12000, y: 1000 }, b: { x: 12000, y: 4500 } },
      terrain: {
        gewachsen: [
          { x: -2000, y: 0, z: 600 },
          { x: 13000, y: 0, z: -400 },
        ],
        neu: [
          { x: -2000, y: 0, z: 0 },
          { x: 13000, y: 0, z: 0 },
        ],
      },
    },
  },

  mfh: {
    key: 'mfh',
    titel: 'Ersatzneubau Zürich-Altstetten (MFH)',
    standort: {
      label: 'Zürich-Altstetten, Ersatzneubau-Parzelle',
      lat: 47.3866,
      lon: 8.4728,
      e: 2_678_000,
      n: 1_249_000,
      hoeheM: 400,
    },
    parzelle: {
      outline: [
        { x: -5000, y: -5000 },
        { x: 35000, y: -5000 },
        { x: 35000, y: 19000 },
        { x: -5000, y: 19000 },
      ],
      maxHoehe: null,
      grenzabstand: null,
    },
    zonenRegel: {
      name: 'W4 (Zürich-Altstetten)',
      az: 1.4,
      maxHoehe: 16000,
      maxVollgeschosse: 4,
      grenzabstandKlein: 4000,
      grenzabstandGross: 6000,
    },
    raumprogramm: [
      { typ: 'preisguenstig', hnfSoll: 300 },
      { typ: 'marktgerecht', hnfSoll: 190 },
    ],
    gestaltung: {
      leitidee: 'Regelgeschoss 30×14 m, zweibündig mit Mittelkorridor und zentralem Erschliessungskern.',
      material: 'Mineralisch verputzte Lochfassade auf Beton-Skelett, Balkone strassenabgewandt.',
      dossier: [
        { typ: 'do', text: 'Die Wohnungen sollen tageslichtorientiert um den Mittelkorridor verteilt werden.' },
      ],
    },
    geometrie: {
      regelgeschoss: { breite: 30000, tiefe: 14000 },
      korridor: { breite: 2000, abHoehe: 6000 },
    },
  },

  efh: {
    key: 'efh',
    titel: 'EFH Hanglage Emmental',
    standort: {
      label: 'Lauperswil, Hanglage Emmental',
      lat: 46.9372,
      lon: 7.7341,
      e: 2_622_500,
      n: 1_198_500,
      hoeheM: 700,
    },
    parzelle: {
      outline: [
        { x: 0, y: 0 },
        { x: 25000, y: 0 },
        { x: 25000, y: 20000 },
        { x: 0, y: 20000 },
      ],
      maxHoehe: null,
      grenzabstand: null,
    },
    zonenRegel: {
      name: 'W2 (Gemeinde Lauperswil)',
      az: 0.4,
      maxVollgeschosse: 2,
      grenzabstandKlein: 4000,
    },
    raumprogramm: [{ typ: 'eigenheim', hnfSoll: 160 }],
    gestaltung: {
      leitidee: 'Hangsprung: zwei versetzte Ebenen, die dem ~15 %-Gefälle nach Süden folgen, Split-Level-Treppe dazwischen.',
      material: 'Sichtbeton-Sockel im Hang, verputzte Holzelement-Obergeschosse, grosszügige Südverglasung.',
      dossier: [
        { typ: 'do', text: 'Die Südfassade erhält einen grossen Fensteranteil für passive Solargewinne.' },
        {
          typ: 'dont',
          text: 'Der Blick vom Nachbargrundstück ins Tal darf durch den Baukörper nicht verstellt werden.',
        },
      ],
    },
    geometrie: {
      ebenen: [
        { name: 'Unterer Split', hoeheM: 0 },
        { name: 'Oberer Split', hoeheM: 1500 },
      ],
      hangNeigungProzent: 15,
      hangRichtung: 'Süd',
    },
  },

  stadthaus: {
    key: 'stadthaus',
    titel: 'Reihenhaus-Lückenschluss Länggasse Bern',
    standort: {
      label: 'Länggasse, Bern',
      lat: 46.9529,
      lon: 7.4373,
      e: 2_599_900,
      n: 1_200_200,
      hoeheM: 550,
    },
    parzelle: {
      outline: [
        { x: 0, y: 0 },
        { x: 6000, y: 0 },
        { x: 6000, y: 18000 },
        { x: 0, y: 18000 },
      ],
      maxHoehe: null,
      grenzabstand: null, // beidseitig Brandmauern — kein eigener Grenzabstand nötig
    },
    zonenRegel: {
      name: 'Kernzone K3 (Länggasse Bern)',
      az: 2.2,
      maxVollgeschosse: 4,
    },
    raumprogramm: [{ typ: 'eigenheim', hnfSoll: 220 }],
    gestaltung: {
      leitidee: 'Vertikale Erschliessung im schmalen 6×18-m-Lückenschluss zwischen zwei Brandmauern, 4 Vollgeschosse.',
      material: 'Berner-Sandstein-Sockel, verputzte Lochfassade mit Klappläden zur Strasse.',
      dossier: [
        { typ: 'do', text: 'Die Traufhöhe schliesst an die beiden Nachbarhäuser an.' },
        { typ: 'dont', text: 'Die Fassadenflucht zur Strasse darf nicht zurückversetzt werden.' },
      ],
    },
    geometrie: { breite: 6000, tiefe: 18000, geschosse: 4 },
  },

  blockrand: {
    key: 'blockrand',
    titel: 'Blockrandschliessung Basel-Matthäus',
    standort: {
      label: 'Basel-Matthäus, Blockrandschliessung',
      lat: 47.5701,
      lon: 7.5915,
      e: 2_611_500,
      n: 1_268_700,
      hoeheM: 260,
    },
    parzelle: {
      outline: [
        { x: 0, y: 0 },
        { x: 20000, y: 0 },
        { x: 20000, y: 8000 },
        { x: 8000, y: 8000 },
        { x: 8000, y: 16000 },
        { x: 0, y: 16000 },
      ],
      maxHoehe: null,
      grenzabstand: null, // Grenzabstand kommt bewusst aus der Zonenregel (Regressions-Anker 153)
    },
    zonenRegel: {
      name: 'Wohn- und Geschäftszone WGZ3 (Basel-Matthäus)',
      az: 1.8,
      maxVollgeschosse: 5,
      grenzabstandKlein: 3000,
      grenzabstandGross: 12000,
    },
    raumprogramm: [{ typ: 'marktgerecht', hnfSoll: 450 }],
    gestaltung: {
      leitidee: 'L-förmige Ecklücke schliesst die Blockrand-Fluchtlinie zur Strasse; die Hoffassade tritt hinter grossem Grenzabstand zurück.',
      material: 'Basler Wettsteinstein-Sockel, Klinker-Lochfassade zur Strasse, verputzte Hoffassade.',
      dossier: [
        { typ: 'do', text: 'Die Traufkante der beiden Nachbarblöcke wird beidseitig aufgenommen.' },
        {
          typ: 'dont',
          text: 'Die Hoffassade darf den vorgeschriebenen grossen Grenzabstand zur Nachbarparzelle nicht unterschreiten.',
        },
      ],
    },
    geometrie: {
      lFoermig: true,
      schenkelStrasse: { breite: 20000, tiefe: 8000 },
      schenkelHof: { breite: 8000, tiefe: 8000 },
    },
  },

  hochhaus: {
    key: 'hochhaus',
    titel: 'Punkthochhaus Zürich-West (Hardturm)',
    standort: {
      label: 'Hardturm, Zürich-West',
      lat: 47.3914,
      lon: 8.5155,
      e: 2_681_300,
      n: 1_249_500,
      hoeheM: 410,
    },
    parzelle: {
      outline: [
        { x: 0, y: 0 },
        { x: 40000, y: 0 },
        { x: 40000, y: 40000 },
        { x: 0, y: 40000 },
      ],
      maxHoehe: null,
      grenzabstand: null,
    },
    zonenRegel: {
      name: 'Zentrumszone Zürich-West (Hardturm-Hochhausgebiet)',
      az: 3.0,
      maxHoehe: 45000,
      maxVollgeschosse: 14,
      grenzabstandKlein: 6000,
      grenzabstandGross: 10000,
    },
    raumprogramm: [{ typ: 'marktgerecht', hnfSoll: 3600 }],
    gestaltung: {
      leitidee: 'Skelett-Punkthochhaus im Raster 8.4 m: der Kern trägt die Erschliessung, die Fassade ist ringsum gleich orientiert.',
      material: 'Sichtbeton-Skelett mit vorgehängter Glas-Metall-Fassade.',
      dossier: [
        { typ: 'do', text: 'Das Erdgeschoss bleibt publikumsorientiert und transparent zur Strasse.' },
        { typ: 'dont', text: 'Die Kernachse darf nicht ausserhalb des 8.4-m-Rasters zu liegen kommen.' },
      ],
    },
    geometrie: { raster: 8400, geschosseGeplant: 12 },
  },
};
