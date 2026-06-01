'use client';

import { useMemo, useState } from 'react';
import type { OrbitRoleVariant } from './OrbitRoleSwitcher';

type BlockedAction = {
  id: string;
  label: string;
  reason: string;
  gate_id: string;
};

type DemoStep = {
  id: string;
  roleId: string;
  title: string;
  intent: string;
  output: string;
};

type OrbitDemoReviewPathProps = {
  variants: OrbitRoleVariant[];
  blockedActions: BlockedAction[];
};

const demoPath: DemoStep[] = [
  {
    id: 'project-lead',
    roleId: 'project_lead_architect',
    title: 'Projektleitung klaert Blocker',
    intent: 'Projektstatus, offene Fragen und Abgabe-Risiken werden zuerst sichtbar gemacht.',
    output: 'Ergebnis: ein Mensch priorisiert, welche Blocker vor KosmoDesign geklaert werden.'
  },
  {
    id: 'design-review',
    roleId: 'design_architect',
    title: 'Entwurf prueft Kontext',
    intent: 'KosmoDesign wird nur als Review Mode geoeffnet: Kontext, Modellprofil und Referenzen werden beurteilt.',
    output: 'Ergebnis: Entwurf sieht das Potenzial, aber startet noch keine Design- oder Geometrie-Generierung.'
  },
  {
    id: 'owner-gate',
    roleId: 'owner_admin',
    title: 'Admin haelt Freigabe-Gate',
    intent: 'Freigabe, Public Gate und riskante Aktionen bleiben sichtbar bei der verantwortlichen Rolle.',
    output: 'Ergebnis: KosmoOrbit kann vorfuehren, ohne eine echte Publikation oder externe Aktion auszuloesen.'
  }
];

export function OrbitDemoReviewPath({ variants, blockedActions }: OrbitDemoReviewPathProps) {
  const [selectedStepId, setSelectedStepId] = useState(demoPath[0].id);
  const selectedStep = demoPath.find((step) => step.id === selectedStepId) ?? demoPath[0];
  const selectedRole = useMemo(
    () => variants.find((variant) => variant.role.id === selectedStep.roleId) ?? variants[0],
    [selectedStep.roleId, variants]
  );
  const primaryBlocker = blockedActions[0];

  if (!selectedRole) return null;

  return (
    <section className="rounded-lg border border-amber-300/20 bg-amber-300/[0.05] p-4">
      <div className="grid gap-4 lg:grid-cols-[0.9fr_1.4fr] lg:items-start">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-amber-200">Gefuehrter Demo-Review-Pfad</p>
          <h2 className="mt-2 text-xl font-semibold text-white">Vom Projektblocker zum sicheren Review Mode</h2>
          <p className="mt-3 text-sm leading-6 text-stone-300">
            Dieser Ablauf ist die kleine Vorfuehrgeschichte fuer ein Buero: Projektleitung erkennt den Blocker,
            Entwurf prueft KosmoDesign im Review Mode, Admin haelt Freigaben und Publikation gesperrt.
          </p>
        </div>

        <div className="grid gap-3 md:grid-cols-3" role="tablist" aria-label="KosmoOrbit Demo Review Pfad">
          {demoPath.map((step, index) => {
            const selected = step.id === selectedStep.id;
            return (
              <button
                key={step.id}
                type="button"
                role="tab"
                aria-selected={selected}
                onClick={() => setSelectedStepId(step.id)}
                className={`min-h-24 rounded-lg border p-3 text-left transition ${
                  selected
                    ? 'border-amber-200/60 bg-amber-300/14 text-white shadow-[0_0_24px_rgba(251,191,36,0.08)]'
                    : 'border-white/10 bg-black/24 text-stone-300 hover:border-white/25 hover:bg-white/[0.06]'
                }`}
              >
                <span className="text-xs font-mono text-amber-100">0{index + 1}</span>
                <span className="mt-2 block text-sm font-semibold">{step.title}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-[1fr_0.85fr]">
        <div className="rounded-lg border border-white/10 bg-black/28 p-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-xs uppercase tracking-[0.16em] text-stone-500">{selectedRole.role.label}</p>
              <h3 className="mt-1 text-2xl font-semibold text-white">{selectedStep.title}</h3>
            </div>
            <span className="rounded-full border border-cyan-200/35 bg-cyan-300/10 px-2.5 py-1 text-[11px] font-medium text-cyan-100">
              {selectedRole.panel_state.primary_label}
            </span>
          </div>
          <p className="mt-4 text-sm leading-6 text-stone-300">{selectedStep.intent}</p>
          <p className="mt-3 rounded-md border border-cyan-200/20 bg-cyan-300/10 px-3 py-2 text-sm leading-5 text-cyan-100">
            {selectedStep.output}
          </p>
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            <div className="rounded-md bg-white/[0.04] px-3 py-2">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-stone-500">Warum diese Rolle</p>
              <p className="mt-2 text-sm leading-5 text-stone-300">{selectedRole.explanation.decision_scope}</p>
            </div>
            <div className="rounded-md bg-white/[0.04] px-3 py-2">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-stone-500">Naechster Schritt</p>
              <p className="mt-2 text-sm leading-5 text-stone-300">{selectedRole.explanation.safe_next_step}</p>
            </div>
          </div>
        </div>

        <div className="rounded-lg border border-rose-200/25 bg-black/28 p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-rose-100">Sicherheitsanker</p>
          {primaryBlocker ? (
            <div className="mt-3 rounded-md border border-rose-200/25 bg-rose-400/10 px-3 py-2">
              <p className="text-sm font-semibold text-white">{primaryBlocker.label}</p>
              <p className="mt-2 text-sm leading-5 text-rose-100">{primaryBlocker.reason}</p>
              <p className="mt-2 font-mono text-xs text-rose-200">{primaryBlocker.gate_id}</p>
            </div>
          ) : null}
          <p className="mt-3 rounded-md border border-amber-300/25 bg-amber-300/10 px-3 py-2 text-sm leading-5 text-amber-100">
            {selectedRole.panel_state.generation_reason}
          </p>
          <p className="mt-3 text-sm leading-6 text-stone-400">
            Die Demo endet bewusst vor echter Generierung, Publikation, Upload oder externer Fachplaner-Schnittstelle.
          </p>
        </div>
      </div>
    </section>
  );
}
