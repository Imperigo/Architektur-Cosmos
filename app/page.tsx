import Link from 'next/link';

export default function Home() {
  return (
    <main className="relative min-h-screen overflow-hidden bg-[#f7f7f4] text-neutral-950">
      <div className="absolute inset-y-0 right-0 hidden w-[58vw] md:block">
        <svg viewBox="0 0 760 920" className="h-full w-full" aria-hidden="true">
          <rect width="760" height="920" fill="#f7f7f4" />
          <path d="M 0 460 H 760 M 380 0 V 920" stroke="#d4d4d4" strokeWidth="0.8" strokeDasharray="2 12" />
          {[90, 155, 220, 285, 350].map((radius, index) => (
            <circle
              key={radius}
              cx="380"
              cy="460"
              r={radius}
              fill="none"
              stroke={index % 2 === 0 ? '#202020' : '#9a9a9a'}
              strokeWidth={index % 2 === 0 ? 0.9 : 0.55}
              opacity={index % 2 === 0 ? 0.65 : 0.45}
            />
          ))}
          {[18, 72, 132, 188, 248, 306].map((angle) => {
            const radians = (angle - 90) * Math.PI / 180;
            const x = 380 + 410 * Math.cos(radians);
            const y = 460 + 410 * Math.sin(radians);

            return <line key={angle} x1="380" y1="460" x2={x} y2={y} stroke="#202020" strokeWidth="0.7" opacity="0.46" />;
          })}
          {[
            [498, 170],
            [560, 212],
            [615, 356],
            [602, 560],
            [515, 681],
            [293, 706],
            [188, 514],
            [255, 286]
          ].map(([x, y], index) => (
            <circle key={`${x}-${y}`} cx={x} cy={y} r={index % 3 === 0 ? 5.5 : 4.2} fill={index % 3 === 0 ? '#f7f7f4' : '#101010'} stroke="#101010" strokeWidth="1.2" />
          ))}
        </svg>
      </div>

      <div className="relative z-10 flex min-h-screen max-w-5xl flex-col justify-center px-6 py-12 sm:px-10">
        <p className="text-xs uppercase tracking-[0.34em] text-neutral-500">Architecture Cosmos</p>
        <h1 className="mt-5 max-w-3xl text-5xl font-semibold leading-[0.95] tracking-tight sm:text-7xl">
          A radial atlas for architectural knowledge.
        </h1>
        <p className="mt-7 max-w-xl text-lg leading-relaxed text-neutral-700">
          Time rings, style sectors, and entries for buildings, plans, landscapes, theories, maps, objects, infrastructures, and events.
        </p>
        <div className="mt-9 flex flex-wrap items-center gap-3">
          <Link className="border border-neutral-900 bg-neutral-950 px-5 py-3 text-sm uppercase tracking-[0.18em] text-[#f7f7f4] hover:bg-[#f7f7f4] hover:text-neutral-950" href="/atlas">
            Open Atlas
          </Link>
          <Link className="border border-neutral-400 px-5 py-3 text-sm uppercase tracking-[0.18em] text-neutral-700 hover:border-neutral-900 hover:text-neutral-950" href="/atlas">
            /atlas
          </Link>
        </div>
      </div>
    </main>
  );
}
