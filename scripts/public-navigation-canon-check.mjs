#!/usr/bin/env node

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import ts from 'typescript';
import { publicLeakMatches } from './public-leak-patterns.mjs';
import { publicRouteChecks } from './public-route-manifest.mjs';

const root = process.cwd();
const headerPath = resolve(root, 'components/public/PublicSiteHeader.tsx');
const source = readFileSync(headerPath, 'utf8');
const sourceFile = ts.createSourceFile(headerPath, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
const publicRouteSet = new Set(publicRouteChecks.map((route) => route.path));
const requiredCoreNav = ['/', '/references/', '/assets/', '/atlas/', '/orbit/'];
const blockedRoutePatterns = [
  /(^|\/)admin(\/|$)/i,
  /(^|\/)private(\/|$)/i,
  /(^|\/)source-root(\/|$)/i,
  /(^|\/)archive-intake(\/|$)/i,
  /(^|\/)_overseer(\/|$)/i,
  /(^|\/)worker[-_]?logs?(\/|$)/i
];

const findings = [];
const items = readHeaderItems(sourceFile);
const publicAreaIds = readPublicAreaIds(sourceFile);

check(items.length > 0, 'header:items_found', 'Expected PublicSiteHeader to define at least one navigation item.');

for (const duplicateId of duplicates(items.map((item) => item.id))) {
  check(false, `header:duplicate_id:${duplicateId}`, `Duplicate public navigation id: ${duplicateId}`);
}

for (const duplicateHref of duplicates(items.map((item) => item.href))) {
  check(false, `header:duplicate_href:${duplicateHref}`, `Duplicate public navigation href: ${duplicateHref}`);
}

for (const requiredPath of requiredCoreNav) {
  check(
    items.some((item) => item.href === requiredPath),
    `header:required_core_link:${requiredPath}`,
    `PublicSiteHeader is missing required core navigation link ${requiredPath}.`
  );
}

for (const item of items) {
  const itemId = item.id || '(missing-id)';
  check(Boolean(item.id), `header:item:${itemId}:id`, 'Navigation item must have an id.');
  check(Boolean(item.label), `header:item:${itemId}:label`, 'Navigation item must have a label.');
  check(Boolean(item.href), `header:item:${itemId}:href`, 'Navigation item must have an href.');

  if (item.id) {
    check(
      publicAreaIds.has(item.id),
      `header:item:${item.id}:public_area`,
      `Navigation id ${item.id} must be covered by the PublicArea type.`
    );
  }

  if (!item.href) continue;

  check(item.href.startsWith('/'), `header:item:${itemId}:absolute_href`, `Navigation href must start with /: ${item.href}`);
  check(
    item.href === '/' || item.href.endsWith('/'),
    `header:item:${itemId}:trailing_slash`,
    `HTML navigation href must use trailing slash: ${item.href}`
  );
  check(
    publicRouteSet.has(item.href),
    `header:item:${itemId}:route_manifest`,
    `Navigation href must exist in public route manifest: ${item.href}`
  );

  const routeLeakMatches = publicLeakMatches(item.href);
  check(
    routeLeakMatches.length === 0,
    `header:item:${itemId}:href_private_pattern`,
    `Navigation href matches private/source leak patterns: ${routeLeakMatches.join(', ')}`
  );

  const blockedPattern = blockedRoutePatterns.find((pattern) => pattern.test(item.href));
  check(
    !blockedPattern,
    `header:item:${itemId}:blocked_surface`,
    `Navigation href must not expose private/admin/source surfaces: ${item.href}`
  );
}

const failedFindings = findings.filter((finding) => !finding.passed);
const summary = {
  status: failedFindings.length === 0 ? 'passed' : 'failed',
  checked_navigation_items: items.length,
  required_core_navigation_paths: requiredCoreNav,
  public_area_ids: [...publicAreaIds].sort(),
  navigation_items: items,
  failed_findings: failedFindings
};

console.log(JSON.stringify(summary, null, 2));
if (failedFindings.length > 0) process.exit(1);

function readHeaderItems(file) {
  const itemsDeclaration = findVariableDeclaration(file, 'items');
  if (!itemsDeclaration || !ts.isArrayLiteralExpression(itemsDeclaration.initializer)) return [];

  return itemsDeclaration.initializer.elements
    .filter(ts.isObjectLiteralExpression)
    .map((node) => ({
      id: stringProperty(node, 'id'),
      label: stringProperty(node, 'label'),
      href: stringProperty(node, 'href')
    }));
}

function readPublicAreaIds(file) {
  const ids = new Set();
  visit(file, (node) => {
    if (!ts.isTypeAliasDeclaration(node) || node.name.text !== 'PublicArea') return;
    if (!ts.isUnionTypeNode(node.type)) return;

    for (const typeNode of node.type.types) {
      if (ts.isLiteralTypeNode(typeNode) && ts.isStringLiteral(typeNode.literal)) {
        ids.add(typeNode.literal.text);
      }
    }
  });
  return ids;
}

function findVariableDeclaration(file, name) {
  let match = null;
  visit(file, (node) => {
    if (match || !ts.isVariableDeclaration(node)) return;
    if (ts.isIdentifier(node.name) && node.name.text === name) match = node;
  });
  return match;
}

function stringProperty(objectNode, name) {
  const property = objectNode.properties.find((candidate) => {
    if (!ts.isPropertyAssignment(candidate)) return false;
    const propertyName = candidate.name;
    return ts.isIdentifier(propertyName) && propertyName.text === name;
  });
  if (!property || !ts.isPropertyAssignment(property)) return null;

  const initializer = property.initializer;
  if (ts.isStringLiteral(initializer) || ts.isNoSubstitutionTemplateLiteral(initializer)) {
    return initializer.text;
  }

  if (ts.isAsExpression(initializer)) {
    const expression = initializer.expression;
    if (ts.isStringLiteral(expression) || ts.isNoSubstitutionTemplateLiteral(expression)) {
      return expression.text;
    }
  }

  return null;
}

function visit(node, callback) {
  callback(node);
  ts.forEachChild(node, (child) => visit(child, callback));
}

function duplicates(values) {
  const seen = new Set();
  const repeated = new Set();
  for (const value of values.filter(Boolean)) {
    if (seen.has(value)) repeated.add(value);
    seen.add(value);
  }
  return [...repeated];
}

function check(passed, id, message) {
  findings.push({ id, passed: Boolean(passed), message });
}
