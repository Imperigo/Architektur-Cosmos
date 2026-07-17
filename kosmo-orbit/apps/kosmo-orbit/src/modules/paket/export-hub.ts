/**
 * Export-Hub — reine Zuordnungslogik (v0.8.1 / P14, `docs/V081-SPEZ.md`
 * §7(e)/§9 C-28/C-30, «27-Formate-Export-Hub» → korrigiert auf die
 * ECHTEN sechs Formate). Kein Duplikat der Export-Wege selbst: dieses Modul
 * beschreibt nur, WELCHE sechs realen Formate der Hub zeigt, in welcher
 * Gruppe, und ob der aktuelle Doc-/Laufzeit-Zustand einen Klick JETZT
 * ehrlich zulässt — jede Export-AUSFÜHRUNG bleibt bei den bestehenden
 * Funktionen (`modules/design/export-plan.ts` PDF/SVG/DXF/IFC,
 * `state/kxp-io.ts` `.kxp`), hier NUR gelesen/aufgerufen.
 *
 * Owner-Entscheid 6 (Ehrlichkeit vor Politur): der ursprüngliche Prototyp
 * zeigte 27 Formate in 6 Kategorien, von denen 21 keinen echten Exportweg
 * hatten (s. `PublishWorkspace.tsx`s P8-Kommentar «Export-Hub ehrlich»,
 * `docs/V081-SPEZ.md` §7(e)). Dieser Hub zeigt AUSSCHLIESSLICH die sechs
 * real existierenden Formate: PDF/SVG/DXF (Plan-Export, `export-plan.ts`),
 * IFC (Modell-Export), Splat (Punktwolken-Export), Büro-Logo als SVG/JPG
 * (Logo-Export, `publish.bueroSetzen`) — keine Kachel ohne echten Weg
 * dahinter.
 */

export type ExportGruppe = 'plan' | 'modell' | 'punktwolke' | 'logo';

export type ExportFormatId =
  | 'plan-pdf'
  | 'plan-svg'
  | 'plan-dxf'
  | 'modell-ifc'
  | 'punktwolke-splat'
  | 'buero-logo';

/**
 * Ehrlicher Status je Format (Bau-Auftrag P14, wörtlich: «verfügbar/braucht
 * Kontext/HomeStation-Grenze»). Dieser Hub kennt heute keine echte
 * HomeStation-Grenze (alle sechs Formate sind reiner Browser-Code) — die
 * dritte Stufe bleibt im Typ, falls ein künftiges Format sie braucht,
 * statt sie stillschweigend wegzulassen.
 */
export type ExportFormatStatus = 'verfuegbar' | 'braucht-kontext' | 'homestation-grenze';

export interface ExportFormatEintrag {
  id: ExportFormatId;
  gruppe: ExportGruppe;
  gruppenTitel: string;
  /** Artefakt-Bezeichnung, z. B. «Grundriss», «Modell», «Punktwolke», «Büro-Logo». */
  titel: string;
  /** Dateiformat-Label, z. B. «PDF», «SVG», «DXF», «IFC», «Splat», «JPG». */
  formatLabel: string;
  status: ExportFormatStatus;
  /** Immer sichtbarer, ehrlicher Statustext (kein stiller toter Button). */
  hinweis: string;
}

const GRUPPEN_TITEL: Record<ExportGruppe, string> = {
  plan: 'Plan-Export',
  modell: 'Modell-Export',
  punktwolke: 'Punktwolken-Export',
  logo: 'Logo-Export',
};

export interface ExportHubKontext {
  /** `useProject.getState().activeStoreyId !== null` — Plan-Export (PDF/SVG/DXF)
   *  braucht ein aktives Geschoss (s. `exportPlanPdf`/`exportPlanSvg`/`exportPlanDxf`). */
  hatAktivesGeschoss: boolean;
  /** `doc.settings.buero?.logoAssetId`-Asset-Mime, falls gesetzt (SVG oder JPG). */
  logoMime: string | undefined;
}

/**
 * Splat-Punktwolken leben als Laufzeit-State INNERHALB von KosmoDesign
 * (`Viewport3D.tsx`s modulinternes `splatCloud`, kein globaler Store) —
 * dieser Hub hat bewusst KEINEN Lesezugriff darauf (Dateikreis-Grenze:
 * `modules/design/Viewport3D.tsx`/`SplatPanel.tsx` bleiben unangetastet).
 * Ehrlich: das ist immer «braucht Kontext», nie «verfügbar» — der Hub bietet
 * stattdessen einen echten Sprung zum Splat-Werkzeug an (kein toter Klick).
 */
