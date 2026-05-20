#!/usr/bin/env node

import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const rootDir = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const entriesPath = resolve(rootDir, 'data/mock-entries.json');
const outputDir = resolve(rootDir, 'out/hero-image-research');
const outputPath = resolve(outputDir, 'commons-hero-candidates.json');

const args = new Set(process.argv.slice(2));
const apply = args.has('--apply');
const force = args.has('--force');
const manualOnly = args.has('--manual-only');
const minScore = numberArg('--min-score', 0.52);
const limit = numberArg('--limit', Number.POSITIVE_INFINITY);

const allowedLicenses = new Map([
  ['cc0', 'public_domain'],
  ['public domain', 'public_domain'],
  ['pd', 'public_domain'],
  ['cc by', 'cc_by'],
  ['cc by 2.0', 'cc_by'],
  ['cc by 3.0', 'cc_by'],
  ['cc by 4.0', 'cc_by'],
  ['cc by-sa', 'cc_by_sa'],
  ['cc by-sa 2.0', 'cc_by_sa'],
  ['cc by-sa 3.0', 'cc_by_sa'],
  ['cc by-sa 4.0', 'cc_by_sa']
]);

const stopWords = new Set([
  'the',
  'of',
  'and',
  'de',
  'di',
  'des',
  'der',
  'die',
  'das',
  'von',
  'und',
  'la',
  'le',
  'du',
  'city',
  'house',
  'park',
  'villa',
  'garden',
  'gardens'
]);

