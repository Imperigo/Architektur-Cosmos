# Book Library Ingestion For KosmoData

KosmoData should eventually ingest not only online sources, but also private
architecture books, lecture scans, photographed pages and book PDFs. This is a
separate workflow from the public Atlas because most book material is protected
by copyright and must remain private unless rights are explicitly cleared.

## Goal

The user should be able to drag book material into a KosmoData intake area:

- phone photos of book pages;
- flatbed scans;
- exported PDF books or chapter PDFs;
- page spreads with captions, plans, photos and project indexes.

The system then creates a private, cleaned digital study copy and extracts the
architectural projects mentioned in the material as structured private database
drafts.

## Scope Separation

### Public Website

The public site may show only:

- manually written or AI-paraphrased metadata and analysis;
- source references and bibliographic citations;
- public-domain, licensed or own-work images;
- links to books, publishers, libraries or catalog records.

The public site must not display copyrighted book scans, photographed pages,
OCR text excerpts or plan reproductions unless there is explicit permission.

### Private User Library

The private library may store user-provided scans and extracted text for the
owning user only. This is a personal research archive, not public publishing.

Private outputs can include:

- cleaned page images;
- searchable OCR text;
- page thumbnails;
- detected project records;
- caption-to-project links;
- private plan/photo references;
- private 2D/3D study reconstruction inputs.

### Dev / Maintainer Mode

The maintainer/dev mode can keep deeper private research packages for internal
analysis and tool development. These packages remain behind access control and
must not be promoted to public assets without a rights gate.

## Processing Pipeline

```text
Book photos / scans / PDFs
  -> quarantine intake
  -> page cleanup
  -> OCR and layout detection
  -> caption / index / project detection
  -> project clustering
  -> private Entry drafts
  -> rights gate
  -> public-safe summary candidate
```

## Page Cleanup

The first tool should produce a clean private digital study copy:

- deskew pages;
- crop page boundaries;
- split double-page spreads;
- normalize contrast and white balance;
- remove phone shadows where possible;
- detect blur and ask for a better photo if needed;
- preserve original file hashes for provenance.

Outputs:

```text
archive-intake/books/{book_slug}/original/
archive-intake/books/{book_slug}/clean-pages/
archive-intake/books/{book_slug}/ocr/
archive-intake/books/{book_slug}/layout/
```

## Project Extraction

The extraction tool should look for:

- project titles;
- architect names;
- year/date ranges;
- place names;
- captions next to images or plans;
- chapter headings;
- indexes and project lists;
- recurring image groups belonging to the same project.

The first output is not a live entry. It is a review pack:

```text
out/book-ingestion/{book_slug}/detected-projects.json
out/book-ingestion/{book_slug}/source-map.json
out/book-ingestion/{book_slug}/review-report.md
```

Each detected project should include confidence and page references:

```json
{
  "title": "Example Project",
  "architects": ["Example Architect"],
  "year": 1968,
  "page_refs": [42, 43, 118],
  "source_confidence": 0.78,
  "public_display": "metadata_only",
  "private_assets": ["clean-pages/page-042.png"]
}
```

## Rights Gate

Every extracted object gets two versions:

1. **Private source package**: keeps book-derived scans, OCR and page
   references for the owning user.
2. **Public-safe candidate**: keeps only bibliographic references, metadata,
   paraphrased analysis and allowed assets.

Public-safe candidates can enter the normal review queue. Private source
packages must never be copied into the public R2/public Atlas path.

## Future Website UI

KosmoData should eventually expose three book-related modes:

- `Book Scan`: upload phone photos or scans and create a clean digital book.
- `Book PDF`: ingest a PDF and run OCR/layout/project extraction.
- `Book Projects`: review detected projects and decide whether to keep them
  private, submit a public-safe draft, or merge with an existing entry.

For guest users, this should be limited to review submissions without private
persistent storage. For signed-in users, it becomes part of their private
library. For dev mode, it can feed the deeper internal research and model
pipeline.

## Non-Goals For V1

- no public display of copyrighted pages;
- no automatic public publishing;
- no bypass of publishers or library licenses;
- no live OCR/backend implementation in the static frontend;
- no guarantee that generated 2D/3D models are public-safe without review.

## First Implementation Step

The local preview command is:

```bash
npm run kosmodata:book-ingest -- --input archive-inbox/books/villa-savoye-book --title "Villa Savoye Source Book"
```

Optional project hints can be provided when filenames/OCR are weak:

```bash
npm run kosmodata:book-ingest -- \
  --input archive-inbox/books/villa-savoye-book \
  --title "Villa Savoye Source Book" \
  --project "Villa Savoye"
```

The command only creates local review output and remains gitignored. It writes:

```text
out/book-ingestion/{book_slug}/book-manifest.json
out/book-ingestion/{book_slug}/detected-projects.json
out/book-ingestion/{book_slug}/source-map.json
out/book-ingestion/{book_slug}/review-report.md
```

It does not run a real OCR engine yet and does not clean images yet; V1 is a
safe classifier/review-pack generator. The public website can show the planned
capability in the Database/KosmoData UI without accepting real uploads until
authentication, storage quotas and rights review are ready.

Smoke test:

```bash
npm run kosmodata:book-ingest:smoke
```

The smoke test creates a tiny gitignored fixture in `archive-inbox/books/`,
runs the local ingest and asserts that the output remains private, metadata-only
and review-pack based.
