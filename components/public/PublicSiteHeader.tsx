import Link from 'next/link';

type PublicArea = 'references' | 'assets' | 'atlas' | 'orbit';

const items: Array<{ id: PublicArea; label: string; href: string }> = [
  { id: 'references', label: 'References', href: '/references/' },
  { id: 'assets', label: 'Assets', href: '/assets/' },
  { id: 'atlas', label: 'Atlas', href: '/atlas/' },
  { id: 'orbit', label: 'KosmoOrbit', href: '/orbit/' }
];

export function PublicSiteHeader({ active, accent }: { active: PublicArea; accent: string }) {
  return (
    <header className="sticky top-0 z-40 -mx-5 flex items-start justify-between gap-4 border-b border-white/12 bg-[#050707]/88 px-5 py-4 backdrop-blur-xl sm:-mx-8 sm:px-8 lg:-mx-10 lg:px-10">
      <Link href="/" className="group border-l py-1 pl-3 pr-4" style={{ borderColor: accent }}>
        <span className="block text-[10px] font-semibold uppercase tracking-[0.22em] text-[#f7f7f4] transition group-hover:text-white">
          Architektur Kosmos
        </span>
        <span className="mt-1 block text-[8px] uppercase tracking-[0.18em] text-[#71807c]">
          Public Atlas / 2026
        </span>
      </Link>

      <nav className="flex max-w-[68vw] flex-wrap justify-end border-y border-white/12" aria-label="Öffentliche Bereiche">
        {items.map((item) => {
          const isActive = item.id === active;
          return (
            <Link
              key={item.id}
              href={item.href}
              aria-current={isActive ? 'page' : undefined}
              className="border-l border-white/10 px-3 py-2.5 text-[9px] font-semibold uppercase tracking-[0.15em] transition first:border-l-0 sm:px-4 sm:text-[10px]"
              style={{
                color: isActive ? accent : '#aeb8b2',
                background: isActive ? `${accent}12` : 'transparent'
              }}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>
    </header>
  );
}
