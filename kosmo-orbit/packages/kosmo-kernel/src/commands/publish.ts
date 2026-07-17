import { z } from 'zod';
import { newId } from '../model/ids';
import type {
  ImageAsset,
  Sheet,
  SheetImage,
  SheetLayout,
  SheetPlacement,
  SheetPlankopf,
  SheetText,
  Storey,
} from '../model/entities';
import type { AnyPatch, BueroInfo, KosmoDoc, PublikationsSet } from '../model/doc';
import { formatBelegungsBericht, schlageBlattBelegungVor } from '../derive/blattfuellung';
import { formatBaugesuchBericht, schlageBaugesuchSatzVor } from '../derive/baugesuch';
import { ausnuetzungsnachweisSvg, BAUGESUCH_HINWEIS, deriveAusnuetzungKennwerte, utf8ToBase64 } from '../derive/ausnuetzungsnachweis';
import { deriveBerechnungsliste } from '../derive/berechnungsliste';
import { sheetPaperSize } from '../derive/sheet';
import { plankopfReserveMm } from '../derive/blattlayout';
import { CommandError, registerCommand } from './core';

/**
 * Publish-Commands — Plansätze (Owner-Q30). Blätter sind Entities: sie
 * wandern durch Undo, Sync und .kosmo-Pakete wie jedes Bauteil.
 */

const PtSchema = z.object({
  x: z.number().int().describe('X in Millimetern'),
  y: z.number().int().describe('Y in Millimetern'),
});

function requireSheet(doc: KosmoDoc, id: string): Sheet {
  const e = doc.get<Sheet>(id);
  if (!e || e.kind !== 'sheet') throw new CommandError(`Blatt «${id}» existiert nicht`);
  return e;
}

export const saveSet = registerCommand({
  id: 'publish.setSpeichern',
  title: 'Publikations-Set speichern',
  description:
    'Speichert ein benanntes Publikations-Set (RE-ARCHICAD A4): eine Blattauswahl in Reihenfolge + Namensregel für die Exportdateien. Gleicher Name ersetzt das Set. Platzhalter der Namensregel: {nr}, {blatt}, {projekt}, {massstab}, {format} — Default «P-{nr}_{blatt}_{massstab}».',
  params: z.object({
    name: z.string().min(1),
    sheetIds: z.array(z.string()).min(1).describe('Blätter in Export-Reihenfolge'),
    namensregel: z.string().optional(),
  }),
  summarize: (p) => `Set «${p.name}» (${p.sheetIds.length} Blätter)`,
  run: (doc, p) => {
    for (const id of p.sheetIds) requireSheet(doc, id);
    const vorher = doc.settings.publikationsSets ?? [];
    const set = {
      name: p.name,
      sheetIds: p.sheetIds,
      ...(p.namensregel ? { namensregel: p.namensregel } : {}),
    };
    const nachher = [...vorher.filter((s) => s.name !== p.name), set];
    return [
      { settings: true as const, before: { publikationsSets: vorher }, after: { publikationsSets: nachher } },
    ];
  },
});

export const removeSet = registerCommand({
  id: 'publish.setEntfernen',
  title: 'Publikations-Set entfernen',
  description: 'Entfernt ein Publikations-Set — die Blätter selbst bleiben unberührt.',
  params: z.object({ name: z.string().min(1) }),
  summarize: (p) => `Set «${p.name}» entfernen`,
  run: (doc, p) => {
    const vorher = doc.settings.publikationsSets ?? [];
    if (!vorher.some((s) => s.name === p.name)) {
      throw new CommandError(`Set «${p.name}» existiert nicht`);
    }
    return [
      {
        settings: true as const,
        before: { publikationsSets: vorher },
        after: { publikationsSets: vorher.filter((s) => s.name !== p.name) },
      },
    ];
  },
});

export const recordRevision = registerCommand({
  id: 'publish.revisionErfassen',
  title: 'Revision erfassen',
  description:
    'Erfasst eine Plan-Revision auf einem Blatt (RE-ARCHICAD A7): vergibt den nächsten freien Index (A, B, C …), der Eintrag erscheint im Revisionsverzeichnis des Plankopfs. Änderungswolken via publish.wolkeSetzen.',
  params: z.object({
    sheetId: z.string(),
    text: z.string().min(1).describe('Was hat geändert, z.B. «Fenster Küche 1.20 → 1.40»'),
    datum: z.string().min(1).describe('Datum als Text, z.B. 04.07.2026'),
  }),
  summarize: (p) => `Revision: ${p.text.slice(0, 50)}`,
  run: (doc, p) => {
    const sheet = requireSheet(doc, p.sheetId);
    const vorher = sheet.revisionen ?? [];
    // Nächster freier Index: A, B, … Z, AA, AB …
    const nr = vorher.length;
    let index = '';
    for (let n = nr; ; n = Math.floor(n / 26) - 1) {
      index = String.fromCharCode(65 + (n % 26)) + index;
      if (n < 26) break;
    }
    const after: Sheet = {
      ...sheet,
      revisionen: [...vorher, { index, text: p.text, datum: p.datum }],
    };
    return [{ id: sheet.id, before: sheet, after }];
  },
});

export const setWolke = registerCommand({
  id: 'publish.wolkeSetzen',
  title: 'Änderungswolke setzen',
  description:
    'Setzt eine Änderungswolke auf ein Blatt (Papier-mm, x/y = linke obere Ecke): markiert den geänderten Bereich und trägt den Revisions-Index als Marker. revision weglassen = letzte erfasste Revision.',
  params: z.object({
    sheetId: z.string(),
    x: z.number(),
    y: z.number(),
    w: z.number().positive(),
    h: z.number().positive(),
    revision: z.string().optional().describe('Revisions-Index, z.B. B; weglassen = letzte'),
  }),
  summarize: (p) => `Wolke ${p.revision ?? '(letzte Revision)'}`,
  run: (doc, p) => {
    const sheet = requireSheet(doc, p.sheetId);
    const revisionen = sheet.revisionen ?? [];
    const revision = p.revision ?? revisionen[revisionen.length - 1]?.index;
    if (!revision || !revisionen.some((r) => r.index === revision)) {
      throw new CommandError(
        p.revision
          ? `Revision «${p.revision}» existiert nicht auf diesem Blatt`
          : 'Noch keine Revision erfasst — zuerst publish.revisionErfassen',
      );
    }
    const wolke = { id: newId('wolke'), x: p.x, y: p.y, w: p.w, h: p.h, revision };
    const after: Sheet = { ...sheet, wolken: [...(sheet.wolken ?? []), wolke] };
    return [{ id: sheet.id, before: sheet, after }];
  },
});

