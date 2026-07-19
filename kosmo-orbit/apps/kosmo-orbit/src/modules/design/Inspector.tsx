import { useMemo } from 'react';
import { Hairline, KButton, KIcon, KInput, KPanelZweiStufen, KSelect, KSwitch, Measure, melde, meldeFehler } from '@kosmo/ui';
import './design-panels.css';
import {
  areaOf,
  assemblyThickness,
  BESCHLAG_KATALOG,
  dist,
  formatArea,
  formatLength,
  isSettingsPatch,
  type Assembly,
  type BeschlagKategorie,
  type Entity,
  type Opening,
  type Patch,
} from '@kosmo/kernel';
// E6 (v0.8.10, docs/V0810-SPEZ.md §2, Z5): Material-Auswahl für
// column/beam bezieht dieselbe Katalog-Quelle wie die Wand-Aufbauten
// (kein neuer Katalog) — `materialkatalog` (@kosmo/data) ist bereits der
// Bestandsweg für Material-Dropdowns im Design-Modul, s.
// `modules/design/texturen.ts`/`Viewport3D.tsx`.
import { materialkatalog } from '@kosmo/data';
import { useProject } from '../../state/project-store';
import { stufeUmschalten, useDockZustand } from '../../state/dock-zustand';

/**
 * Inspector — Eigenschaften des ausgewählten Elements, editierbar.
 * Jede Änderung läuft als Command (Undo, Journal, Kosmo-sichtbar).
 *
 * v0.8.1 Welle 4 / Paket P5c (Zwei-Stufen-Rollout, `docs/V081-SPEZ.md`
 * §2.2/§2.4) — migriert auf `KPanelZweiStufen`: Kernkennzahl ist
 * Elementtyp + Kurzbezeichnung (§2.2 explizites Beispiel «WAND · W-014»,
 * s. `kurzbezeichnung()` unten). EIN Tab («Eigenschaften», alle
 * kind-spezifischen Zeilen unverändert): `apps/kosmo-orbit/test/
 * beschlag-inspector.test.tsx` rendert den Inspector für eine `opening`-
 * Entität und erwartet die Beschlag-Katalog-Checkboxen SOFORT im DOM, ohne
 * einen Tab-Wechsel zu simulieren — ein Eigenschaften/Erweitert-Split
 * (Fenster-/Beschlag-Abschnitt hinter einem zweiten Tab) hätte diesen
 * bestehenden Vertrag zerschnitten, da `KPanelZweiStufen` nur den AKTIVEN
 * Tab mountet.
 */

const kindLabel: Record<string, string> = {
  wall: 'Wand',
  slab: 'Decke',
  roof: 'Walmdach',
  zone: 'Zone',
  mass: 'Volumen',
  opening: 'Öffnung',
  freemesh: 'FreeMesh',
  // E6 (v0.8.10, Z5): additive Labels — die drei neuen Zweige unten.
  column: 'Stütze',
  beam: 'Unterzug',
  furniture: 'Möbel',
};

// E6 (v0.8.10, Z5): Zone.raumTyp-Werteliste — dieselbe Aufzählung wie
// `design.raumTypSetzen`/`design.eigenschaftSetzen`s RAUMTYP_WERTE
// (packages/kosmo-kernel/src/commands/design.ts), additiv dupliziert wie
// FENSTERTYP_OPTIONEN unten (kein Kernel-Export dieser internen Konstante).
const RAUMTYP_OPTIONEN = [
  'zimmer', 'wohnen', 'kueche', 'bad', 'korridor', 'treppenhaus', 'abstellraum', 'balkon', 'technik', 'gewerbe',
] as const;

/** §2.2 Kopfzeile-Rezept («WAND · W-014») — Kurzbezeichnung ist der Zonen-
 *  Name (falls vorhanden) oder ein kurzes ID-Fragment, sonst wäre die
 *  Kopfzeile für unbenannte Elemente leer (§2.2 Grundsatz «nie leer»). */
function kurzbezeichnung(entity: Entity): string {
  const typ = (kindLabel[entity.kind] ?? entity.kind).toUpperCase();
  const name = 'name' in entity && typeof (entity as { name?: unknown }).name === 'string' ? (entity as { name: string }).name : undefined;
  const kurz = name && name.trim().length > 0 ? name : entity.id.slice(-6).toUpperCase();
  return `${typ} · ${kurz}`;
}

