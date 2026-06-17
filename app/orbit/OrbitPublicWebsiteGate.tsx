import { publicGateStatusSummary } from '@/lib/public-kosmo';

export function OrbitPublicWebsiteGate() {
  const gateSummary = publicGateStatusSummary();

  return (
    <section className="rounded-[2rem] border border-cyan-300/20 bg-cyan-950/20 p-6 shadow-2xl shadow-cyan-950/20">
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-cyan-100">Public Website Gate</p>
          <h2 className="mt-2 text-2xl font-semibold tracking-normal text-white">References und Assets bleiben public-safe beobachtbar.</h2>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-cyan-50/78">
            Orbit spiegelt die oeffentliche Website nur ueber freigegebene Summaries. Private Quellen, geschuetzte
            Dokumentauszuege, lokale Pfade und KosmoDraw-Zwischenartefakte bleiben ausserhalb der Public-Schicht.
          </p>
        </div>
        <div className="rounded-full border border-emerald-300/30 px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-emerald-100">
          review gates active
        </div>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {gateSummary.map((item) => (
          <div key={item.label} className="rounded-2xl border border-white/10 bg-slate-950/40 p-4">
            <p className="text-3xl font-semibold text-white">{item.value}</p>
            <p className="mt-2 text-xs font-semibold uppercase tracking-[0.16em] text-cyan-100">{item.label}</p>
            <p className="mt-2 text-sm leading-5 text-slate-200/78">{item.detail}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
