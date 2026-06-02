'use client';

import Link from 'next/link';
import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from 'react';
import type { Entry } from '@/lib/types';
import { formatYear } from '@/lib/wormhole-layout';

type ProjectSearchProps = {
  entries: Entry[];
  currentSlug?: string;
  variant?: 'atlas' | 'entry';
  developerMode?: boolean;
  onDeveloperModeChange?: (_enabled: boolean) => void;
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
  const isOpenRef = useRef(false);
  const isDevOpenRef = useRef(false);
  const searchHistoryRef = useRef(false);
  const devHistoryRef = useRef(false);
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

  useEffect(() => {
    isOpenRef.current = isOpen;
  }, [isOpen]);

  useEffect(() => {
    isDevOpenRef.current = isDevOpen;
  }, [isDevOpen]);

  useEffect(() => {
    const closeSearchFromWindow = () => {
      const currentState = typeof window.history.state === 'object' && window.history.state !== null ? window.history.state : {};
      if (currentState.cosmosOverlay === 'search') {
        const { cosmosOverlay: _cosmosOverlay, ...rest } = currentState;
        window.history.replaceState(rest, '', window.location.href);
      }
      searchHistoryRef.current = false;
      setIsOpen(false);
      setQuery('');
    };

    const closeDevGateFromWindow = () => {
      const currentState = typeof window.history.state === 'object' && window.history.state !== null ? window.history.state : {};
      if (currentState.cosmosOverlay === 'dev') {
        const { cosmosOverlay: _cosmosOverlay, ...rest } = currentState;
        window.history.replaceState(rest, '', window.location.href);
      }
      devHistoryRef.current = false;
      setIsDevOpen(false);
      setDevError('');
      setDevCode('');
    };

    const handlePopState = () => {
      if (isOpenRef.current && searchHistoryRef.current) {
        searchHistoryRef.current = false;
        setIsOpen(false);
        setQuery('');
        return;
      }

      if (isDevOpenRef.current && devHistoryRef.current) {
        devHistoryRef.current = false;
        setIsDevOpen(false);
        setDevError('');
        setDevCode('');
      }
    };

    const handleWindowPointerDown = (event: globalThis.PointerEvent) => {
      if (!(isOpenRef.current || isDevOpenRef.current)) return;
      if (event.target instanceof Element && event.target.closest('.project-search')) return;

      if (isOpenRef.current) {
        closeSearchFromWindow();
        return;
      }

      if (isDevOpenRef.current) {
        closeDevGateFromWindow();
      }
    };

    const handleWindowKeyDown = (event: globalThis.KeyboardEvent) => {
      const shouldDismiss = event.key === 'Escape' || (event.key === 'Backspace' && !isEditableKeyboardTarget(event.target));
      if (!shouldDismiss) return;
      if (isOpenRef.current) {
        event.preventDefault();
        event.stopImmediatePropagation();
        closeSearchFromWindow();
        return;
      }
      if (isDevOpenRef.current) {
        event.preventDefault();
        event.stopImmediatePropagation();
        closeDevGateFromWindow();
      }
    };

    window.addEventListener('popstate', handlePopState);
    window.addEventListener('pointerdown', handleWindowPointerDown, true);
    window.addEventListener('keydown', handleWindowKeyDown);

    return () => {
      window.removeEventListener('popstate', handlePopState);
      window.removeEventListener('pointerdown', handleWindowPointerDown, true);
      window.removeEventListener('keydown', handleWindowKeyDown);
    };
  }, []);

  function openSearch() {
    if (!isOpenRef.current) {
      pushOverlayHistory('search');
      searchHistoryRef.current = true;
    }
    setIsOpen(true);
    window.setTimeout(() => inputRef.current?.focus(), 40);
  }

  function closeSearch() {
    clearOverlayHistory('search');
    searchHistoryRef.current = false;
    setIsOpen(false);
    setQuery('');
  }

  function toggleSearch() {
    if (isOpen) {
      closeSearch();
      return;
    }

    devHistoryRef.current = false;
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
    searchHistoryRef.current = false;
    setIsOpen(false);
    setQuery('');
    if (isDevOpenRef.current) {
      closeDevGate();
      return;
    }

    pushOverlayHistory('dev');
    devHistoryRef.current = true;
    setIsDevOpen(true);
    window.setTimeout(() => devInputRef.current?.focus(), 40);
  }

  function closeDevGate() {
    clearOverlayHistory('dev');
    devHistoryRef.current = false;
    setIsDevOpen(false);
    setDevError('');
    setDevCode('');
  }

  function pushOverlayHistory(name: 'search' | 'dev') {
    const currentState = typeof window.history.state === 'object' && window.history.state !== null ? window.history.state : {};
    if (currentState.cosmosOverlay === name) return;
    window.history.pushState({ ...currentState, cosmosOverlay: name }, '', window.location.href);
  }

  function clearOverlayHistory(name: 'search' | 'dev') {
    const currentState = typeof window.history.state === 'object' && window.history.state !== null ? window.history.state : {};
    if (currentState.cosmosOverlay !== name) return;
    const { cosmosOverlay: _cosmosOverlay, ...rest } = currentState;
    window.history.replaceState(rest, '', window.location.href);
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
      event.stopPropagation();
      event.preventDefault();
      closeSearch();
    }
  }

  function handleDevKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'Escape') {
      event.stopPropagation();
      event.preventDefault();
      closeDevGate();
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
      <button
        type="button"
        className="project-search-trigger cosmos-trigger"
        data-ui-action="search"
        onClick={toggleSearch}
        aria-expanded={isOpen}
        aria-label={isOpen ? 'Suche schließen' : 'Suche öffnen'}
      >
        <span className="project-search-mark" aria-hidden="true" />
        <span>Suche</span>
      </button>

      <div className="project-dev-gate" aria-label="Developer-Zugang">
        <button
          type="button"
          className={`project-dev-trigger cosmos-trigger ${isDeveloperMode ? 'project-dev-trigger-active' : ''}`}
          onClick={toggleDevGate}
          aria-expanded={isDevOpen}
          aria-label={isDevOpen ? 'Dev Access schließen' : 'Dev Access öffnen'}
        >
          <span className="project-dev-mark" aria-hidden="true" />
          <span>{isDeveloperMode ? 'Dev on' : 'Dev'}</span>
        </button>

        {isDevOpen ? (
          <div className="project-dev-panel cosmos-panel" role="dialog" aria-label="Developer-Zugang">
            {isDeveloperMode ? (
              <>
                <div className="project-dev-title">Dev-Ansichten freigeschaltet</div>
                <p>Lokale Session-Freischaltung für private Copyright- und Draft-Werkzeuge. Keine echte Authentifizierung.</p>
                <button type="button" className="project-dev-action" onClick={() => setDevMode(false)}>
                  Wieder sperren
                </button>
              </>
            ) : (
              <>
                <div className="project-dev-title">Dev-Zugang</div>
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
                    aria-label="Dev-Code"
                    type="password"
                  />
                  <button type="button" onClick={unlockDevMode}>
                    Entsperren
                  </button>
                </div>
                {devError ? <div className="project-dev-error">{devError}</div> : null}
                <div className="project-dev-hint">Nur lokale Schranke / keine öffentliche Auth</div>
              </>
            )}
          </div>
        ) : null}
      </div>

      {isOpen ? (
        <div className="project-search-panel cosmos-panel cosmos-scroll-panel" role="dialog" aria-label="Projektsuche">
          <div className="project-search-field">
            <input
              ref={inputRef}
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Projekte, Autorenschaft, Orte, Themen suchen"
              aria-label="Projekte suchen"
            />
            {query ? (
              <button type="button" className="project-search-clear" onClick={() => setQuery('')} aria-label="Suche leeren">
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
                    searchHistoryRef.current = false;
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
              <div className="project-search-empty">Kein Projekt gefunden</div>
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

function isEditableKeyboardTarget(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) return false;
  return Boolean(target.closest('input, textarea, select, [contenteditable="true"]'));
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