export const removeWolke = registerCommand({
  id: 'publish.wolkeEntfernen',
  title: 'Änderungswolke entfernen',
  description: 'Entfernt eine Änderungswolke — das Revisionsverzeichnis bleibt.',
  params: z.object({ sheetId: z.string(), wolkeId: z.string() }),
  summarize: () => 'Wolke entfernen',
  run: (doc, p) => {
    const sheet = requireSheet(doc, p.sheetId);
    if (!(sheet.wolken ?? []).some((w) => w.id === p.wolkeId)) {
      throw new CommandError(`Wolke «${p.wolkeId}» existiert nicht`);
    }
    const after: Sheet = { ...sheet, wolken: (sheet.wolken ?? []).filter((w) => w.id !== p.wolkeId) };
    return [{ id: sheet.id, before: sheet, after }];
  },
});

// v0.8.0 P7 (Golden-Sammelwechsel 080, Spez §5.1/§5.2): oben deklariert
// (statt bei `publish.blattLayoutSetzen` weiter unten), weil `createSheet`
// direkt darunter sie ebenfalls braucht — einzige Ausnahme vom
// Post-Wechsel-Default (Heftrand AN), die der Kernel selbst kennt: die
// A0-Plakat-Preset-Blätter (`erzeugePlakat()`, `PublishWorkspace.tsx`)
// setzen hierüber explizit `{ heftrand: false }` BEIM Erstellen — eine
// ehrliche, im UI-Preset-Code sichtbare Ausnahme statt einer Namens-
// Heuristik im Kernel (der Kernel selbst kennt «Plakat» nicht).
const SheetLayoutPatchSchema = z.object({
  heftrand: z.boolean().optional().describe('Heftrand zeichnen'),
  faltmarken: z.boolean().optional().describe('Faltmarken zeichnen'),
  wasserzeichen: z.boolean().optional().describe('Wasserzeichen (z.B. «Entwurf») einblenden'),
  massstabsbalken: z.boolean().optional().describe('Massstabsbalken zeichnen'),
  nordpfeil: z.boolean().optional().describe('Nordpfeil zeichnen'),
});

export const createSheet = registerCommand({
  id: 'publish.blattErstellen',
  title: 'Planblatt erstellen',
  description:
    'Erstellt ein leeres Planblatt für den Plansatz. format: A0–A4 (Standard A1), orientation: quer oder hoch. layout: optionale Layout-Schalter beim Erstellen (z.B. { heftrand: false } für randlose Plakate) — ohne Angabe gelten die fixierten Post-Sammelwechsel-Defaults (Heftrand/Faltmarken/Wasserzeichen/Massstabsbalken an, Nordpfeil an nur bei platziertem Grundriss/Situationsplan).',
  params: z.object({
    name: z.string().describe('Blattname, z.B. «Grundrisse 1:100»'),
    format: z.enum(['A0', 'A1', 'A2', 'A3', 'A4']).default('A1'),
    orientation: z.enum(['quer', 'hoch']).default('quer'),
    layout: SheetLayoutPatchSchema.optional(),
  }),
  summarize: (p) => `Blatt «${p.name}» (${p.format} ${p.orientation})`,
  run: (doc, p) => {
    const sheet: Sheet = {
      id: newId('blatt'),
      kind: 'sheet',
      name: p.name,
      format: p.format,
      orientation: p.orientation,
      index: doc.byKind<Sheet>('sheet').length,
      placements: [],
      // `mergeTeilPatch` (s. unten) räumt zod-optionale `undefined`-Werte weg
      // — `exactOptionalPropertyTypes` verlangt sonst, dass eine gesetzte
      // Eigenschaft NIE literal `undefined` trägt (nur ganz fehlen darf).
      ...(p.layout ? { layout: mergeTeilPatch<SheetLayout>({}, p.layout) } : {}),
    };
    return [{ id: sheet.id, before: null, after: sheet }];
  },
});

export const placeView = registerCommand({
  id: 'publish.ansichtPlatzieren',
  title: 'Ansicht auf Blatt platzieren',
  description:
    'Platziert einen Grundriss, Schnitt, eine Axonometrie oder einen Situationsplan auf einem Planblatt. view: grundriss (braucht storeyId), schnitt (braucht Schnittlinie a→b), axo (Militärperspektive des ganzen Modells) oder situationsplan (Parzellengrenze + Gebäude-Footprints, braucht eine als Parzelle erkennbare Zone — design.zoneErstellen mit sia: KF). scale: Massstab (100 = 1:100). x/y: Mittelpunkt der Zeichnung auf dem Blatt in Papier-mm.',
  params: z.object({
    sheetId: z.string(),
    view: z.enum(['grundriss', 'schnitt', 'axo', 'situationsplan']),
    storeyId: z.string().optional().describe('Quell-Geschoss (bei grundriss)'),
    a: PtSchema.optional().describe('Schnittlinien-Anfang (bei schnitt, Welt-mm)'),
    b: PtSchema.optional().describe('Schnittlinien-Ende (bei schnitt, Welt-mm)'),
    scale: z.number().int().min(1).max(2000).default(100),
    x: z.number().describe('Papier-mm ab links'),
    y: z.number().describe('Papier-mm ab oben'),
    title: z.string().optional(),
    umbau: z
      .enum(['bestand', 'abbruch', 'neu'])
      .optional()
      .describe('Umbau-Filter: abbruch = Abbruchplan (Neubau weg), neu = Neubauplan (Abbruch weg), bestand = nur Bestand; weglassen = kombiniert'),
  }),
  summarize: (p) =>
    `${p.view === 'schnitt' ? 'Schnitt' : p.view === 'axo' ? 'Axonometrie' : p.view === 'situationsplan' ? 'Situationsplan' : 'Grundriss'} 1:${p.scale} platzieren`,
  run: (doc, p) => {
    const sheet = requireSheet(doc, p.sheetId);
    const placement: SheetPlacement = {
      id: newId('ansicht'),
      view: p.view,
      scale: p.scale,
      x: p.x,
      y: p.y,
      ...(p.title ? { title: p.title } : {}),
      ...(p.umbau ? { umbau: p.umbau } : {}),
    };
    if (p.view === 'grundriss') {
      if (!p.storeyId) throw new CommandError('grundriss braucht storeyId');
      const storey = doc.get<Storey>(p.storeyId);
      if (!storey || storey.kind !== 'storey') {
        throw new CommandError(`Geschoss «${p.storeyId}» existiert nicht`);
      }
      placement.storeyId = p.storeyId;
      if (!p.title) placement.title = `Grundriss ${storey.name}`;
    } else if (p.view === 'axo') {
      if (!p.title) placement.title = 'Axonometrie';
    } else if (p.view === 'situationsplan') {
      if (!p.title) placement.title = 'Situationsplan';
    } else {
      if (!p.a || !p.b) throw new CommandError('schnitt braucht a und b');
      placement.section = { a: p.a, b: p.b, depth: 30000, lookLeft: true };
      if (!p.title) placement.title = 'Schnitt';
    }
    const after: Sheet = { ...sheet, placements: [...sheet.placements, placement] };
    return [{ id: sheet.id, before: sheet, after }];
  },
});

