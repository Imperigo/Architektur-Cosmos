import { useState } from 'react';
import { KButton } from '@kosmo/ui';
import { VIS_ONBOARDING_SCHRITTE } from './vis-onboarding-schritte';

/**
 * VisOnboarding (v0.8.1 / P8, 0.7.5-Welle-2 «Vis-Onboarding-Stepper», Spec
 * §6.2/§9.17, B-102 «Onboarding-Stepper (392px, 34px-Kreise)») — eigener,
 * kleiner Erststart-Stepper NUR für KosmoVis (NICHT `shell/
 * OnboardingWizard.tsx`, das ist der app-weite Assistent eines anderen
 * Pakets, hier bewusst nicht angefasst). 4 Schritte, klickbare 34px-Kreise
 * (fertig/aktuell/kommend), wörtlich das Soll-Mass aus dem Kosmo-Viz-Handoff.
 *
 * Container-baubar ohne HomeStation-Grenze: reine UI + `localStorage`-Flag
 * (Muster `kosmo.onboarded`), erklärt ausschliesslich real existierende
 * Features (`vis-onboarding-schritte.ts`).
 *
 * **Gate-Fund (P7, Gegenprobe während der Abnahme):** ein automatisches
 * Erstbesuchs-Overlay als `k-dialog-scrim` fängt zwangsläufig Pointer-Events
 * über der GESAMTEN Toolbar ab — 4 bestehende Specs, die direkt nach dem
 * ersten `module-vis`-Klick weiterklicken (`dock-presets.spec.ts` 3× via
 * `oeffneVisMitGraph()`, `module.spec.ts` «Vis → Blatt»), seedeten nie
 * `kosmo.vis.onboarded` (kein bestehender Spec kennt das neue Feature) und
 * liefen darum ins Leere. Fix nach dem BESTEHENDEN Muster für genau dieses
 * Problem (`state/abspiel-ebene.ts`s `abspielenAktiv()`, dort seit v0.7.2
 * etabliert): automatisches Zeigen unterbleibt unter `navigator.webdriver`
 * (jeder gewöhnliche Playwright-Lauf), AUSSER ein Test erzwingt es
 * ausdrücklich (`kosmo.vis.onboarding.erzwingen`, exklusiv für
 * `e2e/vis-onboarding.spec.ts`/`e2e/p8-081-screenshots.spec.ts` — dasselbe
 * `'erzwingen'`-Wort wie beim Abspiel-Test-Hook, keine zweite Konvention).
 * Der «?»-Knopf öffnet den Stepper JEDERZEIT manuell, unabhängig davon —
 * die 4 Reparatur-Specs bleiben also unberührt, das Feature selbst bleibt
 * für echte Nutzer:innen (kein `navigator.webdriver`) unverändert automatisch.
 */
const SPEICHER_SCHLUESSEL = 'kosmo.vis.onboarded';
const ERZWINGEN_SCHLUESSEL = 'kosmo.vis.onboarding.erzwingen';

export function istVisOnboardingGesehen(): boolean {
  try {
    return typeof localStorage !== 'undefined' && localStorage.getItem(SPEICHER_SCHLUESSEL) === '1';
  } catch {
    return true;
  }
}

/** Automatisches Zeigen beim Erstbesuch — s. Gate-Fund-Kommentar oben. */
export function sollVisOnboardingAutoZeigen(): boolean {
  if (istVisOnboardingGesehen()) return false;
  try {
    const erzwungen = typeof localStorage !== 'undefined' && localStorage.getItem(ERZWINGEN_SCHLUESSEL) === '1';
    if (typeof navigator !== 'undefined' && navigator.webdriver === true && !erzwungen) return false;
  } catch {
    /* ignore — im Zweifel automatisch zeigen (Default-Verhalten für echte Nutzer:innen) */
  }
  return true;
}

