#!/usr/bin/env node

import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, relative, resolve } from 'node:path';

const root = process.cwd();
const args = parseArgs(process.argv.slice(2));
const dateStamp = new Date().toISOString().slice(0, 10);
const sourcePackagePath = resolve(root, args.sourcePackage || 'examples/kosmo-references/source-packages/alterszentrum-kloster-ingenbohl-public-source-candidate-2026-06-13/source-package.json');
const outputJson = resolve(root, args.out || `data/ingenbohl-pdf-extraction-decision-brief-${dateStamp}.json`);
const outputMd = resolve(root, args.markdown || `docs/codex/ingenbohl-pdf-extraction-decision-brief-${dateStamp}.md`);

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

async function main() {
  const sourcePackage = JSON.parse(await readFile(sourcePackagePath, 'utf8'));
  const pdfSources = sourcePackage.sources.filter((source) => source.file_type === 'web_link' && source.path.toLowerCase().endsWith('.pdf'));
  const report = {
    schema_version: '0.1',
    generated_at: new Date().toISOString(),
    status: pdfSources.length ? 'ingenbohl_pdf_extraction_decision_needed' : 'ingenbohl_pdf_source_missing',
    policy: {
      review_only: true,
      downloaded_pdf: false,
      extracted_text: false,
      copied_pdf_content: false,
      public_ready_allowed: false,
      note: 'This brief decides whether a linked PDF may later enter private extraction. It does not download, extract, quote or republish PDF content.'
    },
    source_package: relative(root, sourcePackagePath),
    summary: {
      source_package_status: sourcePackage.status,
      pdf_link_count: pdfSources.length,
      extraction_artifacts_present: sourcePackage.extraction_artifacts?.length ?? 0,
      public_source_files_allowed: sourcePackage.public_policy?.source_files_public === true,
      public_extracted_text_allowed: sourcePackage.public_policy?.extracted_text_public === true,
      public_ready_after_brief: 0
    },
    pdf_sources: pdfSources.map((source) => ({
      id: source.id,
      title: source.title,
      source_role: source.source_role,
      rights_status: source.rights_status,
      url_fingerprint_sha256: source.sha256,
      copied_content: false
    })),
    allowed_future_modes: [
      {
        id: 'keep_link_only',
        description: 'Do not download or extract. Use the PDF link only as source trail metadata.',
        repo_safe: true,
        public_ready_after_mode: 0
      },
      {
        id: 'private_metadata_only',
        description: 'Privately record PDF filename, URL, page count and document structure if technically available, without page text.',
        repo_safe: 'metadata_only',
        public_ready_after_mode: 0
      },
      {
        id: 'private_toc_and_short_notes',
        description: 'Extract table-of-contents and short own-written notes into private KosmoZentrale only after explicit owner/overseer confirmation.',
        repo_safe: false,
        public_ready_after_mode: 0
      }
    ],
    blocked_modes: [
      'copy_pdf_pages_to_git',
      'copy_full_pdf_text_to_git',
      'publish_plan_or_image_extractions',
      'derive_public_geometry_without_source_basis_review',
      'mark_ingenbohl_assets_public_ready_from_this_brief'
    ],
    next_actions: [
      'Ask owner/overseers whether the linked study-commission PDF should stay link-only or enter private metadata-only extraction.',
      'If private extraction is approved later, write outputs only under KosmoZentrale private source paths.',
      'After any private extraction, convert only own-written metadata-safe summaries into repo artifacts.',
      'Keep Ingenbohl structure/material/model claims review-only until stronger evidence and human review exist.'
    ]
  };

  await mkdir(dirname(outputJson), { recursive: true });
  await mkdir(dirname(outputMd), { recursive: true });
  await writeFile(outputJson, `${JSON.stringify(report, null, 2)}\n`);
  await writeFile(outputMd, renderMarkdown(report));

  console.log('Ingenbohl PDF extraction decision brief');
  console.log(`Status: ${report.status}`);
  console.log(`PDF links: ${report.summary.pdf_link_count}`);
  console.log(`Wrote: ${relative(root, outputMd)}`);
}

function renderMarkdown(report) {
  const lines = [];
  lines.push('# Ingenbohl PDF Extraction Decision Brief');
  lines.push('');
  lines.push(`Generated: ${report.generated_at}`);
  lines.push(`Status: \`${report.status}\``);
  lines.push('');
  lines.push('## Summary');
  lines.push('');
  lines.push(`- PDF link count: ${report.summary.pdf_link_count}`);
  lines.push(`- Extraction artifacts present: ${report.summary.extraction_artifacts_present}`);
  lines.push(`- Public source files allowed: ${report.summary.public_source_files_allowed ? 'yes' : 'no'}`);
  lines.push(`- Public extracted text allowed: ${report.summary.public_extracted_text_allowed ? 'yes' : 'no'}`);
  lines.push(`- Public-ready after brief: ${report.summary.public_ready_after_brief}`);
  lines.push('');
  lines.push('## PDF Sources');
  lines.push('');
  lines.push('| Source | Role | Rights | Copied content |');
  lines.push('| --- | --- | --- | --- |');
  for (const source of report.pdf_sources) {
    lines.push(`| ${escapePipe(source.title)} | ${source.source_role} | ${source.rights_status} | ${source.copied_content ? 'yes' : 'no'} |`);
  }
  lines.push('');
  lines.push('## Allowed Future Modes');
  lines.push('');
  for (const mode of report.allowed_future_modes) {
    lines.push(`- \`${mode.id}\`: ${mode.description}`);
  }
  lines.push('');
  lines.push('## Blocked Modes');
  lines.push('');
  report.blocked_modes.forEach((mode) => lines.push(`- \`${mode}\``));
  lines.push('');
  lines.push('## Next Actions');
  lines.push('');
  report.next_actions.forEach((action) => lines.push(`- ${action}`));
  lines.push('');
  lines.push('## Safety');
  lines.push('');
  lines.push('No PDF was downloaded or extracted. This brief keeps the Studienauftrag PDF link-only unless a later owner/overseer decision creates a private extraction task.');
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
