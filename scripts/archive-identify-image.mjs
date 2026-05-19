#!/usr/bin/env node

import { access, mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});

async function main() {
  const imagePath = readArg('--image') ?? readArg('--file');
  if (!imagePath) throw new Error('Usage: npm run archive:identify-image -- --image archive-inbox/example/image.jpg');

  const absoluteImagePath = path.resolve(rootDir, imagePath);
  await access(absoluteImagePath);

  const result = identifyFromPath(imagePath);
  const outputPath = path.resolve(rootDir, readArg('--output') ?? `out/image-identification-${Date.now()}.json`);

  await mkdir(path.dirname(outputPath), { recursive: true });
  await writeFile(outputPath, `${JSON.stringify(result, null, 2)}\n`, 'utf8');

  console.log('Architecture Cosmos image identification preview');
  console.log(`Image: ${path.relative(rootDir, absoluteImagePath)}`);
  console.log(`Status: ${result.status}`);
  if (result.candidate) {
    console.log(`Candidate: ${result.candidate.project} (${Math.round(result.candidate.confidence * 100)}%)`);
  }
  console.log(`Wrote: ${path.relative(rootDir, outputPath)}`);
  console.log('');
  console.log('This is a dev scaffold. Replace heuristic matching with a private vision model before relying on unknown images.');
}

function identifyFromPath(imagePath) {
  const normalized = normalize(path.basename(imagePath));
  const candidates = [
    {
      project: 'Villa Savoye',
      architect: 'Le Corbusier, Pierre Jeanneret',
      address: 'Poissy, France',
      confidence: 0.86,
      aliases: ['villa-savoye', 'savoye', 'poissy', 'le-corbusier']
    },
    {
      project: 'Alterszentrum Kloster Ingenbohl',
      architect: 'Boltshauser Architekten / Roger Boltshauser',
      address: 'Klosterstrasse 20, 6440 Brunnen, Schweiz',
      confidence: 0.82,
      aliases: ['ingenbohl', 'boltshauser', 'brunnen', 'kloster']
    },
    {
      project: 'Kinderspital Zürich',
      architect: 'Herzog & de Meuron',
      address: 'Lenggstrasse 30, Zürich, Schweiz',
      confidence: 0.78,
      aliases: ['kispi', 'kinderspital', 'kinderspital-zuerich', 'kinderspital-zurich', 'children-hospital-zurich', 'herzog-de-meuron', 'lengg']
    }
  ];

  const candidate = candidates.find((item) => item.aliases.some((alias) => normalized.includes(alias)));

  return {
    status: candidate ? 'identified' : 'needs_private_vision_model',
    image: imagePath,
    candidate: candidate ? {
      project: candidate.project,
      architect: candidate.architect,
      address: candidate.address,
      confidence: candidate.confidence,
      reason: 'filename/context heuristic match; not visual recognition'
    } : null,
    next_steps: candidate ? [
      `npm run archive:research-entry -- --title "${candidate.project}" --architect "${candidate.architect}" --address "${candidate.address}"`,
      'Review rights before public media/model display',
      'Attach real vision-model result once private model is connected'
    ] : [
      'Run private vision model or manual identification',
      'Search official/project sources',
      'Create research-entry draft after candidate is verified'
    ]
  };
}

function readArg(name) {
  const index = process.argv.indexOf(name);
  return index === -1 ? null : process.argv[index + 1] ?? null;
}

function normalize(value) {
  return value
    .toLowerCase()
    .replace(/ä/g, 'ae')
    .replace(/ö/g, 'oe')
    .replace(/ü/g, 'ue')
    .replace(/ß/g, 'ss')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}