const manualHeroOverrides = {
  'catal-huyuk': {
    title: 'File:Çatalhöyük, 7400 BC, Konya, Turkey - UNESCO World Heritage Site, 08.jpg',
    query: 'manual_override',
    url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/8/87/%C3%87atalh%C3%B6y%C3%BCk%2C_7400_BC%2C_Konya%2C_Turkey_-_UNESCO_World_Heritage_Site%2C_08.jpg/960px-%C3%87atalh%C3%B6y%C3%BCk%2C_7400_BC%2C_Konya%2C_Turkey_-_UNESCO_World_Heritage_Site%2C_08.jpg',
    source_url: 'https://commons.wikimedia.org/wiki/File:%C3%87atalh%C3%B6y%C3%BCk,_7400_BC,_Konya,_Turkey_-_UNESCO_World_Heritage_Site,_08.jpg',
    credit: 'Wikimedia Commons / Murat Özsoy 1958 / CC BY-SA 4.0',
    license: 'cc_by_sa',
    license_short: 'CC BY-SA 4.0',
    mime: 'image/jpeg',
    width: 960,
    score: 0.98,
    source_page_title: 'Çatalhöyük',
    discovery: 'manual_public_safe_override',
    public_safe: true
  },
  'gobekli-tepe': {
    title: 'File:Göbekli Tepe, Urfa.jpg',
    query: 'manual_override',
    url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/d/d5/G%C3%B6bekli_Tepe%2C_Urfa.jpg/960px-G%C3%B6bekli_Tepe%2C_Urfa.jpg',
    source_url: 'https://commons.wikimedia.org/wiki/File:G%C3%B6bekli_Tepe,_Urfa.jpg',
    credit: 'Wikimedia Commons / Teomancimit / CC BY-SA 3.0',
    license: 'cc_by_sa',
    license_short: 'CC BY-SA 3.0',
    mime: 'image/jpeg',
    width: 960,
    score: 0.98,
    source_page_title: 'Göbekli Tepe',
    discovery: 'manual_public_safe_override',
    public_safe: true
  },
  'dura-europos': {
    title: 'File:DuraEuropos-TempleOfBel.jpg',
    query: 'manual_override',
    url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/3/32/DuraEuropos-TempleOfBel.jpg/960px-DuraEuropos-TempleOfBel.jpg',
    source_url: 'https://commons.wikimedia.org/wiki/File:DuraEuropos-TempleOfBel.jpg',
    credit: 'Wikimedia Commons / Heretiq / CC BY-SA 2.5',
    license: 'cc_by_sa',
    license_short: 'CC BY-SA 2.5',
    mime: 'image/jpeg',
    width: 960,
    score: 0.98,
    source_page_title: 'Dura-Europos',
    discovery: 'manual_public_safe_override',
    public_safe: true
  },
  'villa-d-este': {
    title: 'File:Villa Deste park Rometta 2011 2.jpg',
    query: 'manual_override',
    url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/9/9e/Villa_Deste_park_Rometta_2011_2.jpg/960px-Villa_Deste_park_Rometta_2011_2.jpg',
    source_url: 'https://commons.wikimedia.org/wiki/File:Villa_Deste_park_Rometta_2011_2.jpg',
    credit: 'Wikimedia Commons / Karelj / CC BY-SA 3.0',
    license: 'cc_by_sa',
    license_short: 'CC BY-SA 3.0',
    mime: 'image/jpeg',
    width: 960,
    score: 0.98,
    source_page_title: "Villa d'Este",
    discovery: 'manual_public_safe_override',
    public_safe: true
  },
  'villa-lante': {
    title: 'File:Villa Lante (1).jpg',
    query: 'manual_override',
    url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/e/e1/Villa_Lante_%281%29.jpg/960px-Villa_Lante_%281%29.jpg',
    source_url: 'https://commons.wikimedia.org/wiki/File:Villa_Lante_(1).jpg',
    credit: 'Wikimedia Commons / Jeff from Sacramento, CA / CC BY 2.0',
    license: 'cc_by',
    license_short: 'CC BY 2.0',
    mime: 'image/jpeg',
    width: 960,
    score: 0.98,
    source_page_title: 'Villa Lante',
    discovery: 'manual_public_safe_override',
    public_safe: true
  },
  'fortezza-di-palmanova': {
    title: 'File:Cinta muraria di Palmanova.jpg',
    query: 'manual_override',
    url: 'https://upload.wikimedia.org/wikipedia/commons/0/06/Cinta_muraria_di_Palmanova.jpg',
    source_url: 'https://commons.wikimedia.org/wiki/File:Cinta_muraria_di_Palmanova.jpg',
    credit: 'Wikimedia Commons / IlirikIlirik / CC0',
    license: 'public_domain',
    license_short: 'CC0',
    mime: 'image/jpeg',
    width: 960,
    score: 0.98,
    source_page_title: 'Palmanova',
    discovery: 'manual_public_safe_override',
    public_safe: true
  },
  'piazza-st-peters': {
    title: "File:St Peter's Square, Vatican City - April 2007.jpg",
    query: 'manual_override',
    url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/d/d6/St_Peter%27s_Square%2C_Vatican_City_-_April_2007.jpg/960px-St_Peter%27s_Square%2C_Vatican_City_-_April_2007.jpg',
    source_url: 'https://commons.wikimedia.org/wiki/File:St_Peter%27s_Square,_Vatican_City_-_April_2007.jpg',
    credit: 'Wikimedia Commons / Diliff / CC BY-SA 3.0',
    license: 'cc_by_sa',
    license_short: 'CC BY-SA 3.0',
    mime: 'image/jpeg',
    width: 960,
    score: 0.98,
    source_page_title: "St. Peter's Square",
    discovery: 'manual_public_safe_override',
    public_safe: true
  },
  'new-lanark-mills': {
    title: 'File:New Lanark buildings 2009.jpg',
    query: 'manual_override',
    url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/d/d2/New_Lanark_buildings_2009.jpg/960px-New_Lanark_buildings_2009.jpg',
    source_url: 'https://commons.wikimedia.org/wiki/File:New_Lanark_buildings_2009.jpg',
    credit: 'Wikimedia Commons / mrpbps / CC BY 2.0',
    license: 'cc_by',
    license_short: 'CC BY 2.0',
    mime: 'image/jpeg',
    width: 960,
    score: 0.98,
    source_page_title: 'New Lanark',
    discovery: 'manual_public_safe_override',
    public_safe: true
  },
  'hotel-tassel': {
    title: 'File:Victor Horta Hotel Tassel.JPG',
    query: 'manual_override',
    url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/3/34/Victor_Horta_Hotel_Tassel.JPG/960px-Victor_Horta_Hotel_Tassel.JPG',
    source_url: 'https://commons.wikimedia.org/wiki/File:Victor_Horta_Hotel_Tassel.JPG',
    credit: 'Wikimedia Commons / Karl Stas / CC BY-SA 3.0',
    license: 'cc_by_sa',
    license_short: 'CC BY-SA 3.0',
    mime: 'image/jpeg',
    width: 960,
    score: 0.98,
    source_page_title: 'Hôtel Tassel',
    discovery: 'manual_public_safe_override',
    public_safe: true
  },
  'fagus-factory': {
    title: 'File:Fagus Gropius Hauptgebaeude 200705 wiki front.jpg',
    query: 'manual_override',
    url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/b/b3/Fagus_Gropius_Hauptgebaeude_200705_wiki_front.jpg/960px-Fagus_Gropius_Hauptgebaeude_200705_wiki_front.jpg',
    source_url: 'https://commons.wikimedia.org/wiki/File:Fagus_Gropius_Hauptgebaeude_200705_wiki_front.jpg',
    credit: 'Wikimedia Commons / Carsten Janssen / CC BY-SA 2.0 de',
    license: 'cc_by_sa',
    license_short: 'CC BY-SA 2.0 de',
    mime: 'image/jpeg',
    width: 960,
    score: 0.98,
    source_page_title: 'Fagus Factory',
    discovery: 'manual_public_safe_override',
    public_safe: true
  },
  'haus-tugendhat': {
    title: 'File:Vila Tugendhat exterior Dvorak2.JPG',
    query: 'manual_override',
    url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/c/c2/Vila_Tugendhat_exterior_Dvorak2.JPG/960px-Vila_Tugendhat_exterior_Dvorak2.JPG',
    source_url: 'https://commons.wikimedia.org/wiki/File:Vila_Tugendhat_exterior_Dvorak2.JPG',
    credit: 'Wikimedia Commons / Petr1987 / CC BY-SA 4.0',
    license: 'cc_by_sa',
    license_short: 'CC BY-SA 4.0',
    mime: 'image/jpeg',
    width: 960,
    score: 0.98,
    source_page_title: 'Villa Tugendhat',
    discovery: 'manual_public_safe_override',
    public_safe: true
  },
  'mfo-park': {
    title: 'File:Zürich - Oerlikon - MFO-Park 2010-10-03 14-10-42.JPG',
    query: 'manual_override',
    url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/46/Z%C3%BCrich_-_Oerlikon_-_MFO-Park_2010-10-03_14-10-42.JPG/960px-Z%C3%BCrich_-_Oerlikon_-_MFO-Park_2010-10-03_14-10-42.JPG',
    source_url: 'https://commons.wikimedia.org/wiki/File:Z%C3%BCrich_-_Oerlikon_-_MFO-Park_2010-10-03_14-10-42.JPG',
    credit: 'Wikimedia Commons / Roland zh / CC BY-SA 3.0',
    license: 'cc_by_sa',
    license_short: 'CC BY-SA 3.0',
    mime: 'image/jpeg',
    width: 960,
    score: 0.98,
    source_page_title: 'MFO-Park',
    discovery: 'manual_public_safe_override',
    public_safe: true
  }
};

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

