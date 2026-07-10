import { useMemo } from 'react';
import { Badge, Hairline, KButton, KIcon, KInput, KSelect, Measure, melde, meldeFehler, moduleHue } from '@kosmo/ui';
import {
  areaOf,
  assemblyThickness,
  dist,
  formatArea,
  formatLength,
  isSettingsPatch,
  type Assembly,
  type Entity,
  type Opening,
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
        right: 'var(--k-s4)',
        bottom: 'var(--k-s4)',
        width: 250,
        maxHeight: 'calc(100% - 24px)',
        overflow: 'auto',
        background: 'var(--k-surface)',
        border: '1px solid var(--k-line)',
        borderRadius: 'var(--k-radius-md)',
        boxShadow: 'var(--k-shadow-raised)',
        padding: 'var(--k-s4)',
        display: 'grid',
        gap: 'var(--k-s3)',
        fontSize: 'var(--k-t-sm)',
        zIndex: 3,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--k-s3)' }}>
        <Badge hue={moduleHue.design}>{kindLabel[entity.kind] ?? entity.kind}</Badge>
        <div style={{ flex: 1 }} />
        <KButton size="sm" tone="ghost" onClick={() => select([])} aria-label="Auswahl aufheben">
          <KIcon name="schliessen" size={14} />
        </KButton>
      </div>
      <Hairline />

      {entity.kind === 'wall' && (
        <>
          <Row label="Länge">
            <Measure>{formatLength(Math.round(dist(entity.a, entity.b)))}</Measure>
          </Row>
          <Row label="Aufbau">
            <KSelect
              size="sm"
              value={entity.assemblyId}
              onChange={(e) => set('assemblyId', e.target.value)}
              style={{ width: '100%' }}
            >
              {assemblies
                .filter((a) => a.target === 'wall')
                .map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name} ({assemblyThickness(a)} mm)
                  </option>
                ))}
            </KSelect>
          </Row>
          <Row label="Achse">
            <KSelect
              size="sm"
              value={entity.alignment}
              onChange={(e) => set('alignment', e.target.value)}
              style={{ width: '100%' }}
            >
              <option value="zentrum">Zentrum</option>
              <option value="kern-aussen">Kern aussen</option>
              <option value="kern-innen">Kern innen</option>
            </KSelect>
          </Row>
          <Row label="Öffnungen">
            {/* v0.6.9 Stream F: Öffnungen sind im Plan (noch) nicht direkt
                anklickbar (kein Hit-Test-Ziel, plan-hit-test.ts) — die Liste
                hier ist der Einstieg, um ein einzelnes Fenster auszuwählen
                und im eigenen Inspector-Zweig unten zu parametrieren. */}
            <div style={{ display: 'grid', gap: 4, width: '100%' }}>
              {doc.openingsOf(entity.id).length === 0 && <span>0</span>}
              {doc.openingsOf(entity.id).map((o) => (
                <KButton
                  key={o.id}
                  size="sm"
                  tone="ghost"
                  data-testid="inspector-oeffnung"
                  onClick={() => select([o.id])}
                  style={{ width: '100%', justifyContent: 'flex-start' }}
                >
                  {o.openingType === 'fenster' ? 'Fenster' : o.openingType === 'tuer' ? 'Tür' : 'Leibung'}{' '}
                  {o.width}×{o.height}
                </KButton>
              ))}
            </div>
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
            <KInput
              size="sm"
              defaultValue={entity.name}
              key={entity.id + entity.name}
              onBlur={(e) => e.target.value !== entity.name && set('name', e.target.value)}
              style={{ width: '100%' }}
              data-testid="inspector-name"
            />
          </Row>
          <Row label="SIA 416">
            <KSelect size="sm" value={entity.sia} onChange={(e) => set('sia', e.target.value)} style={{ width: '100%' }}>
              {['HNF', 'NNF', 'VF', 'FF', 'KF'].map((s) => (
                <option key={s}>{s}</option>
              ))}
            </KSelect>
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

      {entity.kind === 'opening' && (
        <>
          <Row label="Wand">
            <KButton
              size="sm"
              tone="ghost"
              onClick={() => select([entity.wallId])}
              style={{ width: '100%', justifyContent: 'flex-start' }}
            >
              zur Wand ↑
            </KButton>
          </Row>
          <Row label="Art">
            <span>{entity.openingType === 'fenster' ? 'Fenster' : entity.openingType === 'tuer' ? 'Tür' : 'Leibung'}</span>
          </Row>
          <Row label="Masse">
            <Measure>
              {formatLength(entity.width)} × {formatLength(entity.height)}
            </Measure>
          </Row>
          {entity.openingType === 'fenster' && <FensterAbschnitt opening={entity} runCommand={runCommand} />}
        </>
      )}

      {entity.kind !== 'storey' && entity.kind !== 'assembly' && entity.kind !== 'sheet' && (
        <Row label="Umbau">
          <KSelect
            size="sm"
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
            style={{ width: '100%' }}
            data-testid="inspector-renovation"
          >
            <option value="">—</option>
            <option value="bestand">Bestand</option>
            <option value="neu">Neubau (rot)</option>
            <option value="abbruch">Abbruch (gelb)</option>
          </KSelect>
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
    <div style={{ display: 'grid', gridTemplateColumns: '84px 1fr', alignItems: 'center', gap: 'var(--k-s2)' }}>
      <span style={{ color: 'var(--k-ink-faint)' }}>{label}</span>
      {children}
    </div>
  );
}

