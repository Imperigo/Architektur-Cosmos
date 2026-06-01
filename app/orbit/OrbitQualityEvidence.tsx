export type OrbitFullReviewReport = {
  status: string;
  generated_at: string;
  summary: {
    step_count: number;
    passed_steps: number;
    failed_steps: number;
    orbit_route_smoke_passed_checks: number;
    orbit_route_smoke_check_count: number;
    project_artifact_count: number;
    project_review_artifact_count: number;
    design_open_mode: string;
    design_generation_allowed: boolean;
    role_variant_count: number;
  };
};

export type OrbitRouteSmokeReport = {
  status: string;
  generated_at: string;
  summary: {
    check_count: number;
    passed_checks: number;
    failed_checks: number;
  };
};

type OrbitQualityEvidenceProps = {
  fullReview: OrbitFullReviewReport;
  routeSmoke: OrbitRouteSmokeReport;
};

const evidenceItems = [
  'Full Review bleibt review-only.',
  'Route-Smoke prueft statische Sicherheit und sichtbare Demo-Panels.',
  'KosmoDesign bleibt im context_review_only Modus.',
  'Design-Generation bleibt deaktiviert.'
];

export function OrbitQualityEvidence({ fullReview, routeSmoke }: OrbitQualityEvidenceProps) {
  return (
    <section className="rounded-lg border border-emerald-300/20 bg-black/28 p-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-100">Pruefevidenz</p>
          <h2 className="mt-2 text-xl font-semibold text-white">Warum diese Preview belastbar ist</h2>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-stone-300">
            KosmoOrbit zeigt nicht nur Panels, sondern auch die lokale Evidenz dahinter: Review-Kette,
            Route-Smoke, Projektartefakte und deaktivierte Generation.
          </p>
        </div>
        <span className="inline-flex max-w-full items-center break-words rounded-full border border-emerald-300/35 bg-emerald-400/10 px-2.5 py-1 text-[11px] font-medium leading-tight text-emerald-100">
          local-checks-visible
        </span>
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-4">
        <div className="rounded-lg border border-white/10 bg-white/[0.04] p-3">
          <p className="text-xs uppercase tracking-[0.14em] text-stone-500">Full Review</p>
          <p className="mt-2 text-2xl font-semibold text-white">{fullReview.summary.passed_steps}/{fullReview.summary.step_count}</p>
          <p className="mt-1 text-xs text-emerald-100">{fullReview.status.replace(/_/g, ' ')}</p>
        </div>
        <div className="rounded-lg border border-white/10 bg-white/[0.04] p-3">
          <p className="text-xs uppercase tracking-[0.14em] text-stone-500">Route-Smoke</p>
          <p className="mt-2 text-2xl font-semibold text-white">{routeSmoke.summary.passed_checks}/{routeSmoke.summary.check_count}</p>
          <p className="mt-1 text-xs text-emerald-100">{routeSmoke.status.replace(/_/g, ' ')}</p>
        </div>
        <div className="rounded-lg border border-white/10 bg-white/[0.04] p-3">
          <p className="text-xs uppercase tracking-[0.14em] text-stone-500">Reviewlast</p>
          <p className="mt-2 text-2xl font-semibold text-white">{fullReview.summary.project_review_artifact_count}</p>
          <p className="mt-1 text-xs text-stone-400">von {fullReview.summary.project_artifact_count} Artefakten</p>
        </div>
        <div className="rounded-lg border border-white/10 bg-white/[0.04] p-3">
          <p className="text-xs uppercase tracking-[0.14em] text-stone-500">Open Mode</p>
          <p className="mt-2 text-lg font-semibold text-white">{fullReview.summary.design_open_mode.replace(/_/g, ' ')}</p>
          <p className="mt-1 text-xs text-rose-100">Generation: {fullReview.summary.design_generation_allowed ? 'on' : 'off'}</p>
        </div>
      </div>

      <div className="mt-4 grid gap-2 md:grid-cols-2">
        {evidenceItems.map((item) => (
          <p key={item} className="rounded-md border border-white/10 bg-white/[0.04] px-3 py-2 text-sm leading-5 text-stone-300">
            {item}
          </p>
        ))}
      </div>

      <p className="mt-4 text-xs leading-5 text-stone-500">
        Letzte lokale Artefakte: Full Review {fullReview.generated_at}; Route-Smoke {routeSmoke.generated_at}.
      </p>
    </section>
  );
}
