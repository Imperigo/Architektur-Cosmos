import type { CSSProperties } from 'react';
import type { RefEntry } from '@kosmo/data';
import { KIcon } from '@kosmo/ui';
import { RefHeroBild } from './RefHeroBild';
import { epocheVonEntry } from './epochen';
import { REF_STATUS_FARBE, REF_STATUS_LABEL, refStationStatus } from './ref-ableitung';

/**
 * Mittlere Spalte der Datenstationen-Fläche (Soll-Bild `Kosmo Viz
 * Datenstationen.dc.html`, README §10 — Bild-Vorlage, nicht Laufzeit-Code):
 * der «Referenzkatalog» als Tabelle statt Karten-Grid. Spalten ID / Objekt /
 * Quelle / Epoche / Material / Status — Mono-IDs, Material als Pills,
 * Status-Farben exakt wie im Handoff benannt (INDEXIERT `--k-signal`, SYNC
 * `--k-rolle-agent`, LOKAL `--k-rolle-pn`, s. `ref-ableitung.ts`).
 *
 * VERTRAG (E2E, unangetastet): jede Zeile trägt weiterhin
 * `data-testid="ref-card"` (Karte→Zeile ist Umgestaltung, kein Vertragsbruch
 * — die Tests prüfen "existiert + klickt ins Dossier", nicht die Geometrie),
 * der Sammlung-Stern bleibt `stern-${id}`, und `RefHeroBild` liefert
 * weiterhin `karte-leerbild`/`img`/`ref-bild-quelle` innerhalb der Zeile
 * (K1-Vertrag, `kosmodata-sichtbar.spec.ts`).
 */

const monoLabel: CSSProperties = {
  fontFamily: 'var(--k-font-mono)',
  fontSize: 10,
  letterSpacing: '0.14em',
  textTransform: 'uppercase',
  color: 'var(--k-ink-faint)',
};

const SPALTEN = '88px 2.1fr 1.3fr 1fr 1.2fr 104px';

export function ReferenzTabelle({
  entries,
  selectedId,
  onSelect,
  sammlung,
  toggleSammlung,
}: {
  entries: readonly RefEntry[];
  selectedId: string | null;
  onSelect: (e: RefEntry) => void;
  sammlung: Set<string>;
  toggleSammlung: (id: string) => void;
}) {
  return (
    <div
      data-testid="referenz-tabelle"
      style={{
        flex: 1,
        minWidth: 0,
        border: '1px solid var(--k-line)',
        borderRadius: 'var(--k-radius-md)',
        background: 'var(--k-surface)',
      }}
    >
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: SPALTEN,
          gap: 'var(--k-s3)',
          padding: '0 var(--k-s4)',
          height: 34,
          alignItems: 'center',
          background: 'var(--k-field)',
          borderBottom: '1px solid var(--k-line)',
          borderTopLeftRadius: 'var(--k-radius-md)',
          borderTopRightRadius: 'var(--k-radius-md)',
        }}
      >
        <span style={monoLabel}>ID</span>
        <span style={monoLabel}>Objekt</span>
        <span style={monoLabel}>Quelle</span>
        <span style={monoLabel}>Epoche</span>
        <span style={monoLabel}>Material</span>
        <span style={monoLabel}>Status</span>
      </div>
      <div>
        {entries.map((e) => (
          <ReferenzZeile
            key={e.id}
            entry={e}
            aktiv={e.id === selectedId}
            onSelect={onSelect}
            imSammlung={sammlung.has(e.id)}
            toggleSammlung={toggleSammlung}
          />
        ))}
      </div>
    </div>
  );
}

