import { useRef } from 'react';
import {
  PHASEN_MATRIX,
  sheetPlancode,
  siaZuMatrixStufe,
  type Sheet,
  type SheetLayout,
  type SheetPlankopf,
} from '@kosmo/kernel';
import { Badge, Hairline, KButton, KChip, KField, KIcon, melde, meldeFehler, moduleHue } from '@kosmo/ui';
import { useProject } from '../../state/project-store';

/**
 * PlankopfPanel (v0.8.0 P6, `docs/V080-PLANKOPF-SPEZ.md` §1.5/§2.3/§4/§8
 * V-K9/V-I6) — Feldeditor für `Sheet.plankopf`/`Sheet.layout` + Büro-
 * Stammdaten + Projekt-Code + Massstab-Chips + Phasen-Detailkarte. Jeder
 * Schreibweg läuft über `runCommand` (Undo/Sync/`.kosmo` gratis, wie jedes
 * andere Publish-Panel) — KEINE direkten Store-Writes. Eigenständiges Panel
 * nach demselben Muster wie `DossierPanel.tsx` (nur `onClose`-Prop + eigener
 * `useProject`-Zugriff für Doc/Revision/runCommand), aber zusätzlich mit
 * `sheetId`/`selectedPlacementId` als Props, weil die Massstab-Chips
 * (Spez §2.3) die im Blatteditor SELEKTIERTE Platzierung brauchen — dieser
 * Auswahlzustand lebt bewusst weiter in `PublishWorkspace.tsx` (dieselbe
 * Quelle, die auch die «Auswahl»-Werkzeuggruppe der Werkzeugleiste treibt),
 * kein zweiter Auswahl-Zustand hier.
 */

const PLANKOPF_FELDER: Array<{ feld: keyof SheetPlankopf; label: string; testid: string; placeholder: string }> = [
  { feld: 'inhalt', label: 'Plan-Inhalt', testid: 'plankopf-inhalt', placeholder: 'z.B. Grundriss EG' },
  { feld: 'planNummer', label: 'Plan-Nummer', testid: 'plankopf-plan-nummer', placeholder: 'z.B. 101' },
  { feld: 'disziplin', label: 'Disziplin', testid: 'plankopf-disziplin', placeholder: 'z.B. A' },
  { feld: 'geschossCode', label: 'Geschoss-Code', testid: 'plankopf-geschoss', placeholder: 'z.B. EG' },
  { feld: 'gezeichnet', label: 'Gezeichnet von', testid: 'plankopf-gezeichnet', placeholder: 'Kürzel/Name' },
  { feld: 'geprueft', label: 'Geprüft von', testid: 'plankopf-geprueft', placeholder: 'Kürzel/Name' },
  { feld: 'datum', label: 'Datum', testid: 'plankopf-datum', placeholder: 'z.B. 14.07.2026' },
];

const LAYOUT_SCHALTER: Array<{ feld: keyof SheetLayout; label: string; testid: string }> = [
  { feld: 'heftrand', label: 'Heftrand (20 mm links)', testid: 'blattlayout-heftrand' },
  { feld: 'faltmarken', label: 'Faltmarken (DIN 824)', testid: 'blattlayout-faltmarken' },
  { feld: 'wasserzeichen', label: 'Wasserzeichen/Freigabestempel', testid: 'blattlayout-wasserzeichen' },
  { feld: 'massstabsbalken', label: 'Massstabsbalken', testid: 'blattlayout-massstabsbalken' },
  { feld: 'nordpfeil', label: 'Nordpfeil (nur mit Grundriss/Situation)', testid: 'blattlayout-nordpfeil' },
];

export interface PlankopfPanelProps {
  sheetId: string;
  /** Aktuell im Blatteditor selektierte Platzierung — steuert, ob die
   * Massstab-Chips schreiben dürfen (Spez §2.3: nur MIT Selektion). */
  selectedPlacementId: string | null;
  onClose: () => void;
}

