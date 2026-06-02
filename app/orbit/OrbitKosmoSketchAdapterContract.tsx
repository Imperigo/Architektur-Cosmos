import kosmoSketchAdapterContractData from '@/examples/kosmo-orbit/runtime/kosmosketch-tool-adapter.contract.json';

type ArtifactContract = {
  type: string;
  name: string;
  purpose: string;
};

type KosmoSketchAdapterContract = {
  status: string;
  mode: string;
  target_tool: string;
  title: string;
  source_context: {
    source_worker: string;
    source_files: string[];
    request: string;
  };
  department: {
    id: string;
    label: string;
    keywords: string[];
  };
  aliases: string[];
  job_contract: Record<string, string>;
  approval_contract: Record<string, string | boolean>;
  artifact_contract: ArtifactContract[];
  allowed_today: string[];
  blocked_today: string[];
  review_roles: string[];
  promotion_requirements: string[];
};

const kosmoSketchAdapterContract = kosmoSketchAdapterContractData as KosmoSketchAdapterContract;

function pretty(value: string) {
  return value.replace(/_/g, ' ');
}

function Chip({ label, tone = 'neutral' }: { label: string; tone?: 'cyan' | 'amber' | 'rose' | 'green' | 'neutral' }) {
  const toneClass = {
    cyan: 'border-cyan-300/35 bg-cyan-400/10 text-cyan-100',
    amber: 'border-amber-300/35 bg-amber-400/10 text-amber-100',
    rose: 'border-rose-300/40 bg-rose-400/10 text-rose-100',
    green: 'border-emerald-300/35 bg-emerald-400/10 text-emerald-100',
    neutral: 'border-white/10 bg-white/[0.05] text-stone-300'
  }[tone];

  return (
    <span className={`inline-flex max-w-full items-center break-words rounded-full border px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] leading-tight ${toneClass}`}>
      {label}
    </span>
  );
}

