#!/usr/bin/env node

import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, relative, resolve } from 'node:path';

const root = process.cwd();
const args = parseArgs(process.argv.slice(2));
const url = args.url || 'http://localhost:3107/orbit/';
const outputJsonPath = resolve(root, args.output || 'examples/kosmo-orbit/review/orbit-local-render-smoke.generated.json');
const outputMdPath = resolve(root, args.markdown || 'examples/kosmo-orbit/review/orbit-local-render-smoke.generated.md');

const markers = [
  ['renders_home_pc_handover_index', 'Home-PC Handover Index'],
  ['renders_handover_doctor', 'Handover Doctor'],
  ['renders_doctor_checks', 'Doctor Checks'],
  ['renders_doctor_report', 'Doctor Report'],
  ['renders_doctor_passed_status', 'home_pc_handover_doctor_passed'],
  ['renders_doctor_check_count', '17/17'],
  ['renders_home_pc_dry_run_check_count', '54/54'],
  ['renders_doctor_script_command', 'scripts/kosmo-home-pc-handover-doctor.sh'],
  ['renders_doctor_report_path', 'tmp/kosmo-home-pc-handover-doctor.json']
];

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});

async function main() {
  const html = await fetchHtml(url);
  const report = buildReport(html);

  await Promise.all([
    mkdir(dirname(outputJsonPath), { recursive: true }),
    mkdir(dirname(outputMdPath), { recursive: true })
  ]);
  await writeFile(outputJsonPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  await writeFile(outputMdPath, renderMarkdown(report), 'utf8');

  console.log('KosmoOrbit local render smoke');
  console.log(`Status: ${report.status}`);
  console.log(`URL: ${url}`);
  console.log(`Checks: ${report.summary.passed_checks}/${report.summary.check_count}`);
  console.log(`Wrote: ${relative(root, outputMdPath)}`);

  if (report.status !== 'orbit_local_render_smoke_passed') process.exit(1);
}

async function fetchHtml(targetUrl) {
  let response;
  try {
    response = await fetch(targetUrl, {
      redirect: 'follow',
      headers: {
        accept: 'text/html,application/xhtml+xml'
      }
    });
  } catch (error) {
    throw new Error(`Could not fetch KosmoOrbit local URL ${targetUrl}. Start a local server first, for example: npm run dev -- -p 3107. ${error.message}`);
  }

  const html = await response.text();
  if (!response.ok) {
    throw new Error(`KosmoOrbit local URL returned HTTP ${response.status}. Body preview: ${html.slice(0, 240)}`);
  }
  return html;
}

function buildReport(html) {
  const checks = markers.map(([id, marker]) => check(id, `Rendered HTML contains ${marker}.`, html.includes(marker)));
  const failed = checks.filter((item) => item.status !== 'passed');

  return {
    schema_version: '0.1',
    generated_at: new Date().toISOString(),
    generator: 'kosmo-orbit-local-render-smoke',
    status: failed.length ? 'orbit_local_render_smoke_blocked' : 'orbit_local_render_smoke_passed',
    url,
    mode: 'local_review_only',
    safety: {
      starts_server: false,
      calls_external_network: false,
      mutates_cloud_data: false,
      writes_project_report_only: true
    },
    summary: {
      check_count: checks.length,
      passed_checks: checks.filter((item) => item.status === 'passed').length,
      failed_checks: failed.length
    },
    checks,
    next_actions: failed.length
      ? failed.map((item) => `Fix failed local render smoke marker: ${item.id}`)
      : [
          'Keep this smoke as the local UI gate after refreshing the Orbit runtime bridge evidence.',
          'Run it against a local dev or preview server before handing Orbit UI changes to the Home-PC worker.'
        ]
  };
}

function check(id, label, passed) {
  return {
    id,
    label,
    status: passed ? 'passed' : 'failed'
  };
}

function renderMarkdown(report) {
  const lines = [
    '# KosmoOrbit Local Render Smoke',
    '',
    `Generated: ${report.generated_at}`,
    `Status: \`${report.status}\``,
    `URL: \`${report.url}\``,
    '',
    'Checks a running local KosmoOrbit route for the visible Home-PC handover and doctor markers. It does not start servers, push, deploy, upload, mutate accounts or trigger productive runtime actions.',
    '',
    '## Summary',
    '',
    `- checks: ${report.summary.passed_checks}/${report.summary.check_count} passed`,
    '',
    '## Checks',
    '',
    '| Check | Status | Meaning |',
    '| --- | --- | --- |'
  ];

  report.checks.forEach((item) => {
    lines.push(`| \`${item.id}\` | \`${item.status}\` | ${escapePipe(item.label)} |`);
  });

  lines.push('', '## Next Actions', '');
  report.next_actions.forEach((action) => lines.push(`- ${action}`));

  return `${lines.join('\n')}\n`;
}

function parseArgs(argv) {
  const parsed = {};
  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (!token.startsWith('--')) continue;
    const key = token.slice(2);
    const next = argv[index + 1];
    if (!next || next.startsWith('--')) {
      parsed[key] = true;
      continue;
    }
    parsed[key] = next;
    index += 1;
  }
  return parsed;
}

function escapePipe(value) {
  return String(value ?? '').replace(/\|/g, '\\|');
}
