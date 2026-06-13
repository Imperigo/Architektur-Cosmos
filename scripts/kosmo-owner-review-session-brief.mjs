#!/usr/bin/env node

import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, relative, resolve } from 'node:path';

const root = process.cwd();
const args = parseArgs(process.argv.slice(2));
const dateStamp = new Date().toISOString().slice(0, 10);

const refs = {
  packet: resolve(root, args.packet || `data/kosmo-owner-review-packet-${dateStamp}.json`),
  packetCheck: resolve(root, args.packetCheck || `data/kosmo-owner-review-packet-check-${dateStamp}.json`),
  questionBrief: resolve(root, args.questionBrief || `data/kosmo-owner-question-brief-${dateStamp}.json`),
  answerSheet: resolve(root, args.answerSheet || `data/kosmo-owner-answer-sheet-${dateStamp}.json`),
  router: resolve(root, args.router || `data/kosmo-data-lane-command-router-${dateStamp}.json`)
};

const outputJson = resolve(root, args.out || `data/kosmo-owner-review-session-brief-${dateStamp}.json`);
const outputMd = resolve(root, args.markdown || `docs/codex/kosmo-owner-review-session-brief-${dateStamp}.md`);

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

async function main() {
  const packet = await readJson(refs.packet);
  const packetCheck = await readJson(refs.packetCheck);
  const questionBrief = await readJson(refs.questionBrief);
  const answerSheet = await readJson(refs.answerSheet);
  const router = await readJson(refs.router);
  const sourceRoot = getSection(answerSheet, 'source-root-decision');

  const priorSignals = buildPriorSignals();
  const questions = (questionBrief.questions || []).map((question, index) => ({
    order: index + 1,
    id: question.id,
    title: question.title,
    question: question.question,
    safe_default: question.safe_default,
    allowed_answers: question.allowed_answers,
    answer_field: question.answer_field,
    note_field: question.note_field,
    current_status: 'unanswered'
  }));

  const brief = {
    schema_version: '0.1',
    generated_at: new Date().toISOString(),
    status: 'owner_review_session_brief_ready',
    policy: {
      records_decisions: false,
      writes_session_files: false,
      applies_decisions: false,
      writes_public_files: false,
      writes_public_manifest: false,
      public_ready_after_brief: 0,
      note: 'This brief prepares the next owner conversation. It classifies prior chat signals but does not record answers or apply decisions.'
    },
    source_refs: Object.values(refs).map((path) => relative(root, path)),
    summary: {
      packet_status: packet.status,
      packet_guard_status: packetCheck.status,
      router_status: router.status,
      questions: questions.length,
      prior_signals: priorSignals.length,
      prior_signals_recordable_now: priorSignals.filter((signal) => signal.recordable_now === true).length,
      required_owner_answers: questions.filter((question) => question.current_status === 'unanswered').length,
      source_root_options: sourceRoot.top_options?.length ?? 0,
      actionable_decisions_written: 0,
      public_ready_after_brief: 0
    },
    prior_owner_signals: priorSignals,
    source_root_status: {
      current_selected_decision: sourceRoot.current_selected_decision,
      current_selected_root_path: sourceRoot.current_selected_root_path,
      safe_default: sourceRoot.safe_default,
      allowed_decisions: sourceRoot.allowed_decisions,
      top_options: (sourceRoot.top_options || []).slice(0, 5).map((option) => ({
        id: option.id,
        path: option.path,
        classification: option.classification,
        recommended_action: option.recommended_action,
        safe_default: option.safe_default
      }))
    },
    owner_questions: questions,
    paste_ready_sequence: [
      'Ich habe deine bisherigen Aussagen eingearbeitet, aber noch keine Entscheidungen daraus geschrieben.',
      'Bitte beantworte die sechs Punkte unten mit einer der erlaubten Antworten oder mit kurzer Notiz.',
      'Wenn du unsicher bist, gilt der Safe Default und alles bleibt blockiert/review-only.',
      'Nach deinen Antworten uebertragen Codex/Claude nur explizit bestaetigte Antworten in das Intake Template und lassen die Guards laufen.'
    ],
    next_actions: [
      'Present this session brief to the owner before editing any intake or decision-session file.',
      'Treat prior source statements as hints only until an exact source-root decision is confirmed.',
      'After explicit answers, update the intake template, then rerun intake check and session edit plan.',
      'Keep public-ready at 0 until separate provenance, rights and promotion reviews pass.'
    ]
  };

  await mkdir(dirname(outputJson), { recursive: true });
  await mkdir(dirname(outputMd), { recursive: true });
  await writeFile(outputJson, `${JSON.stringify(brief, null, 2)}\n`);
  await writeFile(outputMd, renderMarkdown(brief));

  console.log('Kosmo owner review session brief');
  console.log(`Status: ${brief.status}`);
  console.log(`Questions: ${brief.summary.questions}`);
  console.log(`Prior signals: ${brief.summary.prior_signals}`);
  console.log(`Recordable now: ${brief.summary.prior_signals_recordable_now}`);
  console.log(`Wrote: ${relative(root, outputMd)}`);
}