export const movePlacement = registerCommand({
  id: 'publish.ansichtVerschieben',
  title: 'Ansicht auf Blatt verschieben',
  description: 'Verschiebt eine platzierte Ansicht an eine neue Position (Papier-mm).',
  params: z.object({
    sheetId: z.string(),
    placementId: z.string(),
    x: z.number(),
    y: z.number(),
  }),
  summarize: (p) => `Ansicht → ${Math.round(p.x)}/${Math.round(p.y)} mm`,
  run: (doc, p) => {
    const sheet = requireSheet(doc, p.sheetId);
    if (!sheet.placements.some((pl) => pl.id === p.placementId)) {
      throw new CommandError(`Ansicht «${p.placementId}» liegt nicht auf diesem Blatt`);
    }
    const after: Sheet = {
      ...sheet,
      placements: sheet.placements.map((pl) =>
        pl.id === p.placementId ? { ...pl, x: p.x, y: p.y } : pl,
      ),
    };
    return [{ id: sheet.id, before: sheet, after }];
  },
});

export const removePlacement = registerCommand({
  id: 'publish.ansichtEntfernen',
  title: 'Ansicht vom Blatt entfernen',
  description: 'Entfernt eine platzierte Ansicht vom Planblatt.',
  params: z.object({ sheetId: z.string(), placementId: z.string() }),
  summarize: () => 'Ansicht entfernen',
  run: (doc, p) => {
    const sheet = requireSheet(doc, p.sheetId);
    if (!sheet.placements.some((pl) => pl.id === p.placementId)) {
      throw new CommandError(`Ansicht «${p.placementId}» liegt nicht auf diesem Blatt`);
    }
    const after: Sheet = {
      ...sheet,
      placements: sheet.placements.filter((pl) => pl.id !== p.placementId),
    };
    const patches: AnyPatch[] = [{ id: sheet.id, before: sheet, after }];
    return patches;
  },
});

export const setText = registerCommand({
  id: 'publish.textSetzen',
  title: 'Text auf Blatt setzen',
  description:
    'Setzt einen freien Textblock auf ein Planblatt (Plakat-Titel, Konzepttext). Ohne textId wird ein neuer Block angelegt; mit textId wird er geändert; leerer text entfernt ihn. x/y in Papier-mm (y = Basislinie), size = Schrifthöhe in mm, titel = Plakat-Titel-Stil.',
  params: z.object({
    sheetId: z.string(),
    textId: z.string().optional(),
    x: z.number().optional(),
    y: z.number().optional(),
    text: z.string(),
    size: z.number().min(1).max(120).optional(),
    titel: z.boolean().optional(),
  }),
  summarize: (p) => (p.text.trim() === '' ? 'Text entfernen' : `Text «${p.text.slice(0, 24)}…» setzen`),
  run: (doc, p) => {
    const sheet = requireSheet(doc, p.sheetId);
    const texte = sheet.texte ?? [];
    let next: SheetText[];
    if (p.textId) {
      const alt = texte.find((t) => t.id === p.textId);
      if (!alt) throw new CommandError(`Text «${p.textId}» existiert nicht`);
      next =
        p.text.trim() === ''
          ? texte.filter((t) => t.id !== p.textId)
          : texte.map((t) =>
              t.id === p.textId
                ? {
                    ...t,
                    text: p.text,
                    x: p.x ?? t.x,
                    y: p.y ?? t.y,
                    size: p.size ?? t.size,
                    ...(p.titel === undefined ? {} : { titel: p.titel }),
                  }
                : t,
            );
    } else {
      if (p.text.trim() === '') throw new CommandError('Leerer Text ohne textId');
      next = [
        ...texte,
        {
          id: newId('text'),
          x: p.x ?? 30,
          y: p.y ?? 40,
          text: p.text,
          size: p.size ?? 5,
          ...(p.titel ? { titel: true } : {}),
        },
      ];
    }
    const after: Sheet = { ...sheet, texte: next };
    return [{ id: sheet.id, before: sheet, after }];
  },
});

export const adjustPlacement = registerCommand({
  id: 'publish.ansichtAnpassen',
  title: 'Ansicht anpassen',
  description:
    'Ändert Massstab, Titel, Umbau-Filter und/oder Themenplan einer platzierten Ansicht auf einem Planblatt. umbau: abbruch = Abbruchplan, neu = Neubauplan, bestand = nur Bestand, null = kombiniert. thema: Name eines Themenplans aus design.themenPlanSpeichern, null = normaler Plan.',
  params: z.object({
    sheetId: z.string(),
    placementId: z.string(),
    scale: z.number().int().min(1).max(2000).optional(),
    title: z.string().optional(),
    umbau: z.enum(['bestand', 'abbruch', 'neu']).nullable().optional(),
    thema: z.string().nullable().optional(),
  }),
  summarize: (p) =>
    `Ansicht anpassen${p.scale ? ` (1:${p.scale})` : ''}${p.umbau ? ` · ${p.umbau}` : ''}${p.thema ? ` · ${p.thema}` : ''}`,
  run: (doc, p) => {
    const sheet = requireSheet(doc, p.sheetId);
    if (!sheet.placements.some((pl) => pl.id === p.placementId)) {
      throw new CommandError(`Platzierung «${p.placementId}» existiert nicht`);
    }
    if (p.thema && !(doc.settings.themen ?? []).some((t) => t.name === p.thema)) {
      throw new CommandError(`Themenplan «${p.thema}» existiert nicht — zuerst design.themenPlanSpeichern`);
    }
    const after: Sheet = {
      ...sheet,
      placements: sheet.placements.map((pl) => {
        if (pl.id !== p.placementId) return pl;
        const neu = {
          ...pl,
          scale: p.scale ?? pl.scale,
          ...(p.title === undefined ? {} : { title: p.title }),
          ...(p.umbau ? { umbau: p.umbau } : {}),
          ...(p.thema ? { thema: p.thema } : {}),
        };
        if (p.umbau === null) delete neu.umbau; // Filter entfernen = kombiniert
        if (p.thema === null) delete neu.thema; // Thema entfernen = normaler Plan
        return neu;
      }),
    };
    return [{ id: sheet.id, before: sheet, after }];
  },
});

/** data:-URL in ein ImageAsset zerlegen (base64-Pflicht — Renders kommen so). */
function assetAusDataUrl(name: string, dataUrl: string): ImageAsset {
  const m = /^data:(image\/[a-z+.-]+);base64,([A-Za-z0-9+/=]+)$/.exec(dataUrl);
  if (!m) throw new CommandError('dataUrl muss eine base64-kodierte data:image/…-URL sein');
  const groesse = m[1] === 'image/png' ? pngGroesse(m[2]!) : null;
  return {
    id: newId('bild'),
    kind: 'imageasset',
    name,
    mime: m[1]!,
    data: m[2]!,
    ...(groesse ?? {}),
  };
}

