import localRuntimeBridgeData from '@/examples/kosmo-orbit/review/orbit-local-runtime-bridge.generated.json';

type RuntimeLane = {
  id: string;
  label: string;
  status: string;
  evidence: string;
  next_action: string;
};

type LocalRuntimeBridgeReport = {
  status: string;
  mode: string;
  policy: Record<string, boolean>;
  summary: {
    passed_checks: number;
    check_count: number;
    progress_percent: number;
    ready_lanes: number;
    blocked_lanes: number;
  };
  control_spine: {
    goal: string;
    progress_bar: string;
    generated_at: string;
  };
  lanes: RuntimeLane[];
  sources: {
    local_starter_commit: string | null;
    cloud_starter_commit: string | null;
    orbit_website_commit: string | null;
  };
  home_pc_handover: {
    platform: string;
    zip_artifact: string;
    checksum_artifact: string;
    manifest_artifact: string;
    start_dry_run_script: string;
    start_dry_run_report: string;
    start_dry_run_status: string;
    start_dry_run_checks: string;
    purpose: string;
    first_commands: string[];
  };
  next_action_queue: {
    status: string;
    ready_actions: number;
    blocked_actions: number;
    actions: Array<{
      id: string;
      title: string;
      lane: string;
      priority: string;
      status: string;
      mode: string;
      command: string;
      evidence: string;
      owner_go_required: boolean;
      autonomous_allowed: boolean;
    }>;
  };
  runway_report: {
    status: string;
    phase_count: number;
    runway: Array<{
      id: string;
      title: string;
      intent: string;
      items: Array<{
        id: string;
        title: string;
        status: string;
        next_step: string;
        evidence: string;
      }>;
    }>;
  };
  closeout_aggregator: {
    status: string;
    passed_checks: number;
    check_count: number;
    warnings: number;
    current_state: {
      starter_commit: string | null;
      orbit_commit: string | null;
      night_progress: string | null;
      ready_lanes: number | null;
      blocked_lanes: number | null;
    };
    evidence: {
      github_import: string;
      first_run: string;
      queue: string;
      runway: string;
      home_pc_dry_run: string;
      home_pc_dry_run_checks: string;
      home_pc_handover_doctor: string;
      home_pc_handover_doctor_checks: string;
      home_pc_handover_doctor_report: string;
      handover_zip: string;
      handover_checksum: string;
      runtime_bundle: string;
      runtime_latest_zip: string;
      orbit_review_branch: string;
    };
    read_order: string[];
    owner_go_blockers: string[];
    forbidden_actions: string[];
  };
  github_separation_decision: {
    status: string;
    recommended_repository: string;
    first_import_branch: string;
    website_repository: string;
    import_readiness_status: string;
    import_readiness_checks: string;
    import_readiness_report: string;
    evidence: string;
    blocked_until: string[];
    forbidden_without_owner_go: string[];
  };
};

const localRuntimeBridge = localRuntimeBridgeData as LocalRuntimeBridgeReport;

function BridgeChip({ label, tone = 'neutral' }: { label: string; tone?: 'cyan' | 'green' | 'amber' | 'rose' | 'neutral' }) {
  const toneClass = {
    cyan: 'border-cyan-300/35 bg-cyan-400/10 text-cyan-100',
    green: 'border-emerald-300/35 bg-emerald-400/10 text-emerald-100',
    amber: 'border-amber-300/35 bg-amber-400/10 text-amber-100',
    rose: 'border-rose-300/40 bg-rose-400/10 text-rose-100',
    neutral: 'border-white/10 bg-white/[0.05] text-stone-300'
  }[tone];

  return (
    <span className={`inline-flex max-w-full items-center break-words rounded-full border px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] leading-tight ${toneClass}`}>
      {label}
    </span>
  );
}

function laneTone(status: string) {
  if (status === 'ready') return 'green';
  if (status === 'blocked') return 'rose';
  return 'amber';
}

