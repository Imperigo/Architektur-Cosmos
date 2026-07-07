#!/usr/bin/env node
/**
 * Selbständige Prüfung für `tools/netz-check.mjs` (Serie I / Batch B8) —
 * gleiches Muster wie `tools/secret-scan.test.mjs`: reines Node, kein
 * Test-Framework, Exit-Code 0 = alle Prüfungen grün, sonst != 0 mit Liste der
 * Fehlschläge.
 *
 * Deckt das Abnahmekriterium aus `docs/SERIE-I-BUILDPLAN.md` §5/B8 ab:
 * "netz-check.mjs läuft".
 *
 * Aufruf: node tools/netz-check.test.mjs
 */

import { readFileSync } from 'node:fs';
import path from 'node:path';
import { bindSmokeCheck, kosmoOrbitRoot, lanIPv4Adressen, lintBetriebSource } from './netz-check.mjs';

const failures = [];
function check(label, condition) {
  failures.push(...(condition ? [] : [label]));
}

// ---------------------------------------------------------------------------
// 1) lintBetriebSource — synthetische Fixtures
// ---------------------------------------------------------------------------

const GUTE_QUELLE = `
  const host = ein.betriebsart === 'remote' ? bereinigeHost(ein.remoteHost ?? '') || 'localhost' : 'localhost';
  const tls = ein.betriebsart === 'remote' && ein.remoteTls === true;
  llmBaseUrl: \`\${tls ? 'https' : 'http'}://\${host}:11434\`,
  bridgeUrl: \`\${tls ? 'https' : 'http'}://\${host}:8600\`,
  syncUrl: \`\${tls ? 'wss' : 'ws'}://\${host}:8700\`,
`;
check('saubere Quelle → keine Funde', lintBetriebSource(GUTE_QUELLE).length === 0);

check(
  'fehlender localhost-Default wird erkannt',
  lintBetriebSource(GUTE_QUELLE.replace(/'localhost'/g, "'irgendwas'")).some((f) => f.includes('localhost')),
);

check(
  'fehlender Port (8700) wird erkannt',
  lintBetriebSource(GUTE_QUELLE.replace(':8700', ':9999')).some((f) => f.includes('8700')),
);

check(
  'fehlender TLS-Wächter wird erkannt',
  lintBetriebSource(GUTE_QUELLE.replace("ein.betriebsart === 'remote' && ein.remoteTls === true", 'true')).some((f) =>
    f.includes('TLS-Wächter'),
  ),
);

check('0.0.0.0 im Quelltext wird erkannt', lintBetriebSource(`${GUTE_QUELLE}\nconst x = '0.0.0.0';`).some((f) => f.includes('0.0.0.0')));

// ---------------------------------------------------------------------------
// 2) Die echte betrieb.ts-Quelle besteht den Lint (Regressionsschutz)
// ---------------------------------------------------------------------------

{
  const betriebPath = path.join(kosmoOrbitRoot, 'packages', 'kosmo-ai', 'src', 'betrieb.ts');
  const src = readFileSync(betriebPath, 'utf8');
  const findings = lintBetriebSource(src);
  check(`echte betrieb.ts besteht den Konfig-Lint (Funde: ${JSON.stringify(findings)})`, findings.length === 0);
}

// ---------------------------------------------------------------------------
// 3) bindSmokeCheck — muss laufen und ein plausibles Ergebnis liefern
// ---------------------------------------------------------------------------

const bindResult = await bindSmokeCheck({ timeoutMs: 300 });
check(
  `bindSmokeCheck liefert ok/skipped, nie fail (Ergebnis: ${bindResult.status})`,
  bindResult.status === 'ok' || bindResult.status === 'skipped',
);
check('bindSmokeCheck liefert einen erklärenden Text', typeof bindResult.detail === 'string' && bindResult.detail.length > 0);

check('lanIPv4Adressen liefert ein Array', Array.isArray(lanIPv4Adressen()));

// ---------------------------------------------------------------------------
// Ergebnis
// ---------------------------------------------------------------------------

if (failures.length > 0) {
  console.error(`[netz-check.test] ROT — ${failures.length} Fehlschlag/Fehlschläge:`);
  for (const f of failures) console.error(`  - ${f}`);
  process.exitCode = 1;
} else {
  console.log('[netz-check.test] grün — alle Prüfungen bestanden.');
}