/** PNG-Abmessungen aus dem IHDR-Chunk (Bytes 16–23) — ohne DOM, läuft auch im Worker/Node. */
function pngGroesse(base64: string): { width: number; height: number } | null {
  const B64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
  const bytes: number[] = [];
  for (let i = 0; i + 3 < base64.length && bytes.length < 24; i += 4) {
    const v =
      (B64.indexOf(base64[i]!) << 18) |
      (B64.indexOf(base64[i + 1]!) << 12) |
      (B64.indexOf(base64[i + 2]!) << 6) |
      B64.indexOf(base64[i + 3]!);
    bytes.push((v >> 16) & 255, (v >> 8) & 255, v & 255);
  }
  if (bytes.length < 24 || bytes[0] !== 0x89 || bytes[1] !== 0x50) return null;
  const width = (bytes[16]! << 24) | (bytes[17]! << 16) | (bytes[18]! << 8) | bytes[19]!;
  const height = (bytes[20]! << 24) | (bytes[21]! << 16) | (bytes[22]! << 8) | bytes[23]!;
  return width > 0 && height > 0 ? { width, height } : null;
}

/**
 * Referenziert irgendein Blatt-Bild-Slot ODER das Büro-Logo
 * (`settings.buero.logoAssetId`) dieses Asset noch? `ausser` schliesst GENAU
 * die eine Referenz aus, die der Aufrufer selbst gerade ersetzt/entfernt —
 * entweder einen Bild-Slot (`{ sheetId, bildId }`, wie bisher) oder das
 * Büro-Logo-Feld selbst (`{ buero: true }`, v0.8.0 P2: `publish.bueroSetzen`
 * ersetzt seinen EIGENEN alten Logo-Asset und darf dabei nicht an der
 * eigenen, noch nicht aktualisierten Referenz scheitern). Ohne `ausser`
 * zählen beide Referenzarten voll — das ist der GC-Schutz: ein Bild-Slot,
 * der zufällig denselben Asset wie das Büro-Logo trägt, darf beim Entfernen
 * dieses Slots das Logo nicht mitreissen (und umgekehrt).
 */
function assetNochReferenziert(
  doc: KosmoDoc,
  assetId: string,
  ausser?: { sheetId: string; bildId: string } | { buero: true },
): boolean {
  for (const s of doc.byKind<Sheet>('sheet')) {
    for (const b of s.bilder ?? []) {
      if (
        b.assetId === assetId &&
        !(ausser && 'sheetId' in ausser && s.id === ausser.sheetId && b.id === ausser.bildId)
      ) {
        return true;
      }
    }
  }
  if (doc.settings.buero?.logoAssetId === assetId && !(ausser && 'buero' in ausser)) return true;
  return false;
}

/**
 * Merge eines Teil-Patches in ein optionales Feld-Bündel (`SheetPlankopf`/
 * `SheetLayout`, v0.8.0 P2): nur im `patch` VORHANDENE Schlüssel ändern
 * etwas — ein fehlender Schlüssel lässt das Feld unangetastet, ein
 * vorhandener Schlüssel mit explizitem Wert `undefined` LÖSCHT das Feld
 * wieder. Anders als das flache Merge-Muster von `design.projektInfoSetzen`
 * (das nur setzt, nie löscht) trägt dieses Muster echtes Löschen, weil
 * `patch` ein einzelnes verschachteltes Objekt ist statt einzelner
 * Top-Level-Parameter.
 */
function mergeTeilPatch<T extends object>(vorher: T, patch: Partial<Record<string, unknown>>): T {
  const nachher = { ...vorher } as Record<string, unknown>;
  for (const key of Object.keys(patch)) {
    const wert = patch[key];
    if (wert === undefined) delete nachher[key];
    else nachher[key] = wert;
  }
  return nachher as T;
}

export const placeImage = registerCommand({
  id: 'publish.bildPlatzieren',
  title: 'Bild auf Blatt platzieren',
  description:
    'Platziert einen Bild-Slot auf einem Planblatt (Render aufs Plakat). Mit dataUrl wird das Bild eingebettet; ohne entsteht ein leerer Slot als Platzhalter für kommende Renders. x/y: linke obere Ecke in Papier-mm, w: Breite in Papier-mm.',
  params: z.object({
    sheetId: z.string(),
    x: z.number(),
    y: z.number(),
    w: z.number().min(10).max(1200),
    title: z.string().optional(),
    dataUrl: z.string().optional().describe('data:image/…;base64,… — leer lassen für einen leeren Slot'),
  }),
  summarize: (p) => (p.dataUrl ? 'Bild aufs Blatt setzen' : 'Leeren Bild-Slot platzieren'),
  run: (doc, p) => {
    const sheet = requireSheet(doc, p.sheetId);
    const patches: AnyPatch[] = [];
    let assetId: string | null = null;
    if (p.dataUrl) {
      const asset = assetAusDataUrl(p.title ?? 'Render', p.dataUrl);
      patches.push({ id: asset.id, before: null, after: asset });
      assetId = asset.id;
    }
    const bild: SheetImage = {
      id: newId('slot'),
      x: p.x,
      y: p.y,
      w: p.w,
      assetId,
      ...(p.title ? { title: p.title } : {}),
    };
    patches.push({ id: sheet.id, before: sheet, after: { ...sheet, bilder: [...(sheet.bilder ?? []), bild] } });
    return patches;
  },
});

function requireBild(sheet: Sheet, bildId: string): SheetImage {
  const bild = (sheet.bilder ?? []).find((b) => b.id === bildId);
  if (!bild) throw new CommandError(`Bild «${bildId}» liegt nicht auf diesem Blatt`);
  return bild;
}

export const fillImage = registerCommand({
  id: 'publish.bildFuellen',
  title: 'Bild-Slot füllen',
  description: 'Füllt einen (leeren) Bild-Slot mit einem Bild oder ersetzt das vorhandene.',
  params: z.object({
    sheetId: z.string(),
    bildId: z.string(),
    dataUrl: z.string().describe('data:image/…;base64,…'),
  }),
  summarize: () => 'Bild-Slot füllen',
  run: (doc, p) => {
    const sheet = requireSheet(doc, p.sheetId);
    const bild = requireBild(sheet, p.bildId);
    const asset = assetAusDataUrl(bild.title ?? 'Render', p.dataUrl);
    const patches: AnyPatch[] = [{ id: asset.id, before: null, after: asset }];
    if (bild.assetId && !assetNochReferenziert(doc, bild.assetId, { sheetId: sheet.id, bildId: bild.id })) {
      const alt = doc.get<ImageAsset>(bild.assetId);
      if (alt) patches.push({ id: alt.id, before: alt, after: null });
    }
    patches.push({
      id: sheet.id,
      before: sheet,
      after: {
        ...sheet,
        bilder: (sheet.bilder ?? []).map((b) => (b.id === p.bildId ? { ...b, assetId: asset.id } : b)),
      },
    });
    return patches;
  },
});

