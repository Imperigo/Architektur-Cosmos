import designHandoffPanelData from '@/examples/kosmo-projects/kosmo-demo-001/orbit/design-handoff-ui-panel.generated.json';

type Tone = 'blue' | 'green' | 'neutral' | 'red' | 'yellow';

type LabelValueRow = {
  label: string;
  value: string | number | boolean | null;
};

type ListItem = {
  tone: Tone;
  text: string;
};

type BlockedInput = {
  id: string;
  label: string;
  reason: string;
  selected_use: string;
  downstream_permission: string;
};

type DesignHandoffPanel = {
  panel: {
    title: string;
    subtitle: string;
    state: string;
    tone: Tone;
    purpose: string;
  };
  badges: Array<{
    id: string;
    label: string;
    tone: Tone;
  }>;
  sections: {
    status_header: {
      value: string;
      description: string;
    };
    role_gate: {
      rows: LabelValueRow[];
    };
    blockers: {
      items: ListItem[];
    };
    allowed_actions: {
      items: ListItem[];
    };
    model_profile: {
      summary: LabelValueRow[];
      rooms: Array<{
        id: string;
        name: string;
        story: string;
        function: string;
        area_m2: number;
      }>;
    };
    context_inputs: {
      summary: LabelValueRow[];
      blocked_inputs: BlockedInput[];
    };
    guardrails: {
      items: ListItem[];
    };
    next_actions: {
      items: ListItem[];
    };
  };
  actions: {
    primary: {
      label: string;
      enabled: boolean;
      mode: string;
      effect: string;
    };
    disabled_generation: {
      label: string;
      enabled: boolean;
      reason: string | null;
    };
  };
};

const designHandoffPanel = designHandoffPanelData as DesignHandoffPanel;

const toneClasses: Record<Tone, string> = {
  blue: 'border-cyan-300/35 bg-cyan-400/10 text-cyan-100',
  green: 'border-emerald-300/35 bg-emerald-400/10 text-emerald-100',
  neutral: 'border-white/15 bg-white/[0.06] text-stone-100',
  red: 'border-rose-300/35 bg-rose-400/10 text-rose-100',
  yellow: 'border-amber-300/35 bg-amber-400/10 text-amber-100'
};

function formatValue(value: LabelValueRow['value']) {
  if (value === true) return 'yes';
  if (value === false) return 'no';
  if (value === null || value === undefined) return '-';
  return String(value);
}

function formatStatus(value: string) {
  return value.replace(/_/g, ' ');
}

function Badge({ label, tone = 'neutral' }: { label: string; tone?: Tone }) {
  return (
    <span className={`inline-flex max-w-full items-center break-words rounded-full border px-2.5 py-1 text-[11px] font-medium leading-tight ${toneClasses[tone]}`}>
      {formatStatus(label)}
    </span>
  );
}

