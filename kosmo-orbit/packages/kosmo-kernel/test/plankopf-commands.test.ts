import { describe, expect, it } from 'vitest';
import {
  CommandError,
  History,
  KosmoDoc,
  defaultSettings,
  execute,
  type ImageAsset,
  type Sheet,
} from '../src';

/**
 * v0.8.0 P2 — Datenmodell-Delta + drei neue publish-Commands (Guard-Phase):
 * `Sheet.plankopf`/`Sheet.layout` (`model/entities.ts`), `DocSettings.buero`
 * + `ProjektInfo.projektCode` (`model/doc.ts`), `publish.plankopfSetzen`/
 * `publish.blattLayoutSetzen`/`publish.bueroSetzen` (`commands/publish.ts`)
 * und die additive `design.projektInfoSetzen`-Erweiterung. Alles optional —
 * das eigentliche Zeichnen des Kopfstempels/Layouts folgt in einem späteren
 * `derive/`-Paket, hier nur die Datenhaltung + der Byte-Guard.
 */

/** Mini-1×1-PNG (aus test/haerte.test.ts wiederverwendet). */
const MINI_PNG_DATA_URL =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';

/** Beliebiges Mini-JPEG-artiges data-url (Base64-Inhalt ist irrelevant — nur
 * der mime-Teil zählt für den PNG-Guard). */
const FAKE_JPEG_DATA_URL = 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEAAAAAAAD/2wBD';

function neuesBlatt(): { doc: KosmoDoc; sheetId: string } {
  const doc = new KosmoDoc();
  const r = execute(doc, 'publish.blattErstellen', { name: 'Blatt 1', format: 'A1', orientation: 'quer' });
  const sheetId = (r.patches[0] as { id: string }).id;
  return { doc, sheetId };
}

describe('publish.plankopfSetzen', () => {
  it('lehnt ein unbekanntes Blatt ab', () => {
    const doc = new KosmoDoc();
    expect(() => execute(doc, 'publish.plankopfSetzen', { sheetId: 'x', patch: {} })).toThrow(CommandError);
  });

  it('lehnt einen falschen Feldtyp im patch ab (Schema-Validierung)', () => {
    const { doc, sheetId } = neuesBlatt();
    expect(() =>
      execute(doc, 'publish.plankopfSetzen', { sheetId, patch: { inhalt: 42 } }),
    ).toThrowError(/Ungültige Parameter/);
  });

  it('lehnt ein fehlendes sheetId ab (Schema-Validierung)', () => {
    const { doc } = neuesBlatt();
    expect(() => execute(doc, 'publish.plankopfSetzen', { patch: {} })).toThrowError(/Ungültige Parameter/);
  });

  it('setzt neue Felder additiv (Merge über mehrere Aufrufe)', () => {
    const { doc, sheetId } = neuesBlatt();
    execute(doc, 'publish.plankopfSetzen', { sheetId, patch: { inhalt: 'Grundriss EG', planNummer: 'A-101' } });
    expect(doc.get<Sheet>(sheetId)!.plankopf).toEqual({ inhalt: 'Grundriss EG', planNummer: 'A-101' });

    // Zweiter Aufruf ergänzt nur `disziplin` — die ersten beiden Felder bleiben stehen.
    execute(doc, 'publish.plankopfSetzen', { sheetId, patch: { disziplin: 'Architektur' } });
    expect(doc.get<Sheet>(sheetId)!.plankopf).toEqual({
      inhalt: 'Grundriss EG',
      planNummer: 'A-101',
      disziplin: 'Architektur',
    });

    // Dritter Aufruf überschreibt `planNummer` gezielt, lässt den Rest stehen.
    execute(doc, 'publish.plankopfSetzen', { sheetId, patch: { planNummer: 'A-102' } });
    expect(doc.get<Sheet>(sheetId)!.plankopf).toEqual({
      inhalt: 'Grundriss EG',
      planNummer: 'A-102',
      disziplin: 'Architektur',
    });
  });

  it('ein Feld mit explizitem undefined im patch löscht es wieder', () => {
    const { doc, sheetId } = neuesBlatt();
    execute(doc, 'publish.plankopfSetzen', {
      sheetId,
      patch: { inhalt: 'Grundriss EG', planNummer: 'A-101', gezeichnet: 'AB' },
    });
    execute(doc, 'publish.plankopfSetzen', { sheetId, patch: { planNummer: undefined } });
    expect(doc.get<Sheet>(sheetId)!.plankopf).toEqual({ inhalt: 'Grundriss EG', gezeichnet: 'AB' });
    expect(doc.get<Sheet>(sheetId)!.plankopf).not.toHaveProperty('planNummer');
  });

  it('summarize nennt Blattname + geänderte Felder, leeres patch meldet «keine Änderung»', () => {
    const { doc, sheetId } = neuesBlatt();
    const r = execute(doc, 'publish.plankopfSetzen', { sheetId, patch: { inhalt: 'Grundriss EG', datum: '14.07.2026' } });
    expect(r.summary).toContain('Blatt 1');
    expect(r.summary).toContain('inhalt');
    expect(r.summary).toContain('datum');

    const r2 = execute(doc, 'publish.plankopfSetzen', { sheetId, patch: {} });
    expect(r2.summary).toBe('Plankopf «Blatt 1»: keine Änderung');
  });

  it('Undo macht den kompletten Plankopf-Patch in einem Schritt rückgängig', () => {
    const { doc, sheetId } = neuesBlatt();
    const history = new History();
    const vorher = doc.get<Sheet>(sheetId)!;
    expect(vorher.plankopf).toBeUndefined();

    const r = execute(doc, 'publish.plankopfSetzen', { sheetId, patch: { inhalt: 'Grundriss EG', geprueft: 'CD' } });
    history.record(r.patches);
    expect(r.patches).toHaveLength(1);
    expect(doc.get<Sheet>(sheetId)!.plankopf).toEqual({ inhalt: 'Grundriss EG', geprueft: 'CD' });

    history.undo(doc);
    expect(doc.get<Sheet>(sheetId)!).toEqual(vorher);
  });
});