export const moveImage = registerCommand({
  id: 'publish.bildVerschieben',
  title: 'Bild auf Blatt verschieben',
  description: 'Verschiebt einen Bild-Slot an eine neue Position (Papier-mm, linke obere Ecke).',
  params: z.object({ sheetId: z.string(), bildId: z.string(), x: z.number(), y: z.number() }),
  summarize: (p) => `Bild → ${Math.round(p.x)}/${Math.round(p.y)} mm`,
  run: (doc, p) => {
    const sheet = requireSheet(doc, p.sheetId);
    requireBild(sheet, p.bildId);
    const after: Sheet = {
      ...sheet,
      bilder: (sheet.bilder ?? []).map((b) => (b.id === p.bildId ? { ...b, x: p.x, y: p.y } : b)),
    };
    return [{ id: sheet.id, before: sheet, after }];
  },
});

export const adjustImage = registerCommand({
  id: 'publish.bildAnpassen',
  title: 'Bild anpassen',
  description: 'Ändert Breite und/oder Titel eines Bild-Slots auf einem Planblatt.',
  params: z.object({
    sheetId: z.string(),
    bildId: z.string(),
    w: z.number().min(10).max(1200).optional(),
    title: z.string().optional(),
  }),
  summarize: () => 'Bild anpassen',
  run: (doc, p) => {
    const sheet = requireSheet(doc, p.sheetId);
    requireBild(sheet, p.bildId);
    const after: Sheet = {
      ...sheet,
      bilder: (sheet.bilder ?? []).map((b) =>
        b.id === p.bildId
          ? { ...b, w: p.w ?? b.w, ...(p.title === undefined ? {} : { title: p.title }) }
          : b,
      ),
    };
    return [{ id: sheet.id, before: sheet, after }];
  },
});

export const removeImage = registerCommand({
  id: 'publish.bildEntfernen',
  title: 'Bild vom Blatt entfernen',
  description: 'Entfernt einen Bild-Slot; das eingebettete Bild wird mitgelöscht, wenn kein anderes Blatt es nutzt.',
  params: z.object({ sheetId: z.string(), bildId: z.string() }),
  summarize: () => 'Bild entfernen',
  run: (doc, p) => {
    const sheet = requireSheet(doc, p.sheetId);
    const bild = requireBild(sheet, p.bildId);
    const patches: AnyPatch[] = [
      { id: sheet.id, before: sheet, after: { ...sheet, bilder: (sheet.bilder ?? []).filter((b) => b.id !== p.bildId) } },
    ];
    if (bild.assetId && !assetNochReferenziert(doc, bild.assetId, { sheetId: sheet.id, bildId: bild.id })) {
      const asset = doc.get<ImageAsset>(bild.assetId);
      if (asset) patches.push({ id: asset.id, before: asset, after: null });
    }
    return patches;
  },
});

export const removeSheet = registerCommand({
  id: 'publish.blattEntfernen',
  title: 'Blatt entfernen',
  description: 'Entfernt ein Planblatt samt allen Platzierungen und Texten aus dem Plansatz.',
  params: z.object({ sheetId: z.string() }),
  summarize: () => 'Blatt entfernen',
  run: (doc, p) => {
    const sheet = requireSheet(doc, p.sheetId);
    return [{ id: sheet.id, before: sheet, after: null }];
  },
});

/** Cache run()→summarize() für DENSELBEN Aufruf (execute() übergibt dasselbe
 * parsed.data-Objekt an beide) — vermeidet doppelte Ableitung, kein Zustand
 * ausserhalb eines einzelnen execute()-Durchlaufs. */
const letzterBericht = new WeakMap<object, ReturnType<typeof schlageBlattBelegungVor>>();

/**
 * v0.8.1 P12 (Auto-Pack-Layout-Editor, `docs/V081-SPEZ.md` §7(b)/C-26):
 * additives, optionales Params-Feld — spiegelt `BlattPackOptions`
 * (`derive/blattfuellung.ts`) 1:1 als zod-Schema. Weggelassen (wie bei jedem
 * bestehenden Aufrufer/Test), verhält sich der Command byte-gleich zum
 * Alt-Stand (`schlageBlattBelegungVor(doc, sheet)` ohne dritten Parameter).
 */
const blattPackOptionenSchema = z
  .object({
    reihenfolge: z.array(z.enum(['grundriss', 'schnitt', 'axo', 'situationsplan', 'bild', 'text'])).optional(),
    spaltenZielMm: z.number().positive().optional(),
    maxSpalten: z.number().int().positive().optional(),
    zeilenHoeheMm: z.number().positive().optional(),
    gutterMm: z.number().nonnegative().optional(),
    randMm: z.number().nonnegative().optional(),
  })
  .optional();

/** `exactOptionalPropertyTypes` verlangt, ein zod-optionales Feld (`X |
 * undefined`) NICHT direkt in ein plain-optionales Interface-Feld (`X`)
 * durchzureichen — dieselbe konditionale-Spread-Konvention wie bei
 * `setBuero` (oben, `p.name !== undefined ? { name: p.name } : {}`), hier
 * einmal für alle sechs `BlattPackOptions`-Felder gebündelt. */
function packOptionenAus(p: z.infer<typeof blattPackOptionenSchema>) {
  if (!p) return undefined;
  return {
    ...(p.reihenfolge !== undefined ? { reihenfolge: p.reihenfolge } : {}),
    ...(p.spaltenZielMm !== undefined ? { spaltenZielMm: p.spaltenZielMm } : {}),
    ...(p.maxSpalten !== undefined ? { maxSpalten: p.maxSpalten } : {}),
    ...(p.zeilenHoeheMm !== undefined ? { zeilenHoeheMm: p.zeilenHoeheMm } : {}),
    ...(p.gutterMm !== undefined ? { gutterMm: p.gutterMm } : {}),
    ...(p.randMm !== undefined ? { randMm: p.randMm } : {}),
  };
}

