import type { ImageAsset } from '@kosmo/kernel';
import { useProject } from '../../state/project-store';
import { base64ZuBytes, logoDateiendung } from './export-hub';

/**
 * Büro-Logo als eigene Datei herunterladen (v0.8.1 / P14, `docs/V081-SPEZ.md`
 * §7(e)/§9 C-28/C-30, «Logo-Export: SVG/JPG»). Kein Duplikat eines
 * bestehenden Export-Wegs — bisher wurde das Logo NUR eingebettet
 * (`plankopfSvg()`/`sheetToSvg()`/`renderSheetInPdf()`), nie als eigenständige
 * Datei zurückgegeben. Dieselbe Blob→Anchor-Sequenz wie
 * `exportPlanSvg`/`exportPlanDxf`/`exportIfcFile` (`export-plan.ts`) — nur
 * die Byte-Quelle ist neu (das bereits gespeicherte `ImageAsset`, unverändert
 * aus `publish.bueroSetzen`, hier nur GELESEN).
 *
 * Gibt `false` zurück (statt zu werfen), wenn kein Logo gesetzt ist — der
 * Hub prüft `exportHubEintraege()`s Status VOR dem Klick, das ist die
 * zweite, defensive Ebene (kein stiller Fehlklick möglich).
 */
export function downloadBueroLogo(): boolean {
  const { doc } = useProject.getState();
  const logoAssetId = doc.settings.buero?.logoAssetId;
  if (!logoAssetId) return false;
  const asset = doc.get<ImageAsset>(logoAssetId);
  if (!asset) return false;

  const bytes = base64ZuBytes(asset.data);
  const endung = logoDateiendung(asset.mime);
  const url = URL.createObjectURL(new Blob([bytes.buffer as ArrayBuffer], { type: asset.mime }));
  const a = document.createElement('a');
  a.href = url;
  a.download = `${doc.settings.projectName.replace(/\s+/g, '-')}-Logo.${endung}`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
  return true;
}
