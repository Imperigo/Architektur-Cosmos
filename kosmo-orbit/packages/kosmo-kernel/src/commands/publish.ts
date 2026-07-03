import { z } from 'zod';
import { newId } from '../model/ids';
import type { ImageAsset, Sheet, SheetImage, SheetPlacement, SheetText, Storey } from '../model/entities';
import type { AnyPatch, KosmoDoc } from '../model/doc';
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

export const createSheet = registerCommand({
  id: 'publish.blattErstellen',
  title: 'Planblatt erstellen',
  description:
    'Erstellt ein leeres Planblatt für den Plansatz. format: A0–A4 (Standard A1), orientation: quer oder hoch.',
  params: z.object({
    name: z.string().describe('Blattname, z.B. «Grundrisse 1:100»'),
    format: z.enum(['A0', 'A1', 'A2', 'A3', 'A4']).default('A1'),
    orientation: z.enum(['quer', 'hoch']).default('quer'),
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
    };
    return [{ id: sheet.id, before: null, after: sheet }];
  },
});

export const placeView = registerCommand({
  id: 'publish.ansichtPlatzieren',
  title: 'Ansicht auf Blatt platzieren',
  description:
    'Platziert einen Grundriss, Schnitt oder eine Axonometrie auf einem Planblatt. view: grundriss (braucht storeyId), schnitt (braucht Schnittlinie a→b) oder axo (Militärperspektive des ganzen Modells). scale: Massstab (100 = 1:100). x/y: Mittelpunkt der Zeichnung auf dem Blatt in Papier-mm.',
  params: z.object({
    sheetId: z.string(),
    view: z.enum(['grundriss', 'schnitt', 'axo']),
    storeyId: z.string().optional().describe('Quell-Geschoss (bei grundriss)'),
    a: PtSchema.optional().describe('Schnittlinien-Anfang (bei schnitt, Welt-mm)'),
    b: PtSchema.optional().describe('Schnittlinien-Ende (bei schnitt, Welt-mm)'),
    scale: z.number().int().min(1).max(2000).default(100),
    x: z.number().describe('Papier-mm ab links'),
    y: z.number().describe('Papier-mm ab oben'),
    title: z.string().optional(),
  }),
  summarize: (p) =>
    `${p.view === 'schnitt' ? 'Schnitt' : p.view === 'axo' ? 'Axonometrie' : 'Grundriss'} 1:${p.scale} platzieren`,
  run: (doc, p) => {
    const sheet = requireSheet(doc, p.sheetId);
    const placement: SheetPlacement = {
      id: newId('ansicht'),
      view: p.view,
      scale: p.scale,
      x: p.x,
      y: p.y,
      ...(p.title ? { title: p.title } : {}),
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
    'Ändert Massstab und/oder Titel einer platzierten Ansicht auf einem Planblatt.',
  params: z.object({
    sheetId: z.string(),
    placementId: z.string(),
    scale: z.number().int().min(1).max(2000).optional(),
    title: z.string().optional(),
  }),
  summarize: (p) => `Ansicht anpassen${p.scale ? ` (1:${p.scale})` : ''}`,
  run: (doc, p) => {
    const sheet = requireSheet(doc, p.sheetId);
    if (!sheet.placements.some((pl) => pl.id === p.placementId)) {
      throw new CommandError(`Platzierung «${p.placementId}» existiert nicht`);
    }
    const after: Sheet = {
      ...sheet,
      placements: sheet.placements.map((pl) =>
        pl.id === p.placementId
          ? {
              ...pl,
              scale: p.scale ?? pl.scale,
              ...(p.title === undefined ? {} : { title: p.title }),
            }
          : pl,
      ),
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

/** Referenziert irgendein Blatt (ausser optional einem Slot) dieses Asset noch? */
function assetNochReferenziert(doc: KosmoDoc, assetId: string, ausser: { sheetId: string; bildId: string }): boolean {
  for (const s of doc.byKind<Sheet>('sheet')) {
    for (const b of s.bilder ?? []) {
      if (b.assetId === assetId && !(s.id === ausser.sheetId && b.id === ausser.bildId)) return true;
    }
  }
  return false;
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
