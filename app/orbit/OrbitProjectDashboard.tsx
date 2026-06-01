type GateSeverity = 'red' | 'yellow' | 'green' | string;

type ProjectModule = {
  id: string;
  status: string;
  owner: string;
  summary: string;
  artifact_count: number;
  review_artifact_count: number;
  readiness: string;
};

type ProjectArtifact = {
  id: string;
  path: string;
  module: string;
  rights_status: string;
  needs_review: boolean;
  public_safe: boolean;
  blocked: boolean;
  description: string;
};

type ReviewGate = {
  id: string;
  mode: string;
  reason: string;
  severity: GateSeverity;
};

export type ProjectInspectorReport = {
  status: string;
  project: {
    id: string;
    name: string;
    package_status: string;
    risk_level: string;
    site: {
      locality: string;
      country: string;
    };
  };
  summary: {
    artifact_count: number;
    review_artifact_count: number;
    disabled_gate_count: number;
    approval_gate_count: number;
    modules_by_status: Record<string, number>;
  };
  modules: ProjectModule[];
  artifacts: ProjectArtifact[];
  review_gates: ReviewGate[];
  next_actions: string[];
};

type ContextBlockedInput = {
  candidate_id: string;
  label: string;
  blocked_reason: string;
  downstream_permission: string;
  warnings: string[];
};

type ModelRoom = {
  id: string;
  name: string;
  story_id: string;
  function: string;
  area_m2: number;
};

export type DesignHandoffPreview = {
  handoff: {
    mode: string;
    design_generation_allowed: boolean;
    orbit_readiness: string;
    module_readiness: string;
    recommended_open_mode: string;
  };
  context: {
    status: string;
    blocked_input_count: number;
    unresolved_input_count: number;
    recommended_next_step: string;
    blocked_inputs: ContextBlockedInput[];
  };
  model_profile: {
    units: string;
    source_confidence: string;
    story_count: number;
    room_count: number;
    area_count: number;
    rooms: ModelRoom[];
  };
  blockers: string[];
  allowed_actions: string[];
  next_actions: string[];
};

type OrbitProjectDashboardProps = {
  projectInspector: ProjectInspectorReport;
  designHandoff: DesignHandoffPreview;
};

const gateTone: Record<string, string> = {
  red: 'border-rose-300/40 bg-rose-400/10 text-rose-100',
  yellow: 'border-amber-300/40 bg-amber-400/10 text-amber-100',
  green: 'border-emerald-300/40 bg-emerald-400/10 text-emerald-100'
};

function formatStatus(value: string) {
  return value.replace(/_/g, ' ');
}

