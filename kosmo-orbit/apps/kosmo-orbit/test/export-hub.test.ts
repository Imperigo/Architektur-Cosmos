import { describe, expect, it } from 'vitest';
import {
  base64ZuBytes,
  exportHubEintraege,
  EXPORT_STATUS_LABEL,
  logoDateiendung,
} from '../src/modules/paket/export-hub';

describe('Export-Hub (v0.8.1 / P14, docs/V081-SPEZ.md §7(e)/§9 C-28/C-30): sechs reale Formate, ehrlicher Status', () => {
  it('zeigt GENAU sechs Formate in vier Gruppen (keine 27-Format-Kachel-Wand)', () => {
    const eintraege = exportHubEintraege({ hatAktivesGeschoss: false, logoMime: undefined });
    expect(eintraege).toHaveLength(6);
    expect(eintraege.map((e) => e.id).sort()).toEqual(
      ['buero-logo', 'modell-ifc', 'plan-dxf', 'plan-pdf', 'plan-svg', 'punktwolke-splat'].sort(),
    );
    expect(new Set(eintraege.map((e) => e.gruppe))).toEqual(new Set(['plan', 'modell', 'punktwolke', 'logo']));
  });

  it('Plan-Export (PDF/SVG/DXF) braucht ein aktives Geschoss — ohne es «braucht-kontext», mit ihm «verfügbar»', () => {
    const ohne = exportHubEintraege({ hatAktivesGeschoss: false, logoMime: undefined });
    for (const id of ['plan-pdf', 'plan-svg', 'plan-dxf'] as const) {
      const e = ohne.find((x) => x.id === id)!;
      expect(e.status).toBe('braucht-kontext');
      expect(e.hinweis.length).toBeGreaterThan(10);
    }
    const mit = exportHubEintraege({ hatAktivesGeschoss: true, logoMime: undefined });
    for (const id of ['plan-pdf', 'plan-svg', 'plan-dxf'] as const) {
      expect(mit.find((x) => x.id === id)!.status).toBe('verfuegbar');
    }
  });

  it('Modell-Export (IFC) ist immer verfügbar — keine Kontext-Abhängigkeit', () => {
    const eintraege = exportHubEintraege({ hatAktivesGeschoss: false, logoMime: undefined });
    expect(eintraege.find((e) => e.id === 'modell-ifc')!.status).toBe('verfuegbar');
  });

  it('Punktwolken-Export (Splat) ist immer «braucht-kontext» — der Hub hat keinen Zugriff auf den Laufzeit-Zustand', () => {
    const eintraege = exportHubEintraege({ hatAktivesGeschoss: true, logoMime: 'image/jpeg' });
    const splat = eintraege.find((e) => e.id === 'punktwolke-splat')!;
    expect(splat.status).toBe('braucht-kontext');
    expect(splat.hinweis).toMatch(/Design-Werkzeug|Splat-Werkzeug/);
  });

  it('Logo-Export spiegelt das echte Asset-Mime (SVG oder JPG) — kein Logo gesetzt bleibt ehrlich «braucht-kontext»', () => {
    const kein = exportHubEintraege({ hatAktivesGeschoss: false, logoMime: undefined });
    const keinLogo = kein.find((e) => e.id === 'buero-logo')!;
    expect(keinLogo.status).toBe('braucht-kontext');
    expect(keinLogo.formatLabel).toBe('SVG/JPG');

    const mitJpg = exportHubEintraege({ hatAktivesGeschoss: false, logoMime: 'image/jpeg' });
    const jpgLogo = mitJpg.find((e) => e.id === 'buero-logo')!;
    expect(jpgLogo.status).toBe('verfuegbar');
    expect(jpgLogo.formatLabel).toBe('JPG');

    const mitSvg = exportHubEintraege({ hatAktivesGeschoss: false, logoMime: 'image/svg+xml' });
    const svgLogo = mitSvg.find((e) => e.id === 'buero-logo')!;
    expect(svgLogo.status).toBe('verfuegbar');
    expect(svgLogo.formatLabel).toBe('SVG');
  });

  it('jeder Eintrag trägt einen nichtleeren, ehrlichen Hinweistext (nie ein stiller toter Button)', () => {
    for (const ctx of [
      { hatAktivesGeschoss: false, logoMime: undefined },
      { hatAktivesGeschoss: true, logoMime: 'image/jpeg' },
    ]) {
      for (const e of exportHubEintraege(ctx)) {
        expect(e.hinweis.trim().length, e.id).toBeGreaterThan(10);
      }
    }
  });

  it('EXPORT_STATUS_LABEL deckt alle drei Status-Stufen ab (verfügbar/braucht Kontext/HomeStation-Grenze)', () => {
    expect(EXPORT_STATUS_LABEL.verfuegbar).toBe('Verfügbar');
    expect(EXPORT_STATUS_LABEL['braucht-kontext']).toBe('Braucht Kontext');
    expect(EXPORT_STATUS_LABEL['homestation-grenze']).toBe('HomeStation-Grenze');
  });

  it('base64ZuBytes ist der exakte Kehrwert von btoa — Rundreise ohne Verlust', () => {
    const text = 'Kosmo-Logo-Bytes 123 äöü';
    const b64 = btoa(unescape(encodeURIComponent(text)));
    const bytes = base64ZuBytes(b64);
    const zurueck = decodeURIComponent(escape(String.fromCharCode(...bytes)));
    expect(zurueck).toBe(text);
  });

  it('logoDateiendung erkennt SVG/JPG korrekt, Fallback für Unbekanntes', () => {
    expect(logoDateiendung('image/svg+xml')).toBe('svg');
    expect(logoDateiendung('image/jpeg')).toBe('jpg');
    expect(logoDateiendung('image/png')).toBe('bin');
  });
});
