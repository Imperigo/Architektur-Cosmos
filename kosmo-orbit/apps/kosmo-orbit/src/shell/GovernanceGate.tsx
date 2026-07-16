import type { CSSProperties } from 'react';
import { KButton, KIcon } from '@kosmo/ui';

/**
 * AUFGETAUT v0.8.1/P1 (Owner-Freigabe 16.07.2026, `docs/V081-SPEZ.md` §4.1
 * Entscheid 1/C-1) — GENAU EIN Zweck: die bestehenden `.k-approval*`-Klassen
 * (`packages/kosmo-ui/src/aura.css`, v0.8.0B/P2, B-46/B-99) endlich auf diese
 * Datei anwenden. Owner-Formel «auftauen, anwenden, einfrieren»: NUR
 * `className`-Ergänzungen + das Entfernen der dadurch überflüssig gewordenen
 * Inline-Styles — Struktur/Props/Logik/Texte/testids/aria sind BYTE-GLEICH
 * geblieben (Diff-Beweis: reine Klassen-Zeilen, keine JSX-Struktur-/Prop-
 * Änderung). `governance.spec`/alle Aufrufer (`KosmoPanel.tsx` `apply-
 * proposal`, `Companion.tsx` `companion-job-*`) unverändert grün. **Nach
 * dieser Anwendung ist die Datei WIEDER EINGEFROREN** — weitere Änderungen
 * brauchen erneut eine explizite Owner-Freigabe wie diese hier, kein
 * Dauerzugriff.
 */

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
      className="k-approval-risiko"
      style={{ ['--_risiko' as string]: RISK_FARBE[risiko.ton] }}
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
    <div data-testid={testid} className="k-glass k-approval">
      <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
        <KIcon name="schloss" size={14} title="Governance · Freigabe" style={{ color: 'var(--k-warning)' }} />
        <span style={{ ...MONO_LABEL, color: 'var(--k-warning)' }}>Governance · Freigabe</span>
      </div>

      <div className="k-approval-kopf">
        <div>
          <div className="k-approval-titel">{titel}</div>
          {unterzeile && <div className="k-approval-sub">{unterzeile}</div>}
        </div>
        {risiko && <RisikoPill risiko={risiko} />}
      </div>

      {meta && meta.length > 0 && (
        <div className="k-approval-meta">
          {meta.map((m) => (
            <div key={m.label} style={{ display: 'contents' }}>
              <span className="k-approval-meta-key">{m.label}</span>
              <span className="k-approval-meta-wert">{m.wert}</span>
            </div>
          ))}
        </div>
      )}

      <div className="k-approval-aktionen">
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
