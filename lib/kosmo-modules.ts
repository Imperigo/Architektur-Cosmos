export type KosmoModuleId = 'data' | 'asset' | 'design' | 'shop';

export type KosmoModuleStatus = 'bereit' | 'in Planung';

export type KosmoOrbitModule = {
  id: KosmoModuleId;
  name: string;
  label: string;
  description: string;
  detail: string[];
  status: KosmoModuleStatus;
  accent: string;
  x: number;
  y: number;
  xMobile: number;
  yMobile: number;
};

export const kosmoOrbitModules: KosmoOrbitModule[] = [
  {
    id: 'data',
    name: 'KosmoData',
    label: 'Referenzbibliothek / Atlas',
    description: 'Wurmloch, Referenzarchiv, Projekte, Quellen und 3D-Modelle.',
    detail: ['Architekturprojekte im Wurmloch', 'öffentliche und private Quellenlogik', 'Analyse-, Material- und Modell-Layer'],
    status: 'bereit',
    accent: '#00e7ff',
    x: 0,
    y: -190,
    xMobile: 0,
    yMobile: -210
  },
  {
    id: 'asset',
    name: 'KosmoAsset',
    label: '2D / 3D / Texturen',
    description: 'Bauteile, 2D-Pläne, 3D-Modelle, Texturen und Materialpakete.',
    detail: ['wiederverwendbare 2D-/3D-Bauteile', 'Materialien, Texturen und Referenzpakete', 'Exportlogik für Blender, ArchiCAD und Wettbewerbspipeline'],
    status: 'in Planung',
    accent: '#f5b342',
    x: 214,
    y: 8,
    xMobile: 112,
    yMobile: -38
  },
  {
    id: 'design',
    name: 'KosmoDesign',
    label: 'Prepare / Draw / Vis / Publish',
    description: 'Entwurf, Planwerk, Visualisierung und Publikation als gebündelte Pipeline.',
    detail: ['KosmoPrepare für Briefing und Kontext', 'KosmoDraw und KosmoVis für Plan, Modell und Bild', 'KosmoPublish für Layout, Abgabe und Review-Pakete'],
    status: 'in Planung',
    accent: '#ff4fd8',
    x: 0,
    y: 190,
    xMobile: 0,
    yMobile: 166
  },
  {
    id: 'shop',
    name: 'KosmoShop',
    label: 'Produkte / Tools / Käufe',
    description: 'Späterer Ort für Produktzugang, Toolkäufe und freigegebene Pakete.',
    detail: ['freigegebene Tool- und Asset-Pakete', 'Produktzugänge und spätere Kaufmodule', 'klare Trennung zwischen Shop, Dev-Werkzeugen und privaten Daten'],
    status: 'in Planung',
    accent: '#65ff73',
    x: -214,
    y: 8,
    xMobile: -112,
    yMobile: -38
  }
];
