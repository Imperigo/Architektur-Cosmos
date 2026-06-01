import pilotSessionData from '@/examples/kosmo-orbit/pilot/orbit-office-pilot-session.demo.json';

type PilotStep = {
  id: string;
  minutes: string;
  owner_role: string;
  prompt: string;
  expected_output: string;
};

type MeasurementPoint = {
  id: string;
  label: string;
  unit: string;
  before_value: number | null;
  after_value: number | null;
};

type PilotSession = {
  session: {
    id: string;
    status: string;
    mode: string;
    duration_minutes: number;
  };
  safety: Record<string, boolean>;
  roles: string[];
  runbook_steps: PilotStep[];
  measurement_points: MeasurementPoint[];
  decision: {
    status: string;
    next_options: string[];
  };
};

const pilotSession = pilotSessionData as PilotSession;

function formatId(value: string) {
  return value.replace(/_/g, ' ').replace(/-/g, ' ');
}

export function OrbitPilotSessionTemplate() {
  const emptyMetricCount = pilotSession.measurement_points.filter((point) => point.before_value === null && point.after_value === null).length;

  return (
    <section className="rounded-lg border border-cyan-300/20 bg-cyan-300/[0.04] p-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-cyan-100">Pilot-Session Template</p>
          <h2 className="mt-2 text-xl font-semibold text-white">Messstruktur bereit, Resultate noch leer</h2>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-stone-300">
            Dieses Template ist die Bruecke zwischen Demo und echter Buero-Erprobung. Es definiert Rollen,
            Schritte und Messpunkte, speichert aber noch keine Zeit-, Kosten- oder Qualitaetswerte.
          </p>
        </div>
        <span className="inline-flex max-w-full items-center break-words rounded-full border border-cyan-300/35 bg-cyan-400/10 px-2.5 py-1 text-[11px] font-medium leading-tight text-cyan-100">
          {formatId(pilotSession.session.status)}
        </span>
      </div>

      <div className="mt-4 grid gap-3 lg:grid-cols-[0.9fr_1.1fr]">
        <div className="min-w-0 rounded-lg border border-white/10 bg-black/24 p-3">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-stone-400">Session</p>
          <div className="mt-3 grid gap-2 text-sm">
            <p className="rounded-md bg-white/[0.04] px-3 py-2 text-stone-200">ID: {pilotSession.session.id}</p>
            <p className="rounded-md bg-white/[0.04] px-3 py-2 text-stone-200">Mode: {formatId(pilotSession.session.mode)}</p>
            <p className="rounded-md bg-white/[0.04] px-3 py-2 text-stone-200">Dauer: {pilotSession.session.duration_minutes} Minuten</p>
            <p className="rounded-md border border-emerald-300/20 bg-emerald-400/10 px-3 py-2 text-emerald-100">
              Leere Messwerte: {emptyMetricCount}/{pilotSession.measurement_points.length}
            </p>
          </div>
        </div>

        <div className="min-w-0 rounded-lg border border-white/10 bg-black/24 p-3">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-stone-400">Sicherheitslinie</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {Object.entries(pilotSession.safety).map(([key, value]) => (
              <span key={key} className={`inline-flex max-w-full items-center break-words rounded-full border px-2.5 py-1 text-xs ${value ? 'border-emerald-300/25 bg-emerald-400/10 text-emerald-100' : 'border-rose-300/25 bg-rose-400/10 text-rose-100'}`}>
                {formatId(key)}: {value ? 'true' : 'false'}
              </span>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-5">
        {pilotSession.measurement_points.map((point) => (
          <article key={point.id} className="min-w-0 rounded-lg border border-white/10 bg-white/[0.04] p-3">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-cyan-100">{formatId(point.id)}</p>
            <p className="mt-3 text-sm leading-5 text-stone-200">{point.label}</p>
            <p className="mt-3 rounded-md border border-white/10 bg-black/24 px-3 py-2 text-xs leading-5 text-stone-400">
              {point.unit} - before null - after null
            </p>
          </article>
        ))}
      </div>

      <div className="mt-4 rounded-md border border-amber-300/25 bg-amber-400/10 px-3 py-2 text-sm leading-5 text-amber-100">
        Keine Pilotwerte sind behauptet: Entscheidung steht auf {formatId(pilotSession.decision.status)}.
        Erst ein Mensch traegt reale Beobachtungen ein.
      </div>
    </section>
  );
}
