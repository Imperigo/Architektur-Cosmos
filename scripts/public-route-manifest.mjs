export const publicRouteChecks = [
  {
    path: '/',
    includes: ['Architekturkosmos', 'Status', 'Pilotprojekte', 'Alterszentrum Kloster Ingenbohl']
  },
  {
    path: '/orbit/',
    includes: [
      'Wo der ArchitekturKosmos bereits arbeitet',
      'Funktionen, die heute prüfbar sind',
      'Öffentliche Referenzen',
      'Öffentliche Assets',
      'KosmoDraw',
      'Kosmo KI',
      'Zwei Piloten zeigen den Weg vom Bau zum Wissen'
    ]
  },
  {
    path: '/atlas/',
    includes: ['Architektur Kosmos']
  },
  {
    path: '/archive/',
    includes: ['KosmoData Archiv']
  },
  {
    path: '/references/',
    includes: [
      'KosmoReferences',
      'Vom Bauwerk zum prüfbaren Dossier',
      'Referenzdossiers im öffentlichen Bestand',
      'KosmoDraw Übernahme',
      'Mengenprüfung aus KosmoDraw',
      'Planregister aus KosmoPublish',
      'Was öffentlich sichtbar sein darf',
      'Villa Savoye als prüfbares Referenzdossier',
      'Aus Lesarten entstehen wiederverwendbare Bauteilgruppen',
      'Medienfreigabe',
      'Villa Savoye',
      'Alterszentrum Kloster Ingenbohl'
    ]
  },
  {
    path: '/assets/',
    includes: [
      'KosmoAsset',
      'Bauteile aus geprüften Referenzen',
      'Öffentliche Assets nach Projekt und Ebene',
      'Asset-Übernahme aus KosmoDraw',
      'Mengenprüfung vor Assetübernahme',
      'Planregister aus KosmoPublish',
      'Erst die Rechteprüfung macht eine Datei zum Asset',
      'Bilder und Pläne werden zu Architekturbausteinen',
      'Alhambra: Raumordnung',
      'Metadaten ohne Rohdatei',
      'Villa Savoye',
      'Ingenbohl Assetprüfung',
      'Alterszentrum Kloster Ingenbohl'
    ]
  },
  {
    path: '/atlas/villa-savoye/',
    includes: [
      'Villa Savoye',
      'Modellstruktur als lesbarer Gebäudekern',
      'Prüfstatus, Modellspur und Asset-Brücke',
      'Öffentliche 3D-Vorschau vorhanden',
      'Freigabestatus des Pilotprojekts'
    ]
  },
  {
    path: '/atlas/alterszentrum-kloster-ingenbohl/',
    includes: [
      'Alterszentrum Kloster Ingenbohl',
      'Modellstruktur als lesbarer Gebäudekern',
      'Prüfstatus, Modellspur und Asset-Brücke',
      'Öffentliche 3D-Vorschau vorhanden',
      'Freigabestatus des Pilotprojekts'
    ]
  },
  {
    path: '/icon.svg',
    rawIncludes: ['<svg', 'Architecture Cosmos'],
    minBodyLength: 20
  },
  {
    path: '/robots.txt',
    rawIncludes: ['User-Agent: *', 'Allow: /', 'Sitemap: https://architekturkosmos.ch/sitemap.xml'],
    minBodyLength: 20
  },
  {
    path: '/sitemap.xml',
    rawIncludes: [
      '<urlset',
      '<loc>https://architekturkosmos.ch/references/</loc>',
      '<loc>https://architekturkosmos.ch/assets/</loc>',
      '<loc>https://architekturkosmos.ch/orbit/</loc>',
      '<loc>https://architekturkosmos.ch/atlas/alterszentrum-kloster-ingenbohl/</loc>'
    ],
    minBodyLength: 20
  }
];

export const publicRoutes = publicRouteChecks.map((route) => route.path);
