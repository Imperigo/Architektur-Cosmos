import type { SystemPromptBlock } from './systemprompt';

/**
 * v0.8.3/P1 (§5.4, `docs/V083-SPEZ.md`) — Kosmo-seitige Skill-Spiegelung,
 * Signatur in P0 eingefroren. Ein `SkillMeta` ist EIN knapper, benannter
 * Kosmo-Betriebsmuster-Eintrag — nicht zu verwechseln mit den kuratierten
 * `.claude/skills/**`-Dateien (jene sind für den Claude-Code-Betrieb an
 * DIESEM Repo gedacht, s. `.claude/skills/QUELLEN.md`). `skills.ts` liefert
 * Kosmos eigene, kompakte Betriebsmuster-Liste für den Systemprompt — z.B.
 * künftig „Dossier-NO-GOs zuerst prüfen“, „Commands statt Freitext
 * vorschlagen“, „Ablehnung protokollieren statt stumm verwerfen“. Die
 * tatsächliche Kuratierung dieser Kosmo-Skills UND die Verdrahtung in
 * `chat.ts` ist Sache von P7 (W2) — P1 friert nur Typ + Bauer-Signatur ein
 * (Trennschärfe-Beweis: `grep skillBlock chat.ts` liefert in W1 nichts).
 */
export interface SkillMeta {
  readonly id: string;
  readonly titel: string;
  readonly kurzbeschreibung: string;
}

/**
 * Baut EINEN `SystemPromptBlock` (Label `'skills'`) aus den geladenen
 * Kosmo-Skills — dasselbe Signatur-Muster wie jeder andere Blockbauer
 * (vgl. `dossierBlock`/`rolleBlock`/`projektKontextBlock`, `chat.ts:180-182`):
 * rein, deterministisch, KEIN Deko-Text, wenn nichts zu zeigen ist. Damit
 * reiht sich `skillBlock()` verlustfrei in die additive `extraBloecke?`-Kette
 * ein (§6.4/E6) — ein leerer Text fällt in `baueSystemprompt()` automatisch
 * weg (`systemprompt.ts:69`), ohne dass dieser Bauer selbst etwas
 * Sonderfall-Logik braucht.
 *
 * Einträge ohne Titel/Kurzbeschreibung werden übersprungen (kein leerer
 * Aufzählungspunkt) — dieselbe Ehrlichkeits-Disziplin wie die übrigen
 * Blockbauer in `systemprompt.ts`, die bei leerem Doc-Inhalt `''` statt
 * eines Deko-Satzes liefern.
 */
export function skillBlock(skills: readonly SkillMeta[]): SystemPromptBlock {
  const geladen = skills.filter((s) => s.titel.trim().length > 0 && s.kurzbeschreibung.trim().length > 0);
  if (geladen.length === 0) return { label: 'skills', text: '' };
  const zeilen = geladen.map((s) => `- ${s.titel}: ${s.kurzbeschreibung}`);
  return {
    label: 'skills',
    text: `Verfügbare Kosmo-Betriebsmuster (Skills):\n${zeilen.join('\n')}`,
  };
}
