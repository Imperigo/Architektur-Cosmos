#!/usr/bin/env node

import { publicLeakMatches } from './public-leak-patterns.mjs';

const args = parseArgs(process.argv.slice(2));
const baseUrl = String(args['base-url'] || 'http://127.0.0.1:3000').replace(/\/$/, '');

const routes = [
  {
    path: '/',
    includes: ['Architekturkosmos', 'Status', 'Pilotprojekte', 'Alterszentrum Kloster Ingenbohl']
  },
  {
    path: '/orbit/',
    includes: [
      'ArchitekturKosmos: Entwicklungsstand',
      'Was bereits funktioniert',
      'Öffentliche Referenzen',
      'Öffentliche Assets',
      'KosmoDraw',
      'Kosmo KI',
      'Vom Referenzprojekt zum Architekturwissen'
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
      'Architekturprojekte als prüfbare Dossiers',
      'Projektbestand',
      'KosmoDraw Übernahme',
      'Mengenprüfung aus KosmoDraw',
      'Planregister aus KosmoPublish',
      'Was öffentlich sichtbar sein darf',
      'Villa Savoye als vollständiger Referenzfall',
      'Aus Referenzen werden Bauteilgruppen',
      'Medienfreigabe',
      'Villa Savoye',
      'Alterszentrum Kloster Ingenbohl'
    ]
  },
  {
    path: '/assets/',
    includes: [
      'KosmoAsset',
      'Bauteile, Materialien und Zeichnungen aus geprüften Referenzen',
      'Assetbestand',
      'Asset-Übernahme aus KosmoDraw',
      'Mengenprüfung vor Assetübernahme',
      'Planregister aus KosmoPublish',
      'Dateien werden erst nach Rechteprüfung zu Assets',
      'Vom Projektbild zur wiederverwendbaren Bauinformation',
      'Alhambra: Raumordnung',
      'Nur Metadaten',
      'Villa Savoye',
      'Ingenbohl Assetprüfung',
      'Alterszentrum Kloster Ingenbohl'
    ]
  },
  {
    path: '/atlas/villa-savoye/',
    includes: ['Villa Savoye']
  },
  {
    path: '/atlas/alterszentrum-kloster-ingenbohl/',
    includes: ['Alterszentrum Kloster Ingenbohl']
  },
  {
    path: '/icon.svg',
    rawIncludes: ['<svg', 'Architecture Cosmos']
  },
  {
    path: '/robots.txt',
    rawIncludes: ['User-Agent: *', 'Allow: /', 'Sitemap: https://architekturkosmos.ch/sitemap.xml']
  },
  {
    path: '/sitemap.xml',
    rawIncludes: [
      '<urlset',
      '<loc>https://architekturkosmos.ch/references/</loc>',
      '<loc>https://architekturkosmos.ch/assets/</loc>',
      '<loc>https://architekturkosmos.ch/orbit/</loc>',
      '<loc>https://architekturkosmos.ch/atlas/alterszentrum-kloster-ingenbohl/</loc>'
    ]
  }
];

const findings = [];

main();

async function main() {
  const checkedRoutes = [];

  for (const route of routes) {
    const url = `${baseUrl}${route.path}`;
    const response = await fetch(url);
    const body = await response.text();
    const normalized = normalizeHtmlText(body);
    const blockedMatches = publicLeakMatches(body);
    const minBodyLength = route.minBodyLength ?? ((route.rawIncludes ?? []).length > 0 ? 20 : 500);

    check(response.ok, `${route.path}:status`, `Expected HTTP 2xx for ${route.path}, got ${response.status}.`);
    check(
      body.length >= minBodyLength,
      `${route.path}:min_body_length`,
      `Expected ${route.path} body length >= ${minBodyLength}, got ${body.length}.`
    );
    for (const expected of route.includes ?? []) {
      check(
        normalized.includes(expected),
        `${route.path}:includes:${expected}`,
        `Expected rendered route ${route.path} to include "${expected}".`
      );
    }
    for (const expected of route.rawIncludes ?? []) {
      check(
        body.includes(expected),
        `${route.path}:raw-includes:${expected}`,
        `Expected raw route ${route.path} to include "${expected}".`
      );
    }
    check(blockedMatches.length === 0, `${route.path}:no_private_patterns`, `Blocked private/source patterns: ${blockedMatches.join(', ') || 'none'}.`);

    checkedRoutes.push({
      path: route.path,
      status: response.status,
      body_length: body.length,
      min_body_length: minBodyLength,
      expected_text_count: (route.includes ?? []).length + (route.rawIncludes ?? []).length,
      blocked_pattern_count: blockedMatches.length
    });
  }

  const summary = {
    status: findings.every((finding) => finding.passed) ? 'passed' : 'failed',
    base_url: baseUrl,
    checkedRoutes,
    failed_findings: findings.filter((finding) => !finding.passed)
  };

  console.log(JSON.stringify(summary, null, 2));
  if (summary.status !== 'passed') process.exit(1);
}

function normalizeHtmlText(value) {
  return String(value)
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&nbsp;/g, ' ')
    .replace(/&#x27;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/\s+/g, ' ')
    .trim();
}

function check(passed, id, message) {
  findings.push({ id, passed: Boolean(passed), message });
}

function parseArgs(argv) {
  const parsed = {};
  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (!token.startsWith('--')) continue;
    const key = token.slice(2);
    const next = argv[index + 1];
    if (index + 1 < argv.length && !String(next).startsWith('--')) {
      parsed[key] = next;
      index += 1;
    } else {
      parsed[key] = true;
    }
  }
  return parsed;
}