export function exportHubEintraege(ctx: ExportHubKontext): ExportFormatEintrag[] {
  const planStatus: ExportFormatStatus = ctx.hatAktivesGeschoss ? 'verfuegbar' : 'braucht-kontext';
  const planHinweis = ctx.hatAktivesGeschoss
    ? 'Aktives Geschoss vorhanden — Export bereit.'
    : 'Braucht ein aktives Geschoss — in KosmoDesign zuerst ein Geschoss wählen.';

  const logoFormatLabel = ctx.logoMime === 'image/jpeg' ? 'JPG' : ctx.logoMime === 'image/svg+xml' ? 'SVG' : 'SVG/JPG';
  const logoStatus: ExportFormatStatus = ctx.logoMime ? 'verfuegbar' : 'braucht-kontext';
  const logoHinweis = ctx.logoMime
    ? `Büro-Logo gesetzt (${logoFormatLabel}) — Export bereit.`
    : 'Kein Büro-Logo gesetzt — in KosmoPublish (Plankopf) zuerst ein Logo laden (SVG oder JPG).';

  const splatHinweis =
    'Die geladene Punktwolke lebt im Design-Werkzeug (kein globaler Zustand) — dort öffnet sich das Splat-Werkzeug mit dem echten Export-Knopf.';

  return [
    {
      id: 'plan-pdf',
      gruppe: 'plan',
      gruppenTitel: GRUPPEN_TITEL.plan,
      titel: 'Grundriss',
      formatLabel: 'PDF',
      status: planStatus,
      hinweis: planHinweis,
    },
    {
      id: 'plan-svg',
      gruppe: 'plan',
      gruppenTitel: GRUPPEN_TITEL.plan,
      titel: 'Grundriss',
      formatLabel: 'SVG',
      status: planStatus,
      hinweis: planHinweis,
    },
    {
      id: 'plan-dxf',
      gruppe: 'plan',
      gruppenTitel: GRUPPEN_TITEL.plan,
      titel: 'Grundriss',
      formatLabel: 'DXF',
      status: planStatus,
      hinweis: planHinweis,
    },
    {
      id: 'modell-ifc',
      gruppe: 'modell',
      gruppenTitel: GRUPPEN_TITEL.modell,
      titel: 'Modell',
      formatLabel: 'IFC',
      status: 'verfuegbar',
      hinweis: 'Immer verfügbar — exportiert den laufenden Modellstand als IFC4.',
    },
    {
      id: 'punktwolke-splat',
      gruppe: 'punktwolke',
      gruppenTitel: GRUPPEN_TITEL.punktwolke,
      titel: 'Punktwolke',
      formatLabel: 'Splat',
      status: 'braucht-kontext',
      hinweis: splatHinweis,
    },
    {
      id: 'buero-logo',
      gruppe: 'logo',
      gruppenTitel: GRUPPEN_TITEL.logo,
      titel: 'Büro-Logo',
      formatLabel: logoFormatLabel,
      status: logoStatus,
      hinweis: logoHinweis,
    },
  ];
}

/** Menschlich lesbares Label je Status — EINE Quelle für Badge-Text. */
export const EXPORT_STATUS_LABEL: Record<ExportFormatStatus, string> = {
  verfuegbar: 'Verfügbar',
  'braucht-kontext': 'Braucht Kontext',
  'homestation-grenze': 'HomeStation-Grenze',
};

/** Base64 (ohne `data:`-Präfix) → rohe Bytes — Kehrwert zu `btoa`, gebraucht
 *  für den einzigen neuen Export-Weg dieses Pakets (Logo-Rohdatei
 *  herunterladen, s. `paket-logo-export.ts`). Dieselbe Zerlegung wie das
 *  Kehrwert-Muster in `modules/publish/export-sheets.ts`s `ladePdfFontBase64`
 *  (dort Bytes → base64, hier base64 → Bytes). */
export function base64ZuBytes(b64: string): Uint8Array {
  const binaer = atob(b64);
  const bytes = new Uint8Array(binaer.length);
  for (let i = 0; i < binaer.length; i++) bytes[i] = binaer.charCodeAt(i);
  return bytes;
}

/** Dateiendung je Logo-Mime — Guard bleibt bei `publish.bueroSetzen` (nur
 *  SVG/JPG kommen je hier an), `sonstiges` ist ein reiner Fallback. */
export function logoDateiendung(mime: string): string {
  if (mime === 'image/jpeg') return 'jpg';
  if (mime === 'image/svg+xml') return 'svg';
  return 'bin';
}
