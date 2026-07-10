import { describe, expect, it } from 'vitest';
import { KosmoDoc, execute } from '@kosmo/kernel';
import { ChatSession, ScriptedProvider, type SzenarioSkript } from '../src';

/**
 * Sim-Befund 0.6.7 (Journey A): `applyDefaults` darf Kontext-Defaults nur in
 * PFLICHT-Felder des Ziel-Commands stopfen. Der Anlassfall: die Wand-Aufbau-Id
 * des App-Kontexts landete im OPTIONALEN `assemblyId` von
 * `design.deckeZeichnen` — dessen run() lehnt einen Nicht-slab-Aufbau ab, und
 * der Schritt scheiterte erst beim Anwenden, für den Nutzer grundlos.
 */

function demoDoc() {
  const doc = new KosmoDoc();
  const eg = execute(doc, 'design.geschossErstellen', { name: 'EG', index: 0, elevation: 0, height: 3000 });
  const aufbau = execute(doc, 'design.aufbauErstellen', {
    name: 'AW Beton 36',
    target: 'wall',
    layers: [{ material: 'beton', thickness: 360, function: 'tragend' }],
  });
  return {
    doc,
    storeyId: (eg.patches[0] as { id: string }).id,
    assemblyId: (aufbau.patches[0] as { id: string }).id,
  };
}

async function proposalsFuer(skript: SzenarioSkript, nutzerText: string) {
  const { doc, storeyId, assemblyId } = demoDoc();
  const provider = new ScriptedProvider(skript.id, { [skript.id]: skript });
  const proposals: Array<{ commandId: string; params: Record<string, unknown> }> = [];
  const session = new ChatSession(
    provider,
    doc,
    {
      onText: () => {},
      onProposal: (p) => proposals.push(p as never),
      onBusy: () => {},
      onError: (e) => {
        throw new Error(e);
      },
    },
    'System',
    () => ({ storeyId, assemblyId }),
  );
  await session.send(nutzerText);
  return { proposals, storeyId, assemblyId };
}

describe('applyDefaults — Kontext-Defaults nur in Pflichtfelder', () => {
  it('füllt storeyId/assemblyId der Wand (beide Pflicht), aber NICHT das optionale assemblyId der Decke', async () => {
    const { proposals, storeyId, assemblyId } = await proposalsFuer(
      {
        id: 'defaults-probe',
        zuege: [
          {
            antwortText: 'Wand und Decke als ein Paket.',
            toolCalls: [
              { name: 'design_wandZeichnen', args: { a: { x: 0, y: 0 }, b: { x: 5000, y: 0 } } },
              {
                name: 'design_deckeZeichnen',
                args: {
                  outline: [
                    { x: 0, y: 0 },
                    { x: 5000, y: 0 },
                    { x: 5000, y: 4000 },
                    { x: 0, y: 4000 },
                  ],
                  thickness: 250,
                },
              },
            ],
          },
        ],
      },
      'Wand und Decke bitte',
    );

    expect(proposals).toHaveLength(2);
    const wand = proposals.find((p) => p.commandId === 'design.wandZeichnen')!;
    const decke = proposals.find((p) => p.commandId === 'design.deckeZeichnen')!;
    // Pflichtfelder kommen aus dem Kontext …
    expect(wand.params).toMatchObject({ storeyId, assemblyId });
    expect(decke.params).toMatchObject({ storeyId });
    // … das OPTIONALE Decken-assemblyId bleibt leer (kein Wand-Aufbau-Leck).
    expect((decke.params as Record<string, unknown>).assemblyId).toBeUndefined();
  });
});