describe('publish.blattLayoutSetzen', () => {
  it('lehnt ein unbekanntes Blatt ab', () => {
    const doc = new KosmoDoc();
    expect(() => execute(doc, 'publish.blattLayoutSetzen', { sheetId: 'x', patch: {} })).toThrow(CommandError);
  });

  it('lehnt einen falschen Feldtyp im patch ab (Schema-Validierung)', () => {
    const { doc, sheetId } = neuesBlatt();
    expect(() =>
      execute(doc, 'publish.blattLayoutSetzen', { sheetId, patch: { heftrand: 'ja' } }),
    ).toThrowError(/Ungültige Parameter/);
  });

  it('setzt/mergt boolesche Layout-Schalter additiv', () => {
    const { doc, sheetId } = neuesBlatt();
    execute(doc, 'publish.blattLayoutSetzen', { sheetId, patch: { heftrand: true, nordpfeil: true } });
    expect(doc.get<Sheet>(sheetId)!.layout).toEqual({ heftrand: true, nordpfeil: true });

    execute(doc, 'publish.blattLayoutSetzen', { sheetId, patch: { faltmarken: true } });
    expect(doc.get<Sheet>(sheetId)!.layout).toEqual({ heftrand: true, nordpfeil: true, faltmarken: true });

    execute(doc, 'publish.blattLayoutSetzen', { sheetId, patch: { heftrand: false } });
    expect(doc.get<Sheet>(sheetId)!.layout).toEqual({ heftrand: false, nordpfeil: true, faltmarken: true });
  });

  it('ein Feld mit explizitem undefined im patch löscht den Schalter wieder', () => {
    const { doc, sheetId } = neuesBlatt();
    execute(doc, 'publish.blattLayoutSetzen', {
      sheetId,
      patch: { heftrand: true, wasserzeichen: true, massstabsbalken: true },
    });
    execute(doc, 'publish.blattLayoutSetzen', { sheetId, patch: { wasserzeichen: undefined } });
    expect(doc.get<Sheet>(sheetId)!.layout).toEqual({ heftrand: true, massstabsbalken: true });
    expect(doc.get<Sheet>(sheetId)!.layout).not.toHaveProperty('wasserzeichen');
  });

  it('summarize nennt Blattname + geänderte Felder', () => {
    const { doc, sheetId } = neuesBlatt();
    const r = execute(doc, 'publish.blattLayoutSetzen', { sheetId, patch: { heftrand: true } });
    expect(r.summary).toBe('Layout «Blatt 1»: heftrand');
  });

  it('Undo macht den Layout-Patch in einem Schritt rückgängig', () => {
    const { doc, sheetId } = neuesBlatt();
    const history = new History();
    const vorher = doc.get<Sheet>(sheetId)!;

    const r = execute(doc, 'publish.blattLayoutSetzen', { sheetId, patch: { massstabsbalken: true, nordpfeil: true } });
    history.record(r.patches);
    expect(r.patches).toHaveLength(1);

    history.undo(doc);
    expect(doc.get<Sheet>(sheetId)!).toEqual(vorher);
  });
});