export function OrbitProjectDashboard({ projectInspector, designHandoff }: OrbitProjectDashboardProps) {
  const reviewModules = projectInspector.modules.filter((module) => module.readiness !== 'review_ready').slice(0, 4);
  const reviewArtifacts = projectInspector.artifacts.filter((artifact) => artifact.needs_review || artifact.blocked).slice(0, 5);
  const primaryNextAction = designHandoff.next_actions[0] ?? projectInspector.next_actions[0] ?? 'Keep the package in local review mode.';
  const rooms = designHandoff.model_profile.rooms.slice(0, 4);

  return (
    <section className="rounded-lg border border-white/10 bg-white/[0.04] p-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-stone-400">Projektpaket Tagesansicht</p>
          <h2 className="mt-2 text-xl font-semibold text-white">{projectInspector.project.name}</h2>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-stone-300">
            Ein kompakter Orbit-Blick auf Paketstatus, Quellen-/Reviewlast, Modellprofil, Gates und naechste sichere Aktion.
            Diese Ansicht ist read-only und ersetzt keine menschliche Architekturpruefung.
          </p>
        </div>
        <span className="rounded-full border border-cyan-200/35 bg-cyan-300/10 px-2.5 py-1 text-[11px] font-medium text-cyan-100">
          {formatStatus(projectInspector.project.risk_level)}
        </span>
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-4">
        <div className="min-w-0 rounded-lg border border-white/10 bg-black/24 p-3">
          <p className="text-xs uppercase tracking-[0.14em] text-stone-500">Artefakte</p>
          <p className="mt-2 text-2xl font-semibold text-white">{projectInspector.summary.artifact_count}</p>
          <p className="mt-1 text-xs text-stone-400">{projectInspector.summary.review_artifact_count} reviewpflichtig</p>
        </div>
        <div className="min-w-0 rounded-lg border border-white/10 bg-black/24 p-3">
          <p className="text-xs uppercase tracking-[0.14em] text-stone-500">Gates</p>
          <p className="mt-2 text-2xl font-semibold text-white">{projectInspector.review_gates.length}</p>
          <p className="mt-1 text-xs text-stone-400">{projectInspector.summary.disabled_gate_count} disabled, {projectInspector.summary.approval_gate_count} approval</p>
        </div>
        <div className="min-w-0 rounded-lg border border-white/10 bg-black/24 p-3">
          <p className="text-xs uppercase tracking-[0.14em] text-stone-500">Modell</p>
          <p className="mt-2 text-2xl font-semibold text-white">{designHandoff.model_profile.room_count} Raeume</p>
          <p className="mt-1 text-xs text-stone-400">{designHandoff.model_profile.story_count} Geschosse, {designHandoff.model_profile.source_confidence}</p>
        </div>
        <div className="min-w-0 rounded-lg border border-white/10 bg-black/24 p-3">
          <p className="text-xs uppercase tracking-[0.14em] text-stone-500">Kontext</p>
          <p className="mt-2 text-2xl font-semibold text-white">{designHandoff.context.blocked_input_count}</p>
          <p className="mt-1 text-xs text-stone-400">{designHandoff.context.unresolved_input_count} offene Inputs</p>
        </div>
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-[1.05fr_0.95fr]">
        <div className="grid gap-3">
          <div className="rounded-lg border border-white/10 bg-black/24 p-3">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-stone-500">Module mit Reviewbedarf</p>
            <div className="mt-3 grid gap-2">
              {reviewModules.map((module) => (
                <div key={module.id} className="min-w-0 rounded-md bg-white/[0.04] px-3 py-2">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="break-words text-sm font-semibold text-white">{module.owner}</p>
                    <span className="font-mono text-xs text-amber-100">{formatStatus(module.readiness)}</span>
                  </div>
                  <p className="mt-2 text-sm leading-5 text-stone-400">{module.summary}</p>
                  <p className="mt-2 text-xs text-stone-500">{module.artifact_count} Artefakte, {module.review_artifact_count} Review</p>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-lg border border-white/10 bg-black/24 p-3">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-stone-500">Naechste Review-Artefakte</p>
            <div className="mt-3 grid gap-2">
              {reviewArtifacts.map((artifact) => (
                <div key={artifact.id} className="min-w-0 rounded-md border border-white/10 bg-white/[0.04] px-3 py-2">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="break-all font-mono text-xs text-cyan-100">{artifact.path}</p>
                    <span className="text-xs text-amber-100">{formatStatus(artifact.rights_status)}</span>
                  </div>
                  <p className="mt-2 text-sm leading-5 text-stone-400">{artifact.description}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="grid gap-3">
          <div className="rounded-lg border border-white/10 bg-black/24 p-3">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-stone-500">Review Gates</p>
            <div className="mt-3 grid gap-2">
              {projectInspector.review_gates.map((gate) => (
                <div key={gate.id} className={`min-w-0 rounded-md border px-3 py-2 ${gateTone[gate.severity] ?? gateTone.yellow}`}>
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="break-all font-mono text-xs">{gate.id}</p>
                    <span className="text-xs">{formatStatus(gate.mode)}</span>
                  </div>
                  <p className="mt-2 text-sm leading-5">{gate.reason}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-lg border border-white/10 bg-black/24 p-3">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-stone-500">Modellprofil</p>
            <div className="mt-3 grid gap-2">
              {rooms.map((room) => (
                <div key={room.id} className="flex min-w-0 items-center justify-between gap-3 rounded-md bg-white/[0.04] px-3 py-2 text-sm">
                  <span className="min-w-0 break-words text-stone-200">{room.name}</span>
                  <span className="font-mono text-cyan-100">{room.area_m2} m2</span>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-lg border border-cyan-200/20 bg-cyan-300/10 p-3">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-cyan-100">Naechste sichere Aktion</p>
            <p className="mt-2 text-sm leading-6 text-stone-100">{primaryNextAction}</p>
            <p className="mt-3 text-xs leading-5 text-cyan-100">
              Open Mode: {formatStatus(designHandoff.handoff.recommended_open_mode)}. Generation erlaubt: {designHandoff.handoff.design_generation_allowed ? 'ja' : 'nein'}.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
