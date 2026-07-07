import { useEffect, useRef, useState } from 'react';
import { Badge, Hairline, KButton, KLade, Measure, Messrahmen, Panel, bestaetigen, melde, meldeFehler, moduleHue } from '@kosmo/ui';
import {
  alsWorkorderMd,
  auftragErfassen,
  listeAuftraege,
  loescheAuftrag,
  offeneDevJobs,
  pruefeDevJobs,
  setzeAuftragStatus,
  uebergebeWorkorder,
  type Auftrag,
  type DevJobPruefung,
} from '../../state/auftragsbuch';
import { bridgeVermutlichCspGeblockt, istAuthFehler } from '../vis/vis-jobs';
import { useProject } from '../../state/project-store';

/**
 * KosmoDev (V1-Finish P3) — das Auftragsbuch: «Verbesserungen sprechen».
 * Wünsche landen hier aus dem Kosmo-Panel (⚑, @kosmodev-Tool, Sprache)
 * oder werden direkt erfasst; der Export erzeugt die Fable-Workorder als
 * Markdown für docs/auftraege/ — der Auftrag an den nächsten Worker.
 *
 * V2-Technik Block 2 / AB3 (Buildplan E4): daneben schliesst «An HomeStation
 * übergeben» den Kreis über die Bridge (Job-Typ `dev-`) — der Download-Export
 * bleibt unverändert der Offline-Fallback (Buildplan Abnahme-Kriterium 5).
 */

/** Ehrliche Statuszeile je gemerktem Dev-Job (Buildplan E5: `queued` heisst
 * ehrlich «wartet auf Worker», nie ein vorgetäuschter Fortschritt). Auch
 * Fehlzustände des Polls sind ein Eintrag (Fable-Auflage AB3-1 — dieselbe
 * Lehre wie Block-1-KLEIN-8: Offline/401 nie still verschlucken). */
function devJobLabel(p: DevJobPruefung): string {
  if (!p.job) {
    switch (p.problem) {
      case 'auth':
        return 'Bridge lehnt ab — Token fehlt oder ist falsch (Status unbekannt)';
      case 'offline':
        return 'Bridge nicht erreichbar — Status unbekannt (Offline)';
      case 'vertrag':
        return 'Bridge-Antwort passt nicht zum Dev-Job-Vertrag';
      default:
        return 'Status unbekannt (Bridge-Fehler)';
    }
  }
  const job = p.job;
  switch (job.status) {
    case 'queued':
      return 'wartet auf Worker — an der HomeStation Claude Code andocken';
    case 'running':
      return `Worker ${job.worker ?? '?'} arbeitet …`;
    case 'done':
      return 'erledigt';
    case 'cancelled':
      return 'abgebrochen';
    case 'error':
      return job.message ?? 'Fehler bei der HomeStation';
    default:
      return job.status;
  }
}

const QUELLE_LABEL: Record<Auftrag['quelle'], string> = {
  gesprochen: '🎙 gesprochen',
  getippt: '⌨ getippt',
  kosmo: '◉ via Kosmo',
};

const STATUS_HUE: Record<Auftrag['status'], string> = {
  offen: 'var(--k-warning)',
  'an-worker': 'var(--k-info)',
  erledigt: 'var(--k-success)',
};