describe('publish.bueroSetzen', () => {
  it('mergt Name/Adresse/Kürzel additiv, ohne Logo', () => {
    const doc = new KosmoDoc();
    expect(doc.settings.buero).toBeUndefined();

    execute(doc, 'publish.bueroSetzen', { name: 'Baubüro Andrin' });
    expect(doc.settings.buero).toEqual({ name: 'Baubüro Andrin' });

    execute(doc, 'publish.bueroSetzen', { adresse: 'Ahornweg 12, 6000 Luzern', kuerzel: 'BBA' });
    expect(doc.settings.buero).toEqual({
      name: 'Baubüro Andrin',
      adresse: 'Ahornweg 12, 6000 Luzern',
      kuerzel: 'BBA',
    });
  });

  it('leerer Aufruf ändert nichts, summarize meldet «keine Änderung»', () => {
    const doc = new KosmoDoc();
    const r = execute(doc, 'publish.bueroSetzen', {});
    expect(r.summary).toBe('Büro: keine Änderung');
    expect(doc.settings.buero).toEqual({});
  });

  it('PNG-Logo: legt ein ImageAsset an und setzt logoAssetId', () => {
    const doc = new KosmoDoc();
    const r = execute(doc, 'publish.bueroSetzen', { name: 'Baubüro Andrin', logoDataUrl: MINI_PNG_DATA_URL });
    expect(r.summary).toContain('Name');
    expect(r.summary).toContain('Logo aktualisiert');

    const buero = doc.settings.buero!;
    expect(buero.logoAssetId).toBeDefined();
    const asset = doc.get<ImageAsset>(buero.logoAssetId!);
    expect(asset).toBeDefined();
    expect(asset!.kind).toBe('imageasset');
    expect(asset!.mime).toBe('image/png');
    expect(asset!.width).toBe(1);
    expect(asset!.height).toBe(1);
  });

  it('Nicht-PNG-Logo wird mit ehrlicher Fehlermeldung abgelehnt', () => {
    const doc = new KosmoDoc();
    expect(() => execute(doc, 'publish.bueroSetzen', { logoDataUrl: FAKE_JPEG_DATA_URL })).toThrowError(
      /PNG erforderlich/,
    );
    // Kein halber Zustand — weder Asset noch buero-Feld entstehen bei Ablehnung.
    expect(doc.settings.buero).toBeUndefined();
    expect(doc.byKind('imageasset')).toHaveLength(0);
  });

  it('eine kaputte data-url wirft einen CommandError', () => {
    const doc = new KosmoDoc();
    expect(() => execute(doc, 'publish.bueroSetzen', { logoDataUrl: 'nicht-einmal-eine-data-url' })).toThrow(
      CommandError,
    );
  });

  it('ein neues Logo entsorgt den alten Asset, wenn ihn sonst niemand mehr referenziert', () => {
    const doc = new KosmoDoc();
    execute(doc, 'publish.bueroSetzen', { logoDataUrl: MINI_PNG_DATA_URL });
    const alterAssetId = doc.settings.buero!.logoAssetId!;
    expect(doc.get<ImageAsset>(alterAssetId)).toBeDefined();

    execute(doc, 'publish.bueroSetzen', { logoDataUrl: MINI_PNG_DATA_URL });
    const neuerAssetId = doc.settings.buero!.logoAssetId!;
    expect(neuerAssetId).not.toBe(alterAssetId);
    expect(doc.get<ImageAsset>(alterAssetId)).toBeUndefined(); // GC gelöscht
    expect(doc.get<ImageAsset>(neuerAssetId)).toBeDefined();
  });

  it('GC-Schutz: der alte Logo-Asset bleibt erhalten, wenn ihn noch ein Bild-Slot referenziert', () => {
    const doc = new KosmoDoc();
    execute(doc, 'publish.bueroSetzen', { logoDataUrl: MINI_PNG_DATA_URL });
    const logoAssetId = doc.settings.buero!.logoAssetId!;

    const blatt = execute(doc, 'publish.blattErstellen', { name: 'Deckblatt', format: 'A3', orientation: 'hoch' });
    const sheetId = (blatt.patches[0] as { id: string }).id;
    execute(doc, 'publish.bildPlatzieren', { sheetId, x: 10, y: 10, w: 100 }); // leerer Slot
    const sheet = doc.get<Sheet>(sheetId)!;
    // Slot direkt auf den Logo-Asset umbiegen — Blatt und Büro referenzieren
    // jetzt denselben ImageAsset (Wiederverwendung desselben Bilds im Plansatz).
    doc.apply([
      { id: sheetId, before: sheet, after: { ...sheet, bilder: [{ ...sheet.bilder![0]!, assetId: logoAssetId }] } },
    ]);
    expect(doc.get<Sheet>(sheetId)!.bilder![0]!.assetId).toBe(logoAssetId);

    // Neues Logo setzen — der alte (jetzt vom Blatt mitbenutzte) Asset MUSS bleiben.
    execute(doc, 'publish.bueroSetzen', { logoDataUrl: MINI_PNG_DATA_URL });
    expect(doc.get<ImageAsset>(logoAssetId)).toBeDefined();
    expect(doc.get<Sheet>(sheetId)!.bilder![0]!.assetId).toBe(logoAssetId);
  });

  it('GC-Schutz umgekehrt: publish.bildEntfernen lässt den Asset stehen, wenn er noch das Büro-Logo ist', () => {
    const doc = new KosmoDoc();
    execute(doc, 'publish.bueroSetzen', { logoDataUrl: MINI_PNG_DATA_URL });
    const logoAssetId = doc.settings.buero!.logoAssetId!;

    const blatt = execute(doc, 'publish.blattErstellen', { name: 'Deckblatt', format: 'A3', orientation: 'hoch' });
    const sheetId = (blatt.patches[0] as { id: string }).id;
    execute(doc, 'publish.bildPlatzieren', { sheetId, x: 10, y: 10, w: 100 });
    const sheet = doc.get<Sheet>(sheetId)!;
    const bildId = sheet.bilder![0]!.id;
    // Slot manuell auf den Logo-Asset umbiegen, statt ihn erneut hochzuladen.
    doc.apply([{ id: sheetId, before: sheet, after: { ...sheet, bilder: [{ ...sheet.bilder![0]!, assetId: logoAssetId }] } }]);

    execute(doc, 'publish.bildEntfernen', { sheetId, bildId });
    expect(doc.get<Sheet>(sheetId)!.bilder).toHaveLength(0);
    // Logo-Asset bleibt, weil settings.buero.logoAssetId ihn noch braucht.
    expect(doc.get<ImageAsset>(logoAssetId)).toBeDefined();
    expect(doc.settings.buero!.logoAssetId).toBe(logoAssetId);
  });

  it('Undo macht bueroSetzen (inkl. angelegtem Logo-Asset) in einem Schritt rückgängig', () => {
    const doc = new KosmoDoc();
    const history = new History();
    expect(doc.settings.buero).toBeUndefined();

    const r = execute(doc, 'publish.bueroSetzen', { name: 'Baubüro Andrin', logoDataUrl: MINI_PNG_DATA_URL });
    history.record(r.patches);
    expect(r.patches).toHaveLength(2); // Asset-Patch + Settings-Patch
    const assetId = doc.settings.buero!.logoAssetId!;
    expect(doc.get<ImageAsset>(assetId)).toBeDefined();

    history.undo(doc);
    // «Leerer» Absenz-Wert `{}` (wie bei `design.projektInfoSetzen`s
    // `vorher`), nicht `undefined` — das Feld existierte vor diesem Aufruf
    // schlicht noch nicht, das Undo-Patch trägt trotzdem einen konkreten Wert.
    expect(doc.settings.buero).toEqual({});
    expect(doc.get<ImageAsset>(assetId)).toBeUndefined();
  });
});

