#!/usr/bin/env node

const url = process.argv[2];

if (!url) {
  console.error('Usage: npm run import:afasia -- <afasia-url>');
  process.exit(1);
}

if (!/^https:\/\/afasiaarchzine\.com\//.test(url)) {
  console.error('Only afasiaarchzine.com URLs are supported by this MVP importer.');
  process.exit(1);
}

const html = await fetchText(url);
const textLines = htmlToTextLines(html);
const title = textLines.find((line) => line.includes(' . ')) ?? textLines.find((line) => /house|museum|school|gallery|center|centre/i.test(line)) ?? 'Untitled Afasia Project';
const author = nearestAuthor(textLines, title) ?? title.split('.')[0].trim();
const images = extractAfasiaImages(html, title, author);
const location = fieldAfter(textLines, 'Location') ?? '';
const program = fieldAfter(textLines, 'Program') ?? '';
const area = fieldAfter(textLines, 'Area') ?? '';
const status = fieldAfter(textLines, 'Status') ?? '';
const photography = fieldAfter(textLines, 'Photography') ?? '';
const description = descriptionAfterTitle(textLines, title);

const preview = {
  source: 'afasia',
  source_url: url,
  title: cleanTitle(title),
  authors: [cleanText(author)].filter(Boolean),
  location,
  program,
  area,
  status,
  photography,
  description,
  image_count: images.length,
  suggested_entry: {
    id: slugify(`afasia-${author}-${title}`),
    slug: slugify(`${author}-${title}`),
    title: cleanTitle(title).replace(/^.*?\\.\\s*/, ''),
    entry_type: 'building',
    year_start: yearFromStatus(status) ?? new Date().getFullYear(),
    authors: [cleanText(author)].filter(Boolean),
    city: location,
    country: '',
    style_sector: 'sustainable_architecture',
    lecture_cluster: ['afasia_test_pull', 'contemporary_architecture'],
    themes: ['afasia', normalizeTheme(program), 'contemporary-architecture'].filter(Boolean),
    short_description: description.slice(0, 220),
    source_quality: 'afasia_test_pull',
    one_sentence: `${cleanTitle(title)} ist als Afasia-Importentwurf verortet und verbindet ${program || 'Programm'}, Ort und Quellenmedien.`,
    full_description: description,
    media: suggestedMedia(images, url, photography),
    source_documents: ['Afasia Archzine', cleanTitle(title)],
    source_url: url,
    source_assets: images.map((image, index) => ({
      kind: assetKind(image),
      label: `Afasia image ${index + 1}`,
      url: image,
      credit: photography ? `© ${photography} via Afasia` : 'Afasia Archzine',
      source_url: url
    }))
  }
};

console.log(JSON.stringify(preview, null, 2));

async function fetchText(sourceUrl) {
  const response = await fetch(sourceUrl, {
    headers: {
      'user-agent': 'Architecture Cosmos Afasia Importer MVP'
    }
  });

  if (!response.ok) {
    throw new Error(`Afasia request failed: ${response.status} ${response.statusText}`);
  }

  return response.text();
}

function extractAfasiaImages(sourceHtml, projectTitle, projectAuthor) {
  const titleTokens = tokenSet(projectTitle);
  const authorTokens = tokenSet(projectAuthor);

  return [...sourceHtml.matchAll(/https:\/\/afasiaarchzine\.com\/wp-content\/uploads\/[^"' ]+\.(?:jpg|jpeg|png)/gi)]
    .map((match) => match[0])
    .filter((item) => imageBelongsToProject(item, titleTokens, authorTokens))
    .filter((item, index, items) => items.indexOf(item) === index);
}

function imageBelongsToProject(imageUrl, titleTokens, authorTokens) {
  const normalized = normalizeTheme(decodeURIComponent(imageUrl));
  const titleHit = [...titleTokens].some((token) => normalized.includes(token));
  const authorHit = authorTokens.size === 0 || [...authorTokens].some((token) => normalized.includes(token));

  return titleHit && authorHit;
}

function htmlToTextLines(sourceHtml) {
  return sourceHtml
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<[^>]+>/g, '\n')
    .replace(/&#8211;/g, '-')
    .replace(/&#8217;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .split('\n')
    .map(cleanText)
    .filter(Boolean);
}

function nearestAuthor(lines, projectTitle) {
  const index = lines.indexOf(projectTitle);
  if (index <= 0) return '';
  return lines.slice(Math.max(0, index - 4), index).reverse().find((line) => !line.includes('a f a s i a')) ?? '';
}

function fieldAfter(lines, label) {
  const index = lines.findIndex((line) => line.toLowerCase() === label.toLowerCase());
  return index >= 0 ? lines[index + 1] ?? '' : '';
}

function descriptionAfterTitle(lines, projectTitle) {
  const index = lines.indexOf(projectTitle);
  if (index < 0) return '';

  return lines
    .slice(index + 1)
    .filter((line) => !/^(location|program|area|value|status|photography|team|tags|category)$/i.test(line))
    .filter((line) => line.length > 48)
    .slice(0, 3)
    .join(' ');
}

function suggestedMedia(images, sourceUrl, photography) {
  const credit = photography ? `© ${photography} via Afasia` : 'Afasia Archzine';
  const drawingImages = images.filter((image) => /-(3[0-9])(?:-|\.|$)/.test(image));
  const photoImages = images.filter((image) => !drawingImages.includes(image));
  const exteriorImage = photoImages[0] ?? images[0] ?? '';
  const interiorImage = photoImages.find((image) => /-10-|-11-|-12-|-13-|-14-|-15-|-16-|-17-|-18-|-19-/.test(image)) ?? photoImages[1] ?? exteriorImage;
  const sectionImage = drawingImages.find((image) => /-32-/.test(image)) ?? drawingImages[1] ?? drawingImages[0] ?? images[2] ?? '';
  const planImage = drawingImages.find((image) => /-31-/.test(image)) ?? drawingImages[0] ?? images[3] ?? '';
  const labels = [
    ['exterior', 'Aussenfoto / Afasia', exteriorImage],
    ['interior', 'Innenfoto / Afasia', interiorImage],
    ['section', 'Schnitt / Afasia', sectionImage],
    ['plan', 'Grundriss / Afasia', planImage]
  ];

  return labels.map(([type, label, image]) => ({
    type,
    label,
    placeholder: `Afasia / ${label}`,
    url: image,
    credit,
    source_url: sourceUrl
  }));
}

function assetKind(image) {
  if (/-31-/.test(image)) return 'plan';
  if (/-32-/.test(image)) return 'section';
  if (/-(3[0-9])(?:-|\.|$)/.test(image)) return 'drawing';
  return 'image';
}

function yearFromStatus(status) {
  const match = status.match(/\b(19|20)\d{2}\b/);
  return match ? Number(match[0]) : null;
}

function cleanTitle(value) {
  return cleanText(value).replace(/\s+/g, ' ');
}

function cleanText(value) {
  return value.replace(/\s+/g, ' ').trim();
}

function normalizeTheme(value) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

function tokenSet(value) {
  return new Set(
    normalizeTheme(value)
      .split('-')
      .filter((token) => token.length > 2)
      .filter((token) => !['architecture', 'architects', 'studio', 'the', 'and', 'with'].includes(token))
  );
}

function slugify(value) {
  return normalizeTheme(value).slice(0, 80);
}
