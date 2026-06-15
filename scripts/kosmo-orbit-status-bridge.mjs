#!/usr/bin/env node

import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, relative, resolve } from 'node:path';

const root = process.cwd();
const args = parseArgs(process.argv.slice(2));
const dateStamp = new Date().toISOString().slice(0, 10);
const outputJson = resolve(root, args.out || `data/kosmo-orbit-status-bridge-${dateStamp}.json`);
const outputMd = resolve(root, args.markdown || `docs/codex/kosmo-orbit-status-bridge-${dateStamp}.md`);

const refs = {
  dayBatch: `data/kosmo-day-batch-loop-${dateStamp}.json`,
  sourceRoot: `data/kosmo-source-root-blocker-refresh-${dateStamp}.json`,
  sourceRootDecisionRefresh: `data/kosmo-source-root-decision-session-refresh-${dateStamp}.json`,
  sourceRootCandidateIntegrity: `data/kosmo-source-root-candidate-integrity-check-${dateStamp}.json`,
  sourceRootOwnerAction: `data/kosmo-source-root-owner-action-card-${dateStamp}.json`,
  sourceRootOwnerDecisionPacket: `data/kosmo-source-root-owner-decision-packet-${dateStamp}.json`,
  sourceRootOwnerDecisionPacketCheck: `data/kosmo-source-root-owner-decision-packet-check-${dateStamp}.json`,
  sourceRootDecisionDryRun: `data/kosmo-source-root-decision-dry-run-${dateStamp}.json`,
  sourceRootPostOwnerActivationQueue: `data/kosmo-source-root-post-owner-activation-queue-${dateStamp}.json`,
  sourceRootPostOwnerActivationQueueCheck: `data/kosmo-source-root-post-owner-activation-queue-check-${dateStamp}.json`,
  sourceRootOwnerFinalDecisionBrief: `data/kosmo-source-root-owner-final-decision-brief-${dateStamp}.json`,
  sourceRootOwnerChoiceConsequenceMatrix: `data/kosmo-source-root-owner-choice-consequence-matrix-${dateStamp}.json`,
  ownerUnlockFastReplyCard: `data/kosmo-owner-unlock-fast-reply-card-${dateStamp}.json`,
  ownerUnlockFastReplyCardCheck: `data/kosmo-owner-unlock-fast-reply-card-check-${dateStamp}.json`,
  ownerUnlockExactReplyPreview: `data/kosmo-owner-unlock-exact-reply-preview-${dateStamp}.json`,
  ownerUnlockExactReplyPreviewCheck: `data/kosmo-owner-unlock-exact-reply-preview-check-${dateStamp}.json`,
  ownerUnlockPathAReadinessCertificate: `data/kosmo-owner-unlock-path-a-readiness-certificate-${dateStamp}.json`,
  ownerUnlockPathAReadinessCertificateCheck: `data/kosmo-owner-unlock-path-a-readiness-certificate-check-${dateStamp}.json`,
  ownerUnlockPatchReviewBundle: `data/kosmo-owner-unlock-patch-review-bundle-${dateStamp}.json`,
  ownerUnlockPatchReviewBundleCheck: `data/kosmo-owner-unlock-patch-review-bundle-check-${dateStamp}.json`,
  ownerUnlockIntakeApplyPlan: `data/kosmo-owner-unlock-intake-apply-plan-${dateStamp}.json`,
  ownerUnlockIntakeApplyPlanCheck: `data/kosmo-owner-unlock-intake-apply-plan-check-${dateStamp}.json`,
  ownerUnlockSessionEditPreview: `data/kosmo-owner-unlock-session-edit-preview-${dateStamp}.json`,
  ownerUnlockSessionEditPreviewCheck: `data/kosmo-owner-unlock-session-edit-preview-check-${dateStamp}.json`,
  ownerUnlockOperationalStartCard: `data/kosmo-owner-unlock-operational-start-card-${dateStamp}.json`,
  ownerUnlockOperationalStartCardCheck: `data/kosmo-owner-unlock-operational-start-card-check-${dateStamp}.json`,
  ownerUnlockExecutionRunbook: `data/kosmo-owner-unlock-execution-runbook-${dateStamp}.json`,
  ownerUnlockExecutionRunbookCheck: `data/kosmo-owner-unlock-execution-runbook-check-${dateStamp}.json`,
  ownerUnlockSessionApplyGuard: `data/kosmo-owner-unlock-session-apply-guard-${dateStamp}.json`,
  ownerUnlockSessionApplyGuardCheck: `data/kosmo-owner-unlock-session-apply-guard-check-${dateStamp}.json`,
  ownerUnlockSessionApplyGuardSmoke: `data/kosmo-owner-unlock-session-apply-guard-smoke-${dateStamp}.json`,
  ownerUnlockSessionApplyGuardSmokeCheck: `data/kosmo-owner-unlock-session-apply-guard-smoke-check-${dateStamp}.json`,
  sourceRootActivation: `data/kosmo-source-root-activation-preflight-${dateStamp}.json`,
  privateMetadataInventory: `data/kosmo-private-metadata-inventory-runner-${dateStamp}.json`,
  privateMetadataInventoryFixture: `data/kosmo-private-metadata-inventory-fixture-smoke-${dateStamp}.json`,
  privateMetadataInventoryCheck: `data/kosmo-private-metadata-inventory-check-${dateStamp}.json`,
  localModelInventory: `data/kosmo-local-model-inventory-${dateStamp}.json`,
  localWorkerHttpRunner: `data/kosmo-local-worker-http-runner-${dateStamp}.json`,
  localWorkerHttpRunnerCheck: `data/kosmo-local-worker-http-runner-check-${dateStamp}.json`,
  localWorkerExecutionRunbook: `data/kosmo-local-worker-execution-runbook-${dateStamp}.json`,
  localWorkerExecutionRunbookCheck: `data/kosmo-local-worker-execution-runbook-check-${dateStamp}.json`,
  localWorkerOutputContractReview: `data/kosmo-local-worker-output-contract-review-${dateStamp}.json`,
  localWorkerOutputContractReviewCheck: `data/kosmo-local-worker-output-contract-review-check-${dateStamp}.json`,
  sourceIndependentWorkQueue: `data/kosmo-source-independent-work-queue-${dateStamp}.json`,
  sweep: `data/kosmodata-lane-sweep-${dateStamp}.json`,
  workerBoundary: `data/kosmo-worker-boundary-pack-check-${dateStamp}.json`,
  ownerPacket: `data/kosmo-owner-review-packet-check-${dateStamp}.json`,
  pilotGapLabelReview: `data/kosmoreferences-pilot-gap-label-review-${dateStamp}.json`,
  pilotGapLabelReviewCheck: `data/kosmoreferences-pilot-gap-label-review-check-${dateStamp}.json`,
  assetBridge: `data/kosmoasset-reference-bridge-check-${dateStamp}.json`,
  assetSourceCandidateMap: `data/kosmoasset-source-candidate-map-${dateStamp}.json`,
  assetCandidateTaxonomyReview: `data/kosmoasset-candidate-taxonomy-review-${dateStamp}.json`,
  assetCandidateTaxonomyReviewCheck: `data/kosmoasset-candidate-taxonomy-review-check-${dateStamp}.json`,
  preparePhase1SourcePackageContractCheck: `data/kosmo-prepare-phase1-source-package-contract-check-${dateStamp}.json`,
  assetPreparePhase1FixtureContractCheck: `data/kosmo-asset-prepare-phase1-fixture-contract-check-${dateStamp}.json`,
  localWorkerFixtureChainTaskPack: `data/kosmo-local-worker-fixture-chain-task-pack-${dateStamp}.json`,
  localWorkerFixtureChainTaskPackCheck: `data/kosmo-local-worker-fixture-chain-task-pack-check-${dateStamp}.json`,
  localWorkerInnovationOutputSmoke: `data/kosmo-local-worker-innovation-output-smoke-${dateStamp}.json`,
  localWorkerInnovationOutputSmokeCheck: `data/kosmo-local-worker-innovation-output-smoke-check-${dateStamp}.json`,
  localWorkerInnovationOutputAdapterPlan: `data/kosmo-local-worker-innovation-output-adapter-plan-${dateStamp}.json`,
  localWorkerInnovationOutputAdapterPlanCheck: `data/kosmo-local-worker-innovation-output-adapter-plan-check-${dateStamp}.json`,
  localWorkerInnovationOutputValidator: `data/kosmo-local-worker-innovation-output-validator-${dateStamp}.json`,
  localWorkerInnovationOutputValidatorCheck: `data/kosmo-local-worker-innovation-output-validator-check-${dateStamp}.json`,
  localWorkerInnovationOutputValidatorFixtures: `data/kosmo-local-worker-innovation-output-validator-fixtures-${dateStamp}.json`,
  localWorkerInnovationOutputValidatorFixturesCheck: `data/kosmo-local-worker-innovation-output-validator-fixtures-check-${dateStamp}.json`,
  localWorkerInnovationLaunchDryRun: `data/kosmo-local-worker-innovation-launch-dry-run-${dateStamp}.json`,
  localWorkerInnovationLaunchDryRunCheck: `data/kosmo-local-worker-innovation-launch-dry-run-check-${dateStamp}.json`,
  localWorkerInnovationLaunchOwnerCard: `data/kosmo-local-worker-innovation-launch-owner-card-${dateStamp}.json`,
  localWorkerInnovationLaunchOwnerCardCheck: `data/kosmo-local-worker-innovation-launch-owner-card-check-${dateStamp}.json`,
  localWorkerInnovationLaunchApplyGuard: `data/kosmo-local-worker-innovation-launch-apply-guard-${dateStamp}.json`,
  localWorkerInnovationLaunchApplyGuardCheck: `data/kosmo-local-worker-innovation-launch-apply-guard-check-${dateStamp}.json`,
  localWorkerInnovationLaunchApplyGuardSmoke: `data/kosmo-local-worker-innovation-launch-apply-guard-smoke-${dateStamp}.json`,
  localWorkerInnovationLaunchApplyGuardSmokeCheck: `data/kosmo-local-worker-innovation-launch-apply-guard-smoke-check-${dateStamp}.json`,
  localWorkerInnovationLaunchRunbookCheckpoint: `data/kosmo-local-worker-innovation-launch-runbook-checkpoint-${dateStamp}.json`,
  localWorkerInnovationLaunchRunbookCheckpointCheck: `data/kosmo-local-worker-innovation-launch-runbook-checkpoint-check-${dateStamp}.json`,
  localWorkerInnovationLaunchExecutionEnvelope: `data/kosmo-local-worker-innovation-launch-execution-envelope-${dateStamp}.json`,
  localWorkerInnovationLaunchExecutionEnvelopeCheck: `data/kosmo-local-worker-innovation-launch-execution-envelope-check-${dateStamp}.json`,
  localWorkerInnovationPostOutputIntakeReview: `data/kosmo-local-worker-innovation-post-output-intake-review-${dateStamp}.json`,
  localWorkerInnovationPostOutputIntakeReviewCheck: `data/kosmo-local-worker-innovation-post-output-intake-review-check-${dateStamp}.json`,
  localWorkerInnovationHumanOverseerReviewDecisionCard: `data/kosmo-local-worker-innovation-human-overseer-review-decision-card-${dateStamp}.json`,
  localWorkerInnovationHumanOverseerReviewDecisionCardCheck: `data/kosmo-local-worker-innovation-human-overseer-review-decision-card-check-${dateStamp}.json`,
  localWorkerInnovationConversionPlanPreview: `data/kosmo-local-worker-innovation-conversion-plan-preview-${dateStamp}.json`,
  localWorkerInnovationConversionPlanPreviewCheck: `data/kosmo-local-worker-innovation-conversion-plan-preview-check-${dateStamp}.json`,
  localWorkerInnovationConversionApplyGuard: `data/kosmo-local-worker-innovation-conversion-apply-guard-${dateStamp}.json`,
  localWorkerInnovationConversionApplyGuardCheck: `data/kosmo-local-worker-innovation-conversion-apply-guard-check-${dateStamp}.json`,
  localWorkerInnovationConversionEvidenceLedger: `data/kosmo-local-worker-innovation-conversion-evidence-ledger-${dateStamp}.json`,
  localWorkerInnovationConversionEvidenceLedgerCheck: `data/kosmo-local-worker-innovation-conversion-evidence-ledger-check-${dateStamp}.json`,
  githubWatchlist: `data/kosmo-innovation-github-watchlist-${dateStamp}.json`,
  githubWatchlistCheck: `data/kosmo-innovation-github-watchlist-check-${dateStamp}.json`,
  githubDiscovery: `data/kosmo-innovation-github-discovery-${dateStamp}.json`,
  githubDiscoveryCheck: `data/kosmo-innovation-github-discovery-check-${dateStamp}.json`,
  githubReviewQueue: `data/kosmo-innovation-github-review-queue-${dateStamp}.json`,
  githubReviewQueueCheck: `data/kosmo-innovation-github-review-queue-check-${dateStamp}.json`,
  githubReadmeSignalScan: `data/kosmo-innovation-github-readme-signal-scan-${dateStamp}.json`,
  githubReadmeSignalScanCheck: `data/kosmo-innovation-github-readme-signal-scan-check-${dateStamp}.json`,
  githubFixtureContractPlan: `data/kosmo-innovation-github-fixture-contract-plan-${dateStamp}.json`,
  githubFixtureContractPlanCheck: `data/kosmo-innovation-github-fixture-contract-plan-check-${dateStamp}.json`,
  githubPromotionMatrix: `data/kosmo-innovation-github-promotion-matrix-${dateStamp}.json`,
  githubPromotionMatrixCheck: `data/kosmo-innovation-github-promotion-matrix-check-${dateStamp}.json`,
  githubFixtureSkeletons: `data/kosmo-innovation-github-fixture-skeletons-${dateStamp}.json`,
  githubFixtureSkeletonsCheck: `data/kosmo-innovation-github-fixture-skeletons-check-${dateStamp}.json`,
  githubFixturePayloads: `data/kosmo-innovation-github-fixture-payloads-${dateStamp}.json`,
  githubFixturePayloadsCheck: `data/kosmo-innovation-github-fixture-payloads-check-${dateStamp}.json`,
  githubFixturePayloadSmoke: `data/kosmo-innovation-github-fixture-payload-smoke-${dateStamp}.json`,
  githubFixturePayloadSmokeCheck: `data/kosmo-innovation-github-fixture-payload-smoke-check-${dateStamp}.json`,
  githubWorkerIntegrationSignalBridge: `data/kosmo-innovation-github-worker-integration-signal-bridge-${dateStamp}.json`,
  githubWorkerIntegrationSignalBridgeCheck: `data/kosmo-innovation-github-worker-integration-signal-bridge-check-${dateStamp}.json`,
  githubWorkerAdapterBoundaryContract: `data/kosmo-innovation-github-worker-adapter-boundary-contract-${dateStamp}.json`,
  githubWorkerAdapterBoundaryContractCheck: `data/kosmo-innovation-github-worker-adapter-boundary-contract-check-${dateStamp}.json`,
  githubWorkerAdapterBoundaryNegativeFixtures: `data/kosmo-innovation-github-worker-adapter-boundary-negative-fixtures-${dateStamp}.json`,
  githubWorkerAdapterBoundaryNegativeFixturesCheck: `data/kosmo-innovation-github-worker-adapter-boundary-negative-fixtures-check-${dateStamp}.json`,
  codexMorningRoutineRun: `data/kosmo-codex-morning-routine-run-${dateStamp}.json`,
  codexMorningRoutineRunCheck: `data/kosmo-codex-morning-routine-run-check-${dateStamp}.json`,
  todayLoopPlan: `data/kosmo-today-loop-plan-${dateStamp}.json`,
  todayLoopPlanCheck: `data/kosmo-today-loop-plan-check-${dateStamp}.json`,
  trainingEvalRubricPack: `data/kosmo-training-eval-rubric-pack-${dateStamp}.json`,
  trainingEvalRubricPackCheck: `data/kosmo-training-eval-rubric-pack-check-${dateStamp}.json`,
  trainingEvalRowTemplate: `data/kosmo-training-eval-row-template-${dateStamp}.json`,
  trainingEvalRowTemplateCheck: `data/kosmo-training-eval-row-template-check-${dateStamp}.json`,
  trainingEvalReviewQueuePlan: `data/kosmo-training-eval-review-queue-plan-${dateStamp}.json`,
  trainingEvalReviewQueuePlanCheck: `data/kosmo-training-eval-review-queue-plan-check-${dateStamp}.json`,
  architectureOntologySeed: `data/kosmo-architecture-ontology-seed-${dateStamp}.json`,
  architectureOntologySeedCheck: `data/kosmo-architecture-ontology-seed-check-${dateStamp}.json`,
  tomorrowDayBatch: `data/kosmo-tomorrow-day-batch-${dateStamp}.json`,
  tomorrowDayBatchCheck: `data/kosmo-tomorrow-day-batch-check-${dateStamp}.json`,
  innovationPlan: `data/kosmo-innovation-lane-plan-${dateStamp}.json`,
  innovationSmoke: `data/kosmo-innovation-smoke-${dateStamp}.json`,
  nightLoop: `data/kosmo-night-loop-checkpoint-${dateStamp}.json`
};

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

async function main() {
  const reports = {};
  for (const [key, path] of Object.entries(refs)) reports[key] = await readOptionalJson(path);
  const bridge = buildBridge(reports);

  await mkdir(dirname(outputJson), { recursive: true });
  await mkdir(dirname(outputMd), { recursive: true });
  await writeFile(outputJson, `${JSON.stringify(bridge, null, 2)}\n`);
  await writeFile(outputMd, renderMarkdown(bridge));

  console.log('Kosmo Orbit status bridge');
  console.log(`Status: ${bridge.status}`);
  console.log(`Cards: ${bridge.summary.cards}`);
  console.log(`Blocking cards: ${bridge.summary.blocking_cards}`);
  console.log(`Wrote: ${relative(root, outputMd)}`);
}

