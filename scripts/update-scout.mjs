#!/usr/bin/env node

import { createHmac } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const rootDir = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const entriesPath = resolve(rootDir, 'data/mock-entries.json');
const outputRoot = resolve(rootDir, 'out/update-scout');
const maxEntries = Number.parseInt(readArg('--limit') ?? '6', 10);
const shouldSendEmail = process.argv.includes('--email');
const today = new Date().toISOString().slice(0, 10);

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

async function main() {
  const entries = JSON.parse(await readFile(entriesPath, 'utf8'));
  const seedEntries = selectSeedEntries(entries, maxEntries);
  const proposals = [];

  for (const entry of seedEntries) {
    const discovery = await discoverSimilarProjects(entry);
    proposals.push(buildProposal(entry, discovery));
  }

  const report = {
    generated_at: new Date().toISOString(),
    mode: process.env.BRAVE_SEARCH_API_KEY ? 'live_web_search' : 'query_pack_only',
    proposal_count: proposals.length,
    proposals
  };

  const outputDir = resolve(outputRoot, today);
  const jsonPath = resolve(outputDir, 'update-proposals.json');
  const mdPath = resolve(outputDir, 'update-proposals.md');

  await mkdir(outputDir, { recursive: true });
  await writeFile(jsonPath, `${JSON.stringify(report, null, 2)}\n`);
  await writeFile(mdPath, renderMarkdown(report), 'utf8');

  console.log('Architecture Cosmos Update Scout');
  console.log(`Mode: ${report.mode}`);
  console.log(`Proposals: ${report.proposal_count}`);
  console.log(`JSON: ${relativeToRoot(jsonPath)}`);
  console.log(`Report: ${relativeToRoot(mdPath)}`);

  if (shouldSendEmail) {
    await sendEmailIfConfigured(report);
  }
}

function selectSeedEntries(entries, limit) {
  const requestedSlug = readArg('--entry') ?? readArg('--slug');

  if (requestedSlug) {
    const entry = entries.find((candidate) => candidate.slug === requestedSlug || candidate.id === requestedSlug);
    if (!entry) throw new Error(`Entry not found: ${requestedSlug}`);
    return [entry];
  }

  return [...entries]
    .filter((entry) => entry.entry_type === 'building' || entry.entry_type === 'landscape_project' || entry.entry_type === 'urban_plan')
    .sort((a, b) => entryScoutPriority(b) - entryScoutPriority(a))
    .slice(0, Number.isFinite(limit) && limit > 0 ? limit : 6);
}

function entryScoutPriority(entry) {
  const currentness = Math.max(0, 2200 - Math.abs((entry.year_start ?? 0) - 2026)) / 2200;
  const databaseWeight = entry.database_profile ? 0.8 : 0;
  const analysisWeight = entry.analysis_layers?.length ? 0.5 : 0;
  const missingMediaWeight = entry.media?.some((media) => !media.url) ? 0.4 : 0;
  return currentness + databaseWeight + analysisWeight + missingMediaWeight;
}

async function discoverSimilarProjects(entry) {
  const queries = buildQueries(entry);

  if (!process.env.BRAVE_SEARCH_API_KEY) {
    return {
      status: 'search_key_missing',
      queries,
      results: []
    };
  }

  const results = [];

  for (const query of queries.slice(0, 3)) {
    const url = new URL('https://api.search.brave.com/res/v1/web/search');
    url.searchParams.set('q', query);
    url.searchParams.set('count', '5');
    url.searchParams.set('text_decorations', 'false');

    const response = await fetch(url, {
      headers: {
        Accept: 'application/json',
        'Accept-Encoding': 'gzip',
        'X-Subscription-Token': process.env.BRAVE_SEARCH_API_KEY
      }
    });

    if (!response.ok) {
      results.push({
        query,
        error: `Brave Search failed: ${response.status} ${response.statusText}`
      });
      continue;
    }

    const body = await response.json();
    const webResults = body.web?.results ?? [];
    results.push({
      query,
      results: webResults.slice(0, 5).map((item) => ({
        title: item.title,
        url: item.url,
        description: item.description
      }))
    });
  }

  return {
    status: 'searched',
    queries,
    results
  };
}

