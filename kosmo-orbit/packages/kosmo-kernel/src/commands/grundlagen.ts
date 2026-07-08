import { z } from 'zod';
import { newId } from '../model/ids';
import type { MassBody, Storey, Zone } from '../model/entities';
import type { AnyPatch, KosmoDoc } from '../model/doc';
import { CommandError, registerCommand } from './core';
import {
  generiereVolumenstudien,
  studienOptionenAusRegel,
  type StudienOptionen,
  type StudienVariante,
} from '../derive/volumenstudie';
import { programmErfuellungJeVariante } from '../derive/programmerfuellung';

/**
 * Grundlagen-Commands — Wettbewerbs-Grundlagenstudie (Batch D4,
 * `docs/WETTBEWERB-KONZEPT.md`, Entscheid D-E9). D1–D3 lieferten reine
 * Ableitungen (`studienOptionenAusRegel`, `generiereVolumenstudien`,
 * `programmErfuellungJeVariante`) — keine davon war ein Kosmo-Tool, weil
 * Kosmos Werkzeugkasten exakt die registrierten Commands ist
 * (`CLAUDE.md`). Dieser Command ist die fehlende Verdrahtung: EIN
 * registrierter Aufruf, der die Kette anstösst UND das Ergebnis als echte
 * `MassBody`-Entities ins Modell schreibt — kein Lese-only-Tool, sondern
 * derselbe Übernahme-Pfad, den das Studien-Panel bisher von Hand ging
 * (`design.volumenErstellen` je Körper), nur jetzt automatisch und in
 * einem Rutsch. `execute()` liefert alle Patches aus einem `run()`-Aufruf
 * zurück und die App zeichnet sie mit einem `history.record(...)` auf —
 * das ist bereits eine atomare Undo-Gruppe, ohne eigenes
 * `beginGroup`/`endGroup`.
 */

function added(e: import('../model/entities').Entity): AnyPatch {
  return { id: e.id, before: null, after: e };
}

interface StudieAufloesung {
  parzelle: Zone;
  zielGf: number;
  alleVarianten: StudienVariante[];
  varianteIndex: number;
  variante: StudienVariante;
}

/**
 * Löst Parzelle, Zonenregel und GF-Ziel aus dem Doc auf (derselbe Weg wie
 * das Studien-Panel, `apps/kosmo-orbit/src/modules/design/DesignWorkspace.tsx`
 * `StudienPanel`: die zuletzt gezeichnete Zone des Geschosses gilt als
 * Baufeld) und wählt die Variante. Wirft `CommandError` mit einer ehrlichen
 * Begründung statt zu raten — wird von `run()` (muss werfen) UND von
 * `summarize()` (fängt ab, s.dort) genutzt.
 */
function loeseStudieAuf(
  doc: KosmoDoc,
  p: { storeyId: string; varianteIndex?: number | undefined; zielGf?: number | undefined; maxHoehe?: number | undefined },
): StudieAufloesung {
  const storey = doc.get(p.storeyId);
  if (!storey || storey.kind !== 'storey') {
    throw new CommandError(`Geschoss «${p.storeyId}» existiert nicht`);
  }

  const zonen = doc.byKind<Zone>('zone').filter((z) => z.storeyId === p.storeyId);
  const parzelle = zonen[zonen.length - 1];
  if (!parzelle) {
    throw new CommandError(
      `Kein Baufeld im Geschoss «${(storey as Storey).name}»: zuerst die Parzelle als Zone zeichnen ` +
        '(design.zoneErstellen) — die zuletzt gezeichnete Zone des Geschosses gilt als Baufeld.',
    );
  }

  const regel = doc.settings.zonenRegel;
  const regelOptionen = studienOptionenAusRegel(regel ?? undefined, doc.settings.parzellenFlaeche);

  const zielGf = p.zielGf ?? regelOptionen.zielGf;
  if (zielGf === undefined) {
    throw new CommandError(
      'Kein GF-Ziel bestimmbar: weder eine aktive Zonenregel mit Ausnützungsziffer UND Parzellenfläche ' +
        '(design.zonenRegelSetzen) noch ein zielGf-Override am Command. Eines von beidem ist nötig — ' +
        'ohne Zahlen wird nicht geraten.',
    );
  }
  const maxHoehe = p.maxHoehe ?? regelOptionen.maxHoehe;

  const opts: StudienOptionen = {
    zielGf,
    ...(maxHoehe !== undefined ? { maxHoehe } : {}),
    ...(regelOptionen.grenzabstand !== undefined ? { grenzabstand: regelOptionen.grenzabstand } : {}),
  };
  const alleVarianten = generiereVolumenstudien(parzelle.outline, opts);
  if (alleVarianten.length === 0) {
    throw new CommandError(
      'Auf dieser Parzelle passt keine Typologie (leeres Ergebnis) — Grenzabstand oder Zuschnitt prüfen.',
    );
  }

  let varianteIndex: number;
  if (p.varianteIndex !== undefined) {
    if (p.varianteIndex >= alleVarianten.length) {
      throw new CommandError(
        `varianteIndex ${p.varianteIndex} ausserhalb — auf dieser Parzelle passen nur ` +
          `${alleVarianten.length} von 6 Typologien (gültig: 0..${alleVarianten.length - 1}).`,
      );
    }
    varianteIndex = p.varianteIndex;
  } else {
    // Default: beste nach zielGf-Nähe (kleinste |gf - zielGf|).
    varianteIndex = 0;
    let besteDiff = Math.abs(alleVarianten[0]!.gf - zielGf);
    for (let i = 1; i < alleVarianten.length; i++) {
      const diff = Math.abs(alleVarianten[i]!.gf - zielGf);
      if (diff < besteDiff) {
        besteDiff = diff;
        varianteIndex = i;
      }
    }
  }

  return { parzelle, zielGf, alleVarianten, varianteIndex, variante: alleVarianten[varianteIndex]! };
}

