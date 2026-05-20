'use client';

import Link from 'next/link';
import { useMemo, useRef, useState, type KeyboardEvent } from 'react';
import type { Entry } from '@/lib/types';
import { formatYear } from '@/lib/wormhole-layout';

type ProjectSearchProps = {
  entries: Entry[];
  currentSlug?: string;
  variant?: 'atlas' | 'entry';
  developerMode?: boolean;
  onDeveloperModeChange?: (enabled: boolean) => void;
};

const MAX_RESULTS = 8;
const DEV_SESSION_KEY = 'architecture-cosmos-dev-mode';
const DEV_ACCESS_CODES = new Set(['COSMOS-DEV', 'ARCHIVE-DEV']);

export function ProjectSearch({
  entries,
  currentSlug,
  variant = currentSlug ? 'entry' : 'atlas',
  developerMode,
  onDeveloperModeChange
}: ProjectSearchProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isDevOpen, setIsDevOpen] = useState(false);
  const [localDeveloperMode, setLocalDeveloperMode] = useState(readDevSession);
  const [devCode, setDevCode] = useState('');
  const [devError, setDevError] = useState('');
  const [query, setQuery] = useState('');
  const inputRef = useRef<HTMLInputElement | null>(null);
  const devInputRef = useRef<HTMLInputElement | null>(null);
  const isDeveloperMode = developerMode ?? localDeveloperMode;

  const results = useMemo(() => {
    const normalizedQuery = normalize(query);

    if (!normalizedQuery) {
      return [...entries]
        .sort((a, b) => Math.abs(b.year_start - 1930) - Math.abs(a.year_start - 1930))
        .slice(0, MAX_RESULTS);
    }

    return entries
      .map((entry) => ({ entry, score: scoreEntry(entry, normalizedQuery) }))
      .filter((result) => result.score > 0)
      .sort((a, b) => b.score - a.score || a.entry.year_start - b.entry.year_start)
      .slice(0, MAX_RESULTS)
      .map((result) => result.entry);
  }, [entries, query]);

  function openSearch() {
    setIsOpen(true);
    window.setTimeout(() => inputRef.current?.focus(), 40);
  }

  function toggleSearch() {
    if (isOpen) {
      setIsOpen(false);
      setQuery('');
      return;
    }

    setIsDevOpen(false);
    openSearch();
  }

  function setDevMode(enabled: boolean) {
    setLocalDeveloperMode(enabled);
    onDeveloperModeChange?.(enabled);
    try {
      if (enabled) {
        window.sessionStorage.setItem(DEV_SESSION_KEY, 'unlocked');
      } else {
        window.sessionStorage.removeItem(DEV_SESSION_KEY);
      }
    } catch {
      // Session storage can be unavailable in strict private contexts.
    }
  }

  function toggleDevGate() {
    setIsOpen(false);
    setQuery('');
    setIsDevOpen((current) => {
      const next = !current;
      if (next) window.setTimeout(() => devInputRef.current?.focus(), 40);
      return next;
    });
  }

  function unlockDevMode() {
    const normalizedCode = devCode.trim().toUpperCase();
    if (!DEV_ACCESS_CODES.has(normalizedCode)) {
      setDevError('Code nicht korrekt');
      return;
    }

    setDevError('');
    setDevCode('');
    setDevMode(true);
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'Escape') {
      setIsOpen(false);
      setQuery('');
    }
  }

  function handleDevKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'Escape') {
      setIsDevOpen(false);
      setDevError('');
      setDevCode('');
    }

    if (event.key === 'Enter') {
      unlockDevMode();
    }
  }

  return (
    <div
      className={`project-search project-search-${variant} cosmos-text-safe ${isOpen ? 'project-search-open' : ''} ${isDevOpen ? 'project-dev-open' : ''}`}
      onPointerDown={(event) => event.stopPropagation()}
      onWheel={(event) => event.stopPropagation()}
      onTouchMove={(event) => event.stopPropagation()}
      onClick={(event) => event.stopPropagation()}
    >
      <button type="button" className="project-search-trigger cosmos-trigger" onClick={toggleSearch} aria-expanded={isOpen}>
        <span className="project-search-mark" aria-hidden="true" />
        <span>Search</span>
      </button>

      <div className="project-dev-gate" aria-label="Developer access">
        <button
          type="button"
          className={`project-dev-trigger cosmos-trigger ${isDeveloperMode ? 'project-dev-trigger-active' : ''}`}
          onClick={toggleDevGate}
          aria-expanded={isDevOpen}
        >
          <span className="project-dev-mark" aria-hidden="true" />
          <span>{isDeveloperMode ? 'Dev on' : 'Dev'}</span>
        </button>

        {isDevOpen ? (
          <div className="project-dev-panel cosmos-panel" role="dialog" aria-label="Developer access gate">
            {isDeveloperMode ? (
              <>
                <div className="project-dev-title">Developer views unlocked</div>
                <p>Lokale Session-Freischaltung fuer private Copyright- und Draft-Werkzeuge. Keine echte Authentifizierung.</p>
                <button type="button" className="project-dev-action" onClick={() => setDevMode(false)}>
                  Lock again
                </button>
              </>
            ) : (
              <>
                <div className="project-dev-title">Developer access</div>
                <p>Schaltet private Draft-, Intake- und AI-Ansichten nur in dieser Browser-Session frei.</p>
                <div className="project-dev-field">
                  <input
                    ref={devInputRef}
                    value={devCode}
                    onChange={(event) => {
                      setDevCode(event.target.value);
                      setDevError('');
                    }}
                    onKeyDown={handleDevKeyDown}
                    placeholder="Code"
                    aria-label="Developer code"
                    type="password"
                  />
                  <button type="button" onClick={unlockDevMode}>
                    Unlock
                  </button>
                </div>
                {devError ? <div className="project-dev-error">{devError}</div> : null}
                <div className="project-dev-hint">Local gate only / not public auth</div>
              </>
            )}
          </div>
        ) : null}
      </div>

      {isOpen ? (
        <div className="project-search-panel cosmos-panel cosmos-scroll-panel" role="dialog" aria-label="Project search">
          <div className="project-search-field">
            <input
              ref={inputRef}
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Search projects, authors, cities, themes"
              aria-label="Search projects"
            />
            {query ? (
              <button type="button" className="project-search-clear" onClick={() => setQuery('')} aria-label="Clear search">
                X
              </button>
            ) : null}
          </div>

          <div className="project-search-results">
            {results.length > 0 ? (
              results.map((entry) => (
                <Link
                  key={entry.id}
                  href={`/atlas/${entry.slug}/`}
                  className={`project-search-result ${currentSlug === entry.slug ? 'project-search-result-active' : ''}`}
                  onClick={() => {
                    setIsOpen(false);
                    setQuery('');
                  }}
                >
                  <span className="project-search-result-title">{entry.title}</span>
                  <span className="project-search-result-meta">
                    {formatYear(entry.year_start)} / {[entry.city, entry.country].filter(Boolean).join(', ') || entry.entry_type.replace(/_/g, ' ')}
                  </span>
                </Link>
              ))
            ) : (
              <div className="project-search-empty">No project found</div>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}

function normalize(value: string) {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
}

function readDevSession() {
  if (typeof window === 'undefined') return false;
  try {
    return window.sessionStorage.getItem(DEV_SESSION_KEY) === 'unlocked';
  } catch {
    return false;
  }
}

function scoreEntry(entry: Entry, normalizedQuery: string) {
  const title = normalize(entry.title);
  const author = normalize(entry.authors.join(' '));
  const place = normalize([entry.city, entry.country].filter(Boolean).join(' '));
  const year = String(entry.year_start);
  const themes = normalize(entry.themes.join(' '));
  const type = normalize(entry.entry_type.replace(/_/g, ' '));
  const style = normalize(entry.style_sector.replace(/_/g, ' '));

  let score = 0;
  if (title === normalizedQuery) score += 100;
  if (title.startsWith(normalizedQuery)) score += 50;
  if (title.includes(normalizedQuery)) score += 30;
  if (author.includes(normalizedQuery)) score += 18;
  if (place.includes(normalizedQuery)) score += 16;
  if (themes.includes(normalizedQuery)) score += 12;
  if (style.includes(normalizedQuery)) score += 10;
  if (type.includes(normalizedQuery)) score += 8;
  if (year.includes(normalizedQuery)) score += 8;

  return score;
}