export function OrbitKosmoSketchAdapterContract() {
  const jobRows = Object.entries(kosmoSketchAdapterContract.job_contract);
  const approvalRows = Object.entries(kosmoSketchAdapterContract.approval_contract);

  return (
    <section className="rounded-lg border border-fuchsia-300/20 bg-fuchsia-300/[0.045] p-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-fuchsia-100">KosmoSketch ToolAdapter</p>
          <h2 className="mt-2 text-xl font-semibold text-white">Target-Tool Vertrag fuer Skizze zu BIM</h2>
          <p className="mt-3 max-w-4xl text-sm leading-6 text-stone-300">
            Dieser Vertrag nimmt den Auftrag des KosmoDraw-Workers auf: KosmoSketch soll als ToolAdapter
            in KosmoOrbit/KosmoZentrale sichtbar werden. Heute ist das nur ein statischer Contract:
            kein POST /jobs, kein /router/plan, keine Approval-Mutation, kein Artifact-Upload,
            kein Blender-Start, kein BIM-Commit, kein IFC-Export und keine 2D-Regeneration.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Chip label={kosmoSketchAdapterContract.status} tone="green" />
          <Chip label={kosmoSketchAdapterContract.mode} tone="cyan" />
          <Chip label={kosmoSketchAdapterContract.target_tool} tone="amber" />
        </div>
      </div>

      <div className="mt-4 grid gap-3 lg:grid-cols-[0.95fr_1.05fr]">
        <div className="rounded-lg border border-fuchsia-300/20 bg-black/24 p-3">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-fuchsia-100">Auftrag von KosmoDraw</p>
          <p className="mt-2 text-sm leading-6 text-stone-300">{kosmoSketchAdapterContract.source_context.request}</p>
          <div className="mt-3 flex flex-wrap gap-1.5">
            <Chip label={kosmoSketchAdapterContract.source_context.source_worker} tone="green" />
            {kosmoSketchAdapterContract.source_context.source_files.map((file) => (
              <Chip key={file} label={file} />
            ))}
          </div>
        </div>

        <div className="rounded-lg border border-cyan-300/20 bg-cyan-300/10 p-3">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-cyan-100">Routing</p>
          <p className="mt-2 text-sm leading-6 text-cyan-50/90">
            Department: {kosmoSketchAdapterContract.department.label}. Target Tool: {kosmoSketchAdapterContract.target_tool}.
          </p>
          <div className="mt-3 flex flex-wrap gap-1.5">
            {kosmoSketchAdapterContract.department.keywords.map((keyword) => (
              <Chip key={keyword} label={keyword} tone="cyan" />
            ))}
          </div>
        </div>
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        <article className="rounded-lg border border-white/10 bg-white/[0.04] p-3">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-stone-400">Aliases</p>
          <div className="mt-3 flex flex-wrap gap-1.5">
            {kosmoSketchAdapterContract.aliases.map((alias) => (
              <Chip key={alias} label={alias} />
            ))}
          </div>
        </article>
        <article className="rounded-lg border border-white/10 bg-white/[0.04] p-3">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-stone-400">Job Contract</p>
          <div className="mt-3 grid gap-2">
            {jobRows.map(([key, value]) => (
              <p key={key} className="rounded-md border border-white/10 bg-black/24 px-3 py-2 text-sm leading-5 text-stone-300">
                <span className="font-semibold text-white">{pretty(key)}:</span> {String(value)}
              </p>
            ))}
          </div>
        </article>
        <article className="rounded-lg border border-white/10 bg-white/[0.04] p-3">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-stone-400">Approval Contract</p>
          <div className="mt-3 grid gap-2">
            {approvalRows.map(([key, value]) => (
              <p key={key} className="rounded-md border border-amber-300/20 bg-amber-300/10 px-3 py-2 text-sm leading-5 text-amber-50/90">
                <span className="font-semibold text-white">{pretty(key)}:</span> {String(value)}
              </p>
            ))}
          </div>
        </article>
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-3">
        {kosmoSketchAdapterContract.artifact_contract.map((artifact) => (
          <article key={artifact.name} className="rounded-lg border border-cyan-300/20 bg-cyan-300/10 p-3">
            <p className="text-xs uppercase tracking-[0.16em] text-cyan-200">{artifact.type}</p>
            <h3 className="mt-1 text-base font-semibold text-white">{artifact.name}</h3>
            <p className="mt-2 text-sm leading-5 text-cyan-50/90">{artifact.purpose}</p>
          </article>
        ))}
      </div>

      <div className="mt-4 grid gap-3 lg:grid-cols-[0.9fr_1.1fr]">
        <div className="rounded-lg border border-cyan-300/20 bg-cyan-300/10 p-3">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-cyan-100">Heute erlaubt</p>
          <div className="mt-2 grid gap-2 sm:grid-cols-2">
            {kosmoSketchAdapterContract.allowed_today.map((item) => (
              <p key={item} className="rounded-md bg-black/24 px-3 py-2 text-sm leading-5 text-cyan-50/90">
                {pretty(item)}
              </p>
            ))}
          </div>
        </div>
        <div className="rounded-lg border border-rose-300/20 bg-rose-400/10 p-3">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-rose-100">Heute blockiert</p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {kosmoSketchAdapterContract.blocked_today.map((item) => (
              <Chip key={item} label={item} tone="rose" />
            ))}
          </div>
        </div>
      </div>

      <div className="mt-4 rounded-lg border border-emerald-300/20 bg-emerald-300/10 p-3">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-emerald-100">Promotion Requirements</p>
        <div className="mt-3 grid gap-2 md:grid-cols-2 xl:grid-cols-3">
          {kosmoSketchAdapterContract.promotion_requirements.map((requirement) => (
            <p key={requirement} className="rounded-md border border-white/10 bg-black/24 px-3 py-2 text-sm leading-5 text-emerald-50/90">
              {requirement}
            </p>
          ))}
        </div>
      </div>
    </section>
  );
}
