export const requiredPublicManifestRoutes = new Set([
  '/',
  '/atlas/',
  '/references/',
  '/assets/',
  '/orbit/',
  '/robots.txt',
  '/sitemap.xml',
  '/.well-known/security.txt'
]);

export const allowedPublicManifestStaticExtensions = new Set(['.svg', '.txt', '.xml']);

export const blockedPublicRoutePatterns = [
  /(^|\/)admin(\/|$)/i,
  /(^|\/)private(\/|$)/i,
  /(^|\/)source-root(\/|$)/i,
  /(^|\/)archive-intake(\/|$)/i,
  /(^|\/)owner-inbox(\/|$)/i,
  /(^|\/)handoffs?(\/|$)/i,
  /(^|\/)codex-handoffs?(\/|$)/i,
  /(^|\/)codex-memory(\/|$)/i,
  /(^|\/)09[-_]?codex[-_]?memory(\/|$)/i,
  /(^|\/)kosmo[-_]?orbit(\/|$)/i,
  /(^|\/)kosmo[-_]?references(\/|$)/i,
  /(^|\/)kosmo[-_]?asset(\/|$)/i,
  /(^|\/)intake\/inbox(\/|$)/i,
  /(^|\/)_overseer(\/|$)/i,
  /(^|\/)worker[-_]?logs?(\/|$)/i,
  /(^|\/)\.codex(\/|$)/i,
  /(^|\/)\.claude(\/|$)/i
];

export function blockedPublicRoutePatternFor(routePath) {
  return blockedPublicRoutePatterns.find((pattern) => pattern.test(routePath));
}

export function hasKnownPublicManifestStaticExtension(routePath, warnings, idPrefix = 'route') {
  const match = routePath.match(/\.[a-z0-9]+$/i);
  if (!match) return false;
  if (allowedPublicManifestStaticExtensions.has(match[0].toLowerCase())) return true;

  warnings.push({
    id: `${idPrefix}:${routePath}:static-extension`,
    detail: `Route uses an unrecognized static extension: ${routePath}`
  });
  return true;
}
