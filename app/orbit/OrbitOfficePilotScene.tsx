import officePilotSceneData from '@/examples/kosmo-orbit/pilot/orbit-office-pilot-scene.demo.json';

type OfficePilotScene = {
  scene: {
    status: string;
    mode: string;
    tag: string;
    summary: string;
  };
  safety: Record<string, boolean>;
  steps: Array<{
    id: string;
    actor: string;
    title: string;
    outcome: string;
    guard: string;
  }>;
  roles: Array<{
    role: string;
    sees: string;
    needs: string;
  }>;
  evidence_questions: string[];
  decision: {
    status: string;
    allowed_outcomes: string[];
    human_reviewer: string | null;
  };
};

const officePilotScene = officePilotSceneData as OfficePilotScene;

function formatId(value: string) {
  return value.replace(/_/g, ' ').replace(/-/g, ' ');
}

export function OrbitOfficePilotScene() {
  const safetyCount = Object.values(officePilotScene.safety).filter(Boolean).length;

  return (
    <section className="rounded-lg border border-emerald-300/20 bg-emerald-300/[0.045] p-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-100">Buero-Pilot Szene</p>
          <h2 className="mt-2 text-xl font-semibold text-white">So wirkt KosmoOrbit im kleinen Architekturbuero</h2>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-stone-300">
            Diese Szene verbindet die Vision mit einem ersten sicheren Alltagstest: KosmoOrbit startet nicht als fertiges
            CAD, sondern als lokale Steuerzentrale, die Projektwissen, Rollen, Review-Gates und KosmoDesign sichtbar
            zusammenbringt.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <span className="inline-flex max-w-full items-center break-words rounded-full border border-emerald-300/35 bg-emerald-400/10 px-2.5 py-1 text-[11px] font-medium leading-tight text-emerald-100">
              {formatId(officePilotScene.scene.status)}
            </span>
            <span className="inline-flex max-w-full items-center break-words rounded-full border border-cyan-300/35 bg-cyan-400/10 px-2.5 py-1 text-[11px] font-medium leading-tight text-cyan-100">
              {formatId(officePilotScene.scene.mode)}
            </span>
            <span className="inline-flex max-w-full items-center break-words rounded-full border border-amber-300/35 bg-amber-400/10 px-2.5 py-1 text-[11px] font-medium leading-tight text-amber-100">
              safety {safetyCount}/{Object.keys(officePilotScene.safety).length}
            </span>
          </div>
        </div>
        <span className="inline-flex max-w-full items-center break-words rounded-full border border-emerald-300/40 bg-emerald-400/10 px-2.5 py-1 text-[11px] font-medium leading-tight text-emerald-100">
          {officePilotScene.scene.tag}
        </span>
      </div>

      <div className="mt-4 grid gap-3 lg:grid-cols-4">
        {officePilotScene.steps.map((step, index) => (
          <article key={step.id} className="rounded-lg border border-white/10 bg-black/24 p-3">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <span className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-emerald-300/35 bg-emerald-400/10 text-xs font-semibold text-emerald-100">
                {index + 1}
              </span>
              <span className="rounded-full border border-white/10 bg-white/[0.05] px-2 py-1 text-[10px] font-medium uppercase tracking-[0.12em] text-stone-300">
                {step.actor}
              </span>
            </div>
            <p className="mt-3 text-[11px] font-semibold uppercase tracking-[0.16em] text-emerald-100">{formatId(step.id)}</p>
            <h3 className="mt-1 text-base font-semibold text-white">{step.title}</h3>
            <p className="mt-2 text-sm leading-5 text-stone-300">{step.outcome}</p>
            <p className="mt-3 rounded-md border border-amber-300/20 bg-amber-400/10 px-2.5 py-2 text-xs leading-5 text-amber-100">
              {step.guard}
            </p>
          </article>
        ))}
      </div>

      <div className="mt-4 grid gap-3 lg:grid-cols-[1fr_0.9fr]">
        <div className="rounded-lg border border-white/10 bg-black/24 p-3">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-stone-400">Rollenbild</p>
          <div className="mt-3 grid gap-2 md:grid-cols-2">
            {officePilotScene.roles.map((role) => (
              <article key={role.role} className="rounded-md border border-white/10 bg-white/[0.04] p-3">
                <h3 className="text-sm font-semibold text-white">{role.role}</h3>
                <p className="mt-2 text-xs leading-5 text-stone-300">{role.sees}</p>
                <p className="mt-2 text-xs leading-5 text-cyan-100">{role.needs}</p>
              </article>
            ))}
          </div>
        </div>

        <div className="rounded-lg border border-cyan-200/20 bg-cyan-300/[0.055] p-3">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-cyan-100">Evidenz vor Claim</p>
          <ul className="mt-3 grid gap-2">
            {officePilotScene.evidence_questions.map((item) => (
              <li key={item} className="rounded-md bg-black/24 px-3 py-2 text-sm leading-5 text-stone-300">
                {item}
              </li>
            ))}
          </ul>
          <p className="mt-3 rounded-md border border-rose-300/20 bg-rose-400/10 px-3 py-2 text-xs leading-5 text-rose-100">
            Der Pilot behauptet keinen ROI, keine automatische Planung und keine offizielle Zertifizierung. Er sammelt
            zuerst menschlich gepruefte Beobachtungen. Decision: {formatId(officePilotScene.decision.status)}.
          </p>
        </div>
      </div>
    </section>
  );
}
