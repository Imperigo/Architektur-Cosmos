import { beforeEach, describe, expect, it } from 'vitest';
import { usePlanAnsicht } from '../src/state/plan-ansicht';

/**
 * PD3c («Island-Modus radikal leer», Owner-Befehl 17.07.2026) — der neue,
 * additive `state/plan-ansicht.ts`-Store, der `achsenAn`/`graphAn`/`traceId`
 * aus dem bisherigen PlanView-lokalen `useState` hebt. Eigene, NEUE Testdatei
 * (Bauauftrag: neue Tests nur in neuen Dateien) — `PlanView.tsx`/
 * `island/inhalte/ansicht.tsx` konsumieren denselben Store, hier nur der
 * Store selbst isoliert getestet.
 *
 * Kein `localStorage`/`neuLadenAusSpeicher`-Reset nötig (anders als
 * `ui-zustand.ts`s Tests): dieser Store ist bewusst NICHT persistiert, jeder
 * Test setzt seinen benötigten Ausgangswert darum explizit selbst.
 */

beforeEach(() => {
  // Reiner In-Memory-Store ohne Speicher-Layer — zwischen Tests hart auf die
  // dokumentierten Defaults zurücksetzen (kein `create()`-Neubau nötig).
  usePlanAnsicht.setState({ achsenAn: false, graphAn: false, traceId: '' });
});

describe('plan-ansicht — Defaults', () => {
  it('Achsen/Graph starten aus, Trace ist leer (identisch zum bisherigen PlanView-useState)', () => {
    const s = usePlanAnsicht.getState();
    expect(s.achsenAn).toBe(false);
    expect(s.graphAn).toBe(false);
    expect(s.traceId).toBe('');
  });
});

describe('plan-ansicht — Setter', () => {
  it('setAchsenAn schreibt sofort in den Store', () => {
    usePlanAnsicht.getState().setAchsenAn(true);
    expect(usePlanAnsicht.getState().achsenAn).toBe(true);
    usePlanAnsicht.getState().setAchsenAn(false);
    expect(usePlanAnsicht.getState().achsenAn).toBe(false);
  });

  it('setGraphAn schreibt sofort in den Store', () => {
    usePlanAnsicht.getState().setGraphAn(true);
    expect(usePlanAnsicht.getState().graphAn).toBe(true);
  });

  it('setTraceId schreibt eine Geschoss-Id, leerer String schaltet wieder aus', () => {
    usePlanAnsicht.getState().setTraceId('geschoss-eg');
    expect(usePlanAnsicht.getState().traceId).toBe('geschoss-eg');
    usePlanAnsicht.getState().setTraceId('');
    expect(usePlanAnsicht.getState().traceId).toBe('');
  });

  it('die drei Felder sind unabhängig voneinander (kein gegenseitiges Überschreiben)', () => {
    const { setAchsenAn, setGraphAn, setTraceId } = usePlanAnsicht.getState();
    setAchsenAn(true);
    setGraphAn(true);
    setTraceId('og1');
    const s = usePlanAnsicht.getState();
    expect(s.achsenAn).toBe(true);
    expect(s.graphAn).toBe(true);
    expect(s.traceId).toBe('og1');
  });
});

describe('plan-ansicht — NICHT persistiert (reiner Laufzeit-Anzeigezustand)', () => {
  it('schreibt nichts unter einem eigenen Schlüssel in localStorage', () => {
    // Diese Testdatei läuft (anders als `ui-zustand.test.ts`) in der reinen
    // Node-Vitest-Umgebung ohne DOM-Stub — `usePlanAnsicht` importiert
    // `state/ui-zustand.ts` NICHT (additiv, dateidisjunkt), installiert also
    // auch dessen `localStorage`-Stub nicht mit. Ist gar kein `localStorage`
    // vorhanden, ist die Nicht-Persistenz per Konstruktion erfüllt (der
    // Store-Code enthält keinerlei `localStorage`-Zugriff, s. `state/
    // plan-ansicht.ts`) — die Assertion greift nur, wenn die Umgebung eines
    // kennt.
    if (typeof localStorage === 'undefined') return;
    localStorage.clear();
    usePlanAnsicht.getState().setAchsenAn(true);
    usePlanAnsicht.getState().setGraphAn(true);
    usePlanAnsicht.getState().setTraceId('og1');
    // Kein `kosmo.plan-ansicht.*`-Schlüssel (oder irgendein anderer) —
    // anders als `state/ui-zustand.ts` (`kosmo.ui.v1`) ist dieser Store
    // bewusst NICHT persistiert (Store-Kopfkommentar).
    expect(localStorage.length).toBe(0);
  });
});
