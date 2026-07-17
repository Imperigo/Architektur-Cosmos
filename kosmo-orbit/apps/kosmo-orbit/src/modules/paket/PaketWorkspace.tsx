import {
  Hairline,
  KButton,
  KCard,
  KIcon,
  KKeyValue,
  KToolbar,
  melde,
  meldeFehler,
  Messrahmen,
  moduleHue,
} from '@kosmo/ui';
import type { ImageAsset } from '@kosmo/kernel';
import { useProject } from '../../state/project-store';
import { downloadKxp, kxpExportVorschau } from '../../state/kxp-io';
import { exportIfcFile, exportPlanDxf, exportPlanPdf, exportPlanSvg } from '../design/export-plan';
import { downloadBueroLogo } from './paket-logo-export';
import {
  EXPORT_STATUS_LABEL,
  exportHubEintraege,
  type ExportFormatEintrag,
  type ExportFormatId,
} from './export-hub';
import './paket.css';

/**
 * KosmoPackage — der Export-Hub + Paket-Übersicht (v0.8.1 / P14,
 * `docs/V081-SPEZ.md` §7(e)/§9 C-28/C-30). Eigener Screen (kein Umbau von
 * `PublishWorkspace`, s. dessen P8-Kommentar «Export-Hub ehrlich» — dieser
 * Screen ERSETZT nicht die Sets-/Blatt-Werkzeuge dort, er bündelt die sechs
 * REALEN Dateiformate + `.kxp` an EINEM ruhigen Ort, jedes mit ehrlichem
 * Status statt einer 27-Kachel-Attrappe).
 *
 * Jede Export-Aktion ruft eine BESTEHENDE Funktion auf (keine Zweitimplemen-
 * tierung): `exportPlanPdf/exportPlanSvg/exportPlanDxf/exportIfcFile`
 * (`modules/design/export-plan.ts`, dieselben vier, die KosmoDesigns eigene
 * Export-Befehle nutzen) + `downloadKxp` (`state/kxp-io.ts`, P11). Die
 * einzige neue Ausführungslogik ist `downloadBueroLogo()` — es gab bisher
 * KEINEN Weg, das gespeicherte Büro-Logo als eigene Datei zurückzuholen
 * (nur eingebettet in Plan-/Blatt-Exporte), s. `paket-logo-export.ts`.
 */

function statusKlasse(status: ExportFormatEintrag['status']): string {
  return `paket-status paket-status--${status}`;
}

function AktionsKnopf({ eintrag, onNavigieren }: { eintrag: ExportFormatEintrag; onNavigieren: () => void }) {
  const verfuegbar = eintrag.status === 'verfuegbar';

  const ausfuehren = (id: ExportFormatId) => {
    try {
      switch (id) {
        case 'plan-pdf':
          void exportPlanPdf();
          melde('Grundriss-PDF wird heruntergeladen …', { ton: 'erfolg' });
          break;
        case 'plan-svg':
          exportPlanSvg();
          melde('Grundriss-SVG heruntergeladen.', { ton: 'erfolg' });
          break;
        case 'plan-dxf':
          exportPlanDxf();
          melde('Grundriss-DXF heruntergeladen.', { ton: 'erfolg' });
          break;
        case 'modell-ifc':
          exportIfcFile();
          melde('Modell als IFC heruntergeladen.', { ton: 'erfolg' });
          break;
        case 'buero-logo':
          if (!downloadBueroLogo()) {
            meldeFehler('Kein Büro-Logo gesetzt.');
          } else {
            melde('Büro-Logo heruntergeladen.', { ton: 'erfolg' });
          }
          break;
        case 'punktwolke-splat':
          break;
      }
    } catch (err) {
      meldeFehler(err);
    }
  };

  if (eintrag.id === 'punktwolke-splat') {
    return (
      <KButton size="sm" tone="ghost" data-testid={`paket-navigieren-${eintrag.id}`} onClick={onNavigieren}>
        <KIcon name="schweben" size={14} /> Splat-Werkzeug öffnen
      </KButton>
    );
  }

  if (!verfuegbar) {
    return (
      <KButton
        size="sm"
        tone="ghost"
        data-testid={`paket-navigieren-${eintrag.id}`}
        onClick={onNavigieren}
      >
        Dorthin wechseln
      </KButton>
    );
  }

  return (
    <KButton size="sm" tone="accent" data-testid={`paket-export-${eintrag.id}`} onClick={() => ausfuehren(eintrag.id)}>
      <KIcon name="export" size={14} /> {eintrag.formatLabel}
    </KButton>
  );
}

function FormatKarte({ eintrag, onNavigieren }: { eintrag: ExportFormatEintrag; onNavigieren: () => void }) {
  return (
    <KCard variante="glass" data-testid={`paket-karte-${eintrag.id}`} className="paket-karte">
      <div className="paket-karte-kopf">
        <span className="paket-karte-titel">{eintrag.titel}</span>
        <span className="paket-karte-format">{eintrag.formatLabel}</span>
      </div>
      <span className="paket-karte-hinweis" data-testid={`paket-hinweis-${eintrag.id}`}>
        {eintrag.hinweis}
      </span>
      <div className="paket-karte-fuss">
        <span className={statusKlasse(eintrag.status)} data-testid={`paket-status-${eintrag.id}`}>
          {eintrag.status !== 'verfuegbar' && <KIcon name="warnung" size={14} />}
          {EXPORT_STATUS_LABEL[eintrag.status]}
        </span>
        <div className="paket-fill" />
        <AktionsKnopf eintrag={eintrag} onNavigieren={onNavigieren} />
      </div>
    </KCard>
  );
}

