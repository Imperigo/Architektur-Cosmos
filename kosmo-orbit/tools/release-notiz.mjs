#!/usr/bin/env node
/**
 * Obsidian-Release-Notiz-Automat (Owner-Auftrag v0.6.2: «bei jedem Update
 * pushe alles auf git, obsidian und die neuste Installer-Version …»). Der
 * Git-Teil ist bereits der bestehende Arbeitsfluss (siehe `CLAUDE.md`
 * „Arbeitsmuster"), die Installer-Links sind über den stabilen
 * `desktop-latest`-Tag dauerhaft aktuell (siehe `docs/RELEASE-ABLAUF.md`) —
 * dieses Skript schliesst die dritte Lücke: eine Vault-Notiz je Release,
 * automatisch aus `ROADMAP.md` gebaut.
 *
 * Reines Node, KEINE npm-Dependency (gleiches Muster wie
 * `tools/secret-scan.mjs`) — läuft auch offline/air-gapped.
 *
 * Liest:
 *   - Version aus `kosmo-orbit/package.json`
 *   - Einträge aus `kosmo-orbit/ROADMAP.md` ab einer Start-Nummer (`--von N`)
 *     (nummerierte Zeilen `N. **Titel** …`, wie in der gesamten ROADMAP)
 *
 * Schreibt/aktualisiert:
 *   `wissen/vault/Releases/Release-<version>-<datum>.md`
 *   (Frontmatter + Wikilinks im Stil von `wissen/vault/LoRA/LoRA-Uebersicht.md`)
 *
 * Aufruf:
 *   node tools/release-notiz.mjs --von 213 [--datum 2026-07-08]
 */

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));

/** `kosmo-orbit/` — Wurzel dieses Workspace. */
export const kosmoOrbitRoot = path.resolve(here, '..');
/** Repo-Wurzel (Geschwister von `kosmo-orbit/`, enthält `wissen/vault`). */
export const repoRoot = path.resolve(kosmoOrbitRoot, '..');

// Jede ROADMAP-Zeile eines Eintrags beginnt mit "N. **Titel** …" — der Titel
// endet an der ERSTEN schliessenden "**" (nicht-gierig), auch wenn der
// restliche Text selbst weitere Bold-Abschnitte enthält.
const ENTRY_RE = /^(\d+)\.\s+\*\*(.+?)\*\*\s*(.*)$/;

/** Minimaler `--key value` / `--flag`-Parser, keine Dependency nötig. */
export function parseArgs(argv) {
  const args = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (!a.startsWith('--')) continue;
    const key = a.slice(2);
    const next = argv[i + 1];
    if (next !== undefined && !next.startsWith('--')) {
      args[key] = next;
      i++;
    } else {
      args[key] = true;
    }
  }
  return args;
}

/** Parst alle nummerierten ROADMAP-Einträge aus dem Rohtext (reine Funktion). */
export function parseRoadmapEintraege(text) {
  const eintraege = [];
  for (const line of text.split('\n')) {
    const m = line.match(ENTRY_RE);
    if (!m) continue;
    eintraege.push({ nummer: Number(m[1]), titel: m[2].trim(), text: line.trim() });
  }
  return eintraege;
}

/** Alle Einträge mit Nummer ≥ `von`, aufsteigend sortiert. */
export function eintraegeAb(eintraege, von) {
  return eintraege.filter((e) => e.nummer >= von).sort((a, b) => a.nummer - b.nummer);
}

/** Version aus `kosmo-orbit/package.json` (kein hartcodiertes Duplikat). */
export function liesVersion(root = kosmoOrbitRoot) {
  const pkg = JSON.parse(readFileSync(path.join(root, 'package.json'), 'utf8'));
  return pkg.version;
}

/** `YYYY-MM-DD`, testbar über den optionalen `Date`-Parameter. */
export function heutigesDatum(d = new Date()) {
  return d.toISOString().slice(0, 10);
}

/**
 * Baut den Notiz-Text: Frontmatter + Wikilink-Fliesstext im Stil von
 * `wissen/vault/LoRA/LoRA-Uebersicht.md` (kurzer Obsidian-Einstieg, keine
 * Doppelung der ROADMAP, aber der Volltext bleibt greifbar).
 */
