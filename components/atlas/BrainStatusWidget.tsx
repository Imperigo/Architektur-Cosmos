'use client';

import { useEffect, useState } from 'react';

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

type TaskResponse = {
  count: number;
  results: BrainTask[];
};

export function BrainStatusWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [status, setStatus] = useState<BrainStatus | null>(null);
  const [tasks, setTasks] = useState<BrainTask[]>([]);
  const [error, setError] = useState<string | null>(null);
  const isLoading = isOpen && !status && !error;

  useEffect(() => {
    if (!isOpen || status) return;

    let cancelled = false;

    Promise.all([
      fetch('/api/brain/status').then((response) => {
        if (!response.ok) throw new Error(`Status ${response.status}`);
        return response.json() as Promise<BrainStatus>;
      }),
      fetch('/api/brain/tasks?limit=5').then((response) => {
        if (!response.ok) throw new Error(`Tasks ${response.status}`);
        return response.json() as Promise<TaskResponse>;
      })
    ])
      .then(([nextStatus, taskResponse]) => {
        if (cancelled) return;
        setStatus(nextStatus);
        setTasks(taskResponse.results);
      })
      .catch((nextError: Error) => {
        if (cancelled) return;
        setError(nextError.message);
      });

    return () => {
      cancelled = true;
    };
  }, [isOpen, status]);

  return (
    <div className="brain-status">
      <button
        type="button"
        className={`brain-status-trigger cosmos-trigger ${isOpen ? 'cosmos-trigger-active' : ''}`}
        onClick={() => setIsOpen((current) => !current)}
        aria-expanded={isOpen}
      >
        <span>Brain</span>
      </button>

      {isOpen ? (
        <section className="brain-status-panel cosmos-panel cosmos-text-safe" aria-label="Architecture Cosmos Brain status">
          <div className="brain-status-header">
            <span>Cloud Brain V2</span>
            <button type="button" onClick={() => setIsOpen(false)} aria-label="Close Brain status">Close</button>
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
              </div>

              <div className="brain-status-guard">
                <span>{status.writes_database || status.publishes ? 'ACTION GATED' : 'READ ONLY'}</span>
                <small>No database writes, no publish, approval required.</small>
              </div>

              {status.highest_priority_task ? (
                <div className="brain-status-priority">
                  <small>Highest priority</small>
                  <strong>{status.highest_priority_task.title}</strong>
                </div>
              ) : null}

              <div className="brain-status-tasks">
                {tasks.map((task) => (
                  <div key={task.id} className="brain-status-task">
                    <span>{task.kind}</span>
                    <strong>{task.title}</strong>
                    <small>P{task.priority} / {task.risk_level}</small>
                  </div>
                ))}
              </div>
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