async function main() {
  const entries = JSON.parse(await readFile(entriesPath, 'utf8'));
  const report = [];
  const nextEntries = [];
  let applied = 0;
  let searched = 0;

  for (const entry of entries) {
    const existingHero = primaryMedia(entry);
    const hasPublicHero = isPublicHeroMedia(existingHero);
    const manualOverride = manualHeroOverrides[entry.id];

    if (manualOverride && (!hasPublicHero || force)) {
      nextEntries.push(apply ? applyHero(entry, manualOverride) : entry);
      if (apply) applied += 1;
      report.push({
        id: entry.id,
        title: entry.title,
        query: ['manual_override'],
        status: apply ? 'applied' : 'candidate',
        best: manualOverride,
        candidates: [manualOverride]
      });
      continue;
    }

    if (manualOnly) {
      nextEntries.push(entry);
      report.push({
        id: entry.id,
        title: entry.title,
        status: 'manual_override_missing'
      });
      continue;
    }

    if (hasPublicHero && !force) {
      nextEntries.push(entry);
      report.push({
        id: entry.id,
        title: entry.title,
        status: 'kept_existing',
        url: existingHero?.url
      });
      continue;
    }

    if (searched >= limit) {
      nextEntries.push(entry);
      report.push({
        id: entry.id,
        title: entry.title,
        status: 'skipped_limit'
      });
      continue;
    }

    searched += 1;
    if (searched === 1 || searched % 10 === 0) {
      console.log(`Hero research ${searched}/${Math.min(entries.length, limit)}: ${entry.title}`);
    }

    const candidates = await findCandidates(entry);
    const best = candidates[0] ?? null;
    const shouldApply = Boolean(best && best.score >= minScore && best.public_safe);

    if (apply && shouldApply) {
      nextEntries.push(applyHero(entry, best));
      applied += 1;
    } else {
      nextEntries.push(entry);
    }

    report.push({
      id: entry.id,
      title: entry.title,
      query: buildQueries(entry),
      status: shouldApply ? (apply ? 'applied' : 'candidate') : 'needs_manual_review',
      best,
      candidates: candidates.slice(0, 4)
    });

    await sleep(120);
  }

  await mkdir(outputDir, { recursive: true });
  await writeFile(outputPath, `${JSON.stringify({
    generated_at: new Date().toISOString(),
    source: 'Wikimedia Commons API',
    public_safe_policy: 'Only public domain, CC0, CC BY and CC BY-SA candidates are eligible for automatic use.',
    apply,
    force,
    manual_only: manualOnly,
    min_score: minScore,
    searched,
    applied,
    total_entries: entries.length,
    report
  }, null, 2)}\n`, 'utf8');

  if (apply) {
    await writeFile(entriesPath, `${JSON.stringify(nextEntries, null, 2)}\n`, 'utf8');
  }

  const candidates = report.filter((item) => item.status === 'candidate' || item.status === 'applied').length;
  const needsReview = report.filter((item) => item.status === 'needs_manual_review').length;

  console.log('Architecture Cosmos hero image research');
  console.log(`Entries: ${entries.length}`);
  console.log(`Searched: ${searched}`);
  console.log(`Candidates: ${candidates}`);
  console.log(`Applied: ${applied}`);
  console.log(`Needs manual review: ${needsReview}`);
  console.log(`Report: ${relativeToRoot(outputPath)}`);
}

