import { z } from 'zod';

/**
 * `.kxp`-Hyper-Modell-Paket + Trust-Layer (v0.8.1 / P11, `docs/V081-SPEZ.md`
 * §7(a)/§9 C-29). Struktur analog zum bestehenden `.kosmo`-Projektpaket
 * (`packages/kosmo-contracts/src/kosmo-package.ts` + `state/project-io.ts`,
 * Zip mit Manifest + Payload), aber ein EIGENES, schlankeres Format: ein
 * `.kxp` ist ein exportierter, read-only zu betrachtender Auszug EINES
 * Standes («Hyper-Modell» = Modell + gerenderte Pläne unter einem Dach),
 * kein editierbares Live-Projekt.
 *
 * Ehrlichkeit vor Politur (Owner-Auftrag, `docs/V-NAECHSTE-KANDIDATEN.md:65`,
 * `docs/V080-PLANKOPF-SPEZ.md` §8 «Braucht Viewer-Runtime, Signatur-
 * Infrastruktur, Konten/Empfänger — HomeStation»): der Trust-Layer-Teil, der
 * hier container-baubar ist, ist die STRUKTUR (Signatur-Slot, Freigabe-
 * Zustandsmaschine, Verlaufsprotokoll) — NICHT eine echte Signatur oder eine
 * echte Mehrbenutzer-Freigabe. `KxpSignatur.signiert` ist im Container IMMER
 * `false`; die Freigabe-Zustandsmaschine läuft lokal mit Platzhalter-Rollen
 * (`KXP_PLATZHALTER_ROLLEN`) statt echten Konten — s. Kommentar an
 * `KxpVerlaufEintrag.akteur` unten.
 */

export const KXP_SCHEMA = 'kosmo.kxp/v1' as const;

/** Freigabe-Zustände (Spez §7(a): «Entwurf → Zur Freigabe → Freigegeben»,
 *  plus `abgelehnt` als ehrlicher Rückweg — ein Trust-Layer ohne Ablehnung
 *  wäre keine echte Prüfung, nur ein Durchwinken). */
export const KxpFreigabeStatusSchema = z.enum(['entwurf', 'zur_freigabe', 'freigegeben', 'abgelehnt']);
export type KxpFreigabeStatus = z.infer<typeof KxpFreigabeStatusSchema>;

export const KXP_STATUS_LABEL: Record<KxpFreigabeStatus, string> = {
  entwurf: 'Entwurf',
  zur_freigabe: 'Zur Freigabe',
  freigegeben: 'Freigegeben',
  abgelehnt: 'Abgelehnt',
};

/**
 * Platzhalter-Rollen (KEINE echten Konten/Identitäten — Owner-Auftrag
 * «Gerüst zeigt den Ablauf ehrlich mit Platzhalter-Rollen, ohne eine echte
 * Multi-User-Infrastruktur vorzutäuschen»). Die Auswahl ist eine feste,
 * lokale Liste statt eines Freitext-Feldes — ein Freitext-«Name» sähe wie
 * eine echte Unterschrift aus, das hier ist bewusst nur eine Rollen-Marke.
 */
export const KXP_PLATZHALTER_ROLLEN = ['Ersteller (lokal)', 'Prüfer (Platzhalter)', 'Freigeber (Platzhalter)'] as const;
export type KxpPlatzhalterRolle = (typeof KXP_PLATZHALTER_ROLLEN)[number];

/** Ein Verlaufseintrag der Freigabe-Zustandsmaschine — Muster identisch zu
 *  `JournalEntry` (`packages/kosmo-kernel/src/commands/core.ts`: Zeitstempel
 *  + Akteur + was passiert ist), hier für den Trust-Layer statt für Doc-
 *  Commands. */
export const KxpVerlaufEintragSchema = z.object({
  ts: z.string(),
  von: KxpFreigabeStatusSchema.nullable(),
  nach: KxpFreigabeStatusSchema,
  /** Platzhalter-Rolle, NIE ein echter Kontoname — s. Kopfkommentar. */
  akteur: z.string(),
  notiz: z.string().optional(),
});
export type KxpVerlaufEintrag = z.infer<typeof KxpVerlaufEintragSchema>;

/** Signatur-Slot — Struktur angelegt, aber im Container ehrlich unsigniert.
 *  `signiert` ist als literal `false` typisiert: es gibt in dieser Umgebung
 *  keinen Code-Pfad, der ihn auf `true` setzen könnte (kein Konto, kein
 *  Signatur-Schlüssel) — das Feld existiert, damit ein künftiger echter
 *  Signatur-Baustein (HomeStation/Konto) strukturell andocken kann, ohne
 *  das Format zu brechen. */