function buildBridge(reports) {
  const daySummary = reports.dayBatch?.summary || {};
  const sourceSummary = reports.sourceRoot?.summary || {};
  const decisionRefreshSummary = reports.sourceRootDecisionRefresh?.summary || {};
  const candidateIntegritySummary = reports.sourceRootCandidateIntegrity?.summary || {};
  const ownerActionSummary = reports.sourceRootOwnerAction?.summary || {};
  const ownerDecisionPacketSummary = reports.sourceRootOwnerDecisionPacket?.summary || {};
  const ownerDecisionPacketCheckSummary = reports.sourceRootOwnerDecisionPacketCheck?.summary || {};
  const decisionDryRunSummary = reports.sourceRootDecisionDryRun?.summary || {};
  const postOwnerActivationQueueSummary = reports.sourceRootPostOwnerActivationQueue?.summary || {};
  const postOwnerActivationQueueCheckSummary = reports.sourceRootPostOwnerActivationQueueCheck?.summary || {};
  const ownerFinalDecisionBriefSummary = reports.sourceRootOwnerFinalDecisionBrief?.summary || {};
  const ownerChoiceConsequenceMatrixSummary = reports.sourceRootOwnerChoiceConsequenceMatrix?.summary || {};
  const ownerUnlockFastReplyCardSummary = reports.ownerUnlockFastReplyCard?.summary || {};
  const ownerUnlockFastReplyCardCheckSummary = reports.ownerUnlockFastReplyCardCheck?.summary || {};
  const ownerUnlockExactReplyPreviewSummary = reports.ownerUnlockExactReplyPreview?.summary || {};
  const ownerUnlockExactReplyPreviewCheckSummary = reports.ownerUnlockExactReplyPreviewCheck?.summary || {};
  const ownerUnlockPathAReadinessSummary = reports.ownerUnlockPathAReadinessCertificate?.summary || {};
  const ownerUnlockPathAReadinessCheckSummary = reports.ownerUnlockPathAReadinessCertificateCheck?.summary || {};
  const ownerUnlockPatchReviewBundleSummary = reports.ownerUnlockPatchReviewBundle?.summary || {};
  const ownerUnlockPatchReviewBundleCheckSummary = reports.ownerUnlockPatchReviewBundleCheck?.summary || {};
  const ownerUnlockIntakeApplyPlanSummary = reports.ownerUnlockIntakeApplyPlan?.summary || {};
  const ownerUnlockIntakeApplyPlanCheckSummary = reports.ownerUnlockIntakeApplyPlanCheck?.summary || {};
  const ownerUnlockSessionEditPreviewSummary = reports.ownerUnlockSessionEditPreview?.summary || {};
  const ownerUnlockSessionEditPreviewCheckSummary = reports.ownerUnlockSessionEditPreviewCheck?.summary || {};
  const ownerUnlockOperationalStartCardSummary = reports.ownerUnlockOperationalStartCard?.summary || {};
  const ownerUnlockOperationalStartCardCheckSummary = reports.ownerUnlockOperationalStartCardCheck?.summary || {};
  const ownerUnlockExecutionRunbookSummary = reports.ownerUnlockExecutionRunbook?.summary || {};
  const ownerUnlockExecutionRunbookCheckSummary = reports.ownerUnlockExecutionRunbookCheck?.summary || {};
  const ownerUnlockSessionApplyGuardSummary = reports.ownerUnlockSessionApplyGuard?.summary || {};
  const ownerUnlockSessionApplyGuardCheckSummary = reports.ownerUnlockSessionApplyGuardCheck?.summary || {};
  const ownerUnlockSessionApplyGuardSmokeSummary = reports.ownerUnlockSessionApplyGuardSmoke?.summary || {};
  const ownerUnlockSessionApplyGuardSmokeCheckSummary = reports.ownerUnlockSessionApplyGuardSmokeCheck?.summary || {};
  const activationSummary = reports.sourceRootActivation?.summary || {};
  const privateInventorySummary = reports.privateMetadataInventory?.summary || {};
  const privateInventoryFixtureSummary = reports.privateMetadataInventoryFixture?.summary || {};
  const modelSummary = reports.localModelInventory?.summary || {};
  const localWorkerHttpRunner = reports.localWorkerHttpRunner || {};
  const localWorkerHttpRunnerGuard = localWorkerHttpRunner.guard || {};
  const localWorkerHttpRunnerCheck = reports.localWorkerHttpRunnerCheck || {};
  const localWorkerExecutionRunbook = reports.localWorkerExecutionRunbook || {};
  const localWorkerExecutionRunbookSummary = localWorkerExecutionRunbook.summary || {};
  const localWorkerExecutionRunbookCheck = reports.localWorkerExecutionRunbookCheck || {};
  const localWorkerOutputContractSummary = reports.localWorkerOutputContractReview?.summary || {};
  const localWorkerOutputContractCheckSummary = reports.localWorkerOutputContractReviewCheck?.summary || {};
  const sourceIndependentWorkQueueSummary = reports.sourceIndependentWorkQueue?.summary || {};
  const sweepSummary = reports.sweep?.summary || {};
  const pilotGapLabelSummary = reports.pilotGapLabelReview?.summary || {};
  const pilotGapLabelCheckSummary = reports.pilotGapLabelReviewCheck?.summary || {};
  const assetBridgeSummary = reports.assetBridge?.summary || {};
  const assetSourceCandidateSummary = reports.assetSourceCandidateMap?.summary || {};
  const assetCandidateTaxonomySummary = reports.assetCandidateTaxonomyReview?.summary || {};
  const assetCandidateTaxonomyCheckSummary = reports.assetCandidateTaxonomyReviewCheck?.summary || {};
  const preparePhase1SourcePackageSummary = reports.preparePhase1SourcePackageContractCheck?.summary || {};
  const assetPreparePhase1FixtureSummary = reports.assetPreparePhase1FixtureContractCheck?.summary || {};
  const localWorkerFixtureChainTaskPackSummary = reports.localWorkerFixtureChainTaskPack?.summary || {};
  const localWorkerFixtureChainTaskPackCheckSummary = reports.localWorkerFixtureChainTaskPackCheck?.summary || {};
  const localWorkerInnovationOutputSmokeSummary = reports.localWorkerInnovationOutputSmoke?.summary || {};
  const localWorkerInnovationOutputSmokeCheckSummary = reports.localWorkerInnovationOutputSmokeCheck?.summary || {};
  const localWorkerInnovationOutputAdapterPlanSummary = reports.localWorkerInnovationOutputAdapterPlan?.summary || {};
  const localWorkerInnovationOutputAdapterPlanCheckSummary = reports.localWorkerInnovationOutputAdapterPlanCheck?.summary || {};
  const localWorkerInnovationOutputValidatorSummary = reports.localWorkerInnovationOutputValidator?.summary || {};
  const localWorkerInnovationOutputValidatorCheckSummary = reports.localWorkerInnovationOutputValidatorCheck?.summary || {};
  const localWorkerInnovationOutputValidatorFixturesSummary = reports.localWorkerInnovationOutputValidatorFixtures?.summary || {};
  const localWorkerInnovationOutputValidatorFixturesCheckSummary = reports.localWorkerInnovationOutputValidatorFixturesCheck?.summary || {};
  const localWorkerInnovationLaunchDryRunSummary = reports.localWorkerInnovationLaunchDryRun?.summary || {};
  const localWorkerInnovationLaunchDryRunCheckSummary = reports.localWorkerInnovationLaunchDryRunCheck?.summary || {};
  const localWorkerInnovationLaunchOwnerCardSummary = reports.localWorkerInnovationLaunchOwnerCard?.summary || {};
  const localWorkerInnovationLaunchOwnerCardCheckSummary = reports.localWorkerInnovationLaunchOwnerCardCheck?.summary || {};
  const localWorkerInnovationLaunchApplyGuardSummary = reports.localWorkerInnovationLaunchApplyGuard?.summary || {};
  const localWorkerInnovationLaunchApplyGuardCheckSummary = reports.localWorkerInnovationLaunchApplyGuardCheck?.summary || {};
  const localWorkerInnovationLaunchApplyGuardSmokeSummary = reports.localWorkerInnovationLaunchApplyGuardSmoke?.summary || {};
  const localWorkerInnovationLaunchApplyGuardSmokeCheckSummary = reports.localWorkerInnovationLaunchApplyGuardSmokeCheck?.summary || {};
  const localWorkerInnovationLaunchRunbookCheckpointSummary = reports.localWorkerInnovationLaunchRunbookCheckpoint?.summary || {};
  const localWorkerInnovationLaunchRunbookCheckpointCheckSummary = reports.localWorkerInnovationLaunchRunbookCheckpointCheck?.summary || {};
  const localWorkerInnovationLaunchExecutionEnvelopeSummary = reports.localWorkerInnovationLaunchExecutionEnvelope?.summary || {};
  const localWorkerInnovationLaunchExecutionEnvelopeCheckSummary = reports.localWorkerInnovationLaunchExecutionEnvelopeCheck?.summary || {};
  const localWorkerInnovationPostOutputIntakeReviewSummary = reports.localWorkerInnovationPostOutputIntakeReview?.summary || {};
  const localWorkerInnovationPostOutputIntakeReviewCheckSummary = reports.localWorkerInnovationPostOutputIntakeReviewCheck?.summary || {};
  const localWorkerInnovationHumanOverseerReviewDecisionCardSummary = reports.localWorkerInnovationHumanOverseerReviewDecisionCard?.summary || {};
  const localWorkerInnovationHumanOverseerReviewDecisionCardCheckSummary = reports.localWorkerInnovationHumanOverseerReviewDecisionCardCheck?.summary || {};
  const localWorkerInnovationConversionPlanPreviewSummary = reports.localWorkerInnovationConversionPlanPreview?.summary || {};
  const localWorkerInnovationConversionPlanPreviewCheckSummary = reports.localWorkerInnovationConversionPlanPreviewCheck?.summary || {};
  const localWorkerInnovationConversionApplyGuardSummary = reports.localWorkerInnovationConversionApplyGuard?.summary || {};
  const localWorkerInnovationConversionApplyGuardCheckSummary = reports.localWorkerInnovationConversionApplyGuardCheck?.summary || {};
  const localWorkerInnovationConversionEvidenceLedgerSummary = reports.localWorkerInnovationConversionEvidenceLedger?.summary || {};
  const localWorkerInnovationConversionEvidenceLedgerCheckSummary = reports.localWorkerInnovationConversionEvidenceLedgerCheck?.summary || {};
  const githubWatchlistSummary = reports.githubWatchlist?.summary || {};
  const githubWatchlistCheckSummary = reports.githubWatchlistCheck?.summary || {};
  const githubDiscoverySummary = reports.githubDiscovery?.summary || {};
  const githubDiscoveryCheckSummary = reports.githubDiscoveryCheck?.summary || {};
  const githubReviewQueueSummary = reports.githubReviewQueue?.summary || {};
  const githubReviewQueueCheckSummary = reports.githubReviewQueueCheck?.summary || {};
  const githubReadmeSignalScanSummary = reports.githubReadmeSignalScan?.summary || {};
  const githubReadmeSignalScanCheckSummary = reports.githubReadmeSignalScanCheck?.summary || {};
  const githubFixtureContractPlanSummary = reports.githubFixtureContractPlan?.summary || {};
  const githubFixtureContractPlanCheckSummary = reports.githubFixtureContractPlanCheck?.summary || {};
  const githubPromotionMatrixSummary = reports.githubPromotionMatrix?.summary || {};
  const githubPromotionMatrixCheckSummary = reports.githubPromotionMatrixCheck?.summary || {};
  const githubFixtureSkeletonsSummary = reports.githubFixtureSkeletons?.summary || {};
  const githubFixtureSkeletonsCheckSummary = reports.githubFixtureSkeletonsCheck?.summary || {};
  const githubFixturePayloadsSummary = reports.githubFixturePayloads?.summary || {};
  const githubFixturePayloadsCheckSummary = reports.githubFixturePayloadsCheck?.summary || {};
  const githubFixturePayloadSmokeSummary = reports.githubFixturePayloadSmoke?.summary || {};
  const githubFixturePayloadSmokeCheckSummary = reports.githubFixturePayloadSmokeCheck?.summary || {};
  const githubWorkerIntegrationSignalBridgeSummary = reports.githubWorkerIntegrationSignalBridge?.summary || {};
  const githubWorkerIntegrationSignalBridgeCheckSummary = reports.githubWorkerIntegrationSignalBridgeCheck?.summary || {};
  const githubWorkerAdapterBoundaryContractSummary = reports.githubWorkerAdapterBoundaryContract?.summary || {};
  const githubWorkerAdapterBoundaryContractCheckSummary = reports.githubWorkerAdapterBoundaryContractCheck?.summary || {};
  const githubWorkerAdapterBoundaryNegativeFixturesSummary = reports.githubWorkerAdapterBoundaryNegativeFixtures?.summary || {};
  const githubWorkerAdapterBoundaryNegativeFixturesCheckSummary = reports.githubWorkerAdapterBoundaryNegativeFixturesCheck?.summary || {};
  const codexMorningRoutineRunSummary = reports.codexMorningRoutineRun?.summary || {};
  const codexMorningRoutineRunCheckSummary = reports.codexMorningRoutineRunCheck?.summary || {};
  const todayLoopPlanSummary = reports.todayLoopPlan?.summary || {};
  const todayLoopPlanCheckSummary = reports.todayLoopPlanCheck?.summary || {};
  const trainingEvalRubricSummary = reports.trainingEvalRubricPack?.summary || {};
  const trainingEvalRubricCheckSummary = reports.trainingEvalRubricPackCheck?.summary || {};
  const trainingEvalRowTemplateSummary = reports.trainingEvalRowTemplate?.summary || {};
  const trainingEvalRowTemplateCheckSummary = reports.trainingEvalRowTemplateCheck?.summary || {};
  const trainingEvalReviewQueueSummary = reports.trainingEvalReviewQueuePlan?.summary || {};
  const trainingEvalReviewQueueCheckSummary = reports.trainingEvalReviewQueuePlanCheck?.summary || {};
  const architectureOntologySummary = reports.architectureOntologySeed?.summary || {};
  const architectureOntologyCheckSummary = reports.architectureOntologySeedCheck?.summary || {};
  const tomorrowDayBatchSummary = reports.tomorrowDayBatch?.summary || {};
  const tomorrowDayBatchCheckSummary = reports.tomorrowDayBatchCheck?.summary || {};
  const innovationSummary = reports.innovationSmoke?.summary || {};
  const cards = [
    {
      id: 'day-batch',
      title: 'Daily Batch',
      status: reports.dayBatch?.status === 'day_batch_loop_passed_review_only' ? 'ready' : 'needs_review',
      signal: `${daySummary.required_passed_steps ?? 0}/${daySummary.required_steps ?? 0} required steps`,
      owner_action_required: false,
      route_hint: 'KosmoReferences/KosmoAsset daily loop',
      source_ref: refs.dayBatch
    },
    {
      id: 'source-root',
      title: 'Source Root',
      status: sourceSummary.private_diagnostic_allowed === true ? 'ready' : 'blocked',
      signal: sourceSummary.private_diagnostic_allowed === true
        ? 'private diagnostic allowed'
        : `blocked: ${sourceSummary.source_root_probable_libraries ?? 0} probable libraries, ${sourceSummary.onedrive_marker_files ?? 0} OneDrive markers`,
      owner_action_required: sourceSummary.private_diagnostic_allowed !== true,
      route_hint: 'Owner/KosmoOverseer must record true private source root',
      source_ref: refs.sourceRoot
    },
    {
      id: 'source-root-decision-refresh',
      title: 'Source Root Decision Refresh',
      status: [
        'source_root_decision_session_refreshed_pending',
        'source_root_decision_session_refresh_not_needed'
      ].includes(reports.sourceRootDecisionRefresh?.status)
        ? 'review_only_ready'
        : 'needs_review',
      signal: reports.sourceRootDecisionRefresh?.status
        ? `${reports.sourceRootDecisionRefresh.status}, changed ${decisionRefreshSummary.changed ? 'yes' : 'no'}, options ${decisionRefreshSummary.refreshed_options ?? 0}`
        : 'missing decision session refresh',
      owner_action_required: false,
      route_hint: 'Keep pending source-root decision options aligned with current storage evidence',
      source_ref: refs.sourceRootDecisionRefresh
    },
    {
      id: 'source-root-candidate-integrity',
      title: 'Source Root Candidate Integrity',
      status: reports.sourceRootCandidateIntegrity?.status === 'source_root_candidate_integrity_owner_review_ready'
        ? 'review_only_ready'
        : 'needs_review',
      signal: reports.sourceRootCandidateIntegrity?.status
        ? `${candidateIntegritySummary.existing_path_options ?? 0}/${candidateIntegritySummary.path_options ?? 0} paths visible, exact roots ${candidateIntegritySummary.owner_confirmable_exact_roots ?? 0}, failures ${candidateIntegritySummary.failures ?? 0}`
        : 'missing candidate integrity check',
      owner_action_required: true,
      route_hint: 'Verify visible root candidates without reading private contents',
      source_ref: refs.sourceRootCandidateIntegrity
    },
    {
      id: 'source-root-owner-action',
      title: 'Source Root Owner Action',
      status: reports.sourceRootOwnerAction?.status === 'source_root_owner_action_satisfied_metadata_only'
        ? 'ready'
        : reports.sourceRootOwnerAction?.status === 'source_root_owner_action_required'
          ? 'blocked'
          : 'needs_review',
      signal: reports.sourceRootOwnerAction?.status === 'source_root_owner_action_required'
        ? `action required: ${ownerActionSummary.recommended_decision || 'select or mount source root'}`
        : `decision ${ownerActionSummary.selected_decision || 'pending'}, root ${ownerActionSummary.selected_root_path || 'pending'}`,
      owner_action_required: ownerActionSummary.owner_action_required !== false,
      route_hint: 'Exact owner edit needed for source-root decision session',
      source_ref: refs.sourceRootOwnerAction
    },
    {
      id: 'source-root-owner-decision-packet',
      title: 'Source Root Owner Decision Packet',
      status: reports.sourceRootOwnerDecisionPacket?.status === 'source_root_owner_decision_packet_ready'
        ? 'ready'
        : 'needs_review',
      signal: reports.sourceRootOwnerDecisionPacket?.status
        ? `${ownerDecisionPacketSummary.decision_templates ?? 0} templates, exact roots ${ownerDecisionPacketSummary.owner_confirmable_exact_roots ?? 0}, failures ${ownerDecisionPacketSummary.failures ?? 0}`
        : 'missing owner decision packet',
      owner_action_required: true,
      route_hint: 'Owner-facing source-root decision templates',
      source_ref: refs.sourceRootOwnerDecisionPacket
    },
    {
      id: 'source-root-owner-decision-packet-check',
      title: 'Source Root Owner Decision Packet Check',
      status: reports.sourceRootOwnerDecisionPacketCheck?.status === 'source_root_owner_decision_packet_guard_passed'
        ? 'locked'
        : 'needs_review',
      signal: reports.sourceRootOwnerDecisionPacketCheck?.status
        ? `${reports.sourceRootOwnerDecisionPacketCheck.status}, failures ${ownerDecisionPacketCheckSummary.failures ?? 0}, warnings ${ownerDecisionPacketCheckSummary.warnings ?? 0}`
        : 'missing owner decision packet guard',
      owner_action_required: false,
      route_hint: 'Guard source-root decision templates before owner presentation',
      source_ref: refs.sourceRootOwnerDecisionPacketCheck
    },
    {
      id: 'source-root-decision-dry-run',
      title: 'Source Root Decision Dry Run',
      status: reports.sourceRootDecisionDryRun?.status === 'source_root_decision_dry_run_ready'
        ? 'review_only_ready'
        : 'needs_review',
      signal: reports.sourceRootDecisionDryRun?.status
        ? `${decisionDryRunSummary.scenarios ?? 0} scenarios, metadata ${decisionDryRunSummary.metadata_diagnostic_scenarios ?? 0}, failures ${decisionDryRunSummary.failures ?? 0}`
        : 'missing source-root decision dry run',
      owner_action_required: false,
      route_hint: 'Preview source-root decision consequences without applying them',
      source_ref: refs.sourceRootDecisionDryRun
    },
    {
      id: 'source-root-post-owner-activation-queue',
      title: 'Source Root Post-Owner Activation Queue',
      status: reports.sourceRootPostOwnerActivationQueue?.status === 'source_root_post_owner_activation_queue_ready'
        ? 'review_only_ready'
        : 'needs_review',
      signal: reports.sourceRootPostOwnerActivationQueue?.status
        ? `${postOwnerActivationQueueSummary.queue_steps ?? 0} steps, executable ${postOwnerActivationQueueSummary.executable_now ?? 0}, blocked ${postOwnerActivationQueueSummary.blocked_now ?? 0}`
        : 'missing post-owner activation queue',
      owner_action_required: false,
      route_hint: 'Safe command order after recorded source-root decision',
      source_ref: refs.sourceRootPostOwnerActivationQueue
    },
    {
      id: 'source-root-post-owner-activation-queue-check',
      title: 'Source Root Post-Owner Activation Queue Check',
      status: reports.sourceRootPostOwnerActivationQueueCheck?.status === 'source_root_post_owner_activation_queue_guard_passed'
        ? 'guard_passed'
        : 'needs_review',
      signal: reports.sourceRootPostOwnerActivationQueueCheck?.status
        ? `${postOwnerActivationQueueCheckSummary.failures ?? 0} failures, ${postOwnerActivationQueueCheckSummary.warnings ?? 0} warnings`
        : 'missing post-owner activation queue guard',
      owner_action_required: false,
      route_hint: 'Validate queue order and safety policy before activation',
      source_ref: refs.sourceRootPostOwnerActivationQueueCheck
    },
    {
      id: 'source-root-owner-final-decision-brief',
      title: 'Source Root Owner Final Decision Brief',
      status: reports.sourceRootOwnerFinalDecisionBrief?.status === 'source_root_owner_final_decision_brief_ready'
        ? 'owner_action'
        : 'needs_review',
      signal: reports.sourceRootOwnerFinalDecisionBrief?.status
        ? `${ownerFinalDecisionBriefSummary.decision_options ?? 0} options, unlock ${ownerFinalDecisionBriefSummary.unlock_options ?? 0}, failures ${ownerFinalDecisionBriefSummary.failures ?? 0}`
        : 'missing owner final decision brief',
      owner_action_required: true,
      route_hint: 'Single owner-facing source-root decision surface',
      source_ref: refs.sourceRootOwnerFinalDecisionBrief
    },
    {
      id: 'source-root-owner-choice-consequence-matrix',
      title: 'Source Root Owner Choice Consequence Matrix',
      status: reports.sourceRootOwnerChoiceConsequenceMatrix?.status === 'source_root_owner_choice_consequence_matrix_ready'
        ? 'owner_action'
        : 'needs_review',
      signal: reports.sourceRootOwnerChoiceConsequenceMatrix?.status
        ? `${ownerChoiceConsequenceMatrixSummary.choices ?? 0} choices, unlock ${ownerChoiceConsequenceMatrixSummary.unlock_choices ?? 0}, blocked ${ownerChoiceConsequenceMatrixSummary.blocked_choices ?? 0}, failures ${ownerChoiceConsequenceMatrixSummary.failures ?? 0}`
        : 'missing owner choice consequence matrix',
      owner_action_required: true,
      route_hint: 'Preview consequences before recording an owner source-root choice',
      source_ref: refs.sourceRootOwnerChoiceConsequenceMatrix
    },
    {
      id: 'owner-unlock-fast-reply-card',
      title: 'Owner Unlock Fast Reply Card',
      status: reports.ownerUnlockFastReplyCard?.status === 'owner_unlock_fast_reply_card_ready' &&
        reports.ownerUnlockFastReplyCardCheck?.status === 'owner_unlock_fast_reply_card_guard_passed'
        ? 'owner_action'
        : 'needs_review',
      signal: reports.ownerUnlockFastReplyCard?.status
        ? `broad intent ${ownerUnlockFastReplyCardSummary.broad_unlock_intent ? 'yes' : 'no'}, suggestions ${ownerUnlockFastReplyCardSummary.suggested_replies ?? 0}, applies now ${ownerUnlockFastReplyCardSummary.applies_decision_now ? 'yes' : 'no'}, failures ${ownerUnlockFastReplyCardCheckSummary.failures ?? 0}`
        : 'missing fast reply card',
      owner_action_required: true,
      route_hint: 'Turn freeform owner intent into exact validator-ready reply text without applying it',
      source_ref: refs.ownerUnlockFastReplyCard
    },
    {
      id: 'owner-unlock-exact-reply-preview',
      title: 'Owner Unlock Exact Reply Preview',
      status: reports.ownerUnlockExactReplyPreview?.status === 'owner_unlock_answer_dry_run_ready_for_review' &&
        reports.ownerUnlockExactReplyPreviewCheck?.status === 'owner_unlock_answer_dry_run_guard_passed'
        ? 'review_only_ready'
        : 'needs_review',
      signal: reports.ownerUnlockExactReplyPreview?.status
        ? `validator ${ownerUnlockExactReplyPreviewSummary.validator_status || 'missing'}, intake ${ownerUnlockExactReplyPreviewSummary.intake_map_status || 'missing'}, patches ${ownerUnlockExactReplyPreviewSummary.patch_operations ?? 0}, failures ${ownerUnlockExactReplyPreviewCheckSummary.failures ?? 0}`
        : 'missing exact reply preview',
      owner_action_required: true,
      route_hint: 'Proof that the exact reply block reaches dry-run review without applying a decision',
      source_ref: refs.ownerUnlockExactReplyPreview
    },
    {
      id: 'owner-unlock-path-a-readiness',
      title: 'Owner Unlock Path A Readiness',
      status: reports.ownerUnlockPathAReadinessCertificate?.status === 'owner_unlock_path_a_readiness_certificate_ready' &&
        reports.ownerUnlockPathAReadinessCertificateCheck?.status === 'owner_unlock_path_a_readiness_certificate_guard_passed'
        ? 'owner_action'
        : 'needs_review',
      signal: reports.ownerUnlockPathAReadinessCertificate?.status
        ? `can start after exact reply ${ownerUnlockPathAReadinessSummary.path_a_can_start_after_exact_owner_reply ? 'yes' : 'no'}, applies now ${ownerUnlockPathAReadinessSummary.applies_decision_now ? 'yes' : 'no'}, activation ready ${ownerUnlockPathAReadinessSummary.activation_ready_now ? 'yes' : 'no'}, failures ${ownerUnlockPathAReadinessCheckSummary.failures ?? 0}`
        : 'missing Path A readiness certificate',
      owner_action_required: true,
      route_hint: 'Certificate of the exact owner-reply path before any private activation',
      source_ref: refs.ownerUnlockPathAReadinessCertificate
    },
    {
      id: 'owner-unlock-patch-review-bundle',
      title: 'Owner Unlock Patch Review Bundle',
      status: reports.ownerUnlockPatchReviewBundle?.status === 'owner_unlock_patch_review_bundle_ready' &&
        reports.ownerUnlockPatchReviewBundleCheck?.status === 'owner_unlock_patch_review_bundle_guard_passed'
        ? 'review_only_ready'
        : 'needs_review',
      signal: reports.ownerUnlockPatchReviewBundle?.status
        ? `${ownerUnlockPatchReviewBundleSummary.patch_operations ?? 0} patches, source-root ${ownerUnlockPatchReviewBundleSummary.source_root_patches ?? 0}, owner cards ${ownerUnlockPatchReviewBundleSummary.owner_card_patches ?? 0}, applies now ${ownerUnlockPatchReviewBundleSummary.applies_patch_now ? 'yes' : 'no'}, failures ${ownerUnlockPatchReviewBundleCheckSummary.failures ?? 0}`
        : 'missing patch review bundle',
      owner_action_required: true,
      route_hint: 'Review exact intake patch operations before any template edit',
      source_ref: refs.ownerUnlockPatchReviewBundle
    },
    {
      id: 'owner-unlock-intake-apply-plan',
      title: 'Owner Unlock Intake Apply Plan',
      status: reports.ownerUnlockIntakeApplyPlan?.status === 'owner_unlock_intake_apply_plan_ready' &&
        reports.ownerUnlockIntakeApplyPlanCheck?.status === 'owner_unlock_intake_apply_plan_guard_passed'
        ? 'review_only_ready'
        : 'needs_review',
      signal: reports.ownerUnlockIntakeApplyPlan?.status
        ? `${ownerUnlockIntakeApplyPlanSummary.planned_field_edits ?? 0} field edits, target empty ${ownerUnlockIntakeApplyPlanSummary.target_intake_currently_empty ? 'yes' : 'no'}, root exists ${ownerUnlockIntakeApplyPlanSummary.selected_root_exists ? 'yes' : 'no'}, writes now ${ownerUnlockIntakeApplyPlanSummary.writes_intake_now ? 'yes' : 'no'}, failures ${ownerUnlockIntakeApplyPlanCheckSummary.failures ?? 0}`
        : 'missing intake apply plan',
      owner_action_required: true,
      route_hint: 'Field-level apply plan for the owner intake template; review only',
      source_ref: refs.ownerUnlockIntakeApplyPlan
    },
    {
      id: 'owner-unlock-session-edit-preview',
      title: 'Owner Unlock Session Edit Preview',
      status: reports.ownerUnlockSessionEditPreview?.status === 'owner_unlock_session_edit_preview_ready' &&
        reports.ownerUnlockSessionEditPreviewCheck?.status === 'owner_unlock_session_edit_preview_guard_passed'
        ? 'review_only_ready'
        : 'needs_review',
      signal: reports.ownerUnlockSessionEditPreview?.status
        ? `${ownerUnlockSessionEditPreviewSummary.preview_edits ?? 0} preview edits, session files ${ownerUnlockSessionEditPreviewSummary.session_file_edits ?? 0}, manual triage ${ownerUnlockSessionEditPreviewSummary.manual_triage_edits ?? 0}, writes now ${ownerUnlockSessionEditPreviewSummary.writes_now ? 'yes' : 'no'}, failures ${ownerUnlockSessionEditPreviewCheckSummary.failures ?? 0}`
        : 'missing session edit preview',
      owner_action_required: true,
      route_hint: 'Preview which session files would change after exact owner unlock; review only',
      source_ref: refs.ownerUnlockSessionEditPreview
    },
    {
      id: 'owner-unlock-operational-start-card',
      title: 'Owner Unlock Operational Start Card',
      status: reports.ownerUnlockOperationalStartCard?.status === 'owner_unlock_operational_start_card_ready' &&
        reports.ownerUnlockOperationalStartCardCheck?.status === 'owner_unlock_operational_start_card_guard_passed'
        ? 'owner_action'
        : 'needs_review',
      signal: reports.ownerUnlockOperationalStartCard?.status
        ? `${ownerUnlockOperationalStartCardSummary.ready_components ?? 0}/${ownerUnlockOperationalStartCardSummary.components ?? 0} components, next ${ownerUnlockOperationalStartCardSummary.next_commands ?? 0}, blocked ${ownerUnlockOperationalStartCardSummary.blocked_commands ?? 0}, writes now ${ownerUnlockOperationalStartCardSummary.writes_now ? 'yes' : 'no'}, failures ${ownerUnlockOperationalStartCardCheckSummary.failures ?? 0}`
        : 'missing operational start card',
      owner_action_required: true,
      route_hint: 'Single start card for the exact owner-unlock path; checklist only',
      source_ref: refs.ownerUnlockOperationalStartCard
    },
    {
      id: 'owner-unlock-execution-runbook',
      title: 'Owner Unlock Execution Runbook',
      status: reports.ownerUnlockExecutionRunbook?.status === 'owner_unlock_execution_runbook_ready' &&
        reports.ownerUnlockExecutionRunbookCheck?.status === 'owner_unlock_execution_runbook_guard_passed'
        ? 'review_only_ready'
        : 'needs_review',
      signal: reports.ownerUnlockExecutionRunbook?.status
        ? `${ownerUnlockExecutionRunbookSummary.phases ?? 0} phases, ${ownerUnlockExecutionRunbookSummary.commands ?? 0} commands, target ${ownerUnlockExecutionRunbookSummary.expected_session_file || 'missing'}, queue executable ${ownerUnlockExecutionRunbookSummary.post_owner_queue_executable_now ?? '-'}, failures ${ownerUnlockExecutionRunbookCheckSummary.failures ?? 0}`
        : 'missing execution runbook',
      owner_action_required: true,
      route_hint: 'Current guarded source-root unlock sequence; runbook only',
      source_ref: refs.ownerUnlockExecutionRunbook
    },
    {
      id: 'owner-unlock-session-apply-guard',
      title: 'Owner Unlock Session Apply Guard',
      status: [
        'owner_unlock_session_apply_guard_waiting_for_manual_apply',
        'owner_unlock_session_apply_guard_passed_after_manual_apply'
      ].includes(reports.ownerUnlockSessionApplyGuard?.status) &&
        reports.ownerUnlockSessionApplyGuardCheck?.status === 'owner_unlock_session_apply_guard_check_passed'
        ? 'review_only_ready'
        : 'needs_review',
      signal: reports.ownerUnlockSessionApplyGuard?.status
        ? `${ownerUnlockSessionApplyGuardSummary.mode || 'missing'}, target ${ownerUnlockSessionApplyGuardSummary.target_file || 'missing'}, matches ${ownerUnlockSessionApplyGuardSummary.matches_preview ? 'yes' : 'no'}, private diagnostic ${ownerUnlockSessionApplyGuardSummary.private_diagnostic_allowed_after_apply ? 'yes' : 'no'}, failures ${ownerUnlockSessionApplyGuardCheckSummary.failures ?? 0}`
        : 'missing session apply guard',
      owner_action_required: true,
      route_hint: 'Proves the manual session edit matches the reviewed preview before activation',
      source_ref: refs.ownerUnlockSessionApplyGuard
    },
    {
      id: 'owner-unlock-session-apply-guard-smoke',
      title: 'Owner Unlock Session Apply Guard Smoke',
      status: reports.ownerUnlockSessionApplyGuardSmoke?.status === 'owner_unlock_session_apply_guard_smoke_passed' &&
        reports.ownerUnlockSessionApplyGuardSmokeCheck?.status === 'owner_unlock_session_apply_guard_smoke_check_passed'
        ? 'review_only_ready'
        : 'needs_review',
      signal: reports.ownerUnlockSessionApplyGuardSmoke?.status
        ? `${ownerUnlockSessionApplyGuardSmokeSummary.fixture_mode || 'missing'}, matches ${ownerUnlockSessionApplyGuardSmokeSummary.fixture_matches_preview ? 'yes' : 'no'}, private diagnostic ${ownerUnlockSessionApplyGuardSmokeSummary.fixture_private_diagnostic_allowed_after_apply ? 'yes' : 'no'}, checks ${ownerUnlockSessionApplyGuardSmokeSummary.guard_checks_passed ?? 0}/${ownerUnlockSessionApplyGuardSmokeSummary.guard_checks ?? 0}, failures ${ownerUnlockSessionApplyGuardSmokeCheckSummary.failures ?? 0}`
        : 'missing session apply guard smoke',
      owner_action_required: false,
      route_hint: 'Fixture-only proof that the apply guard passes after the reviewed session edit',
      source_ref: refs.ownerUnlockSessionApplyGuardSmoke
    },
    {
      id: 'source-root-activation',
      title: 'Source Root Activation',
      status: activationSummary.activation_ready === true
        ? 'ready'
        : reports.sourceRootActivation?.status === 'source_root_activation_needs_contract_review'
          ? 'needs_review'
          : 'blocked',
      signal: activationSummary.activation_ready === true
        ? `activation ready for ${activationSummary.selected_root_path}`
        : `${reports.sourceRootActivation?.status || 'missing'}, safe commands ${activationSummary.safe_command_count ?? 0}, blocked ${activationSummary.blocked_command_count ?? 0}`,
      owner_action_required: activationSummary.activation_ready !== true,
      route_hint: 'Post-source-root safe activation sequence',
      source_ref: refs.sourceRootActivation
    },
    {
      id: 'local-models',
      title: 'Local Models',
      status: reports.localModelInventory?.status === 'local_model_inventory_ready_review_only' ? 'review_only_ready' : 'needs_review',
      signal: `${modelSummary.ready_roles ?? 0}/${modelSummary.required_roles ?? 0} roles, ${modelSummary.ollama_model_count ?? 0} Ollama models, ${modelSummary.total_visible_ollama_size_gb ?? 0} GB`,
      owner_action_required: false,
      route_hint: 'Ollama/Odysseus local worker readiness',
      source_ref: refs.localModelInventory
    },
    {
      id: 'local-worker-http-runner',
      title: 'Local Worker HTTP Runner',
      status: ['local_worker_http_runner_dry_run_ready', 'local_worker_http_runner_executed_review_only'].includes(localWorkerHttpRunner.status) &&
        localWorkerHttpRunnerCheck.status === 'local_worker_http_runner_guard_passed'
        ? 'review_only_ready'
        : 'needs_review',
      signal: localWorkerHttpRunner.status
        ? `${localWorkerHttpRunner.status}, check ${localWorkerHttpRunnerCheck.status || 'missing'}, safe inputs ${localWorkerHttpRunnerGuard.safe_inputs?.length ?? 0}`
        : 'missing runner report',
      owner_action_required: false,
      route_hint: 'Guarded HTTP/JSON bridge for local LLM task execution',
      source_ref: refs.localWorkerHttpRunner
    },
    {
      id: 'local-worker-execution-runbook',
      title: 'Local Worker Execution Runbook',
      status: ['local_worker_execution_runbook_idle_review_only', 'local_worker_execution_runbook_has_executable_tasks'].includes(localWorkerExecutionRunbook.status) &&
        localWorkerExecutionRunbookCheck.status === 'local_worker_execution_runbook_guard_passed'
        ? 'review_only_ready'
        : 'needs_review',
      signal: localWorkerExecutionRunbook.status
        ? `${localWorkerExecutionRunbook.status}, check ${localWorkerExecutionRunbookCheck.status || 'missing'}, executable now ${localWorkerExecutionRunbookSummary.execute_allowed_if_output_missing ?? 0}`
        : 'missing execution runbook',
      owner_action_required: false,
      route_hint: 'Safe command map for local worker task execution',
      source_ref: refs.localWorkerExecutionRunbook
    },
    {
      id: 'local-worker-output-contracts',
      title: 'Local Worker Output Contracts',
      status: reports.localWorkerOutputContractReview?.status === 'local_worker_output_contract_review_ready' &&
        reports.localWorkerOutputContractReviewCheck?.status === 'local_worker_output_contract_review_guard_passed'
        ? 'review_only_ready'
        : 'needs_review',
      signal: `${localWorkerOutputContractSummary.contracts ?? 0} contracts, present ${localWorkerOutputContractSummary.present_valid_outputs ?? 0}, repo ${localWorkerOutputContractSummary.repo_conversion_allowed_now ?? 0}, execute ${localWorkerOutputContractSummary.execute_allowed_now ?? 0}, failures ${localWorkerOutputContractCheckSummary.failures ?? 0}`,
      owner_action_required: false,
      route_hint: 'Review local worker output contracts without reading private output bodies',
      source_ref: refs.localWorkerOutputContractReview
    },
    {
      id: 'source-independent-work-queue',
      title: 'Source-Independent Work Queue',
      status: reports.sourceIndependentWorkQueue?.status === 'source_independent_work_queue_ready'
        ? 'review_only_ready'
        : 'needs_review',
      signal: reports.sourceIndependentWorkQueue?.status
        ? `${sourceIndependentWorkQueueSummary.tasks ?? 0} tasks, completed ${sourceIndependentWorkQueueSummary.completed_review_only ?? 0}, codex ${sourceIndependentWorkQueueSummary.codex_executable_now ?? 0}, owner ${sourceIndependentWorkQueueSummary.owner_actions ?? 0}, failures ${sourceIndependentWorkQueueSummary.failures ?? 0}`
        : 'missing source-independent work queue',
      owner_action_required: (sourceIndependentWorkQueueSummary.owner_actions ?? 0) > 0,
      route_hint: 'Safe work that does not require private source-root activation',
      source_ref: refs.sourceIndependentWorkQueue
    },
    {
      id: 'private-metadata-inventory',
      title: 'Private Metadata Inventory',
      status: reports.privateMetadataInventory?.status === 'private_metadata_inventory_ready_private_output_written'
        ? 'review_only_ready'
        : reports.privateMetadataInventory?.status === 'private_metadata_inventory_blocked_until_activation'
          ? reports.privateMetadataInventoryFixture?.status === 'private_metadata_inventory_fixture_passed' &&
            reports.privateMetadataInventoryCheck?.status === 'private_metadata_inventory_guard_passed'
            ? 'blocked_with_smoke_passed'
            : 'blocked'
          : 'needs_review',
      signal: reports.privateMetadataInventory?.status === 'private_metadata_inventory_blocked_until_activation'
        ? `blocked until source-root activation; fixture ${privateInventoryFixtureSummary.total_candidate_matches ?? 0} matches; guard ${reports.privateMetadataInventoryCheck?.status || 'missing'}`
        : `${privateInventorySummary.total_candidate_matches ?? 0} candidates, scanned ${privateInventorySummary.files_scanned ?? 0} files`,
      owner_action_required: reports.privateMetadataInventory?.status === 'private_metadata_inventory_blocked_until_activation',
      route_hint: 'Pilot-scoped metadata-only inventory',
      source_ref: refs.privateMetadataInventory
    },
    {
      id: 'pilot-references',
      title: 'Pilot References',
      status: reports.sweep?.status === 'kosmodata_lane_sweep_review_only_passed' ? 'review_only' : 'needs_review',
      signal: `${sweepSummary.pilot_evidence_pilots ?? 0} pilots, ${sweepSummary.pilot_evidence_total_gaps ?? 0} evidence gaps`,
      owner_action_required: (sweepSummary.human_queue_open_items ?? 0) > 0,
      route_hint: 'Villa Savoye / Sogn Benedetg / Ingenbohl',
      source_ref: refs.sweep
    },
    {
      id: 'pilot-gap-labels',
      title: 'Pilot Gap Labels',
      status: reports.pilotGapLabelReview?.status === 'pilot_gap_label_review_ready' &&
        reports.pilotGapLabelReviewCheck?.status === 'pilot_gap_label_review_guard_passed'
        ? 'review_only_ready'
        : 'needs_review',
      signal: `${pilotGapLabelSummary.gap_labels ?? 0} labels, ${pilotGapLabelSummary.hard_blockers ?? 0} hard blockers, owner ${pilotGapLabelSummary.owner_decisions_required ?? 0}, failures ${pilotGapLabelCheckSummary.failures ?? 0}`,
      owner_action_required: (pilotGapLabelSummary.owner_decisions_required ?? 0) > 0,
      route_hint: 'Review-only pilot gap labels and worker routing',
      source_ref: refs.pilotGapLabelReview
    },
    {
      id: 'kosmoasset',
      title: 'KosmoAsset',
      status: sweepSummary.asset_promotion_allowed === true ? 'ready' : 'review_only',
      signal: `${sweepSummary.asset_open_human_reviews ?? 0} human reviews open, public-ready ${sweepSummary.asset_public_ready_count ?? 0}`,
      owner_action_required: (sweepSummary.asset_open_human_reviews ?? 0) > 0,
      route_hint: 'Review-only seed asset lane',
      source_ref: refs.sweep
    },
    {
      id: 'asset-reference-bridge',
      title: 'Asset Reference Bridge',
      status: reports.assetBridge?.status === 'kosmoasset_reference_bridge_review_only_passed' ? 'review_only_ready' : 'needs_review',
      signal: `${assetBridgeSummary.complete_pilot_bridges ?? 0}/${assetBridgeSummary.pilots ?? 0} pilot bridges, ${assetBridgeSummary.asset_count ?? 0} assets, public-ready ${assetBridgeSummary.public_ready_count ?? 0}`,
      owner_action_required: (assetBridgeSummary.open_human_review_count ?? 0) > 0,
      route_hint: 'Villa/Sogn/Ingenbohl asset derivation gate',
      source_ref: refs.assetBridge
    },
    {
      id: 'asset-source-candidates',
      title: 'Asset Source Candidates',
      status: reports.assetSourceCandidateMap?.status === 'kosmoasset_source_candidate_map_review_only_ready' ? 'review_only_ready' : 'needs_review',
      signal: `${assetSourceCandidateSummary.asset_lane_candidates ?? 0} asset-lane candidates, material ${assetSourceCandidateSummary.material_library_candidates ?? 0}, public-ready ${assetSourceCandidateSummary.public_ready_after_map ?? 0}`,
      owner_action_required: (assetSourceCandidateSummary.asset_lane_candidates ?? 0) > 0,
      route_hint: 'Map source-root candidates into KosmoAsset lanes without ingestion',
      source_ref: refs.assetSourceCandidateMap
    },
    {
      id: 'asset-candidate-taxonomy',
      title: 'Asset Candidate Taxonomy',
      status: reports.assetCandidateTaxonomyReview?.status === 'kosmoasset_candidate_taxonomy_review_ready' &&
        reports.assetCandidateTaxonomyReviewCheck?.status === 'kosmoasset_candidate_taxonomy_review_guard_passed'
        ? 'review_only_ready'
        : 'needs_review',
      signal: `${assetCandidateTaxonomySummary.candidate_reviews ?? 0} reviews, ${assetCandidateTaxonomySummary.reviewable_asset_lanes ?? 0} reviewable, owner ${assetCandidateTaxonomySummary.owner_confirmations_required ?? 0}, failures ${assetCandidateTaxonomyCheckSummary.failures ?? 0}`,
      owner_action_required: (assetCandidateTaxonomySummary.owner_confirmations_required ?? 0) > 0,
      route_hint: 'Review-only KosmoAsset lane contract without paths or ingestion',
      source_ref: refs.assetCandidateTaxonomyReview
    },
    {
      id: 'prepare-references-asset-fixture-chain',
      title: 'Prepare References Asset Fixture Chain',
      status: reports.preparePhase1SourcePackageContractCheck?.status === 'prepare_phase1_source_package_contract_guard_passed' &&
        reports.assetPreparePhase1FixtureContractCheck?.status === 'kosmoasset_prepare_phase1_fixture_contract_guard_passed'
        ? 'review_only_ready'
        : 'needs_review',
      signal: `source package ${preparePhase1SourcePackageSummary.package_id || 'missing'}, fixture assets ${assetPreparePhase1FixtureSummary.assets ?? '-'}, public-ready ${assetPreparePhase1FixtureSummary.public_ready_after_check ?? 0}`,
      owner_action_required: false,
      route_hint: 'Source-free KosmoPrepare -> KosmoReferences -> KosmoAsset fixture chain',
      source_ref: refs.assetPreparePhase1FixtureContractCheck
    },
    {
      id: 'fixture-chain-local-worker-task-pack',
      title: 'Fixture Chain Local Worker Task Pack',
      status: reports.localWorkerFixtureChainTaskPack?.status === 'local_worker_fixture_chain_task_pack_ready' &&
        reports.localWorkerFixtureChainTaskPackCheck?.status === 'local_worker_fixture_chain_task_pack_guard_passed'
        ? 'review_only_ready'
        : 'needs_review',
      signal: `${localWorkerFixtureChainTaskPackSummary.tasks ?? 0} tasks, GitHub ${localWorkerFixtureChainTaskPackSummary.github_innovation_tasks ?? 0}, payloads ${localWorkerFixtureChainTaskPackSummary.github_payload_refs ?? 0}, training ${localWorkerFixtureChainTaskPackSummary.training_lanes ?? 0}, executable now ${localWorkerFixtureChainTaskPackSummary.executable_now ?? '-'}, missing refs ${localWorkerFixtureChainTaskPackSummary.missing_refs ?? '-'}`,
      owner_action_required: false,
      route_hint: 'Fixture-only local LLM task pack with matrix-gated GitHub innovation tasks; not executed by Orbit',
      source_ref: refs.localWorkerFixtureChainTaskPackCheck
    },
    {
      id: 'local-worker-innovation-output-smoke',
      title: 'Local Worker Innovation Output Smoke',
      status: reports.localWorkerInnovationOutputSmoke?.status === 'local_worker_innovation_output_smoke_ready' &&
        reports.localWorkerInnovationOutputSmokeCheck?.status === 'local_worker_innovation_output_smoke_guard_passed'
        ? 'review_only_ready'
        : 'needs_review',
      signal: `${localWorkerInnovationOutputSmokeSummary.expected_outputs ?? 0} expected outputs, training ${localWorkerInnovationOutputSmokeSummary.training_lanes ?? 0}, ontology ${localWorkerInnovationOutputSmokeSummary.ontology_bound_outputs ?? 0}, executable ${localWorkerInnovationOutputSmokeSummary.executable_now ?? 0}, failures ${localWorkerInnovationOutputSmokeCheckSummary.failures ?? 0}`,
      owner_action_required: false,
      route_hint: 'Expected output contract for later local-worker fixture runs; no worker execution',
      source_ref: refs.localWorkerInnovationOutputSmokeCheck
    },
    {
      id: 'local-worker-innovation-output-adapter-plan',
      title: 'Local Worker Innovation Output Adapter Plan',
      status: reports.localWorkerInnovationOutputAdapterPlan?.status === 'local_worker_innovation_output_adapter_plan_ready' &&
        reports.localWorkerInnovationOutputAdapterPlanCheck?.status === 'local_worker_innovation_output_adapter_plan_guard_passed'
        ? 'review_only_ready'
        : 'needs_review',
      signal: `${localWorkerInnovationOutputAdapterPlanSummary.adapters ?? 0} adapters, metadata ${localWorkerInnovationOutputAdapterPlanSummary.metadata_capture_fields ?? 0}, body copy ${localWorkerInnovationOutputAdapterPlanSummary.body_copy_allowed === false ? 'no' : 'review'}, failures ${localWorkerInnovationOutputAdapterPlanCheckSummary.failures ?? 0}`,
      owner_action_required: false,
      route_hint: 'Metadata-only adapter plan for later local-worker output validation; no body copy',
      source_ref: refs.localWorkerInnovationOutputAdapterPlanCheck
    },
    {
      id: 'local-worker-innovation-output-validator',
      title: 'Local Worker Innovation Output Validator',
      status: [
        'local_worker_innovation_output_validator_waiting_for_outputs',
        'local_worker_innovation_output_validator_passed'
      ].includes(reports.localWorkerInnovationOutputValidator?.status) &&
        reports.localWorkerInnovationOutputValidatorCheck?.status === 'local_worker_innovation_output_validator_guard_passed'
        ? 'review_only_ready'
        : 'needs_review',
      signal: `${localWorkerInnovationOutputValidatorSummary.present_outputs ?? 0}/${localWorkerInnovationOutputValidatorSummary.expected_outputs ?? 0} present, missing ${localWorkerInnovationOutputValidatorSummary.missing_outputs ?? 0}, parsed ${localWorkerInnovationOutputValidatorSummary.parsed_outputs ?? 0}, failures ${localWorkerInnovationOutputValidatorCheckSummary.failures ?? 0}`,
      owner_action_required: false,
      route_hint: 'Metadata-only validator for future local-worker outputs; waiting is acceptable until outputs exist',
      source_ref: refs.localWorkerInnovationOutputValidatorCheck
    },
    {
      id: 'local-worker-innovation-output-validator-fixtures',
      title: 'Local Worker Innovation Output Validator Fixtures',
      status: reports.localWorkerInnovationOutputValidatorFixtures?.status === 'local_worker_innovation_output_validator_fixtures_passed' &&
        reports.localWorkerInnovationOutputValidatorFixturesCheck?.status === 'local_worker_innovation_output_validator_fixtures_guard_passed'
        ? 'review_only_ready'
        : 'needs_review',
      signal: `positive ${localWorkerInnovationOutputValidatorFixturesSummary.positive_validator_status || '-'}, negative ${localWorkerInnovationOutputValidatorFixturesSummary.negative_validator_status || '-'}, failures ${localWorkerInnovationOutputValidatorFixturesCheckSummary.failures ?? 0}`,
      owner_action_required: false,
      route_hint: 'Synthetic positive/negative regression fixtures for validator behavior; no real worker execution',
      source_ref: refs.localWorkerInnovationOutputValidatorFixturesCheck
    },
    {
      id: 'local-worker-innovation-launch-dry-run',
      title: 'Local Worker Innovation Launch Dry Run',
      status: reports.localWorkerInnovationLaunchDryRun?.status === 'local_worker_innovation_launch_dry_run_ready' &&
        reports.localWorkerInnovationLaunchDryRunCheck?.status === 'local_worker_innovation_launch_dry_run_guard_passed'
        ? 'review_only_ready'
        : 'needs_review',
      signal: `${localWorkerInnovationLaunchDryRunSummary.dry_run_ready_tasks ?? 0}/${localWorkerInnovationLaunchDryRunSummary.tasks ?? 0} dry-run ready, execute ${localWorkerInnovationLaunchDryRunSummary.execute_now ?? 0}, gates ${localWorkerInnovationLaunchDryRunSummary.explicit_gate_required ?? 0}, failures ${localWorkerInnovationLaunchDryRunCheckSummary.failures ?? 0}`,
      owner_action_required: false,
      route_hint: 'Launch path prepared as dry-run only; explicit overseer gate required before any local worker execution',
      source_ref: refs.localWorkerInnovationLaunchDryRunCheck
    },
    {
      id: 'local-worker-innovation-launch-owner-card',
      title: 'Local Worker Innovation Launch Owner Card',
      status: reports.localWorkerInnovationLaunchOwnerCard?.status === 'local_worker_innovation_launch_owner_card_ready' &&
        reports.localWorkerInnovationLaunchOwnerCardCheck?.status === 'local_worker_innovation_launch_owner_card_guard_passed'
        ? 'review_only_ready'
        : 'needs_review',
      signal: `${localWorkerInnovationLaunchOwnerCardSummary.tasks ?? 0} tasks, recommended ${localWorkerInnovationLaunchOwnerCardSummary.recommended_choice || '-'}, execute ${localWorkerInnovationLaunchOwnerCardSummary.execute_now ?? 0}, failures ${localWorkerInnovationLaunchOwnerCardCheckSummary.failures ?? 0}`,
      owner_action_required: false,
      route_hint: 'Owner/overseer decision card for later source-free local-worker launch; recommends hold',
      source_ref: refs.localWorkerInnovationLaunchOwnerCardCheck
    },
    {
      id: 'local-worker-innovation-launch-apply-guard',
      title: 'Local Worker Innovation Launch Apply Guard',
      status: [
        'local_worker_innovation_launch_apply_guard_waiting_for_exact_reply',
        'local_worker_innovation_launch_apply_guard_ready_for_separate_dry_run_batch',
        'local_worker_innovation_launch_apply_guard_blocked_by_reply'
      ].includes(reports.localWorkerInnovationLaunchApplyGuard?.status) &&
        reports.localWorkerInnovationLaunchApplyGuardCheck?.status === 'local_worker_innovation_launch_apply_guard_guard_passed'
        ? 'review_only_ready'
        : 'needs_review',
      signal: `answer ${localWorkerInnovationLaunchApplyGuardSummary.answer_present ? 'present' : 'missing'}, exact ${localWorkerInnovationLaunchApplyGuardSummary.exact_reply_valid ? 'yes' : 'no'}, separate ${localWorkerInnovationLaunchApplyGuardSummary.separate_launch_allowed_after_guard ? 'yes' : 'no'}, execute ${localWorkerInnovationLaunchApplyGuardSummary.execute_now ?? 0}, failures ${localWorkerInnovationLaunchApplyGuardCheckSummary.failures ?? 0}`,
      owner_action_required: false,
      route_hint: 'Exact-reply guard for later source-free local-worker launch; validates only and never starts workers',
      source_ref: refs.localWorkerInnovationLaunchApplyGuardCheck
    },
    {
      id: 'local-worker-innovation-launch-apply-guard-smoke',
      title: 'Local Worker Innovation Launch Apply Guard Smoke',
      status: reports.localWorkerInnovationLaunchApplyGuardSmoke?.status === 'local_worker_innovation_launch_apply_guard_smoke_passed' &&
        reports.localWorkerInnovationLaunchApplyGuardSmokeCheck?.status === 'local_worker_innovation_launch_apply_guard_smoke_guard_passed'
        ? 'review_only_ready'
        : 'needs_review',
      signal: `${localWorkerInnovationLaunchApplyGuardSmokeSummary.passed_scenarios ?? 0}/${localWorkerInnovationLaunchApplyGuardSmokeSummary.scenarios ?? 0} scenarios, failures ${localWorkerInnovationLaunchApplyGuardSmokeCheckSummary.failures ?? 0}`,
      owner_action_required: false,
      route_hint: 'Synthetic empty/exact/broad-private regression smoke for launch apply guard',
      source_ref: refs.localWorkerInnovationLaunchApplyGuardSmokeCheck
    },
    {
      id: 'local-worker-innovation-launch-runbook-checkpoint',
      title: 'Local Worker Innovation Launch Runbook Checkpoint',
      status: [
        'local_worker_innovation_launch_runbook_checkpoint_waiting_for_exact_reply',
        'local_worker_innovation_launch_runbook_checkpoint_ready_for_separate_preflight',
        'local_worker_innovation_launch_runbook_checkpoint_blocked_by_reply'
      ].includes(reports.localWorkerInnovationLaunchRunbookCheckpoint?.status) &&
        reports.localWorkerInnovationLaunchRunbookCheckpointCheck?.status === 'local_worker_innovation_launch_runbook_checkpoint_guard_passed'
        ? 'review_only_ready'
        : 'needs_review',
      signal: `${localWorkerInnovationLaunchRunbookCheckpointSummary.launch_mode || '-'}, gates ${localWorkerInnovationLaunchRunbookCheckpointSummary.gates_passed ?? 0}/${localWorkerInnovationLaunchRunbookCheckpointSummary.gates ?? 0}, execute ${localWorkerInnovationLaunchRunbookCheckpointSummary.execute_now ?? 0}, failures ${localWorkerInnovationLaunchRunbookCheckpointCheckSummary.failures ?? 0}`,
      owner_action_required: false,
      route_hint: 'Aggregated launch preflight checkpoint; does not execute local workers',
      source_ref: refs.localWorkerInnovationLaunchRunbookCheckpointCheck
    },
    {
      id: 'local-worker-innovation-launch-execution-envelope',
      title: 'Local Worker Innovation Launch Execution Envelope',
      status: reports.localWorkerInnovationLaunchExecutionEnvelope?.status === 'local_worker_innovation_launch_execution_envelope_prepared' &&
        reports.localWorkerInnovationLaunchExecutionEnvelopeCheck?.status === 'local_worker_innovation_launch_execution_envelope_guard_passed'
        ? 'review_only_ready'
        : 'needs_review',
      signal: `${localWorkerInnovationLaunchExecutionEnvelopeSummary.mode || '-'}, slots ${localWorkerInnovationLaunchExecutionEnvelopeSummary.empty_slots ?? 0}/${localWorkerInnovationLaunchExecutionEnvelopeSummary.output_slots ?? 0}, outputs ${localWorkerInnovationLaunchExecutionEnvelopeSummary.worker_outputs_written_now ?? 0}, failures ${localWorkerInnovationLaunchExecutionEnvelopeCheckSummary.failures ?? 0}`,
      owner_action_required: false,
      route_hint: 'Empty guarded output-slot envelope for future separate local-worker launch',
      source_ref: refs.localWorkerInnovationLaunchExecutionEnvelopeCheck
    },
    {
      id: 'local-worker-innovation-post-output-intake-review',
      title: 'Local Worker Innovation Post-Output Intake Review',
      status: reports.localWorkerInnovationPostOutputIntakeReview?.status === 'local_worker_innovation_post_output_intake_review_ready' &&
        reports.localWorkerInnovationPostOutputIntakeReviewCheck?.status === 'local_worker_innovation_post_output_intake_review_guard_passed'
        ? 'review_only_ready'
        : 'needs_review',
      signal: `${localWorkerInnovationPostOutputIntakeReviewSummary.mode || '-'}, candidates ${localWorkerInnovationPostOutputIntakeReviewSummary.review_candidates ?? 0}, accepted ${localWorkerInnovationPostOutputIntakeReviewSummary.accepted_now ?? 0}, public ${localWorkerInnovationPostOutputIntakeReviewSummary.public_ready_after_intake ?? 0}, failures ${localWorkerInnovationPostOutputIntakeReviewCheckSummary.failures ?? 0}`,
      owner_action_required: false,
      route_hint: 'Review-only intake gate for future local-worker outputs; no direct repo conversion',
      source_ref: refs.localWorkerInnovationPostOutputIntakeReviewCheck
    },
    {
      id: 'local-worker-innovation-human-overseer-review-decision-card',
      title: 'Local Worker Innovation Human/Overseer Review Decision Card',
      status: reports.localWorkerInnovationHumanOverseerReviewDecisionCard?.status === 'local_worker_innovation_human_overseer_review_decision_card_ready' &&
        reports.localWorkerInnovationHumanOverseerReviewDecisionCardCheck?.status === 'local_worker_innovation_human_overseer_review_decision_card_guard_passed'
        ? 'review_only_ready'
        : 'needs_review',
      signal: `${localWorkerInnovationHumanOverseerReviewDecisionCardSummary.mode || '-'}, candidates ${localWorkerInnovationHumanOverseerReviewDecisionCardSummary.review_candidates ?? 0}, decisions ${localWorkerInnovationHumanOverseerReviewDecisionCardSummary.decisions_applied_now ?? 0}, public ${localWorkerInnovationHumanOverseerReviewDecisionCardSummary.public_ready_after_card ?? 0}, failures ${localWorkerInnovationHumanOverseerReviewDecisionCardCheckSummary.failures ?? 0}`,
      owner_action_required: false,
      route_hint: 'Decision card for future intake candidates; no apply, conversion or public-ready state',
      source_ref: refs.localWorkerInnovationHumanOverseerReviewDecisionCardCheck
    },
    {
      id: 'local-worker-innovation-conversion-plan-preview',
      title: 'Local Worker Innovation Conversion Plan Preview',
      status: reports.localWorkerInnovationConversionPlanPreview?.status === 'local_worker_innovation_conversion_plan_preview_ready' &&
        reports.localWorkerInnovationConversionPlanPreviewCheck?.status === 'local_worker_innovation_conversion_plan_preview_guard_passed'
        ? 'review_only_ready'
        : 'needs_review',
      signal: `${localWorkerInnovationConversionPlanPreviewSummary.mode || '-'}, eligible ${localWorkerInnovationConversionPlanPreviewSummary.eligible_candidates ?? 0}, conversions ${localWorkerInnovationConversionPlanPreviewSummary.conversions_executed_now ?? 0}, public ${localWorkerInnovationConversionPlanPreviewSummary.public_ready_after_preview ?? 0}, failures ${localWorkerInnovationConversionPlanPreviewCheckSummary.failures ?? 0}`,
      owner_action_required: false,
      route_hint: 'Preview-only conversion plan for future approved local-worker candidates; no repo derivatives',
      source_ref: refs.localWorkerInnovationConversionPlanPreviewCheck
    },
    {
      id: 'local-worker-innovation-conversion-apply-guard',
      title: 'Local Worker Innovation Conversion Apply Guard',
      status: reports.localWorkerInnovationConversionApplyGuard?.status === 'local_worker_innovation_conversion_apply_guard_ready' &&
        reports.localWorkerInnovationConversionApplyGuardCheck?.status === 'local_worker_innovation_conversion_apply_guard_guard_passed'
        ? 'review_only_ready'
        : 'needs_review',
      signal: `${localWorkerInnovationConversionApplyGuardSummary.mode || '-'}, eligible ${localWorkerInnovationConversionApplyGuardSummary.eligible_candidates ?? 0}, apply ${localWorkerInnovationConversionApplyGuardSummary.apply_allowed_after_guard ? 'yes' : 'no'}, conversions ${localWorkerInnovationConversionApplyGuardSummary.conversions_executed_now ?? 0}, failures ${localWorkerInnovationConversionApplyGuardCheckSummary.failures ?? 0}`,
      owner_action_required: false,
      route_hint: 'Apply guard for future conversion plan; validates exact reply and still executes nothing',
      source_ref: refs.localWorkerInnovationConversionApplyGuardCheck
    },
    {
      id: 'local-worker-innovation-conversion-evidence-ledger',
      title: 'Local Worker Innovation Conversion Evidence Ledger',
      status: reports.localWorkerInnovationConversionEvidenceLedger?.status === 'local_worker_innovation_conversion_evidence_ledger_ready' &&
        reports.localWorkerInnovationConversionEvidenceLedgerCheck?.status === 'local_worker_innovation_conversion_evidence_ledger_guard_passed'
        ? 'review_only_ready'
        : 'needs_review',
      signal: `${localWorkerInnovationConversionEvidenceLedgerSummary.mode || '-'}, entries ${localWorkerInnovationConversionEvidenceLedgerSummary.ledger_entries ?? 0}, apply ${localWorkerInnovationConversionEvidenceLedgerSummary.apply_allowed_after_ledger ? 'yes' : 'no'}, public ${localWorkerInnovationConversionEvidenceLedgerSummary.public_ready_after_ledger ?? 0}, failures ${localWorkerInnovationConversionEvidenceLedgerCheckSummary.failures ?? 0}`,
      owner_action_required: false,
      route_hint: 'Metadata-only audit ledger for local-worker conversion gates; no conversion or repo derivative',
      source_ref: refs.localWorkerInnovationConversionEvidenceLedgerCheck
    },
    {
      id: 'github-innovation-watchlist',
      title: 'GitHub Innovation Watchlist',
      status: reports.githubWatchlist?.status === 'innovation_github_watchlist_ready' &&
        reports.githubWatchlistCheck?.status === 'innovation_github_watchlist_guard_passed'
        ? 'review_only_ready'
        : 'needs_review',
      signal: `${githubWatchlistSummary.candidates ?? 0} seeded repos, live ${githubWatchlistSummary.live_probe_succeeded ?? '-'}, fallback ${githubWatchlistSummary.live_probe_fallback ?? '-'}, failures ${githubWatchlistCheckSummary.failures ?? 0}`,
      owner_action_required: false,
      route_hint: 'Seeded live GitHub metadata probe; no install/download',
      source_ref: refs.githubWatchlist
    },
    {
      id: 'github-innovation-discovery',
      title: 'GitHub Innovation Discovery',
      status: reports.githubDiscovery?.status === 'innovation_github_discovery_ready' &&
        reports.githubDiscoveryCheck?.status === 'innovation_github_discovery_guard_passed'
        ? 'review_only_ready'
        : 'needs_review',
      signal: `${githubDiscoverySummary.queries_with_results ?? 0}/${githubDiscoverySummary.queries ?? 0} queries with results, ${githubDiscoverySummary.unique_candidates ?? 0} candidates, failures ${githubDiscoveryCheckSummary.failures ?? 0}`,
      owner_action_required: false,
      route_hint: 'Query-based public GitHub discovery; review queue only',
      source_ref: refs.githubDiscovery
    },
    {
      id: 'github-innovation-review-queue',
      title: 'GitHub Innovation Review Queue',
      status: reports.githubReviewQueue?.status === 'innovation_github_review_queue_ready' &&
        reports.githubReviewQueueCheck?.status === 'innovation_github_review_queue_guard_passed'
        ? 'review_only_ready'
        : 'needs_review',
      signal: `${githubReviewQueueSummary.review_items ?? 0} review items, high ${githubReviewQueueSummary.high_priority_items ?? '-'}, execute ${githubReviewQueueSummary.execute_now ?? 0}, failures ${githubReviewQueueCheckSummary.failures ?? 0}`,
      owner_action_required: false,
      route_hint: 'Prioritized public README/metadata review only; no clone/install/run',
      source_ref: refs.githubReviewQueue
    },
    {
      id: 'codex-morning-routine-run',
      title: 'Codex Morning Routine Run',
      status: reports.codexMorningRoutineRun?.status === 'codex_morning_routine_run_ready' &&
        reports.codexMorningRoutineRunCheck?.status === 'codex_morning_routine_run_guard_passed'
        ? 'review_only_ready'
        : 'needs_review',
      signal: reports.codexMorningRoutineRun?.status
        ? `fetch ${codexMorningRoutineRunSummary.fetch_succeeded ?? 0}/${codexMorningRoutineRunSummary.repos_checked ?? 0}, behind ${codexMorningRoutineRunSummary.remote_behind_total ?? '-'}, handoff ${codexMorningRoutineRunSummary.latest_mirrored_handoff ?? '-'}, next ${codexMorningRoutineRunSummary.next_batch_mode || 'missing'}, failures ${codexMorningRoutineRunCheckSummary.failures ?? 0}`
        : 'missing morning routine run',
      owner_action_required: false,
      route_hint: 'Guarded morning execution evidence: git fetch, handoff mirror, Source Root gate, next-batch route',
      source_ref: refs.codexMorningRoutineRun
    },
    {
      id: 'today-loop-plan',
      title: 'Today Loop Plan',
      status: reports.todayLoopPlan?.status === 'today_loop_plan_ready' &&
        reports.todayLoopPlanCheck?.status === 'today_loop_plan_guard_passed'
        ? 'ready'
        : 'needs_review',
      signal: `${todayLoopPlanSummary.execution_mode || '-'}, blocks ${reports.todayLoopPlan?.work_blocks?.length ?? 0}, tick ${reports.todayLoopPlan?.loop?.tick_max_minutes ?? '-'}m, checkup ${reports.todayLoopPlan?.loop?.checkup_interval_minutes ?? '-'}m, failures ${todayLoopPlanCheckSummary.failures ?? 0}`,
      owner_action_required: false,
      route_hint: 'Current-day autonomous loop plan until 18:00 local; source-free unless exact owner unlock appears',
      source_ref: refs.todayLoopPlan
    },
    {
      id: 'github-readme-signal-scan',
      title: 'GitHub README Signal Scan',
      status: reports.githubReadmeSignalScan?.status === 'innovation_github_readme_signal_scan_ready' &&
        reports.githubReadmeSignalScanCheck?.status === 'innovation_github_readme_signal_scan_guard_passed'
        ? 'review_only_ready'
        : 'needs_review',
      signal: `${githubReadmeSignalScanSummary.scanned_items ?? 0} scanned, README ${githubReadmeSignalScanSummary.readme_available ?? '-'}, high-signal ${githubReadmeSignalScanSummary.high_signal_items ?? '-'}, failures ${githubReadmeSignalScanCheckSummary.failures ?? 0}`,
      owner_action_required: false,
      route_hint: 'Derived README signal scan only; no raw content stored',
      source_ref: refs.githubReadmeSignalScan
    },
    {
      id: 'github-fixture-contract-plan',
      title: 'GitHub Fixture Contract Plan',
      status: reports.githubFixtureContractPlan?.status === 'innovation_github_fixture_contract_plan_ready' &&
        reports.githubFixtureContractPlanCheck?.status === 'innovation_github_fixture_contract_plan_guard_passed'
        ? 'review_only_ready'
        : 'needs_review',
      signal: `${githubFixtureContractPlanSummary.contract_plans ?? 0} plans, prepare ${githubFixtureContractPlanSummary.kosmo_prepare_plans ?? '-'}, asset ${githubFixtureContractPlanSummary.kosmo_asset_plans ?? '-'}, worker ${githubFixtureContractPlanSummary.worker_integration_plans ?? '-'}, failures ${githubFixtureContractPlanCheckSummary.failures ?? 0}`,
      owner_action_required: false,
      route_hint: 'Source-free synthetic fixture contract plan; no GitHub code copied',
      source_ref: refs.githubFixtureContractPlan
    },
    {
      id: 'github-promotion-matrix',
      title: 'GitHub Promotion Matrix',
      status: reports.githubPromotionMatrix?.status === 'innovation_github_promotion_matrix_ready' &&
        reports.githubPromotionMatrixCheck?.status === 'innovation_github_promotion_matrix_guard_passed'
        ? 'review_only_ready'
        : 'needs_review',
      signal: reports.githubPromotionMatrix?.status
        ? `${githubPromotionMatrixSummary.promotable_source_free ?? 0} promotable, held ${githubPromotionMatrixSummary.held_items ?? 0}, lanes ${githubPromotionMatrixSummary.target_lanes ?? 0}, training ${githubPromotionMatrixSummary.training_lanes_linked ?? 0}, failures ${githubPromotionMatrixCheckSummary.failures ?? 0}`
        : 'missing GitHub promotion matrix',
      owner_action_required: false,
      route_hint: 'Source-free promotion decisions from public GitHub signals into fixture/training/ontology lanes',
      source_ref: refs.githubPromotionMatrix
    },
    {
      id: 'github-fixture-skeletons',
      title: 'GitHub Fixture Skeletons',
      status: reports.githubFixtureSkeletons?.status === 'innovation_github_fixture_skeletons_ready' &&
        reports.githubFixtureSkeletonsCheck?.status === 'innovation_github_fixture_skeletons_guard_passed'
        ? 'review_only_ready'
        : 'needs_review',
      signal: `${githubFixtureSkeletonsSummary.directories ?? 0} directories, ${githubFixtureSkeletonsSummary.files_written ?? 0} files, matrix ${githubFixtureSkeletonsSummary.matrix_promotable ?? '-'}, executable ${githubFixtureSkeletonsSummary.executable_now ?? 0}, failures ${githubFixtureSkeletonsCheckSummary.failures ?? 0}`,
      owner_action_required: false,
      route_hint: 'Synthetic GitHub-signal fixture skeletons; no clone/install/run',
      source_ref: refs.githubFixtureSkeletons
    },
    {
      id: 'github-fixture-payloads',
      title: 'GitHub Fixture Payloads',
      status: reports.githubFixturePayloads?.status === 'innovation_github_fixture_payloads_ready' &&
        reports.githubFixturePayloadsCheck?.status === 'innovation_github_fixture_payloads_guard_passed'
        ? 'review_only_ready'
        : 'needs_review',
      signal: `${githubFixturePayloadsSummary.manifests ?? 0} manifests, ${githubFixturePayloadsSummary.payloads_written ?? 0} payloads, executable ${githubFixturePayloadsSummary.executable_now ?? 0}, failures ${githubFixturePayloadsCheckSummary.failures ?? 0}`,
      owner_action_required: false,
      route_hint: 'Synthetic JSON payloads only; no copied GitHub or private content',
      source_ref: refs.githubFixturePayloads
    },
    {
      id: 'github-fixture-payload-smoke',
      title: 'GitHub Fixture Payload Smoke',
      status: reports.githubFixturePayloadSmoke?.status === 'innovation_github_fixture_payload_smoke_passed' &&
        reports.githubFixturePayloadSmokeCheck?.status === 'innovation_github_fixture_payload_smoke_guard_passed'
        ? 'review_only_ready'
        : 'needs_review',
      signal: `${githubFixturePayloadSmokeSummary.payloads ?? 0} payloads, lanes ${githubFixturePayloadSmokeSummary.lanes ?? 0}/${githubFixturePayloadSmokeSummary.required_lanes ?? 0}, training ${githubFixturePayloadSmokeSummary.training_lanes ?? '-'}, content ${githubFixturePayloadSmokeSummary.content_types ?? 0}/${githubFixturePayloadSmokeSummary.required_content_types ?? 0}, failures ${githubFixturePayloadSmokeCheckSummary.failures ?? 0}`,
      owner_action_required: false,
      route_hint: 'Lane-specific fixture shape smoke for Prepare/Asset/Worker Integration',
      source_ref: refs.githubFixturePayloadSmoke
    },
    {
      id: 'github-worker-integration-signal-bridge',
      title: 'GitHub Worker Integration Signal Bridge',
      status: reports.githubWorkerIntegrationSignalBridge?.status === 'innovation_github_worker_integration_signal_bridge_ready' &&
        reports.githubWorkerIntegrationSignalBridgeCheck?.status === 'innovation_github_worker_integration_signal_bridge_guard_passed'
        ? 'review_only_ready'
        : 'needs_review',
      signal: `${githubWorkerIntegrationSignalBridgeSummary.worker_integration_candidates ?? 0} candidates, top ${githubWorkerIntegrationSignalBridgeSummary.top_signal_score ?? '-'}, high ${githubWorkerIntegrationSignalBridgeSummary.high_signal_candidates ?? '-'}, executable ${githubWorkerIntegrationSignalBridgeSummary.executable_now ?? 0}, failures ${githubWorkerIntegrationSignalBridgeCheckSummary.failures ?? 0}`,
      owner_action_required: false,
      route_hint: 'BIM/RAG/IFC public GitHub signals mapped to local-worker command boundaries; no clone/install/run',
      source_ref: refs.githubWorkerIntegrationSignalBridge
    },
    {
      id: 'github-worker-adapter-boundary-contract',
      title: 'GitHub Worker Adapter Boundary Contract',
      status: reports.githubWorkerAdapterBoundaryContract?.status === 'innovation_github_worker_adapter_boundary_contract_ready' &&
        reports.githubWorkerAdapterBoundaryContractCheck?.status === 'innovation_github_worker_adapter_boundary_contract_guard_passed'
        ? 'review_only_ready'
        : 'needs_review',
      signal: `${githubWorkerAdapterBoundaryContractSummary.selected_fixture_id || '-'}, commands ${githubWorkerAdapterBoundaryContractSummary.allowed_command_shapes ?? 0}, runtime ${githubWorkerAdapterBoundaryContractSummary.runtime_enabled_now ?? 0}, public ${githubWorkerAdapterBoundaryContractSummary.public_ready_after_contract ?? 0}, failures ${githubWorkerAdapterBoundaryContractCheckSummary.failures ?? 0}`,
      owner_action_required: false,
      route_hint: 'Source-free adapter boundary contract for highest BIM/RAG worker signal; still no runtime adapter',
      source_ref: refs.githubWorkerAdapterBoundaryContract
    },
    {
      id: 'github-worker-adapter-boundary-negative-fixtures',
      title: 'GitHub Worker Adapter Boundary Negative Fixtures',
      status: reports.githubWorkerAdapterBoundaryNegativeFixtures?.status === 'innovation_github_worker_adapter_boundary_negative_fixtures_ready' &&
        reports.githubWorkerAdapterBoundaryNegativeFixturesCheck?.status === 'innovation_github_worker_adapter_boundary_negative_fixtures_guard_passed'
        ? 'review_only_ready'
        : 'needs_review',
      signal: `${githubWorkerAdapterBoundaryNegativeFixturesSummary.negative_fixtures ?? 0} negative fixtures, blocked ${githubWorkerAdapterBoundaryNegativeFixturesSummary.expected_blocked ?? 0}, categories ${githubWorkerAdapterBoundaryNegativeFixturesSummary.categories ?? 0}, runtime ${githubWorkerAdapterBoundaryNegativeFixturesSummary.runtime_executed_now ?? 0}, failures ${githubWorkerAdapterBoundaryNegativeFixturesCheckSummary.failures ?? 0}`,
      owner_action_required: false,
      route_hint: 'Synthetic negative tests for private paths, runtime commands, code/readme copy, training and public-ready false positives',
      source_ref: refs.githubWorkerAdapterBoundaryNegativeFixtures
    },
    {
      id: 'training-eval-rubric',
      title: 'Training Eval Rubric',
      status: reports.trainingEvalRubricPack?.status === 'training_eval_rubric_pack_ready' &&
        reports.trainingEvalRubricPackCheck?.status === 'training_eval_rubric_pack_guard_passed'
        ? 'review_only_ready'
        : 'needs_review',
      signal: `${trainingEvalRubricSummary.suites ?? 0} suites, ${trainingEvalRubricSummary.criteria ?? 0} criteria, eval items ${trainingEvalRubricSummary.eval_items_planned ?? 0}, failures ${trainingEvalRubricCheckSummary.failures ?? 0}`,
      owner_action_required: false,
      route_hint: 'Kosmo KI quality rubric before any private training rows exist',
      source_ref: refs.trainingEvalRubricPack
    },
    {
      id: 'training-eval-row-template',
      title: 'Training Eval Row Template',
      status: reports.trainingEvalRowTemplate?.status === 'training_eval_row_template_ready' &&
        reports.trainingEvalRowTemplateCheck?.status === 'training_eval_row_template_guard_passed'
        ? 'review_only_ready'
        : 'needs_review',
      signal: `${trainingEvalRowTemplateSummary.templates ?? 0} templates, ${trainingEvalRowTemplateSummary.required_fields ?? 0} required fields, writes rows now ${trainingEvalRowTemplateSummary.writes_eval_rows_now ?? 0}, failures ${trainingEvalRowTemplateCheckSummary.failures ?? 0}`,
      owner_action_required: false,
      route_hint: 'Source-free row schema for future reviewed eval examples',
      source_ref: refs.trainingEvalRowTemplate
    },
    {
      id: 'training-eval-review-queue',
      title: 'Training Eval Review Queue',
      status: reports.trainingEvalReviewQueuePlan?.status === 'training_eval_review_queue_plan_ready' &&
        reports.trainingEvalReviewQueuePlanCheck?.status === 'training_eval_review_queue_plan_guard_passed'
        ? 'review_only_ready'
        : 'needs_review',
      signal: `${trainingEvalReviewQueueSummary.review_lanes ?? 0} lanes, ${trainingEvalReviewQueueSummary.queue_states ?? 0} states, queue items now ${trainingEvalReviewQueueSummary.queue_items_created_now ?? 0}, failures ${trainingEvalReviewQueueCheckSummary.failures ?? 0}`,
      owner_action_required: false,
      route_hint: 'Human/overseer review queue before training data promotion',
      source_ref: refs.trainingEvalReviewQueuePlan
    },
    {
      id: 'architecture-ontology-seed',
      title: 'Architecture Ontology Seed',
      status: reports.architectureOntologySeed?.status === 'architecture_ontology_seed_ready' &&
        reports.architectureOntologySeedCheck?.status === 'architecture_ontology_seed_guard_passed'
        ? 'review_only_ready'
        : 'needs_review',
      signal: `${architectureOntologySummary.entity_types ?? 0} entities, ${architectureOntologySummary.relation_types ?? 0} relations, ${architectureOntologySummary.facet_groups ?? 0} facet groups, failures ${architectureOntologyCheckSummary.failures ?? 0}`,
      owner_action_required: false,
      route_hint: 'Architecture ontology seed for References, Assets and future Kosmo evals',
      source_ref: refs.architectureOntologySeed
    },
    {
      id: 'tomorrow-day-batch',
      title: 'Tomorrow Day Batch',
      status: reports.tomorrowDayBatch?.status === 'tomorrow_day_batch_ready' &&
        reports.tomorrowDayBatchCheck?.status === 'tomorrow_day_batch_guard_passed'
        ? 'ready'
        : 'needs_review',
      signal: `${tomorrowDayBatchSummary.execution_mode || 'missing mode'}, target ${reports.tomorrowDayBatch?.target_date || '-'}, failures ${tomorrowDayBatchCheckSummary.failures ?? 0}`,
      owner_action_required: false,
      route_hint: 'Reproducible next-day start plan with Source Root gate',
      source_ref: refs.tomorrowDayBatch
    },
    {
      id: 'worker-boundary',
      title: 'Worker Boundary',
      status: reports.workerBoundary?.status === 'worker_boundary_pack_guard_passed' ? 'locked' : 'needs_review',
      signal: `${reports.workerBoundary?.summary?.worker_count ?? 0} workers, ${reports.workerBoundary?.summary?.blocked_commands ?? 0} blocked command classes`,
      owner_action_required: false,
      route_hint: 'Local LLM / Codex / Claude task boundary',
      source_ref: refs.workerBoundary
    },
    {
      id: 'innovation',
      title: 'Innovation Lanes',
      status: reports.innovationSmoke?.status === 'innovation_smoke_passed_review_only' ? 'review_only_ready' : 'needs_review',
      signal: `${innovationSummary.passed ?? 0}/${innovationSummary.checks ?? 0} public-safe smoke checks passed`,
      owner_action_required: false,
      route_hint: 'MarkItDown / IfcOpenShell / Qwen / OCR / Paper2Poster',
      source_ref: refs.innovationSmoke
    },
    {
      id: 'owner-handoff',
      title: 'Owner Handoff',
      status: reports.ownerPacket?.status === 'owner_review_packet_guard_passed' ? 'ready' : 'needs_review',
      signal: '6 questions, no filled answers recorded',
      owner_action_required: true,
      route_hint: 'Present source-root and review packet questions',
      source_ref: refs.ownerPacket
    }
  ];
  const blockingCards = cards.filter((card) => card.status === 'blocked' || card.status.startsWith('blocked_') || card.status === 'needs_review');
  const ownerActionCards = cards.filter((card) => card.owner_action_required);

  return {
    schema_version: '0.1',
    generated_at: new Date().toISOString(),
    status: blockingCards.length === 0 ? 'orbit_bridge_all_ready_review_only' : 'orbit_bridge_ready_with_blockers',
    policy: {
      dashboard_only: true,
      records_decisions: false,
      reads_private_content: false,
      copies_private_content: false,
      writes_public_files: false,
      writes_public_manifest: false,
      public_ready_after_bridge: 0,
      note: 'This bridge is a dashboard contract for KosmoOrbit. It summarizes existing guard reports only and does not unlock private work.'
    },
    source_refs: Object.values(refs),
    summary: {
      cards: cards.length,
      blocking_cards: blockingCards.length,
      owner_action_cards: ownerActionCards.length,
      source_root_blocked: sourceSummary.private_diagnostic_allowed !== true,
      day_batch_status: reports.dayBatch?.status || null,
      source_root_decision_refresh_status: reports.sourceRootDecisionRefresh?.status || null,
      source_root_decision_refresh_changed: decisionRefreshSummary.changed === true,
      source_root_decision_refresh_options: decisionRefreshSummary.refreshed_options ?? null,
      source_root_decision_refresh_failures: decisionRefreshSummary.failures ?? null,
      source_root_candidate_integrity_status: reports.sourceRootCandidateIntegrity?.status || null,
      source_root_candidate_integrity_existing_paths: candidateIntegritySummary.existing_path_options ?? null,
      source_root_candidate_integrity_exact_roots: candidateIntegritySummary.owner_confirmable_exact_roots ?? null,
      source_root_candidate_integrity_failures: candidateIntegritySummary.failures ?? null,
      source_root_owner_action_status: reports.sourceRootOwnerAction?.status || null,
      source_root_owner_recommended_decision: ownerActionSummary.recommended_decision || null,
      source_root_owner_decision_packet_status: reports.sourceRootOwnerDecisionPacket?.status || null,
      source_root_owner_decision_packet_templates: ownerDecisionPacketSummary.decision_templates ?? null,
      source_root_owner_decision_packet_exact_roots: ownerDecisionPacketSummary.owner_confirmable_exact_roots ?? null,
      source_root_owner_decision_packet_failures: ownerDecisionPacketSummary.failures ?? null,
      source_root_owner_decision_packet_check_status: reports.sourceRootOwnerDecisionPacketCheck?.status || null,
      source_root_owner_decision_packet_check_failures: ownerDecisionPacketCheckSummary.failures ?? null,
      source_root_owner_decision_packet_check_warnings: ownerDecisionPacketCheckSummary.warnings ?? null,
      source_root_decision_dry_run_status: reports.sourceRootDecisionDryRun?.status || null,
      source_root_decision_dry_run_scenarios: decisionDryRunSummary.scenarios ?? null,
      source_root_decision_dry_run_metadata_scenarios: decisionDryRunSummary.metadata_diagnostic_scenarios ?? null,
      source_root_decision_dry_run_failures: decisionDryRunSummary.failures ?? null,
      source_root_post_owner_activation_queue_status: reports.sourceRootPostOwnerActivationQueue?.status || null,
      source_root_post_owner_activation_queue_steps: postOwnerActivationQueueSummary.queue_steps ?? null,
      source_root_post_owner_activation_queue_executable_now: postOwnerActivationQueueSummary.executable_now ?? null,
      source_root_post_owner_activation_queue_blocked_now: postOwnerActivationQueueSummary.blocked_now ?? null,
      source_root_post_owner_activation_queue_failures: postOwnerActivationQueueSummary.failures ?? null,
      source_root_post_owner_activation_queue_check_status: reports.sourceRootPostOwnerActivationQueueCheck?.status || null,
      source_root_post_owner_activation_queue_check_failures: postOwnerActivationQueueCheckSummary.failures ?? null,
      source_root_post_owner_activation_queue_check_warnings: postOwnerActivationQueueCheckSummary.warnings ?? null,
      source_root_owner_final_decision_brief_status: reports.sourceRootOwnerFinalDecisionBrief?.status || null,
      source_root_owner_final_decision_brief_options: ownerFinalDecisionBriefSummary.decision_options ?? null,
      source_root_owner_final_decision_brief_unlock_options: ownerFinalDecisionBriefSummary.unlock_options ?? null,
      source_root_owner_final_decision_brief_failures: ownerFinalDecisionBriefSummary.failures ?? null,
      source_root_owner_choice_consequence_matrix_status: reports.sourceRootOwnerChoiceConsequenceMatrix?.status || null,
      source_root_owner_choice_consequence_matrix_choices: ownerChoiceConsequenceMatrixSummary.choices ?? null,
      source_root_owner_choice_consequence_matrix_unlock_choices: ownerChoiceConsequenceMatrixSummary.unlock_choices ?? null,
      source_root_owner_choice_consequence_matrix_blocked_choices: ownerChoiceConsequenceMatrixSummary.blocked_choices ?? null,
      source_root_owner_choice_consequence_matrix_failures: ownerChoiceConsequenceMatrixSummary.failures ?? null,
      source_root_activation_status: reports.sourceRootActivation?.status || null,
      private_metadata_inventory_status: reports.privateMetadataInventory?.status || null,
      private_metadata_inventory_fixture_status: reports.privateMetadataInventoryFixture?.status || null,
      private_metadata_inventory_check_status: reports.privateMetadataInventoryCheck?.status || null,
      local_model_inventory_status: reports.localModelInventory?.status || null,
      local_worker_http_runner_status: localWorkerHttpRunner.status || null,
      local_worker_http_runner_guard_passed: localWorkerHttpRunnerGuard.passed === true,
      local_worker_http_runner_safe_inputs: localWorkerHttpRunnerGuard.safe_inputs?.length ?? null,
      local_worker_http_runner_check_status: localWorkerHttpRunnerCheck.status || null,
      local_worker_http_runner_check_failures: localWorkerHttpRunnerCheck.summary?.failures ?? null,
      local_worker_execution_runbook_status: localWorkerExecutionRunbook.status || null,
      local_worker_execution_runbook_runner_safe_tasks: localWorkerExecutionRunbookSummary.runner_safe_tasks ?? null,
      local_worker_execution_runbook_executable_now: localWorkerExecutionRunbookSummary.execute_allowed_if_output_missing ?? null,
      local_worker_execution_runbook_check_status: localWorkerExecutionRunbookCheck.status || null,
      local_worker_execution_runbook_check_failures: localWorkerExecutionRunbookCheck.summary?.failures ?? null,
      local_worker_output_contract_review_status: reports.localWorkerOutputContractReview?.status || null,
      local_worker_output_contract_review_contracts: localWorkerOutputContractSummary.contracts ?? null,
      local_worker_output_contract_review_present_valid: localWorkerOutputContractSummary.present_valid_outputs ?? null,
      local_worker_output_contract_review_repo_conversion_now: localWorkerOutputContractSummary.repo_conversion_allowed_now ?? null,
      local_worker_output_contract_review_execute_allowed_now: localWorkerOutputContractSummary.execute_allowed_now ?? null,
      local_worker_output_contract_review_check_status: reports.localWorkerOutputContractReviewCheck?.status || null,
      local_worker_output_contract_review_check_failures: localWorkerOutputContractCheckSummary.failures ?? null,
      source_independent_work_queue_status: reports.sourceIndependentWorkQueue?.status || null,
      source_independent_work_queue_tasks: sourceIndependentWorkQueueSummary.tasks ?? null,
      source_independent_work_queue_completed_review_only: sourceIndependentWorkQueueSummary.completed_review_only ?? null,
      source_independent_work_queue_codex_executable_now: sourceIndependentWorkQueueSummary.codex_executable_now ?? null,
      source_independent_work_queue_owner_actions: sourceIndependentWorkQueueSummary.owner_actions ?? null,
      source_independent_work_queue_failures: sourceIndependentWorkQueueSummary.failures ?? null,
      pilot_gap_label_review_status: reports.pilotGapLabelReview?.status || null,
      pilot_gap_label_review_labels: pilotGapLabelSummary.gap_labels ?? null,
      pilot_gap_label_review_hard_blockers: pilotGapLabelSummary.hard_blockers ?? null,
      pilot_gap_label_review_owner_decisions: pilotGapLabelSummary.owner_decisions_required ?? null,
      pilot_gap_label_review_check_status: reports.pilotGapLabelReviewCheck?.status || null,
      pilot_gap_label_review_check_failures: pilotGapLabelCheckSummary.failures ?? null,
      asset_bridge_status: reports.assetBridge?.status || null,
      asset_source_candidate_map_status: reports.assetSourceCandidateMap?.status || null,
      asset_source_candidate_map_candidates: assetSourceCandidateSummary.asset_lane_candidates ?? null,
      asset_candidate_taxonomy_review_status: reports.assetCandidateTaxonomyReview?.status || null,
      asset_candidate_taxonomy_review_candidates: assetCandidateTaxonomySummary.candidate_reviews ?? null,
      asset_candidate_taxonomy_review_reviewable_lanes: assetCandidateTaxonomySummary.reviewable_asset_lanes ?? null,
      asset_candidate_taxonomy_review_owner_confirmations: assetCandidateTaxonomySummary.owner_confirmations_required ?? null,
      asset_candidate_taxonomy_review_check_status: reports.assetCandidateTaxonomyReviewCheck?.status || null,
      asset_candidate_taxonomy_review_check_failures: assetCandidateTaxonomyCheckSummary.failures ?? null,
      prepare_phase1_source_package_contract_check_status: reports.preparePhase1SourcePackageContractCheck?.status || null,
      prepare_phase1_source_package_contract_package_id: preparePhase1SourcePackageSummary.package_id || null,
      prepare_phase1_source_package_contract_failures: preparePhase1SourcePackageSummary.failures ?? null,
      asset_prepare_phase1_fixture_contract_check_status: reports.assetPreparePhase1FixtureContractCheck?.status || null,
      asset_prepare_phase1_fixture_contract_library_id: assetPreparePhase1FixtureSummary.library_id || null,
      asset_prepare_phase1_fixture_contract_assets: assetPreparePhase1FixtureSummary.assets ?? null,
      asset_prepare_phase1_fixture_contract_failures: assetPreparePhase1FixtureSummary.failures ?? null,
      local_worker_fixture_chain_task_pack_status: reports.localWorkerFixtureChainTaskPack?.status || null,
      local_worker_fixture_chain_task_pack_tasks: localWorkerFixtureChainTaskPackSummary.tasks ?? null,
      local_worker_fixture_chain_task_pack_legacy_tasks: localWorkerFixtureChainTaskPackSummary.legacy_fixture_chain_tasks ?? null,
      local_worker_fixture_chain_task_pack_github_innovation_tasks: localWorkerFixtureChainTaskPackSummary.github_innovation_tasks ?? null,
      local_worker_fixture_chain_task_pack_github_payload_refs: localWorkerFixtureChainTaskPackSummary.github_payload_refs ?? null,
      local_worker_fixture_chain_task_pack_training_lanes: localWorkerFixtureChainTaskPackSummary.training_lanes ?? null,
      local_worker_fixture_chain_task_pack_ontology_entity_types: localWorkerFixtureChainTaskPackSummary.ontology_entity_types ?? null,
      local_worker_fixture_chain_task_pack_ontology_relation_types: localWorkerFixtureChainTaskPackSummary.ontology_relation_types ?? null,
      local_worker_fixture_chain_task_pack_executable_now: localWorkerFixtureChainTaskPackSummary.executable_now ?? null,
      local_worker_fixture_chain_task_pack_missing_refs: localWorkerFixtureChainTaskPackSummary.missing_refs ?? null,
      local_worker_fixture_chain_task_pack_check_status: reports.localWorkerFixtureChainTaskPackCheck?.status || null,
      local_worker_fixture_chain_task_pack_check_failures: localWorkerFixtureChainTaskPackCheckSummary.failures ?? null,
      local_worker_innovation_output_smoke_status: reports.localWorkerInnovationOutputSmoke?.status || null,
      local_worker_innovation_output_smoke_expected_outputs: localWorkerInnovationOutputSmokeSummary.expected_outputs ?? null,
      local_worker_innovation_output_smoke_training_lanes: localWorkerInnovationOutputSmokeSummary.training_lanes ?? null,
      local_worker_innovation_output_smoke_ontology_bound_outputs: localWorkerInnovationOutputSmokeSummary.ontology_bound_outputs ?? null,
      local_worker_innovation_output_smoke_executable_now: localWorkerInnovationOutputSmokeSummary.executable_now ?? null,
      local_worker_innovation_output_smoke_check_status: reports.localWorkerInnovationOutputSmokeCheck?.status || null,
      local_worker_innovation_output_smoke_check_failures: localWorkerInnovationOutputSmokeCheckSummary.failures ?? null,
      local_worker_innovation_output_adapter_plan_status: reports.localWorkerInnovationOutputAdapterPlan?.status || null,
      local_worker_innovation_output_adapter_plan_adapters: localWorkerInnovationOutputAdapterPlanSummary.adapters ?? null,
      local_worker_innovation_output_adapter_plan_metadata_capture_fields: localWorkerInnovationOutputAdapterPlanSummary.metadata_capture_fields ?? null,
      local_worker_innovation_output_adapter_plan_body_copy_allowed: localWorkerInnovationOutputAdapterPlanSummary.body_copy_allowed ?? null,
      local_worker_innovation_output_adapter_plan_repo_conversion_allowed_now: localWorkerInnovationOutputAdapterPlanSummary.repo_conversion_allowed_now ?? null,
      local_worker_innovation_output_adapter_plan_check_status: reports.localWorkerInnovationOutputAdapterPlanCheck?.status || null,
      local_worker_innovation_output_adapter_plan_check_failures: localWorkerInnovationOutputAdapterPlanCheckSummary.failures ?? null,
      local_worker_innovation_output_validator_status: reports.localWorkerInnovationOutputValidator?.status || null,
      local_worker_innovation_output_validator_expected_outputs: localWorkerInnovationOutputValidatorSummary.expected_outputs ?? null,
      local_worker_innovation_output_validator_present_outputs: localWorkerInnovationOutputValidatorSummary.present_outputs ?? null,
      local_worker_innovation_output_validator_missing_outputs: localWorkerInnovationOutputValidatorSummary.missing_outputs ?? null,
      local_worker_innovation_output_validator_parsed_outputs: localWorkerInnovationOutputValidatorSummary.parsed_outputs ?? null,
      local_worker_innovation_output_validator_public_ready_after_validation: localWorkerInnovationOutputValidatorSummary.public_ready_after_validation ?? null,
      local_worker_innovation_output_validator_check_status: reports.localWorkerInnovationOutputValidatorCheck?.status || null,
      local_worker_innovation_output_validator_check_failures: localWorkerInnovationOutputValidatorCheckSummary.failures ?? null,
      local_worker_innovation_output_validator_fixtures_status: reports.localWorkerInnovationOutputValidatorFixtures?.status || null,
      local_worker_innovation_output_validator_fixtures_positive_status: localWorkerInnovationOutputValidatorFixturesSummary.positive_validator_status ?? null,
      local_worker_innovation_output_validator_fixtures_negative_status: localWorkerInnovationOutputValidatorFixturesSummary.negative_validator_status ?? null,
      local_worker_innovation_output_validator_fixtures_negative_failures: localWorkerInnovationOutputValidatorFixturesSummary.negative_failures ?? null,
      local_worker_innovation_output_validator_fixtures_check_status: reports.localWorkerInnovationOutputValidatorFixturesCheck?.status || null,
      local_worker_innovation_output_validator_fixtures_check_failures: localWorkerInnovationOutputValidatorFixturesCheckSummary.failures ?? null,
      local_worker_innovation_launch_dry_run_status: reports.localWorkerInnovationLaunchDryRun?.status || null,
      local_worker_innovation_launch_dry_run_tasks: localWorkerInnovationLaunchDryRunSummary.tasks ?? null,
      local_worker_innovation_launch_dry_run_ready_tasks: localWorkerInnovationLaunchDryRunSummary.dry_run_ready_tasks ?? null,
      local_worker_innovation_launch_dry_run_execute_now: localWorkerInnovationLaunchDryRunSummary.execute_now ?? null,
      local_worker_innovation_launch_dry_run_explicit_gate_required: localWorkerInnovationLaunchDryRunSummary.explicit_gate_required ?? null,
      local_worker_innovation_launch_dry_run_check_status: reports.localWorkerInnovationLaunchDryRunCheck?.status || null,
      local_worker_innovation_launch_dry_run_check_failures: localWorkerInnovationLaunchDryRunCheckSummary.failures ?? null,
      local_worker_innovation_launch_owner_card_status: reports.localWorkerInnovationLaunchOwnerCard?.status || null,
      local_worker_innovation_launch_owner_card_tasks: localWorkerInnovationLaunchOwnerCardSummary.tasks ?? null,
      local_worker_innovation_launch_owner_card_recommended_choice: localWorkerInnovationLaunchOwnerCardSummary.recommended_choice ?? null,
      local_worker_innovation_launch_owner_card_execute_now: localWorkerInnovationLaunchOwnerCardSummary.execute_now ?? null,
      local_worker_innovation_launch_owner_card_check_status: reports.localWorkerInnovationLaunchOwnerCardCheck?.status || null,
      local_worker_innovation_launch_owner_card_check_failures: localWorkerInnovationLaunchOwnerCardCheckSummary.failures ?? null,
      github_watchlist_status: reports.githubWatchlist?.status || null,
      github_watchlist_candidates: githubWatchlistSummary.candidates ?? null,
      github_watchlist_live_probe_succeeded: githubWatchlistSummary.live_probe_succeeded ?? null,
      github_discovery_status: reports.githubDiscovery?.status || null,
      github_discovery_queries_with_results: githubDiscoverySummary.queries_with_results ?? null,
      github_discovery_unique_candidates: githubDiscoverySummary.unique_candidates ?? null,
      github_review_queue_status: reports.githubReviewQueue?.status || null,
      github_review_queue_items: githubReviewQueueSummary.review_items ?? null,
      github_review_queue_high_priority_items: githubReviewQueueSummary.high_priority_items ?? null,
      codex_morning_routine_run_status: reports.codexMorningRoutineRun?.status || null,
      codex_morning_routine_run_next_batch: codexMorningRoutineRunSummary.next_batch_mode || null,
      codex_morning_routine_run_remote_behind_total: codexMorningRoutineRunSummary.remote_behind_total ?? null,
      codex_morning_routine_run_latest_handoff: codexMorningRoutineRunSummary.latest_mirrored_handoff ?? null,
      github_readme_signal_scan_status: reports.githubReadmeSignalScan?.status || null,
      github_readme_signal_scan_items: githubReadmeSignalScanSummary.scanned_items ?? null,
      github_readme_signal_scan_high_signal_items: githubReadmeSignalScanSummary.high_signal_items ?? null,
      github_fixture_contract_plan_status: reports.githubFixtureContractPlan?.status || null,
      github_fixture_contract_plan_count: githubFixtureContractPlanSummary.contract_plans ?? null,
      github_promotion_matrix_status: reports.githubPromotionMatrix?.status || null,
      github_promotion_matrix_promotable: githubPromotionMatrixSummary.promotable_source_free ?? null,
      github_promotion_matrix_held_items: githubPromotionMatrixSummary.held_items ?? null,
      github_promotion_matrix_training_lanes: githubPromotionMatrixSummary.training_lanes_linked ?? null,
      github_fixture_skeletons_status: reports.githubFixtureSkeletons?.status || null,
      github_fixture_skeletons_directories: githubFixtureSkeletonsSummary.directories ?? null,
      github_fixture_skeletons_files: githubFixtureSkeletonsSummary.files_written ?? null,
      github_fixture_skeletons_matrix_promotable: githubFixtureSkeletonsSummary.matrix_promotable ?? null,
      github_fixture_payloads_status: reports.githubFixturePayloads?.status || null,
      github_fixture_payloads_written: githubFixturePayloadsSummary.payloads_written ?? null,
      github_fixture_payload_smoke_status: reports.githubFixturePayloadSmoke?.status || null,
      github_fixture_payload_smoke_payloads: githubFixturePayloadSmokeSummary.payloads ?? null,
      github_fixture_payload_smoke_lanes: githubFixturePayloadSmokeSummary.lanes ?? null,
      github_fixture_payload_smoke_training_lanes: githubFixturePayloadSmokeSummary.training_lanes ?? null,
      github_fixture_payload_smoke_content_types: githubFixturePayloadSmokeSummary.content_types ?? null,
      github_worker_integration_signal_bridge_status: reports.githubWorkerIntegrationSignalBridge?.status || null,
      github_worker_integration_signal_bridge_candidates: githubWorkerIntegrationSignalBridgeSummary.worker_integration_candidates ?? null,
      github_worker_integration_signal_bridge_top_signal_score: githubWorkerIntegrationSignalBridgeSummary.top_signal_score ?? null,
      github_worker_adapter_boundary_contract_status: reports.githubWorkerAdapterBoundaryContract?.status || null,
      github_worker_adapter_boundary_contract_fixture: githubWorkerAdapterBoundaryContractSummary.selected_fixture_id ?? null,
      github_worker_adapter_boundary_contract_commands: githubWorkerAdapterBoundaryContractSummary.allowed_command_shapes ?? null,
      github_worker_adapter_boundary_negative_fixtures_status: reports.githubWorkerAdapterBoundaryNegativeFixtures?.status || null,
      github_worker_adapter_boundary_negative_fixtures_count: githubWorkerAdapterBoundaryNegativeFixturesSummary.negative_fixtures ?? null,
      github_worker_adapter_boundary_negative_fixtures_blocked: githubWorkerAdapterBoundaryNegativeFixturesSummary.expected_blocked ?? null,
      training_eval_rubric_status: reports.trainingEvalRubricPack?.status || null,
      training_eval_rubric_suites: trainingEvalRubricSummary.suites ?? null,
      training_eval_rubric_criteria: trainingEvalRubricSummary.criteria ?? null,
      training_eval_row_template_status: reports.trainingEvalRowTemplate?.status || null,
      training_eval_row_template_templates: trainingEvalRowTemplateSummary.templates ?? null,
      training_eval_review_queue_status: reports.trainingEvalReviewQueuePlan?.status || null,
      training_eval_review_queue_lanes: trainingEvalReviewQueueSummary.review_lanes ?? null,
      architecture_ontology_seed_status: reports.architectureOntologySeed?.status || null,
      architecture_ontology_entity_types: architectureOntologySummary.entity_types ?? null,
      architecture_ontology_relation_types: architectureOntologySummary.relation_types ?? null,
      owner_unlock_fast_reply_card_status: reports.ownerUnlockFastReplyCard?.status || null,
      owner_unlock_fast_reply_card_broad_intent: ownerUnlockFastReplyCardSummary.broad_unlock_intent ?? null,
      owner_unlock_fast_reply_card_applies_now: ownerUnlockFastReplyCardSummary.applies_decision_now ?? null,
      owner_unlock_exact_reply_preview_status: reports.ownerUnlockExactReplyPreview?.status || null,
      owner_unlock_exact_reply_preview_validator_status: ownerUnlockExactReplyPreviewSummary.validator_status ?? null,
      owner_unlock_exact_reply_preview_patch_operations: ownerUnlockExactReplyPreviewSummary.patch_operations ?? null,
      owner_unlock_path_a_readiness_status: reports.ownerUnlockPathAReadinessCertificate?.status || null,
      owner_unlock_path_a_can_start_after_exact_reply: ownerUnlockPathAReadinessSummary.path_a_can_start_after_exact_owner_reply ?? null,
      owner_unlock_path_a_applies_now: ownerUnlockPathAReadinessSummary.applies_decision_now ?? null,
      owner_unlock_patch_review_bundle_status: reports.ownerUnlockPatchReviewBundle?.status || null,
      owner_unlock_patch_review_bundle_operations: ownerUnlockPatchReviewBundleSummary.patch_operations ?? null,
      owner_unlock_patch_review_bundle_applies_now: ownerUnlockPatchReviewBundleSummary.applies_patch_now ?? null,
      owner_unlock_intake_apply_plan_status: reports.ownerUnlockIntakeApplyPlan?.status || null,
      owner_unlock_intake_apply_plan_field_edits: ownerUnlockIntakeApplyPlanSummary.planned_field_edits ?? null,
      owner_unlock_intake_apply_plan_writes_now: ownerUnlockIntakeApplyPlanSummary.writes_intake_now ?? null,
      tomorrow_day_batch_status: reports.tomorrowDayBatch?.status || null,
      tomorrow_day_batch_target_date: reports.tomorrowDayBatch?.target_date || null,
      innovation_smoke_status: reports.innovationSmoke?.status || null,
      public_ready_after_bridge: 0
    },
    orbit_cards: cards,
    recommended_orbit_sections: [
      'status_strip',
      'local_models_card',
      'local_worker_http_runner_card',
      'local_worker_execution_runbook_card',
      'local_worker_output_contract_card',
      'source_independent_work_queue_card',
      'source_root_blocker_card',
      'source_root_decision_refresh_card',
      'source_root_candidate_integrity_card',
      'source_root_owner_action_card',
      'source_root_owner_decision_packet_card',
      'source_root_owner_decision_packet_check_card',
      'source_root_decision_dry_run_card',
      'source_root_post_owner_activation_queue_card',
      'source_root_post_owner_activation_queue_check_card',
      'source_root_owner_final_decision_brief_card',
      'source_root_owner_choice_consequence_matrix_card',
      'owner_unlock_fast_reply_card',
      'owner_unlock_exact_reply_preview_card',
      'owner_unlock_path_a_readiness_card',
      'owner_unlock_patch_review_bundle_card',
      'owner_unlock_intake_apply_plan_card',
      'source_root_activation_card',
      'private_metadata_inventory_card',
      'pilot_reference_cards',
      'pilot_gap_label_card',
      'asset_reference_bridge_card',
      'asset_source_candidate_map_card',
      'asset_candidate_taxonomy_card',
      'prepare_references_asset_fixture_chain_card',
      'fixture_chain_local_worker_task_pack_card',
      'github_innovation_watchlist_card',
      'github_innovation_discovery_card',
      'github_innovation_review_queue_card',
      'codex_morning_routine_run_card',
      'github_readme_signal_scan_card',
      'github_fixture_contract_plan_card',
      'github_promotion_matrix_card',
      'github_fixture_skeletons_card',
      'github_fixture_payloads_card',
      'github_fixture_payload_smoke_card',
      'github_worker_integration_signal_bridge_card',
      'github_worker_adapter_boundary_contract_card',
      'github_worker_adapter_boundary_negative_fixtures_card',
      'training_eval_rubric_card',
      'training_eval_row_template_card',
      'training_eval_review_queue_card',
      'architecture_ontology_seed_card',
      'tomorrow_day_batch_card',
      'worker_boundary_card',
      'innovation_lane_card',
      'owner_handoff_card'
    ],
    next_actions: [
      'KosmoOrbit can render orbit_cards as a read-only dashboard.',
      'Do not add action buttons for blocked private commands until source-root passes.',
      'Use owner_action_required cards to prepare the next owner review conversation.'
    ]
  };
}

