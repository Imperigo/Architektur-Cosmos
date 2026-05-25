#!/usr/bin/env node

import { existsSync, readFileSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';

const root = process.cwd();
const args = parseArgs(process.argv.slice(2));
const projectRoot = resolve(root, args.project || 'examples/kosmo-projects/kosmo-demo-001');
const selectionPath = join(projectRoot, args.selection || 'design/context-selection.json');
const requireApprovedDesignSeed = Boolean(args['require-approved-design-seed']);

main();

function main() {
  if (!existsSync(selectionPath)) {
    if (requireApprovedDesignSeed) {
      fail(`Missing context selection: ${relative(root, selectionPath)}`);
    }
    pass('No context selection found. Design seed use is blocked by default.');
    return;
  }

  const selection = readJson(selectionPath);
  const selections = Array.isArray(selection.selections) ? selection.selections : [];
  const acceptedDesignSeeds = selections.filter((item) => item.decision === 'accepted_as_design_seed');
  const unresolved = selections.filter((item) => item.decision === 'undecided' || item.decision === 'needs_more_source_review');
  const approved = Boolean(selection.approved_for_design_generation);

  const errors = [];
  if (acceptedDesignSeeds.length > 0 && !approved) {
    errors.push('Context selection contains accepted design seeds, but approved_for_design_generation is false.');
  }
  if (approved && acceptedDesignSeeds.length === 0) {
    errors.push('approved_for_design_generation is true, but no candidate is accepted_as_design_seed.');
  }
  if (approved && unresolved.length > 0) {
    errors.push(`approved_for_design_generation is true, but ${unresolved.length} candidate(s) are still unresolved.`);
  }
  if (requireApprovedDesignSeed && (!approved || acceptedDesignSeeds.length === 0)) {
    errors.push('An approved design seed is required before this downstream design-generation step can run.');
  }

  if (errors.length) {
    fail(errors.join('\n'));
  }

  const status = approved
    ? `Approved design seeds: ${acceptedDesignSeeds.map((item) => item.candidate_id).join(', ')}`
    : 'No approved design seed. Context may be used only as local review/reference.';
  pass(status);
}

function pass(message) {
  console.log('Kosmo context guard passed');
  console.log(`Project: ${relative(root, projectRoot) || '.'}`);
  console.log(message);
}

function fail(message) {
  console.error('Kosmo context guard failed');
  console.error(`Project: ${relative(root, projectRoot) || '.'}`);
  console.error(message);
  process.exit(1);
}

function readJson(pathname) {
  return JSON.parse(readFileSync(pathname, 'utf8'));
}

function parseArgs(argv) {
  const parsed = {};
  for (let index = 0; index < argv.length; index += 1) {
    const item = argv[index];
    if (!item.startsWith('--')) continue;
    const key = item.slice(2);
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
