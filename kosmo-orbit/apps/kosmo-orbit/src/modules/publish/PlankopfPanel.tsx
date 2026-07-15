import { useRef } from 'react';
import {
  PHASEN_MATRIX,
  setDateiname,
  sheetPlancode,
  siaZuMatrixStufe,
  type Sheet,
  type SheetLayout,
  type SheetPlankopf,
} from '@kosmo/kernel';
import { Badge, Hairline, KButton, KChip, KField, KIcon, KSwitch, melde, meldeFehler, moduleHue } from '@kosmo/ui';
import { useProject } from '../../state/project-store';
import './publish.css';

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

  // v0.8.0 P8 (Spez §4.4/§9 P-I8, «Plancode-Namen sichtbar im Export»): der
  // Nutzer soll den tatsächlichen Export-Dateinamen SEHEN, bevor er
  // exportiert — dieselbe `setDateiname()`-Funktion, die `exportSetSvgs()`
  // (`export-sheets.ts`) beim SVG-Download aufruft, mit denselben Feldern
  // (Set-Position hier immer als Platzhalter «1», weil dieses Panel kein Set
  // kennt — die tatsächliche Nummer stammt aus der Set-Reihenfolge beim
  // echten Export). Ohne Plancode (Daten-Guard) zeigt die Vorschau ehrlich
  // den heutigen Alt-Namen (`NAMENSREGEL_DEFAULT`), byte-gleich zum
  // tatsächlichen Export. Ehrliche Grenze: trägt ein Set eine EIGENE
  // `namensregel`, gewinnt beim Export diese — die Vorschau hier zeigt die
  // Standard-Regeln (Set-eigene Regeln sind Set-, nicht Blatt-Wissen).
  const exportDateiname = setDateiname(undefined, {
    nr: 1,
    blatt: sheet.name,
    projekt: doc.settings.projectName,
    massstab: sheet.placements[0]?.scale ?? null,
    format: `${sheet.format}-${sheet.orientation}`,
    ...(plancode !== undefined ? { plancode } : {}),
  });

  const massstaebe = [...new Set(eintrag.massstaebe)];
  const revisionen = sheet.revisionen ?? [];
  const letzteRevision = revisionen[revisionen.length - 1];
  const effektiverIndex = letzteRevision?.index ?? eintrag.index ?? '–';

  return (
    <div
      ref={panelRef}
      data-testid="plankopf-panel"
      // v0.8.0 P11 (Owner-Pflichtauftrag 15.07., «Publish in die Dock-
      // Registry»): war ein eigener `position:'absolute'`-Overlay
      // (`right:16/top:52/width:380/maxHeight`) — jetzt ein Dock-Panel-
      // INHALT (`dock-stationen.ts` `'plankopf'`), Position/Breite/Höhen-
      // Deckel kommen von `DockPanel.tsx`/`dock-kern.ts`s Solver (identisches
      // Muster wie `KennzahlenPanel.tsx`s P4-Migration: Hintergrund/Rahmen/
      // Schatten bleiben, nur Position/Grösse entfallen).
      className="k-publish-panel"
    >
      <div className="k-publish-panel-kopf">
        <Badge hue={moduleHue.publish}>Plankopf</Badge>
        <div className="k-publish-spacer k-publish-meta-zeile">{sheet.name}</div>
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
        className="k-publish-detailkarte"
        style={{ ['--_farbe' as string]: eintrag.farbe }}
      >
        <div className="k-publish-detailkarte-titel">
          <span className="k-publish-detailkarte-punkt" aria-hidden="true" />
          {matrixStufe} · {eintrag.name} ({eintrag.siaNr})
        </div>
        <div className="k-publish-detailkarte-zeile">Freigabe-Empfänger: {eintrag.freigabeEmpfaenger}</div>
        <div className="k-publish-detailkarte-zeile">
          {eintrag.wasserzeichenText !== null
            ? `Wasserzeichen: «${eintrag.wasserzeichenText}»`
            : `Kein Wasserzeichen (${matrixStufe}) — Stempel: «${eintrag.stempelText}»`}
        </div>
        <div className="k-publish-detailkarte-zeile">
          Index: {effektiverIndex}
          {letzteRevision ? ' (aus Revisionsverzeichnis)' : ' (Phasen-Default, noch keine Revision erfasst)'}
        </div>
        <div className="k-publish-detailkarte-zeile">Empfohlene Massstäbe: {eintrag.massstaebeLabel}</div>
      </div>

      {/* Massstab-Chips (Spez §2.3): setzen den Massstab der SELEKTIERTEN
          Platzierung — ohne Selektion reine Empfehlungsanzeige, deaktiviert.
          KEINE harte Phasen-Sperre (die Chips bleiben immer klickbar, sobald
          eine Platzierung selektiert ist — auch ausserhalb der Empfehlung,
          s. Spez-Beispiel Situationsplan 1:500 in Phase BW). */}
      <div className="k-publish-abschnitt">
        <span className="k-publish-abschnitt-label">
          Massstab-Chips — empfohlen in {eintrag.name}
        </span>
        <div className="k-publish-massstab-liste">
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
              className="k-plankopf-chip-knopf"
            >
              <KChip size="sm" hue={eintrag.farbe}>
                1:{m}
              </KChip>
            </button>
          ))}
        </div>
        {!selectedPlacementId && (
          <span className="k-publish-hinweis-klein" data-testid="plankopf-massstab-hinweis">
            Nur Empfehlung — erst eine Platzierung im Blatt auswählen, um den Massstab zu übernehmen.
          </span>
        )}
      </div>

      <Hairline />

      {/* Plankopf-Textfelder (Spez §1.5/§4.1, `publish.plankopfSetzen`) */}
      <div className="k-publish-abschnitt">
        <span className="k-publish-abschnitt-label">
          Plankopf-Felder
        </span>
        {PLANKOPF_FELDER.map((f) => (
          <KField key={f.feld} label={f.label}>
            <input
              defaultValue={sheet!.plankopf?.[f.feld] ?? ''}
              placeholder={f.placeholder}
              data-testid={f.testid}
              className="k-publish-input"
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
            className={`k-publish-mono-wert${plancode ? ' k-publish-mono-wert--gesetzt' : ''}`}
          >
            {plancode ?? '—'}
          </div>
          {plancodeFehlend.length > 0 && (
            <span data-testid="plankopf-plancode-hinweis" className="k-publish-hinweis-klein">
              Unvollständig — es fehlt: {plancodeFehlend.join(', ')}
            </span>
          )}
        </KField>

        {/* Export-Dateiname-Vorschau (v0.8.0 P8) — derselbe Name, den der
            SVG-Export dieses Blatts tatsächlich vergibt (`setDateiname()`,
            `export-sheets.ts`). Mit vollem Plancode ersetzt er den
            Alt-Namen automatisch (Daten-Guard, s. `derive/publikation.ts`). */}
        <KField label="Export-Dateiname (Vorschau)">
          <div data-testid="export-dateiname" className="k-publish-dateiname">
            {exportDateiname}.svg
          </div>
        </KField>
      </div>

      <Hairline />

      {/* Büro-Stammdaten (Spez §4.2/§4.3, `publish.bueroSetzen`) + Projekt-Code
          (`design.projektInfoSetzen`). SettingsPatch — persistent/undo-fähig,
          aber nicht live-sync (s. Kommentar `commands/publish.ts` `setBuero`). */}
      <div className="k-publish-abschnitt">
        <span className="k-publish-abschnitt-label">
          Büro-Stammdaten
        </span>
        <KField label="Büroname">
          <input
            defaultValue={doc.settings.buero?.name ?? ''}
            placeholder="z.B. Baubüro Andrin"
            data-testid="plankopf-buero-name"
            className="k-publish-input"
            onBlur={(e) => bueroPatch('name', e.target.value)}
          />
        </KField>
        <KField label="Büroadresse">
          <input
            defaultValue={doc.settings.buero?.adresse ?? ''}
            placeholder="Strasse, PLZ Ort"
            data-testid="plankopf-buero-adresse"
            className="k-publish-input"
            onBlur={(e) => bueroPatch('adresse', e.target.value)}
          />
        </KField>
        <KField label="Büro-Kürzel">
          <input
            defaultValue={doc.settings.buero?.kuerzel ?? ''}
            placeholder="z.B. MAA"
            data-testid="plankopf-buero-kuerzel"
            className="k-publish-input"
            onBlur={(e) => bueroPatch('kuerzel', e.target.value)}
          />
        </KField>
        <KField label="Büro-Logo (PNG)" hinweis="Nur PNG — SVG/JPG folgen in einer späteren Version.">
          <div className="k-publish-logo-zeile">
            <KButton size="sm" tone="quiet" onClick={() => logoInputRef.current?.click()} data-testid="plankopf-buero-logo-knopf">
              Logo laden…
            </KButton>
            <span className="k-publish-hinweis-klein">
              {doc.settings.buero?.logoAssetId ? 'Logo gesetzt' : 'kein Logo'}
            </span>
          </div>
          <input
            ref={logoInputRef}
            type="file"
            accept="image/*"
            data-testid="plankopf-buero-logo"
            className="k-publish-versteckt-input"
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
            className="k-publish-input"
            onBlur={(e) => projektCodePatch(e.target.value)}
          />
        </KField>
      </div>

      <Hairline />

      {/* Layout-Schalter (Spez §1.6/§1.7/§4.1, `publish.blattLayoutSetzen`) —
          v0.8.0 P7 (Golden-Sammelwechsel 080, Default-Flip): fehlend
          bedeutet jetzt AN (Post-Wechsel-Default, Spez §5.1), nicht mehr AUS
          — dieser Editor zeigt weiterhin den EFFEKTIVEN Zustand ehrlich
          (kein hartcodiertes «AN»/«AUS»): `!== false` statt `=== true` für
          die vier unbedingten Schalter, und für `nordpfeil` zusätzlich die
          Grundriss-/Situationsplan-Bedingung aus `derive/sheet.ts`
          (`hatGrundrissOderSituation`) — sonst zeigte die Checkbox «an»,
          obwohl das Blatt (mangels Grundriss/Situation) gar keinen
          Nordpfeil zeichnet. v0.8.0B / W4 (Spez §3 B-127): `KSwitch` statt
          nackter Checkbox — dasselbe `<input type="checkbox">` darunter. */}
      <div className="k-publish-abschnitt">
        <span className="k-publish-abschnitt-label">
          Blatt-Layout
        </span>
        {LAYOUT_SCHALTER.map((s) => {
          const an =
            s.feld === 'nordpfeil'
              ? sheet!.layout?.nordpfeil !== false &&
                sheet!.placements.some((p) => p.view === 'grundriss' || p.view === 'situationsplan')
              : sheet!.layout?.[s.feld] !== false;
          return (
            <KSwitch
              key={s.feld}
              data-testid={s.testid}
              checked={an}
              onChange={(e) => layoutPatch(s.feld, e.target.checked)}
              label={s.label}
            />
          );
        })}
      </div>
    </div>
  );
}