export const fillSheet = registerCommand({
  id: 'publish.blattFuellen',
  title: 'Blatt füllen',
  description:
    'Befüllt die freie Fläche eines Planblatts automatisch (Owner-Befund K10): platziert fehlende Grundrisse (je Geschoss), bereits im Modell definierte Schnitte, eine Axonometrie, eine Kennzahlen-Zusammenfassung und ein vorhandenes Renderbild (oder einen leeren Platzhalter) — nach einem einfachen Spaltenraster über die freie Blattfläche, KEIN Layout-«KI». Was das Modell nicht hergibt (kein Schnitt definiert, kein Raumprogramm, kein Render) erscheint als ehrlicher Hinweis in der Zusammenfassung statt erfunden zu werden. EIN atomarer Undo-Schritt. Optionales `optionen`-Feld (v0.8.1 P12, Auto-Pack-Editor): Reihenfolge/Spaltenmass/Zeilenhöhe/Abstand des Rasters lassen sich benannt übersteuern — ohne dieses Feld unverändert der Alt-Default.',
  params: z.object({ sheetId: z.string(), optionen: blattPackOptionenSchema }),
  summarize: (p) => formatBelegungsBericht(letzterBericht.get(p) ?? { vorschlaege: [], hinweise: [] }),
  run: (doc, p) => {
    const sheet = requireSheet(doc, p.sheetId);
    const vorschlag = schlageBlattBelegungVor(doc, sheet, packOptionenAus(p.optionen));
    letzterBericht.set(p, vorschlag);
    if (vorschlag.vorschlaege.length === 0) return [];

    let aktuell: Sheet = sheet;
    for (const v of vorschlag.vorschlaege) {
      if (v.art === 'grundriss' || v.art === 'schnitt' || v.art === 'axo' || v.art === 'situationsplan') {
        const placement: SheetPlacement = {
          id: newId('ansicht'),
          view: v.art,
          scale: v.scale,
          x: v.x,
          y: v.y,
          ...(v.art === 'grundriss' ? { storeyId: v.storeyId, title: v.title } : {}),
          ...(v.art === 'schnitt'
            ? { section: { a: v.a, b: v.b, depth: v.depth, lookLeft: v.lookLeft }, title: v.title }
            : {}),
          ...(v.art === 'axo' ? { title: v.title } : {}),
          ...(v.art === 'situationsplan' ? { title: v.title } : {}),
        };
        aktuell = { ...aktuell, placements: [...aktuell.placements, placement] };
      } else if (v.art === 'bild') {
        const bild: SheetImage = {
          id: newId('slot'),
          x: v.x,
          y: v.y,
          w: v.w,
          assetId: v.assetId,
          ...(v.title ? { title: v.title } : {}),
        };
        aktuell = { ...aktuell, bilder: [...(aktuell.bilder ?? []), bild] };
      } else {
        const text: SheetText = {
          id: newId('text'),
          x: v.x,
          y: v.y,
          text: v.text,
          size: v.size,
          ...(v.titel ? { titel: true } : {}),
        };
        aktuell = { ...aktuell, texte: [...(aktuell.texte ?? []), text] };
      }
    }
    return [{ id: sheet.id, before: sheet, after: aktuell }];
  },
});

/** Cache run()→summarize() für DENSELBEN Aufruf, wie bei `fillSheet` oben. */
const letzterBaugesuchBericht = new WeakMap<object, ReturnType<typeof schlageBaugesuchSatzVor>>();

export const createBaugesuch = registerCommand({
  id: 'publish.baugesuchErstellen',
  title: 'Baugesuch-Blattsatz erstellen',
  description:
    'Stellt den kuratierten Blattsatz fürs CH-Baugesuch (SIA-Teilphase Bewilligung) aus dem Modell zusammen: Situation (falls Baugrenze/Parzelle gezeichnet), Grundriss je Geschoss (1:100), die im Plansatz bereits definierten Schnitte sowie ein Ausnützungsnachweis-Blatt (Berechnungsliste + Zonenregel-Gegenüberstellung AZ/Höhe/Vollgeschosse/Grenzabstand). Bündelt alle erzeugten Blätter als Publikations-Set «Baugesuch» (ersetzt ein gleichnamiges Set). EIN atomarer Undo-Schritt. Fassaden/Ansichten und eine Situation ohne Baugrenze bleiben ehrliche Lücken (das Datenmodell kennt keinen Fassaden-Blatt-Typ) — die eigentliche Einreichung bei der Behörde bleibt real, dies ist nur die Zusammenstellung.',
  params: z.object({}),
  summarize: (p) =>
    formatBaugesuchBericht(letzterBaugesuchBericht.get(p) ?? { situation: null, grundrisse: [], schnitte: [], hinweise: [] }),
  run: (doc, p) => {
    const vorschlag = schlageBaugesuchSatzVor(doc);
    letzterBaugesuchBericht.set(p, vorschlag);

    const patches: AnyPatch[] = [];
    const neueSheetIds: string[] = [];
    let nextIndex = doc.byKind<Sheet>('sheet').length;

    const anlegen = (name: string, format: Sheet['format'], orientation: Sheet['orientation']): Sheet => {
      const sheet: Sheet = { id: newId('blatt'), kind: 'sheet', name, format, orientation, index: nextIndex++, placements: [] };
      return sheet;
    };
    // v0.8.0 P7 (Golden-Sammelwechsel 080): «−30» war eine grobe, ans
    // alte ~120×26-mm-Fusskopf angelehnte Schätzung — ersetzt durch die
    // EINZIGE Quelle `plankopfReserveMm()` (Spez §5.1), damit die
    // vorgeschlagene Zentrierung mit dem seit P7 default-aktiven,
    // deutlich höheren 180×55-Plankopf konsistent bleibt.
    const zentrierterPlatz = (sheet: Sheet) => {
      const paper = sheetPaperSize(sheet);
      return { x: Math.round(paper.width / 2), y: Math.round((paper.height - plankopfReserveMm().hoehe) / 2) };
    };

    // Situation
    if (vorschlag.situation) {
      const sheet = anlegen(`Situation ${vorschlag.situation.storeyName}`, 'A3', 'quer');
      const p0 = zentrierterPlatz(sheet);
      const placement: SheetPlacement = {
        id: newId('ansicht'),
        view: 'grundriss',
        storeyId: vorschlag.situation.storeyId,
        scale: vorschlag.situation.scale,
        x: p0.x,
        y: p0.y,
        title: 'Situation',
      };
      sheet.placements = [placement];
      patches.push({ id: sheet.id, before: null, after: sheet });
      neueSheetIds.push(sheet.id);
    }

    // Grundrisse aller Geschosse
    for (const g of vorschlag.grundrisse) {
      const sheet = anlegen(`Grundriss ${g.storeyName}`, 'A1', 'quer');
      const p0 = zentrierterPlatz(sheet);
      const placement: SheetPlacement = {
        id: newId('ansicht'),
        view: 'grundriss',
        storeyId: g.storeyId,
        scale: g.scale,
        x: p0.x,
        y: p0.y,
        title: `Grundriss ${g.storeyName}`,
      };
      sheet.placements = [placement];
      patches.push({ id: sheet.id, before: null, after: sheet });
      neueSheetIds.push(sheet.id);
    }

    // Schnitte (mind. 1, falls im Modell definiert)
    for (const s of vorschlag.schnitte) {
      const sheet = anlegen(`Schnitt ${s.title}`, 'A1', 'quer');
      const p0 = zentrierterPlatz(sheet);
      const placement: SheetPlacement = {
        id: newId('ansicht'),
        view: 'schnitt',
        section: { a: s.a, b: s.b, depth: s.depth, lookLeft: s.lookLeft },
        scale: s.scale,
        x: p0.x,
        y: p0.y,
        title: s.title,
      };
      sheet.placements = [placement];
      patches.push({ id: sheet.id, before: null, after: sheet });
      neueSheetIds.push(sheet.id);
    }

    // Ausnützungsnachweis — IMMER erstellt (Pflichtbeilage), auch bei leerem
    // Modell (dann mit «—»-Werten statt erfundenen Zahlen). Das eigenständige
    // SVG-Blatt (derive/ausnuetzungsnachweis.ts) wird als Bild-Slot auf ein
    // eigenes A4-Blatt eingebettet — «auf bestehende Sheet-Entities gemappt
    // statt ein neues Artefakt» (Konzept §4, Batch 2).
    const liste = deriveBerechnungsliste(doc);
    const kennwerte = deriveAusnuetzungKennwerte(doc);
    const svg = ausnuetzungsnachweisSvg(liste, kennwerte, {
      ...(doc.settings.projectName ? { titel: doc.settings.projectName } : {}),
      siaPhase: doc.settings.siaPhase,
      ...(doc.settings.zonenRegel ? { regelName: doc.settings.zonenRegel.name } : {}),
    });
    const asset: ImageAsset = {
      id: newId('bild'),
      kind: 'imageasset',
      name: 'Ausnützungsnachweis',
      mime: 'image/svg+xml',
      data: utf8ToBase64(svg),
      // Intrinsische Seitenverhältnis-Angabe (kein echtes Pixelmass): das
      // SVG-Blatt hat den viewBox 794×1123 (A4 hoch) — `imagePaperBounds`
      // rechnet die Bild-Höhe daraus, statt den Default-3:2-Fallback zu
      // nehmen (der das Blatt seitenverkehrt verzerren würde).
      width: 794,
      height: 1123,
    };
    patches.push({ id: asset.id, before: null, after: asset });

    const nachweisSheet = anlegen('Ausnützungsnachweis', 'A4', 'hoch');
    const paper = sheetPaperSize(nachweisSheet);
    // v0.8.0 P7: «40» war eine pauschale Schätzung — jetzt aus der
    // EINZIGEN Quelle `plankopfReserveMm()` (Spez §5.1), damit das
    // eingebettete Ausnützungsnachweis-Bild den seit P7 default-aktiven,
    // grösseren 180×55-Plankopf dieses Blatts nicht überlappt.
    const plankopfReserve = plankopfReserveMm().hoehe;
    const usableHeight = paper.height - 20 - plankopfReserve;
    const bildW = Math.round(usableHeight * (794 / 1123));
    const bild: SheetImage = {
      id: newId('slot'),
      x: Math.round((paper.width - bildW) / 2),
      y: 12,
      w: bildW,
      assetId: asset.id,
      title: `Ausnützungsnachweis — ${BAUGESUCH_HINWEIS}`,
    };
    nachweisSheet.bilder = [bild];
    patches.push({ id: nachweisSheet.id, before: null, after: nachweisSheet });
    neueSheetIds.push(nachweisSheet.id);

    // Als Publikations-Set «Baugesuch» bündeln (ersetzt ein gleichnamiges Set)
    const vorherSets = doc.settings.publikationsSets ?? [];
    const set: PublikationsSet = { name: 'Baugesuch', sheetIds: neueSheetIds };
    patches.push({
      settings: true as const,
      before: { publikationsSets: vorherSets },
      after: { publikationsSets: [...vorherSets.filter((s) => s.name !== 'Baugesuch'), set] },
    });

    return patches;
  },
});