export interface PaketWorkspaceProps {
  onEinstellungen?: () => void;
  /** Sprung nach KosmoDesign (Plan-/Modell-Export-Kontext). Optional `splat`
   *  öffnet dort zusätzlich das Splat-Werkzeug (`ui-zustand.ts`,
   *  `setSplatPanelOffen`, bestehender globaler Store — kein neuer Weg). */
  onNavigateDesign?: (opts?: { splat?: boolean }) => void;
  /** Sprung nach KosmoPublish (Plankopf/Logo-Kontext). */
  onNavigatePublish?: () => void;
}

export function PaketWorkspace({ onEinstellungen, onNavigateDesign, onNavigatePublish }: PaketWorkspaceProps = {}) {
  const activeStoreyId = useProject((s) => s.activeStoreyId);
  const revision = useProject((s) => s.revision);
  void revision;
  const { doc } = useProject.getState();
  const logoAssetId = doc.settings.buero?.logoAssetId;
  const logoAsset = logoAssetId ? doc.get<ImageAsset>(logoAssetId) : undefined;

  const eintraege = exportHubEintraege({
    hatAktivesGeschoss: activeStoreyId !== null,
    logoMime: logoAsset?.mime,
  });
  const gruppen = Array.from(new Set(eintraege.map((e) => e.gruppe))).map((gruppe) => ({
    gruppe,
    titel: eintraege.find((e) => e.gruppe === gruppe)!.gruppenTitel,
    eintraege: eintraege.filter((e) => e.gruppe === gruppe),
  }));

  const navigieren = (eintrag: ExportFormatEintrag) => {
    if (eintrag.gruppe === 'plan' || eintrag.gruppe === 'modell') {
      onNavigateDesign?.({ splat: false });
    } else if (eintrag.gruppe === 'punktwolke') {
      onNavigateDesign?.({ splat: true });
    } else if (eintrag.gruppe === 'logo') {
      onNavigatePublish?.();
    }
  };

  const vorschau = kxpExportVorschau();

  return (
    <div className="k-einblenden paket-viewport">
      <div className="paket-scroll">
        <div className="paket-content">
          <div className="k-glass paket-kopf" style={{ ['--_hue' as string]: moduleHue.paket }}>
            <KToolbar data-testid="paket-werkzeugleiste" className="paket-kopf-leiste">
              <span className="paket-kopf-text" data-testid="paket-titel">
                KosmoPackage
              </span>
              <span className="paket-kopf-text">· Export-Hub · sechs reale Formate + .kxp</span>
              <div className="paket-fill" />
              {onEinstellungen && (
                <KButton
                  size="sm"
                  tone="ghost"
                  data-testid="station-einstellungen-paket"
                  title="Einstellungen — KosmoPackage"
                  aria-label="Einstellungen — KosmoPackage"
                  onClick={onEinstellungen}
                >
                  <KIcon name="zahnrad" size={14} />
                </KButton>
              )}
            </KToolbar>
          </div>
          <Hairline />

          <span className="paket-hinweis">
            Diese Übersicht bündelt jedes real existierende Exportformat an einem Ort — keine
            27-Format-Kachel-Wand (Owner-Entscheid), jede Kachel ruft denselben Weg auf, den die
            jeweilige Fach-Station schon nutzt. Ohne den nötigen Kontext (z. B. kein aktives
            Geschoss) zeigt eine Kachel das ehrlich, statt tot zu klicken.
          </span>

          {gruppen.map((g) => (
            <div className="paket-gruppe" key={g.gruppe} data-testid={`paket-gruppe-${g.gruppe}`}>
              <div className="paket-label">{g.titel}</div>
              <div className="paket-gruppe-grid">
                {g.eintraege.map((e) => (
                  <FormatKarte key={e.id} eintrag={e} onNavigieren={() => navigieren(e)} />
                ))}
              </div>
            </div>
          ))}

          <Hairline />

          <div className="paket-label">.kxp-Paket (KosmoTrust)</div>
          <KCard variante="glass" data-testid="paket-kxp-karte" className="paket-kxp-karte">
            <KKeyValue
              zeilen={[
                { key: 'Projekt', wert: vorschau.projektName },
                { key: 'Blätter', wert: String(vorschau.blaetterAnzahl) },
                { key: 'Journal-Einträge', wert: String(vorschau.journalAnzahl) },
              ]}
            />
            <div className="paket-karte-fuss">
              <span className={statusKlasse('verfuegbar')}>{EXPORT_STATUS_LABEL.verfuegbar}</span>
              <div className="paket-fill" />
              <KButton
                size="sm"
                tone="accent"
                data-testid="paket-export-kxp"
                onClick={() => {
                  downloadKxp();
                  melde(`«${vorschau.projektName}.kxp» heruntergeladen.`, { ton: 'erfolg' });
                }}
              >
                <KIcon name="export" size={14} /> .kxp
              </KButton>
            </div>
          </KCard>

          {vorschau.blaetterAnzahl === 0 && (
            <div data-testid="paket-kxp-leerhinweis">
              <Messrahmen height={80} caption="Noch keine Blätter — .kxp bündelt trotzdem Modell + Journal." />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