export const KxpSignaturSchema = z.object({
  signiert: z.literal(false),
  hinweis: z
    .string()
    .default('unsigniert — Trust-Layer braucht Konten/HomeStation'),
});
export type KxpSignatur = z.infer<typeof KxpSignaturSchema>;

export const KxpTrustSchema = z.object({
  status: KxpFreigabeStatusSchema.default('entwurf'),
  verlauf: z.array(KxpVerlaufEintragSchema).default([]),
  signatur: KxpSignaturSchema.prefault({ signiert: false, hinweis: 'unsigniert — Trust-Layer braucht Konten/HomeStation' }),
});
export type KxpTrust = z.infer<typeof KxpTrustSchema>;

export const KxpManifestSchema = z.object({
  schema: z.literal(KXP_SCHEMA).default(KXP_SCHEMA),
  id: z.string(),
  name: z.string(),
  /** Herkunfts-Projekt, aus dem exportiert wurde (nur Kennzeichnung — kein
   *  Bezug zu einem Konto). */
  quelle_projekt: z.object({ id: z.string(), name: z.string() }),
  exportiert_um: z.string(),
  contents: z
    .object({
      model: z.string().default('model/model.json'),
      journal: z.string().optional(),
      /** Dateinamen der gebündelten Plan-SVGs (relativ zu `plans/`), leer
       *  wenn das Quellprojekt noch keine Blätter hat — kein Attrappen-Eintrag. */
      plaene: z.array(z.string()).default([]),
    })
    .prefault({}),
  trust: KxpTrustSchema.prefault({
    status: 'entwurf',
    verlauf: [],
    signatur: { signiert: false, hinweis: 'unsigniert — Trust-Layer braucht Konten/HomeStation' },
  }),
});
export type KxpManifest = z.infer<typeof KxpManifestSchema>;

/**
 * Erlaubte Übergänge der Freigabe-Zustandsmaschine (Spez §7(a)). `freigegeben`
 * ist im Gerüst terminal (ein Widerruf einer echten Freigabe wäre selbst ein
 * Governance-Vorgang, der ein Konto braucht); `abgelehnt` erlaubt ehrlich den
 * Rückweg in die Bearbeitung oder eine erneute Vorlage.
 */
export const KXP_UEBERGAENGE: Record<KxpFreigabeStatus, readonly KxpFreigabeStatus[]> = {
  entwurf: ['zur_freigabe'],
  zur_freigabe: ['freigegeben', 'abgelehnt', 'entwurf'],
  freigegeben: [],
  abgelehnt: ['entwurf', 'zur_freigabe'],
};

export function kxpErlaubteUebergaenge(status: KxpFreigabeStatus): readonly KxpFreigabeStatus[] {
  return KXP_UEBERGAENGE[status];
}

export type KxpUebergangResult = { ok: true; trust: KxpTrust } | { ok: false; fehler: string };

/**
 * Reine Funktion: wendet EINEN Übergang auf `trust` an, hängt einen
 * Verlaufseintrag an. Wirft nie — ein nicht erlaubter Übergang liefert
 * `{ok:false}` statt eines stillen No-ops oder eines Absturzes (dieselbe
 * Ehrlichkeits-Regel wie `parseKosmoSafe`/`safeJsonParse`).
 */
export function kxpUebergangAnwenden(
  trust: KxpTrust,
  nach: KxpFreigabeStatus,
  akteur: string,
  notiz?: string,
  ts: string = new Date().toISOString(),
): KxpUebergangResult {
  const erlaubt = kxpErlaubteUebergaenge(trust.status);
  if (!erlaubt.includes(nach)) {
    return {
      ok: false,
      fehler: `Übergang «${KXP_STATUS_LABEL[trust.status]} → ${KXP_STATUS_LABEL[nach]}» ist nicht erlaubt.`,
    };
  }
  if (!akteur.trim()) {
    return { ok: false, fehler: 'Platzhalter-Rolle fehlt — ein Übergang braucht eine gewählte Rolle.' };
  }
  const eintrag: KxpVerlaubEintragMitOptionalerNotiz = {
    ts,
    von: trust.status,
    nach,
    akteur,
    ...(notiz !== undefined && notiz.trim() ? { notiz: notiz.trim() } : {}),
  };
  return {
    ok: true,
    trust: { ...trust, status: nach, verlauf: [...trust.verlauf, eintrag] },
  };
}

// Nur ein lokaler Hilfstyp, damit der bedingte Notiz-Spread oben
// `exactOptionalPropertyTypes`-sauber bleibt (Feld ist optional, nie `undefined`-wertig).
type KxpVerlaubEintragMitOptionalerNotiz = KxpVerlaufEintrag;
