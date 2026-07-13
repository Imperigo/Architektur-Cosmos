import type { CSSProperties } from 'react';
import { KButton, KIcon } from '@kosmo/ui';

/**
 * GovernanceGate (v0.7.6 Welle 2, Companion/ClaudeDesign-Soll §8.1+§10) — der
 * EINE echte Neubau dieser Welle: eine abgestufte Freigabe-Karte, additiv
 * zum bestehenden BINÄREN Anwenden/Ablehnen (`KosmoPanel.tsx` `applyCard`/
 * `rejectCard`, `apply-proposal`/`apply-paket`, unverändert). Wiederverwendet
 * von `KosmoPanel.tsx` (echte Kosmo-Vorschläge, `proposal-card`) UND
 * `Companion.tsx` (echte Vis-Render-Freigaben, `companion-job-*`).
 *
 * Vier Aktionen, deutsch, jede mit ECHTER Wirkung (Owner-Auftrag, wörtlich
 * «die vier Aktionen müssen echte Wirkung haben»):
 *  - «Einmal erlauben»      → IMMER verdrahtet, die bereits bestehende
 *                             Anwenden-Aktion (nur umbenannt/eingeordnet).
 *  - «Für den Job erlauben» → NUR anzeigen, wenn der Aufrufer einen echten
 *                             Auto-Anwenden-Unterbau übergibt (`onFuerJob`).
 *                             Fehlt er, zeigt die Karte ehrlich «kommt noch»
 *                             statt eines wirkungslosen Knopfs vorzutäuschen.
 *  - «Nachfragen»           → Status quo — die Karte bleibt offen, optional
 *                             eine Rückmeldung (`onNachfragen`, z.B. ein
 *                             Toast). KEIN Fake-Fortschritt.
 *  - «Ablehnen»             → IMMER verdrahtet, echte Ablehnung
 *                             (`rejectCard`/`abbrechenJob`, je nach Aufrufer).
 *
 * Risk-Level (`risiko`) nur, wenn der Aufrufer ihn übergibt — diese
 * Komponente erfindet nie selbst eine Einstufung (Owner-Auftrag: «Risk-Level
 * nur zeigen, wenn real ableitbar»).
 */

export interface GovernanceMetaZeile {
  label: string;
  wert: string;
}

export interface GovernanceRisiko {
  /** z.B. «L1» / «L2» / «8 Schritte ≥ Schwelle» — der Aufrufer entscheidet den Text. */
  label: string;
  ton: 'niedrig' | 'mittel' | 'hoch';
}

export interface GovernanceGateProps {
  /** data-testid des äusseren Rahmens. */
  testid: string;
  titel: string;
  unterzeile?: string;
  risiko?: GovernanceRisiko;
  meta?: readonly GovernanceMetaZeile[];
  onEinmal: () => void;
  einmalTestid: string;
  /** Läuft die Freigabe gerade (echter Netzwerk-Roundtrip, z.B. Bridge-
   *  Approve)? Zeigt «… läuft» statt eines stummen Doppelklick-Risikos. */
  einmalLaeuft?: boolean;
  /** Auto-Anwenden-Unterbau — `undefined` = ehrlich «kommt noch» statt Attrappe. */
  onFuerJob?: () => void;
  fuerJobAktiv?: boolean;
  fuerJobTestid?: string;
  onAblehnen: () => void;
  ablehnenTestid: string;
  ablehnenLaeuft?: boolean;
  onNachfragen?: () => void;
  nachfragenTestid?: string;
}

const RISK_FARBE: Record<GovernanceRisiko['ton'], string> = {
  niedrig: 'var(--k-success)',
  mittel: 'var(--k-warning)',
  hoch: 'var(--k-danger)',
};

const MONO_LABEL: CSSProperties = {
  fontFamily: 'var(--k-font-mono)',
  fontSize: 10,
  letterSpacing: '0.12em',
  textTransform: 'uppercase',
};