async function findCandidates(entry) {
  const seen = new Set();
  const candidates = [];

  for (const candidate of await findWikipediaPageImageCandidates(entry)) {
    if (candidate.url && !seen.has(candidate.url)) {
      seen.add(candidate.url);
      if (candidate.public_safe) candidates.push(candidate);
    }
  }

  for (const query of buildQueries(entry)) {
    const url = new URL('https://commons.wikimedia.org/w/api.php');
    url.searchParams.set('action', 'query');
    url.searchParams.set('generator', 'search');
    url.searchParams.set('gsrnamespace', '6');
    url.searchParams.set('gsrlimit', '8');
    url.searchParams.set('gsrsearch', query);
    url.searchParams.set('prop', 'imageinfo');
    url.searchParams.set('iiprop', 'url|mime|size|extmetadata');
    url.searchParams.set('iiurlwidth', '900');
    url.searchParams.set('format', 'json');
    url.searchParams.set('origin', '*');

    let data;
    try {
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'ArchitectureCosmosHeroResearch/0.1 (https://architekturkosmos.ch; public-safe image metadata research)'
        },
        signal: AbortSignal.timeout(8000)
      });
      if (!response.ok) continue;
      data = await response.json();
    } catch {
      continue;
    }
    const pages = Object.values(data.query?.pages ?? {});

    for (const page of pages) {
      const imageInfo = page.imageinfo?.[0];
      if (!imageInfo?.url || seen.has(imageInfo.url)) continue;
      seen.add(imageInfo.url);

      const candidate = normalizeCandidate(entry, query, page, imageInfo);
      if (candidate.public_safe) candidates.push(candidate);
    }
  }

  return candidates
    .filter((candidate) => candidate.score >= 0.28)
    .sort((a, b) => b.score - a.score || a.title.localeCompare(b.title));
}

