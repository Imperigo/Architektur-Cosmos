import 'fake-indexeddb/auto';
import { describe, expect, it } from 'vitest';
import { ladeReferenzenLive, type RefEintrag } from '../src/live';

/**
 * F8 (Owner-Befund v0.6.4, Live-Test 0.6.3-Desktop): «Wieso sehe ich
 * KosmoData-Daten nicht, es steht offline seed.» Diagnose: im Desktop-Build
 * ist der Website-Sync (architekturkosmos.ch-Datenbezug) nicht erreichbar/
 * nicht konfiguriert — `ladeReferenzenLive()` MUSS in diesem Fall ehrlich
 * `null` liefern (nie werfen), damit der Aufrufer (DataWorkspace.tsx) beim
 * eingebauten Seed bleibt und ihn VOLL weiter anzeigt, statt auf einer
 * unbehandelten Ablehnung hängen zu bleiben.
 */
describe('ladeReferenzenLive — Website-Sync unerreichbar (F8, Owner-Befund v0.6.4)', () => {
  it('liefert null (kein Wurf) wenn der Sync-Endpoint nicht erreichbar ist und kein Cache existiert', async () => {
    const fetcher = (async () => {
      throw new Error('network unreachable — Website-Sync im Desktop-Build nicht konfiguriert');
    }) as typeof fetch;
    await expect(ladeReferenzenLive(fetcher)).resolves.toBeNull();
  });

  it('liefert null auch bei einer Nicht-OK-Antwort (z.B. 404/500 vom Sync-Endpoint)', async () => {
    const fetcher = (async () => ({ ok: false, status: 404 })) as unknown as typeof fetch;
    await expect(ladeReferenzenLive(fetcher)).resolves.toBeNull();
  });

  it('greift bei einem Netzfehler auf den letzten guten Cache-Stand zurück (quelle: "cache")', async () => {
    const eintraege: RefEintrag[] = [{ id: 'ref-x', title: 'Cache-Beispiel' }];
    const okFetcher = (async () => ({
      ok: true,
      json: async () => eintraege,
    })) as unknown as typeof fetch;
    // Erst erfolgreich laden — schreibt den IndexedDB-Cache.
    const erster = await ladeReferenzenLive(okFetcher);
    expect(erster?.quelle).toBe('live');

    // Jetzt scheitert der Sync-Endpoint — der Cache muss trotzdem greifen.
    const failFetcher = (async () => {
      throw new Error('offline');
    }) as typeof fetch;
    const zweiter = await ladeReferenzenLive(failFetcher);
    expect(zweiter?.quelle).toBe('cache');
    expect(zweiter?.eintraege).toEqual(eintraege);
  });

  it('liefert bei Erfolg quelle: "live" mit den Rohdaten des Sync-Endpoints', async () => {
    const eintraege: RefEintrag[] = [{ id: 'ref-y', title: 'Live-Beispiel' }];
    const fetcher = (async () => ({
      ok: true,
      json: async () => eintraege,
    })) as unknown as typeof fetch;
    const ergebnis = await ladeReferenzenLive(fetcher);
    expect(ergebnis?.quelle).toBe('live');
    expect(ergebnis?.eintraege).toEqual(eintraege);
    expect(typeof ergebnis?.stand).toBe('string');
  });
});