/** Wiederverwendbare Risk-Pille (auch von `KosmoPanel.tsx`s `paket-card`
 *  genutzt, wo eine eigenständige Karte OHNE die volle Vier-Aktionen-Gate
 *  einen ehrlich ableitbaren Risiko-Hinweis zeigt — s. dortiger Kommentar). */
export function RisikoPill({ risiko, testid }: { risiko: GovernanceRisiko; testid?: string }) {
  return (
    <span
      data-testid={testid ?? 'governance-risiko'}
      style={{
        ...MONO_LABEL,
        flex: '0 0 auto',
        fontWeight: 600,
        padding: '3px 9px',
        borderRadius: 'var(--k-radius-pill)',
        color: RISK_FARBE[risiko.ton],
        background: `color-mix(in srgb, ${RISK_FARBE[risiko.ton]} 14%, transparent)`,
        border: `1px solid color-mix(in srgb, ${RISK_FARBE[risiko.ton]} 45%, transparent)`,
      }}
    >
      Risk · {risiko.label}
    </span>
  );
}

export function GovernanceGate({
  testid,
  titel,
  unterzeile,
  risiko,
  meta,
  onEinmal,
  einmalTestid,
  einmalLaeuft = false,
  onFuerJob,
  fuerJobAktiv = false,
  fuerJobTestid,
  onAblehnen,
  ablehnenTestid,
  ablehnenLaeuft = false,
  onNachfragen,
  nachfragenTestid,
}: GovernanceGateProps) {
  return (
    <div
      data-testid={testid}
      className="k-glass"
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 14,
        padding: 16,
        border: '1px solid color-mix(in srgb, var(--k-warning) 40%, var(--k-line))',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
        <KIcon name="schloss" size={14} title="Governance · Freigabe" style={{ color: 'var(--k-warning)' }} />
        <span style={{ ...MONO_LABEL, color: 'var(--k-warning)' }}>Governance · Freigabe</span>
      </div>

      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 14 }}>
        <div>
          <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--k-ink)' }}>{titel}</div>
          {unterzeile && (
            <div style={{ fontSize: 12.5, color: 'var(--k-ink-soft)', marginTop: 3 }}>{unterzeile}</div>
          )}
        </div>
        {risiko && <RisikoPill risiko={risiko} />}
      </div>

      {meta && meta.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: '4px 16px', fontSize: 12 }}>
          {meta.map((m) => (
            <div key={m.label} style={{ display: 'contents' }}>
              <span style={{ ...MONO_LABEL, color: 'var(--k-ink-faint)' }}>{m.label}</span>
              <span style={{ fontFamily: 'var(--k-font-mono)', color: 'var(--k-ink-soft)' }}>{m.wert}</span>
            </div>
          ))}
        </div>
      )}

      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <KButton size="sm" tone="accent" data-testid={einmalTestid} disabled={einmalLaeuft} onClick={onEinmal}>
          {einmalLaeuft ? 'Erlaube …' : 'Einmal erlauben'}
        </KButton>
        {onFuerJob ? (
          <KButton
            size="sm"
            tone={fuerJobAktiv ? 'accent' : 'quiet'}
            data-testid={fuerJobTestid ?? 'governance-fuer-job'}
            onClick={onFuerJob}
          >
            {fuerJobAktiv ? 'Für den Job erlaubt · widerrufen' : 'Für den Job erlauben'}
          </KButton>
        ) : (
          <KButton
            size="sm"
            tone="quiet"
            disabled
            title="Kommt noch — für diesen Vorschlagstyp gibt es noch kein echtes Auto-Anwenden."
          >
            Für den Job erlauben (kommt)
          </KButton>
        )}
        <KButton
          size="sm"
          tone="ghost"
          data-testid={nachfragenTestid ?? 'governance-nachfragen'}
          onClick={() => onNachfragen?.()}
        >
          Nachfragen
        </KButton>
        <KButton
          size="sm"
          tone="danger"
          data-testid={ablehnenTestid}
          disabled={ablehnenLaeuft}
          onClick={onAblehnen}
        >
          {ablehnenLaeuft ? 'Lehne ab …' : 'Ablehnen'}
        </KButton>
      </div>
    </div>
  );
}