export function baueReleaseNotiz({ version, datum, eintraege, von }) {
  const letzte = eintraege.length > 0 ? eintraege[eintraege.length - 1].nummer : von;
  const titelListe =
    eintraege.length > 0
      ? eintraege.map((e) => `- **${e.nummer}.** ${e.titel}`).join('\n')
      : '_Keine ROADMAP-Einträge ab dieser Nummer gefunden._';
  const volltext = eintraege.map((e) => `### ${e.nummer}\n\n${e.text}\n`).join('\n');

  const frontmatter = [
    '---',
    `titel: "Release ${version}"`,
    `tags: [release, "v${version}"]`,
    'status: "veroeffentlicht"',
    `erstellt: "${datum}"`,
    'verwandt: ["[[Release-Ablauf]]"]',
    '---',
    ''
  ].join('\n');

  const body = `# Release ${version}

Automatisch erzeugt aus \`ROADMAP.md\` (Einträge ab **${von}**) von
\`kosmo-orbit/tools/release-notiz.mjs\` — Teil des Release-Ablaufs
[[Release-Ablauf]] (Owner-Auftrag v0.6.2: «bei jedem Update pushe alles auf
git, obsidian und die neuste Installer-Version zum Herunterladen auf der
Website»).

## Enthaltene ROADMAP-Einträge (${von}–${letzte})

${titelListe}

## Installer

Stabile Download-Links (immer der zuletzt gebaute Installer, drei Editionen ×
drei Plattformen): [[Release-Ablauf]] Abschnitt 4, live auf
architekturkosmos.ch/orbit — sobald die Website-Änderung selbst auf \`main\`
liegt (siehe [[Release-Ablauf]] Abschnitt 6, DEPLOYMENT.md).

## Volltext je Eintrag

${volltext}
`;

  return frontmatter + body;
}

/** Ziel-Pfad der Vault-Notiz (Geschwister-Verzeichnis von `kosmo-orbit/`). */
export function zielPfad({ root = repoRoot, version, datum }) {
  return path.join(root, 'wissen', 'vault', 'Releases', `Release-${version}-${datum}.md`);
}

/**
 * Liest Version + ROADMAP, baut die Notiz und schreibt sie. Legt den Ordner
 * `wissen/vault/Releases/` an, falls er noch nicht existiert. Gibt Metadaten
 * zurück statt nur Seiteneffekte — macht den Aufruf testbar.
 */
export function schreibeReleaseNotiz({ root = repoRoot, kosmoOrbitRootPfad = kosmoOrbitRoot, von, datum } = {}) {
  if (!von || !Number.isFinite(von)) {
    throw new Error('schreibeReleaseNotiz: --von muss eine ROADMAP-Eintragsnummer sein.');
  }
  const version = liesVersion(kosmoOrbitRootPfad);
  const wirklichesDatum = datum ?? heutigesDatum();
  const roadmapText = readFileSync(path.join(kosmoOrbitRootPfad, 'ROADMAP.md'), 'utf8');
  const alle = parseRoadmapEintraege(roadmapText);
  const eintraege = eintraegeAb(alle, von);
  const inhalt = baueReleaseNotiz({ version, datum: wirklichesDatum, eintraege, von });
  const ziel = zielPfad({ root, version, datum: wirklichesDatum });
  mkdirSync(path.dirname(ziel), { recursive: true });
  writeFileSync(ziel, inhalt, 'utf8');
  return { ziel, version, datum: wirklichesDatum, anzahlEintraege: eintraege.length };
}

// ---------------------------------------------------------------------------
// CLI-Einstieg — nur wenn direkt ausgeführt (nicht beim Import in Tests).
// ---------------------------------------------------------------------------

const istCli = process.argv[1] && path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url));
if (istCli) {
  const args = parseArgs(process.argv.slice(2));
  const von = Number(args.von);
  if (!args.von || Number.isNaN(von)) {
    console.error('Aufruf: node tools/release-notiz.mjs --von <ROADMAP-Nummer> [--datum YYYY-MM-DD]');
    process.exit(1);
  }
  const datum = typeof args.datum === 'string' ? args.datum : undefined;
  const ergebnis = schreibeReleaseNotiz({ von, datum });
  console.log(
    `release-notiz.mjs: ${ergebnis.anzahlEintraege} Eintrag/Einträge (ab ${von}, v${ergebnis.version}) → ${path.relative(
      repoRoot,
      ergebnis.ziel,
    )}`,
  );
}
