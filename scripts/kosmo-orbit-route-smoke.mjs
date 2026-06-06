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
const designHandoffPanelPath = resolve(root, args.designHandoffPanel || 'app/orbit/OrbitDesignHandoffPanel.tsx');
const designPilotPath = resolve(root, args.designPilot || 'app/orbit/OrbitDesignPilotPath.tsx');
const designHandoffPanelDataPath = resolve(root, args.designHandoffPanelData || 'examples/kosmo-projects/kosmo-demo-001/orbit/design-handoff-ui-panel.generated.json');
const presenterBriefPath = resolve(root, args.presenterBrief || 'app/orbit/OrbitPresenterBrief.tsx');
const workflowDeltaPath = resolve(root, args.workflowDelta || 'app/orbit/OrbitWorkflowDelta.tsx');
const pilotMeasurementPath = resolve(root, args.pilotMeasurement || 'app/orbit/OrbitPilotMeasurement.tsx');
const pilotMeasurementKitPath = resolve(root, args.pilotMeasurementKit || 'app/orbit/OrbitPilotMeasurementKit.tsx');
const pilotFacilitatorChecklistPath = resolve(root, args.pilotFacilitatorChecklist || 'app/orbit/OrbitPilotFacilitatorChecklist.tsx');
const pilotResultDraftPath = resolve(root, args.pilotResultDraft || 'app/orbit/OrbitPilotResultDraft.tsx');
const pilotRunbookPath = resolve(root, args.pilotRunbook || 'app/orbit/OrbitPilotRunbook.tsx');
const pilotSessionTemplatePath = resolve(root, args.pilotSessionTemplate || 'app/orbit/OrbitPilotSessionTemplate.tsx');
const progressMapPath = resolve(root, args.progressMap || 'app/orbit/OrbitProgressMap.tsx');
const visionBridgePath = resolve(root, args.visionBridge || 'app/orbit/OrbitVisionBridge.tsx');
const demoQuestionsPath = resolve(root, args.demoQuestions || 'app/orbit/OrbitDemoQuestions.tsx');
const installationTopologyPath = resolve(root, args.installationTopology || 'app/orbit/OrbitInstallationTopology.tsx');
const healthReadinessPath = resolve(root, args.healthReadiness || 'app/orbit/OrbitHealthReadiness.tsx');
const healthReadinessContractPath = resolve(root, args.healthReadinessContract || 'examples/kosmo-orbit/health/health-readiness.contract.json');
const riskRegisterPath = resolve(root, args.riskRegister || 'app/orbit/OrbitRiskRegister.tsx');
const commandContractPath = resolve(root, args.commandContract || 'app/orbit/OrbitCommandContract.tsx');
const commandContractDataPath = resolve(root, args.commandContractData || 'examples/kosmo-orbit/commands/orbit-command.contract.json');
const auditTrailPath = resolve(root, args.auditTrail || 'app/orbit/OrbitAuditTrail.tsx');
const auditTrailDataPath = resolve(root, args.auditTrailData || 'examples/kosmo-orbit/audit/orbit-audit-trail.contract.json');
const reviewDecisionDraftPath = resolve(root, args.reviewDecisionDraft || 'app/orbit/OrbitReviewDecisionDraft.tsx');
const runtimeBoundaryPath = resolve(root, args.runtimeBoundary || 'app/orbit/OrbitRuntimeBoundary.tsx');
const runtimeAdapterPath = resolve(root, args.runtimeAdapter || 'app/orbit/OrbitRuntimeAdapterContract.tsx');
const runtimeAdapterDataPath = resolve(root, args.runtimeAdapterData || 'examples/kosmo-orbit/runtime/orbit-runtime-adapter.contract.json');
const localRuntimeBridgePath = resolve(root, args.localRuntimeBridge || 'app/orbit/OrbitLocalRuntimeBridge.tsx');
const localRuntimeBridgeDataPath = resolve(root, args.localRuntimeBridgeData || 'examples/kosmo-orbit/review/orbit-local-runtime-bridge.generated.json');
const kosmoSketchAdapterPath = resolve(root, args.kosmoSketchAdapter || 'app/orbit/OrbitKosmoSketchAdapterContract.tsx');
const kosmoSketchAdapterDataPath = resolve(root, args.kosmoSketchAdapterData || 'examples/kosmo-orbit/runtime/kosmosketch-tool-adapter.contract.json');
const runtimeContractPath = resolve(root, args.runtimeContract || 'app/orbit/OrbitRuntimeContract.tsx');
const qualityEvidencePath = resolve(root, args.qualityEvidence || 'app/orbit/OrbitQualityEvidence.tsx');
const workstationPrioritiesPath = resolve(root, args.workstationPriorities || 'app/orbit/OrbitWorkstationPriorities.tsx');
const workstationProfilePath = resolve(root, args.workstationProfile || 'app/orbit/OrbitWorkstationProfileContract.tsx');
const workstationProfileDataPath = resolve(root, args.workstationProfileData || 'examples/kosmo-orbit/workstations/orbit-workstation-profile.contract.json');
const localIdentityPath = resolve(root, args.localIdentity || 'app/orbit/OrbitLocalIdentityContract.tsx');
const localIdentityDataPath = resolve(root, args.localIdentityData || 'examples/kosmo-orbit/identity/orbit-local-identity.contract.json');
const dataGovernancePath = resolve(root, args.dataGovernance || 'app/orbit/OrbitDataGovernanceContract.tsx');
const dataGovernanceDataPath = resolve(root, args.dataGovernanceData || 'examples/kosmo-orbit/governance/orbit-data-governance.contract.json');
const officeMemoryPath = resolve(root, args.officeMemory || 'app/orbit/OrbitOfficeMemoryReadiness.tsx');
const officeMemoryDataPath = resolve(root, args.officeMemoryData || 'examples/kosmo-orbit/memory/orbit-office-memory-readiness.contract.json');
const localStorageDecisionPath = resolve(root, args.localStorageDecision || 'app/orbit/OrbitLocalStorageDecisionDraft.tsx');
const localStorageDecisionDataPath = resolve(root, args.localStorageDecisionData || 'examples/kosmo-orbit/storage/orbit-local-storage-decision.draft.json');
const deleteExportRestorePath = resolve(root, args.deleteExportRestore || 'app/orbit/OrbitDeleteExportRestoreDrill.tsx');
const deleteExportRestoreDataPath = resolve(root, args.deleteExportRestoreData || 'examples/kosmo-orbit/storage/orbit-delete-export-restore-drill.contract.json');
const learningModePath = resolve(root, args.learningMode || 'app/orbit/OrbitLearningMode.tsx');
const permissionMatrixPath = resolve(root, args.permissionMatrix || 'app/orbit/OrbitPermissionMatrix.tsx');
const autonomyStatusPath = resolve(root, args.autonomyStatus || 'app/orbit/OrbitAutonomyStatus.tsx');
const officeRoutinePath = resolve(root, args.officeRoutine || 'app/orbit/OrbitOfficeRoutine.tsx');
const officeRoutineDataPath = resolve(root, args.officeRoutineData || 'examples/kosmo-orbit/routines/orbit-office-routine.contract.json');
const officePilotScenePath = resolve(root, args.officePilotScene || 'app/orbit/OrbitOfficePilotScene.tsx');
const officePilotSceneDataPath = resolve(root, args.officePilotSceneData || 'examples/kosmo-orbit/pilot/orbit-office-pilot-scene.demo.json');
const toolRegistryPath = resolve(root, args.toolRegistry || 'app/orbit/OrbitToolRegistry.tsx');
const toolRegistryDataPath = resolve(root, args.toolRegistryData || 'examples/kosmo-orbit/workspace.demo.json');
const demoReadinessPath = resolve(root, args.demoReadiness || 'app/orbit/OrbitDemoReadiness.tsx');
const publishReadinessPath = resolve(root, args.publishReadiness || 'app/orbit/OrbitPublishReadiness.tsx');
const launchDecisionBriefPath = resolve(root, args.launchDecisionBrief || 'app/orbit/OrbitLaunchDecisionBrief.tsx');
const sectionIndexPath = resolve(root, args.sectionIndex || 'app/orbit/OrbitSectionIndex.tsx');
const specPath = resolve(root, args.spec || 'examples/kosmo-orbit/review/orbit-app-route-spec.generated.json');
const packageJsonPath = resolve(root, args.packageJson || 'package.json');
const localRenderSmokePath = resolve(root, args.localRenderSmoke || 'scripts/kosmo-orbit-local-render-smoke.mjs');
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
  const designHandoffPanelSource = existsSync(designHandoffPanelPath) ? readFileSync(designHandoffPanelPath, 'utf8') : '';
  const designPilotSource = existsSync(designPilotPath) ? readFileSync(designPilotPath, 'utf8') : '';
  const designHandoffPanelDataSource = existsSync(designHandoffPanelDataPath) ? readFileSync(designHandoffPanelDataPath, 'utf8') : '';
  const presenterBriefSource = existsSync(presenterBriefPath) ? readFileSync(presenterBriefPath, 'utf8') : '';
  const workflowDeltaSource = existsSync(workflowDeltaPath) ? readFileSync(workflowDeltaPath, 'utf8') : '';
  const pilotMeasurementSource = existsSync(pilotMeasurementPath) ? readFileSync(pilotMeasurementPath, 'utf8') : '';
  const pilotMeasurementKitSource = existsSync(pilotMeasurementKitPath) ? readFileSync(pilotMeasurementKitPath, 'utf8') : '';
  const pilotFacilitatorChecklistSource = existsSync(pilotFacilitatorChecklistPath) ? readFileSync(pilotFacilitatorChecklistPath, 'utf8') : '';
  const pilotResultDraftSource = existsSync(pilotResultDraftPath) ? readFileSync(pilotResultDraftPath, 'utf8') : '';
  const pilotRunbookSource = existsSync(pilotRunbookPath) ? readFileSync(pilotRunbookPath, 'utf8') : '';
  const pilotSessionTemplateSource = existsSync(pilotSessionTemplatePath) ? readFileSync(pilotSessionTemplatePath, 'utf8') : '';
  const progressMapSource = existsSync(progressMapPath) ? readFileSync(progressMapPath, 'utf8') : '';
  const visionBridgeSource = existsSync(visionBridgePath) ? readFileSync(visionBridgePath, 'utf8') : '';
  const demoQuestionsSource = existsSync(demoQuestionsPath) ? readFileSync(demoQuestionsPath, 'utf8') : '';
  const installationTopologySource = existsSync(installationTopologyPath) ? readFileSync(installationTopologyPath, 'utf8') : '';
  const healthReadinessSource = existsSync(healthReadinessPath) ? readFileSync(healthReadinessPath, 'utf8') : '';
  const healthReadinessContractSource = existsSync(healthReadinessContractPath) ? readFileSync(healthReadinessContractPath, 'utf8') : '';
  const riskRegisterSource = existsSync(riskRegisterPath) ? readFileSync(riskRegisterPath, 'utf8') : '';
  const commandContractSource = existsSync(commandContractPath) ? readFileSync(commandContractPath, 'utf8') : '';
  const commandContractDataSource = existsSync(commandContractDataPath) ? readFileSync(commandContractDataPath, 'utf8') : '';
  const auditTrailSource = existsSync(auditTrailPath) ? readFileSync(auditTrailPath, 'utf8') : '';
  const auditTrailDataSource = existsSync(auditTrailDataPath) ? readFileSync(auditTrailDataPath, 'utf8') : '';
  const reviewDecisionDraftSource = existsSync(reviewDecisionDraftPath) ? readFileSync(reviewDecisionDraftPath, 'utf8') : '';
  const runtimeBoundarySource = existsSync(runtimeBoundaryPath) ? readFileSync(runtimeBoundaryPath, 'utf8') : '';
  const runtimeAdapterSource = existsSync(runtimeAdapterPath) ? readFileSync(runtimeAdapterPath, 'utf8') : '';
  const runtimeAdapterDataSource = existsSync(runtimeAdapterDataPath) ? readFileSync(runtimeAdapterDataPath, 'utf8') : '';
  const localRuntimeBridgeSource = existsSync(localRuntimeBridgePath) ? readFileSync(localRuntimeBridgePath, 'utf8') : '';
  const localRuntimeBridgeDataSource = existsSync(localRuntimeBridgeDataPath) ? readFileSync(localRuntimeBridgeDataPath, 'utf8') : '';
  const kosmoSketchAdapterSource = existsSync(kosmoSketchAdapterPath) ? readFileSync(kosmoSketchAdapterPath, 'utf8') : '';
  const kosmoSketchAdapterDataSource = existsSync(kosmoSketchAdapterDataPath) ? readFileSync(kosmoSketchAdapterDataPath, 'utf8') : '';
  const runtimeContractSource = existsSync(runtimeContractPath) ? readFileSync(runtimeContractPath, 'utf8') : '';
  const qualityEvidenceSource = existsSync(qualityEvidencePath) ? readFileSync(qualityEvidencePath, 'utf8') : '';
  const workstationPrioritiesSource = existsSync(workstationPrioritiesPath) ? readFileSync(workstationPrioritiesPath, 'utf8') : '';
  const workstationProfileSource = existsSync(workstationProfilePath) ? readFileSync(workstationProfilePath, 'utf8') : '';
  const workstationProfileDataSource = existsSync(workstationProfileDataPath) ? readFileSync(workstationProfileDataPath, 'utf8') : '';
  const localIdentitySource = existsSync(localIdentityPath) ? readFileSync(localIdentityPath, 'utf8') : '';
  const localIdentityDataSource = existsSync(localIdentityDataPath) ? readFileSync(localIdentityDataPath, 'utf8') : '';
  const dataGovernanceSource = existsSync(dataGovernancePath) ? readFileSync(dataGovernancePath, 'utf8') : '';
  const dataGovernanceDataSource = existsSync(dataGovernanceDataPath) ? readFileSync(dataGovernanceDataPath, 'utf8') : '';
  const officeMemorySource = existsSync(officeMemoryPath) ? readFileSync(officeMemoryPath, 'utf8') : '';
  const officeMemoryDataSource = existsSync(officeMemoryDataPath) ? readFileSync(officeMemoryDataPath, 'utf8') : '';
  const localStorageDecisionSource = existsSync(localStorageDecisionPath) ? readFileSync(localStorageDecisionPath, 'utf8') : '';
  const localStorageDecisionDataSource = existsSync(localStorageDecisionDataPath) ? readFileSync(localStorageDecisionDataPath, 'utf8') : '';
  const deleteExportRestoreSource = existsSync(deleteExportRestorePath) ? readFileSync(deleteExportRestorePath, 'utf8') : '';
  const deleteExportRestoreDataSource = existsSync(deleteExportRestoreDataPath) ? readFileSync(deleteExportRestoreDataPath, 'utf8') : '';
  const learningModeSource = existsSync(learningModePath) ? readFileSync(learningModePath, 'utf8') : '';
  const permissionMatrixSource = existsSync(permissionMatrixPath) ? readFileSync(permissionMatrixPath, 'utf8') : '';
  const autonomyStatusSource = existsSync(autonomyStatusPath) ? readFileSync(autonomyStatusPath, 'utf8') : '';
  const officeRoutineSource = existsSync(officeRoutinePath) ? readFileSync(officeRoutinePath, 'utf8') : '';
  const officeRoutineDataSource = existsSync(officeRoutineDataPath) ? readFileSync(officeRoutineDataPath, 'utf8') : '';
  const officePilotSceneSource = existsSync(officePilotScenePath) ? readFileSync(officePilotScenePath, 'utf8') : '';
  const officePilotSceneDataSource = existsSync(officePilotSceneDataPath) ? readFileSync(officePilotSceneDataPath, 'utf8') : '';
  const toolRegistrySource = existsSync(toolRegistryPath) ? readFileSync(toolRegistryPath, 'utf8') : '';
  const toolRegistryDataSource = existsSync(toolRegistryDataPath) ? readFileSync(toolRegistryDataPath, 'utf8') : '';
  const demoReadinessSource = existsSync(demoReadinessPath) ? readFileSync(demoReadinessPath, 'utf8') : '';
  const publishReadinessSource = existsSync(publishReadinessPath) ? readFileSync(publishReadinessPath, 'utf8') : '';
  const launchDecisionBriefSource = existsSync(launchDecisionBriefPath) ? readFileSync(launchDecisionBriefPath, 'utf8') : '';
  const sectionIndexSource = existsSync(sectionIndexPath) ? readFileSync(sectionIndexPath, 'utf8') : '';
  const spec = readJson(specPath);
  const report = buildReport({ routeSource, roleSwitcherSource, demoReviewSource, projectDashboardSource, designHandoffPanelSource, designPilotSource, designHandoffPanelDataSource, presenterBriefSource, workflowDeltaSource, pilotMeasurementSource, pilotMeasurementKitSource, pilotFacilitatorChecklistSource, pilotResultDraftSource, pilotRunbookSource, pilotSessionTemplateSource, progressMapSource, visionBridgeSource, demoQuestionsSource, installationTopologySource, healthReadinessSource, healthReadinessContractSource, riskRegisterSource, commandContractSource, commandContractDataSource, auditTrailSource, auditTrailDataSource, reviewDecisionDraftSource, runtimeBoundarySource, runtimeAdapterSource, runtimeAdapterDataSource, localRuntimeBridgeSource, localRuntimeBridgeDataSource, kosmoSketchAdapterSource, kosmoSketchAdapterDataSource, runtimeContractSource, qualityEvidenceSource, workstationPrioritiesSource, workstationProfileSource, workstationProfileDataSource, localIdentitySource, localIdentityDataSource, dataGovernanceSource, dataGovernanceDataSource, officeMemorySource, officeMemoryDataSource, localStorageDecisionSource, localStorageDecisionDataSource, deleteExportRestoreSource, deleteExportRestoreDataSource, learningModeSource, permissionMatrixSource, autonomyStatusSource, officeRoutineSource, officeRoutineDataSource, officePilotSceneSource, officePilotSceneDataSource, toolRegistrySource, toolRegistryDataSource, demoReadinessSource, publishReadinessSource, launchDecisionBriefSource, sectionIndexSource, spec });

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