function ReferenzZeile({
  entry: e,
  aktiv,
  onSelect,
  imSammlung,
  toggleSammlung,
}: {
  entry: RefEntry;
  aktiv: boolean;
  onSelect: (e: RefEntry) => void;
  imSammlung: boolean;
  toggleSammlung: (id: string) => void;
}) {
  const epoche = epocheVonEntry(e);
  const status = refStationStatus(e);
  const statusFarbe = REF_STATUS_FARBE[status];
  const materialienDetail = e.materials_detail?.primary;
  const materialien = materialienDetail && materialienDetail.length > 0 ? materialienDetail : (e.materials ?? []);

  return (
    <div
      data-testid="ref-card"
      onClick={() => onSelect(e)}
      style={{
        display: 'grid',
        gridTemplateColumns: SPALTEN,
        gap: 'var(--k-s3)',
        alignItems: 'center',
        padding: 'var(--k-s2) var(--k-s4)',
        borderLeft: aktiv ? '3px solid var(--k-accent)' : '3px solid transparent',
        borderBottom: '1px solid var(--k-line)',
        cursor: 'pointer',
        background: aktiv ? 'var(--k-accent-wash)' : 'transparent',
      }}
    >
      <span
        title={e.id}
        style={{
          fontFamily: 'var(--k-font-mono)',
          fontSize: 11,
          letterSpacing: '0.03em',
          textTransform: 'uppercase',
          color: 'var(--k-ink-faint)',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}
      >
        {e.id}
      </span>

      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--k-s2)', minWidth: 0 }}>
        <button
          aria-label="Zur Sammlung"
          data-testid={`stern-${e.id}`}
          className="k-druck"
          onClick={(ev) => {
            ev.stopPropagation();
            toggleSammlung(e.id);
          }}
          style={{
            border: 'none',
            background: 'transparent',
            padding: 0,
            margin: 0,
            font: 'inherit',
            cursor: 'pointer',
            display: 'grid',
            placeItems: 'center',
            flex: 'none',
            color: imSammlung ? 'var(--k-warning)' : 'var(--k-ink-faint)',
          }}
        >
          <KIcon name={imSammlung ? 'stern-voll' : 'stern'} size={14} title="Zur Sammlung" />
        </button>
        <div style={{ width: 40, flex: 'none' }}>
          <RefHeroBild entry={e} signetGroesse={18} />
        </div>
        <div style={{ minWidth: 0, display: 'grid' }}>
          <span
            style={{
              fontSize: 'var(--k-t-sm)',
              fontWeight: 550,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {e.title}
          </span>
          <span style={{ fontSize: 'var(--k-t-xs)', color: 'var(--k-ink-faint)' }}>
            {[e.city, e.country].filter(Boolean).join(', ') || '—'}
          </span>
        </div>
      </div>

      <span
        title={e.source_quality ?? ''}
        style={{
          fontSize: 'var(--k-t-xs)',
          color: 'var(--k-ink-soft)',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}
      >
        {e.source_quality ? e.source_quality.replace(/_/g, ' ') : '—'}
      </span>

      <span style={{ fontSize: 'var(--k-t-xs)', color: 'var(--k-ink-soft)' }}>{epoche ? epoche.label : '—'}</span>

      <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', alignItems: 'center' }}>
        {materialien.length === 0 ? (
          <span style={{ fontSize: 'var(--k-t-xs)', color: 'var(--k-ink-faint)' }}>—</span>
        ) : (
          <>
            {materialien.slice(0, 2).map((m) => (
              <span
                key={m}
                style={{
                  fontSize: 'var(--k-t-xs)',
                  padding: '1px 7px',
                  borderRadius: 999,
                  background: 'var(--k-field)',
                  border: '1px solid var(--k-line)',
                  color: 'var(--k-ink-soft)',
                  whiteSpace: 'nowrap',
                }}
              >
                {m}
              </span>
            ))}
            {materialien.length > 2 && (
              <span style={{ fontSize: 'var(--k-t-xs)', color: 'var(--k-ink-faint)' }}>+{materialien.length - 2}</span>
            )}
          </>
        )}
      </div>

      <span
        style={{
          justifySelf: 'start',
          fontFamily: 'var(--k-font-mono)',
          fontSize: 10,
          fontWeight: 600,
          letterSpacing: '0.08em',
          padding: '3px 8px',
          borderRadius: 999,
          color: statusFarbe,
          background: `color-mix(in srgb, ${statusFarbe} 14%, transparent)`,
          border: `1px solid color-mix(in srgb, ${statusFarbe} 45%, transparent)`,
        }}
      >
        {REF_STATUS_LABEL[status]}
      </span>
    </div>
  );
}