async function findWikipediaPageImageCandidates(entry) {
  const candidates = [];
  for (const query of [entry.title]) {
    const searchUrl = new URL('https://en.wikipedia.org/w/api.php');
    searchUrl.searchParams.set('action', 'query');
    searchUrl.searchParams.set('titles', query);
    searchUrl.searchParams.set('redirects', '1');
    searchUrl.searchParams.set('prop', 'pageimages');
    searchUrl.searchParams.set('piprop', 'name|thumbnail');
    searchUrl.searchParams.set('pithumbsize', '900');
    searchUrl.searchParams.set('format', 'json');
    searchUrl.searchParams.set('origin', '*');

    const data = await fetchJson(searchUrl);
    const pages = Object.values(data?.query?.pages ?? {});

    for (const page of pages) {
      if (!page.pageimage) continue;
      const titleScore = scorePageTitle(entry, page.title ?? '');
      if (titleScore < 0.68 || !strictPageTitleMatch(entry, page.title ?? '') || isWrongSpecificPage(entry, page.title ?? '')) continue;

      const commons = await fetchCommonsImageInfo(`File:${page.pageimage}`);
      if (!commons) continue;
      const candidate = normalizeCandidate(entry, query, { title: `File:${page.pageimage}` }, commons, page.title);
      candidate.score = Math.max(candidate.score, Math.min(0.98, titleScore + 0.28));
      candidate.source_page_title = page.title;
      candidate.discovery = 'wikipedia_pageimage';
      candidate.public_safe = Boolean(candidate.license && isPublicImageMime(candidate.mime) && candidate.score >= 0.7 && !isUnsafeHeroTitle(candidate.title));
      candidates.push(candidate);
    }
  }

  return candidates;
}

function buildQueries(entry) {
  const parts = [
    entry.title,
    entry.city,
    firstUsefulAuthor(entry),
    entry.entry_type === 'building' ? 'architecture exterior' : 'architecture'
  ].filter(Boolean);

  const broad = [
    entry.title,
    entry.city,
    entry.country,
    entry.entry_type === 'landscape_project' ? 'landscape architecture' : 'architecture'
  ].filter(Boolean);

  return [...new Set([
    parts.join(' '),
    broad.join(' ')
  ])].filter(Boolean);
}

async function fetchCommonsImageInfo(fileTitle) {
  const url = new URL('https://commons.wikimedia.org/w/api.php');
  url.searchParams.set('action', 'query');
  url.searchParams.set('titles', fileTitle);
  url.searchParams.set('prop', 'imageinfo');
  url.searchParams.set('iiprop', 'url|mime|size|extmetadata');
  url.searchParams.set('iiurlwidth', '900');
  url.searchParams.set('format', 'json');
  url.searchParams.set('origin', '*');

  const data = await fetchJson(url);
  const page = Object.values(data?.query?.pages ?? {})[0];
  return page?.imageinfo?.[0] ?? null;
}

async function fetchJson(url) {
  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'ArchitectureCosmosHeroResearch/0.1 (https://architekturkosmos.ch; public-safe image metadata research)'
      },
      signal: AbortSignal.timeout(8000)
    });
    if (!response.ok) return null;
    return await response.json();
  } catch {
    return null;
  }
}

