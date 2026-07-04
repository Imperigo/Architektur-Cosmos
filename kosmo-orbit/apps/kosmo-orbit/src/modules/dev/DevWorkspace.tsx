import { useEffect, useState } from 'react';
import { Badge, Hairline, KButton, KLade, Measure, Messrahmen, Panel, bestaetigen, melde, meldeFehler, moduleHue } from '@kosmo/ui';
import {
  alsWorkorderMd,
  auftragErfassen,
  listeAuftraege,
  loescheAuftrag,
  setzeAuftragStatus,
  type Auftrag,
} from '../../state/auftragsbuch';
import { useProject } from '../../state/project-store';

/**
 * KosmoDev (V1-Finish P3) — das Auftragsbuch: «Verbesserungen sprechen».
 * Wünsche landen hier aus dem Kosmo-Panel (⚑, @kosmodev-Tool, Sprache)
 * oder werden direkt erfasst; der Export erzeugt die Fable-Workorder als
 * Markdown für docs/auftraege/ — der Auftrag an den nächsten Worker.
 */

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

  const laden = () => {
    void listeAuftraege()
      .then(setAuftraege)
      .catch((err) => {
        setAuftraege([]);
        meldeFehler(err);
      });
  };
  useEffect(laden, []);

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
    // Exportierte Aufträge wandern auf «an-worker»
    void Promise.all(
      (auftraege ?? []).filter((x) => x.status === 'offen').map((x) => setzeAuftragStatus(x.id, 'an-worker')),
    ).then(laden);
    melde('Workorder exportiert — Datei nach docs/auftraege/ legen und dem Worker geben', { ton: 'erfolg' });
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
          <KButton size="sm" tone="accent" onClick={exportieren} data-testid="workorder-export" disabled={offene === 0}>
            ⇥ Fable-Workorder (.md)
          </KButton>
        </div>

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