async function readOptionalJson(path) {
  try {
    return JSON.parse(await readFile(resolve(root, path), 'utf8'));
  } catch {
    return null;
  }
}

function renderMarkdown(bridge) {
  const lines = [];
  lines.push('# Kosmo Orbit Status Bridge');
  lines.push('');
  lines.push(`Generated: ${bridge.generated_at}`);
  lines.push(`Status: \`${bridge.status}\``);
  lines.push('');
  lines.push('## Summary');
  lines.push('');
  lines.push(`- Cards: ${bridge.summary.cards}`);
  lines.push(`- Blocking cards: ${bridge.summary.blocking_cards}`);
  lines.push(`- Owner action cards: ${bridge.summary.owner_action_cards}`);
  lines.push(`- Source root blocked: ${bridge.summary.source_root_blocked ? 'yes' : 'no'}`);
  lines.push(`- Day batch: ${bridge.summary.day_batch_status}`);
  lines.push(`- Source-root decision refresh: ${bridge.summary.source_root_decision_refresh_status}, changed ${bridge.summary.source_root_decision_refresh_changed ? 'yes' : 'no'}, options ${bridge.summary.source_root_decision_refresh_options ?? '-'}, failures ${bridge.summary.source_root_decision_refresh_failures ?? '-'}`);
  lines.push(`- Source-root candidate integrity: ${bridge.summary.source_root_candidate_integrity_status}, existing ${bridge.summary.source_root_candidate_integrity_existing_paths ?? '-'}, exact roots ${bridge.summary.source_root_candidate_integrity_exact_roots ?? '-'}, failures ${bridge.summary.source_root_candidate_integrity_failures ?? '-'}`);
  lines.push(`- Source-root owner action: ${bridge.summary.source_root_owner_action_status}`);
  lines.push(`- Source-root recommended decision: ${bridge.summary.source_root_owner_recommended_decision}`);
  lines.push(`- Source-root owner decision packet: ${bridge.summary.source_root_owner_decision_packet_status}, templates ${bridge.summary.source_root_owner_decision_packet_templates ?? '-'}, exact roots ${bridge.summary.source_root_owner_decision_packet_exact_roots ?? '-'}, failures ${bridge.summary.source_root_owner_decision_packet_failures ?? '-'}`);
  lines.push(`- Source-root owner decision packet check: ${bridge.summary.source_root_owner_decision_packet_check_status}, failures ${bridge.summary.source_root_owner_decision_packet_check_failures ?? '-'}, warnings ${bridge.summary.source_root_owner_decision_packet_check_warnings ?? '-'}`);
  lines.push(`- Source-root decision dry run: ${bridge.summary.source_root_decision_dry_run_status}, scenarios ${bridge.summary.source_root_decision_dry_run_scenarios ?? '-'}, metadata scenarios ${bridge.summary.source_root_decision_dry_run_metadata_scenarios ?? '-'}, failures ${bridge.summary.source_root_decision_dry_run_failures ?? '-'}`);
  lines.push(`- Source-root post-owner activation queue: ${bridge.summary.source_root_post_owner_activation_queue_status}, steps ${bridge.summary.source_root_post_owner_activation_queue_steps ?? '-'}, executable ${bridge.summary.source_root_post_owner_activation_queue_executable_now ?? '-'}, blocked ${bridge.summary.source_root_post_owner_activation_queue_blocked_now ?? '-'}, failures ${bridge.summary.source_root_post_owner_activation_queue_failures ?? '-'}`);
  lines.push(`- Source-root post-owner activation queue check: ${bridge.summary.source_root_post_owner_activation_queue_check_status}, failures ${bridge.summary.source_root_post_owner_activation_queue_check_failures ?? '-'}, warnings ${bridge.summary.source_root_post_owner_activation_queue_check_warnings ?? '-'}`);
  lines.push(`- Source-root owner final decision brief: ${bridge.summary.source_root_owner_final_decision_brief_status}, options ${bridge.summary.source_root_owner_final_decision_brief_options ?? '-'}, unlock options ${bridge.summary.source_root_owner_final_decision_brief_unlock_options ?? '-'}, failures ${bridge.summary.source_root_owner_final_decision_brief_failures ?? '-'}`);
  lines.push(`- Source-root owner choice consequence matrix: ${bridge.summary.source_root_owner_choice_consequence_matrix_status}, choices ${bridge.summary.source_root_owner_choice_consequence_matrix_choices ?? '-'}, unlock ${bridge.summary.source_root_owner_choice_consequence_matrix_unlock_choices ?? '-'}, blocked ${bridge.summary.source_root_owner_choice_consequence_matrix_blocked_choices ?? '-'}, failures ${bridge.summary.source_root_owner_choice_consequence_matrix_failures ?? '-'}`);
  lines.push(`- Source-root activation: ${bridge.summary.source_root_activation_status}`);
  lines.push(`- Private metadata inventory: ${bridge.summary.private_metadata_inventory_status}`);
  lines.push(`- Private metadata inventory fixture: ${bridge.summary.private_metadata_inventory_fixture_status}`);
  lines.push(`- Private metadata inventory check: ${bridge.summary.private_metadata_inventory_check_status}`);
  lines.push(`- Local models: ${bridge.summary.local_model_inventory_status}`);
  lines.push(`- Local worker HTTP runner: ${bridge.summary.local_worker_http_runner_status}, check ${bridge.summary.local_worker_http_runner_check_status}, safe inputs ${bridge.summary.local_worker_http_runner_safe_inputs ?? '-'}`);
  lines.push(`- Local worker execution runbook: ${bridge.summary.local_worker_execution_runbook_status}, check ${bridge.summary.local_worker_execution_runbook_check_status}, executable now ${bridge.summary.local_worker_execution_runbook_executable_now ?? '-'}`);
  lines.push(`- Local worker output contracts: ${bridge.summary.local_worker_output_contract_review_status}, contracts ${bridge.summary.local_worker_output_contract_review_contracts ?? '-'}, present valid ${bridge.summary.local_worker_output_contract_review_present_valid ?? '-'}, repo conversion now ${bridge.summary.local_worker_output_contract_review_repo_conversion_now ?? '-'}, execute now ${bridge.summary.local_worker_output_contract_review_execute_allowed_now ?? '-'}, check ${bridge.summary.local_worker_output_contract_review_check_status}, failures ${bridge.summary.local_worker_output_contract_review_check_failures ?? '-'}`);
  lines.push(`- Source-independent work queue: ${bridge.summary.source_independent_work_queue_status}, tasks ${bridge.summary.source_independent_work_queue_tasks ?? '-'}, completed ${bridge.summary.source_independent_work_queue_completed_review_only ?? '-'}, codex executable ${bridge.summary.source_independent_work_queue_codex_executable_now ?? '-'}, owner actions ${bridge.summary.source_independent_work_queue_owner_actions ?? '-'}, failures ${bridge.summary.source_independent_work_queue_failures ?? '-'}`);
  lines.push(`- Pilot gap label review: ${bridge.summary.pilot_gap_label_review_status}, labels ${bridge.summary.pilot_gap_label_review_labels ?? '-'}, hard blockers ${bridge.summary.pilot_gap_label_review_hard_blockers ?? '-'}, owner decisions ${bridge.summary.pilot_gap_label_review_owner_decisions ?? '-'}, check ${bridge.summary.pilot_gap_label_review_check_status}, failures ${bridge.summary.pilot_gap_label_review_check_failures ?? '-'}`);
  lines.push(`- Asset bridge: ${bridge.summary.asset_bridge_status}`);
  lines.push(`- Asset source candidate map: ${bridge.summary.asset_source_candidate_map_status}, candidates ${bridge.summary.asset_source_candidate_map_candidates ?? '-'}`);
  lines.push(`- Asset candidate taxonomy review: ${bridge.summary.asset_candidate_taxonomy_review_status}, candidates ${bridge.summary.asset_candidate_taxonomy_review_candidates ?? '-'}, reviewable ${bridge.summary.asset_candidate_taxonomy_review_reviewable_lanes ?? '-'}, owner confirmations ${bridge.summary.asset_candidate_taxonomy_review_owner_confirmations ?? '-'}, check ${bridge.summary.asset_candidate_taxonomy_review_check_status}, failures ${bridge.summary.asset_candidate_taxonomy_review_check_failures ?? '-'}`);
  lines.push(`- Prepare source package contract: ${bridge.summary.prepare_phase1_source_package_contract_check_status}, package ${bridge.summary.prepare_phase1_source_package_contract_package_id ?? '-'}, failures ${bridge.summary.prepare_phase1_source_package_contract_failures ?? '-'}`);
  lines.push(`- Asset prepare fixture contract: ${bridge.summary.asset_prepare_phase1_fixture_contract_check_status}, library ${bridge.summary.asset_prepare_phase1_fixture_contract_library_id ?? '-'}, assets ${bridge.summary.asset_prepare_phase1_fixture_contract_assets ?? '-'}, failures ${bridge.summary.asset_prepare_phase1_fixture_contract_failures ?? '-'}`);
  lines.push(`- Local worker fixture chain task pack: ${bridge.summary.local_worker_fixture_chain_task_pack_status}, tasks ${bridge.summary.local_worker_fixture_chain_task_pack_tasks ?? '-'}, executable ${bridge.summary.local_worker_fixture_chain_task_pack_executable_now ?? '-'}, missing refs ${bridge.summary.local_worker_fixture_chain_task_pack_missing_refs ?? '-'}, check ${bridge.summary.local_worker_fixture_chain_task_pack_check_status}, failures ${bridge.summary.local_worker_fixture_chain_task_pack_check_failures ?? '-'}`);
  lines.push(`- GitHub fixture contract plan: ${bridge.summary.github_fixture_contract_plan_status}, plans ${bridge.summary.github_fixture_contract_plan_count ?? '-'}`);
  lines.push(`- GitHub fixture skeletons: ${bridge.summary.github_fixture_skeletons_status}, directories ${bridge.summary.github_fixture_skeletons_directories ?? '-'}, files ${bridge.summary.github_fixture_skeletons_files ?? '-'}`);
  lines.push(`- GitHub fixture payloads: ${bridge.summary.github_fixture_payloads_status}, payloads ${bridge.summary.github_fixture_payloads_written ?? '-'}`);
  lines.push(`- GitHub fixture payload smoke: ${bridge.summary.github_fixture_payload_smoke_status}, payloads ${bridge.summary.github_fixture_payload_smoke_payloads ?? '-'}, lanes ${bridge.summary.github_fixture_payload_smoke_lanes ?? '-'}, content types ${bridge.summary.github_fixture_payload_smoke_content_types ?? '-'}`);
  lines.push(`- GitHub worker integration signal bridge: ${bridge.summary.github_worker_integration_signal_bridge_status}, candidates ${bridge.summary.github_worker_integration_signal_bridge_candidates ?? '-'}, top signal ${bridge.summary.github_worker_integration_signal_bridge_top_signal_score ?? '-'}`);
  lines.push(`- GitHub worker adapter boundary contract: ${bridge.summary.github_worker_adapter_boundary_contract_status}, fixture ${bridge.summary.github_worker_adapter_boundary_contract_fixture ?? '-'}, commands ${bridge.summary.github_worker_adapter_boundary_contract_commands ?? '-'}`);
  lines.push(`- GitHub worker adapter boundary negative fixtures: ${bridge.summary.github_worker_adapter_boundary_negative_fixtures_status}, fixtures ${bridge.summary.github_worker_adapter_boundary_negative_fixtures_count ?? '-'}, blocked ${bridge.summary.github_worker_adapter_boundary_negative_fixtures_blocked ?? '-'}`);
  lines.push(`- Training eval rubric: ${bridge.summary.training_eval_rubric_status}, suites ${bridge.summary.training_eval_rubric_suites ?? '-'}, criteria ${bridge.summary.training_eval_rubric_criteria ?? '-'}`);
  lines.push(`- Training eval row template: ${bridge.summary.training_eval_row_template_status}, templates ${bridge.summary.training_eval_row_template_templates ?? '-'}`);
  lines.push(`- Training eval review queue: ${bridge.summary.training_eval_review_queue_status}, lanes ${bridge.summary.training_eval_review_queue_lanes ?? '-'}`);
  lines.push(`- Architecture ontology seed: ${bridge.summary.architecture_ontology_seed_status}, entities ${bridge.summary.architecture_ontology_entity_types ?? '-'}, relations ${bridge.summary.architecture_ontology_relation_types ?? '-'}`);
  lines.push(`- Owner unlock fast reply card: ${bridge.summary.owner_unlock_fast_reply_card_status}, broad intent ${bridge.summary.owner_unlock_fast_reply_card_broad_intent ?? '-'}, applies now ${bridge.summary.owner_unlock_fast_reply_card_applies_now ?? '-'}`);
  lines.push(`- Owner unlock exact reply preview: ${bridge.summary.owner_unlock_exact_reply_preview_status}, validator ${bridge.summary.owner_unlock_exact_reply_preview_validator_status ?? '-'}, patches ${bridge.summary.owner_unlock_exact_reply_preview_patch_operations ?? '-'}`);
  lines.push(`- Owner unlock Path A readiness: ${bridge.summary.owner_unlock_path_a_readiness_status}, can start after exact reply ${bridge.summary.owner_unlock_path_a_can_start_after_exact_reply ?? '-'}, applies now ${bridge.summary.owner_unlock_path_a_applies_now ?? '-'}`);
  lines.push(`- Owner unlock patch review bundle: ${bridge.summary.owner_unlock_patch_review_bundle_status}, operations ${bridge.summary.owner_unlock_patch_review_bundle_operations ?? '-'}, applies now ${bridge.summary.owner_unlock_patch_review_bundle_applies_now ?? '-'}`);
  lines.push(`- Owner unlock intake apply plan: ${bridge.summary.owner_unlock_intake_apply_plan_status}, field edits ${bridge.summary.owner_unlock_intake_apply_plan_field_edits ?? '-'}, writes now ${bridge.summary.owner_unlock_intake_apply_plan_writes_now ?? '-'}`);
  lines.push(`- Innovation smoke: ${bridge.summary.innovation_smoke_status}`);
  lines.push(`- Public-ready after bridge: ${bridge.summary.public_ready_after_bridge}`);
  lines.push('');
  lines.push('## Orbit Cards');
  lines.push('');
  lines.push('| Card | Status | Owner Action | Signal |');
  lines.push('| --- | --- | --- | --- |');
  bridge.orbit_cards.forEach((card) => {
    lines.push(`| \`${card.id}\` ${escapePipe(card.title)} | ${card.status} | ${card.owner_action_required ? 'yes' : 'no'} | ${escapePipe(card.signal)} |`);
  });
  lines.push('');
  lines.push('## Recommended Orbit Sections');
  lines.push('');
  bridge.recommended_orbit_sections.forEach((section) => lines.push(`- \`${section}\``));
  lines.push('');
  lines.push('## Next Actions');
  lines.push('');
  bridge.next_actions.forEach((action) => lines.push(`- ${action}`));
  lines.push('');
  return `${lines.join('\n')}`;
}

function escapePipe(value) {
  return String(value ?? '').replace(/\|/g, '\\|').replace(/\n/g, ' ');
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