function buildQueries(entry) {
  const architect = entry.authors?.[0] && !entry.authors[0].toLowerCase().includes('unknown') ? entry.authors[0] : '';
  const themes = (entry.themes ?? []).slice(0, 4).join(' ');
  const place = [entry.city, entry.country].filter(Boolean).join(' ');
  const type = entry.entry_type?.replace(/_/g, ' ') ?? 'architecture';

  return [
    `similar architecture projects ${entry.title} ${architect} ${themes}`.trim(),
    `${type} ${themes} ${place} architecture case study`.trim(),
    `${architect} ${type} material structure tectonics similar projects`.trim(),
    `${entry.style_sector?.replace(/_/g, ' ')} ${themes} reference projects`.trim()
  ].filter((query, index, list) => query.length > 12 && list.indexOf(query) === index);
}

function buildProposal(entry, discovery) {
  const candidateResults = discovery.results.flatMap((group) => group.results ?? []);
  const topCandidates = dedupeByUrl(candidateResults).slice(0, 5);
  const themes = entry.themes ?? [];
  const analysisFocus = suggestAnalysisFocus(entry);
  const proposalId = `update-${entry.slug}-${today}`;

  return {
    id: proposalId,
    entry_id: entry.id,
    entry_slug: entry.slug,
    entry_title: entry.title,
    status: 'needs_review',
    research_status: discovery.status,
    queries: discovery.queries,
    suggested_update: {
      title: `Research similar references for ${entry.title}`,
      reason: `The entry has ${themes.length} themes and ${entry.analysis_layers?.length ?? 0} analysis layers. Similar projects can improve filters, relations and precedent clusters.`,
      actions: [
        `Review ${topCandidates.length || 'the suggested'} similar-project candidates`,
        `Add relation candidates for ${analysisFocus.join(', ')}`,
        'Update public entry only with rights-safe metadata and source links',
        'Keep copyrighted media private or link-only until rights are cleared'
      ],
      analysis_focus: analysisFocus,
      candidate_sources: topCandidates
    },
    approval: buildApprovalPayload(proposalId, entry.slug)
  };
}

function suggestAnalysisFocus(entry) {
  const tags = new Set((entry.database_tags ?? []).join(' ').toLowerCase().split(/\s+/));
  const themes = (entry.themes ?? []).join(' ').toLowerCase();
  const focus = [];

  if (themes.includes('wood') || themes.includes('timber') || tags.has('material:timber')) focus.push('timber material system');
  if (themes.includes('concrete') || tags.has('material:concrete')) focus.push('concrete structure');
  if (themes.includes('reuse') || themes.includes('existing')) focus.push('adaptive reuse');
  if (themes.includes('landscape') || themes.includes('garden')) focus.push('landscape integration');
  if (themes.includes('monastery') || themes.includes('care')) focus.push('institutional typology');

  return focus.length ? focus : ['material system', 'structure', 'typology', 'source relations'];
}

function buildApprovalPayload(proposalId, slug) {
  const baseUrl = process.env.UPDATE_SCOUT_APPROVAL_BASE_URL;
  const secret = process.env.UPDATE_SCOUT_SIGNING_SECRET;

  if (!baseUrl || !secret) {
    return {
      mode: 'manual_review_only',
      note: 'Set UPDATE_SCOUT_APPROVAL_BASE_URL and UPDATE_SCOUT_SIGNING_SECRET after the Worker approval endpoint exists.'
    };
  }

  const payload = JSON.stringify({
    proposal_id: proposalId,
    slug,
    action: 'approve_update_proposal',
    exp: Math.floor(Date.now() / 1000) + 7 * 24 * 60 * 60
  });
  const token = Buffer.from(payload).toString('base64url');
  const sig = createHmac('sha256', secret).update(token).digest('base64url');
  const approveUrl = new URL('/api/admin/update-scout/approve', baseUrl);
  approveUrl.searchParams.set('token', token);
  approveUrl.searchParams.set('sig', sig);

  return {
    mode: 'signed_approval_link_prepared',
    approve_url: approveUrl.toString(),
    expires_in_days: 7
  };
}