describe('design.projektInfoSetzen — projektCode (v0.8.0 P2)', () => {
  it('mergt projektCode additiv, andere Stammdaten-Felder bleiben stehen', () => {
    const doc = new KosmoDoc();
    execute(doc, 'design.projektInfoSetzen', { bauherr: 'Baugenossenschaft Ahorn' });
    execute(doc, 'design.projektInfoSetzen', { projektCode: 'BG-2026-014' });
    expect(doc.settings.projekt).toEqual({
      bauherr: 'Baugenossenschaft Ahorn',
      projektCode: 'BG-2026-014',
    });

    const r = execute(doc, 'design.projektInfoSetzen', { projektCode: 'BG-2026-099' });
    expect(doc.settings.projekt!.projektCode).toBe('BG-2026-099');
    expect(r.summary).toContain('Code');
  });

  it('Undo macht die projektCode-Änderung rückgängig', () => {
    const doc = new KosmoDoc();
    const history = new History();
    execute(doc, 'design.projektInfoSetzen', { bauherr: 'Baugenossenschaft Ahorn' });
    const vorher = { ...doc.settings.projekt };

    const r = execute(doc, 'design.projektInfoSetzen', { projektCode: 'BG-2026-014' });
    history.record(r.patches);
    expect(doc.settings.projekt!.projektCode).toBe('BG-2026-014');

    history.undo(doc);
    expect(doc.settings.projekt).toEqual(vorher);
  });
});

