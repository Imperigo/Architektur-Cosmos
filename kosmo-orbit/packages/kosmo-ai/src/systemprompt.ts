import type { KosmoDoc } from '@kosmo/kernel';
import type { Zone, Opening } from '@kosmo/kernel';

/**
 * Systemprompt-Bauer (v0.8.1 KI2, `docs/V081-SPEZ.md` §3 Kandidat 4) — löst die
 * bisherige, ungebremste String-Konkat ab (Persona + `journal.toPromptBlock`
 * + Dossier + Rolle, verstreut über `chat.ts` und `KosmoPanel.tsx:726`) durch
 * einen reinen, testbaren Bauer mit Priorisierung und Token-Budget.
 */

/**
 * Grobe, EHRLICH dokumentierte Tokenschätzung: ~4 Zeichen ≈ 1 Token. Das ist
 * KEIN echter Tokenizer (der wäre ein unnötiges Bundle-Gewicht für dieses
 * kleine Paket) — für eine Kappungs-Heuristik im Systemprompt reicht die
 * Näherung: deutscher Fliesstext liegt bei den gängigen Tokenizern (Claude,
 * GPT) meist zwischen 3.3 und 4.2 Zeichen/Token. Die Schätzung darf ruhig
 * knapp daneben liegen — sie entscheidet nur, welcher NIEDRIG priorisierte
 * Block als erstes fällt, nicht ob der Prompt technisch noch passt.
 */
const ZEICHEN_PRO_TOKEN = 4;

export function schaetzeTokens(text: string): number {
  const t = text.trim();
  return t ? Math.ceil(t.length / ZEICHEN_PRO_TOKEN) : 0;
}

/** Ein benannter Prompt-Baustein. `label` ist NUR für Tests/Diagnose — kein Teil des ausgegebenen Texts. */
export interface SystemPromptBlock {
  label: string;
  text: string;
}

export interface SystemPromptOptionen {
  /** Token-Budget für ALLE `bloecke` zusammen (der `basis`-Text zählt nicht mit — er ist Identität, nie verhandelbar). */
  tokenBudget?: number;
}

/**
 * Grosszügig genug für den Alltag (Journal max. 8 Einträge + Dossier max. 20
 * Zeilen + eine Rollen-Zeile passen bequem darunter) — kappt erst bei
 * künstlich grossen Eingaben (sehr langer Dossier-Freitext, geflutetes
 * Journal). Bewusst grösser als das reine Nötige: die Kappung ist ein
 * Sicherheitsnetz, kein alltägliches Werkzeug.
 */
export const STANDARD_TOKEN_BUDGET = 1500;

/**
 * baueSystemprompt — `basis` (typischerweise der Persona-Systemprompt) bleibt
 * IMMER vollständig erhalten. `bloecke` werden GENAU in der übergebenen
 * Reihenfolge geprüft — die Reihenfolge IST die Priorität, wichtigstes
 * zuerst (Owner-Vorgabe: Kritik-Journal > Dossier-NO-GOs > Rolle > Kontext).
 * Ein Block, der nicht mehr ins Budget passt, fällt ERSATZLOS weg (keine
 * Teilkürzung mitten im Satz — ein abgeschnittener NO-GO wäre schlimmer als
 * ein fehlender). Kein Abbruch bei der ersten Überschreitung: ein SPÄTERER,
 * kleinerer Block (z.B. die kurze Rollen-Zeile) darf einen früheren,
 * übergrossen Block (z.B. ein ausuferndes Dossier) überholen — einfaches
 * Bin-Packing, keine starre Kaskade.
 */
export function baueSystemprompt(
  basis: string,
  bloecke: readonly SystemPromptBlock[],
  optionen?: SystemPromptOptionen,
): string {
  const budget = optionen?.tokenBudget ?? STANDARD_TOKEN_BUDGET;
  let rest = budget;
  const genommen: string[] = [];
  for (const block of bloecke) {
    const text = block.text.trim();
    if (!text) continue;
    const kosten = schaetzeTokens(text);
    if (kosten > rest) continue;
    genommen.push(text);
    rest -= kosten;
  }
  return genommen.length > 0 ? `${basis}\n\n${genommen.join('\n\n')}` : basis;
}

/**
 * Wettbewerbsdossier als Prompt-Block (Phase 0), NO-GOs zuerst — aus dem Doc
 * abgeleitet (`doc.settings.dossier`), nicht mehr aus der App herausgereicht.
 * Rein & testbar gegen ein Fixture-Doc.
 */
export function dossierBlock(doc: KosmoDoc, max = 20): string {
  const dossier = doc.settings.dossier;
  if (!dossier || dossier.length === 0) return '';
  const zeile = (t: { typ: string; text: string }) =>
    t.typ === 'dont' ? `- NO-GO: ${t.text}` : t.typ === 'do' ? `- GEFORDERT: ${t.text}` : `- FAKT: ${t.text}`;
  const sortiert = [...dossier].sort(
    (a, b) => (a.typ === 'dont' ? 0 : a.typ === 'do' ? 1 : 2) - (b.typ === 'dont' ? 0 : b.typ === 'do' ? 1 : 2),
  );
  return `Wettbewerbsdossier dieses Projekts (bindend):\n${sortiert.slice(0, max).map(zeile).join('\n')}`;
}

/** Arbeitsrolle als Prompt-Block — aus dem Doc (`doc.settings.rolle`). */
export function rolleBlock(doc: KosmoDoc): string {
  const rolle = doc.settings.rolle;
  if (!rolle) return '';
  const fokus = {
    entwurf: 'Volumen, Grundrisse, Kennzahlen, Varianten und Referenzen zuerst.',
    ausfuehrung: 'Werkpläne, Details, Mengen/Ausmass und Umbau-Status zuerst.',
    admin: 'Projektstand, Diagnose, Datenpflege und Exporte zuerst.',
  }[rolle];
  return `Arbeitsrolle des Menschen: ${rolle} — ${fokus}`;
}

/**
 * Reicherer Modellkontext (Kandidat 5, `docs/V081-SPEZ.md` §3): kurze
 * Projekt/Räume/Öffnungen-Zusammenfassung, tiefste Priorität («Kontext») —
 * die erste, die bei Platzmangel fällt. Leer, wenn das Doc noch nichts trägt
 * (frisches Projekt) — kein leerer Deko-Satz im Prompt.
 */
export function projektKontextBlock(doc: KosmoDoc): string {
  const storeys = doc.storeysOrdered();
  const raeume = doc.byKind<Zone>('zone').filter((z) => !z.zonenArt);
  const oeffnungen = doc.byKind<Opening>('opening');
  if (storeys.length === 0 && raeume.length === 0 && oeffnungen.length === 0) return '';
  const projekt = doc.settings.projectName || 'Unbenannt';
  return `Projekt-Kontext: «${projekt}», ${storeys.length} Geschoss(e), ${raeume.length} Raum/Räume, ${oeffnungen.length} Öffnung(en).`;
}