function renderMarkdown(report) {
  const lines = [
    '# Architecture Cosmos Weekly Update Scout',
    '',
    `Generated: ${report.generated_at}`,
    `Mode: ${report.mode}`,
    `Proposals: ${report.proposal_count}`,
    '',
    '> No proposal is applied automatically. Public publishing still requires rights-safe review.',
    ''
  ];

  report.proposals.forEach((proposal, index) => {
    lines.push(`## ${index + 1}. ${proposal.entry_title}`);
    lines.push('');
    lines.push(`- Entry: \`${proposal.entry_slug}\``);
    lines.push(`- Research status: \`${proposal.research_status}\``);
    lines.push(`- Reason: ${proposal.suggested_update.reason}`);
    lines.push(`- Analysis focus: ${proposal.suggested_update.analysis_focus.join(', ')}`);
    lines.push('');
    lines.push('Suggested actions:');
    proposal.suggested_update.actions.forEach((action) => lines.push(`- ${action}`));
    lines.push('');

    if (proposal.suggested_update.candidate_sources.length) {
      lines.push('Candidate sources:');
      proposal.suggested_update.candidate_sources.forEach((source) => {
        lines.push(`- [${source.title}](${source.url})`);
        if (source.description) lines.push(`  ${stripHtml(source.description)}`);
      });
      lines.push('');
    } else {
      lines.push('Search queries to run/review:');
      proposal.queries.forEach((query) => lines.push(`- ${query}`));
      lines.push('');
    }

    if (proposal.approval.approve_url) {
      lines.push(`[Approve this proposal](${proposal.approval.approve_url})`);
    } else {
      lines.push(`Approval: ${proposal.approval.note}`);
    }
    lines.push('');
  });

  return `${lines.join('\n')}\n`;
}

async function sendEmailIfConfigured(report) {
  const apiKey = process.env.RESEND_API_KEY;
  const to = process.env.UPDATE_SCOUT_EMAIL_TO;
  const from = process.env.UPDATE_SCOUT_EMAIL_FROM ?? 'Architecture Cosmos <updates@architekturkosmos.ch>';

  if (!apiKey || !to) {
    console.log('Email skipped: set RESEND_API_KEY and UPDATE_SCOUT_EMAIL_TO to send the report.');
    return;
  }

  const markdown = renderMarkdown(report);
  const html = markdownToSimpleHtml(markdown);
  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      from,
      to,
      subject: `Architecture Cosmos update proposals / ${today}`,
      html,
      text: markdown
    })
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Email send failed: ${response.status} ${response.statusText}\n${body}`);
  }

  console.log(`Email sent to ${to}`);
}

function markdownToSimpleHtml(markdown) {
  return markdown
    .split('\n')
    .map((line) => {
      if (line.startsWith('# ')) return `<h1>${escapeHtml(line.slice(2))}</h1>`;
      if (line.startsWith('## ')) return `<h2>${escapeHtml(line.slice(3))}</h2>`;
      if (line.startsWith('- ')) return `<li>${linkify(escapeHtml(line.slice(2)))}</li>`;
      if (line.startsWith('> ')) return `<blockquote>${escapeHtml(line.slice(2))}</blockquote>`;
      if (!line.trim()) return '<br />';
      return `<p>${linkify(escapeHtml(line))}</p>`;
    })
    .join('\n');
}

function linkify(value) {
  return value.replace(/\[([^\]]+)\]\((https?:\/\/[^)]+)\)/g, '<a href="$2">$1</a>');
}

function dedupeByUrl(items) {
  const seen = new Set();
  return items.filter((item) => {
    if (!item.url || seen.has(item.url)) return false;
    seen.add(item.url);
    return true;
  });
}

function stripHtml(value) {
  return value.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
}

function escapeHtml(value) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

function readArg(name) {
  const index = process.argv.indexOf(name);
  if (index === -1) return null;
  return process.argv[index + 1] ?? null;
}

function relativeToRoot(path) {
  return path.replace(`${rootDir}/`, '');
}
