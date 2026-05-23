#!/usr/bin/env node

import { createHash } from 'node:crypto';
import { mkdir, readdir, readFile, stat, writeFile } from 'node:fs/promises';
import { dirname, extname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const rootDir = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const pageImageExtensions = new Set(['.jpg', '.jpeg', '.png', '.webp', '.tif', '.tiff']);
const maxPreviewReadBytes = 180_000;

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

async function main() {
  const input = readArg('--input') ?? 'archive-inbox/books/untitled-book';
  const title = readArg('--title') ?? 'Untitled Architecture Book';
  const bookSlug = readArg('--slug') ?? slugify(title);
  const rights = readArg('--rights') ?? 'private_research';
  const projectHints = readArgs('--project');

  const inputRoot = resolve(rootDir, input);
  const outputRoot = resolve(rootDir, 'out/book-ingestion', bookSlug);
  const intakeRoot = resolve(rootDir, 'archive-intake/books', bookSlug);
  await mkdir(inputRoot, { recursive: true });
  await mkdir(outputRoot, { recursive: true });
  await ensureBookIntakeFolders(intakeRoot);

  const files = await scanTree(inputRoot);
  const classifiedFiles = await Promise.all(files.map(classifyBookFile));
  const textFragments = await collectTextFragments(classifiedFiles);
  const detectedProjects = detectProjects({ files: classifiedFiles, textFragments, projectHints, bookSlug, rights });
  const sourceMap = buildSourceMap({ title, bookSlug, inputRoot, intakeRoot, files: classifiedFiles, detectedProjects, rights });
  const manifest = buildManifest({ title, bookSlug, inputRoot, intakeRoot, files: classifiedFiles, detectedProjects, rights });
  const report = buildReviewReport({ title, bookSlug, files: classifiedFiles, detectedProjects, sourceMap, rights });

  await writeJson(join(outputRoot, 'book-manifest.json'), manifest);
  await writeJson(join(outputRoot, 'detected-projects.json'), detectedProjects);
  await writeJson(join(outputRoot, 'source-map.json'), sourceMap);
  await writeFile(join(outputRoot, 'review-report.md'), report);

  console.log('KosmoData book ingestion preview');
  console.log(`Title: ${title}`);
  console.log(`Slug: ${bookSlug}`);
  console.log(`Input: ${relative(rootDir, inputRoot)}`);
  console.log(`Private intake: ${relative(rootDir, intakeRoot)}`);
  console.log(`Review pack: ${relative(rootDir, outputRoot)}`);
  console.log(`Files scanned: ${classifiedFiles.length}`);
  console.log(`Detected project drafts: ${detectedProjects.length}`);
  console.log(`Rights: ${rights}`);
  console.log('Mode: LOCAL REVIEW ONLY. No OCR engine, Cloudflare, D1, R2, upload, or public publication was touched.');
}

async function ensureBookIntakeFolders(intakeRoot) {
  await Promise.all(['original', 'clean-pages', 'ocr', 'layout', 'detected-projects'].map((folder) => mkdir(join(intakeRoot, folder), { recursive: true })));
}

async function scanTree(root) {
  const files = [];
  async function walk(current) {
    const entries = await readdir(current, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.name.startsWith('.')) continue;
      const fullPath = join(current, entry.name);
      if (entry.isDirectory()) {
        await walk(fullPath);
        continue;
      }
      if (!entry.isFile()) continue;
      const info = await stat(fullPath);
      files.push({
        path: fullPath,
        relative_path: relative(rootDir, fullPath),
        name: entry.name,
        extension: extname(entry.name).toLowerCase(),
        bytes: info.size
      });
    }
  }
  await walk(root);
  return files.sort((a, b) => a.relative_path.localeCompare(b.relative_path));
}

async function classifyBookFile(file) {
  const buffer = await readFile(file.path);
  const hash = createHash('sha256').update(buffer).digest('hex');
  const name = file.name.toLowerCase();
  const role = inferRole(file);
  const pageNumber = inferPageNumber(name);
  return {
    ...file,
    sha256: hash,
    role,
    page_number: pageNumber,
    public_display: 'blocked_private_source',
    cleanup_plan: cleanupPlanFor(file, role)
  };
}

function inferRole(file) {
  const name = file.name.toLowerCase();
  if (file.extension === '.pdf') return name.includes('chapter') || name.includes('kapitel') ? 'chapter_pdf' : 'book_pdf';
  if (pageImageExtensions.has(file.extension)) {
    if (name.includes('spread') || name.includes('doppelseite')) return 'page_spread';
    if (name.includes('plan') || name.includes('grundriss') || name.includes('section') || name.includes('schnitt')) return 'plan_page';
    return 'page_photo';
  }
  if (file.extension === '.txt' || file.extension === '.md') return 'text_notes';
  return 'other_source';
}

function inferPageNumber(name) {
  const match = name.match(/(?:page|seite|p)[-_ ]?(\d{1,4})/i) ?? name.match(/\b(\d{1,4})\b/);
  return match ? Number.parseInt(match[1], 10) : null;
}

