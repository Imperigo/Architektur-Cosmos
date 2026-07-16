import { describe, expect, it } from 'vitest';
import {
  ALLE_ZUSTAENDE,
  STATUS_LABEL,
  STATUS_TON,
  ZUSTAND_INFO,
  auftragsKarten,
  companionKarten,
  orbZustandFuerKarte,
  phasenSegmente,
  visKarten,
  type CompanionKartenStatus,
} from '../src/shell/companion-daten';
import type { Auftrag } from '../src/state/auftragsbuch';
import type { NodeLauf } from '../src/modules/vis/vis-runtime';
import type { KosmoZustand } from '../src/state/kosmo-status';

/**
 * V0.7.2 W4-G (Spec §10 «Companion minimal») — reine Karten-Ableitung aus
 * den zwei bestehenden Laufzeit-Quellen. Kein DOM, keine IndexedDB/Bridge —
 * die Fixtures unten sind exakt die Shapes, die `listeAuftraege()` bzw.
 * `useVisRuntime.getState().laeufe` tatsächlich liefern.
 */

function auftrag(teil: Partial<Auftrag>): Auftrag {
  return {
    id: 'a1',
    ts: '2026-07-11T08:00:00.000Z',
    text: 'Türfarbe prüfen',
    quelle: 'getippt',
    station: 'KosmoDesign',
    status: 'offen',
    ...teil,
  };
}

function lauf(status: NodeLauf['status'], extra: Partial<NodeLauf> = {}): NodeLauf {
  return { status, memoKey: 'k', ...extra };
}

describe('companion-daten (Spec §10) — Auftragsbuch-Karten', () => {
  it('zeigt offene und an-worker-Aufträge, aber NIE erledigte (kein "laufender" Auftrag mehr)', () => {
    const auftraege = [
      auftrag({ id: 'a1', status: 'offen' }),
      auftrag({ id: 'a2', status: 'an-worker' }),
      auftrag({ id: 'a3', status: 'erledigt' }),
    ];
    const karten = auftragsKarten(auftraege);
    expect(karten.map((k) => k.id)).toEqual(['auftrag-a1', 'auftrag-a2']);
    expect(karten.every((k) => k.brauchtFreigabe === false)).toBe(true);
    expect(karten.every((k) => k.rolle === '--k-rolle-pna')).toBe(true);
  });

  it('leere Auftragsliste → leere Kartenliste (kein erfundener Platzhalter)', () => {
    expect(auftragsKarten([])).toEqual([]);
  });
});

describe('companion-daten (Spec §10) — Vis-Runtime-Karten', () => {
  it('zeigt nur OFFENE_LAUF_STATUS-Einträge — fertig/fehler/abgebrochen fallen weg', () => {
    const laeufe = {
      n1: lauf('gesendet'),
      n2: lauf('wartetFreigabe', { jobId: 'j1', approvalToken: 'tok' }),
      n3: lauf('fertig'),
      n4: lauf('fehler'),
      n5: lauf('abgebrochen'),
      n6: lauf('zeitueberschreitung'),
    };
    const karten = visKarten(laeufe);
    expect(karten.map((k) => k.nodeId).sort()).toEqual(['n1', 'n2']);
  });

  it('brauchtFreigabe nur bei wartetFreigabe MIT jobId+approvalToken (sonst wäre die Route nicht aufrufbar)', () => {
    const laeufe = {
      ohneToken: lauf('wartetFreigabe'),
      mitToken: lauf('wartetFreigabe', { jobId: 'j2', approvalToken: 'tok2' }),
      rendert: lauf('rendert', { jobId: 'j3' }),
    };
    const karten = visKarten(laeufe);
    const ohne = karten.find((k) => k.nodeId === 'ohneToken')!;
    const mit = karten.find((k) => k.nodeId === 'mitToken')!;
    const rendert = karten.find((k) => k.nodeId === 'rendert')!;
    expect(ohne.brauchtFreigabe).toBe(false);
    expect(mit.brauchtFreigabe).toBe(true);
    expect(mit.jobId).toBe('j2');
    expect(mit.approvalToken).toBe('tok2');
    expect(rendert.brauchtFreigabe).toBe(false);
  });

  it('leere Läufe → leere Kartenliste', () => {
    expect(visKarten({})).toEqual([]);
  });
});