function NumberField({
  value,
  suffix,
  onCommit,
  testid,
}: {
  value: number;
  suffix: string;
  onCommit: (v: number) => void;
  testid?: string;
}) {
  return (
    <span style={{ display: 'flex', alignItems: 'center', gap: 'var(--k-s2)' }}>
      <KInput
        size="sm"
        mono
        key={value}
        type="number"
        defaultValue={value}
        data-testid={testid}
        onBlur={(e) => {
          const v = Number(e.target.value);
          if (Number.isFinite(v) && v !== value) onCommit(v);
        }}
        onKeyDown={(e) => e.key === 'Enter' && (e.target as HTMLInputElement).blur()}
        style={{ width: 90 }}
      />
      <span style={{ color: 'var(--k-ink-faint)' }}>{suffix}</span>
    </span>
  );
}

/** Fenstertyp-Optionen (v0.6.9 Stream F) — deutsche Labels für die UI; die
 * kernel-internen Labels (`commands/design.ts` FENSTERTYP_LABEL) sind nicht
 * exportiert, darum eine schlanke eigene Kopie statt eines Kernel-Imports
 * für reine Anzeigetexte. */
const FENSTERTYP_OPTIONEN: Array<{ value: NonNullable<Opening['fensterTyp']>; label: string }> = [
  { value: 'einfluegel', label: 'Einflügelig' },
  { value: 'zweifluegel', label: 'Zweiflügelig' },
  { value: 'fest', label: 'Festverglasung' },
  { value: 'fensterband', label: 'Fensterband' },
];

/**
 * Fenster-Parametrik-UI (v0.6.9 Stream F, docs/FENSTER-KONZEPT.md §3):
 * Fenstertyp, Teilung n×m, Rahmenbreite — jede Änderung läuft über
 * `design.fensterParametrieren` (Undo/Sync/Kosmo-sichtbar wie jeder andere
 * Command). `swing` wird unverändert mitgeführt (ausser beim Umtypen auf
 * `fensterband` — der Command selbst entfernt es dort, s. FENSTER-KONZEPT
 * §3), diese UI bietet dafür bewusst keinen eigenen Schalter (nicht Teil des
 * Auftrags — nur Typ/Teilung/Rahmenbreite).
 */
function FensterAbschnitt({
  opening,
  runCommand,
}: {
  opening: Opening;
  runCommand: (commandId: string, params: unknown) => unknown;
}) {
  const typ = opening.fensterTyp ?? 'einfluegel';
  const n = opening.teilung?.n ?? 1;
  const m = opening.teilung?.m ?? 1;
  const rahmenbreite = opening.rahmenbreite ?? 60;

  const parametrieren = (patch: {
    fensterTyp?: Opening['fensterTyp'];
    teilungN?: number;
    teilungM?: number;
    rahmenbreite?: number;
  }) => {
    const naechsterTyp = patch.fensterTyp ?? typ;
    try {
      runCommand('design.fensterParametrieren', {
        openingId: opening.id,
        fensterTyp: naechsterTyp,
        teilungN: patch.teilungN ?? n,
        teilungM: patch.teilungM ?? m,
        rahmenbreite: patch.rahmenbreite ?? rahmenbreite,
        ...(naechsterTyp !== 'fensterband' && opening.swing ? { swing: opening.swing } : {}),
      });
    } catch (err) {
      meldeFehler(err);
    }
  };

  return (
    <>
      <Hairline />
      <Row label="Typ">
        <KSelect
          size="sm"
          data-testid="fenster-typ"
          value={typ}
          onChange={(e) => parametrieren({ fensterTyp: e.target.value as Opening['fensterTyp'] })}
          style={{ width: '100%' }}
        >
          {FENSTERTYP_OPTIONEN.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </KSelect>
      </Row>
      <Row label="Teilung">
        <span style={{ display: 'flex', alignItems: 'center', gap: 'var(--k-s2)' }}>
          <KInput
            size="sm"
            mono
            type="number"
            key={`n-${n}`}
            defaultValue={n}
            data-testid="fenster-teilung-n"
            onBlur={(e) => {
              const v = Number(e.target.value);
              if (Number.isFinite(v) && v !== n) parametrieren({ teilungN: v });
            }}
            onKeyDown={(e) => e.key === 'Enter' && (e.target as HTMLInputElement).blur()}
            style={{ width: 48 }}
          />
          <span style={{ color: 'var(--k-ink-faint)' }}>×</span>
          <KInput
            size="sm"
            mono
            type="number"
            key={`m-${m}`}
            defaultValue={m}
            data-testid="fenster-teilung-m"
            onBlur={(e) => {
              const v = Number(e.target.value);
              if (Number.isFinite(v) && v !== m) parametrieren({ teilungM: v });
            }}
            onKeyDown={(e) => e.key === 'Enter' && (e.target as HTMLInputElement).blur()}
            style={{ width: 48 }}
          />
        </span>
      </Row>
      <Row label="Rahmen">
        <NumberField
          value={rahmenbreite}
          suffix="mm"
          testid="fenster-rahmenbreite"
          onCommit={(v) => parametrieren({ rahmenbreite: v })}
        />
      </Row>
    </>
  );
}