function cleanupPlanFor(file, role) {
  if (role === 'book_pdf' || role === 'chapter_pdf') {
    return ['extract_pages', 'deskew_pages', 'ocr_text', 'detect_layout_blocks', 'detect_captions'];
  }
  if (role === 'page_photo' || role === 'page_spread' || role === 'plan_page') {
    return ['detect_page_bounds', 'crop', 'deskew', 'normalize_contrast', 'remove_shadow_if_possible', 'ocr_text'];
  }
  if (role === 'text_notes') return ['parse_notes', 'detect_project_candidates'];
  return ['manual_review'];
}

async function collectTextFragments(files) {
  const fragments = [];
  for (const file of files) {
    if (file.extension !== '.txt' && file.extension !== '.md') continue;
    const raw = await readFile(file.path, 'utf8');
    fragments.push({
      file: file.relative_path,
      text: raw.slice(0, maxPreviewReadBytes)
    });
  }
  return fragments;
}

function detectProjects({ files, textFragments, projectHints, bookSlug, rights }) {
  const candidates = new Map();

  for (const hint of projectHints) {
    addCandidate(candidates, hint, {
      reason: 'explicit --project hint',
      confidence: 0.86,
      pageRefs: []
    });
  }

  for (const file of files) {
    const fromName = candidateFromFileName(file.name);
    if (!fromName) continue;
    addCandidate(candidates, fromName, {
      reason: `filename signal: ${file.name}`,
      confidence: file.role === 'plan_page' ? 0.62 : 0.48,
      pageRefs: file.page_number ? [file.page_number] : []
    });
  }

  for (const fragment of textFragments) {
    for (const candidate of candidatesFromText(fragment.text).slice(0, 18)) {
      addCandidate(candidates, candidate, {
        reason: `text note signal: ${fragment.file}`,
        confidence: 0.52,
        pageRefs: []
      });
    }
  }

  if (candidates.size === 0 && files.length > 0) {
    addCandidate(candidates, 'Ungeprueftes Buchprojekt', {
      reason: 'source package exists but no reliable project signal was detected',
      confidence: 0.12,
      pageRefs: files.map((file) => file.page_number).filter(Boolean).slice(0, 6)
    });
  }

  return [...candidates.values()]
    .sort((a, b) => b.source_confidence - a.source_confidence)
    .map((candidate, index) => ({
      id: `${bookSlug}-project-${String(index + 1).padStart(2, '0')}`,
      title: candidate.title,
      slug: slugify(candidate.title),
      architects: [],
      year: null,
      place: '',
      page_refs: [...new Set(candidate.page_refs)].sort((a, b) => a - b),
      source_confidence: Number(candidate.source_confidence.toFixed(2)),
      evidence: candidate.evidence.slice(0, 6),
      public_display: 'metadata_only',
      rights_status: rights,
      private_assets: [],
      next_review_questions: [
        'Confirm exact title, architect, year and location.',
        'Check whether any pages can be cited publicly as metadata only.',
        'Separate private scan evidence from public-safe analysis text.'
      ]
    }));
}

function addCandidate(candidates, title, { reason, confidence, pageRefs }) {
  const cleanTitle = cleanProjectTitle(title);
  if (!cleanTitle || cleanTitle.length < 3) return;
  const key = slugify(cleanTitle);
  const current = candidates.get(key) ?? {
    title: cleanTitle,
    source_confidence: 0,
    page_refs: [],
    evidence: []
  };
  current.source_confidence = Math.min(0.95, Math.max(current.source_confidence, confidence) + 0.04);
  current.page_refs.push(...pageRefs);
  current.evidence.push(reason);
  candidates.set(key, current);
}

function candidateFromFileName(name) {
  const stem = name.replace(/\.[^.]+$/, '');
  const withoutPage = stem
    .replace(/(?:page|seite|spread|doppelseite|scan|photo|foto|plan|section|schnitt|grundriss|notes|notizen|source|quelle|sources|quellen)[-_ ]?\d{0,4}/gi, ' ')
    .replace(/\b\d{1,4}\b/g, ' ')
    .replace(/[_-]+/g, ' ')
    .trim();
  if (!withoutPage || /^(img|image|scan|page|seite|photo|foto|untitled|notes|notizen|source|quelle|sources|quellen)$/i.test(withoutPage)) return null;
  return titleCase(withoutPage);
}