export function Inspector() {
  const selection = useProject((s) => s.selection);
  const revision = useProject((s) => s.revision);
  const runCommand = useProject((s) => s.runCommand);
  const select = useProject((s) => s.select);
  const setMeshEditId = useProject((s) => s.setMeshEditId);
  const doc = useProject.getState().doc;

  // Hooks bleiben VOR dem `if (!entity) return null` unten (Rules of Hooks) —
  // wie `useMemo`/`useProject` oben schon, keine neue Konvention.
  const modus = useDockZustand((s) => s.modus);
  const layouts = useDockZustand((s) => s.layouts);
  const panelOverrideSetzen = useDockZustand((s) => s.panelOverrideSetzen);
  const stufeRoh = layouts[`${modus}:design`]?.panels['inspector']?.stufe;
  const stufe = stufeRoh ?? 'offen';

  const entity = useMemo<Entity | null>(() => {
    const id = selection[0];
    return id ? (doc.get(id) ?? null) : null;
  }, [selection, doc, revision]);

  // E1/C-6 (v0.8.5 PA1): Mehrfach-Auswahl — kompakte Sammel-Ansicht statt
  // der Einzelelement-Felder («N Elemente» + gemeinsames Löschen als EINE
  // Undo-Gruppe, derselbe Weg wie Delete/Backspace im DesignWorkspace).
  if (selection.length > 1) {
    // v0.8.9 E2 (PA2, docs/V089-SPEZ.md §3 E2/§7 C-3): gesperrte Elemente
    // dürfen auch über die Sammel-Löschung nicht verschwinden — dieselbe
    // Regel wie beim Einzel-Löschen unten, hier vor dem Absenden gefiltert
    // statt den Command je Id werfen zu lassen (kein Fehlerhagel für eine
    // erwartbare Sperre).
    const loeschbar = selection.filter((id) => doc.get(id)?.meta?.locked !== true);
    const loescheAlle = () => {
      if (loeschbar.length === 0) {
        meldeFehler(new Error('Alle ausgewählten Elemente sind gesperrt — erst entsperren.'));
        return;
      }
      const { history } = useProject.getState();
      history.beginGroup();
      try {
        for (const id of loeschbar) {
          try {
            runCommand('design.loeschen', { entityId: id });
          } catch (err) {
            meldeFehler(err);
          }
        }
      } finally {
        history.endGroup();
      }
      select([]);
    };
    return (
      <div className="insp-koerper" data-testid="inspector-mehrfach">
        <Hairline />
        <Row label="Auswahl">
          <span data-testid="inspector-mehrfach-anzahl">{selection.length} Elemente</span>
        </Row>
        <KButton size="sm" tone="danger" data-testid="inspector-mehrfach-loeschen" onClick={loescheAlle}>
          Alle löschen
        </KButton>
      </div>
    );
  }

  if (!entity) return null;

  // v0.8.9 E2 (PA2, docs/V089-SPEZ.md §3 E2/§7 C-3): gesperrt deaktiviert im
  // Inspector alles, was das Element verändern/verschieben/löschen würde
  // (Löschen-Knopf + die kind-spezifischen Eigenschaftsfelder unten) — der
  // Sperr-Toggle selbst bleibt IMMER bedienbar (sonst gäbe es keinen Weg
  // zurück). Canvas-Drag/Griff-Ziehen/Tastatur-Löschen laufen ausserhalb
  // dieser Datei (`DesignWorkspace.tsx`/`PlanView.tsx`, PA2-tabu) — s.
  // `istGesperrt()`-Kommentar in `plan-hit-test.ts` für die dortigen
  // Übergabepunkte an Fable.
  const gesperrt = entity.meta?.locked === true;

  const set = (feld: string, wert: string | number) => {
    try {
      runCommand('design.eigenschaftSetzen', { entityId: entity.id, feld, wert });
    } catch (err) {
      meldeFehler(err);
    }
  };

  const assemblies = doc.byKind<Assembly>('assembly');

  const koerper = (
    <div className="insp-koerper">
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
              className="dp-feld-voll"
              disabled={gesperrt}
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
              className="dp-feld-voll"
              disabled={gesperrt}
            >
              <option value="zentrum">Zentrum</option>
              <option value="kern-aussen">Kern aussen</option>
              <option value="kern-innen">Kern innen</option>
            </KSelect>
          </Row>
          {/* E6 (v0.8.10, Z5): additiv — die allowed-Map erlaubt `height`
              für wall bereits (design.ts:793). Ehrlicher Hinweis: das Feld
              wirkt nur bei heightMode 'fix' (Standard ist 'geschoss', bis
              OK nächstes Geschoss) — das Umschalten des Modus selbst ist
              hier NICHT Teil des Auftrags (nur das kernel-bereits-erlaubte
              Feld editierbar machen), s. `model/entities.ts` Wall.heightMode. */}
          <Row label="Höhe (fix)">
            <NumberField
              value={entity.height ?? 0}
              suffix="mm"
              testid="inspector-wand-hoehe"
              onCommit={(v) => set('height', v)}
              disabled={gesperrt}
            />
          </Row>
          <Row label="Öffnungen">
            {/* v0.6.9 Stream F: Öffnungen sind im Plan (noch) nicht direkt
                anklickbar (kein Hit-Test-Ziel, plan-hit-test.ts) — die Liste
                hier ist der Einstieg, um ein einzelnes Fenster auszuwählen
                und im eigenen Inspector-Zweig unten zu parametrieren. */}
            <div className="dp-oeffnungsliste">
              {doc.openingsOf(entity.id).length === 0 && <span>0</span>}
              {doc.openingsOf(entity.id).map((o) => (
                <KButton
                  key={o.id}
                  size="sm"
                  tone="ghost"
                  data-testid="inspector-oeffnung"
                  onClick={() => select([o.id])}
                  className="dp-feld-links"
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
              disabled={gesperrt}
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
              disabled={gesperrt}
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
              className="dp-feld-voll"
              data-testid="inspector-name"
              disabled={gesperrt}
            />
          </Row>
          <Row label="SIA 416">
            <KSelect
              size="sm"
              value={entity.sia}
              onChange={(e) => set('sia', e.target.value)}
              className="dp-feld-voll"
              disabled={gesperrt}
            >
              {['HNF', 'NNF', 'VF', 'FF', 'KF'].map((s) => (
                <option key={s}>{s}</option>
              ))}
            </KSelect>
          </Row>
          {/* E6 (v0.8.10, Z5): additiv — allowed-Map erlaubt program/number/
              raumTyp für zone bereits (design.ts:789). */}
          <Row label="Nutzung">
            <KInput
              size="sm"
              defaultValue={entity.program ?? ''}
              key={entity.id + 'program' + (entity.program ?? '')}
              onBlur={(e) => e.target.value !== (entity.program ?? '') && set('program', e.target.value)}
              className="dp-feld-voll"
              data-testid="inspector-zone-program"
              disabled={gesperrt}
            />
          </Row>
          <Row label="Raumnummer">
            <KInput
              size="sm"
              defaultValue={entity.number ?? ''}
              key={entity.id + 'number' + (entity.number ?? '')}
              onBlur={(e) => e.target.value !== (entity.number ?? '') && set('number', e.target.value)}
              className="dp-feld-voll"
              data-testid="inspector-zone-number"
              disabled={gesperrt}
            />
          </Row>
          <Row label="Raumtyp">
            <KSelect
              size="sm"
              value={entity.raumTyp ?? ''}
              onChange={(e) => set('raumTyp', e.target.value)}
              className="dp-feld-voll"
              data-testid="inspector-zone-raumtyp"
              disabled={gesperrt}
            >
              <option value="" disabled>
                —
              </option>
              {RAUMTYP_OPTIONEN.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
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
            <NumberField value={entity.pitch} suffix="°" onCommit={(v) => set('pitch', v)} disabled={gesperrt} />
          </Row>
          <Row label="Überstand">
            <NumberField value={entity.overhang} suffix="mm" onCommit={(v) => set('overhang', v)} disabled={gesperrt} />
          </Row>
        </>
      )}

      {entity.kind === 'mass' && (
        <>
          <Row label="Höhe">
            <NumberField value={entity.height} suffix="mm" onCommit={(v) => set('height', v)} disabled={gesperrt} />
          </Row>
          {/* E6 (v0.8.10, Z5): additiv — allowed-Map erlaubt program für
              mass bereits (design.ts:791), gleiches Freitext-Muster wie
              Zone.program oben. */}
          <Row label="Nutzung">
            <KInput
              size="sm"
              defaultValue={entity.program ?? ''}
              key={entity.id + 'program' + (entity.program ?? '')}
              onBlur={(e) => e.target.value !== (entity.program ?? '') && set('program', e.target.value)}
              className="dp-feld-voll"
              data-testid="inspector-mass-program"
              disabled={gesperrt}
            />
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
            disabled={gesperrt}
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
          {/* E6 (v0.8.10, Z5): additiv — allowed-Map erlaubt name für
              freemesh bereits (design.ts:804). Ehrlicher Hinweis: die
              name→meta-Ausnahme (design.ts:900-903) gilt nur für
              storey/assembly/zone — bei freemesh landet der Wert darum in
              `entity.meta.name`, nicht im eigenen `FreeMesh.name`-Feld;
              das Anzeigefeld liest darum bewusst `entity.meta?.name`
              (identisch zum bestehenden `Ebene (DXF)`-Feld unten, das auch
              gegen `entity.meta` liest). `kurzbezeichnung()` oben liest nur
              das direkte `entity.name` und zeigt den neuen Namen darum
              NICHT in der Kopfzeile — ein bestehender Kernel-Zustand, den
              dieses Paket (Inspector.tsx/Spec, design.ts TABU) nicht
              verändert. */}
          <Row label="Name">
            <KInput
              size="sm"
              defaultValue={entity.meta?.name ?? ''}
              key={entity.id + 'freemesh-name' + (entity.meta?.name ?? '')}
              onBlur={(e) => e.target.value !== (entity.meta?.name ?? '') && set('name', e.target.value)}
              className="dp-feld-voll"
              data-testid="inspector-freemesh-name"
              disabled={gesperrt}
            />
          </Row>
          <Row label="Vertices">
            <span>{entity.positions.length / 3}</span>
          </Row>
          <Row label="Flächen">
            <span>{entity.faces.length / 3}</span>
          </Row>
          {/* Block 3 / E4: eigener meshEdit-Modus im Viewport (Vertex-Handles +
              Flächen-Extrude) — KEIN allgemeines Gizmo-Framework, siehe Buildplan §5. */}
          <KButton
            size="sm"
            tone="accent"
            data-testid="mesh-bearbeiten"
            disabled={gesperrt}
            onClick={() => setMeshEditId(entity.id)}
          >
            Mesh bearbeiten
          </KButton>
        </>
      )}

      {entity.kind === 'slab' && (
        <Row label="Dicke">
          <NumberField value={entity.thickness} suffix="mm" onCommit={(v) => set('thickness', v)} disabled={gesperrt} />
        </Row>
      )}

      {/* E6 (v0.8.10, Z5, docs/V0810-SPEZ.md §2/§6 C-10): NEUER Zweig —
          die allowed-Map erlaubt column: material/b/t/rotationGrad bereits
          (design.ts:811); Bestands-Bereiche für b/t (80–2000 mm) prüft der
          Kernel selbst (design.ts:845-850) und wirft über denselben
          Fehlerweg wie jedes andere Feld (`set()` oben, try/catch →
          `meldeFehler`). Material-Optionen aus `materialkatalog`
          (@kosmo/data) — derselbe Katalog wie `texturen.ts`/`Viewport3D.tsx`,
          kein neuer Katalog (Bauauftrag-Vorgabe). */}
      {entity.kind === 'column' && (
        <>
          <Row label="Material">
            <KSelect
              size="sm"
              value={entity.material}
              onChange={(e) => set('material', e.target.value)}
              className="dp-feld-voll"
              data-testid="inspector-stuetze-material"
              disabled={gesperrt}
            >
              {materialkatalog.map((m) => (
                <option key={m.key} value={m.key}>
                  {m.name}
                </option>
              ))}
            </KSelect>
          </Row>
          <Row label="Breite">
            <NumberField
              value={entity.b}
              suffix="mm"
              testid="inspector-stuetze-b"
              onCommit={(v) => set('b', v)}
              disabled={gesperrt}
            />
          </Row>
          <Row label="Tiefe">
            {/* Rund-Profil führt kein eigenes t (b = Durchmesser) — Fallback
                auf b, wie `design.stuetzeSetzen`s Erstellungs-Default. */}
            <NumberField
              value={entity.t ?? entity.b}
              suffix="mm"
              testid="inspector-stuetze-t"
              onCommit={(v) => set('t', v)}
              disabled={gesperrt}
            />
          </Row>
          <Row label="Rotation">
            <NumberField
              value={entity.rotationGrad ?? 0}
              suffix="°"
              testid="inspector-stuetze-rotation"
              onCommit={(v) => set('rotationGrad', v)}
              disabled={gesperrt}
            />
          </Row>
        </>
      )}

      {/* E6 (v0.8.10, Z5): NEUER Zweig — allowed-Map erlaubt beam:
          breite/hoehe/material bereits (design.ts:812); Bestands-Bereiche
          (breite 80–2000 mm, hoehe 100–3000 mm) prüft der Kernel
          (design.ts:851-858). */}
      {entity.kind === 'beam' && (
        <>
          <Row label="Breite">
            <NumberField
              value={entity.breite}
              suffix="mm"
              testid="inspector-unterzug-breite"
              onCommit={(v) => set('breite', v)}
              disabled={gesperrt}
            />
          </Row>
          <Row label="Höhe">
            <NumberField
              value={entity.hoehe}
              suffix="mm"
              testid="inspector-unterzug-hoehe"
              onCommit={(v) => set('hoehe', v)}
              disabled={gesperrt}
            />
          </Row>
          <Row label="Material">
            <KSelect
              size="sm"
              value={entity.material}
              onChange={(e) => set('material', e.target.value)}
              className="dp-feld-voll"
              data-testid="inspector-unterzug-material"
              disabled={gesperrt}
            >
              {materialkatalog.map((m) => (
                <option key={m.key} value={m.key}>
                  {m.name}
                </option>
              ))}
            </KSelect>
          </Row>
        </>
      )}

      {/* E6 (v0.8.10, Z5): NEUER Zweig — allowed-Map erlaubt furniture:
          rotationGrad bereits (design.ts:810). Ehrlicher Hinweis: der
          Kernel normalisiert rotationGrad mod 360 statt zu werfen (kein
          Falschwert-Fall wie bei sia/raumTyp, design.ts:833-844) — dieser
          Zweig hat darum bewusst keinen erzwingbaren Kernel-Wurf-Fall über
          gültige Zahleneingaben (Spec-Bericht nennt das ehrlich). */}
      {entity.kind === 'furniture' && (
        <Row label="Rotation">
          <NumberField
            value={entity.rotationGrad}
            suffix="°"
            testid="inspector-moebel-rotation"
            onCommit={(v) => set('rotationGrad', v)}
            disabled={gesperrt}
          />
        </Row>
      )}

      {entity.kind === 'opening' && (
        <>
          <Row label="Wand">
            <KButton
              size="sm"
              tone="ghost"
              onClick={() => select([entity.wallId])}
              className="dp-feld-links"
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
          {entity.openingType === 'fenster' && (
            <FensterAbschnitt opening={entity} runCommand={runCommand} disabled={gesperrt} />
          )}
          {entity.openingType !== 'leibung' && (
            <BeschlagAbschnitt opening={entity} runCommand={runCommand} disabled={gesperrt} />
          )}
        </>
      )}

      {entity.kind !== 'storey' && entity.kind !== 'assembly' && entity.kind !== 'sheet' && (
        <>
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
              className="dp-feld-voll"
              data-testid="inspector-renovation"
              disabled={gesperrt}
            >
              <option value="">—</option>
              <option value="bestand">Bestand</option>
              <option value="neu">Neubau (rot)</option>
              <option value="abbruch">Abbruch (gelb)</option>
            </KSelect>
          </Row>

          {/* v0.8.9 E2 (PA2, docs/V089-SPEZ.md §3 E2, Owner-Entscheid «CAD-
              Ebenen = DXF-Interop + Sperren», Sanktion 4: KEIN Sichtbarkeits-
              Panel). Ebene-Feld bleibt AUCH bei gesperrt bedienbar (reines
              Interop-Metadatum, keine Geometrie/Löschung); der Sperr-Toggle
              muss immer bedienbar bleiben — sonst gäbe es keinen Weg zurück. */}
          <Row label="Ebene (DXF)">
            <KInput
              size="sm"
              defaultValue={entity.meta?.layer ?? ''}
              key={entity.id + (entity.meta?.layer ?? '')}
              placeholder="automatisch (Semantik)"
              onBlur={(e) => {
                const wert = e.target.value.trim();
                if (wert === (entity.meta?.layer ?? '')) return;
                try {
                  runCommand('design.ebeneSetzen', { entityId: entity.id, layer: wert.length > 0 ? wert : null });
                } catch (err) {
                  meldeFehler(err);
                }
              }}
              className="dp-feld-voll"
              data-testid="inspector-ebene"
            />
          </Row>
          <Row label="Gesperrt">
            <KSwitch
              data-testid="inspector-sperren"
              checked={gesperrt}
              onChange={(e) => {
                try {
                  runCommand('design.sperren', { entityId: entity.id, locked: e.target.checked });
                } catch (err) {
                  meldeFehler(err);
                }
              }}
            />
          </Row>
          {gesperrt && (
            <div data-testid="inspector-gesperrt-hinweis" className="dp-hinweis">
              Gesperrt — Verschieben, Griff-Ziehen und Löschen sind deaktiviert, bis das Element entsperrt wird.
            </div>
          )}
        </>
      )}

      <Hairline />
      <KButton
        size="sm"
        tone="danger"
        data-testid="inspector-delete"
        disabled={gesperrt}
        onClick={() => {
          if (gesperrt) return;
          runCommand('design.loeschen', { entityId: entity.id });
          select([]);
        }}
      >
        Löschen
      </KButton>
    </div>
  );

  return (
    <div
      data-testid="inspector"
      // K3 (Owner S. 8): «Popup-Texte dürfen niemals den Block verlassen».
      //
      // v0.7.8 Welle 2 (P4, Rechts-Stack-Migration): vorher ein eigener
      // `position:'absolute'`-Overlay — H-43s `bottom: calc(var(--k-s4) +
      // 78px)`-Anhebung existierte NUR, um NavLeiste (right:88/bottom:50) und
      // das freistehende Kosmo-Symbol nicht zu schneiden (s. `git blame`/
      // `inspector-layout.spec.ts`). Jetzt ein Dock-Panel-INHALT
      // (`dock-stationen.ts` `'inspector'`, wichtigkeit 82): Position/Breite/
      // Höhe kommen aus `DockPanel.tsx`/`dock-kern.ts`s Solver, der DIESELBE
      // Kollisionsfreiheit strukturell garantiert (der rechte Stack reicht
      // nie in den unteren Chrome-Streifen, s. `DockFlaeche.tsx`s
      // BOT-Reserve) — der H-43-Sonderabstand entfällt ersatzlos. Doppel-
      // Chrome bewusst (wie `RasterPanel.tsx`): Hintergrund/Rahmen/Schatten
      // bleiben, Position/Breiten-/Höhen-Deckel entfallen.
      className="k-dialog dp-panel"
    >
      {/* Gate-Nachtrag (P5c): Action-Row nur in Stufe 'offen' — s.
          MaengelPanel-Kommentar (KPanelZweiStufen-Kopf muss in Stufe
          'kompakt' zuerst gemalt werden, kein Vorlauf davor). */}
      {stufe === 'offen' && (
        <div className="dp-kopf">
          <div className="dp-fuell" />
          <KButton size="sm" tone="ghost" onClick={() => select([])} aria-label="Auswahl aufheben">
            <KIcon name="schliessen" size={14} />
          </KButton>
        </div>
      )}

      <KPanelZweiStufen
        data-testid="inspector-koerper"
        titel="Inspector"
        kernkennzahl={kurzbezeichnung(entity)}
        stufe={stufe}
        onStufeUmschalten={() => panelOverrideSetzen('design', 'inspector', { stufe: stufeUmschalten(stufeRoh) })}
        aktiverTab="eigenschaften"
        onTabWechseln={() => {}}
        tabs={[{ id: 'eigenschaften', label: 'Eigenschaften', inhalt: koerper }]}
      />
    </div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="dp-zeile">
      <span className="dp-zeile-label">{label}</span>
      {children}
    </div>
  );
}

function NumberField({
  value,
  suffix,
  onCommit,
  testid,
  disabled,
}: {
  value: number;
  suffix: string;
  onCommit: (v: number) => void;
  testid?: string;
  /** v0.8.9 E2 (PA2): gesperrte Elemente dürfen im Inspector nicht editiert
   *  werden — s. `gesperrt`-Konstante im `Inspector()`-Body. */
  disabled?: boolean;
}) {
  return (
    <span className="dp-zahlfeld">
      <KInput
        size="sm"
        mono
        key={value}
        type="number"
        defaultValue={value}
        data-testid={testid}
        disabled={disabled}
        onBlur={(e) => {
          const v = Number(e.target.value);
          if (Number.isFinite(v) && v !== value) onCommit(v);
        }}
        onKeyDown={(e) => e.key === 'Enter' && (e.target as HTMLInputElement).blur()}
        className="dp-zahlfeld-input"
      />
      <span className="dp-einheit">{suffix}</span>
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

/** Flügeltyp-Optionen (v0.7.1 E5/4B) — steuert die SIA-Öffnungssymbolik in
 * Ansicht (Dreieck/Pfeil) und Grundriss (Doppelstrich/versetzte Doppellinie),
 * s. `derive/section.ts`/`derive/plan.ts`. Unabhängig vom Fenstertyp oben. */
const FLUEGELTYP_OPTIONEN: Array<{ value: NonNullable<Opening['fluegelTyp']>; label: string }> = [
  { value: 'fest', label: 'Fest (keine Symbolik)' },
  { value: 'dreh', label: 'Dreh' },
  { value: 'kipp', label: 'Kipp' },
  { value: 'drehkipp', label: 'Dreh-Kipp' },
  { value: 'schiebe', label: 'Schiebe' },
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
  disabled = false,
}: {
  opening: Opening;
  runCommand: (commandId: string, params: unknown) => unknown;
  /** v0.8.9 E2 (PA2): gesperrtes Wirtselement — Fenster-Parametrik gilt als
   *  Editieren desselben Elements und wird darum mitgesperrt. */
  disabled?: boolean;
}) {
  const typ = opening.fensterTyp ?? 'einfluegel';
  const n = opening.teilung?.n ?? 1;
  const m = opening.teilung?.m ?? 1;
  const rahmenbreite = opening.rahmenbreite ?? 60;

  const fluegel = opening.fluegelTyp ?? 'fest';

  // D2-Öffnungsrichtung (v0.7.3, docs/V073-GESTALTUNG-SPEZ.md §D2): additiv,
  // Default false = innen (durchgezogen).
  const oeffnetNachAussen = opening.oeffnetNachAussen ?? false;

  const parametrieren = (patch: {
    fensterTyp?: Opening['fensterTyp'];
    teilungN?: number;
    teilungM?: number;
    rahmenbreite?: number;
    fluegelTyp?: Opening['fluegelTyp'];
    oeffnetNachAussen?: boolean;
  }) => {
    const naechsterTyp = patch.fensterTyp ?? typ;
    const naechsterFluegel = patch.fluegelTyp ?? opening.fluegelTyp;
    const naechsteRichtung = patch.oeffnetNachAussen ?? opening.oeffnetNachAussen;
    try {
      runCommand('design.fensterParametrieren', {
        openingId: opening.id,
        fensterTyp: naechsterTyp,
        teilungN: patch.teilungN ?? n,
        teilungM: patch.teilungM ?? m,
        rahmenbreite: patch.rahmenbreite ?? rahmenbreite,
        ...(naechsterTyp !== 'fensterband' && opening.swing ? { swing: opening.swing } : {}),
        ...(naechsterFluegel !== undefined ? { fluegelTyp: naechsterFluegel } : {}),
        ...(naechsteRichtung !== undefined ? { oeffnetNachAussen: naechsteRichtung } : {}),
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
          className="dp-feld-voll"
          disabled={disabled}
        >
          {FENSTERTYP_OPTIONEN.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </KSelect>
      </Row>
      <Row label="Teilung">
        <span className="dp-zahlfeld">
          <KInput
            size="sm"
            mono
            type="number"
            key={`n-${n}`}
            defaultValue={n}
            data-testid="fenster-teilung-n"
            disabled={disabled}
            onBlur={(e) => {
              const v = Number(e.target.value);
              if (Number.isFinite(v) && v !== n) parametrieren({ teilungN: v });
            }}
            onKeyDown={(e) => e.key === 'Enter' && (e.target as HTMLInputElement).blur()}
            className="dp-zahlfeld-schmal"
          />
          <span className="dp-einheit">×</span>
          <KInput
            size="sm"
            mono
            type="number"
            key={`m-${m}`}
            defaultValue={m}
            data-testid="fenster-teilung-m"
            disabled={disabled}
            onBlur={(e) => {
              const v = Number(e.target.value);
              if (Number.isFinite(v) && v !== m) parametrieren({ teilungM: v });
            }}
            onKeyDown={(e) => e.key === 'Enter' && (e.target as HTMLInputElement).blur()}
            className="dp-zahlfeld-schmal"
          />
        </span>
      </Row>
      <Row label="Rahmen">
        <NumberField
          value={rahmenbreite}
          suffix="mm"
          testid="fenster-rahmenbreite"
          onCommit={(v) => parametrieren({ rahmenbreite: v })}
          disabled={disabled}
        />
      </Row>
      <Row label="Flügeltyp">
        <KSelect
          size="sm"
          data-testid="fluegel-typ"
          value={fluegel}
          onChange={(e) => parametrieren({ fluegelTyp: e.target.value as Opening['fluegelTyp'] })}
          className="dp-feld-voll"
          disabled={disabled}
        >
          {FLUEGELTYP_OPTIONEN.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </KSelect>
      </Row>
      <Row label="Öffnet">
        <label className="dp-checkbox-zeile">
          <input
            type="checkbox"
            data-testid="fluegel-oeffnet-aussen"
            checked={oeffnetNachAussen}
            disabled={disabled}
            onChange={(e) => parametrieren({ oeffnetNachAussen: e.target.checked })}
          />
          <span className="dp-einheit">nach aussen (gestrichelt)</span>
        </label>
      </Row>
    </>
  );
}

/** Beschlag-Katalog S0 (v0.7.3 D6, docs/V073-GESTALTUNG-SPEZ.md §D6):
 * Band/Griffseite/Motorantrieb/Absturzsicherung — additiv über
 * `design.beschlagSetzen`. Sichtbar wird der Katalog erst im Werkplan
 * (`derive/plan.ts`, Daten-Guard); die Felder lassen sich aber in jeder
 * Phase setzen (wie `fluegelTyp`). BRH (Brüstungshöhe) trägt kein eigenes
 * Feld — sie kommt aus `sill` (Zeile «Masse» oben zeigt Breite×Höhe, nicht
 * die Brüstung; ein eigenes BRH-Feld wäre hier Doppelspurigkeit). */
/** Kategorie-Reihenfolge + deutsche Labels für den S2-Katalog-Unterabschnitt
 * (v0.7.5 Welle 1 A1) — Reihenfolge folgt der fachlichen Gliederung des
 * Katalogs selbst (`derive/beschlag.ts` BeschlagKategorie). */
const BESCHLAG_KATEGORIE_LABEL: Record<BeschlagKategorie, string> = {
  tuer: 'Tür',
  fenster: 'Fenster',
  sicherheit: 'Sicherheit',
};
const BESCHLAG_KATEGORIEN: BeschlagKategorie[] = ['tuer', 'fenster', 'sicherheit'];

function BeschlagAbschnitt({
  opening,
  runCommand,
  disabled = false,
}: {
  opening: Opening;
  runCommand: (commandId: string, params: unknown) => unknown;
  /** v0.8.9 E2 (PA2): gesperrtes Wirtselement — Beschlag-Katalog gilt als
   *  Editieren desselben Elements und wird darum mitgesperrt. */
  disabled?: boolean;
}) {
  const setzen = (patch: {
    band?: Opening['band'];
    griffseite?: Opening['griffseite'];
    antrieb?: boolean;
    absturzsicherung?: boolean;
  }) => {
    try {
      runCommand('design.beschlagSetzen', { openingId: opening.id, ...patch });
    } catch (err) {
      meldeFehler(err);
    }
  };

  // Beschlag-Katalog S2 (v0.7.5 Welle 1 A1): Mehrfachauswahl aus
  // BESCHLAG_KATALOG (@kosmo/kernel), gruppiert nach Kategorie. Toggle
  // rechnet die neue Gesamtliste aus und ruft `design.beschlaegeSetzen` mit
  // der VOLLEN Liste (der Command ersetzt, mischt nicht) — wie
  // `design.moebelSetzen` ein Katalog-Feld setzt.
  const zugewiesen = opening.beschlaege ?? [];
  const toggleBeschlag = (key: string) => {
    const naechste = zugewiesen.includes(key)
      ? zugewiesen.filter((k) => k !== key)
      : [...zugewiesen, key];
    try {
      runCommand('design.beschlaegeSetzen', { openingId: opening.id, beschlaege: naechste });
    } catch (err) {
      meldeFehler(err);
    }
  };

  return (
    <>
      <Hairline />
      <Row label="Band">
        <KSelect
          size="sm"
          data-testid="beschlag-band"
          value={opening.band ?? ''}
          onChange={(e) => setzen({ band: (e.target.value || undefined) as Opening['band'] })}
          className="dp-feld-voll"
          disabled={disabled}
        >
          <option value="">—</option>
          <option value="links">Links</option>
          <option value="rechts">Rechts</option>
          <option value="oben">Oben</option>
          <option value="unten">Unten</option>
        </KSelect>
      </Row>
      <Row label="Griffseite">
        <KSelect
          size="sm"
          data-testid="beschlag-griffseite"
          value={opening.griffseite ?? ''}
          onChange={(e) => setzen({ griffseite: (e.target.value || undefined) as Opening['griffseite'] })}
          className="dp-feld-voll"
          disabled={disabled}
        >
          <option value="">—</option>
          <option value="links">Links</option>
          <option value="rechts">Rechts</option>
        </KSelect>
      </Row>
      <Row label="Antrieb">
        <input
          type="checkbox"
          data-testid="beschlag-antrieb"
          checked={opening.antrieb ?? false}
          disabled={disabled}
          onChange={(e) => setzen({ antrieb: e.target.checked })}
        />
      </Row>
      <Row label="Absturz">
        <input
          type="checkbox"
          data-testid="beschlag-absturzsicherung"
          checked={opening.absturzsicherung ?? false}
          disabled={disabled}
          onChange={(e) => setzen({ absturzsicherung: e.target.checked })}
        />
      </Row>
      <div className="dp-beschlag-katalog">
        <span className="dp-beschlag-titel">
          Beschlag-Katalog
        </span>
        {BESCHLAG_KATEGORIEN.map((kategorie) => (
          <div key={kategorie} className="dp-beschlag-kategorie">
            <span className="dp-beschlag-kategorie-titel">{BESCHLAG_KATEGORIE_LABEL[kategorie]}</span>
            <div className="dp-beschlag-typen">
              {BESCHLAG_KATALOG.filter((t) => t.kategorie === kategorie).map((typ) => (
                <label
                  key={typ.key}
                  className="dp-beschlag-typ"
                >
                  <input
                    type="checkbox"
                    data-testid={`beschlag-s2-${typ.key}`}
                    checked={zugewiesen.includes(typ.key)}
                    disabled={disabled}
                    onChange={() => toggleBeschlag(typ.key)}
                  />
                  <span>{typ.name}</span>
                </label>
              ))}
            </div>
          </div>
        ))}
      </div>
    </>
  );
}
