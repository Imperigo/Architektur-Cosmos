import orbitStatusBridgeData from '@/data/kosmo-orbit-status-bridge-2026-06-15.json';

type OrbitCard = {
  id: string;
  title: string;
  status: string;
  signal: string;
  owner_action_required: boolean;
  route_hint: string;
  source_ref: string;
};

type OrbitStatusBridgeReport = {
  status: string;
  generated_at: string;
  summary: {
    cards: number;
    blocking_cards: number;
    owner_action_cards: number;
    source_root_blocked: boolean;
    day_batch_status: string | null;
    github_fixture_skeletons_status: string | null;
    github_fixture_payloads_status: string | null;
    github_fixture_payload_smoke_status: string | null;
    public_ready_after_bridge: number;
  };
  orbit_cards: OrbitCard[];
};

const bridge = orbitStatusBridgeData as OrbitStatusBridgeReport;
const githubCards = bridge.orbit_cards.filter((card) => card.id.startsWith('github-'));
const trainingCards = bridge.orbit_cards.filter((card) => card.id.startsWith('training-') || card.id === 'architecture-ontology-seed');
const blockerCards = bridge.orbit_cards.filter((card) => card.status === 'blocked' || card.status.startsWith('blocked_') || card.status === 'needs_review');
const ownerActionCards = bridge.orbit_cards.filter((card) => card.owner_action_required || card.status === 'owner_action');

function toneForStatus(status: string) {
  if (status === 'review_only_ready' || status === 'ready' || status === 'guard_passed' || status === 'locked') {
    return 'border-emerald-300/30 bg-emerald-400/10 text-emerald-100';
  }
  if (status === 'blocked' || status.startsWith('blocked_') || status === 'needs_review') {
    return 'border-rose-300/30 bg-rose-400/10 text-rose-100';
  }
  if (status === 'owner_action') return 'border-amber-300/35 bg-amber-400/10 text-amber-100';
  return 'border-white/10 bg-white/[0.05] text-stone-200';
}

function StatusPill({ value }: { value: string }) {
  return <span className={`inline-flex max-w-full items-center break-words rounded-full border px-2.5 py-1 text-[11px] font-medium leading-tight ${toneForStatus(value)}`}>{value}</span>;
}

function SummaryMetric({ label, value, tone = 'neutral' }: { label: string; value: string | number; tone?: 'green' | 'red' | 'yellow' | 'neutral' }) {
  const toneClass = {
    green: 'border-emerald-300/25 bg-emerald-400/10 text-emerald-100',
    red: 'border-rose-300/25 bg-rose-400/10 text-rose-100',
    yellow: 'border-amber-300/25 bg-amber-400/10 text-amber-100',
    neutral: 'border-white/10 bg-white/[0.04] text-stone-200'
  }[tone];

  return (
    <div className={`rounded-md border p-3 ${toneClass}`}>
      <p className="text-[11px] font-semibold uppercase tracking-[0.14em] opacity-80">{label}</p>
      <p className="mt-1 break-words font-mono text-lg text-white">{value}</p>
    </div>
  );
}

export function OrbitStatusBridge() {
  return (
    <section className="rounded-lg border border-white/10 bg-white/[0.04] p-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-cyan-200">Orbit Status Bridge</p>
          <h2 className="mt-2 text-xl font-semibold text-white">Live-Stand der Kosmo-Zentrale</h2>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-stone-300">
            {bridge.summary.day_batch_status} - {bridge.summary.github_fixture_payload_smoke_status} - public-ready {bridge.summary.public_ready_after_bridge}
          </p>
        </div>
        <StatusPill value={bridge.status} />
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <SummaryMetric label="Cards" value={bridge.summary.cards} tone="green" />
        <SummaryMetric label="Blocker" value={bridge.summary.blocking_cards} tone={bridge.summary.blocking_cards > 0 ? 'red' : 'green'} />
        <SummaryMetric label="Owner Actions" value={bridge.summary.owner_action_cards} tone={bridge.summary.owner_action_cards > 0 ? 'yellow' : 'green'} />
        <SummaryMetric label="Source Root" value={bridge.summary.source_root_blocked ? 'blocked' : 'ready'} tone={bridge.summary.source_root_blocked ? 'red' : 'green'} />
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h3 className="text-base font-semibold text-white">Kosmo-KI Readiness</h3>
            <span className="text-xs text-stone-500">{trainingCards.length} Gates</span>
          </div>
          <div className="mt-3 grid gap-3 md:grid-cols-2">
            {trainingCards.map((card) => (
              <article key={card.id} className="rounded-lg border border-white/10 bg-black/24 p-3">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <h4 className="min-w-0 text-sm font-semibold leading-5 text-white">{card.title}</h4>
                  <StatusPill value={card.status} />
                </div>
                <p className="mt-3 text-sm leading-5 text-stone-300">{card.signal}</p>
                <p className="mt-2 text-xs leading-5 text-stone-500">{card.route_hint}</p>
              </article>
            ))}
          </div>

          <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
            <h3 className="text-base font-semibold text-white">GitHub-Signal-Kette</h3>
            <span className="text-xs text-stone-500">{githubCards.length} Signale</span>
          </div>
          <div className="mt-3 grid gap-3 md:grid-cols-2">
            {githubCards.map((card) => (
              <article key={card.id} className="rounded-lg border border-white/10 bg-black/24 p-3">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <h4 className="min-w-0 text-sm font-semibold leading-5 text-white">{card.title}</h4>
                  <StatusPill value={card.status} />
                </div>
                <p className="mt-3 text-sm leading-5 text-stone-300">{card.signal}</p>
                <p className="mt-2 text-xs leading-5 text-stone-500">{card.route_hint}</p>
              </article>
            ))}
          </div>
        </div>

        <div className="grid min-w-0 gap-4">
          <div className="rounded-lg border border-amber-200/20 bg-amber-400/[0.055] p-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="text-base font-semibold text-white">Owner Actions</h3>
              <span className="text-xs text-amber-100">{ownerActionCards.length}</span>
            </div>
            <div className="mt-3 grid gap-2">
              {ownerActionCards.map((card) => (
                <article key={card.id} className="rounded-md border border-white/10 bg-black/24 p-3">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <h4 className="text-sm font-semibold leading-5 text-white">{card.title}</h4>
                    <StatusPill value={card.status} />
                  </div>
                  <p className="mt-2 text-xs leading-5 text-stone-300">{card.signal}</p>
                  <p className="mt-2 text-xs leading-5 text-stone-500">{card.route_hint}</p>
                </article>
              ))}
            </div>
          </div>

          <div className="rounded-lg border border-rose-200/20 bg-rose-400/[0.055] p-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="text-base font-semibold text-white">Aktive Blocker</h3>
              <span className="text-xs text-rose-100">{blockerCards.length}</span>
            </div>
            <div className="mt-3 grid gap-2">
              {blockerCards.map((card) => (
                <article key={card.id} className="rounded-md border border-white/10 bg-black/24 p-3">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <h4 className="text-sm font-semibold leading-5 text-white">{card.title}</h4>
                    <StatusPill value={card.status} />
                  </div>
                  <p className="mt-2 text-xs leading-5 text-stone-300">{card.signal}</p>
                </article>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
