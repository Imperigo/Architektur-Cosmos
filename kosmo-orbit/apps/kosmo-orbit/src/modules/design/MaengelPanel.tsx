import { useMemo, useState } from 'react';
import {
  MANGEL_GEWERK_VORSCHLAEGE,
  deriveAbnahmeprotokoll,
  abnahmeprotokollSvg,
  ABNAHME_HINWEIS,
  siaPhaseLabel,
  type Mangel,
} from '@kosmo/kernel';
import { Badge, Hairline, Karteikarte, KButton, meldeFehler } from '@kosmo/ui';
import { useProject } from '../../state/project-store';

/**
 * Mängel-Panel — Abschlussphase «Gebäudeabnahme» (v0.6.3,
 * `docs/V063-VOLLPROJEKT-KONZEPT.md` Abschnitt 4, Lücken-Batch 5,
 * Owner-Hauptaufgabe K22): erfassen, Status umschalten, Abnahmeprotokoll
 * exportieren — gleiche Panel-Anordnung wie KV/Bauablauf (links neben dem
 * Plan), derselbe Ehrlichkeits-Grundsatz bleibt permanent sichtbar.
 *
 * AUSDRÜCKLICH kein rechtsgültiges Abnahmeprotokoll: `ABNAHME_HINWEIS` steht
 * hier UND im Export-SVG, nicht nur beim Export.
 */

const inputStyle: React.CSSProperties = {
  padding: '3px 6px',
  borderRadius: 'var(--k-radius-sm)',
  border: '1px solid var(--k-line-strong)',
  background: 'var(--k-raised)',
  fontSize: 12,
  fontFamily: 'inherit',
};

function heute(): string {
  return new Date().toLocaleDateString('de-CH');
}