function buildReport({ routeSource, roleSwitcherSource, demoReviewSource, projectDashboardSource, designHandoffPanelSource, designPilotSource, designHandoffPanelDataSource, presenterBriefSource, workflowDeltaSource, pilotMeasurementSource, pilotMeasurementKitSource, pilotFacilitatorChecklistSource, pilotResultDraftSource, pilotRunbookSource, pilotSessionTemplateSource, progressMapSource, visionBridgeSource, demoQuestionsSource, installationTopologySource, healthReadinessSource, healthReadinessContractSource, riskRegisterSource, commandContractSource, commandContractDataSource, auditTrailSource, auditTrailDataSource, reviewDecisionDraftSource, runtimeBoundarySource, runtimeAdapterSource, runtimeAdapterDataSource, localRuntimeBridgeSource, localRuntimeBridgeDataSource, kosmoSketchAdapterSource, kosmoSketchAdapterDataSource, runtimeContractSource, qualityEvidenceSource, workstationPrioritiesSource, workstationProfileSource, workstationProfileDataSource, localIdentitySource, localIdentityDataSource, dataGovernanceSource, dataGovernanceDataSource, officeMemorySource, officeMemoryDataSource, localStorageDecisionSource, localStorageDecisionDataSource, deleteExportRestoreSource, deleteExportRestoreDataSource, learningModeSource, permissionMatrixSource, autonomyStatusSource, officeRoutineSource, officeRoutineDataSource, officePilotSceneSource, officePilotSceneDataSource, toolRegistrySource, toolRegistryDataSource, demoReadinessSource, publishReadinessSource, launchDecisionBriefSource, sectionIndexSource, spec }) {
  const source = `${routeSource}\n${roleSwitcherSource}\n${demoReviewSource}\n${projectDashboardSource}\n${designHandoffPanelSource}\n${designPilotSource}\n${designHandoffPanelDataSource}\n${presenterBriefSource}\n${workflowDeltaSource}\n${pilotMeasurementSource}\n${pilotMeasurementKitSource}\n${pilotFacilitatorChecklistSource}\n${pilotResultDraftSource}\n${pilotRunbookSource}\n${pilotSessionTemplateSource}\n${progressMapSource}\n${visionBridgeSource}\n${demoQuestionsSource}\n${installationTopologySource}\n${healthReadinessSource}\n${healthReadinessContractSource}\n${riskRegisterSource}\n${commandContractSource}\n${commandContractDataSource}\n${auditTrailSource}\n${auditTrailDataSource}\n${reviewDecisionDraftSource}\n${runtimeBoundarySource}\n${runtimeAdapterSource}\n${runtimeAdapterDataSource}\n${localRuntimeBridgeSource}\n${localRuntimeBridgeDataSource}\n${kosmoSketchAdapterSource}\n${kosmoSketchAdapterDataSource}\n${runtimeContractSource}\n${qualityEvidenceSource}\n${workstationPrioritiesSource}\n${workstationProfileSource}\n${workstationProfileDataSource}\n${localIdentitySource}\n${localIdentityDataSource}\n${dataGovernanceSource}\n${dataGovernanceDataSource}\n${officeMemorySource}\n${officeMemoryDataSource}\n${localStorageDecisionSource}\n${localStorageDecisionDataSource}\n${deleteExportRestoreSource}\n${deleteExportRestoreDataSource}\n${learningModeSource}\n${permissionMatrixSource}\n${autonomyStatusSource}\n${officeRoutineSource}\n${officeRoutineDataSource}\n${officePilotSceneSource}\n${officePilotSceneDataSource}\n${toolRegistrySource}\n${toolRegistryDataSource}\n${demoReadinessSource}\n${publishReadinessSource}\n${launchDecisionBriefSource}\n${sectionIndexSource}`;
  const forbiddenPatterns = [
    { id: 'no_use_server', pattern: /['"]use server['"]/ },
    { id: 'no_next_server', pattern: /from ['"]next\/server['"]/ },
    { id: 'no_fetch', pattern: /\bfetch\s*\(/ },
    { id: 'no_cookies', pattern: /\bcookies\s*\(/ },
    { id: 'no_headers', pattern: /\bheaders\s*\(/ },
    { id: 'no_redirect', pattern: /\bredirect\s*\(/ }
  ];
  const packageJsonSource = existsSync(packageJsonPath) ? readFileSync(packageJsonPath, 'utf8') : '';
  const localRenderSmokeSource = existsSync(localRenderSmokePath) ? readFileSync(localRenderSmokePath, 'utf8') : '';

  const checks = [
    check('route_file_exists', 'app/orbit/page.tsx exists.', existsSync(routePath)),
    check('local_render_smoke_file_exists', 'KosmoOrbit local render smoke exists for running local UI marker checks.', existsSync(localRenderSmokePath)),
    check('local_render_smoke_script_registered', 'package.json registers the local render smoke npm script.', packageJsonSource.includes('"kosmo:orbit-local-render-smoke"') && packageJsonSource.includes('scripts/kosmo-orbit-local-render-smoke.mjs') && localRenderSmokeSource.includes('orbit_local_render_smoke_passed')),
    check('spec_ready', 'App route spec is ready.', spec.status === 'orbit_app_route_spec_ready'),
    check('spec_sees_implemented_route', 'App route spec sees the route as implemented static preview.', spec.route_spec?.status === 'implemented_static_preview'),
    check('imports_route_spec', 'Route imports the local route spec JSON.', source.includes('orbit-app-route-spec.generated.json')),
    check('imports_role_state', 'Route imports the local role state JSON.', source.includes('role-state.demo.json')),
    check('imports_role_variants', 'Route imports the local role variants JSON.', source.includes('role-ui-variants.generated.json')),
    check('imports_shell_manifest', 'Route imports the local shell manifest JSON.', source.includes('role-shell-prototype.generated.json')),
    check('role_switcher_file_exists', 'Orbit role switcher client component exists.', existsSync(roleSwitcherPath)),
    check('demo_review_file_exists', 'Orbit guided demo review component exists.', existsSync(demoReviewPath)),
    check('project_dashboard_file_exists', 'Orbit project package dashboard component exists.', existsSync(projectDashboardPath)),
    check('design_handoff_panel_file_exists', 'Orbit KosmoDesign handoff panel component exists.', existsSync(designHandoffPanelPath)),
    check('design_pilot_path_file_exists', 'Orbit KosmoDesign pilot path component exists.', existsSync(designPilotPath)),
    check('design_handoff_panel_data_file_exists', 'Orbit KosmoDesign handoff panel spec exists.', existsSync(designHandoffPanelDataPath)),
    check('presenter_brief_file_exists', 'Orbit presenter brief component exists.', existsSync(presenterBriefPath)),
    check('workflow_delta_file_exists', 'Orbit workflow delta component exists.', existsSync(workflowDeltaPath)),
    check('pilot_measurement_file_exists', 'Orbit pilot measurement component exists.', existsSync(pilotMeasurementPath)),
    check('pilot_measurement_kit_file_exists', 'Orbit pilot measurement kit component exists.', existsSync(pilotMeasurementKitPath)),
    check('pilot_facilitator_checklist_file_exists', 'Orbit pilot facilitator checklist component exists.', existsSync(pilotFacilitatorChecklistPath)),
    check('pilot_result_draft_file_exists', 'Orbit pilot result draft component exists.', existsSync(pilotResultDraftPath)),
    check('pilot_runbook_file_exists', 'Orbit pilot runbook component exists.', existsSync(pilotRunbookPath)),
    check('pilot_session_template_file_exists', 'Orbit pilot session template component exists.', existsSync(pilotSessionTemplatePath)),
    check('progress_map_file_exists', 'Orbit progress map component exists.', existsSync(progressMapPath)),
    check('vision_bridge_file_exists', 'Orbit vision bridge component exists.', existsSync(visionBridgePath)),
    check('demo_questions_file_exists', 'Orbit demo questions component exists.', existsSync(demoQuestionsPath)),
    check('installation_topology_file_exists', 'Orbit local installation topology component exists.', existsSync(installationTopologyPath)),
    check('health_readiness_file_exists', 'Orbit local health readiness component exists.', existsSync(healthReadinessPath)),
    check('health_readiness_contract_file_exists', 'Orbit health readiness contract exists.', existsSync(healthReadinessContractPath)),
    check('risk_register_file_exists', 'Orbit risk register component exists.', existsSync(riskRegisterPath)),
    check('command_contract_file_exists', 'Orbit command contract component exists.', existsSync(commandContractPath)),
    check('command_contract_data_file_exists', 'Orbit command contract data exists.', existsSync(commandContractDataPath)),
    check('audit_trail_file_exists', 'Orbit audit trail component exists.', existsSync(auditTrailPath)),
    check('audit_trail_data_file_exists', 'Orbit audit trail contract data exists.', existsSync(auditTrailDataPath)),
    check('review_decision_draft_file_exists', 'Orbit review decision draft component exists.', existsSync(reviewDecisionDraftPath)),
    check('runtime_boundary_file_exists', 'Orbit MVP/runtime boundary component exists.', existsSync(runtimeBoundaryPath)),
    check('runtime_adapter_file_exists', 'Orbit runtime adapter component exists.', existsSync(runtimeAdapterPath)),
    check('runtime_adapter_data_file_exists', 'Orbit runtime adapter contract exists.', existsSync(runtimeAdapterDataPath)),
    check('local_runtime_bridge_file_exists', 'Orbit local runtime bridge component exists.', existsSync(localRuntimeBridgePath)),
    check('local_runtime_bridge_data_file_exists', 'Orbit local runtime bridge report exists.', existsSync(localRuntimeBridgeDataPath)),
    check('kosmosketch_adapter_file_exists', 'Orbit KosmoSketch adapter component exists.', existsSync(kosmoSketchAdapterPath)),
    check('kosmosketch_adapter_data_file_exists', 'Orbit KosmoSketch adapter contract exists.', existsSync(kosmoSketchAdapterDataPath)),
    check('runtime_contract_file_exists', 'Orbit local runtime contract component exists.', existsSync(runtimeContractPath)),
    check('quality_evidence_file_exists', 'Orbit quality evidence component exists.', existsSync(qualityEvidencePath)),
    check('workstation_priorities_file_exists', 'Orbit workstation priorities component exists.', existsSync(workstationPrioritiesPath)),
    check('workstation_profile_file_exists', 'Orbit workstation profile contract component exists.', existsSync(workstationProfilePath)),
    check('workstation_profile_data_file_exists', 'Orbit workstation profile contract data exists.', existsSync(workstationProfileDataPath)),
    check('local_identity_file_exists', 'Orbit local identity boundary component exists.', existsSync(localIdentityPath)),
    check('local_identity_data_file_exists', 'Orbit local identity contract data exists.', existsSync(localIdentityDataPath)),
    check('data_governance_file_exists', 'Orbit data governance boundary component exists.', existsSync(dataGovernancePath)),
    check('data_governance_data_file_exists', 'Orbit data governance contract data exists.', existsSync(dataGovernanceDataPath)),
    check('office_memory_file_exists', 'Orbit office memory readiness component exists.', existsSync(officeMemoryPath)),
    check('office_memory_data_file_exists', 'Orbit office memory readiness contract data exists.', existsSync(officeMemoryDataPath)),
    check('local_storage_decision_file_exists', 'Orbit local storage decision component exists.', existsSync(localStorageDecisionPath)),
    check('local_storage_decision_data_file_exists', 'Orbit local storage decision draft data exists.', existsSync(localStorageDecisionDataPath)),
    check('delete_export_restore_file_exists', 'Orbit delete/export/restore drill component exists.', existsSync(deleteExportRestorePath)),
    check('delete_export_restore_data_file_exists', 'Orbit delete/export/restore drill contract exists.', existsSync(deleteExportRestoreDataPath)),
    check('learning_mode_file_exists', 'Orbit learning mode component exists.', existsSync(learningModePath)),
    check('permission_matrix_file_exists', 'Orbit permission matrix component exists.', existsSync(permissionMatrixPath)),
    check('autonomy_status_file_exists', 'Orbit autonomy status component exists.', existsSync(autonomyStatusPath)),
    check('office_routine_file_exists', 'Orbit office routine component exists.', existsSync(officeRoutinePath)),
    check('office_routine_data_file_exists', 'Orbit office routine contract exists.', existsSync(officeRoutineDataPath)),
    check('office_pilot_scene_file_exists', 'Orbit office pilot scene component exists.', existsSync(officePilotScenePath)),
    check('office_pilot_scene_data_file_exists', 'Orbit office pilot scene data contract exists.', existsSync(officePilotSceneDataPath)),
    check('tool_registry_file_exists', 'Orbit tool registry component exists.', existsSync(toolRegistryPath)),
    check('tool_registry_data_file_exists', 'Orbit tool registry workspace data exists.', existsSync(toolRegistryDataPath)),
    check('demo_readiness_file_exists', 'Orbit demo readiness component exists.', existsSync(demoReadinessPath)),
    check('publish_readiness_file_exists', 'Orbit publish readiness component exists.', existsSync(publishReadinessPath)),
    check('launch_decision_brief_file_exists', 'Orbit launch decision brief component exists.', existsSync(launchDecisionBriefPath)),
    check('section_index_file_exists', 'Orbit section index component exists.', existsSync(sectionIndexPath)),
    check('imports_role_switcher', 'Route imports the role switcher preview component.', routeSource.includes('OrbitRoleSwitcher')),
    check('imports_demo_review_path', 'Route imports the guided demo review component.', routeSource.includes('OrbitDemoReviewPath')),
    check('imports_project_dashboard', 'Route imports the project package dashboard component.', routeSource.includes('OrbitProjectDashboard')),
    check('imports_design_handoff_panel', 'Route imports the KosmoDesign handoff panel component.', routeSource.includes('OrbitDesignHandoffPanel')),
    check('imports_design_pilot_path', 'Route imports the KosmoDesign pilot path component.', routeSource.includes('OrbitDesignPilotPath')),
    check('imports_presenter_brief', 'Route imports the presenter brief component.', routeSource.includes('OrbitPresenterBrief')),
    check('imports_workflow_delta', 'Route imports the workflow delta component.', routeSource.includes('OrbitWorkflowDelta')),
    check('imports_pilot_measurement', 'Route imports the pilot measurement component.', routeSource.includes('OrbitPilotMeasurement')),
    check('imports_pilot_measurement_kit', 'Route imports the pilot measurement kit component.', routeSource.includes('OrbitPilotMeasurementKit')),
    check('imports_pilot_facilitator_checklist', 'Route imports the pilot facilitator checklist component.', routeSource.includes('OrbitPilotFacilitatorChecklist')),
    check('imports_pilot_result_draft', 'Route imports the pilot result draft component.', routeSource.includes('OrbitPilotResultDraft')),
    check('imports_pilot_runbook', 'Route imports the pilot runbook component.', routeSource.includes('OrbitPilotRunbook')),
    check('imports_pilot_session_template', 'Route imports the pilot session template component.', routeSource.includes('OrbitPilotSessionTemplate')),
    check('imports_progress_map', 'Route imports the vision-to-MVP progress map component.', routeSource.includes('OrbitProgressMap')),
    check('imports_vision_bridge', 'Route imports the vision bridge component.', routeSource.includes('OrbitVisionBridge')),
    check('imports_demo_questions', 'Route imports the demo questions briefing component.', routeSource.includes('OrbitDemoQuestions')),
    check('imports_installation_topology', 'Route imports the local installation topology component.', routeSource.includes('OrbitInstallationTopology')),
    check('imports_health_readiness', 'Route imports the local health readiness component.', routeSource.includes('OrbitHealthReadiness')),
    check('imports_health_readiness_contract', 'Health readiness component imports the local contract JSON.', source.includes('health-readiness.contract.json')),
    check('imports_risk_register', 'Route imports the risk register component.', routeSource.includes('OrbitRiskRegister')),
    check('imports_command_contract', 'Route imports the command contract component.', routeSource.includes('OrbitCommandContract')),
    check('imports_command_contract_data', 'Command contract component imports the local contract JSON.', source.includes('orbit-command.contract.json')),
    check('imports_audit_trail', 'Route imports the audit trail component.', routeSource.includes('OrbitAuditTrail')),
    check('imports_audit_trail_data', 'Audit trail component imports the local contract JSON.', source.includes('orbit-audit-trail.contract.json')),
    check('imports_review_decision_draft', 'Route imports the review decision draft component.', routeSource.includes('OrbitReviewDecisionDraft')),
    check('imports_runtime_boundary', 'Route imports the MVP/runtime boundary component.', routeSource.includes('OrbitRuntimeBoundary')),
    check('imports_runtime_adapter', 'Route imports the runtime adapter component.', routeSource.includes('OrbitRuntimeAdapterContract')),
    check('imports_runtime_adapter_data', 'Runtime adapter component imports the local contract JSON.', source.includes('orbit-runtime-adapter.contract.json')),
    check('imports_local_runtime_bridge', 'Route imports the local runtime bridge component.', routeSource.includes('OrbitLocalRuntimeBridge')),
    check('imports_local_runtime_bridge_data', 'Local runtime bridge imports the generated bridge report.', source.includes('orbit-local-runtime-bridge.generated.json')),
    check('imports_kosmosketch_adapter', 'Route imports the KosmoSketch adapter component.', routeSource.includes('OrbitKosmoSketchAdapterContract')),
    check('imports_kosmosketch_adapter_data', 'KosmoSketch adapter component imports the local contract JSON.', source.includes('kosmosketch-tool-adapter.contract.json')),
    check('imports_runtime_contract', 'Route imports the local runtime contract component.', routeSource.includes('OrbitRuntimeContract')),
    check('imports_quality_evidence', 'Route imports the quality evidence component.', routeSource.includes('OrbitQualityEvidence')),
    check('imports_workstation_priorities', 'Route imports the workstation priorities component.', routeSource.includes('OrbitWorkstationPriorities')),
    check('imports_workstation_profile', 'Route imports the workstation profile component.', routeSource.includes('OrbitWorkstationProfileContract')),
    check('imports_workstation_profile_data', 'Workstation profile component imports the local contract JSON.', source.includes('orbit-workstation-profile.contract.json')),
    check('imports_local_identity', 'Route imports the local identity component.', routeSource.includes('OrbitLocalIdentityContract')),
    check('imports_local_identity_data', 'Local identity component imports the local contract JSON.', source.includes('orbit-local-identity.contract.json')),
    check('imports_data_governance', 'Route imports the data governance component.', routeSource.includes('OrbitDataGovernanceContract')),
    check('imports_data_governance_data', 'Data governance component imports the local contract JSON.', source.includes('orbit-data-governance.contract.json')),
    check('imports_office_memory', 'Route imports the office memory readiness component.', routeSource.includes('OrbitOfficeMemoryReadiness')),
    check('imports_office_memory_data', 'Office memory readiness component imports the local contract JSON.', source.includes('orbit-office-memory-readiness.contract.json')),
    check('imports_local_storage_decision', 'Route imports the local storage decision component.', routeSource.includes('OrbitLocalStorageDecisionDraft')),
    check('imports_local_storage_decision_data', 'Local storage decision component imports the local draft JSON.', source.includes('orbit-local-storage-decision.draft.json')),
    check('imports_delete_export_restore', 'Route imports the delete/export/restore drill component.', routeSource.includes('OrbitDeleteExportRestoreDrill')),
    check('imports_delete_export_restore_data', 'Delete/export/restore drill component imports the local contract JSON.', source.includes('orbit-delete-export-restore-drill.contract.json')),
    check('imports_learning_mode', 'Route imports the learning mode component.', routeSource.includes('OrbitLearningMode')),
    check('imports_permission_matrix', 'Route imports the permission matrix component.', routeSource.includes('OrbitPermissionMatrix')),
    check('imports_autonomy_status', 'Route imports the autonomy status component.', routeSource.includes('OrbitAutonomyStatus')),
    check('imports_office_routine', 'Route imports the office routine component.', routeSource.includes('OrbitOfficeRoutine')),
    check('imports_office_pilot_scene', 'Route imports the office pilot scene component.', routeSource.includes('OrbitOfficePilotScene')),
    check('imports_office_pilot_scene_data', 'Office pilot scene imports the local demo scene contract.', source.includes('orbit-office-pilot-scene.demo.json')),
    check('imports_tool_registry', 'Route imports the tool registry component.', routeSource.includes('OrbitToolRegistry')),
    check('imports_tool_registry_data', 'Tool registry imports the local workspace contract.', source.includes('workspace.demo.json')),
    check('imports_demo_readiness', 'Route imports the demo readiness component.', routeSource.includes('OrbitDemoReadiness')),
    check('imports_publish_readiness', 'Route imports the publish readiness component.', routeSource.includes('OrbitPublishReadiness')),
    check('imports_launch_decision_brief', 'Route imports the launch decision brief component.', routeSource.includes('OrbitLaunchDecisionBrief')),
    check('imports_section_index', 'Route imports the section index navigation component.', routeSource.includes('OrbitSectionIndex')),
    check('shows_hub_return', 'Route exposes a safe return link to the Kosmo Hub.', routeSource.includes('Zurueck zum Kosmo-Hub') && routeSource.includes('aria-label="KosmoOrbit Rueckkehr"') && routeSource.includes('href="/"')),
    check('section_index_groups_navigation', 'Section index groups the dense demo navigation into readable lanes.', sectionIndexSource.includes('sectionGroups') && sectionIndexSource.includes("label: 'Schnellpfad'") && sectionIndexSource.includes("label: 'Pilot'") && sectionIndexSource.includes("label: 'System'") && sectionIndexSource.includes("label: 'Review'") && sectionIndexSource.includes("label: 'Betrieb'") && sectionIndexSource.includes("label: 'Rollen'")),
    check('section_index_keeps_horizontal_scroll', 'Section index uses horizontal overflow for dense navigation instead of wrapping the whole cockpit.', sectionIndexSource.includes('overflow-x-auto') && sectionIndexSource.includes('shrink-0') && sectionIndexSource.includes('truncate')),
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
    check('shows_design_handoff_panel', 'Route renders the KosmoDesign handoff review console.', source.includes('KosmoDesign Handoff') && source.includes('Review Console')),
    check('shows_design_pilot_path', 'Route renders the KosmoDesign pilot path.', source.includes('KosmoDesign Pilotpfad') && source.includes('review-pilot-before-generation')),
    check('design_pilot_path_blocks_generation', 'KosmoDesign pilot path keeps review before generation.', source.includes('keine Design-Generation') && source.includes('keine Geometrie-Writes') && source.includes('keine Kosten-/Zeitersparnis behaupten')),
    check('design_handoff_uses_ui_panel_spec', 'KosmoDesign handoff panel imports the generated UI panel spec.', source.includes('design-handoff-ui-panel.generated.json')),
    check('design_handoff_blocks_generation', 'KosmoDesign handoff panel keeps design generation blocked.', source.includes('Generate Design') && source.includes('blocked') && source.includes('Design generation is blocked')),
    check('design_handoff_shows_context_inputs', 'KosmoDesign handoff panel shows blocked context inputs and guardrails.', source.includes('Kontextinputs') && source.includes('blocked_inputs') && source.includes('Guardrails')),
    check('shows_presenter_brief', 'Route renders the three-minute presenter explanation.', source.includes('Presenter-Modus') && source.includes('3-Minuten-Erklaerung')),
    check('shows_value_claims', 'Presenter brief covers better, faster and cheaper value claims.', source.includes('Besser') && source.includes('Schneller') && source.includes('Guenstiger')),
    check('shows_workflow_delta', 'Route renders workflow delta for non-technical office value.', source.includes('Workflow-Delta') && source.includes('heutigen Bueroablauf')),
    check('workflow_delta_avoids_roi_claim', 'Workflow delta avoids unproven ROI claims.', source.includes('no-roi-claim') && source.includes('Keine Garantie auf konkrete Prozentersparnis')),
    check('shows_pilot_measurement', 'Route renders pilot measurement for evidence before claims.', source.includes('Pilotmessung') && source.includes('evidence-before-claim')),
    check('pilot_measurement_blocks_live_actions', 'Pilot measurement blocks live data, uploads, costs and generation.', source.includes('keine Kundendaten') && source.includes('keine Uploads') && source.includes('keine Kostenjobs') && source.includes('keine automatische Plan-/Design-Generierung')),
    check('shows_pilot_measurement_kit', 'Route renders office pilot measurement kit.', source.includes('Pilot-Messkit') && source.includes('Buerotest messen') && source.includes('orbit-office-pilot-measurement-kit.demo.json')),
    check('pilot_measurement_kit_avoids_fake_results', 'Pilot measurement kit keeps values empty and avoids claimed results.', source.includes('before null') && source.includes('after null') && source.includes('human note null') && source.includes('pilotMeasurementKit.scoring.status')),
    check('shows_pilot_facilitator_checklist', 'Route renders office pilot facilitator checklist.', source.includes('Facilitator Checkliste') && source.includes('Bueropilot fuehren') && source.includes('Harte Stopps')),
    check('pilot_facilitator_checklist_keeps_live_actions_blocked', 'Pilot facilitator checklist blocks live actions and unsupported claims.', source.includes('keine Kundendaten speichern') && source.includes('keine Uploads') && source.includes('keine Kostenjobs') && source.includes('kein Push oder Deploy ohne Owner-Go') && source.includes('keine unbewiesenen Zeit- oder Kostenclaims')),
    check('shows_pilot_result_draft', 'Route renders pilot result draft panel.', source.includes('Pilot Result Draft') && source.includes('Ergebnisstruktur bereit') && source.includes('orbit-office-pilot-result-draft.demo.json')),
    check('pilot_result_draft_avoids_fake_results', 'Pilot result draft keeps values empty and public claims blocked.', source.includes('value null') && source.includes('note null') && source.includes('evidence null') && source.includes('Publication:') && source.includes('pilotResultDraft.publication.status')),
    check('shows_pilot_runbook', 'Route renders a concrete 45-60 minute office pilot runbook.', source.includes('Pilot-Runbook') && source.includes('45-60 Minuten') && source.includes('Ausgangslage messen') && source.includes('Pilotentscheidung')),
    check('pilot_runbook_keeps_live_actions_blocked', 'Pilot runbook keeps customer data, uploads, costs, design generation and push blocked.', source.includes('keine Kundendaten') && source.includes('keine Uploads') && source.includes('keine Kosten') && source.includes('keine Design-Generation') && source.includes('kein Push ohne Owner-Go')),
    check('shows_pilot_session_template', 'Route renders pilot session template and empty measurement copy.', source.includes('Pilot-Session Template') && source.includes('Messstruktur bereit') && source.includes('before null') && source.includes('after null')),
    check('pilot_session_template_avoids_fake_results', 'Pilot session template does not claim completed measurements.', source.includes('Keine Pilotwerte sind behauptet') && source.includes('pilotSession.decision.status')),
    check('shows_progress_map', 'Route renders a visible project progress map.', source.includes('Projektfortschritt') && source.includes('Von Vision zu sichtbarem KosmoOrbit-MVP')),
    check('keeps_progress_map_non_absolute', 'Progress map avoids claiming one absolute total project percentage.', source.includes('keine Gesamtprojekt-Prozentzahl')),
    check('shows_runtime_and_generation_lanes', 'Progress map separates local runtime from CAD/plan generation.', source.includes('KosmoZentrale Runtime') && source.includes('CAD-/Plan-Generation')),
    check('shows_vision_bridge', 'Route renders the KosmoOrbit vision bridge.', source.includes('Vision Bridge') && source.includes('Orchestrierung vor Generierung')),
    check('keeps_vision_bridge_review_only', 'Vision bridge keeps runtime and write actions gated.', source.includes('keine Runtime in dieser Preview') && source.includes('keine D1/R2-/Upload-Writes')),
    check('shows_installation_topology', 'Route renders the local office installation topology.', source.includes('Buero-Installation') && source.includes('local-appliance-map') && source.includes('KosmoZentrale')),
    check('keeps_installation_topology_safe', 'Installation topology keeps auth, upload, process and network actions gated.', source.includes('keine echte Auth-Runtime') && source.includes('keine D1/R2-/Upload-Writes') && source.includes('keine Prozessstarts') && source.includes('keine Netzwerksteuerung')),
    check('shows_health_readiness', 'Route renders the local health readiness contract.', source.includes('Health Readiness') && source.includes('read-only-telemetry-contract') && source.includes('Hardware / GPU')),
    check('keeps_health_readiness_safe', 'Health readiness keeps hardware, model, filesystem, process and queue actions gated.', source.includes('keine Hardwarebefehle') && source.includes('keine Modellstarts') && source.includes('keine Dateisystem-Scans') && source.includes('keine Prozessstarts') && source.includes('keine Queue-Aktionen')),
    check('shows_risk_register', 'Route renders the human approval risk register.', source.includes('Risiko-Register') && source.includes('human-approval-risk-register')),
    check('risk_register_covers_core_gates', 'Risk register covers runtime, generation, rights, profiles, data and external collaboration.', source.includes('Lokale Runtime') && source.includes('Design-Generation') && source.includes('Quellen und Rechte') && source.includes('Rollen und Profile') && source.includes('Buero-Daten') && source.includes('Fachplaner / Extern')),
    check('shows_command_contract', 'Route renders the static Orbit command contract.', source.includes('Command-Vertrag') && source.includes('static-command-contract')),
    check('command_contract_blocks_runtime_actions', 'Command contract blocks runtime, generation, write, publish and network actions.', source.includes('keine Prozessstarts') && source.includes('keine Geometrie-Generierung') && source.includes('keine User-Writes') && source.includes('kein Public-Publish') && source.includes('keine Netzwerksteuerung')),
    check('shows_audit_trail', 'Route renders the static Orbit audit trail contract.', source.includes('Audit-Trail-Vertrag') && source.includes('static-audit-trail-contract')),
    check('audit_trail_tracks_intent_evidence_gate_outcome', 'Audit trail tracks intent, evidence, gate, outcome and non-writing events.', source.includes('intent') && source.includes('evidence') && source.includes('gate') && source.includes('outcome') && source.includes('"writes": false')),
    check('shows_demo_questions', 'Route renders architect-facing demo questions.', source.includes('Demo-Fragen') && source.includes('Antworten fuer ein Architekturbuero')),
    check('anchors_demo_claims', 'Demo questions point claims back to visible panels.', source.includes('Welche Panel') || (source.includes('Presenter-Modus') && source.includes('Projektpaket Tagesansicht') && source.includes('Guardrails'))),
    check('shows_review_decision_draft', 'Route renders a local non-writing review decision draft.', source.includes('Review Decision Draft') && source.includes('needs_more_evidence')),
    check('keeps_decision_draft_non_writing', 'Decision draft states that it writes no decision record.', source.includes('schreibt kein Decision Record')),
    check('shows_runtime_boundary', 'Route renders visible MVP and runtime boundaries.', source.includes('MVP-Grenze') && source.includes('Heute sichtbar') && source.includes('Spaetere Runtime')),
    check('keeps_runtime_side_effects_off', 'Runtime boundary states no runtime side effects.', source.includes('no-runtime-side-effects')),
    check('shows_runtime_adapter', 'Route renders the Runtime Adapter contract.', source.includes('Runtime Adapter') && source.includes('Bruecke von KosmoOrbit zur lokalen KosmoZentrale') && source.includes('Promotion Requirements')),
    check('runtime_adapter_uses_local_contract', 'Runtime adapter uses the local JSON contract for lanes and promotion requirements.', source.includes('runtimeAdapterContractData') && source.includes('adapter_lanes') && source.includes('promotion_requirements')),
    check('keeps_runtime_adapter_non_operational', 'Runtime adapter keeps adapters, processes, data writes and external accounts blocked.', source.includes('keine Adapter werden') && source.includes('kein Prozess') && source.includes('keine Daten') && source.includes('keine externen')),
    check('shows_local_runtime_bridge', 'Route renders the local Odysseus/KOSMO runtime bridge.', source.includes('Local Runtime Bridge') && source.includes('Odysseus/KOSMO Night Status in KosmoOrbit') && source.includes('Control Spine')),
    check('local_runtime_bridge_uses_generated_report', 'Local runtime bridge uses the generated bridge report for lanes, progress and source commits.', source.includes('localRuntimeBridgeData') && source.includes('progress_percent') && source.includes('local_starter_commit') && source.includes('lanes.map')),
    check('local_runtime_bridge_shows_home_pc_index', 'Local runtime bridge shows the Home-PC handover index artifacts, doctor gate, ZIP smoke, Start Card and Linux first commands.', source.includes('Home-PC Handover Index') && source.includes('home_pc_handover') && source.includes('zip_artifact') && source.includes('checksum_artifact') && source.includes('manifest_artifact') && source.includes('start_dry_run_script') && source.includes('start_dry_run_report') && source.includes('start_dry_run_checks') && source.includes('doctor_script') && source.includes('doctor_report') && source.includes('doctor_status') && source.includes('doctor_checks') && source.includes('zip_smoke_script') && source.includes('zip_smoke_report') && source.includes('zip_smoke_status') && source.includes('zip_smoke_checks') && source.includes('start_card') && source.includes('first_commands.map')),
    check('local_runtime_bridge_shows_next_action_queue', 'Local runtime bridge shows the KOSMO next-action queue.', source.includes('Next-Action Queue') && source.includes('next_action_queue') && source.includes('owner_go_required') && source.includes('autonomous_allowed') && source.includes('actions.map')),
    check('local_runtime_bridge_shows_runway_report', 'Local runtime bridge shows the phased KOSMO runway report.', source.includes('Runway Report') && source.includes('runway_report') && source.includes('phase_count') && source.includes('runway.map') && source.includes('Tonight On Mac')),
    check('local_runtime_bridge_shows_closeout_aggregator', 'Local runtime bridge shows the KOSMO closeout aggregator with read order, evidence and safety limits.', source.includes('Closeout Aggregator') && source.includes('closeout_aggregator') && source.includes('read_order') && source.includes('owner_go_blockers') && source.includes('forbidden_actions') && source.includes('Forbidden Actions')),
    check('local_runtime_bridge_shows_loop_dashboard', 'Local runtime bridge shows the loop closeout dashboard and safest next action.', source.includes('Loop Closeout Dashboard') && source.includes('loop_closeout_dashboard') && source.includes('safest_next_action') && source.includes('runtime_bundle')),
    check('local_runtime_bridge_shows_handover_doctor', 'Local runtime bridge shows the Home-PC handover doctor gate.', source.includes('Handover Doctor') && source.includes('home_pc_handover_doctor') && source.includes('home_pc_handover_doctor_checks') && source.includes('home_pc_handover_doctor_report')),
    check('local_runtime_bridge_shows_orbit_render_smoke', 'Local runtime bridge shows Orbit local render smoke evidence.', source.includes('kosmo-orbit-render-smoke') && source.includes('orbit_render_smoke') && source.includes('orbit_render_smoke_checks') && source.includes('orbit_render_smoke_report')),
    check('local_runtime_bridge_shows_github_separation_decision', 'Local runtime bridge shows the GitHub separation Owner-Go decision and keeps the website repo separate.', source.includes('GitHub Separation Owner-Go') && source.includes('github_separation_decision') && source.includes('recommended_repository') && source.includes('first_import_branch') && source.includes('website_repository') && source.includes('forbidden_without_owner_go') && source.includes('Dediziertes Starter-Repo statt Website-Vermischung')),
    check('local_runtime_bridge_shows_import_readiness', 'Local runtime bridge shows read-only GitHub import readiness without removing Owner-Go.', source.includes('Import Readiness') && source.includes('import_readiness_status') && source.includes('import_readiness_checks') && source.includes('import_readiness_report')),
    check('keeps_local_runtime_bridge_review_only', 'Local runtime bridge blocks processes, model starts, private scans, uploads and publish actions.', source.includes('startet keine Prozesse') && source.includes('keine Modelle') && source.includes('scannt keine') && source.includes('keine Uploads') && source.includes('Publish-Aktionen')),
    check('shows_kosmosketch_adapter', 'Route renders the KosmoSketch target-tool adapter.', source.includes('KosmoSketch ToolAdapter') && source.includes('Target-Tool Vertrag fuer Skizze zu BIM') && source.includes('kosmo-draw.kosmosketch')),
    check('kosmosketch_adapter_uses_local_contract', 'KosmoSketch adapter uses local contract for target tool, department, artifacts and blocked actions.', source.includes('kosmoSketchAdapterContractData') && source.includes('target_tool') && source.includes('department') && source.includes('artifact_contract') && source.includes('blocked_today')),
    check('keeps_kosmosketch_adapter_review_only', 'KosmoSketch adapter blocks backend calls, approvals, artifacts, Blender, BIM, IFC and 2D regeneration.', source.includes('kein POST /jobs') && source.includes('kein /router/plan') && source.includes('keine Approval-Mutation') && source.includes('kein Artifact-Upload') && source.includes('kein Blender-Start') && source.includes('kein BIM-Commit') && source.includes('kein IFC-Export') && source.includes('keine 2D-Regeneration')),
    check('shows_runtime_contract', 'Route renders the future local runtime contract.', source.includes('Runtime-Vertrag') && source.includes('KosmoZentrale Health') && source.includes('Tool Launch')),
    check('keeps_runtime_contract_non_operational', 'Runtime contract keeps model, process, queue and memory actions gated.', source.includes('no-process-launch') && source.includes('kein Modellstart') && source.includes('keine Prozessstarts') && source.includes('keine Queue') && source.includes('kein Memory-Write')),
    check('shows_quality_evidence', 'Route renders local review and route-smoke quality evidence.', source.includes('Pruefevidenz') && source.includes('Warum diese Preview belastbar ist')),
    check('imports_quality_reports', 'Route imports full review and route smoke reports.', source.includes('orbit-full-review.generated.json') && source.includes('orbit-route-smoke.generated.json')),
    check('imports_static_smoke_report', 'Route imports the static export smoke report.', source.includes('orbit-static-export-smoke.generated.json')),
    check('shows_workstation_priorities', 'Route renders role-first workstation priorities.', source.includes('Arbeitsstationen') && source.includes('role-first-ui')),
    check('covers_core_workstation_roles', 'Workstation priorities cover owner, project lead, design, drafting and education.', source.includes('Chef / Admin') && source.includes('Projektleitung') && source.includes('Entwurf') && source.includes('Zeichnung') && source.includes('Ausbildung')),
    check('shows_workstation_profile_contract', 'Route renders the workstation profile contract.', source.includes('Workstation Profile Contract') && source.includes('Wie KosmoOrbit je Arbeitsplatz startet')),
    check('workstation_profile_uses_local_contract', 'Workstation profile panel uses the local contract for role-specific startup surfaces.', source.includes('workstationProfileContractData') && source.includes('startup_surface') && source.includes('profiles.map')),
    check('keeps_workstation_profile_review_only', 'Workstation profile contract keeps accounts, writes, persistence and auth runtime blocked.', source.includes('keine Accounts') && source.includes('keine User-Writes') && source.includes('keine Persistenz') && source.includes('keine echte Auth-Runtime')),
    check('shows_local_identity_contract', 'Route renders the local identity boundary contract.', source.includes('Local Identity Boundary') && source.includes('Was spaeter Profil, Auth und Session wird')),
    check('local_identity_uses_local_contract', 'Local identity panel uses the local contract for profile classes and session boundaries.', source.includes('localIdentityContractData') && source.includes('profile_classes') && source.includes('session_boundaries')),
    check('keeps_local_identity_review_only', 'Local identity contract blocks logins, accounts, passwords, profile persistence, session cookies, personal writes and external identity providers.', source.includes('keine Logins') && source.includes('keine Accounts') && source.includes('keine Passwoerter') && source.includes('keine Profilpersistenz') && source.includes('keine Session-Cookies') && source.includes('keine personenbezogenen Writes') && source.includes('kein externer Identity Provider')),
    check('shows_data_governance_contract', 'Route renders the data governance boundary contract.', source.includes('Data Governance Boundary') && source.includes('Welche lokalen Daten KosmoOrbit spaeter speichern darf')),
    check('data_governance_uses_local_contract', 'Data governance panel uses the local contract for domains and storage lanes.', source.includes('dataGovernanceContractData') && source.includes('data_domains') && source.includes('storage_lanes')),
    check('keeps_data_governance_review_only', 'Data governance contract keeps database, upload, customer-write, backup and sync actions blocked.', source.includes('keine D1-Writes') && source.includes('keine R2-Uploads') && source.includes('keine Kundendaten-Writes') && source.includes('kein Backup-Job') && source.includes('kein externer Sync')),
    check('shows_office_memory_readiness', 'Route renders the office memory readiness boundary.', source.includes('Office Memory Readiness') && source.includes('Was spaeter lokales Buero-Gedaechtnis werden darf')),
    check('office_memory_uses_local_contract', 'Office memory readiness panel uses the local contract for memory lanes and readiness gates.', source.includes('officeMemoryReadinessData') && source.includes('memory_lanes') && source.includes('readiness_gates')),
    check('keeps_office_memory_review_only', 'Office memory readiness keeps memory writes, scans, embeddings, backup status, external sync and cloud vector stores blocked.', source.includes('kein Memory-Write') && source.includes('kein Kundendatei-Scan') && source.includes('kein Embedding-Job') && source.includes('kein Backup-Status-Write') && source.includes('kein externer Memory-Sync') && source.includes('kein Cloud Vector Store')),
    check('shows_local_storage_decision', 'Route renders the local storage decision draft.', source.includes('Local Storage Decision Draft') && source.includes('Welche Speicherentscheidung vor echtem Memory noetig ist')),
    check('local_storage_decision_uses_local_draft', 'Local storage decision panel uses the local draft for fields, blocks and approval roles.', source.includes('localStorageDecisionDraftData') && source.includes('decision_fields') && source.includes('blocked_until_decision') && source.includes('approval_roles')),
    check('keeps_local_storage_decision_review_only', 'Local storage decision blocks storage writes, memory writes, indexing, embeddings, backup, restore and external sync.', source.includes('kein local storage write') && source.includes('kein Memory-Write') && source.includes('kein Kundendaten-Index') && source.includes('kein Embedding-Job') && source.includes('kein Backup-Job') && source.includes('kein Restore-Job') && source.includes('kein externer Sync')),
    check('shows_delete_export_restore_drill', 'Route renders the delete/export/restore drill.', source.includes('Delete / Export / Restore Drill') && source.includes('Wie KosmoOrbit lokale Daten reversibel und pruefbar halten muss')),
    check('delete_export_restore_uses_local_contract', 'Delete/export/restore drill panel uses the local contract for scope, blocked actions and promotion requirements.', source.includes('deleteExportRestoreDrillData') && source.includes('drill_scope') && source.includes('blocked_until_drill') && source.includes('promotion_requirements')),
    check('keeps_delete_export_restore_review_only', 'Delete/export/restore drill blocks real jobs, customer data actions, backup restore and external archive sync.', source.includes('kein real delete job') && source.includes('kein real export job') && source.includes('kein real restore job') && source.includes('kein Kundendaten-Export') && source.includes('kein Kundendaten-Delete') && source.includes('kein Backup-Restore') && source.includes('kein externer Archiv-Sync')),
    check('shows_learning_mode', 'Route renders education mode for learning roles.', source.includes('Ausbildungsmodus') && source.includes('Kosmo als sicherer Lernbegleiter')),
    check('learning_mode_keeps_actions_blocked', 'Learning mode blocks accounts, writes, generation and public publish.', source.includes('ohne Accounts') && source.includes('Projekt-Writes') && source.includes('Design-Generation') && source.includes('Public-Publish')),
    check('shows_permission_matrix', 'Route renders role permission matrix.', source.includes('Rechte-Matrix') && source.includes('Wer darf was in KosmoOrbit?')),
    check('keeps_generation_blocked_in_matrix', 'Permission matrix keeps generation and public gates visibly blocked.', source.includes('generation bleibt gesperrt') && source.includes('Public Gate')),
    check('shows_autonomy_status', 'Route renders local autonomy status and safety limits.', source.includes('Autonomie-Status') && source.includes('local-autonomy')),
    check('keeps_autonomy_cost_safe', 'Autonomy status keeps Cloud costs and writes blocked.', source.includes('keine Cloud-Kosten') && source.includes('keine Writes')),
    check('keeps_autonomy_named_orbit', 'Autonomy status names KosmoOrbit, not KosmoWebsite.', source.includes('Was KosmoOrbit gerade selbststaendig tut') && !source.includes('KosmoWebsite')),
    check('shows_office_routine', 'Route renders the static office routine contract.', source.includes('Buero-Routine') && source.includes('Morgenstart der KosmoZentrale')),
    check('office_routine_covers_day_phases', 'Office routine covers morning, workday, training, evening and safety.', source.includes('"phase": "morning"') && source.includes('"phase": "workday"') && source.includes('"phase": "training"') && source.includes('"phase": "evening"') && source.includes('"phase": "safety"')),
    check('office_routine_blocks_live_automation', 'Office routine blocks model start, Blender launch, uploads, publish, push and costs.', source.includes('start_local_model') && source.includes('launch_blender') && source.includes('upload_to_cloud') && source.includes('public_publish') && source.includes('push_to_main_without_go') && source.includes('spend_money')),
    check('shows_office_pilot_scene', 'Route renders the office pilot scene.', source.includes('Buero-Pilot Szene') && source.includes('local-office-pilot-review-only')),
    check('office_pilot_scene_uses_local_contract', 'Office pilot scene uses a local JSON contract for steps, roles, safety and decision.', source.includes('officePilotSceneData') && source.includes('safety') && source.includes('evidence_questions') && source.includes('allowed_outcomes')),
    check('office_pilot_scene_keeps_review_only', 'Office pilot scene blocks uploads, writes, generation, auth runtime and unsupported claims.', source.includes('keine Kundendaten hochladen') && source.includes('keine Cloud') && source.includes('keine Geometrie- oder Plan-Writes') && source.includes('keine Design-Generation') && source.includes('keine echte Auth-Runtime') && source.includes('keine unbewiesenen Zeit-/Kostenclaims')),
    check('shows_tool_registry', 'Route renders the KosmoOrbit tool registry.', source.includes('Tool-Orchestrierung') && source.includes('Software-Zentrale') && source.includes('OrbitToolRegistry')),
    check('tool_registry_uses_local_workspace_contract', 'Tool registry uses local workspace data for tools, roles and gates.', source.includes('workspace.demo.json') && source.includes('workspace.tools.map') && source.includes('gatesForTool')),
    check('tool_registry_keeps_runtime_blocked', 'Tool registry blocks launches, model starts, uploads, cost jobs and public release.', source.includes('Keine Tool-Launches') && source.includes('keine Modellstarts') && source.includes('keine Uploads') && source.includes('keine Kostenjobs') && source.includes('keine Public-Freigabe')),
    check('shows_demo_readiness', 'Route renders demo readiness with explicit human approval boundary.', source.includes('Demo-Bereitschaft') && source.includes('human-demo-ready') && source.includes('kein Push ohne Freigabe')),
    check('demo_readiness_shows_static_assets', 'Demo readiness exposes static export CSS/JS asset verification.', source.includes('CSS/JS-Assets') && source.includes('referenced_static_asset_count') && source.includes('missing_static_asset_count')),
    check('shows_publish_readiness', 'Route renders publish readiness and the live gate.', source.includes('Live-Gate') && source.includes('no-push-without-owner-go') && source.includes('Vorfuehrbar lokal')),
    check('publish_readiness_blocks_live_push', 'Publish readiness blocks push/deploy until owner go, security review and live smoke.', source.includes('Security Review') && source.includes('Owner-Go') && source.includes('Live-Smoke') && source.includes('Push, Livegang und Cloudflare-Deploy bleiben blockiert')),
    check('shows_launch_decision_brief', 'Route renders a launch decision brief after the live gate.', source.includes('Launch Decision Brief') && source.includes('push-decision-not-automatic')),
    check('launch_decision_keeps_owner_gate', 'Launch decision brief keeps push, public claims and pilot evidence human-gated.', source.includes('Owner-Entscheid') && source.includes('Pilot-Evidenz') && source.includes('keine unbewiesenen Public Claims')),
    check('launch_decision_uses_push_readiness_report', 'Launch decision brief imports the push readiness report.', source.includes('orbit-push-readiness.generated.json') && source.includes('Push Readiness Report')),
    check('launch_decision_shows_owner_go_boundary', 'Launch decision brief shows push-ready only with Owner-Go.', source.includes('Push-ready nur falls Owner-Go') && source.includes('Ohne Owner-Go blockiert')),
    check('launch_decision_shows_command_evidence', 'Launch decision brief shows local command evidence from push readiness.', source.includes('Command Evidence') && source.includes('commandEvidence') && source.includes('Lokale Basischecks')),
    check('shows_section_index', 'Route renders compact demo section navigation.', source.includes('Demo-Navigation') && source.includes('#workflow-delta') && source.includes('#pilotmessung') && source.includes('#pilot-kit') && source.includes('#pilot-checklist') && source.includes('#pilot-result') && source.includes('#pilotplan') && source.includes('#pilot-session') && source.includes('#fortschritt') && source.includes('#vision') && source.includes('#runtime-contract') && source.includes('#runtime-adapter') && source.includes('#local-runtime-bridge') && source.includes('#kosmosketch-adapter') && source.includes('#installation') && source.includes('#health') && source.includes('#risiken') && source.includes('#commands') && source.includes('#audit') && source.includes('#demo-ready') && source.includes('#live-gate') && source.includes('#launch-brief') && source.includes('#office-pilot') && source.includes('#tool-registry') && source.includes('#routine') && source.includes('#workstation-profile') && source.includes('#local-identity') && source.includes('#data-governance') && source.includes('#office-memory') && source.includes('#local-storage-decision') && source.includes('#delete-export-restore') && source.includes('#ausbildung') && source.includes('#rechte') && source.includes('#projektpaket') && source.includes('#design-handoff') && source.includes('#design-pilot') && source.includes('#guardrails')),
    check('anchors_core_sections', 'Route contains anchors for core demo sections.', source.includes('id="autonomie"') && source.includes('id="routine"') && source.includes('id="tool-registry"') && source.includes('id="workflow-delta"') && source.includes('id="pilotmessung"') && source.includes('id="pilot-kit"') && source.includes('id="pilot-checklist"') && source.includes('id="pilot-result"') && source.includes('id="pilotplan"') && source.includes('id="pilot-session"') && source.includes('id="vision"') && source.includes('id="demo-ready"') && source.includes('id="live-gate"') && source.includes('id="launch-brief"') && source.includes('id="office-pilot"') && source.includes('id="runtime-contract"') && source.includes('id="runtime-adapter"') && source.includes('id="local-runtime-bridge"') && source.includes('id="kosmosketch-adapter"') && source.includes('id="installation"') && source.includes('id="health"') && source.includes('id="risiken"') && source.includes('id="commands"') && source.includes('id="audit"') && source.includes('id="projektpaket"') && source.includes('id="design-handoff"') && source.includes('id="design-pilot"') && source.includes('id="workstation-profile"') && source.includes('id="local-identity"') && source.includes('id="data-governance"') && source.includes('id="office-memory"') && source.includes('id="local-storage-decision"') && source.includes('id="delete-export-restore"') && source.includes('id="ausbildung"') && source.includes('id="rechte"') && source.includes('id="rollen"')),
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