export function setzeVisOnboardingGesehen(): void {
  try {
    if (typeof localStorage !== 'undefined') localStorage.setItem(SPEICHER_SCHLUESSEL, '1');
  } catch {
    /* privates Fenster o.ä. — dann zeigt sich der Stepper eben wieder, kein Absturz */
  }
}

export function VisOnboarding({ onClose }: { onClose: () => void }) {
  const [index, setIndex] = useState(0);
  const schritt = VIS_ONBOARDING_SCHRITTE[index]!;
  const letzter = index === VIS_ONBOARDING_SCHRITTE.length - 1;

  const schliessen = () => {
    setzeVisOnboardingGesehen();
    onClose();
  };

  return (
    <div className="k-dialog-scrim" data-testid="vis-onboarding" role="dialog" aria-label="KosmoVis — Erste Schritte">
      <div
        className="k-dialog k-skalieren-ein"
        style={{
          width: 392,
          maxWidth: '100%',
          background: 'var(--k-surface)',
          border: '1px solid var(--k-line)',
          borderRadius: 'var(--k-radius-lg)',
          boxShadow: 'var(--k-shadow-overlay)',
          padding: 22,
          display: 'grid',
          gap: 18,
        }}
      >
        <div
          data-testid="vis-onboarding-stepper"
          role="group"
          aria-label={`Schritt ${index + 1} von ${VIS_ONBOARDING_SCHRITTE.length}`}
          style={{ display: 'flex', justifyContent: 'center', gap: 10 }}
        >
          {VIS_ONBOARDING_SCHRITTE.map((s, i) => {
            const fertig = i < index;
            const aktuell = i === index;
            return (
              <button
                key={s.id}
                type="button"
                data-testid={`vis-onboarding-kreis-${i}`}
                title={s.titel}
                aria-label={`${fertig ? 'Erledigt' : aktuell ? 'Aktueller Schritt' : 'Kommt noch'}: ${s.titel}`}
                onClick={() => setIndex(i)}
                className="k-druck"
                style={{
                  width: 34,
                  height: 34,
                  borderRadius: 999,
                  display: 'grid',
                  placeItems: 'center',
                  cursor: 'pointer',
                  fontFamily: 'var(--k-font-mono)',
                  fontSize: 12,
                  fontWeight: 700,
                  border: `2px solid ${fertig ? 'var(--k-success)' : aktuell ? 'var(--k-signal)' : 'var(--k-line)'}`,
                  background: fertig
                    ? 'color-mix(in srgb, var(--k-success) 16%, transparent)'
                    : aktuell
                      ? 'color-mix(in srgb, var(--k-signal) 14%, transparent)'
                      : 'transparent',
                  color: fertig || aktuell ? 'var(--k-ink)' : 'var(--k-ink-faint)',
                }}
              >
                {fertig ? '✓' : i + 1}
              </button>
            );
          })}
        </div>
        <div style={{ display: 'grid', gap: 8, textAlign: 'center' }}>
          <div
            style={{
              fontFamily: 'var(--k-font-mono)',
              fontSize: 12,
              fontWeight: 700,
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              color: 'var(--k-ink)',
            }}
          >
            {schritt.titel}
          </div>
          <div style={{ fontSize: 13.5, lineHeight: 1.5, color: 'var(--k-ink-soft)' }}>{schritt.text}</div>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <KButton size="sm" tone="ghost" data-testid="vis-onboarding-ueberspringen" onClick={schliessen}>
            Überspringen
          </KButton>
          <div style={{ display: 'flex', gap: 8 }}>
            {index > 0 && (
              <KButton size="sm" tone="ghost" data-testid="vis-onboarding-zurueck" onClick={() => setIndex((i) => i - 1)}>
                Zurück
              </KButton>
            )}
            <KButton
              size="sm"
              tone="accent"
              data-testid="vis-onboarding-weiter"
              onClick={() => (letzter ? schliessen() : setIndex((i) => i + 1))}
            >
              {letzter ? 'Fertig' : 'Weiter'}
            </KButton>
          </div>
        </div>
      </div>
    </div>
  );
}
