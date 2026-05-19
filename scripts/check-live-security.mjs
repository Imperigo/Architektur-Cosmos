#!/usr/bin/env node

const defaultUrls = [
  'https://architekturkosmos.ch/',
  'https://architekturkosmos.ch/atlas/',
  'https://architekturkosmos.ch/atlas/villa-savoye/',
  'https://architekturkosmos.ch/atlas/alterszentrum-kloster-ingenbohl/'
];

const requiredHeaders = [
  {
    name: 'strict-transport-security',
    validate: (value) => value.includes('max-age=31536000'),
    hint: 'must include a long max-age'
  },
  {
    name: 'content-security-policy',
    validate: (value) => value.includes("default-src 'self'") && value.includes("object-src 'none'"),
    hint: "must include default-src 'self' and object-src 'none'"
  },
  {
    name: 'x-frame-options',
    validate: (value) => value.toUpperCase() === 'DENY',
    hint: 'must be DENY'
  },
  {
    name: 'x-content-type-options',
    validate: (value) => value.toLowerCase() === 'nosniff',
    hint: 'must be nosniff'
  },
  {
    name: 'referrer-policy',
    validate: (value) => value.length > 0,
    hint: 'must be present'
  },
  {
    name: 'permissions-policy',
    validate: (value) => value.includes('camera=()') && value.includes('microphone=()'),
    hint: 'must disable sensitive browser capabilities'
  },
  {
    name: 'cross-origin-opener-policy',
    validate: (value) => value.toLowerCase() === 'same-origin',
    hint: 'must be same-origin'
  },
  {
    name: 'cross-origin-resource-policy',
    validate: (value) => value.toLowerCase() === 'same-origin',
    hint: 'must be same-origin'
  }
];

const urls = process.argv.slice(2).filter((argument) => !argument.startsWith('--'));
const targets = urls.length > 0 ? urls : defaultUrls;
const failures = [];

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});

async function main() {
  console.log('Architecture Cosmos live security header check');

  for (const target of targets) {
    await checkUrl(target);
  }

  if (failures.length > 0) {
    console.error('\nLive security check failed:');
    failures.forEach((failure) => console.error(`- ${failure}`));
    process.exit(1);
  }

  console.log('\nLive security check passed.');
}

async function checkUrl(target) {
  const response = await fetch(target, {
    method: 'HEAD',
    redirect: 'follow'
  });

  if (!response.ok) {
    failures.push(`${target} returned HTTP ${response.status}`);
    return;
  }

  console.log(`\n${target}`);
  console.log(`- HTTP ${response.status}`);

  for (const header of requiredHeaders) {
    const value = response.headers.get(header.name);

    if (!value) {
      failures.push(`${target} is missing ${header.name}`);
      continue;
    }

    if (!header.validate(value)) {
      failures.push(`${target} has invalid ${header.name}: ${header.hint}`);
      continue;
    }

    console.log(`- ${header.name}: ok`);
  }
}