export const grundlagenVolumenstudie = registerCommand({
  id: 'grundlagen.volumenstudie',
  title: 'Extremvarianten-Studie erzeugen',
  description:
    'Erzeugt die automatisierte Extremvarianten-Studie (Wettbewerbs-Grundlagenanalyse, bis zu sechs ' +
    'Typologien: Teppich, Riegel, Turm, Zeilen, Winkel, Blockrand) und übernimmt EINE davon als ' +
    'Volumenkörper (MassBody, Nutzung «studie») ins angegebene Geschoss. GF-Ziel, maximale Höhe und ' +
    'Grenzabstand kommen automatisch aus der aktiven Zonenregel des Projekts (design.zonenRegelSetzen) ' +
    'plus der hinterlegten Parzellenfläche — dieselbe Quelle wie im Studien-Panel. zielGf/maxHoehe können ' +
    'stattdessen explizit übergeben werden (Override), z.B. wenn noch keine Zonenregel gesetzt ist. Ohne ' +
    'Zonenregel UND ohne Override bricht der Befehl ehrlich mit einer Fehlermeldung ab, statt Zahlen zu ' +
    'erfinden. varianteIndex wählt eine bestimmte Typologie (0-basiert, Reihenfolge Teppich/Riegel/Turm/' +
    'Zeilen/Winkel/Blockrand, je nach Parzelle fallen einzelne weg); ohne varianteIndex wird automatisch ' +
    'die Typologie gewählt, deren Gesamt-GF dem Ziel am nächsten liegt. Das Ergebnis ist eine Vorentwurfs-' +
    'Übersicht, kein fertiger Entwurf — die Wahl bleibt beim Architekten. Ein Aufruf erzeugt alle Körper ' +
    'der gewählten Variante als EINE atomare Undo-Gruppe: «Rückgängig» nimmt sie vollständig wieder ' +
    'zurück, unabhängig davon, wie viele Körper die Typologie hat.',
  params: z.object({
    storeyId: z.string().describe('Geschoss, dessen zuletzt gezeichnete Zone als Baufeld/Parzelle gilt'),
    varianteIndex: z
      .number()
      .int()
      .min(0)
      .optional()
      .describe('0-basierter Index der gewünschten Typologie; ohne Angabe: beste GF-Näherung ans Ziel'),
    zielGf: z.number().positive().optional().describe('Override GF-Ziel (m²) statt Zonenregel × Parzellenfläche'),
    maxHoehe: z.number().int().positive().optional().describe('Override max. Gebäudehöhe (mm) statt Zonenregel'),
  }),
  summarize: (p, doc) => {
    if (!doc) return 'Extremvarianten-Studie (Details erst nach Ausführung sichtbar)';
    let a: StudieAufloesung;
    try {
      a = loeseStudieAuf(doc, p);
    } catch (err) {
      // Diese Vorschau (kosmo-ai-Diff-Karte) läuft VOR `run()` — ein
      // ungültiger Zustand (keine Parzelle/kein GF-Ziel) darf hier nicht
      // abstürzen. `run()` wirft denselben Fehler beim echten Ausführen.
      return `Extremvarianten-Studie: ${err instanceof CommandError ? err.message : 'nicht auswertbar'}`;
    }
    const { variante } = a;
    const koerperAnzahl = variante.koerper.length;
    const raumprogramm = doc.settings.raumprogramm;
    if (raumprogramm.length > 0) {
      const [erfuellung] = programmErfuellungJeVariante([variante], raumprogramm, doc.settings.programmFaktor);
      if (erfuellung && erfuellung.erfuellungProzent !== null) {
        return (
          `Extremvarianten-Studie «${variante.name}»: ${koerperAnzahl} Körper, GF ${variante.gf} m² ` +
          `(Ziel ${erfuellung.sollGf} m², Erfüllung ${erfuellung.erfuellungProzent} %)`
        );
      }
    }
    // Ehrlich ohne Ziel/Erfüllung, wenn kein Raumprogramm hinterlegt ist —
    // das GF-Ziel der Studie (Zonenregel/Override) ist kein Raumprogramm-Soll.
    return `Extremvarianten-Studie «${variante.name}»: ${koerperAnzahl} Körper, GF ${variante.gf} m²`;
  },
  run: (doc, p) => {
    const { variante } = loeseStudieAuf(doc, p);
    return variante.koerper.map((k) => {
      const mass: MassBody = {
        id: newId('volumen'),
        kind: 'mass',
        storeyId: p.storeyId,
        outline: k.outline,
        height: k.height,
        baseOffset: 0,
        program: k.program,
      };
      return added(mass);
    });
  },
});
