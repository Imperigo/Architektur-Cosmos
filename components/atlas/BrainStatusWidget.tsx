'use client';

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
        <section className="brain-status-panel cosmos-panel cosmos-text-safe" aria-label="Architecture Cosmos Brain status">
          <div className="brain-status-header">
            <span>Cloud Brain V2</span>
            <button type="button" onClick={closePanel} aria-label="Close Brain status">Close</button>
          </div>

          {isLoading ? <p className="brain-status-muted">Reading live Brain snapshot...</p> : null}
          {error ? <p className="brain-status-error">Brain API not available: {error}</p> : null}

          {status ? (
            <>
              <div className="brain-status-grid">
                <BrainMetric label="Status" value={status.status} />
                <BrainMetric label="Mode" value={status.mode.replace(/_/g, ' ')} />
                <BrainMetric label="Entries" value={String(status.summary.entries)} />
                <BrainMetric label="Tasks" value={String(status.open_tasks)} />
              </div>

              <div className="brain-status-bars">
                <BrainBar label="Profiles" value={status.coverage.database_profile_percent} />
                <BrainBar label="Models" value={status.coverage.model_percent} />
                <BrainBar label="Analysis" value={status.coverage.analysis_percent} />
                <BrainBar label="Sources" value={status.coverage.source_candidate_percent} />
                <BrainBar label="Hero images" value={status.coverage.hero_image_percent ?? 0} />
              </div>

              <div className="brain-status-guard">
                <span>{status.writes_database || status.publishes ? 'ACTION GATED' : 'READ ONLY'}</span>
                <small>No database writes, no publish, approval required.</small>
              </div>

              {activation ? (
                <div className="brain-activation-card">
                  <small>Official activation</small>
                  <strong>{activation.official_status.replace(/_/g, ' ')}</strong>
                  <span>{activation.current_phase.replace(/_/g, ' ')}</span>
                </div>
              ) : null}

              {status.highest_priority_task ? (
                <div className="brain-status-priority">
                  <small>Highest priority</small>
                  <strong>{status.highest_priority_task.title}</strong>
                </div>
              ) : null}

              <div className="brain-task-toolbar" aria-label="Brain task filters">
                {(['all', 'research', 'media', 'rights', 'model', 'analysis', 'database'] as const).map((filter) => (
                  <button
                    key={filter}
                    type="button"
                    className={taskFilter === filter ? 'brain-task-filter-active' : ''}
                    onClick={() => setTaskFilter(filter)}
                  >
                    {filter}
                  </button>
                ))}
              </div>

              <div className="brain-status-tasks">
                <div className="brain-task-count">{taskCount} matching tasks</div>
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
                  <small>Next gated action</small>
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
