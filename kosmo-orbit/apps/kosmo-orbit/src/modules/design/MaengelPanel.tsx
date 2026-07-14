import { useMemo, useState } from 'react';
import {
  MANGEL_GEWERK_VORSCHLAEGE,
  deriveAbnahmeprotokoll,
  abnahmeprotokollSvg,
  ABNAHME_HINWEIS,
  siaPhaseLabel,
  type Mangel,
} from '@kosmo/kernel';
import { Badge, Hairline, Karteikarte, KButton, KIcon, KInput, meldeFehler } from '@kosmo/ui';
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
        zIndex: 20,
        overflow: 'auto',
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
        <Badge hue="var(--k-mod-design)">Mängel</Badge>
        <div style={{ flex: 1 }} />
        <KButton size="sm" tone="ghost" onClick={exportSvg} data-testid="maengel-protokoll">
          Abnahmeprotokoll (SVG)
        </KButton>
        <KButton size="sm" tone="ghost" onClick={onClose} aria-label="Schliessen">
          <KIcon name="schliessen" size={14} />
        </KButton>
      </div>

      <div
        data-testid="maengel-hinweis"
        style={{
          background: 'var(--k-warning-wash, #f6f2e6)',
          border: '1px solid var(--k-warning-line, #c9bfa0)',
          borderRadius: 'var(--k-radius-sm)',
          padding: 'var(--k-s3) var(--k-s4)',
          fontWeight: 600,
          color: 'var(--k-ink)',
        }}
      >
        {ABNAHME_HINWEIS}
      </div>

      <div style={{ color: 'var(--k-ink-faint)', fontSize: 'var(--k-t-sm)' }}>
        {protokoll.anzahlOffen} offen / {protokoll.anzahlBehoben} behoben ({protokoll.anzahlTotal} total)
        {' · '}
        {siaPhaseLabel(doc.settings.siaPhase)}
      </div>

      <Hairline />

      <div data-testid="maengel-form" style={{ display: 'grid', gap: 'var(--k-s3)' }}>
        <div className="k-titel" style={{ fontSize: 'var(--k-t-lg)', color: 'var(--k-ink-soft)' }}>
          Mangel erfassen
        </div>
        <div style={{ display: 'flex', gap: 'var(--k-s3)', flexWrap: 'wrap' }}>
          <KInput
            size="sm"
            data-testid="maengel-ort"
            placeholder="Ort, z.B. «Bad 2.OG»"
            value={ort}
            onChange={(e) => setOrt(e.target.value)}
            style={{ flex: '1 1 160px' }}
          />
          <KInput
            size="sm"
            data-testid="maengel-gewerk"
            placeholder="Gewerk"
            list="maengel-gewerk-vorschlaege"
            value={gewerk}
            onChange={(e) => setGewerk(e.target.value)}
            style={{ flex: '1 1 140px' }}
          />
          <datalist id="maengel-gewerk-vorschlaege">
            {MANGEL_GEWERK_VORSCHLAEGE.map((g) => (
              <option key={g} value={g} />
            ))}
          </datalist>
          <KInput
            size="sm"
            data-testid="maengel-frist"
            placeholder="Frist (optional)"
            value={frist}
            onChange={(e) => setFrist(e.target.value)}
            style={{ flex: '1 1 120px' }}
          />
        </div>
        <textarea
          data-testid="maengel-beschreibung"
          placeholder="Beschreibung"
          value={beschreibung}
          onChange={(e) => setBeschreibung(e.target.value)}
          rows={2}
          className="k-input k-input--sm"
          style={{ resize: 'vertical' }}
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
        <div data-testid="maengel-liste" style={{ display: 'grid', gap: 'var(--k-s3)' }}>
          {maengel.map((m, i) => (
            <Karteikarte key={m.id} nr={i + 1} data-testid={`maengel-zeile-${m.id}`}>
              <div style={{ display: 'grid', gap: 'var(--k-s1)' }}>
                <div style={{ display: 'flex', gap: 'var(--k-s3)', alignItems: 'center', flexWrap: 'wrap' }}>
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
                    <KIcon name="schliessen" size={14} />
                  </KButton>
                </div>
                <span style={{ fontSize: 'var(--k-t-sm)', color: 'var(--k-ink-soft)' }}>{m.beschreibung}</span>
                <span style={{ fontSize: 'var(--k-t-xs)', color: 'var(--k-ink-faint)' }}>
                  {m.status === 'behoben' ? `Behoben ${m.behobenAm ?? ''}` : `Erfasst ${m.erfasstAm}`}
                  {m.frist ? ` · Frist ${m.frist}` : ''}
                </span>
              </div>
            </Karteikarte>
          ))}
        </div>
      )}

      <Hairline />

      <span style={{ color: 'var(--k-ink-faint)', fontSize: 'var(--k-t-xs)' }}>
        Nur ein interner Anstoss zur Schlussbegehung, kein rechtsgültiges Abnahmeprotokoll — die reale Abnahme
        (Bauherr, Architekt, Unternehmer vor Ort) bleibt Sache der Parteien (SIA 118).
      </span>
    </div>
  );
}
