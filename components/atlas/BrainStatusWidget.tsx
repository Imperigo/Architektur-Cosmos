'use client';

import { X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

type BrainStatus = {
  status: string;
  mode: string;
  writes_database: boolean;
  publishes: boolean;
  summary: {
    entries: number;
    relations: number;
    database_profiles: number;
    model_ready_or_planned: number;
    analysis_ready_or_planned: number;
    broken_relations: number;
  };
  coverage: {
    database_profile_percent: number;
    model_percent: number;
    analysis_percent: number;
    source_candidate_percent: number;
    hero_image_percent?: number;
  };
  open_tasks: number;
  highest_priority_task: {
    title: string;
    priority: number;
    risk_level: string;
  } | null;
};

type BrainTask = {
  id: string;
  title: string;
  kind: string;
  priority: number;
  risk_level: string;
};

type BrainActivation = {
  official_status: string;
  current_phase: string;
  next_recommended_action: string;
  phases: Array<{
    id: string;
    label: string;
    status: string;
    description: string;
  }>;
};

type TaskResponse = {
  count: number;
  results: BrainTask[];
};

const taskFilterLabels: Record<TaskFilter, string> = {
  all: 'Alle',
  research: 'Recherche',
  media: 'Medien',
  rights: 'Rechte',
  model: 'Modell',
  analysis: 'Analyse',
  database: 'Daten'
};

type TaskFilter = 'all' | 'research' | 'media' | 'rights' | 'model' | 'analysis' | 'database';

export function BrainStatusWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [status, setStatus] = useState<BrainStatus | null>(null);
  const [activation, setActivation] = useState<BrainActivation | null>(null);
  const [tasks, setTasks] = useState<BrainTask[]>([]);
  const [taskCount, setTaskCount] = useState(0);
  const [taskFilter, setTaskFilter] = useState<TaskFilter>('all');
  const [error, setError] = useState<string | null>(null);
  const isOpenRef = useRef(false);
  const historyRef = useRef(false);
  const isLoading = isOpen && !status && !error;

  useEffect(() => {
    isOpenRef.current = isOpen;
  }, [isOpen]);

  useEffect(() => {
    const handlePopState = () => {
      if (!isOpenRef.current || !historyRef.current) return;
      historyRef.current = false;
      setIsOpen(false);
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      const shouldDismiss = event.key === 'Escape' || (event.key === 'Backspace' && !isEditableKeyboardTarget(event.target));
      if (!shouldDismiss || !isOpenRef.current) return;
      event.preventDefault();
      closePanel();
    };

    window.addEventListener('popstate', handlePopState);
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('popstate', handlePopState);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  function openPanel() {
    if (!isOpenRef.current) {
      const currentState = typeof window.history.state === 'object' && window.history.state !== null ? window.history.state : {};
      if (currentState.cosmosOverlay !== 'brain') {
        window.history.pushState({ ...currentState, cosmosOverlay: 'brain' }, '', window.location.href);
      }
      historyRef.current = true;
    }

    setIsOpen(true);
  }

  function closePanel() {
    if (historyRef.current) {
      window.history.back();
      return;
    }

    historyRef.current = false;
    setIsOpen(false);
  }

  function togglePanel() {
    if (isOpenRef.current) {
      closePanel();
      return;
    }

    openPanel();
  }

  useEffect(() => {
    if (!isOpen) return;

    let cancelled = false;
    const query = taskFilter === 'all' ? 'limit=5' : `limit=5&kind=${taskFilter}`;

    Promise.all([
      fetch('/api/brain/status').then((response) => {
        if (!response.ok) throw new Error(`Status ${response.status}`);
        return response.json() as Promise<BrainStatus>;
      }),
      fetch('/api/brain/activation').then((response) => {
        if (!response.ok) throw new Error(`Activation ${response.status}`);
        return response.json() as Promise<BrainActivation>;
      }),
      fetch(`/api/brain/tasks?${query}`).then((response) => {
        if (!response.ok) throw new Error(`Tasks ${response.status}`);
        return response.json() as Promise<TaskResponse>;
      })
    ])
      .then(([nextStatus, nextActivation, taskResponse]) => {
        if (cancelled) return;
        setStatus(nextStatus);
        setActivation(nextActivation);
        setTasks(taskResponse.results);
        setTaskCount(taskResponse.count);
        setError(null);
      })
      .catch((nextError: Error) => {
        if (cancelled) return;
        setError(nextError.message);
      });

    return () => {
      cancelled = true;
    };
  }, [isOpen, taskFilter]);

  return (
    <div className="brain-status">
      <button
        type="button"
        className={`brain-status-trigger cosmos-trigger ${isOpen ? 'cosmos-trigger-active' : ''}`}
        onClick={togglePanel}
        aria-expanded={isOpen}
      >
        <span>Brain</span>
      </button>

      {isOpen ? (
        <section className="brain-status-panel cosmos-panel cosmos-text-safe" aria-label="Architektur-Kosmos Brain-Status">
          <div className="brain-status-header">
            <span>Cloud Brain V2</span>
            <button type="button" onClick={closePanel} aria-label="Brain-Status schliessen">
              <X aria-hidden="true" />
              <span>Schliessen</span>
            </button>
          </div>

          {isLoading ? <p className="brain-status-muted">Live-Brain-Snapshot wird gelesen...</p> : null}
          {error ? <p className="brain-status-error">Brain-API nicht verfügbar: {error}</p> : null}

          {status ? (
            <>
              <div className="brain-status-grid">
                <BrainMetric label="Status" value={status.status} />
                <BrainMetric label="Modus" value={status.mode.replace(/_/g, ' ')} />
                <BrainMetric label="Einträge" value={String(status.summary.entries)} />
                <BrainMetric label="Aufgaben" value={String(status.open_tasks)} />
              </div>

              <div className="brain-status-bars">
                <BrainBar label="Profile" value={status.coverage.database_profile_percent} />
                <BrainBar label="Modelle" value={status.coverage.model_percent} />
                <BrainBar label="Analyse" value={status.coverage.analysis_percent} />
                <BrainBar label="Quellen" value={status.coverage.source_candidate_percent} />
                <BrainBar label="Hauptbilder" value={status.coverage.hero_image_percent ?? 0} />
              </div>

              <div className="brain-status-guard">
                <span>{status.writes_database || status.publishes ? 'FREIGABE NÖTIG' : 'NUR LESEN'}</span>
                <small>Keine Datenbank-Schreibvorgänge, kein Publish ohne Freigabe.</small>
              </div>

              {activation ? (
                <div className="brain-activation-card">
                  <small>Offizielle Aktivierung</small>
                  <strong>{activation.official_status.replace(/_/g, ' ')}</strong>
                  <span>{activation.current_phase.replace(/_/g, ' ')}</span>
                </div>
              ) : null}

              {status.highest_priority_task ? (
                <div className="brain-status-priority">
                  <small>Höchste Priorität</small>
                  <strong>{status.highest_priority_task.title}</strong>
                </div>
              ) : null}

              <div className="brain-task-toolbar" aria-label="Brain-Aufgaben filtern">
                {(['all', 'research', 'media', 'rights', 'model', 'analysis', 'database'] as const).map((filter) => (
                  <button
                    key={filter}
                    type="button"
                    className={taskFilter === filter ? 'brain-task-filter-active' : ''}
                    onClick={() => setTaskFilter(filter)}
                  >
                    {taskFilterLabels[filter]}
                  </button>
                ))}
              </div>

              <div className="brain-status-tasks">
                <div className="brain-task-count">{taskCount} passende Aufgaben</div>
                {tasks.map((task) => (
                  <div key={task.id} className="brain-status-task">
                    <span>{task.kind}</span>
                    <strong>{task.title}</strong>
                    <small>P{task.priority} / {task.risk_level}</small>
                  </div>
                ))}
              </div>

              {activation ? (
                <div className="brain-next-action">
                  <small>Nächste Freigabe-Aktion</small>
                  <span>{activation.next_recommended_action}</span>
                </div>
              ) : null}
            </>
          ) : null}
        </section>
      ) : null}
    </div>
  );
}

function BrainMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="brain-status-metric">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function BrainBar({ label, value }: { label: string; value: number }) {
  return (
    <div className="brain-status-bar">
      <div>
        <span>{label}</span>
        <small>{value}%</small>
      </div>
      <i style={{ width: `${Math.max(2, Math.min(100, value))}%` }} />
    </div>
  );
}

function isEditableKeyboardTarget(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) return false;
  return Boolean(target.closest('input, textarea, select, [contenteditable="true"]'));
}
