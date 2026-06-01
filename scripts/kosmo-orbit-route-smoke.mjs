#!/usr/bin/env node

import { existsSync, readFileSync } from 'node:fs';
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, relative, resolve } from 'node:path';

const root = process.cwd();
const args = parseArgs(process.argv.slice(2));
const routePath = resolve(root, args.route || 'app/orbit/page.tsx');
const roleSwitcherPath = resolve(root, args.roleSwitcher || 'app/orbit/OrbitRoleSwitcher.tsx');
const demoReviewPath = resolve(root, args.demoReview || 'app/orbit/OrbitDemoReviewPath.tsx');
const projectDashboardPath = resolve(root, args.projectDashboard || 'app/orbit/OrbitProjectDashboard.tsx');
const presenterBriefPath = resolve(root, args.presenterBrief || 'app/orbit/OrbitPresenterBrief.tsx');
const progressMapPath = resolve(root, args.progressMap || 'app/orbit/OrbitProgressMap.tsx');
const demoQuestionsPath = resolve(root, args.demoQuestions || 'app/orbit/OrbitDemoQuestions.tsx');
const reviewDecisionDraftPath = resolve(root, args.reviewDecisionDraft || 'app/orbit/OrbitReviewDecisionDraft.tsx');
const runtimeBoundaryPath = resolve(root, args.runtimeBoundary || 'app/orbit/OrbitRuntimeBoundary.tsx');
const qualityEvidencePath = resolve(root, args.qualityEvidence || 'app/orbit/OrbitQualityEvidence.tsx');
const workstationPrioritiesPath = resolve(root, args.workstationPriorities || 'app/orbit/OrbitWorkstationPriorities.tsx');
const autonomyStatusPath = resolve(root, args.autonomyStatus || 'app/orbit/OrbitAutonomyStatus.tsx');
const sectionIndexPath = resolve(root, args.sectionIndex || 'app/orbit/OrbitSectionIndex.tsx');
const specPath = resolve(root, args.spec || 'examples/kosmo-orbit/review/orbit-app-route-spec.generated.json');
const outputJsonPath = resolve(root, args.output || 'examples/kosmo-orbit/review/orbit-route-smoke.generated.json');
const outputMdPath = resolve(root, args.markdown || 'examples/kosmo-orbit/review/orbit-route-smoke.generated.md');

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});

