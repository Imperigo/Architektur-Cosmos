import type { Entry, EntryMedia } from '@/lib/types';

const blockedPublicLicenses = new Set([
  'all_rights_reserved',
  'needs_permission',
  'private_research',
  'personal_only',
  'unknown'
]);

export function isPublicDisplayMedia(media: EntryMedia | undefined) {
  return Boolean(media?.url && !blockedPublicLicenses.has(String(media.license ?? '')));
}

export function publicDisplayMediaUrl(media: EntryMedia | undefined) {
  return isPublicDisplayMedia(media) ? media?.url ?? null : null;
}

export function primaryPublicMedia(entry: Entry) {
  return entry.media.find((media) => media.type === 'exterior' && isPublicDisplayMedia(media))
    ?? entry.media.find((media) => isPublicDisplayMedia(media))
    ?? null;
}

export function primaryPublicMediaUrl(entry: Entry) {
  return primaryPublicMedia(entry)?.url ?? null;
}
