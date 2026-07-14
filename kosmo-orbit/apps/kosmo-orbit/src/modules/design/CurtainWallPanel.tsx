import { useState } from 'react';
import type { Fassadenrichtung, Storey } from '@kosmo/kernel';
import { Badge, Hairline, KButton, KIcon, KInput, KSelect, melde, meldeFehler, moduleHue } from '@kosmo/ui';
import { useProject } from '../../state/project-store';

const RICHTUNG_OPTIONEN: Array<{ value: Fassadenrichtung; label: string }> = [
  { value: 'sued', label: 'Süd' },
  { value: 'nord', label: 'Nord' },
  { value: 'west', label: 'West' },
  { value: 'ost', label: 'Ost' },
];

/**
 * Fensterband/Curtain-Wall v1 setzen (v0.6.9 Stream F,
 * docs/FENSTER-KONZEPT.md §2/§3) — kleiner Dialog nach dem Muster von
 * RasterPanel.tsx: Geschoss + Richtung + Pfostenraster, «Fensterband
 * setzen» läuft über `design.curtainWallSetzen` (Undo/Sync/Kosmo-sichtbar).
 * Riegelraster/Rahmenbreite/Brüstung/Sturz bleiben bewusst aussen vor — der
 * Command trägt für sie zod-Defaults, dieser Dialog deckt genau die drei
 * beauftragten Felder ab.
 */
export function CurtainWallPanel({ onClose }: { onClose: () => void }) {
  const runCommand = useProject((s) => s.runCommand);
  const activeStoreyId = useProject((s) => s.activeStoreyId);
  const doc = useProject.getState().doc;
  const storeys = doc.byKind<Storey>('storey');

  const [storeyId, setStoreyId] = useState(activeStoreyId ?? storeys[0]?.id ?? '');
  const [richtung, setRichtung] = useState<Fassadenrichtung>('sued');
  const [pfostenraster, setPfostenraster] = useState(1200);

  return (
    <div
      data-testid="cw-setzen-panel"
      className="k-dialog"
      style={{
        zIndex: 20,
        background: 'var(--k-raised)',
        border: '1px solid var(--k-technik)',
        boxShadow: 'var(--k-shadow-overlay)',
        padding: 'var(--k-s4)',
        display: 'grid',
        gap: 'var(--k-s4)',
        fontSize: 'var(--k-t-sm)',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--k-s3)' }}>
        <Badge hue={moduleHue.design}>Fensterband / Curtain-Wall</Badge>
        <div style={{ flex: 1 }} />
        <KButton size="sm" tone="ghost" onClick={onClose} aria-label="Schliessen">
          <KIcon name="schliessen" size={14} />
        </KButton>
      </div>
      <Hairline />

      <label style={{ display: 'grid', gap: 4 }}>
        Geschoss
        <KSelect
          size="sm"
          data-testid="cw-setzen-geschoss"
          value={storeyId}
          onChange={(e) => setStoreyId(e.target.value)}
          style={{ width: '100%' }}
        >
          {storeys.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </KSelect>
      </label>

      <label style={{ display: 'grid', gap: 4 }}>
        Richtung
        <KSelect
          size="sm"
          data-testid="cw-setzen-richtung"
          value={richtung}
          onChange={(e) => setRichtung(e.target.value as Fassadenrichtung)}
          style={{ width: '100%' }}
        >
          {RICHTUNG_OPTIONEN.map((r) => (
            <option key={r.value} value={r.value}>
              {r.label}
            </option>
          ))}
        </KSelect>
      </label>

      <label style={{ display: 'grid', gap: 4 }}>
        Pfostenraster
        <span style={{ display: 'flex', alignItems: 'center', gap: 'var(--k-s2)' }}>
          <KInput
            size="sm"
            mono
            type="number"
            min={300}
            data-testid="cw-setzen-raster"
            value={pfostenraster}
            onChange={(e) => setPfostenraster(Math.max(300, Number(e.target.value) || 1200))}
            style={{ width: 90 }}
          />
          <span style={{ color: 'var(--k-ink-faint)' }}>mm</span>
        </span>
      </label>

      <KButton
        size="sm"
        tone="accent"
        data-testid="cw-setzen-anwenden"
        onClick={() => {
          if (!storeyId) {
            meldeFehler('Kein Geschoss vorhanden — zuerst ein Geschoss anlegen.');
            return;
          }
          try {
            runCommand('design.curtainWallSetzen', { storeyId, richtung, pfostenraster });
            melde('Fensterband gesetzt.', { ton: 'erfolg' });
            onClose();
          } catch (err) {
            meldeFehler(err);
          }
        }}
      >
        Fensterband setzen
      </KButton>
    </div>
  );
}