const SheetPlankopfPatchSchema = z.object({
  inhalt: z.string().optional().describe('Plan-Inhalt/Titel, z.B. «Grundriss EG»'),
  planNummer: z.string().optional().describe('Plannummer, z.B. «A-102»'),
  disziplin: z.string().optional().describe('Disziplin/Fachbereich, z.B. «Architektur»'),
  geschossCode: z.string().optional().describe('Geschoss-Kürzel des Plankopfs, z.B. «EG»'),
  gezeichnet: z.string().optional().describe('Gezeichnet von (Kürzel/Name)'),
  geprueft: z.string().optional().describe('Geprüft von (Kürzel/Name)'),
  datum: z.string().optional().describe('Datum als Text (de-CH), z.B. «14.07.2026»'),
});

export const setPlankopf = registerCommand({
  id: 'publish.plankopfSetzen',
  title: 'Plankopf setzen',
  description:
    'Setzt/ergänzt die Plankopf-Textfelder eines Blatts (Inhalt, Plannummer, Disziplin, Geschoss-Code, gezeichnet/geprüft von, Datum) — additiv wie design.projektInfoSetzen: nur im patch enthaltene Felder ändern sich, weggelassene bleiben unverändert. Reine Datenhaltung dieser Runde: der Kopfstempel selbst wird erst in einem späteren Ableitungspaket gezeichnet, ein Blatt ohne gesetzten Plankopf bleibt im Plan-Bild unverändert.',
  params: z.object({
    sheetId: z.string(),
    patch: SheetPlankopfPatchSchema,
  }),
  summarize: (p, doc) => {
    const sheet = doc.get<Sheet>(p.sheetId);
    const name = sheet && sheet.kind === 'sheet' ? sheet.name : p.sheetId;
    const felder = Object.keys(p.patch);
    return felder.length > 0 ? `Plankopf «${name}»: ${felder.join(', ')}` : `Plankopf «${name}»: keine Änderung`;
  },
  run: (doc, p) => {
    const sheet = requireSheet(doc, p.sheetId);
    const vorher: SheetPlankopf = sheet.plankopf ?? {};
    const nachher = mergeTeilPatch(vorher, p.patch);
    const after: Sheet = { ...sheet, plankopf: nachher };
    return [{ id: sheet.id, before: sheet, after }];
  },
});