function buildPriorSignals() {
  return [
    {
      id: 'pilot_reference_scope',
      user_signal: 'Villa Savoye, ein Schweizer Holzbau, und ein Bau von Roger Boltshauser/Frauenkloster Ingenbohl.',
      classification: 'already_reflected_in_pilot_scope',
      recordable_now: false,
      reason: 'The pilot scope is already represented by Villa Savoye, Sogn Benedetg and Ingenbohl. It does not answer the current source-root or owner-review card decisions.'
    },
    {
      id: 'sample_depth',
      user_signal: 'Von allem eines.',
      classification: 'scope_hint_not_decision',
      recordable_now: false,
      reason: 'This supports small pilot batches, but does not select a source root, asset review target or public promotion decision.'
    },
    {
      id: 'local_first_onedrive_books_eth_hslu',
      user_signal: 'Zuerst lokal; OneDrive hat eine riesige Library; Architektur-Referenzen sollen spaeter aus digitalen Buechern, ETH- und HSLU-Vorlesungen kommen.',
      classification: 'source_root_hint_only',
      recordable_now: false,
      reason: 'This confirms the desired source family, but no exact visible path is selected and OneDrive still has sync-error markers.'
    },
    {
      id: 'same_day_nightshift',
      user_signal: 'Beides heute, Nachtschicht bis Nutzlimit.',
      classification: 'execution_cadence',
      recordable_now: false,
      reason: 'This authorizes autonomous preparation work, not data-lane decisions.'
    },
    {
      id: 'autonomous_private_github_push',
      user_signal: 'GitHub staendig selbst autonom pushen, privat.',
      classification: 'operational_permission',
      recordable_now: false,
      reason: 'This guides Codex commit/push behavior, but does not alter reference provenance, rights, source-root or public-ready state.'
    }
  ];
}

async function readJson(path) {
  return JSON.parse(await readFile(path, 'utf8'));
}

function getSection(sheet, id) {
  const section = (sheet.sections || []).find((candidate) => candidate.id === id);
  if (!section) throw new Error(`Missing answer sheet section: ${id}`);
  return section;
}

function renderMarkdown(brief) {
  const lines = [];
  lines.push('# Kosmo Owner Review Session Brief');
  lines.push('');
  lines.push(`Generated: ${brief.generated_at}`);
  lines.push(`Status: \`${brief.status}\``);
  lines.push('');
  lines.push('## Guardrails');
  lines.push('');
  lines.push('- Diese Session-Brief schreibt keine Entscheidungen.');
  lines.push('- Sie schreibt keine Session-Dateien und wendet nichts an.');
  lines.push('- Public-ready bleibt 0.');
  lines.push('- Fruehere Chat-Aussagen werden nur als Hinweise klassifiziert.');
  lines.push('');
  lines.push('## Stand');
  lines.push('');
  lines.push(`- Packet: ${brief.summary.packet_status}`);
  lines.push(`- Packet Guard: ${brief.summary.packet_guard_status}`);
  lines.push(`- Router: ${brief.summary.router_status}`);
  lines.push(`- Fragen offen: ${brief.summary.required_owner_answers}/${brief.summary.questions}`);
  lines.push(`- Fruehere Signale recordable now: ${brief.summary.prior_signals_recordable_now}/${brief.summary.prior_signals}`);
  lines.push(`- Public-ready after brief: ${brief.summary.public_ready_after_brief}`);
  lines.push('');
  lines.push('## Fruehere Signale');
  lines.push('');
  for (const signal of brief.prior_owner_signals) {
    lines.push(`### ${signal.id}`);
    lines.push('');
    lines.push(`- Signal: ${signal.user_signal}`);
    lines.push(`- Klasse: \`${signal.classification}\``);
    lines.push(`- Jetzt schreibbar: ${signal.recordable_now ? 'ja' : 'nein'}`);
    lines.push(`- Grund: ${signal.reason}`);
    lines.push('');
  }
  lines.push('## Source-Root Kurzlage');
  lines.push('');
  lines.push(`- Aktuelle Entscheidung: ${brief.source_root_status.current_selected_decision || 'pending'}`);
  lines.push(`- Aktueller Root: ${brief.source_root_status.current_selected_root_path || 'pending'}`);
  lines.push(`- Safe default: \`${brief.source_root_status.safe_default}\``);
  lines.push('');
  lines.push('Top Optionen:');
  brief.source_root_status.top_options.forEach((option) => {
    lines.push(`- \`${option.classification}\`: ${option.path || option.id} - ${option.recommended_action}`);
  });
  lines.push('');
  lines.push('## Paste-Ready Fragerunde');
  lines.push('');
  brief.paste_ready_sequence.forEach((line) => lines.push(`- ${line}`));
  lines.push('');
  for (const question of brief.owner_questions) {
    lines.push(`### ${question.order}. ${question.title}`);
    lines.push('');
    lines.push(question.question);
    lines.push('');
    lines.push(`- Safe default: \`${question.safe_default}\``);
    lines.push(`- Erlaubte Antworten: ${question.allowed_answers.map((answer) => `\`${answer}\``).join(', ')}`);
    lines.push('');
    lines.push('```text');
    lines.push(`Antwort ${question.order}:`);
    lines.push('Notiz:');
    lines.push('```');
    lines.push('');
  }
  lines.push('## Next Actions');
  lines.push('');
  brief.next_actions.forEach((action) => lines.push(`- ${action}`));
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