export function PlankopfPanel({ sheetId, selectedPlacementId, onClose }: PlankopfPanelProps) {
  useProject((s) => s.revision); // re-rendern, wenn sich das Doc ändert
  const { doc, runCommand } = useProject.getState();
  const logoInputRef = useRef<HTMLInputElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  const sheet = doc.get<Sheet>(sheetId);
  if (!sheet || sheet.kind !== 'sheet') return null;

  const matrixStufe = siaZuMatrixStufe(doc.settings.siaPhase);
  const eintrag = PHASEN_MATRIX[matrixStufe];

  function plankopfPatch(feld: keyof SheetPlankopf, wert: string) {
    const vorher = sheet!.plankopf?.[feld] ?? '';
    if (wert === vorher) return;
    runCommand('publish.plankopfSetzen', {
      sheetId,
      patch: { [feld]: wert.trim() === '' ? undefined : wert },
    });
  }

  function layoutPatch(feld: keyof SheetLayout, an: boolean) {
    runCommand('publish.blattLayoutSetzen', { sheetId, patch: { [feld]: an } });
  }

  function bueroPatch(feld: 'name' | 'adresse' | 'kuerzel', wert: string) {
    const vorher = doc.settings.buero?.[feld] ?? '';
    if (wert === vorher) return;
    try {
      runCommand('publish.bueroSetzen', { [feld]: wert });
    } catch (err) {
      meldeFehler(err);
    }
  }

  function projektCodePatch(wert: string) {
    const vorher = doc.settings.projekt?.projektCode ?? '';
    if (wert === vorher) return;
    runCommand('design.projektInfoSetzen', { projektCode: wert });
  }

  function logoDateiGewaehlt(file: File | undefined) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        runCommand('publish.bueroSetzen', { logoDataUrl: String(reader.result) });
        melde('Büro-Logo aktualisiert', { ton: 'erfolg' });
      } catch (err) {
        // Ehrliche Command-Fehlermeldung («PNG erforderlich — SVG/JPG folgt
        // in einer späteren Version», `commands/publish.ts` `setBuero`) —
        // kein stiller Fehlschlag (Spez §4.3/§8).
        meldeFehler(err);
      }
    };
    reader.readAsDataURL(file);
  }

  const plancode = sheetPlancode(doc, sheet);
  const plancodeFehlend: string[] = [];
  if (!doc.settings.buero?.kuerzel) plancodeFehlend.push('Büro-Kürzel');
  if (!doc.settings.projekt?.projektCode) plancodeFehlend.push('Projekt-Code');
  if (!sheet.plankopf?.planNummer) plancodeFehlend.push('Plan-Nummer');

  const massstaebe = [...new Set(eintrag.massstaebe)];
  const revisionen = sheet.revisionen ?? [];
  const letzteRevision = revisionen[revisionen.length - 1];
  const effektiverIndex = letzteRevision?.index ?? eintrag.index ?? '–';

  const inputStil: React.CSSProperties = {
    padding: 'var(--k-s2) var(--k-s3)',
    borderRadius: 'var(--k-radius-sm)',
    border: '1px solid var(--k-line-strong)',
    background: 'var(--k-field)',
    fontSize: 'var(--k-t-sm)',
    width: '100%',
  };

  return (
    <div
      ref={panelRef}
      data-testid="plankopf-panel"
      style={{
        position: 'absolute',
        right: 16,
        top: 52,
        zIndex: 20,
        width: 380,
        maxHeight: 'calc(100% - 90px)',
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
        <Badge hue={moduleHue.publish}>Plankopf</Badge>
        <div style={{ flex: 1, fontSize: 'var(--k-t-sm)', color: 'var(--k-ink-faint)' }}>{sheet.name}</div>
        <KButton size="sm" tone="ghost" onClick={onClose} aria-label="Schliessen" data-testid="plankopf-schliessen">
          <KIcon name="schliessen" size={14} />
        </KButton>
      </div>

      <Hairline />

      {/* Phasen-Detailkarte (Spez §8 V-K9, schmaler Info-Block) — aktive
          Matrix-Stufe, Akzentfarbe, Freigabe-Empfänger, Wasserzeichen-/
          Stempel-Status, Index-Logik, Massstabs-Übersicht der Stufe. */}
      <div
        data-testid="plankopf-detailkarte"
        style={{
          display: 'grid',
          gap: 6,
          padding: 'var(--k-s3)',
          border: '1px solid var(--k-line)',
          borderRadius: 'var(--k-radius-sm)',
          borderLeft: `3px solid ${eintrag.farbe}`,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 600 }}>
          <span style={{ width: 10, height: 10, borderRadius: '50%', background: eintrag.farbe, flexShrink: 0 }} />
          {matrixStufe} · {eintrag.name} ({eintrag.siaNr})
        </div>
        <div style={{ color: 'var(--k-ink-soft)' }}>Freigabe-Empfänger: {eintrag.freigabeEmpfaenger}</div>
        <div style={{ color: 'var(--k-ink-soft)' }}>
          {eintrag.wasserzeichenText !== null
            ? `Wasserzeichen: «${eintrag.wasserzeichenText}»`
            : `Kein Wasserzeichen (${matrixStufe}) — Stempel: «${eintrag.stempelText}»`}
        </div>
        <div style={{ color: 'var(--k-ink-soft)' }}>
          Index: {effektiverIndex}
          {letzteRevision ? ' (aus Revisionsverzeichnis)' : ' (Phasen-Default, noch keine Revision erfasst)'}
        </div>
        <div style={{ color: 'var(--k-ink-soft)' }}>Empfohlene Massstäbe: {eintrag.massstaebeLabel}</div>
      </div>

      {/* Massstab-Chips (Spez §2.3): setzen den Massstab der SELEKTIERTEN
          Platzierung — ohne Selektion reine Empfehlungsanzeige, deaktiviert.
          KEINE harte Phasen-Sperre (die Chips bleiben immer klickbar, sobald
          eine Platzierung selektiert ist — auch ausserhalb der Empfehlung,
          s. Spez-Beispiel Situationsplan 1:500 in Phase BW). */}
      <div style={{ display: 'grid', gap: 6 }}>
        <span className="k-titel" style={{ fontSize: 'var(--k-t-sm)', color: 'var(--k-ink-soft)' }}>
          Massstab-Chips — empfohlen in {eintrag.name}
        </span>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {massstaebe.map((m) => (
            <button
              key={m}
              type="button"
              data-testid={`plankopf-massstab-chip-${m}`}
              disabled={!selectedPlacementId}
              title={
                selectedPlacementId
                  ? `Massstab 1:${m} auf die ausgewählte Platzierung übernehmen`
                  : 'Erst eine Ansicht auf dem Blatt auswählen — ohne Selektion ist dies nur eine Empfehlungsanzeige'
              }
              onClick={() => {
                if (!selectedPlacementId) return;
                runCommand('publish.ansichtAnpassen', { sheetId, placementId: selectedPlacementId, scale: m });
                melde(`Massstab 1:${m} auf die Auswahl übernommen`, { ton: 'erfolg' });
              }}
              style={{
                all: 'unset',
                cursor: selectedPlacementId ? 'pointer' : 'not-allowed',
                opacity: selectedPlacementId ? 1 : 0.5,
              }}
            >
              <KChip size="sm" hue={eintrag.farbe}>
                1:{m}
              </KChip>
            </button>
          ))}
        </div>
        {!selectedPlacementId && (
          <span style={{ fontSize: 'var(--k-t-xs)', color: 'var(--k-ink-faint)' }} data-testid="plankopf-massstab-hinweis">
            Nur Empfehlung — erst eine Platzierung im Blatt auswählen, um den Massstab zu übernehmen.
          </span>
        )}
      </div>

      <Hairline />

      {/* Plankopf-Textfelder (Spez §1.5/§4.1, `publish.plankopfSetzen`) */}
      <div style={{ display: 'grid', gap: 'var(--k-s2)' }}>
        <span className="k-titel" style={{ fontSize: 'var(--k-t-sm)', color: 'var(--k-ink-soft)' }}>
          Plankopf-Felder
        </span>
        {PLANKOPF_FELDER.map((f) => (
          <KField key={f.feld} label={f.label}>
            <input
              defaultValue={sheet!.plankopf?.[f.feld] ?? ''}
              placeholder={f.placeholder}
              data-testid={f.testid}
              style={inputStil}
              onBlur={(e) => plankopfPatch(f.feld, e.target.value)}
            />
          </KField>
        ))}

        {/* Plancode (read-only, Spez §3.1/§3.2) — aus `sheetPlancode()`
            (`derive/publikation.ts`); fehlt Büro-Kürzel/Projekt-Code/
            Plan-Nummer, zeigt der Hinweis ehrlich, welcher Teil fehlt, statt
            eines unvollständigen «—-—-…»-Codes. */}
        <KField label="Plancode (read-only)">
          <div
            data-testid="plankopf-plancode"
            style={{ fontFamily: 'var(--k-font-mono)', fontWeight: 600, color: plancode ? 'var(--k-ink)' : 'var(--k-ink-faint)' }}
          >
            {plancode ?? '—'}
          </div>
          {plancodeFehlend.length > 0 && (
            <span data-testid="plankopf-plancode-hinweis" style={{ fontSize: 'var(--k-t-xs)', color: 'var(--k-ink-faint)' }}>
              Unvollständig — es fehlt: {plancodeFehlend.join(', ')}
            </span>
          )}
        </KField>
      </div>

      <Hairline />

      {/* Büro-Stammdaten (Spez §4.2/§4.3, `publish.bueroSetzen`) + Projekt-Code
          (`design.projektInfoSetzen`). SettingsPatch — persistent/undo-fähig,
          aber nicht live-sync (s. Kommentar `commands/publish.ts` `setBuero`). */}
      <div style={{ display: 'grid', gap: 'var(--k-s2)' }}>
        <span className="k-titel" style={{ fontSize: 'var(--k-t-sm)', color: 'var(--k-ink-soft)' }}>
          Büro-Stammdaten
        </span>
        <KField label="Büroname">
          <input
            defaultValue={doc.settings.buero?.name ?? ''}
            placeholder="z.B. Baubüro Andrin"
            data-testid="plankopf-buero-name"
            style={inputStil}
            onBlur={(e) => bueroPatch('name', e.target.value)}
          />
        </KField>
        <KField label="Büroadresse">
          <input
            defaultValue={doc.settings.buero?.adresse ?? ''}
            placeholder="Strasse, PLZ Ort"
            data-testid="plankopf-buero-adresse"
            style={inputStil}
            onBlur={(e) => bueroPatch('adresse', e.target.value)}
          />
        </KField>
        <KField label="Büro-Kürzel">
          <input
            defaultValue={doc.settings.buero?.kuerzel ?? ''}
            placeholder="z.B. MAA"
            data-testid="plankopf-buero-kuerzel"
            style={inputStil}
            onBlur={(e) => bueroPatch('kuerzel', e.target.value)}
          />
        </KField>
        <KField label="Büro-Logo (PNG)" hinweis="Nur PNG — SVG/JPG folgen in einer späteren Version.">
          <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
            <KButton size="sm" tone="quiet" onClick={() => logoInputRef.current?.click()} data-testid="plankopf-buero-logo-knopf">
              Logo laden…
            </KButton>
            <span style={{ fontSize: 'var(--k-t-xs)', color: 'var(--k-ink-faint)' }}>
              {doc.settings.buero?.logoAssetId ? 'Logo gesetzt' : 'kein Logo'}
            </span>
          </div>
          <input
            ref={logoInputRef}
            type="file"
            accept="image/*"
            data-testid="plankopf-buero-logo"
            style={{ display: 'none' }}
            onChange={(e) => {
              logoDateiGewaehlt(e.target.files?.[0]);
              e.target.value = '';
            }}
          />
        </KField>
        <KField label="Projekt-Code">
          <input
            defaultValue={doc.settings.projekt?.projektCode ?? ''}
            placeholder="z.B. SEE"
            data-testid="plankopf-projekt-code"
            style={inputStil}
            onBlur={(e) => projektCodePatch(e.target.value)}
          />
        </KField>
      </div>

      <Hairline />

      {/* Layout-Schalter (Spez §1.6/§1.7/§4.1, `publish.blattLayoutSetzen`) —
          fehlend = AUS in dieser Phase (P7 flippt die Post-Wechsel-Defaults,
          Spez §5.1); dieser Editor zeigt den EFFEKTIVEN Zustand ehrlich,
          kein hartcodiertes «AN». */}
      <div style={{ display: 'grid', gap: 'var(--k-s2)' }}>
        <span className="k-titel" style={{ fontSize: 'var(--k-t-sm)', color: 'var(--k-ink-soft)' }}>
          Blatt-Layout
        </span>
        {LAYOUT_SCHALTER.map((s) => (
          <label key={s.feld} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 'var(--k-t-sm)', color: 'var(--k-ink-soft)' }}>
            <input
              type="checkbox"
              data-testid={s.testid}
              checked={sheet!.layout?.[s.feld] === true}
              onChange={(e) => layoutPatch(s.feld, e.target.checked)}
            />
            {s.label}
          </label>
        ))}
      </div>
    </div>
  );
}