function candidatesFromText(text) {
  const matches = [];
  const lines = text.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  for (const line of lines) {
    if (matches.length >= 24) break;
    if (/^(project|projekt|building|gebauede|gebäude|case study|referenz)\s*:/i.test(line)) {
      matches.push(line.replace(/^[^:]+:\s*/i, '').slice(0, 90));
      continue;
    }
    const quoted = line.match(/[“"]([^”"]{4,80})[”"]/);
    if (quoted) matches.push(quoted[1]);
  }
  return matches;
}

function cleanProjectTitle(value) {
  return value
    .replace(/\s+/g, ' ')
    .replace(/\b(jpg|jpeg|png|webp|pdf|tif|tiff)\b/gi, '')
    .trim();
}

function buildSourceMap({ title, bookSlug, inputRoot, intakeRoot, files, detectedProjects, rights }) {
  return {
    generated_at: new Date().toISOString(),
    book_title: title,
    book_slug: bookSlug,
    input_root: relative(rootDir, inputRoot),
    private_intake_root: relative(rootDir, intakeRoot),
    rights_default: rights,
    public_policy: 'metadata_and_paraphrase_only_until_rights_clear',
    file_count: files.length,
    files: files.map((file) => ({
      source_path: file.relative_path,
      role: file.role,
      page_number: file.page_number,
      bytes: file.bytes,
      sha256: file.sha256,
      cleanup_plan: file.cleanup_plan,
      public_display: file.public_display
    })),
    project_links: detectedProjects.map((project) => ({
      project_id: project.id,
      title: project.title,
      page_refs: project.page_refs,
      evidence: project.evidence
    }))
  };
}

function buildManifest({ title, bookSlug, inputRoot, intakeRoot, files, detectedProjects, rights }) {
  const counts = files.reduce((summary, file) => {
    summary[file.role] = (summary[file.role] ?? 0) + 1;
    return summary;
  }, {});
  return {
    generated_at: new Date().toISOString(),
    mode: 'local_book_ingestion_preview',
    upload_allowed: false,
    title,
    book_slug: bookSlug,
    input_root: relative(rootDir, inputRoot),
    private_intake_root: relative(rootDir, intakeRoot),
    rights_default: rights,
    summary: {
      files_scanned: files.length,
      roles: counts,
      detected_project_drafts: detectedProjects.length,
      public_assets_allowed: 0,
      private_only_assets: files.length
    },
    planned_outputs: {
      clean_pages: `archive-intake/books/${bookSlug}/clean-pages/`,
      ocr: `archive-intake/books/${bookSlug}/ocr/`,
      layout: `archive-intake/books/${bookSlug}/layout/`,
      detected_projects: `out/book-ingestion/${bookSlug}/detected-projects.json`,
      source_map: `out/book-ingestion/${bookSlug}/source-map.json`,
      review_report: `out/book-ingestion/${bookSlug}/review-report.md`
    },
    next_steps: [
      'Review detected projects manually.',
      'Run rights gate before public use.',
      'Promote only public-safe metadata and paraphrased analysis to the Atlas.',
      'Keep scans, OCR and page images private unless rights are cleared.'
    ]
  };
}

function buildReviewReport({ title, bookSlug, files, detectedProjects, sourceMap, rights }) {
  const lines = [
    `# Book Ingestion Review / ${title}`,
    '',
    `- Slug: \`${bookSlug}\``,
    `- Mode: \`local_book_ingestion_preview\``,
    `- Rights default: \`${rights}\``,
    `- Files scanned: ${files.length}`,
    `- Detected project drafts: ${detectedProjects.length}`,
    '',
    '## Rights Rule',
    '',
    'Book pages, scans, OCR text and plan/photo reproductions stay private by default. Public Atlas output is limited to metadata, bibliography, external links and paraphrased analysis until rights are explicitly cleared.',
    '',
    '## File Roles',
    ''
  ];

  const roleCounts = sourceMap.files.reduce((summary, file) => {
    summary[file.role] = (summary[file.role] ?? 0) + 1;
    return summary;
  }, {});
  for (const [role, count] of Object.entries(roleCounts)) {
    lines.push(`- ${role}: ${count}`);
  }

  lines.push('', '## Detected Project Drafts', '');
  if (detectedProjects.length === 0) {
    lines.push('- No project drafts detected. Add `--project "Project Name"` hints or better filenames/notes.');
  } else {
    for (const project of detectedProjects) {
      lines.push(`### ${project.title}`, '');
      lines.push(`- Confidence: ${Math.round(project.source_confidence * 100)}%`);
      lines.push(`- Page refs: ${project.page_refs.length ? project.page_refs.join(', ') : 'needs manual mapping'}`);
      lines.push(`- Public display: \`${project.public_display}\``);
      lines.push(`- Evidence: ${project.evidence.join('; ')}`);
      lines.push('');
    }
  }

  lines.push('## Next Review', '');
  lines.push('- Confirm exact project metadata.');
  lines.push('- Decide whether drafts remain private or can become public-safe candidates.');
  lines.push('- Never copy copyrighted page images/OCR into public assets without permission.');
  lines.push('');
  return `${lines.join('\n')}\n`;
}

async function writeJson(path, value) {
  await writeFile(path, `${JSON.stringify(value, null, 2)}\n`);
}

function slugify(value) {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'untitled';
}

function titleCase(value) {
  return value.replace(/\w\S*/g, (word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase());
}

function readArg(name) {
  const index = process.argv.indexOf(name);
  return index === -1 ? null : process.argv[index + 1] ?? null;
}

function readArgs(name) {
  const values = [];
  for (let index = 0; index < process.argv.length; index += 1) {
    if (process.argv[index] === name && process.argv[index + 1]) values.push(process.argv[index + 1]);
  }
  return values;
}
