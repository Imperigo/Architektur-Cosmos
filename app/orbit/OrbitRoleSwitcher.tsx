'use client';

import { useMemo, useState } from 'react';

type Tone = 'blue' | 'green' | 'neutral' | 'red' | 'yellow';

export type OrbitRoleVariant = {
  role: {
    id: string;
    label: string;
    level: string;
    ui_mode: string;
    focus: string;
    detail_level: string;
  };
  explanation: {
    purpose: string;
    interface_depth: string;
    decision_scope: string;
    safe_next_step: string;
  };
  permissions: {
    can_open_design_review: boolean;
    can_request_design_generation: boolean;
    can_approve_local: boolean;
    can_approve_public: boolean;
    read_only: boolean;
  };
  panel_state: {
    tone: Tone;
    primary_label: string;
    primary_enabled: boolean;
    generation_enabled: boolean;
    generation_reason: string;
  };
  visible_sections: string[];
  hidden_sections?: string[];
  warnings: string[];
  learning_support: {
    enabled: boolean;
    mode: string | null;
    guidance: string | null;
  };
};

type OrbitRoleSwitcherProps = {
  initialRoleId: string;
  variants: OrbitRoleVariant[];
};

const permissionLabels = [
  ['can_open_design_review', 'KosmoDesign Review'],
  ['can_approve_local', 'Lokale Freigabe'],
  ['can_approve_public', 'Public Gate'],
  ['can_request_design_generation', 'Design-Generation'],
  ['read_only', 'Read-only']
] as const;

function stateTone(enabled: boolean) {
  return enabled ? 'border-emerald-300/40 bg-emerald-400/10 text-emerald-100' : 'border-rose-300/40 bg-rose-400/10 text-rose-100';
}

function roleDepthLabel(value: string) {
  const labels: Record<string, string> = {
    full: 'voll',
    decision: 'entscheidung',
    creative: 'entwurf',
    technical: 'technik',
    guided: 'gefuehrt',
    learning: 'lernen',
    observer: 'demo'
  };
  return labels[value] ?? value;
}