export function MaengelPanel({ onClose }: { onClose: () => void }) {
  const revision = useProject((s) => s.revision);
  const runCommand = useProject((s) => s.runCommand);
  const doc = useProject.getState().doc;

  const maengel = useMemo(
    () => doc.byKind<Mangel>('mangel'),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [revision],
  );
  const protokoll = useMemo(
    () => deriveAbnahmeprotokoll(doc),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [revision],
  );

  const [ort, setOrt] = useState('');
  const [beschreibung, setBeschreibung] = useState('');
  const [gewerk, setGewerk] = useState('');
  const [frist, setFrist] = useState('');

  const bereitZumErfassen = ort.trim().length > 0 && beschreibung.trim().length > 0 && gewerk.trim().length > 0;

  const erfassen = () => {
    if (!bereitZumErfassen) return;
    try {
      runCommand('design.mangelErfassen', {
        ort: ort.trim(),
        beschreibung: beschreibung.trim(),
        gewerk: gewerk.trim(),
        erfasstAm: heute(),
        ...(frist.trim() ? { frist: frist.trim() } : {}),
      });
      setOrt('');
      setBeschreibung('');
      setGewerk('');
      setFrist('');
    } catch (err) {
      meldeFehler(err);
    }
  };

  const statusUmschalten = (m: Mangel) => {
    try {
      runCommand('design.mangelStatusSetzen', {
        mangelId: m.id,
        status: m.status === 'offen' ? 'behoben' : 'offen',
        ...(m.status === 'offen' ? { behobenAm: heute() } : {}),
      });
    } catch (err) {
      meldeFehler(err);
    }
  };

  const loeschen = (m: Mangel) => {
    try {
      runCommand('design.mangelLoeschen', { mangelId: m.id });
    } catch (err) {
      meldeFehler(err);
    }
  };

  const exportSvg = () => {
    const svg = abnahmeprotokollSvg(protokoll, {
      ...(doc.settings.projectName ? { titel: doc.settings.projectName } : {}),
      datum: heute(),
      siaPhase: doc.settings.siaPhase,
    });
    const blob = new Blob([svg], { type: 'image/svg+xml' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'abnahmeprotokoll.svg';
    a.click();
    URL.revokeObjectURL(a.href);
  };

  return (
    <div
      data-testid="maengel-panel"
      style={{
        position: 'absolute',
        left: 90,
        top: 52,
        zIndex: 20,
        width: 430,
        maxHeight: 'calc(100% - 90px)',
        overflow: 'auto',
        background: 'var(--k-raised)',
        border: '1px solid var(--k-technik)',
        boxShadow: 'var(--k-shadow-overlay)',
        padding: 12,
        display: 'grid',
        gap: 10,
        fontSize: 12.5,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <Badge hue="var(--k-mod-design)">Mängel</Badge>
        <div style={{ flex: 1 }} />
        <KButton size="sm" tone="ghost" onClick={exportSvg} data-testid="maengel-protokoll">
          Abnahmeprotokoll (SVG)
        </KButton>
        <KButton size="sm" tone="ghost" onClick={onClose} aria-label="Schliessen">
          ✕
        </KButton>
      </div>

      <div
        data-testid="maengel-hinweis"
        style={{
          background: 'var(--k-warning-wash, #f6f2e6)',
          border: '1px solid var(--k-warning-line, #c9bfa0)',
          borderRadius: 'var(--k-radius-sm)',
          padding: '8px 10px',
          fontWeight: 600,
          color: 'var(--k-ink)',
        }}
      >
        {ABNAHME_HINWEIS}
      </div>

      <div style={{ color: 'var(--k-ink-faint)', fontSize: 11.5 }}>
        {protokoll.anzahlOffen} offen / {protokoll.anzahlBehoben} behoben ({protokoll.anzahlTotal} total)
        {' · '}
        {siaPhaseLabel(doc.settings.siaPhase)}
      </div>

      <Hairline />

      <div data-testid="maengel-form" style={{ display: 'grid', gap: 6 }}>
        <div className="k-titel" style={{ fontSize: 12, color: 'var(--k-ink-soft)' }}>
          Mangel erfassen
        </div>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          <input
            data-testid="maengel-ort"
            placeholder="Ort, z.B. «Bad 2.OG»"
            value={ort}
            onChange={(e) => setOrt(e.target.value)}
            style={{ ...inputStyle, flex: '1 1 160px' }}
          />
          <input
            data-testid="maengel-gewerk"
            placeholder="Gewerk"
            list="maengel-gewerk-vorschlaege"
            value={gewerk}
            onChange={(e) => setGewerk(e.target.value)}
            style={{ ...inputStyle, flex: '1 1 140px' }}
          />
          <datalist id="maengel-gewerk-vorschlaege">
            {MANGEL_GEWERK_VORSCHLAEGE.map((g) => (
              <option key={g} value={g} />
            ))}
          </datalist>
          <input
            data-testid="maengel-frist"
            placeholder="Frist (optional)"
            value={frist}
            onChange={(e) => setFrist(e.target.value)}
            style={{ ...inputStyle, flex: '1 1 120px' }}
          />
        </div>
        <textarea
          data-testid="maengel-beschreibung"
          placeholder="Beschreibung"
          value={beschreibung}
          onChange={(e) => setBeschreibung(e.target.value)}
          rows={2}
          style={{ ...inputStyle, resize: 'vertical' }}
        />
        <KButton
          size="sm"
          tone="quiet"
          data-testid="maengel-erfassen"
          onClick={erfassen}
          disabled={!bereitZumErfassen}
        >
          Mangel erfassen
        </KButton>
      </div>

      <Hairline />

      {maengel.length === 0 ? (
        <div data-testid="maengel-leer" style={{ color: 'var(--k-ink-faint)' }}>
          Noch keine Mängel erfasst — die Liste bleibt leer, bis die Schlussbegehung beginnt.
        </div>
      ) : (
        <div data-testid="maengel-liste" style={{ display: 'grid', gap: 6 }}>
          {maengel.map((m, i) => (
            <Karteikarte key={m.id} nr={i + 1} data-testid={`maengel-zeile-${m.id}`}>
              <div style={{ display: 'grid', gap: 3 }}>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                  <span style={{ fontWeight: 600 }}>{m.ort}</span>
                  <Badge hue={m.status === 'behoben' ? 'var(--k-success)' : 'var(--k-warning)'}>{m.gewerk}</Badge>
                  <div style={{ flex: 1 }} />
                  <KButton
                    size="sm"
                    tone="quiet"
                    data-testid={`maengel-status-${m.id}`}
                    onClick={() => statusUmschalten(m)}
                  >
                    {m.status === 'offen' ? 'Als behoben markieren' : 'Wieder öffnen'}
                  </KButton>
                  <KButton
                    size="sm"
                    tone="ghost"
                    aria-label="Mangel löschen"
                    data-testid={`maengel-loeschen-${m.id}`}
                    onClick={() => loeschen(m)}
                  >
                    ✕
                  </KButton>
                </div>
                <span style={{ fontSize: 11.5, color: 'var(--k-ink-soft)' }}>{m.beschreibung}</span>
                <span style={{ fontSize: 11, color: 'var(--k-ink-faint)' }}>
                  {m.status === 'behoben' ? `Behoben ${m.behobenAm ?? ''}` : `Erfasst ${m.erfasstAm}`}
                  {m.frist ? ` · Frist ${m.frist}` : ''}
                </span>
              </div>
            </Karteikarte>
          ))}
        </div>
      )}

      <Hairline />

      <span style={{ color: 'var(--k-ink-faint)', fontSize: 11 }}>
        Nur ein interner Anstoss zur Schlussbegehung, kein rechtsgültiges Abnahmeprotokoll — die reale Abnahme
        (Bauherr, Architekt, Unternehmer vor Ort) bleibt Sache der Parteien (SIA 118).
      </span>
    </div>
  );
}
