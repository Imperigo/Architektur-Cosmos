import { KInput } from '@kosmo/ui';
import { useProject } from '../../state/project-store';

/**
 * Projekt-Stammdaten (v0.7.5 Welle 2 A2, Owner-Punkt A2) — Bauherr, Adresse,
 * Parzellennummer, Verfasser:in + Projektname-Umbenennen. Sitzt im
 * Projekt-Menü (`DesignWorkspace.tsx`, `projektMenuOffen`) neben Phase/
 * Teilphase/Darstellung — dieselbe Fokus-Stufe «selten» (T7): Stammdaten
 * wechseln über Jahre kaum.
 *
 * Jedes Feld committet erst bei Blur (nicht bei jedem Tastendruck) als
 * `design.projektInfoSetzen`/`design.projektNameSetzen` — EIN Command pro
 * Änderung, undo-fähig, wie das Zonen-Namensfeld in `Inspector.tsx`
 * (`defaultValue` + `key`-Remount bei externer Änderung statt Controlled-
 * Input, sonst tippt man gegen den Undo-Stack).
 *
 * EHRLICH (s. `docs/V075-STAMMDATEN.md`): die Daten laufen wie jede
 * `DocSettings`-Änderung über Undo/Vault(IndexedDB)/`.kosmo`-Export, sind
 * aber (noch) NICHT live-kollaborativ zwischen offenen Sitzungen —
 * `SyncClient` synct heute nur `entities`, keine SettingsPatches. Vertagt an
 * `@kosmo/sync`, kein Bug dieser Runde.
 */
export function StammdatenPanel() {
  const revision = useProject((s) => s.revision);
  const runCommand = useProject((s) => s.runCommand);
  // Nicht-reaktiver Direktlesezugriff (wie `KvPanel`/`StandortSuche`): der
  // `revision`-Abo oben löst den Re-Render aus, `getState()` liefert
  // innerhalb dieses Renders den frischen Doc-Stand.
  void revision;
  const doc = useProject.getState().doc;
  const projekt = doc.settings.projekt;

  const felder: { feld: 'bauherr' | 'adresse' | 'parzelleNr' | 'verfasser'; label: string; testid: string; breite: number }[] = [
    { feld: 'bauherr', label: 'Bauherr', testid: 'stammdaten-bauherr', breite: 170 },
    { feld: 'adresse', label: 'Adresse', testid: 'stammdaten-adresse', breite: 190 },
    { feld: 'parzelleNr', label: 'Parzelle Nr.', testid: 'stammdaten-parzelle-nr', breite: 90 },
    { feld: 'verfasser', label: 'Verfasser', testid: 'stammdaten-verfasser', breite: 170 },
  ];

  return (
    <span data-testid="stammdaten-panel" style={{ display: 'inline-flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
      <label
        style={{ fontSize: 12, color: 'var(--k-ink-faint)', display: 'flex', alignItems: 'center', gap: 5 }}
        title="Erscheint versal im Plankopf-Titel jedes Plans/Blatts."
      >
        Projektname
        <KInput
          size="sm"
          defaultValue={doc.settings.projectName}
          key={`projektname-${doc.settings.projectName}`}
          data-testid="stammdaten-projektname"
          onBlur={(e) => {
            const wert = e.target.value.trim();
            if (wert.length > 0 && wert !== doc.settings.projectName) {
              runCommand('design.projektNameSetzen', { name: wert });
            }
          }}
          style={{ width: 170 }}
        />
      </label>
      {felder.map(({ feld, label, testid, breite }) => {
        const bisher = projekt?.[feld] ?? '';
        return (
          <label key={feld} style={{ fontSize: 12, color: 'var(--k-ink-faint)', display: 'flex', alignItems: 'center', gap: 5 }}>
            {label}
            <KInput
              size="sm"
              defaultValue={bisher}
              key={`${feld}-${bisher}`}
              data-testid={testid}
              onBlur={(e) => {
                const wert = e.target.value;
                if (wert !== bisher) runCommand('design.projektInfoSetzen', { [feld]: wert });
              }}
              style={{ width: breite }}
            />
          </label>
        );
      })}
    </span>
  );
}
