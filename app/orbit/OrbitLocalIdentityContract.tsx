import localIdentityContractData from '@/examples/kosmo-orbit/identity/orbit-local-identity.contract.json';

type ProfileClass = {
  id: string;
  role_ids: string[];
  profile_depth: string;
  allowed_future_scope: string[];
  today_preview_scope: string[];
  required_human_gate: string;
  privacy_requirement: string;
};

type SessionBoundary = {
  id: string;
  today: string;
  future_requirement: string;
  blocked_today: string[];
};

type LocalIdentityContract = {
  status: string;
  mode: string;
  identity_principles: string[];
  profile_classes: ProfileClass[];
  session_boundaries: SessionBoundary[];
  blocked_capabilities: string[];
  promotion_requirements: string[];
};

const localIdentityContract = localIdentityContractData as LocalIdentityContract;

function pretty(value: string) {
  return value.replace(/_/g, ' ');
}

export function OrbitLocalIdentityContract() {
  return (
    <section className="rounded-lg border border-violet-200/20 bg-black/30 p-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-violet-100">Local Identity Boundary</p>
          <h2 className="mt-2 text-xl font-semibold text-white">Was spaeter Profil, Auth und Session wird</h2>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-stone-300">
            KosmoOrbit braucht spaeter lokale Identitaeten, Profile und Sessions. Dieser Vertrag trennt heute
            bewusst Preview von echter Auth: keine Logins, keine Accounts, keine Passwoerter, keine Profilpersistenz,
            keine Session-Cookies, keine personenbezogenen Writes und kein externer Identity Provider.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <span className="rounded-full border border-emerald-300/35 bg-emerald-400/10 px-2.5 py-1 text-[11px] font-medium uppercase tracking-[0.12em] text-emerald-100">
            {localIdentityContract.status}
          </span>
          <span className="rounded-full border border-amber-300/35 bg-amber-400/10 px-2.5 py-1 text-[11px] font-medium uppercase tracking-[0.12em] text-amber-100">
            {localIdentityContract.mode}
          </span>
          <span className="rounded-full border border-rose-300/35 bg-rose-400/10 px-2.5 py-1 text-[11px] font-medium uppercase tracking-[0.12em] text-rose-100">
            {localIdentityContract.blocked_capabilities.length} blocked
          </span>
        </div>
      </div>

      <div className="mt-4 grid gap-3 lg:grid-cols-[0.85fr_1.15fr]">
        <div className="rounded-lg border border-white/10 bg-white/[0.04] p-3">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-stone-500">Prinzipien</p>
          <div className="mt-3 grid gap-2">
            {localIdentityContract.identity_principles.map((principle) => (
              <p key={principle} className="rounded-md border border-violet-300/20 bg-violet-300/10 px-3 py-2 text-sm leading-5 text-violet-50/90">
                {principle}
              </p>
            ))}
          </div>
        </div>

        <div className="rounded-lg border border-rose-300/20 bg-rose-400/10 p-3">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-rose-100">Heute blockiert</p>
          <div className="mt-3 flex flex-wrap gap-1.5">
            {localIdentityContract.blocked_capabilities.map((capability) => (
              <span key={capability} className="rounded-full border border-rose-300/30 bg-black/24 px-2.5 py-1 font-mono text-[11px] text-rose-50/90">
                {capability}
              </span>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-4 grid gap-3 xl:grid-cols-5">
        {localIdentityContract.profile_classes.map((profileClass) => (
          <article key={profileClass.id} className="rounded-lg border border-white/10 bg-white/[0.04] p-3">
            <p className="text-xs uppercase tracking-[0.16em] text-stone-500">{pretty(profileClass.profile_depth)}</p>
            <h3 className="mt-1 text-base font-semibold text-white">{pretty(profileClass.id)}</h3>
            <div className="mt-3 flex flex-wrap gap-1.5">
              {profileClass.role_ids.map((roleId) => (
                <span key={roleId} className="rounded-full border border-cyan-300/30 bg-cyan-400/10 px-2.5 py-1 text-[11px] text-cyan-100">
                  {pretty(roleId)}
                </span>
              ))}
            </div>
            <div className="mt-3 grid gap-2">
              <div className="rounded-md border border-emerald-300/20 bg-emerald-300/10 p-2">
                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-emerald-100">Heute</p>
                <ul className="mt-1 space-y-1 text-sm leading-5 text-emerald-50/85">
                  {profileClass.today_preview_scope.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </div>
              <div className="rounded-md border border-white/10 bg-black/24 p-2">
                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-stone-500">Spaeter</p>
                <ul className="mt-1 space-y-1 text-sm leading-5 text-stone-300">
                  {profileClass.allowed_future_scope.map((item) => (
                    <li key={item}>{pretty(item)}</li>
                  ))}
                </ul>
              </div>
            </div>
            <p className="mt-3 rounded-md border border-amber-300/20 bg-amber-300/10 px-3 py-2 text-sm leading-5 text-amber-100">
              Gate: {profileClass.required_human_gate}
            </p>
            <p className="mt-2 text-xs leading-5 text-stone-500">{profileClass.privacy_requirement}</p>
          </article>
        ))}
      </div>

      <div className="mt-4 grid gap-3 lg:grid-cols-3">
        {localIdentityContract.session_boundaries.map((boundary) => (
          <article key={boundary.id} className="rounded-lg border border-white/10 bg-black/24 p-3">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-stone-500">{pretty(boundary.id)}</p>
            <p className="mt-2 text-sm leading-5 text-stone-200">{boundary.today}</p>
            <p className="mt-2 rounded-md border border-violet-300/20 bg-violet-300/10 px-3 py-2 text-sm leading-5 text-violet-100">
              {boundary.future_requirement}
            </p>
            <div className="mt-3 flex flex-wrap gap-1.5">
              {boundary.blocked_today.map((item) => (
                <span key={item} className="rounded-full border border-rose-300/25 bg-rose-400/10 px-2.5 py-1 font-mono text-[11px] text-rose-100">
                  {item}
                </span>
              ))}
            </div>
          </article>
        ))}
      </div>

      <div className="mt-4 rounded-lg border border-cyan-300/20 bg-cyan-300/10 p-3">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-cyan-100">Promotion Requirements</p>
        <div className="mt-2 grid gap-2 md:grid-cols-2 xl:grid-cols-3">
          {localIdentityContract.promotion_requirements.map((requirement) => (
            <p key={requirement} className="rounded-md bg-black/24 px-3 py-2 text-sm leading-5 text-stone-200">
              {requirement}
            </p>
          ))}
        </div>
      </div>
    </section>
  );
}
