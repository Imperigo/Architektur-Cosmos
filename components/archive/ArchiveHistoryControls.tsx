'use client';

import { useEffect, useState } from 'react';

export function ArchiveHistoryControls() {
  const [historyIndex, setHistoryIndex] = useState(0);

  useEffect(() => {
    const updateIndex = () => setHistoryIndex(window.history.state?.idx ?? 0);
    updateIndex();
    window.addEventListener('popstate', updateIndex);
    return () => window.removeEventListener('popstate', updateIndex);
  }, []);

  function goBack() {
    if (historyIndex > 0) {
      window.history.back();
      return;
    }

    window.location.href = '/atlas/?return=database';
  }

  function goForward() {
    window.history.forward();
  }

  return (
    <nav className="archive-history-controls" aria-label="Datenbank Navigation">
      <button type="button" onClick={goBack} aria-label="Zurück">
        <span>←</span>
        Zurück
      </button>
      <button type="button" onClick={goForward} aria-label="Vorwärts">
        Vorwärts
        <span>→</span>
      </button>
    </nav>
  );
}