async function main() {
  if (!existsSync(routePath)) throw new Error(`KosmoOrbit route file not found: ${routePath}`);
  if (!existsSync(specPath)) throw new Error(`KosmoOrbit app route spec not found: ${specPath}`);

  const routeSource = readFileSync(routePath, 'utf8');
  const roleSwitcherSource = existsSync(roleSwitcherPath) ? readFileSync(roleSwitcherPath, 'utf8') : '';
  const demoReviewSource = existsSync(demoReviewPath) ? readFileSync(demoReviewPath, 'utf8') : '';
  const projectDashboardSource = existsSync(projectDashboardPath) ? readFileSync(projectDashboardPath, 'utf8') : '';
  const presenterBriefSource = existsSync(presenterBriefPath) ? readFileSync(presenterBriefPath, 'utf8') : '';
  const progressMapSource = existsSync(progressMapPath) ? readFileSync(progressMapPath, 'utf8') : '';
  const demoQuestionsSource = existsSync(demoQuestionsPath) ? readFileSync(demoQuestionsPath, 'utf8') : '';
  const reviewDecisionDraftSource = existsSync(reviewDecisionDraftPath) ? readFileSync(reviewDecisionDraftPath, 'utf8') : '';
  const runtimeBoundarySource = existsSync(runtimeBoundaryPath) ? readFileSync(runtimeBoundaryPath, 'utf8') : '';
  const qualityEvidenceSource = existsSync(qualityEvidencePath) ? readFileSync(qualityEvidencePath, 'utf8') : '';
  const workstationPrioritiesSource = existsSync(workstationPrioritiesPath) ? readFileSync(workstationPrioritiesPath, 'utf8') : '';
  const autonomyStatusSource = existsSync(autonomyStatusPath) ? readFileSync(autonomyStatusPath, 'utf8') : '';
  const sectionIndexSource = existsSync(sectionIndexPath) ? readFileSync(sectionIndexPath, 'utf8') : '';
  const spec = readJson(specPath);
  const report = buildReport({ routeSource, roleSwitcherSource, demoReviewSource, projectDashboardSource, presenterBriefSource, progressMapSource, demoQuestionsSource, reviewDecisionDraftSource, runtimeBoundarySource, qualityEvidenceSource, workstationPrioritiesSource, autonomyStatusSource, sectionIndexSource, spec });

  await Promise.all([
    mkdir(dirname(outputJsonPath), { recursive: true }),
    mkdir(dirname(outputMdPath), { recursive: true })
  ]);
  await writeFile(outputJsonPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  await writeFile(outputMdPath, renderMarkdown(report), 'utf8');

  console.log('KosmoOrbit route smoke');
  console.log(`Status: ${report.status}`);
  console.log(`Checks: ${report.summary.passed_checks}/${report.summary.check_count}`);
  console.log(`Wrote: ${relative(root, outputMdPath)}`);

  if (report.status !== 'orbit_route_smoke_passed') process.exit(1);
}

function buildReport({ routeSource, roleSwitcherSource, demoReviewSource, projectDashboardSource, presenterBriefSource, progressMapSource, demoQuestionsSource, reviewDecisionDraftSource, runtimeBoundarySource, qualityEvidenceSource, workstationPrioritiesSource, autonomyStatusSource, sectionIndexSource, spec }) {
  const source = `${routeSource}\n${roleSwitcherSource}\n${demoReviewSource}\n${projectDashboardSource}\n${presenterBriefSource}\n${progressMapSource}\n${demoQuestionsSource}\n${reviewDecisionDraftSource}\n${runtimeBoundarySource}\n${qualityEvidenceSource}\n${workstationPrioritiesSource}\n${autonomyStatusSource}\n${sectionIndexSource}`;
  const forbiddenPatterns = [
    { id: 'no_use_server', pattern: /['"]use server['"]/ },
    { id: 'no_next_server', pattern: /from ['"]next\/server['"]/ },
    { id: 'no_fetch', pattern: /\bfetch\s*\(/ },
    { id: 'no_cookies', pattern: /\bcookies\s*\(/ },
    { id: 'no_headers', pattern: /\bheaders\s*\(/ },
    { id: 'no_redirect', pattern: /\bredirect\s*\(/ }
  ];

  const checks = [
    check('route_file_exists', 'app/orbit/page.tsx exists.', existsSync(routePath)),
    check('spec_ready', 'App route spec is ready.', spec.status === 'orbit_app_route_spec_ready'),
    check('spec_sees_implemented_route', 'App route spec sees the route as implemented static preview.', spec.route_spec?.status === 'implemented_static_preview'),
    check('imports_route_spec', 'Route imports the local route spec JSON.', source.includes('orbit-app-route-spec.generated.json')),
    check('imports_role_state', 'Route imports the local role state JSON.', source.includes('role-state.demo.json')),
    check('imports_role_variants', 'Route imports the local role variants JSON.', source.includes('role-ui-variants.generated.json')),
    check('imports_shell_manifest', 'Route imports the local shell manifest JSON.', source.includes('role-shell-prototype.generated.json')),
    check('role_switcher_file_exists', 'Orbit role switcher client component exists.', existsSync(roleSwitcherPath)),
    check('demo_review_file_exists', 'Orbit guided demo review component exists.', existsSync(demoReviewPath)),
    check('project_dashboard_file_exists', 'Orbit project package dashboard component exists.', existsSync(projectDashboardPath)),
    check('presenter_brief_file_exists', 'Orbit presenter brief component exists.', existsSync(presenterBriefPath)),
    check('progress_map_file_exists', 'Orbit progress map component exists.', existsSync(progressMapPath)),
    check('demo_questions_file_exists', 'Orbit demo questions component exists.', existsSync(demoQuestionsPath)),
    check('review_decision_draft_file_exists', 'Orbit review decision draft component exists.', existsSync(reviewDecisionDraftPath)),
    check('runtime_boundary_file_exists', 'Orbit MVP/runtime boundary component exists.', existsSync(runtimeBoundaryPath)),
    check('quality_evidence_file_exists', 'Orbit quality evidence component exists.', existsSync(qualityEvidencePath)),
    check('workstation_priorities_file_exists', 'Orbit workstation priorities component exists.', existsSync(workstationPrioritiesPath)),
    check('autonomy_status_file_exists', 'Orbit autonomy status component exists.', existsSync(autonomyStatusPath)),
    check('section_index_file_exists', 'Orbit section index component exists.', existsSync(sectionIndexPath)),
    check('imports_role_switcher', 'Route imports the role switcher preview component.', routeSource.includes('OrbitRoleSwitcher')),
    check('imports_demo_review_path', 'Route imports the guided demo review component.', routeSource.includes('OrbitDemoReviewPath')),
    check('imports_project_dashboard', 'Route imports the project package dashboard component.', routeSource.includes('OrbitProjectDashboard')),
    check('imports_presenter_brief', 'Route imports the presenter brief component.', routeSource.includes('OrbitPresenterBrief')),
    check('imports_progress_map', 'Route imports the vision-to-MVP progress map component.', routeSource.includes('OrbitProgressMap')),
    check('imports_demo_questions', 'Route imports the demo questions briefing component.', routeSource.includes('OrbitDemoQuestions')),
    check('imports_review_decision_draft', 'Route imports the review decision draft component.', routeSource.includes('OrbitReviewDecisionDraft')),
    check('imports_runtime_boundary', 'Route imports the MVP/runtime boundary component.', routeSource.includes('OrbitRuntimeBoundary')),
    check('imports_quality_evidence', 'Route imports the quality evidence component.', routeSource.includes('OrbitQualityEvidence')),
    check('imports_workstation_priorities', 'Route imports the workstation priorities component.', routeSource.includes('OrbitWorkstationPriorities')),
    check('imports_autonomy_status', 'Route imports the autonomy status component.', routeSource.includes('OrbitAutonomyStatus')),
    check('imports_section_index', 'Route imports the section index navigation component.', routeSource.includes('OrbitSectionIndex')),
    check('uses_force_static', 'Route declares force-static rendering.', source.includes("dynamic = 'force-static'") || source.includes('dynamic = "force-static"')),
    check('shows_kosmo_orbit', 'Route renders KosmoOrbit heading.', source.includes('KosmoOrbit')),
    check('shows_demo_path', 'Route renders the 3-minute human demo path.', source.includes('3-Minuten-Demo') && source.includes('demoSteps')),
    check('shows_design_review_mode', 'Route renders KosmoDesign Review Mode handoff copy.', source.includes('KosmoDesign Review Mode')),
    check('shows_role_explanations', 'Route renders role explanations from variants.', source.includes('variant.explanation')),
    check('shows_role_switcher_preview', 'Route renders a local role switching preview.', source.includes('Rollenumschaltung Preview') && source.includes('setSelectedRoleId')),
    check('keeps_role_switcher_local', 'Role switcher explains that it writes no user data.', source.includes('schreibt keine Userdaten')),
    check('shows_guided_demo_review_path', 'Route renders a guided project lead and design review path.', source.includes('Gefuehrter Demo-Review-Pfad') && source.includes('setSelectedStepId')),
    check('shows_project_lead_and_design_roles', 'Guided demo includes Projektleitung and Entwurf roles.', source.includes('project_lead_architect') && source.includes('design_architect')),
    check('shows_project_package_dashboard', 'Route renders the project package day view.', source.includes('Projektpaket Tagesansicht') && source.includes('Naechste Review-Artefakte')),
    check('imports_project_review_artifacts', 'Route imports project inspector and design handoff artifacts.', source.includes('project-inspector.generated.json') && source.includes('design-handoff-preview.generated.json')),
    check('shows_presenter_brief', 'Route renders the three-minute presenter explanation.', source.includes('Presenter-Modus') && source.includes('3-Minuten-Erklaerung')),
    check('shows_value_claims', 'Presenter brief covers better, faster and cheaper value claims.', source.includes('Besser') && source.includes('Schneller') && source.includes('Guenstiger')),
    check('shows_progress_map', 'Route renders a visible project progress map.', source.includes('Projektfortschritt') && source.includes('Von Vision zu sichtbarem KosmoOrbit-MVP')),
    check('keeps_progress_map_non_absolute', 'Progress map avoids claiming one absolute total project percentage.', source.includes('keine Gesamtprojekt-Prozentzahl')),
    check('shows_runtime_and_generation_lanes', 'Progress map separates local runtime from CAD/plan generation.', source.includes('KosmoZentrale Runtime') && source.includes('CAD-/Plan-Generation')),
    check('shows_demo_questions', 'Route renders architect-facing demo questions.', source.includes('Demo-Fragen') && source.includes('Antworten fuer ein Architekturbuero')),
    check('anchors_demo_claims', 'Demo questions point claims back to visible panels.', source.includes('Welche Panel') || (source.includes('Presenter-Modus') && source.includes('Projektpaket Tagesansicht') && source.includes('Guardrails'))),
    check('shows_review_decision_draft', 'Route renders a local non-writing review decision draft.', source.includes('Review Decision Draft') && source.includes('needs_more_evidence')),
    check('keeps_decision_draft_non_writing', 'Decision draft states that it writes no decision record.', source.includes('schreibt kein Decision Record')),
    check('shows_runtime_boundary', 'Route renders visible MVP and runtime boundaries.', source.includes('MVP-Grenze') && source.includes('Heute sichtbar') && source.includes('Spaetere Runtime')),
    check('keeps_runtime_side_effects_off', 'Runtime boundary states no runtime side effects.', source.includes('no-runtime-side-effects')),
    check('shows_quality_evidence', 'Route renders local review and route-smoke quality evidence.', source.includes('Pruefevidenz') && source.includes('Warum diese Preview belastbar ist')),
    check('imports_quality_reports', 'Route imports full review and route smoke reports.', source.includes('orbit-full-review.generated.json') && source.includes('orbit-route-smoke.generated.json')),
    check('shows_workstation_priorities', 'Route renders role-first workstation priorities.', source.includes('Arbeitsstationen') && source.includes('role-first-ui')),
    check('covers_core_workstation_roles', 'Workstation priorities cover owner, project lead, design, drafting and education.', source.includes('Chef / Admin') && source.includes('Projektleitung') && source.includes('Entwurf') && source.includes('Zeichnung') && source.includes('Ausbildung')),
    check('shows_autonomy_status', 'Route renders local autonomy status and safety limits.', source.includes('Autonomie-Status') && source.includes('local-autonomy')),
    check('keeps_autonomy_cost_safe', 'Autonomy status keeps Cloud costs and writes blocked.', source.includes('keine Cloud-Kosten') && source.includes('keine Writes')),
    check('keeps_autonomy_named_orbit', 'Autonomy status names KosmoOrbit, not KosmoWebsite.', source.includes('Was KosmoOrbit gerade selbststaendig tut') && !source.includes('KosmoWebsite')),
    check('shows_section_index', 'Route renders compact demo section navigation.', source.includes('Demo-Navigation') && source.includes('#fortschritt') && source.includes('#projektpaket') && source.includes('#guardrails')),
    check('anchors_core_sections', 'Route contains anchors for core demo sections.', source.includes('id="autonomie"') && source.includes('id="projektpaket"') && source.includes('id="rollen"')),
    check('shows_blocked_actions', 'Route renders blocked action labels from role state.', source.includes('Blockierte Aktionen') && source.includes('roleState.blocked_actions.map')),
    check('shows_review_only_copy', 'Route keeps review-only safety copy visible.', source.includes('review-only') || source.includes('Review')),
    ...forbiddenPatterns.map((item) => check(item.id, `Forbidden pattern is absent: ${item.id}.`, !item.pattern.test(source)))
  ];
  const failed = checks.filter((item) => item.status !== 'passed');

  return {
    schema_version: '0.1',
    generated_at: new Date().toISOString(),
    generator: 'kosmo-orbit-route-smoke',
    status: failed.length ? 'orbit_route_smoke_blocked' : 'orbit_route_smoke_passed',
    route_file: relative(root, routePath),
    spec_file: relative(root, specPath),
    summary: {
      check_count: checks.length,
      passed_checks: checks.filter((item) => item.status === 'passed').length,
      failed_checks: failed.length
    },
    checks,
    next_actions: failed.length
      ? failed.map((item) => `Fix failed KosmoOrbit route smoke check: ${item.id}`)
      : [
          'Keep /orbit static-export-safe until a local Orbit runtime exists.',
          'Do not add public navigation to /orbit before a human review approves the preview.',
          'Use this route as the first visible KosmoOrbit cockpit for role and gate review.'
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
    '# KosmoOrbit Route Smoke',
    '',
    `Generated: ${report.generated_at}`,
    `Status: \`${report.status}\``,
    `Route: \`${report.route_file}\``,
    '',
    'Static route smoke for the first `/orbit` preview. This check rejects server-only patterns, network calls, cookies, headers and redirects.',
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

  for (const item of report.checks) {
    lines.push(`| \`${item.id}\` | \`${item.status}\` | ${escapePipe(item.label)} |`);
  }

  lines.push('', '## Next Actions', '');
  report.next_actions.forEach((action) => lines.push(`- ${action}`));

  return `${lines.join('\n')}\n`;
}

function readJson(pathname) {
  return JSON.parse(readFileSync(pathname, 'utf8'));
}

function escapePipe(value) {
  return String(value ?? '').replace(/\|/g, '\\|');
}

function parseArgs(argv) {
  const parsed = {};
  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (!token.startsWith('--')) continue;
    const key = token.slice(2);
    const next = argv[index + 1];
    if (next && !next.startsWith('--')) {
      parsed[key] = next;
      index += 1;
    } else {
      parsed[key] = true;
    }
  }
  return parsed;
}