export function DevWorkspace() {
  const [auftraege, setAuftraege] = useState<Auftrag[] | null>(null);
  const [text, setText] = useState('');
  const [devJobs, setDevJobs] = useState<DevJobPruefung[]>([]);
  const [uebergebend, setUebergebend] = useState(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const laden = () => {
    void listeAuftraege()
      .then(setAuftraege)
      .catch((err) => {
        setAuftraege([]);
        meldeFehler(err);
      });
  };
  useEffect(laden, []);

  // Dev-Job-Poll (Buildplan E4): kein Dauer-Poll — der Interval läuft NUR,
  // solange mindestens ein Dev-Job gemerkt ist, und baut sich danach wieder ab.
  const stopPoll = () => {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  };
  const pollDevJobs = () => {
    void pruefeDevJobs().then((ergebnisse) => {
      if (offeneDevJobs().length === 0) {
        stopPoll();
        setDevJobs([]);
      } else {
        setDevJobs(ergebnisse);
      }
      if (ergebnisse.some((e) => e.angewendet > 0)) laden();
    });
  };
  const startPollWennNoetig = () => {
    if (pollRef.current || offeneDevJobs().length === 0) return;
    pollDevJobs();
    pollRef.current = setInterval(pollDevJobs, 2500);
  };
  useEffect(() => {
    startPollWennNoetig();
    return stopPoll;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const erfassen = () => {
    const t = text.trim();
    if (!t) return;
    void auftragErfassen(t, 'getippt')
      .then(() => {
        setText('');
        laden();
        melde('Auftrag im Buch', { ton: 'erfolg' });
      })
      .catch((err) => meldeFehler(err));
  };

  const exportieren = () => {
    const datum = new Date().toISOString().slice(0, 10);
    const projekt = useProject.getState().doc.settings.projectName;
    const md = alsWorkorderMd(auftraege ?? [], datum, projekt);
    const url = URL.createObjectURL(new Blob([md], { type: 'text/markdown' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = `${datum}.md`;
    a.click();
    URL.revokeObjectURL(url);
    // Exportierte Aufträge wandern auf «an-worker» — Toast erst nach dem Schreiben
    void Promise.all(
      (auftraege ?? []).filter((x) => x.status === 'offen').map((x) => setzeAuftragStatus(x.id, 'an-worker')),
    )
      .then(() => {
        laden();
        melde('Workorder exportiert — Datei nach docs/auftraege/ legen und dem Worker geben', { ton: 'erfolg' });
      })
      .catch((err) => meldeFehler(err));
  };

  // «An HomeStation übergeben» (Buildplan E4): schickt die offenen Aufträge
  // per Bridge-Job los; ehrliche Fehlzustände wie in KosmoVis (NodeCanvas.tsx)
  // — Offline/CSP-LAN-IP/Auth werden benannt statt als kryptischer Fehler.
  const uebergeben = () => {
    const projekt = useProject.getState().doc.settings.projectName;
    setUebergebend(true);
    void uebergebeWorkorder(projekt)
      .then((job) => {
        melde(`Workorder an die HomeStation übergeben — Job ${job.job_id}`, { ton: 'erfolg' });
        laden();
        startPollWennNoetig();
      })
      .catch((err) => {
        if (err instanceof TypeError && bridgeVermutlichCspGeblockt()) {
          melde('Bridge-Adresse ist eine LAN-IP, die die CSP nicht erlaubt (nur localhost/127.0.0.1)', { ton: 'fehler' });
        } else if (err instanceof TypeError) {
          melde('Bridge nicht erreichbar — läuft die HomeStation-Bridge? (Offline)', { ton: 'fehler' });
        } else if (istAuthFehler(err)) {
          melde('Bridge lehnt ab — Token fehlt oder ist falsch', { ton: 'fehler' });
        } else {
          meldeFehler(err);
        }
      })
      .finally(() => setUebergebend(false));
  };

  const offene = (auftraege ?? []).filter((a) => a.status === 'offen').length;

  return (
    <div className="k-einblenden" style={{ position: 'absolute', inset: 0, overflow: 'auto', padding: 20 }}>
      <div style={{ maxWidth: 880, margin: '0 auto', display: 'grid', gap: 14 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <Badge hue={moduleHue.dev}>KosmoDev</Badge>
          <span style={{ color: 'var(--k-ink-soft)', fontSize: 13 }}>
            Auftragsbuch — {offene} offen
          </span>
          <div style={{ flex: 1 }} />
          <KButton
            size="sm"
            tone="accent"
            onClick={uebergeben}
            data-testid="workorder-uebergeben"
            disabled={offene === 0 || uebergebend}
          >
            ↥ An HomeStation übergeben
          </KButton>
          <KButton size="sm" tone="accent" onClick={exportieren} data-testid="workorder-export" disabled={offene === 0}>
            ⇥ Fable-Workorder (.md)
          </KButton>
        </div>

        {devJobs.length > 0 && (
          <Panel data-testid="dev-job-status" style={{ display: 'grid', gap: 4, padding: '8px 14px' }}>
            {devJobs.map((p) => (
              <div key={p.jobId} style={{ display: 'flex', gap: 8, alignItems: 'center', fontSize: 12.5 }}>
                <Badge hue={p.problem ? 'var(--k-warning)' : 'var(--k-info)'}>{p.jobId}</Badge>
                <span style={{ color: 'var(--k-ink-soft)' }}>{devJobLabel(p)}</span>
              </div>
            ))}
          </Panel>
        )}

        <Panel style={{ display: 'grid', gap: 8 }}>
          <span style={{ fontSize: 12.5, color: 'var(--k-ink-soft)' }}>
            Verbesserung erfassen — oder im Kosmo-Panel «⚑» drücken bzw. @kosmodev sagen,
            was besser werden soll (Kosmo strukturiert Gesprochenes selbst ins Buch).
          </span>
          <div style={{ display: 'flex', gap: 8 }}>
            <input
              data-testid="auftrag-text"
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && erfassen()}
              placeholder="z.B. «Im Grundriss sollen Türanschläge wählbar sein — Werkzeugleiste Design»"
              style={{
                flex: 1,
                padding: '7px 10px',
                borderRadius: 'var(--k-radius-sm)',
                border: '1px solid var(--k-line-strong)',
                background: 'var(--k-raised)',
                fontSize: 13,
              }}
            />
            <KButton size="sm" tone="quiet" onClick={erfassen} data-testid="auftrag-erfassen">
              ⚑ Erfassen
            </KButton>
          </div>
        </Panel>

        {auftraege === null && <KLade text="Auftragsbuch laden …" height={160} />}
        {auftraege !== null && auftraege.length === 0 && (
          <Messrahmen height={220} caption="Das Buch ist leer — jede erfasste Verbesserung erscheint hier" />
        )}
        <div style={{ display: 'grid', gap: 8 }}>
          {(auftraege ?? []).map((a) => (
            <Panel key={a.id} style={{ display: 'grid', gap: 6, padding: '10px 14px' }} data-testid="auftrag-karte">
              <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
                <Badge hue={STATUS_HUE[a.status]}>{a.status}</Badge>
                <Badge hue="var(--k-ink-faint)">{a.station}</Badge>
                <span style={{ fontSize: 11, color: 'var(--k-ink-faint)' }}>{QUELLE_LABEL[a.quelle]}</span>
                <div style={{ flex: 1 }} />
                <Measure>{new Date(a.ts).toLocaleString('de-CH')}</Measure>
              </div>
              <div style={{ fontSize: 13.5 }}>{a.text}</div>
              {a.ort && <div style={{ fontSize: 12, color: 'var(--k-ink-soft)' }}>wo: {a.ort}</div>}
              {a.ergebnis && (
                <div
                  data-testid="auftrag-ergebnis"
                  style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', fontSize: 12 }}
                >
                  <Badge hue="var(--k-success)">
                    {a.ergebnis.worker}
                    {a.ergebnis.worker === 'fake-worker' ? ' · Simulation' : ''}
                  </Badge>
                  {a.ergebnis.commit && (
                    <span style={{ fontFamily: 'var(--k-font-mono)', color: 'var(--k-ink-soft)' }}>
                      Commit {a.ergebnis.commit}
                    </span>
                  )}
                  {a.ergebnis.notiz && <span style={{ color: 'var(--k-ink-soft)' }}>{a.ergebnis.notiz}</span>}
                </div>
              )}
              <Hairline />
              <div style={{ display: 'flex', gap: 6 }}>
                {(['offen', 'an-worker', 'erledigt'] as const).map((s) => (
                  <KButton
                    key={s}
                    size="sm"
                    tone={a.status === s ? 'accent' : 'ghost'}
                    onClick={() => void setzeAuftragStatus(a.id, s).then(laden)}
                  >
                    {s}
                  </KButton>
                ))}
                <div style={{ flex: 1 }} />
                <KButton
                  size="sm"
                  tone="ghost"
                  aria-label="Auftrag löschen"
                  onClick={() => {
                    void bestaetigen({ titel: 'Auftrag löschen?', gefaehrlich: true, bestaetigen: 'Löschen' }).then(
                      (ok) => { if (ok) void loescheAuftrag(a.id).then(laden); },
                    );
                  }}
                >
                  ✕
                </KButton>
              </div>
            </Panel>
          ))}
        </div>
      </div>
    </div>
  );
}
