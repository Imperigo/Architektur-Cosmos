#!/usr/bin/env node

import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, relative, resolve } from 'node:path';

const root = process.cwd();
const args = parseArgs(process.argv.slice(2));
const dateStamp = new Date().toISOString().slice(0, 10);

const refs = {
  questionBrief: resolve(root, args.questionBrief || `data/kosmo-owner-question-brief-${dateStamp}.json`),
  questionBriefCheck: resolve(root, args.questionBriefCheck || `data/kosmo-owner-question-brief-check-${dateStamp}.json`),
  answerIntake: resolve(root, args.answerIntake || `examples/kosmo-references/provenance/owner-answer-intake-template-${dateStamp}.json`),
  answerIntakeCheck: resolve(root, args.answerIntakeCheck || `data/kosmo-owner-answer-intake-check-${dateStamp}.json`),
  sessionEditPlan: resolve(root, args.sessionEditPlan || `data/kosmo-owner-answer-session-edit-plan-${dateStamp}.json`),
  dataLaneSweep: resolve(root, args.dataLaneSweep || `data/kosmodata-lane-sweep-${dateStamp}.json`)
};

const outputJson = resolve(root, args.out || `data/kosmo-owner-review-packet-${dateStamp}.json`);
const outputMd = resolve(root, args.markdown || `docs/codex/kosmo-owner-review-packet-${dateStamp}.md`);

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

async function main() {
  const questionBrief = await readJson(refs.questionBrief);
  const questionBriefCheck = await readJson(refs.questionBriefCheck);
  const answerIntake = await readJson(refs.answerIntake);
  const answerIntakeCheck = await readJson(refs.answerIntakeCheck);
  const sessionEditPlan = await readJson(refs.sessionEditPlan);
  const dataLaneSweep = await readJson(refs.dataLaneSweep);

  const packet = {
    schema_version: '0.1',
    generated_at: new Date().toISOString(),
    status: 'owner_review_packet_ready',
    policy: {
      records_decisions: false,
      writes_session_files: false,
      applies_decisions: false,
      writes_public_files: false,
      writes_public_manifest: false,
      public_ready_after_packet: 0,
      note: 'This packet is an index and handoff bundle only. It does not collect, apply or publish owner decisions.'
    },
    source_refs: Object.values(refs).map((path) => relative(root, path)),
    summary: {
      data_lane_status: dataLaneSweep.status,
      data_lane_steps: `${dataLaneSweep.summary?.passed_steps}/${dataLaneSweep.summary?.steps}`,
      question_brief_status: questionBrief.status,
      question_brief_guard_status: questionBriefCheck.status,
      questions: questionBrief.summary?.questions ?? null,
      intake_status: answerIntake.status,
      intake_guard_status: answerIntakeCheck.status,
      filled_answers: answerIntakeCheck.summary?.filled_answers ?? 0,
      session_edit_plan_status: sessionEditPlan.status,
      planned_edits: sessionEditPlan.summary?.planned_edits ?? 0,
      public_ready_after_packet: 0
    },
    review_order: [
      {
        order: 1,
        title: 'Owner Question Brief',
        purpose: 'Present owner-facing questions.',
        json: relative(root, refs.questionBrief),
        markdown: `docs/codex/kosmo-owner-question-brief-${dateStamp}.md`,
        required_status: 'owner_question_brief_ready'
      },
      {
        order: 2,
        title: 'Question Brief Guard',
        purpose: 'Confirm the question brief is safe to present.',
        json: relative(root, refs.questionBriefCheck),
        markdown: `docs/codex/kosmo-owner-question-brief-check-${dateStamp}.md`,
        required_status: 'owner_question_brief_guard_passed'
      },
      {
        order: 3,
        title: 'Owner Answer Intake',
        purpose: 'Machine-readable location for explicitly confirmed answers.',
        json: relative(root, refs.answerIntake),
        markdown: `docs/codex/kosmo-owner-answer-intake-template-${dateStamp}.md`,
        required_status: 'owner_answer_intake_template_pending_owner_input'
      },
      {
        order: 4,
        title: 'Owner Answer Intake Check',
        purpose: 'Validate filled intake before any session edit planning.',
        json: relative(root, refs.answerIntakeCheck),
        markdown: `docs/codex/kosmo-owner-answer-intake-check-${dateStamp}.md`,
        required_status: 'owner_answer_intake_guard_passed_pending_owner_input'
      },
      {
        order: 5,
        title: 'Session Edit Plan',
        purpose: 'Describe possible session edits only after checked intake exists.',
        json: relative(root, refs.sessionEditPlan),
        markdown: `docs/codex/kosmo-owner-answer-session-edit-plan-${dateStamp}.md`,
        required_status: 'owner_answer_session_edit_plan_pending_owner_input'
      }
    ],
    next_actions: [
      'Use the owner question brief as the only owner-facing prompt for this review round.',
      'Do not edit decision sessions directly from chat text.',
      'Transfer explicit owner answers into the intake template, then run intake check and session edit plan.',
      'Keep public-ready at 0 until separate provenance, rights and promotion reviews pass.'
    ]
  };

  await mkdir(dirname(outputJson), { recursive: true });
  await mkdir(dirname(outputMd), { recursive: true });
  await writeFile(outputJson, `${JSON.stringify(packet, null, 2)}\n`);
  await writeFile(outputMd, renderMarkdown(packet));

  console.log('Kosmo owner review packet');
  console.log(`Status: ${packet.status}`);
  console.log(`Questions: ${packet.summary.questions}`);
  console.log(`Filled answers: ${packet.summary.filled_answers}`);
  console.log(`Planned edits: ${packet.summary.planned_edits}`);
  console.log(`Wrote: ${relative(root, outputMd)}`);
}

async function readJson(path) {
  return JSON.parse(await readFile(path, 'utf8'));
}

function renderMarkdown(packet) {
  const lines = [];
  lines.push('# Kosmo Owner Review Packet');
  lines.push('');
  lines.push(`Generated: ${packet.generated_at}`);
  lines.push(`Status: \`${packet.status}\``);
  lines.push('');
  lines.push('## Summary');
  lines.push('');
  lines.push(`- Data lane: ${packet.summary.data_lane_status} (${packet.summary.data_lane_steps})`);
  lines.push(`- Questions: ${packet.summary.questions}`);
  lines.push(`- Question brief guard: ${packet.summary.question_brief_guard_status}`);
  lines.push(`- Intake: ${packet.summary.intake_status}`);
  lines.push(`- Intake guard: ${packet.summary.intake_guard_status}`);
  lines.push(`- Filled answers: ${packet.summary.filled_answers}`);
  lines.push(`- Session edit plan: ${packet.summary.session_edit_plan_status}`);
  lines.push(`- Planned edits: ${packet.summary.planned_edits}`);
  lines.push(`- Public-ready after packet: ${packet.summary.public_ready_after_packet}`);
  lines.push('');
  lines.push('## Review Order');
  lines.push('');
  for (const item of packet.review_order) {
    lines.push(`${item.order}. ${item.title}`);
    lines.push(`   - Purpose: ${item.purpose}`);
    lines.push(`   - JSON: \`${item.json}\``);
    lines.push(`   - Markdown: \`${item.markdown}\``);
    lines.push(`   - Required status: \`${item.required_status}\``);
  }
  lines.push('');
  lines.push('## Next Actions');
  lines.push('');
  packet.next_actions.forEach((action) => lines.push(`- ${action}`));
  lines.push('');
  return lines.join('\n');
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