describe('Guard: ohne v0.8.0-Daten bleibt die Serialisierung unverändert', () => {
  it('defaultSettings trägt kein buero-Feld', () => {
    expect(defaultSettings).not.toHaveProperty('buero');
    expect(Object.keys(defaultSettings)).not.toContain('buero');
  });

  it('ein frisches Blatt ohne plankopf/layout serialisiert ohne diese Schlüssel', () => {
    const { doc, sheetId } = neuesBlatt();
    const json = doc.toJSON();
    const sheet = json.entities.find((e) => e.id === sheetId)!;
    expect(sheet).not.toHaveProperty('plankopf');
    expect(sheet).not.toHaveProperty('layout');
    expect(Object.keys(sheet).sort()).toEqual(
      ['id', 'kind', 'name', 'format', 'orientation', 'index', 'placements'].sort(),
    );
  });

  it('ein Doc ohne plankopf/layout/buero/projektCode serialisiert byte-gleich (kein neuer Schlüssel im JSON)', () => {
    const doc = new KosmoDoc();
    execute(doc, 'publish.blattErstellen', { name: 'Blatt 1', format: 'A1', orientation: 'quer' });
    execute(doc, 'design.projektInfoSetzen', { bauherr: 'Baugenossenschaft Ahorn', verfasser: 'Baubüro Andrin' });

    const text = JSON.stringify(doc.toJSON());
    expect(text).not.toContain('plankopf');
    expect(text).not.toContain('"layout"');
    expect(text).not.toContain('buero');
    expect(text).not.toContain('projektCode');
  });

  it('.kosmo-Roundtrip: gesetzte plankopf/layout/buero/projektCode-Felder bleiben nach fromJSON(toJSON()) erhalten', () => {
    const doc = new KosmoDoc();
    const blatt = execute(doc, 'publish.blattErstellen', { name: 'Blatt 1', format: 'A1', orientation: 'quer' });
    const sheetId = (blatt.patches[0] as { id: string }).id;
    execute(doc, 'publish.plankopfSetzen', { sheetId, patch: { inhalt: 'Grundriss EG', planNummer: 'A-101' } });
    execute(doc, 'publish.blattLayoutSetzen', { sheetId, patch: { heftrand: true, nordpfeil: true } });
    execute(doc, 'publish.bueroSetzen', { name: 'Baubüro Andrin', logoDataUrl: MINI_PNG_DATA_URL });
    execute(doc, 'design.projektInfoSetzen', { projektCode: 'BG-2026-014' });

    const wieder = KosmoDoc.fromJSON(JSON.parse(JSON.stringify(doc.toJSON())));
    const sheet = wieder.get<Sheet>(sheetId)!;
    expect(sheet.plankopf).toEqual({ inhalt: 'Grundriss EG', planNummer: 'A-101' });
    expect(sheet.layout).toEqual({ heftrand: true, nordpfeil: true });
    expect(wieder.settings.buero?.name).toBe('Baubüro Andrin');
    expect(wieder.settings.buero?.logoAssetId).toBeDefined();
    expect(wieder.get<ImageAsset>(wieder.settings.buero!.logoAssetId!)).toBeDefined();
    expect(wieder.settings.projekt?.projektCode).toBe('BG-2026-014');
  });
});