function normalizeCandidate(entry, query, page, imageInfo, sourcePageTitle = '') {
  const metadata = imageInfo.extmetadata ?? {};
  const title = page.title ?? '';
  const licenseShort = plain(metadata.LicenseShortName?.value);
  const mappedLicense = allowedLicenses.get(licenseShort.toLowerCase()) ?? null;
  const descriptionUrl = metadata.FilePageURL?.value ?? imageInfo.descriptionurl ?? '';
  const artist = cleanCredit(metadata.Artist?.value || metadata.Credit?.value || 'Wikimedia Commons contributor');
  const mime = imageInfo.mime ?? '';
  const fileUrl = imageInfo.thumburl ?? imageInfo.url;
  const score = scoreCandidate(entry, title, mime, sourcePageTitle);

  return {
    title,
    query,
    url: fileUrl,
    source_url: descriptionUrl,
    credit: `Wikimedia Commons / ${artist} / ${licenseShort || 'license metadata'}`,
    license: mappedLicense,
    license_short: licenseShort,
    mime,
    width: imageInfo.thumbwidth ?? imageInfo.width,
    height: imageInfo.thumbheight ?? imageInfo.height,
    score,
    source_page_title: sourcePageTitle,
    discovery: 'commons_search',
    public_safe: Boolean(mappedLicense && isPublicImageMime(mime) && score >= 0.28 && !isUnsafeHeroTitle(title))
  };
}

function scoreCandidate(entry, title, mime, sourcePageTitle = '') {
  const titleText = normalizeText(title);
  const pageText = normalizeText(sourcePageTitle);
  const significantTitleTokens = tokens(entry.title).filter((token) => !stopWords.has(token));
  const cityTokens = tokens(entry.city ?? '').filter((token) => !stopWords.has(token));
  const authorTokens = tokens(firstUsefulAuthor(entry) ?? '').filter((token) => token.length > 4);
  const titleMatches = significantTitleTokens.filter((token) => titleText.includes(token) || pageText.includes(token)).length;
  const cityMatches = cityTokens.filter((token) => titleText.includes(token)).length;
  const authorMatches = authorTokens.filter((token) => titleText.includes(token)).length;
  const titleRatio = significantTitleTokens.length ? titleMatches / significantTitleTokens.length : 0;
  let score = titleRatio * 0.72;

  if (cityTokens.length && cityMatches > 0) score += 0.1;
  if (authorTokens.length && authorMatches > 0) score += 0.1;
  if (/image\/(jpeg|png|webp)/.test(mime)) score += 0.05;

  if (/(exterior|view|building|architecture|fa[cç]ade|park|garden|site)/.test(titleText)) score += 0.08;
  if (isUnsafeHeroTitle(titleText)) score -= 0.55;
  if (/(\\.pdf|\\.djvu|book|manuscript|scan|page|cover|plate)/.test(titleText)) score -= 0.34;
  if (!['map', 'text', 'theory'].includes(entry.entry_type) && /(map|plan|diagram|floor|section|drawing|atlas)/.test(titleText)) score -= 0.2;
  if (entry.entry_type === 'text' || entry.entry_type === 'theory') score -= 0.08;

  return Math.max(0, Math.min(1, Math.round(score * 1000) / 1000));
}

function scorePageTitle(entry, pageTitle) {
  const pageText = normalizeText(pageTitle);
  const significantTitleTokens = tokens(entry.title).filter((token) => !stopWords.has(token));
  if (!significantTitleTokens.length) return 0;
  const matches = significantTitleTokens.filter((token) => pageText.includes(token)).length;
  let score = matches / significantTitleTokens.length;
  if (entry.city && tokens(entry.city).some((token) => pageText.includes(token))) score += 0.08;
  return Math.max(0, Math.min(1, score));
}

function strictPageTitleMatch(entry, pageTitle) {
  if (entry.entry_type === 'text' || entry.entry_type === 'theory') return false;

  const pageText = normalizeText(pageTitle);
  const titleTokens = tokens(entry.title).filter((token) => !stopWords.has(token));
  const cityTokens = tokens(entry.city ?? '').filter((token) => !stopWords.has(token));
  const matched = titleTokens.filter((token) => pageText.includes(token));

  if (titleTokens.length >= 2) {
    return matched.length / titleTokens.length >= 0.72;
  }

  const only = titleTokens[0];
  if (!only) return false;
  if (pageText === only || pageText.startsWith(`${only},`) || pageText.startsWith(`${only} (`)) return true;

  return cityTokens.length > 0 && cityTokens.some((token) => pageText.includes(token));
}

