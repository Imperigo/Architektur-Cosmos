import type { OrbitFullReviewReport, OrbitRouteSmokeReport } from './OrbitQualityEvidence';

export type OrbitStaticExportSmokeReport = {
  status: string;
  html_file: string;
  summary: {
    check_count: number;
    passed_checks: number;
    failed_checks: number;
    referenced_static_asset_count?: number;
    missing_static_asset_count?: number;
  };
  static_assets?: {
    referenced: string[];
    missing: string[];
  };
  next_actions: string[];
};

type DemoReadinessProps = {
  fullReview: OrbitFullReviewReport;
  routeSmoke: OrbitRouteSmokeReport;
  staticSmoke: OrbitStaticExportSmokeReport;
};

type ReadinessCheck = {
  label: string;
  value: string;
  passed: boolean;
};

export function OrbitDemoReadiness({ fullReview, routeSmoke, staticSmoke }: DemoReadinessProps) {
  const checks: ReadinessCheck[] = [
    {
      label: 'Review Mode',
      value: `${fullReview.summary.passed_steps}/${fullReview.summary.step_count} Full-Review-Schritte`,
      passed: fullReview.status === 'orbit_full_review_ready_for_review_mode' && fullReview.summary.failed_steps === 0
    },
    {
      label: 'Route Contract',
      value: `${routeSmoke.summary.passed_checks}/${routeSmoke.summary.check_count} Route-Smoke-Checks`,
      passed: routeSmoke.status === 'orbit_route_smoke_passed' && routeSmoke.summary.failed_checks === 0
    },
    {
      label: 'Static Export',
      value: `${staticSmoke.summary.check_count} HTML-Smoke-Vertragschecks, ${staticSmoke.summary.referenced_static_asset_count ?? 0} CSS/JS-Assets, ${staticSmoke.summary.missing_static_asset_count ?? 0} fehlend`,
      passed: staticSmoke.html_file === 'out/orbit/index.html'
        && staticSmoke.summary.check_count >= 16
        && (staticSmoke.summary.referenced_static_asset_count ?? 0) > 0
        && (staticSmoke.summary.missing_static_asset_count ?? 0) === 0
    }
  ];
  const ready = checks.every((check) => check.passed);

  return (
    <section className="rounded-lg border border-emerald-300/25 bg-emerald-300/[0.045] p-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-100">Demo-Bereitschaft</p>
          <h2 className="mt-2 text-xl font-semibold text-white">Menschlich vorfuehrbar, technisch weiterhin gesperrt</h2>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-stone-300">
            Diese Zusammenfassung verbindet die wichtigsten lokalen Pruefungen. Sie bedeutet: KosmoOrbit kann als
            sichere Produktdemo gezeigt werden. Der Static-Smoke bleibt ein separates Nach-dem-Build-Gate; kein Push,
            kein Livegang, keine Generierung und keine Writes passieren ohne ausdrueckliche Freigabe.
          </p>
        </div>
        <span className="inline-flex max-w-full items-center break-words rounded-full border border-emerald-300/35 bg-emerald-400/10 px-2.5 py-1 text-[11px] font-medium leading-tight text-emerald-100">
          {ready ? 'human-demo-ready' : 'needs-demo-review'}
        </span>
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-3">
        {checks.map((check) => (
          <article key={check.label} className="min-w-0 rounded-lg border border-white/10 bg-black/24 p-3">
            <div className="flex items-center justify-between gap-3">
              <h3 className="text-base font-semibold text-white">{check.label}</h3>
              <span className={`h-2.5 w-2.5 rounded-full ${check.passed ? 'bg-emerald-300' : 'bg-amber-300'}`} aria-hidden="true" />
            </div>
            <p className="mt-2 text-sm leading-5 text-stone-300">{check.value}</p>
          </article>
        ))}
      </div>

      <div className="mt-4 grid gap-3 lg:grid-cols-[1fr_1.2fr]">
        <p className="rounded-md border border-cyan-300/20 bg-cyan-300/10 px-3 py-2 text-sm leading-5 text-cyan-100">
          Demo-Pfad: Autonomie, 3-Minuten-Erklaerung, Fortschritt, Projektpaket, Decision Draft, Evidenz,
          Rollenumschaltung und Guardrails.
        </p>
        <p className="rounded-md border border-amber-300/25 bg-amber-300/10 px-3 py-2 text-sm leading-5 text-amber-100">
          Freigabelinie: kein Push ohne Freigabe, keine externen Accounts, keine Cloud-Kosten, keine lokalen Writes
          ausser den bewusst erzeugten Repo-Artefakten.
        </p>
      </div>
    </section>
  );
}
