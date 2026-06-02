#!/usr/bin/env node

import { execFileSync } from 'node:child_process';

const steps = [
  ['kosmo:orbit-route-smoke', 'Refresh KosmoOrbit route smoke.'],
  ['kosmo:orbit-static-smoke', 'Refresh KosmoOrbit static export smoke.'],
  ['generated:cleanup', 'Remove timestamp-only generated report noise.'],
  ['kosmo:orbit-push-readiness', 'Run stable local push readiness.'],
  ['generated:cleanup', 'Restore timestamp-only push readiness output after verification.']
];

main();

function main() {
  console.log('KosmoOrbit readiness sweep');
  console.log('Mode: local review-only; no push, deploy, upload, external account or cost action.');

  const results = [];
  for (const [scriptName, label] of steps) {
    console.log(`\n> ${scriptName}`);
    try {
      const output = execFileSync('npm', ['run', scriptName], {
        cwd: process.cwd(),
        encoding: 'utf8',
        maxBuffer: 1024 * 1024 * 16,
        stdio: ['ignore', 'pipe', 'pipe']
      });
      process.stdout.write(output);
      results.push({ scriptName, label, status: 'passed' });
    } catch (error) {
      const output = `${error.stdout ?? ''}${error.stderr ?? ''}`;
      process.stdout.write(output);
      results.push({ scriptName, label, status: 'failed' });
      console.error(`\nKosmoOrbit readiness sweep failed at ${scriptName}.`);
      printSummary(results);
      process.exit(1);
    }
  }

  printSummary(results);
}

function printSummary(results) {
  const passed = results.filter((result) => result.status === 'passed').length;
  console.log('\nSummary');
  console.log(`Checks: ${passed}/${results.length}`);
  results.forEach((result) => {
    console.log(`- ${result.scriptName}: ${result.status} - ${result.label}`);
  });
}