export const setBlattLayout = registerCommand({
  id: 'publish.blattLayoutSetzen',
  title: 'Blatt-Layout setzen',
  description:
    'Setzt/ergänzt die Layout-Schalter eines Blatts (Heftrand, Faltmarken, Wasserzeichen, Massstabsbalken, Nordpfeil) — additiv wie design.projektInfoSetzen: nur im patch enthaltene Felder ändern sich, weggelassene bleiben unverändert. Reine Datenhaltung dieser Runde: das Zeichnen der Schalter folgt in einem späteren Ableitungspaket, ein Blatt ohne gesetztes Layout bleibt im Plan-Bild unverändert.',
  params: z.object({
    sheetId: z.string(),
    patch: SheetLayoutPatchSchema,
  }),
  summarize: (p, doc) => {
    const sheet = doc.get<Sheet>(p.sheetId);
    const name = sheet && sheet.kind === 'sheet' ? sheet.name : p.sheetId;
    const felder = Object.keys(p.patch);
    return felder.length > 0 ? `Layout «${name}»: ${felder.join(', ')}` : `Layout «${name}»: keine Änderung`;
  },
  run: (doc, p) => {
    const sheet = requireSheet(doc, p.sheetId);
    const vorher: SheetLayout = sheet.layout ?? {};
    const nachher = mergeTeilPatch(vorher, p.patch);
    const after: Sheet = { ...sheet, layout: nachher };
    return [{ id: sheet.id, before: sheet, after }];
  },
});

/**
 * Erlaubte MIME-Typen fürs Büro-Logo (v0.8.1 P7, `docs/V081-SPEZ.md` §6.1/
 * §7(e) «Logo-Export: SVG/JPG») — SVG (Vektor, verlustfrei, braucht keinen
 * Sanitizing-Pfad, weil `derive/plankopf.ts` es nur als `<image href="data:…">`
 * einbettet, nie ausführt/inlined) und JPG (zweites reales Rasterformat) sind
 * die zwei sanktionierten Formate. PNG bleibt bewusst aussen vor (C-24-
 * Abnahme: «PNG bleibt ehrlich abgelehnt») — dieselbe Ehrlichkeits-Haltung wie
 * zuvor, nur mit vertauschten Vorzeichen (v0.8.0 P2 akzeptierte NUR PNG,
 * dieses Paket dreht die Formatliste laut Owner-fixiertem Spez-Default um,
 * kein stiller Fallback in beide Richtungen).
 */
const LOGO_ERLAUBTE_MIMES = new Set(['image/svg+xml', 'image/jpeg']);

/**
 * Büro-Stammdaten (v0.8.0 P2, `BueroInfo` in `model/doc.ts`) — Name, Adresse,
 * Kürzel und Logo fürs Plankopf-Bürofeld. Merge-Semantik wie
 * `design.projektInfoSetzen` (nur übergebene Top-Level-Felder ändern sich,
 * kein Löschen — anders als `plankopfSetzen`/`blattLayoutSetzen` oben, die
 * ein verschachteltes `patch`-Objekt mit Lösch-Semantik tragen). `logoDataUrl`
 * akzeptiert seit v0.8.1 P7 SVG und JPG (`LOGO_ERLAUBTE_MIMES`) — PNG wird
 * bewusst weiterhin abgelehnt (s. Kommentar dort). EHRLICH (wie
 * `ProjektInfo`, s. `doc.ts` Kommentar bei `ProjektInfo`/`BueroInfo`, Zeilen
 * um 277–281 bzw. bei `BueroInfo` selbst): dieser Command schreibt eine
 * SettingsPatch — die läuft über Yjs/Undo/`.kosmo`-Export wie jede andere
 * Mutation, ABER `SyncClient` synct heute nur `entities` live, KEINE
 * SettingsPatches. Büro-Stammdaten sind also persistent (Undo, Vault,
 * `.kosmo`), aber NICHT live-kollaborativ zwischen zwei offenen Sitzungen —
 * dieselbe vertagte Folgearbeit an `@kosmo/sync` wie bei den
 * Projekt-Stammdaten, kein Bug dieser Runde.
 */
export const setBuero = registerCommand({
  id: 'publish.bueroSetzen',
  title: 'Büro-Stammdaten setzen',
  description:
    'Setzt/ergänzt die Büro-Stammdaten fürs Plankopf-Bürofeld (Name, Adresse, Kürzel, Logo) — additiv wie design.projektInfoSetzen: nur übergebene Felder ändern sich, der Rest bleibt. logoDataUrl akzeptiert AUSSCHLIESSLICH eine base64-data:-URL im Format SVG (data:image/svg+xml;base64,…) oder JPG (data:image/jpeg;base64,…) — PNG und jedes andere Format lösen einen Fehler aus. Ein neues Logo ersetzt ein vorheriges; der alte Bild-Asset wird entsorgt, falls ihn kein Blatt mehr braucht.',
  params: z.object({
    name: z.string().optional(),
    adresse: z.string().optional(),
    kuerzel: z.string().optional(),
    logoDataUrl: z
      .string()
      .optional()
      .describe('data:image/svg+xml;base64,… oder data:image/jpeg;base64,… — PNG wird nicht unterstützt'),
  }),
  summarize: (p) => {
    const teile: string[] = [];
    if (p.name !== undefined) teile.push(`Name «${p.name}»`);
    if (p.adresse !== undefined) teile.push(`Adresse «${p.adresse}»`);
    if (p.kuerzel !== undefined) teile.push(`Kürzel «${p.kuerzel}»`);
    if (p.logoDataUrl !== undefined) teile.push('Logo aktualisiert');
    return teile.length > 0 ? `Büro: ${teile.join(', ')}` : 'Büro: keine Änderung';
  },
  run: (doc, p) => {
    const vorher: BueroInfo = doc.settings.buero ?? {};
    const patches: AnyPatch[] = [];
    let logoAssetId: string | undefined = vorher.logoAssetId;

    if (p.logoDataUrl !== undefined) {
      const asset = assetAusDataUrl('Büro-Logo', p.logoDataUrl);
      if (!LOGO_ERLAUBTE_MIMES.has(asset.mime)) {
        throw new CommandError('Logo: SVG oder JPG erforderlich — PNG wird nicht unterstützt');
      }
      patches.push({ id: asset.id, before: null, after: asset });
      // Alten Logo-Asset entsorgen, falls kein Blatt (Bild-Slot) ihn noch
      // braucht — `{ buero: true }` schliesst NUR die eigene (noch nicht
      // aktualisierte) Buero-Referenz aus, ein Bild-Slot-Verweis zählt weiter.
      if (
        vorher.logoAssetId &&
        vorher.logoAssetId !== asset.id &&
        !assetNochReferenziert(doc, vorher.logoAssetId, { buero: true })
      ) {
        const alt = doc.get<ImageAsset>(vorher.logoAssetId);
        if (alt) patches.push({ id: alt.id, before: alt, after: null });
      }
      logoAssetId = asset.id;
    }

    const nachher: BueroInfo = {
      ...vorher,
      ...(p.name !== undefined ? { name: p.name } : {}),
      ...(p.adresse !== undefined ? { adresse: p.adresse } : {}),
      ...(p.kuerzel !== undefined ? { kuerzel: p.kuerzel } : {}),
      ...(logoAssetId !== undefined ? { logoAssetId } : {}),
    };
    patches.push({ settings: true as const, before: { buero: vorher }, after: { buero: nachher } });
    return patches;
  },
});