export function OrbitLocalRuntimeBridge() {
  return (
    <section className="rounded-lg border border-emerald-300/20 bg-emerald-300/[0.045] p-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-100">Local Runtime Bridge</p>
          <h2 className="mt-2 text-xl font-semibold text-white">Odysseus/KOSMO Night Status in KosmoOrbit</h2>
          <p className="mt-3 max-w-4xl text-sm leading-6 text-stone-300">
            Diese Sektion zeigt den lokalen KOSMO Control Spine als statisches Review-Artefakt in Orbit. Sie
            liest nur den erzeugten Night-Status-Report, startet keine Prozesse, keine Modelle, scannt keine
            privaten Dateien und fuehrt keine Uploads oder Publish-Aktionen aus.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <BridgeChip label={localRuntimeBridge.status} tone="green" />
          <BridgeChip label={`${localRuntimeBridge.summary.passed_checks}/${localRuntimeBridge.summary.check_count} checks`} tone="cyan" />
          <BridgeChip label={localRuntimeBridge.mode} />
        </div>
      </div>

      <div className="mt-4 grid gap-3 lg:grid-cols-[0.9fr_1.1fr]">
        <div className="rounded-lg border border-white/10 bg-black/24 p-3">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-stone-500">Control Spine</p>
          <p className="mt-2 text-3xl font-semibold text-white">{localRuntimeBridge.summary.progress_percent}%</p>
          <div className="mt-3 h-2.5 overflow-hidden rounded-full bg-white/10">
            <div className="h-full rounded-full bg-emerald-300" style={{ width: `${localRuntimeBridge.summary.progress_percent}%` }} />
          </div>
          <code className="mt-3 block break-words rounded-md border border-emerald-300/20 bg-emerald-300/10 px-3 py-2 text-xs leading-5 text-emerald-100">
            {localRuntimeBridge.control_spine.progress_bar}
          </code>
          <p className="mt-3 text-sm leading-6 text-stone-300">{localRuntimeBridge.control_spine.goal}</p>
          <div className="mt-3 grid gap-2 text-sm leading-5 sm:grid-cols-2">
            <p className="rounded-md border border-emerald-300/20 bg-emerald-300/10 px-3 py-2 text-emerald-100">
              {localRuntimeBridge.summary.ready_lanes} ready lanes
            </p>
            <p className="rounded-md border border-rose-300/20 bg-rose-300/10 px-3 py-2 text-rose-100">
              {localRuntimeBridge.summary.blocked_lanes} blocked lane
            </p>
          </div>
        </div>

        <div className="rounded-lg border border-white/10 bg-black/24 p-3">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-stone-500">Quellen</p>
          <div className="mt-3 grid gap-2 text-sm leading-5 sm:grid-cols-3">
            <p className="rounded-md border border-white/10 bg-white/[0.04] px-3 py-2 text-stone-300">
              Local Starter <code className="block text-emerald-100">{localRuntimeBridge.sources.local_starter_commit}</code>
            </p>
            <p className="rounded-md border border-white/10 bg-white/[0.04] px-3 py-2 text-stone-300">
              OneDrive Starter <code className="block text-cyan-100">{localRuntimeBridge.sources.cloud_starter_commit}</code>
            </p>
            <p className="rounded-md border border-white/10 bg-white/[0.04] px-3 py-2 text-stone-300">
              Orbit Website <code className="block text-violet-100">{localRuntimeBridge.sources.orbit_website_commit}</code>
            </p>
          </div>
          <p className="mt-3 rounded-md border border-amber-300/20 bg-amber-300/10 px-3 py-2 text-sm leading-5 text-amber-100">
            GitHub-Trennung bleibt sichtbar blockiert, bis ein dediziertes Starter-Repo existiert oder ein
            Import explizit freigegeben ist.
          </p>
        </div>
      </div>

      <div className="mt-4 rounded-lg border border-emerald-300/20 bg-emerald-300/[0.055] p-3">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-emerald-100">Next-Action Queue</p>
            <p className="mt-2 text-sm leading-6 text-stone-300">
              KOSMO trennt hier lokale Checks, Linux-Home-PC-Schritte, review-only Orbit-Evidenz und Owner-Go-blockierte GitHub-Aktionen.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <BridgeChip label={localRuntimeBridge.next_action_queue.status} tone="green" />
            <BridgeChip label={`${localRuntimeBridge.next_action_queue.ready_actions} ready`} tone="cyan" />
            <BridgeChip label={`${localRuntimeBridge.next_action_queue.blocked_actions} blocked`} tone="rose" />
          </div>
        </div>
        <div className="mt-3 grid gap-2 lg:grid-cols-2">
          {localRuntimeBridge.next_action_queue.actions.map((action) => (
            <article key={action.id} className="min-w-0 rounded-md border border-white/10 bg-black/24 p-3">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <h3 className="break-words text-sm font-semibold text-white">{action.title}</h3>
                <BridgeChip label={action.status} tone={laneTone(action.status)} />
              </div>
              <div className="mt-2 flex flex-wrap gap-1.5">
                <BridgeChip label={action.lane} />
                <BridgeChip label={action.priority} tone="cyan" />
                {action.owner_go_required ? <BridgeChip label="owner-go" tone="amber" /> : null}
                {action.autonomous_allowed ? <BridgeChip label="autonomous" tone="green" /> : <BridgeChip label="manual/review" />}
              </div>
              <code className="mt-3 block break-words rounded-md border border-white/10 bg-black/28 px-3 py-2 text-xs leading-5 text-stone-200">
                {action.command}
              </code>
            </article>
          ))}
        </div>
      </div>

      <div className="mt-4 rounded-lg border border-violet-300/20 bg-violet-300/[0.055] p-3">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-violet-100">Runway Report</p>
            <p className="mt-2 text-sm leading-6 text-stone-300">
              Der Runway verbindet die laufende Mac-Nacht, den ersten Linux-Abend, Owner-Go-Grenzen und die Schritte nach dem Home-PC-Start.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <BridgeChip label={localRuntimeBridge.runway_report.status} tone="green" />
            <BridgeChip label={`${localRuntimeBridge.runway_report.phase_count} phases`} tone="cyan" />
          </div>
        </div>
        <div className="mt-3 grid gap-3 xl:grid-cols-2">
          {localRuntimeBridge.runway_report.runway.map((phase) => (
            <article key={phase.id} className="min-w-0 rounded-md border border-white/10 bg-black/24 p-3">
              <h3 className="text-sm font-semibold text-white">{phase.title}</h3>
              <p className="mt-2 text-sm leading-5 text-stone-300">{phase.intent}</p>
              <div className="mt-3 space-y-2">
                {phase.items.map((item) => (
                  <div key={item.id} className="rounded-md border border-white/10 bg-white/[0.04] px-3 py-2">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <p className="break-words text-sm font-medium text-stone-100">{item.title}</p>
                      <BridgeChip label={item.status} tone={laneTone(item.status)} />
                    </div>
                    <code className="mt-2 block break-words text-xs leading-5 text-violet-100">{item.next_step}</code>
                  </div>
                ))}
              </div>
            </article>
          ))}
        </div>
      </div>

      <div className="mt-4 rounded-lg border border-emerald-300/20 bg-black/24 p-3">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-emerald-100">Closeout Aggregator</p>
            <p className="mt-2 text-sm leading-6 text-stone-300">
              Das Home-PC-Paket liest diesen Abschlusszustand als Reihenfolge: erst Status, dann Queue, Runway,
              Dry-Run, Handover und erst danach Owner-Go-Fragen.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <BridgeChip label={localRuntimeBridge.closeout_aggregator.status} tone="green" />
            <BridgeChip label={`${localRuntimeBridge.closeout_aggregator.passed_checks}/${localRuntimeBridge.closeout_aggregator.check_count} checks`} tone="cyan" />
            <BridgeChip label={`${localRuntimeBridge.closeout_aggregator.warnings} warnings`} tone={localRuntimeBridge.closeout_aggregator.warnings ? 'amber' : 'green'} />
          </div>
        </div>
        <div className="mt-3 grid gap-2 text-sm leading-5 md:grid-cols-4">
          <p className="rounded-md border border-emerald-300/20 bg-emerald-300/10 px-3 py-2 text-emerald-100">
            Starter <code className="block break-words text-stone-200">{localRuntimeBridge.closeout_aggregator.current_state.starter_commit}</code>
          </p>
          <p className="rounded-md border border-violet-300/20 bg-violet-300/10 px-3 py-2 text-violet-100">
            Orbit <code className="block break-words text-stone-200">{localRuntimeBridge.closeout_aggregator.current_state.orbit_commit}</code>
          </p>
          <p className="rounded-md border border-cyan-300/20 bg-cyan-300/10 px-3 py-2 text-cyan-100">
            Night <code className="block break-words text-stone-200">{localRuntimeBridge.closeout_aggregator.current_state.night_progress}</code>
          </p>
          <p className="rounded-md border border-rose-300/20 bg-rose-300/10 px-3 py-2 text-rose-100">
            Blocked <code className="block break-words text-stone-200">{localRuntimeBridge.closeout_aggregator.current_state.blocked_lanes}</code>
          </p>
        </div>
        <div className="mt-3 grid gap-2 text-sm leading-5 md:grid-cols-3">
          <p className="rounded-md border border-emerald-300/20 bg-emerald-300/10 px-3 py-2 text-emerald-100">
            Handover Doctor <code className="block break-words text-stone-200">{localRuntimeBridge.closeout_aggregator.evidence.home_pc_handover_doctor}</code>
          </p>
          <p className="rounded-md border border-emerald-300/20 bg-emerald-300/10 px-3 py-2 text-emerald-100">
            Doctor Checks <code className="block break-words text-stone-200">{localRuntimeBridge.closeout_aggregator.evidence.home_pc_handover_doctor_checks}</code>
          </p>
          <p className="rounded-md border border-emerald-300/20 bg-emerald-300/10 px-3 py-2 text-emerald-100">
            Doctor Report <code className="block break-words text-stone-200">{localRuntimeBridge.closeout_aggregator.evidence.home_pc_handover_doctor_report}</code>
          </p>
        </div>
        <div className="mt-3 grid gap-3 xl:grid-cols-[0.9fr_1.1fr]">
          <div className="rounded-md border border-white/10 bg-white/[0.04] p-3">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-stone-500">Read Order</p>
            <div className="mt-2 grid gap-2">
              {localRuntimeBridge.closeout_aggregator.read_order.map((item) => (
                <code key={item} className="block break-words rounded-md border border-white/10 bg-black/24 px-3 py-2 text-xs leading-5 text-stone-200">
                  {item}
                </code>
              ))}
            </div>
          </div>
          <div className="rounded-md border border-white/10 bg-white/[0.04] p-3">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-stone-500">Evidence</p>
            <div className="mt-2 grid gap-2 text-xs leading-5 md:grid-cols-2">
              {Object.entries(localRuntimeBridge.closeout_aggregator.evidence).map(([key, value]) => (
                <p key={key} className="rounded-md border border-white/10 bg-black/24 px-3 py-2 text-stone-300">
                  {key} <code className="block break-words text-emerald-100">{value}</code>
                </p>
              ))}
            </div>
          </div>
        </div>
        <div className="mt-3 grid gap-3 lg:grid-cols-2">
          <div className="rounded-md border border-amber-300/20 bg-amber-300/10 p-3">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-amber-100">Owner-Go Blockers</p>
            <ul className="mt-2 space-y-1 text-sm leading-5 text-amber-50/90">
              {localRuntimeBridge.closeout_aggregator.owner_go_blockers.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>
          <div className="rounded-md border border-rose-300/20 bg-rose-300/10 p-3">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-rose-100">Forbidden Actions</p>
            <ul className="mt-2 space-y-1 text-sm leading-5 text-rose-50/90">
              {localRuntimeBridge.closeout_aggregator.forbidden_actions.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      <div className="mt-4 rounded-lg border border-cyan-300/20 bg-cyan-300/[0.06] p-3">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-cyan-100">Home-PC Handover Index</p>
            <p className="mt-2 text-sm leading-6 text-stone-300">{localRuntimeBridge.home_pc_handover.purpose}</p>
          </div>
          <BridgeChip label={localRuntimeBridge.home_pc_handover.platform} tone="cyan" />
        </div>
        <div className="mt-3 grid gap-2 text-sm leading-5 md:grid-cols-3">
          <p className="rounded-md border border-cyan-300/20 bg-black/20 px-3 py-2 text-cyan-100">
            ZIP <code className="block break-words text-stone-200">{localRuntimeBridge.home_pc_handover.zip_artifact}</code>
          </p>
          <p className="rounded-md border border-cyan-300/20 bg-black/20 px-3 py-2 text-cyan-100">
            SHA <code className="block break-words text-stone-200">{localRuntimeBridge.home_pc_handover.checksum_artifact}</code>
          </p>
          <p className="rounded-md border border-cyan-300/20 bg-black/20 px-3 py-2 text-cyan-100">
            JSON <code className="block break-words text-stone-200">{localRuntimeBridge.home_pc_handover.manifest_artifact}</code>
          </p>
        </div>
        <div className="mt-3 grid gap-2 text-sm leading-5 md:grid-cols-[1.1fr_1.1fr_0.8fr]">
          <p className="rounded-md border border-emerald-300/20 bg-emerald-300/10 px-3 py-2 text-emerald-100">
            Dry-Run <code className="block break-words text-stone-200">{localRuntimeBridge.home_pc_handover.start_dry_run_script}</code>
          </p>
          <p className="rounded-md border border-emerald-300/20 bg-emerald-300/10 px-3 py-2 text-emerald-100">
            Report <code className="block break-words text-stone-200">{localRuntimeBridge.home_pc_handover.start_dry_run_report}</code>
          </p>
          <p className="rounded-md border border-emerald-300/20 bg-emerald-300/10 px-3 py-2 text-emerald-100">
            {localRuntimeBridge.home_pc_handover.start_dry_run_checks}
            <code className="block break-words text-stone-200">{localRuntimeBridge.home_pc_handover.start_dry_run_status}</code>
          </p>
        </div>
        <div className="mt-3 grid gap-2 lg:grid-cols-2">
          {localRuntimeBridge.home_pc_handover.first_commands.map((command) => (
            <code key={command} className="block break-words rounded-md border border-white/10 bg-black/28 px-3 py-2 text-xs leading-5 text-stone-200">
              {command}
            </code>
          ))}
        </div>
      </div>

      <div className="mt-4 rounded-lg border border-amber-300/25 bg-amber-300/[0.07] p-3">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-amber-100">GitHub Separation Owner-Go</p>
            <h3 className="mt-2 text-lg font-semibold text-white">Dediziertes Starter-Repo statt Website-Vermischung</h3>
            <p className="mt-2 text-sm leading-6 text-stone-300">{localRuntimeBridge.github_separation_decision.evidence}</p>
          </div>
          <BridgeChip label={localRuntimeBridge.github_separation_decision.status} tone="amber" />
        </div>
        <div className="mt-3 grid gap-2 text-sm leading-5 md:grid-cols-3">
          <p className="rounded-md border border-amber-300/20 bg-black/20 px-3 py-2 text-amber-100">
            Starter <code className="block break-words text-stone-200">{localRuntimeBridge.github_separation_decision.recommended_repository}</code>
          </p>
          <p className="rounded-md border border-amber-300/20 bg-black/20 px-3 py-2 text-amber-100">
            Import <code className="block break-words text-stone-200">{localRuntimeBridge.github_separation_decision.first_import_branch}</code>
          </p>
          <p className="rounded-md border border-amber-300/20 bg-black/20 px-3 py-2 text-amber-100">
            Website bleibt <code className="block break-words text-stone-200">{localRuntimeBridge.github_separation_decision.website_repository}</code>
          </p>
        </div>
        <div className="mt-3 grid gap-2 text-sm leading-5 md:grid-cols-3">
          <p className="rounded-md border border-emerald-300/20 bg-emerald-300/10 px-3 py-2 text-emerald-100">
            Import Readiness <code className="block break-words text-stone-200">{localRuntimeBridge.github_separation_decision.import_readiness_status}</code>
          </p>
          <p className="rounded-md border border-emerald-300/20 bg-emerald-300/10 px-3 py-2 text-emerald-100">
            Checks <code className="block break-words text-stone-200">{localRuntimeBridge.github_separation_decision.import_readiness_checks}</code>
          </p>
          <p className="rounded-md border border-emerald-300/20 bg-emerald-300/10 px-3 py-2 text-emerald-100">
            Report <code className="block break-words text-stone-200">{localRuntimeBridge.github_separation_decision.import_readiness_report}</code>
          </p>
        </div>
        <div className="mt-3 grid gap-3 lg:grid-cols-2">
          <div className="rounded-md border border-white/10 bg-black/20 p-3">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-stone-500">Blockiert bis</p>
            <ul className="mt-2 space-y-1 text-sm leading-5 text-stone-300">
              {localRuntimeBridge.github_separation_decision.blocked_until.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>
          <div className="rounded-md border border-rose-300/20 bg-rose-300/10 p-3">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-rose-100">Ohne Owner-Go verboten</p>
            <ul className="mt-2 space-y-1 text-sm leading-5 text-rose-50/90">
              {localRuntimeBridge.github_separation_decision.forbidden_without_owner_go.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {localRuntimeBridge.lanes.map((lane) => (
          <article key={lane.id} className="min-w-0 rounded-lg border border-white/10 bg-black/24 p-3">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <h3 className="break-words text-base font-semibold text-white">{lane.label}</h3>
              <BridgeChip label={lane.status} tone={laneTone(lane.status)} />
            </div>
            <p className="mt-3 rounded-md border border-white/10 bg-white/[0.04] px-3 py-2 text-sm leading-5 text-stone-300">
              {lane.evidence}
            </p>
            <p className="mt-2 rounded-md border border-cyan-300/20 bg-cyan-300/10 px-3 py-2 text-xs leading-5 text-cyan-100">
              Next: {lane.next_action}
            </p>
          </article>
        ))}
      </div>

      <div className="mt-4 flex flex-wrap gap-1.5">
        {Object.entries(localRuntimeBridge.policy).map(([key, enabled]) => (
          <BridgeChip key={key} label={key} tone={enabled ? 'green' : 'rose'} />
        ))}
      </div>
    </section>
  );
}
