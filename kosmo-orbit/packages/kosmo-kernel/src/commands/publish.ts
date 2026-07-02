import { z } from 'zod';
import { newId } from '../model/ids';
import type { Sheet, SheetPlacement, SheetText, Storey } from '../model/entities';
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
