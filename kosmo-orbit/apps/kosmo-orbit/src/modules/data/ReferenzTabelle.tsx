import type { RefEntry } from '@kosmo/data';
import { KIcon } from '@kosmo/ui';
import './data.css';
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
 *
 * v0.8.0B / W6 (Spez §2 Gesetz 5-Ausnahme «Tabellen bleiben Tabellen», Gesetz
 * 8 «Hairlines statt Kästen», Gesetz 10 «Status nie nur Farbe»): Inline-Styles
 * → `data.css`-Klassen (`kd-tabelle-*`); die Fläche verliert den umlaufenden
 * Kasten-Rahmen zugunsten der bestehenden Kopf-/Zeilen-Hairlines; der
 * Status-Chip bekommt einen 6px-Punkt vor dem Mono-Label. `gridTemplateColumns`
 * bleibt der einzige Inline-Rest (gemeinsame Konstante `SPALTEN`).
 */

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
    <div data-testid="referenz-tabelle" className="kd-tabelle">
      <div className="kd-tabelle-kopf" style={{ gridTemplateColumns: SPALTEN }}>
        <span className="kd-tabelle-kopf-label">ID</span>
        <span className="kd-tabelle-kopf-label">Objekt</span>
        <span className="kd-tabelle-kopf-label">Quelle</span>
        <span className="kd-tabelle-kopf-label">Epoche</span>
        <span className="kd-tabelle-kopf-label">Material</span>
        <span className="kd-tabelle-kopf-label">Status</span>
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
      className={`kd-tabelle-zeile${aktiv ? ' kd-tabelle-zeile--aktiv' : ''}`}
      style={{ gridTemplateColumns: SPALTEN }}
    >
      <span title={e.id} className="kd-tabelle-id">
        {e.id}
      </span>

      <div className="kd-tabelle-objekt">
        <button
          aria-label="Zur Sammlung"
          data-testid={`stern-${e.id}`}
          className={`k-druck kd-tabelle-stern${imSammlung ? ' kd-tabelle-stern--aktiv' : ''}`}
          onClick={(ev) => {
            ev.stopPropagation();
            toggleSammlung(e.id);
          }}
        >
          <KIcon name={imSammlung ? 'stern-voll' : 'stern'} size={14} title="Zur Sammlung" />
        </button>
        <div className="kd-tabelle-bild">
          <RefHeroBild entry={e} signetGroesse={18} />
        </div>
        <div className="kd-tabelle-titel-wrap">
          <span className="kd-tabelle-titel">{e.title}</span>
          <span className="kd-tabelle-ort">{[e.city, e.country].filter(Boolean).join(', ') || '—'}</span>
        </div>
      </div>

      <span title={e.source_quality ?? ''} className="kd-tabelle-quelle">
        {e.source_quality ? e.source_quality.replace(/_/g, ' ') : '—'}
      </span>

      <span className="kd-tabelle-epoche">{epoche ? epoche.label : '—'}</span>

      <div className="kd-tabelle-material-wrap">
        {materialien.length === 0 ? (
          <span className="kd-tabelle-material-leer">—</span>
        ) : (
          <>
            {materialien.slice(0, 2).map((m) => (
              <span key={m} className="kd-tabelle-material-pill">
                {m}
              </span>
            ))}
            {materialien.length > 2 && <span className="kd-tabelle-material-mehr">+{materialien.length - 2}</span>}
          </>
        )}
      </div>

      <span
        className="kd-tabelle-status"
        style={{
          color: statusFarbe,
          background: `color-mix(in srgb, ${statusFarbe} 14%, transparent)`,
          border: `1px solid color-mix(in srgb, ${statusFarbe} 45%, transparent)`,
        }}
      >
        <span aria-hidden className="kd-tabelle-status-punkt" style={{ background: statusFarbe }} />
        {REF_STATUS_LABEL[status]}
      </span>
    </div>
  );
}