function isWrongSpecificPage(entry, pageTitle) {
  const pageText = normalizeText(pageTitle);
  const entryText = normalizeText(entry.title);
  const wrongTerms = ['albergo', 'bathhouse', 'hotel', 'synagogue', 'municipal corporation', 'council offices', 'historic district'];
  return wrongTerms.some((term) => pageText.includes(term) && !entryText.includes(term));
}

function isPublicImageMime(mime) {
  return /image\/(jpeg|png|webp)/.test(mime);
}

function isUnsafeHeroTitle(value = '') {
  const text = normalizeText(value);
  return /(albergo|bathhouse|logo|portrait|grave|stamp|coin|coat of arms|signature|skull|human remains|statue|capital|column detail|detail|fragment|\\.pdf|\\.djvu|book|manuscript|scan|page|cover|plate|lego|seal|emblem)/.test(text);
}

function applyHero(entry, candidate) {
  const media = Array.isArray(entry.media) ? [...entry.media] : [];
  const exteriorIndex = media.findIndex((item) => item.type === 'exterior');
  const nextMedia = {
    ...(exteriorIndex >= 0 ? media[exteriorIndex] : { type: 'exterior', label: 'Aussenansicht', placeholder: `Aussenansicht / ${entry.title}` }),
    url: candidate.url,
    source_url: candidate.source_url,
    credit: candidate.credit,
    license: candidate.license
  };

  if (exteriorIndex >= 0) {
    media[exteriorIndex] = nextMedia;
  } else {
    media.unshift(nextMedia);
  }

  const sourceCandidates = [
    ...(entry.source_candidates ?? []),
    {
      source_type: 'image_source',
      title: `Wikimedia Commons hero candidate / ${entry.title}`,
      url: candidate.source_url,
      reliability_level: 'secondary_source',
      rights_status: candidate.license === 'public_domain' ? 'public_domain' : 'licensed',
      notes: `Auto-selected hero image candidate. Score: ${candidate.score}. License: ${candidate.license_short}.`
    }
  ];

  return {
    ...entry,
    media,
    source_candidates: dedupeSources(sourceCandidates)
  };
}

function dedupeSources(items) {
  const seen = new Set();
  return items.filter((item) => {
    const key = `${item.title}:${item.url ?? ''}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function primaryMedia(entry) {
  return entry.media?.find((media) => media.type === 'exterior' && media.url) ?? entry.media?.find((media) => media.url);
}

function isPublicHeroMedia(media) {
  return Boolean(media?.url && media?.license && !['unknown', 'needs_permission', 'private_research', 'personal_only', 'all_rights_reserved'].includes(media.license));
}

function firstUsefulAuthor(entry) {
  return (entry.authors ?? []).find((author) => !/unknown|lecture source/i.test(author));
}

function tokens(value) {
  return normalizeText(value)
    .split(/[^a-z0-9]+/)
    .filter((token) => token.length > 2);
}

function normalizeText(value = '') {
  return String(value)
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\\u0300-\\u036f]/g, '')
    .replace(/ü/g, 'u')
    .replace(/ö/g, 'o')
    .replace(/ä/g, 'a')
    .replace(/ß/g, 'ss');
}

function plain(value = '') {
  return cleanCredit(value).replace(/\\s+/g, ' ').trim();
}

function cleanCredit(value = '') {
  return String(value)
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/\\s+/g, ' ')
    .trim()
    .slice(0, 180);
}

function numberArg(name, fallback) {
  const arg = process.argv.find((item) => item.startsWith(`${name}=`));
  if (!arg) return fallback;
  const parsed = Number(arg.slice(name.length + 1));
  return Number.isFinite(parsed) ? parsed : fallback;
}

function sleep(ms) {
  return new Promise((resolvePromise) => setTimeout(resolvePromise, ms));
}

function relativeToRoot(path) {
  return path.replace(`${rootDir}/`, '');
}
