'use client';

import Link from 'next/link';
import { Boxes, CircleGauge, Home, LibraryBig, Menu, Orbit, X } from 'lucide-react';
import { useState } from 'react';

export type PublicArea = 'home' | 'references' | 'assets' | 'atlas' | 'orbit';

const items = [
  { id: 'home' as const, label: 'Start', href: '/', icon: Home },
  { id: 'references' as const, label: 'Referenzen', href: '/references/', icon: LibraryBig },
  { id: 'assets' as const, label: 'Assets', href: '/assets/', icon: Boxes },
  { id: 'atlas' as const, label: 'Atlas', href: '/atlas/', icon: Orbit },
  { id: 'orbit' as const, label: 'Status', href: '/orbit/', icon: CircleGauge }
];

type PublicSiteHeaderProps = {
  active: PublicArea;
  fixed?: boolean;
  context?: string;
};

export function PublicSiteHeader({
  active,
  fixed = false,
  context = 'Architecture Cosmos'
}: PublicSiteHeaderProps) {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <header className={`ak-site-header ${fixed ? 'ak-site-header-fixed' : ''}`}>
      <Link href="/" className="ak-site-brand" aria-label="Architekturkosmos Startseite">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img className="ak-site-mark" src="/ak-symbol.svg" alt="" aria-hidden="true" />
        <span className="ak-site-brand-copy">
          <span className="ak-site-wordmark">Architekturkosmos</span>
          <span className="ak-site-context">{context}</span>
        </span>
      </Link>

      <nav className="ak-site-nav" aria-label="Hauptnavigation">
        {items.map((item) => {
          const Icon = item.icon;
          return (
            <Link
              key={item.id}
              href={item.href}
              aria-current={item.id === active ? 'page' : undefined}
              className="ak-site-nav-link"
              title={item.label}
            >
              <Icon aria-hidden="true" />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      <button
        type="button"
        className="ak-mobile-menu-button"
        aria-label={menuOpen ? 'Navigation schliessen' : 'Navigation öffnen'}
        aria-expanded={menuOpen}
        onClick={() => setMenuOpen((current) => !current)}
      >
        {menuOpen ? <X aria-hidden="true" /> : <Menu aria-hidden="true" />}
      </button>

      <nav
        className={`ak-mobile-panel ${menuOpen ? 'ak-mobile-panel-open' : ''}`}
        aria-label="Mobile Hauptnavigation"
      >
        {items.map((item) => {
          const Icon = item.icon;
          return (
            <Link
              key={item.id}
              href={item.href}
              aria-current={item.id === active ? 'page' : undefined}
              className="ak-site-nav-link"
              onClick={() => setMenuOpen(false)}
            >
              <Icon aria-hidden="true" />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </header>
  );
}
