import pilotMeasurementKitData from '@/examples/kosmo-orbit/pilot/orbit-office-pilot-measurement-kit.demo.json';

type PilotPhase = {
  id: string;
  label: string;
  output: string;
  guard: string;
};

type MeasurementCard = {
  id: string;
  label: string;
  unit: string;
  target_evidence: string;
  baseline_prompt: string;
  kosmoorbit_prompt: string;
  before_value: number | null;
  after_value: number | null;
  human_note: string | null;
};

type PilotMeasurementKit = {
  kit: {
    id: string;
    status: string;
    mode: string;
    scope: string;
  };
  safety: Record<string, boolean>;
  phases: PilotPhase[];
  measurement_cards: MeasurementCard[];
  evidence_links: Array<{
    id: string;
    target: string;
  }>;
  scoring: {
    status: string;
    minimum_evidence_links: number;
    allowed_decisions: string[];
  };
  decision: {
    status: string;
    selected_option: string | null;
    human_reviewer: string | null;
  };
};

const pilotMeasurementKit = pilotMeasurementKitData as PilotMeasurementKit;

function formatId(value: string) {
  return value.replace(/_/g, ' ').replace(/-/g, ' ');
}

export function OrbitPilotMeasurementKit() {
  const emptyCardCount = pilotMeasurementKit.measurement_cards.filter((card) => (
    card.before_value === null && card.after_value === null && card.human_note === null
  )).length;
  const trueSafetyCount = Object.values(pilotMeasurementKit.safety).filter(Boolean).length;

  return (
    <section className="rounded-lg border border-emerald-300/20 bg-emerald-300/[0.04] p-4">
      <div className="grid gap-4 lg:grid-cols-[0.9fr_1.1fr] lg:items-start">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-100">Pilot-Messkit</p>
          <h2 className="mt-2 text-xl font-semibold text-white">Buerotest messen, ohne Resultate zu erfinden</h2>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-stone-300">
            Das Messkit trennt Baseline, KosmoOrbit-Eindruck, Rollenrunde und menschliche Entscheidung.
            Es sammelt noch keine echten Zahlen und bleibt auf Demo- oder anonymisierte Eingaben begrenzt.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <span className="inline-flex max-w-full items-center break-words rounded-full border border-emerald-300/35 bg-emerald-400/10 px-2.5 py-1 text-[11px] font-medium leading-tight text-emerald-100">
              {formatId(pilotMeasurementKit.kit.status)}
            </span>
            <span className="inline-flex max-w-full items-center break-words rounded-full border border-cyan-300/35 bg-cyan-400/10 px-2.5 py-1 text-[11px] font-medium leading-tight text-cyan-100">
              {formatId(pilotMeasurementKit.kit.mode)}
            </span>
            <span className="inline-flex max-w-full items-center break-words rounded-full border border-amber-300/35 bg-amber-400/10 px-2.5 py-1 text-[11px] font-medium leading-tight text-amber-100">
              {formatId(pilotMeasurementKit.scoring.status)}
            </span>
          </div>
        </div>

        <div className="grid min-w-0 gap-2 rounded-lg border border-white/10 bg-black/24 p-3 text-sm">
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-md bg-white/[0.04] px-3 py-2">
            <span className="text-stone-400">Messkarten leer</span>
            <span className="font-mono text-emerald-100">{emptyCardCount}/{pilotMeasurementKit.measurement_cards.length}</span>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-md bg-white/[0.04] px-3 py-2">
            <span className="text-stone-400">Sicherheitsflags</span>
            <span className="font-mono text-emerald-100">{trueSafetyCount}/{Object.keys(pilotMeasurementKit.safety).length}</span>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-md bg-white/[0.04] px-3 py-2">
            <span className="text-stone-400">Evidenzlinks</span>
            <span className="font-mono text-cyan-100">{pilotMeasurementKit.evidence_links.length}</span>
          </div>
          <div className="rounded-md border border-amber-300/20 bg-amber-400/10 px-3 py-2 text-amber-100">
            Entscheidung: {formatId(pilotMeasurementKit.decision.status)}
          </div>
        </div>
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        {pilotMeasurementKit.phases.map((phase) => (
          <article key={phase.id} className="min-w-0 rounded-lg border border-white/10 bg-black/24 p-3">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-emerald-100">{formatId(phase.id)}</p>
            <h3 className="mt-2 text-base font-semibold text-white">{phase.label}</h3>
            <p className="mt-2 text-sm leading-5 text-stone-300">{phase.output}</p>
            <p className="mt-3 rounded-md border border-white/10 bg-white/[0.04] px-3 py-2 text-xs leading-5 text-stone-400">{phase.guard}</p>
          </article>
        ))}
      </div>

      <div className="mt-4 grid gap-3 lg:grid-cols-5">
        {pilotMeasurementKit.measurement_cards.map((card) => (
          <article key={card.id} className="min-w-0 rounded-lg border border-white/10 bg-white/[0.04] p-3">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-cyan-100">{formatId(card.id)}</p>
            <h3 className="mt-2 text-sm font-semibold leading-5 text-white">{card.label}</h3>
            <p className="mt-2 text-xs leading-5 text-stone-400">{card.unit} - {card.target_evidence}</p>
            <p className="mt-3 rounded-md border border-white/10 bg-black/24 px-3 py-2 text-xs leading-5 text-stone-300">
              before null - after null - human note null
            </p>
          </article>
        ))}
      </div>
    </section>
  );
}
