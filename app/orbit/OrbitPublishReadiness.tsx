const readinessRows = [
  {
    label: 'Lokale Demo',
    status: 'ready',
    evidence: 'Full Review, Route-Smoke, Demo-Audit, Static-Smoke und Build sind lokal gruen.'
  },
  {
    label: 'Owner-Go',
    status: 'missing',
    evidence: 'Push, Livegang und Cloudflare-Deploy bleiben blockiert, bis Andrin explizit Push/Live/Deploy sagt.'
  },
  {
    label: 'Security Review',
    status: 'needs_review',
    evidence: 'brain:doctor-fast meldet weiterhin eine npm-audit Dependency-Fundstelle, die bewusst beurteilt werden muss.'
  },
  {
    label: 'Live-Smoke',
    status: 'pending',
    evidence: 'Nach einem Push muss die Produktionsroute mit Cache-Buster und statischem /orbit-Check geprueft werden.'
  }
];

const statusTone: Record<string, string> = {
  ready: 'border-emerald-300/35 bg-emerald-400/10 text-emerald-100',
  missing: 'border-amber-300/35 bg-amber-400/10 text-amber-100',
  needs_review: 'border-rose-300/35 bg-rose-400/10 text-rose-100',
  pending: 'border-cyan-300/35 bg-cyan-400/10 text-cyan-100'
};

function formatStatus(value: string) {
  return value.replace(/_/g, ' ');
}

export function OrbitPublishReadiness() {
  return (
    <section className="rounded-lg border border-rose-300/20 bg-rose-300/[0.04] p-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-rose-100">Live-Gate</p>
          <h2 className="mt-2 text-xl font-semibold text-white">Vorfuehrbar lokal, Publish bewusst blockiert</h2>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-stone-300">
            Dieses Gate trennt lokale Produktreife von einem echten Livegang. KosmoOrbit darf intern gezeigt werden,
            aber Push, Deploy, Security-Fix und Live-Smoke bleiben bewusste Owner-Entscheidungen.
          </p>
        </div>
        <span className="inline-flex max-w-full items-center break-words rounded-full border border-rose-300/35 bg-rose-400/10 px-2.5 py-1 text-[11px] font-medium leading-tight text-rose-100">
          no-push-without-owner-go
        </span>
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        {readinessRows.map((row) => (
          <article key={row.label} className="min-w-0 rounded-lg border border-white/10 bg-black/24 p-3">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <h3 className="break-words text-base font-semibold text-white">{row.label}</h3>
              <span className={`inline-flex max-w-full items-center break-words rounded-full border px-2 py-1 text-[10px] font-medium uppercase tracking-[0.12em] ${statusTone[row.status] ?? statusTone.pending}`}>
                {formatStatus(row.status)}
              </span>
            </div>
            <p className="mt-3 text-sm leading-5 text-stone-300">{row.evidence}</p>
          </article>
        ))}
      </div>

      <p className="mt-4 rounded-md border border-amber-300/25 bg-amber-400/10 px-3 py-2 text-sm leading-5 text-amber-100">
        Interne Demo ist moeglich. Oeffentlicher Publish ist bewusst kein Automatismus: erst Security-Fundstelle beurteilen,
        dann Owner-Go, dann Push, dann Live-Smoke.
      </p>
    </section>
  );
}
