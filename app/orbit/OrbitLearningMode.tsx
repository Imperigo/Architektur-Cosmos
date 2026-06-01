import type { OrbitRoleVariant } from './OrbitRoleSwitcher';

type OrbitLearningModeProps = {
  variants: OrbitRoleVariant[];
};

const learningTracks = [
  {
    label: 'Schulstoff und Buero-Standards',
    text: 'Kosmo erklaert Begriffe, Planlogik, Modellaufbau und interne Standards mit einfachen Beispielen.'
  },
  {
    label: 'Gefuehrte Projektbeobachtung',
    text: 'Lernende sehen echte Projektkontexte nur als read-only Ausschnitt und koennen sichere Beobachtungen vorbereiten.'
  },
  {
    label: 'Review statt Aktion',
    text: 'Jede Uebung trennt bewusst Verstehen, Review und Freigabe. Generation, Publish und Projekt-Writes bleiben gesperrt.'
  }
];

export function OrbitLearningMode({ variants }: OrbitLearningModeProps) {
  const learningVariants = variants.filter((variant) => variant.learning_support.enabled);

  return (
    <section className="rounded-lg border border-indigo-300/20 bg-indigo-300/[0.045] p-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-indigo-100">Ausbildungsmodus</p>
          <h2 className="mt-2 text-xl font-semibold text-white">Kosmo als sicherer Lernbegleiter im Architekturburo</h2>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-stone-300">
            Praktikant, Lehrling und Schnupperstift bekommen nicht dieselbe Oberflaeche wie Chef oder Projektleitung.
            KosmoOrbit reduziert Tiefe, erklaert Begriffe und haelt kritische Aktionen blockiert.
          </p>
        </div>
        <span className="inline-flex max-w-full items-center break-words rounded-full border border-indigo-300/35 bg-indigo-400/10 px-2.5 py-1 text-[11px] font-medium leading-tight text-indigo-100">
          {learningVariants.length} Lernprofile
        </span>
      </div>

      <div className="mt-4 grid gap-3 lg:grid-cols-3">
        {learningVariants.map((variant) => (
          <article key={variant.role.id} className="min-w-0 rounded-lg border border-white/10 bg-black/24 p-3">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="text-xs uppercase tracking-[0.14em] text-stone-500">{variant.role.ui_mode}</p>
                <h3 className="mt-2 break-words text-base font-semibold text-white">{variant.role.label}</h3>
              </div>
              <span className="inline-flex max-w-full items-center break-words rounded-full border border-emerald-300/35 bg-emerald-400/10 px-2 py-1 text-[10px] font-medium text-emerald-100">
                read-safe
              </span>
            </div>
            <p className="mt-3 text-sm leading-5 text-stone-300">{variant.explanation.purpose}</p>
            <p className="mt-3 rounded-md border border-cyan-300/20 bg-cyan-400/10 px-3 py-2 text-sm leading-5 text-cyan-100">
              {variant.explanation.safe_next_step}
            </p>
            <p className="mt-3 rounded-md border border-amber-300/20 bg-amber-400/10 px-3 py-2 text-xs leading-5 text-amber-100">
              {variant.learning_support.guidance}
            </p>
          </article>
        ))}
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-3">
        {learningTracks.map((track) => (
          <article key={track.label} className="rounded-lg border border-white/10 bg-white/[0.04] p-3">
            <h3 className="text-base font-semibold text-white">{track.label}</h3>
            <p className="mt-2 text-sm leading-5 text-stone-300">{track.text}</p>
          </article>
        ))}
      </div>

      <p className="mt-4 rounded-md border border-rose-300/25 bg-rose-400/10 px-3 py-2 text-sm leading-5 text-rose-100">
        Ausbildungsmodus bleibt ohne Accounts, Noten, externe Schulplattformen, Projekt-Writes, Design-Generation oder Public-Publish.
      </p>
    </section>
  );
}