describe('companion-daten (Spec §10) — companionKarten() Zusammenführung', () => {
  it('Freigabe-bedürftige Karten stehen zuoberst, sonst bleibt die Quellreihenfolge stabil', () => {
    const auftraege = [auftrag({ id: 'a1', status: 'offen' }), auftrag({ id: 'a2', status: 'an-worker' })];
    const laeufe = {
      n1: lauf('gesendet'),
      n2: lauf('wartetFreigabe', { jobId: 'j', approvalToken: 't' }),
    };
    const karten = companionKarten(auftraege, laeufe);
    expect(karten[0]!.brauchtFreigabe).toBe(true);
    expect(karten[0]!.nodeId).toBe('n2');
    // Rest bleibt in Quellreihenfolge (Vis vor Auftragsbuch, je stabil).
    expect(karten.slice(1).map((k) => k.id)).toEqual(['vis-n1', 'auftrag-a1', 'auftrag-a2']);
  });

  it('komplett leer (kein Auftrag, kein Lauf) → leere Liste — Companion.tsx zeigt dann den ehrlichen Leerzustand', () => {
    expect(companionKarten([], {})).toEqual([]);
  });
});

describe('companion-daten (Spec §10) — STATUS_LABEL/STATUS_TON decken jeden Status ab', () => {
  it('jeder mögliche CompanionKartenStatus hat ein UPPERCASE-Label und einen Ton', () => {
    const alle: CompanionKartenStatus[] = [
      'offen',
      'an-worker',
      'erledigt',
      'gesendet',
      'wartetFreigabe',
      'wartetGpu',
      'rendert',
      'fertig',
      'fehler',
      'abgebrochen',
      'zeitueberschreitung',
    ];
    for (const status of alle) {
      expect(STATUS_LABEL[status], status).toBe(STATUS_LABEL[status].toUpperCase());
      expect(['ruhe', 'laeuft', 'erfolg', 'fehler']).toContain(STATUS_TON[status]);
    }
  });
});

describe('companion-daten (Spec §10) — phasenSegmente()', () => {
  it('füllt genau n von 5 Segmenten, aufsteigend', () => {
    expect(phasenSegmente(1)).toEqual([true, false, false, false, false]);
    expect(phasenSegmente(3)).toEqual([true, true, true, false, false]);
    expect(phasenSegmente(5)).toEqual([true, true, true, true, true]);
  });
});

describe('v0.7.6 Welle 2 (Companion orb-zentriert) — ZUSTAND_INFO/ALLE_ZUSTAENDE', () => {
  it('deckt alle 9 echten KosmoZustand-Werte ab, jeder mit UPPERCASE-Label + Farb-Token + Satz', () => {
    const alle: KosmoZustand[] = [
      'idle',
      'thinking',
      'listening',
      'speaking',
      'writing',
      'dispatching',
      'done',
      'error',
      'takeover',
    ];
    for (const z of alle) {
      const info = ZUSTAND_INFO[z];
      expect(info, z).toBeDefined();
      expect(info.label, z).toBe(info.label.toUpperCase());
      expect(info.farbe.startsWith('--'), z).toBe(true);
      expect(info.caption.length, z).toBeGreaterThan(0);
    }
  });

  it('ALLE_ZUSTAENDE ist exakt eine Permutation der 9 ZUSTAND_INFO-Schlüssel (keine Lücke, keine Dopplung)', () => {
    expect([...ALLE_ZUSTAENDE].sort()).toEqual(Object.keys(ZUSTAND_INFO).sort());
    expect(new Set(ALLE_ZUSTAENDE).size).toBe(ALLE_ZUSTAENDE.length);
  });
});

describe('v0.8.1 / P8 (Schwarm-Orbs, §6.2) — orbZustandFuerKarte', () => {
  it('leitet für jeden CompanionKartenStatus einen gültigen KosmoZustand aus STATUS_TON ab', () => {
    for (const status of Object.keys(STATUS_TON) as CompanionKartenStatus[]) {
      const zustand = orbZustandFuerKarte({ status });
      expect(ZUSTAND_INFO[zustand], status).toBeDefined();
    }
  });

  it('laufende Status (Ton «laeuft») zeigen sich als «dispatching» (Generator-Handoff)', () => {
    expect(orbZustandFuerKarte({ status: 'rendert' })).toBe('dispatching');
    expect(orbZustandFuerKarte({ status: 'wartetGpu' })).toBe('dispatching');
    expect(orbZustandFuerKarte({ status: 'an-worker' })).toBe('dispatching');
  });

  it('Erfolg → done, Fehler → error, Ruhe → idle', () => {
    expect(orbZustandFuerKarte({ status: 'fertig' })).toBe('done');
    expect(orbZustandFuerKarte({ status: 'fehler' })).toBe('error');
    expect(orbZustandFuerKarte({ status: 'offen' })).toBe('idle');
  });
});
