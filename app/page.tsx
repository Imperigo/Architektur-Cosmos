import Link from 'next/link';

export default function Home() {
  return (
    <main className="min-h-screen p-8">
      <div className="max-w-3xl">
        <p className="text-xs uppercase tracking-[0.3em] text-neutral-500">Architecture Universe</p>
        <h1 className="mt-4 text-5xl font-semibold tracking-tight">Architektur-Cosmos-Browser</h1>
        <p className="mt-6 text-lg leading-relaxed text-neutral-700">
          Ein radialer, zoombarer Architekturatlas mit Zeitringen, Stilsektoren und expandierbaren Einträgen.
        </p>
        <Link className="mt-8 inline-block rounded-full border border-neutral-900 px-5 py-3 text-sm uppercase tracking-wider" href="/atlas">
          Atlas öffnen
        </Link>
      </div>
    </main>
  );
}