export function OrbitRoleSwitcher({ initialRoleId, variants }: OrbitRoleSwitcherProps) {
  const [selectedRoleId, setSelectedRoleId] = useState(initialRoleId);
  const selectedRole = useMemo(
    () => variants.find((variant) => variant.role.id === selectedRoleId) ?? variants[0],
    [selectedRoleId, variants]
  );

  if (!selectedRole) return null;

  const safeSections = selectedRole.visible_sections.slice(0, 6);
  const hiddenSections = selectedRole.hidden_sections?.slice(0, 4) ?? [];

  return (
    <section className="rounded-lg border border-cyan-200/20 bg-black/32 p-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-cyan-200">Rollenumschaltung Preview</p>
          <h2 className="mt-2 text-xl font-semibold text-white">Wie KosmoOrbit je Person anders wird</h2>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-stone-300">
            Diese lokale Preview aendert nur die Ansicht im Browser. Sie schreibt keine Userdaten, erstellt keine Accounts
            und schaltet keine echte Berechtigung frei.
          </p>
        </div>
        <span className="inline-flex max-w-full items-center break-words rounded-full border border-white/20 bg-white/[0.08] px-2.5 py-1 text-[11px] font-medium leading-tight text-stone-100">
          {variants.length} Rollenprofile
        </span>
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-[0.9fr_1.4fr]">
        <div className="grid content-start gap-2 sm:grid-cols-2 xl:grid-cols-1" role="tablist" aria-label="KosmoOrbit Rollenprofile">
          {variants.map((variant) => {
            const selected = variant.role.id === selectedRole.role.id;
            return (
              <button
                key={variant.role.id}
                type="button"
                role="tab"
                aria-selected={selected}
                onClick={() => setSelectedRoleId(variant.role.id)}
                className={`min-h-16 min-w-0 rounded-lg border px-3 py-2 text-left transition ${
                  selected
                    ? 'border-cyan-200/60 bg-cyan-300/12 text-white shadow-[0_0_24px_rgba(0,231,255,0.08)]'
                    : 'border-white/10 bg-white/[0.04] text-stone-300 hover:border-white/25 hover:bg-white/[0.07]'
                }`}
              >
                <span className="block break-words text-sm font-semibold">{variant.role.label}</span>
                <span className="mt-1 block text-xs text-stone-500">
                  {roleDepthLabel(variant.role.detail_level)} / {variant.role.ui_mode}
                </span>
              </button>
            );
          })}
        </div>

        <div className="rounded-lg border border-white/10 bg-white/[0.04] p-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-xs uppercase tracking-[0.16em] text-stone-500">{selectedRole.role.level}</p>
              <h3 className="mt-1 text-2xl font-semibold text-white">{selectedRole.role.label}</h3>
            </div>
            <span className="inline-flex max-w-full items-center break-words rounded-full border border-amber-300/45 bg-amber-400/12 px-2.5 py-1 text-[11px] font-medium leading-tight text-amber-100">
              {selectedRole.panel_state.primary_label}
            </span>
          </div>

          <div className="mt-4 grid gap-3 lg:grid-cols-2">
            <div className="rounded-lg border border-white/10 bg-black/24 p-3">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-stone-500">Zweck</p>
              <p className="mt-2 text-sm leading-6 text-stone-200">{selectedRole.explanation.purpose}</p>
            </div>
            <div className="rounded-lg border border-white/10 bg-black/24 p-3">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-stone-500">Naechster sicherer Schritt</p>
              <p className="mt-2 text-sm leading-6 text-cyan-100">{selectedRole.explanation.safe_next_step}</p>
            </div>
            <div className="rounded-lg border border-white/10 bg-black/24 p-3">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-stone-500">Oberflaeche</p>
              <p className="mt-2 text-sm leading-6 text-stone-300">{selectedRole.explanation.interface_depth}</p>
            </div>
            <div className="rounded-lg border border-white/10 bg-black/24 p-3">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-stone-500">Entscheidungsradius</p>
              <p className="mt-2 text-sm leading-6 text-stone-300">{selectedRole.explanation.decision_scope}</p>
            </div>
          </div>

          <div className="mt-4 grid gap-3 lg:grid-cols-[1fr_0.8fr]">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-stone-500">Rechte-Preview</p>
              <div className="mt-2 grid gap-2 sm:grid-cols-2">
                {permissionLabels.map(([key, label]) => {
                  const enabled = selectedRole.permissions[key];
                  return (
                    <div key={key} className={`min-w-0 rounded-md border px-3 py-2 text-xs ${stateTone(enabled)}`}>
                      <span className="font-medium">{label}</span>
                      <span className="ml-2 font-mono">{enabled ? 'on' : 'off'}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-stone-500">Sichtbare Bereiche</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {safeSections.map((section) => (
                  <span key={section} className="rounded-full border border-sky-300/35 bg-sky-400/10 px-2.5 py-1 text-[11px] text-sky-100">
                    {section.replace(/_/g, ' ')}
                  </span>
                ))}
                {hiddenSections.map((section) => (
                  <span key={section} className="rounded-full border border-stone-400/25 bg-white/[0.04] px-2.5 py-1 text-[11px] text-stone-400">
                    {section.replace(/_/g, ' ')} hidden
                  </span>
                ))}
              </div>
            </div>
          </div>

          {selectedRole.learning_support.enabled ? (
            <p className="mt-4 rounded-md border border-emerald-300/25 bg-emerald-300/10 px-3 py-2 text-sm leading-5 text-emerald-100">
              Lernmodus: {selectedRole.learning_support.guidance}
            </p>
          ) : null}

          <p className="mt-4 rounded-md border border-amber-300/25 bg-amber-300/10 px-3 py-2 text-sm leading-5 text-amber-100">
            {selectedRole.panel_state.generation_reason}
          </p>
        </div>
      </div>
    </section>
  );
}