export function OrbitDesignHandoffPanel() {
  const panel = designHandoffPanel;
  const blockedInputs = panel.sections.context_inputs.blocked_inputs.slice(0, 3);
  const guardrails = panel.sections.guardrails.items.slice(0, 4);
  const nextActions = panel.sections.next_actions.items.slice(0, 3);

  return (
    <section className="rounded-lg border border-cyan-300/20 bg-cyan-300/[0.045] p-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-cyan-100">KosmoDesign Handoff</p>
          <h2 className="mt-2 text-xl font-semibold text-white">{panel.panel.title} Review Console</h2>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-stone-300">
            KosmoOrbit darf KosmoDesign heute nur als Kontextpruefung oeffnen. Dieses Panel zeigt Rolle, Open Mode,
            Blocker, Modellprofil und Kontextinputs, bevor spaeter irgendeine Entwurfs- oder Geometrieaktion moeglich wird.
          </p>
        </div>
        <Badge label={panel.panel.state} tone={panel.panel.tone} />
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {panel.badges.map((badge) => (
          <Badge key={badge.id} label={badge.label} tone={badge.tone} />
        ))}
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-[0.9fr_1.1fr]">
        <div className="grid gap-3">
          <div className="rounded-lg border border-white/10 bg-black/24 p-3">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-cyan-100">Open Mode</p>
            <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
              <p className="font-mono text-sm text-white">{panel.sections.status_header.value}</p>
              <Badge label={panel.actions.primary.label} tone={panel.actions.primary.enabled ? 'yellow' : 'red'} />
            </div>
            <p className="mt-3 text-sm leading-6 text-stone-300">{panel.sections.status_header.description}</p>
            <p className="mt-3 rounded-md border border-rose-300/25 bg-rose-400/10 px-3 py-2 text-sm leading-5 text-rose-100">
              {panel.actions.disabled_generation.label}: {panel.actions.disabled_generation.enabled ? 'enabled' : 'blocked'}.
              {panel.actions.disabled_generation.reason ? ` ${panel.actions.disabled_generation.reason}` : ''}
            </p>
          </div>

          <div className="rounded-lg border border-white/10 bg-black/24 p-3">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-stone-500">Rolle und Modellprofil</p>
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              {panel.sections.role_gate.rows.map((row) => (
                <div key={row.label} className="min-w-0 rounded-md bg-white/[0.04] px-3 py-2">
                  <p className="text-xs text-stone-500">{row.label}</p>
                  <p className="mt-1 break-words text-sm text-stone-100">{formatValue(row.value)}</p>
                </div>
              ))}
              {panel.sections.model_profile.summary.map((row) => (
                <div key={row.label} className="min-w-0 rounded-md bg-white/[0.04] px-3 py-2">
                  <p className="text-xs text-stone-500">{row.label}</p>
                  <p className="mt-1 break-words text-sm text-cyan-100">{formatValue(row.value)}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-lg border border-white/10 bg-black/24 p-3">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-stone-500">Raeume als Read-only Kontext</p>
            <div className="mt-3 grid gap-2">
              {panel.sections.model_profile.rooms.map((room) => (
                <div key={room.id} className="flex min-w-0 flex-wrap items-center justify-between gap-2 rounded-md bg-white/[0.04] px-3 py-2 text-sm">
                  <span className="break-words text-stone-100">{room.name}</span>
                  <span className="font-mono text-cyan-100">{room.area_m2} m2</span>
                  <span className="text-xs text-stone-500">{room.story} / {room.function}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="grid gap-3">
          <div className="rounded-lg border border-rose-300/25 bg-rose-400/10 p-3">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-rose-100">Blocker</p>
                <h3 className="mt-2 text-base font-semibold text-white">Warum Generation gesperrt bleibt</h3>
              </div>
              <Badge label={`${panel.sections.blockers.items.length} blockers`} tone="red" />
            </div>
            <div className="mt-3 grid gap-2">
              {panel.sections.blockers.items.map((item) => (
                <p key={item.text} className="rounded-md border border-rose-200/20 bg-black/24 px-3 py-2 text-sm leading-5 text-rose-100">
                  {item.text}
                </p>
              ))}
            </div>
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            <div className="rounded-lg border border-cyan-300/20 bg-cyan-400/10 p-3">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-cyan-100">Erlaubt</p>
              <div className="mt-3 grid gap-2">
                {panel.sections.allowed_actions.items.map((item) => (
                  <p key={item.text} className="rounded-md bg-black/20 px-3 py-2 text-sm leading-5 text-stone-100">{item.text}</p>
                ))}
              </div>
            </div>

            <div className="rounded-lg border border-amber-300/20 bg-amber-400/10 p-3">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-amber-100">Kontextinputs</p>
              <div className="mt-3 grid gap-2">
                {blockedInputs.map((input) => (
                  <div key={input.id} className="rounded-md bg-black/20 px-3 py-2">
                    <p className="text-sm font-semibold text-white">{input.label}</p>
                    <p className="mt-1 break-words text-xs leading-5 text-amber-100">{input.reason} / {input.downstream_permission}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            <div className="rounded-lg border border-white/10 bg-black/24 p-3">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-stone-500">Guardrails</p>
              <div className="mt-3 grid gap-2">
                {guardrails.map((item) => (
                  <p key={item.text} className="rounded-md bg-white/[0.04] px-3 py-2 text-sm leading-5 text-stone-300">{item.text}</p>
                ))}
              </div>
            </div>

            <div className="rounded-lg border border-white/10 bg-black/24 p-3">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-stone-500">Naechste Schritte</p>
              <div className="mt-3 grid gap-2">
                {nextActions.map((item) => (
                  <p key={item.text} className="rounded-md bg-white/[0.04] px-3 py-2 text-sm leading-5 text-stone-300">{item.text}</p>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
