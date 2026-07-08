import { useMemo } from 'react';
import { Badge, Hairline, KButton, Measure, melde, meldeFehler, moduleHue } from '@kosmo/ui';
import {
  areaOf,
  assemblyThickness,
  dist,
  formatArea,
  formatLength,
  isSettingsPatch,
  type Assembly,
  type Entity,
  type Patch,
} from '@kosmo/kernel';
import { useProject } from '../../state/project-store';

/**
 * Inspector — Eigenschaften des ausgewählten Elements, editierbar.
 * Jede Änderung läuft als Command (Undo, Journal, Kosmo-sichtbar).
 */

const kindLabel: Record<string, string> = {
  wall: 'Wand',
  slab: 'Decke',
  roof: 'Walmdach',
  zone: 'Zone',
  mass: 'Volumen',
  opening: 'Öffnung',
  freemesh: 'FreeMesh',
};

export function Inspector() {
  const selection = useProject((s) => s.selection);
  const revision = useProject((s) => s.revision);
  const runCommand = useProject((s) => s.runCommand);
  const select = useProject((s) => s.select);
  const setMeshEditId = useProject((s) => s.setMeshEditId);
  const doc = useProject.getState().doc;

  const entity = useMemo<Entity | null>(() => {
    const id = selection[0];
    return id ? (doc.get(id) ?? null) : null;
  }, [selection, doc, revision]);

  if (!entity) return null;

  const set = (feld: string, wert: string | number) => {
    try {
      runCommand('design.eigenschaftSetzen', { entityId: entity.id, feld, wert });
    } catch (err) {
      meldeFehler(err);
    }
  };

  const assemblies = doc.byKind<Assembly>('assembly');

  return (
    <div
      data-testid="inspector"
      // K3 (Owner S. 8): «Popup-Texte dürfen niemals den Block verlassen».
      className="k-dialog"
      style={{
        position: 'absolute',
        right: 12,
        bottom: 12,
        width: 250,
        maxHeight: 'calc(100% - 24px)',
        overflow: 'auto',
        background: 'var(--k-surface)',
        border: '1px solid var(--k-line)',
        borderRadius: 'var(--k-radius-md)',
        boxShadow: 'var(--k-shadow-raised)',
        padding: 12,
        display: 'grid',
        gap: 8,
        fontSize: 12.5,
        zIndex: 3,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <Badge hue={moduleHue.design}>{kindLabel[entity.kind] ?? entity.kind}</Badge>
        <div style={{ flex: 1 }} />
        <KButton size="sm" tone="ghost" onClick={() => select([])} aria-label="Auswahl aufheben">
          ×
        </KButton>
      </div>
      <Hairline />

      {entity.kind === 'wall' && (
        <>
          <Row label="Länge">
            <Measure>{formatLength(Math.round(dist(entity.a, entity.b)))}</Measure>
          </Row>
          <Row label="Aufbau">
            <select
              value={entity.assemblyId}
              onChange={(e) => set('assemblyId', e.target.value)}
              style={inputStyle}
            >
              {assemblies
                .filter((a) => a.target === 'wall')
                .map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name} ({assemblyThickness(a)} mm)
                  </option>
                ))}
            </select>
          </Row>
          <Row label="Achse">
            <select
              value={entity.alignment}
              onChange={(e) => set('alignment', e.target.value)}
              style={inputStyle}
            >
              <option value="zentrum">Zentrum</option>
              <option value="kern-aussen">Kern aussen</option>
              <option value="kern-innen">Kern innen</option>
            </select>
          </Row>
          <Row label="Öffnungen">
            <span>{doc.openingsOf(entity.id).length}</span>
          </Row>
          <Row label="Durchbruch">
            <KButton
              size="sm"
              tone="ghost"
              data-testid="inspector-aussparung"
              onClick={() => {
                try {
                  // Default 300×300 in Wandmitte, UK 1100 — via Kosmo präzise setzbar
                  runCommand('design.aussparungSetzen', {
                    hostId: entity.id,
                    typ: 'durchbruch',
                    center: Math.round(dist(entity.a, entity.b) / 2),
                    breite: 300,
                    hoehe: 300,
                    sill: 1100,
                  });
                } catch (err) {
                  meldeFehler(err);
                }
              }}
            >
              ⌗ 30×30 setzen
            </KButton>
          </Row>
          <Row label="Etikett">
            <KButton
              size="sm"
              tone="ghost"
              data-testid="inspector-etikett"
              onClick={() => {
                try {
                  // Aufbau-Etikett neben der Wandmitte — assoziativ, liest live
                  const mitte = {
                    x: Math.round((entity.a.x + entity.b.x) / 2),
                    y: Math.round((entity.a.y + entity.b.y) / 2) + 800,
                  };
                  runCommand('design.etikettSetzen', { targetId: entity.id, at: mitte, inhalt: 'aufbau' });
                } catch (err) {
                  meldeFehler(err);
                }
              }}
            >
              🏷 Aufbau
            </KButton>
          </Row>
        </>
      )}

      {entity.kind === 'zone' && (
        <>
          <Row label="Name">
            <input
              defaultValue={entity.name}
              key={entity.id + entity.name}
              onBlur={(e) => e.target.value !== entity.name && set('name', e.target.value)}
              style={inputStyle}
              data-testid="inspector-name"
            />
          </Row>
          <Row label="SIA 416">
            <select value={entity.sia} onChange={(e) => set('sia', e.target.value)} style={inputStyle}>
              {['HNF', 'NNF', 'VF', 'FF', 'KF'].map((s) => (
                <option key={s}>{s}</option>
              ))}
            </select>
          </Row>
          <Row label="Fläche">
            <Measure>{formatArea(areaOf(entity.outline) * 1_000_000)}</Measure>
          </Row>
        </>
      )}

      {entity.kind === 'roof' && (
        <>
          <Row label="Neigung">
            <NumberField value={entity.pitch} suffix="°" onCommit={(v) => set('pitch', v)} />
          </Row>
          <Row label="Überstand">
            <NumberField value={entity.overhang} suffix="mm" onCommit={(v) => set('overhang', v)} />
          </Row>
        </>
      )}

      {entity.kind === 'mass' && (
        <>
          <Row label="Höhe">
            <NumberField value={entity.height} suffix="mm" onCommit={(v) => set('height', v)} />
          </Row>
          <Row label="GF">
            <Measure>{formatArea(areaOf(entity.outline) * 1_000_000)}</Measure>
          </Row>
          {/* Block 3 / E3+E4: Volumenkörper → FreeMesh (identische Form, ein
              Undo-Schritt löscht das Volumen UND das neue Mesh zusammen). */}
          <KButton
            size="sm"
            tone="ghost"
            data-testid="mesh-umwandeln"
            onClick={() => {
              try {
                const result = runCommand('design.meshErstellen', { form: 'ausVolumen', massId: entity.id });
                const neu = result.patches.find(
                  (p): p is Patch => !isSettingsPatch(p) && p.before === null && p.after?.kind === 'freemesh',
                );
                melde('Volumen in FreeMesh umgewandelt.', { ton: 'erfolg' });
                if (neu) select([neu.id]);
              } catch (err) {
                meldeFehler(err);
              }
            }}
          >
            In Mesh umwandeln
          </KButton>
        </>
      )}

      {entity.kind === 'freemesh' && (
        <>
          <Row label="Vertices">
            <span>{entity.positions.length / 3}</span>
          </Row>
          <Row label="Flächen">
            <span>{entity.faces.length / 3}</span>
          </Row>
          {/* Block 3 / E4: eigener meshEdit-Modus im Viewport (Vertex-Handles +
              Flächen-Extrude) — KEIN allgemeines Gizmo-Framework, siehe Buildplan §5. */}
          <KButton size="sm" tone="accent" data-testid="mesh-bearbeiten" onClick={() => setMeshEditId(entity.id)}>
            Mesh bearbeiten
          </KButton>
        </>
      )}

      {entity.kind === 'slab' && (
        <Row label="Dicke">
          <NumberField value={entity.thickness} suffix="mm" onCommit={(v) => set('thickness', v)} />
        </Row>
      )}

      {entity.kind !== 'storey' && entity.kind !== 'assembly' && entity.kind !== 'sheet' && (
        <Row label="Umbau">
          <select
            value={entity.meta?.renovation ?? ''}
            onChange={(e) => {
              try {
                runCommand('design.renovationSetzen', {
                  ids: [entity.id],
                  ...(e.target.value ? { status: e.target.value } : {}),
                });
              } catch (err) {
                meldeFehler(err);
              }
            }}
            style={inputStyle}
            data-testid="inspector-renovation"
          >
            <option value="">—</option>
            <option value="bestand">Bestand</option>
            <option value="neu">Neubau (rot)</option>
            <option value="abbruch">Abbruch (gelb)</option>
          </select>
        </Row>
      )}

      <Hairline />
      <KButton
        size="sm"
        tone="danger"
        data-testid="inspector-delete"
        onClick={() => {
          runCommand('design.loeschen', { entityId: entity.id });
          select([]);
        }}
      >
        Löschen
      </KButton>
    </div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '84px 1fr', alignItems: 'center', gap: 6 }}>
      <span style={{ color: 'var(--k-ink-faint)' }}>{label}</span>
      {children}
    </div>
  );
}

function NumberField({
  value,
  suffix,
  onCommit,
}: {
  value: number;
  suffix: string;
  onCommit: (v: number) => void;
}) {
  return (
    <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
      <input
        key={value}
        type="number"
        defaultValue={value}
        onBlur={(e) => {
          const v = Number(e.target.value);
          if (Number.isFinite(v) && v !== value) onCommit(v);
        }}
        onKeyDown={(e) => e.key === 'Enter' && (e.target as HTMLInputElement).blur()}
        style={{ ...inputStyle, width: 90 }}
      />
      <span style={{ color: 'var(--k-ink-faint)' }}>{suffix}</span>
    </span>
  );
}

const inputStyle: React.CSSProperties = {
  padding: '3px 7px',
  borderRadius: 6,
  border: '1px solid var(--k-line-strong)',
  background: 'var(--k-raised)',
  fontSize: 12.5,
  width: '100%',
};
