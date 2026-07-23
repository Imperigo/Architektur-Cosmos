import { useEffect, useRef } from 'react';
import type { RefEntry } from '@kosmo/data';
import './data.css';
import { ladeEigenesBildInRuntime, ladeHeroBild, tuschePfade, useDataRuntime } from './data-runtime';

/**
 * K1 (v0.6.8, «KosmoData sichtbar») — das Hero-Bild einer Referenz,
 * lokal-first über den Laufzeit-Blob-Store (`data-runtime.ts`):
 *
 *  - Geladen wird on-demand: erst wenn die Karte tatsächlich ins Sichtfeld
 *    kommt (IntersectionObserver), nie auf Vorrat für 112 Karten.
 *  - Liegt das Bild lokal (Objekt-URL im Store), zeigt es ein `<img>`.
 *  - Sonst der deterministische Tusche-Platzhalter je Typologie
 *    (Strichpiktogramm, monochrom, aus der Referenz-Id gehasht) — trägt den
 *    W4-Vertrag `data-testid="karte-leerbild"` weiter (das SVG-Signet).
 *  - Ehrlichkeit statt kaputtem `<img>`: ohne `hero` steht «kein Bild
 *    hinterlegt» (W4-Wortlaut), mit nicht ladbarem/nicht erlaubtem `hero`
 *    steht «Bild nicht lokal — Quelle: <domain>».
 *
 * PC5 (v0.8.4, `docs/V084-SPEZ.md` §8 C-21): `quelle:'eigen'`-Referenzen
 * (`data-runtime.ts` `istEigeneReferenz`) haben nie ein `hero`-Feld aus dem
 * Import — ihr Bild kommt stattdessen ausschliesslich aus dem eigenen
 * Upload-Store (`ladeEigenesBildInRuntime`/`speichereEigenesBild`). Beide
 * Wege schreiben denselben Laufzeit-Zustand (`status:'lokal'`), darum
 * braucht die Anzeige unten (das `<img>`) keine Fallunterscheidung — nur
 * WELCHER Ladeweg beim Sichtbarwerden angestossen wird, unterscheidet sich.
 * Dieselbe Komponente bedient darum sowohl den Dossier-Slot als auch den
 * Tabellen-Mini-Thumb (`ReferenzTabelle.tsx` ruft sie bereits auf) — kein
 * zusätzlicher Verdrahtungsort nötig.
 */
export function RefHeroBild({
  entry,
  signetGroesse = 34,
  zeigeQuelle = true,
}: {
  entry: Pick<RefEntry, 'id' | 'title' | 'hero' | 'entry_type'> & { quelle?: string };
  /** Breite des Piktogramms in px (Karte klein, Dossier grösser). */
  signetGroesse?: number;
  /** Ehrliche Quellen-/Leer-Zeile unter dem Signet (Karte + Dossier). */
  zeigeQuelle?: boolean;
}) {
  const zustand = useDataRuntime((s) => s.bilder[entry.id]);
  const hero = entry.hero ?? null;
  const eigen = entry.quelle === 'eigen';
  const halter = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = halter.current;
    if (!el || (!hero && !eigen)) return;
    // On-demand: der Abruf startet erst, wenn die Kachel sichtbar wird.
    // Eigene Referenzen bevorzugen IMMER den eigenen Upload-Store — ein
    // `hero`-Feld (falls ein Import es doch mitbrächte) wird für sie nicht
    // versucht, damit für eigene Einträge nie ein externes Netz angefragt wird.
    const laden = () => {
      if (eigen) void ladeEigenesBildInRuntime(entry.id);
      else if (hero) void ladeHeroBild(entry.id, hero);
    };
    if (typeof IntersectionObserver === 'undefined') {
      laden();
      return;
    }
    const io = new IntersectionObserver((beobachtet) => {
      if (beobachtet.some((b) => b.isIntersecting)) {
        io.disconnect();
        laden();
      }
    });
    io.observe(el);
    return () => io.disconnect();
  }, [entry.id, hero, eigen]);

  if ((hero || eigen) && zustand?.status === 'lokal') {
    return <img src={zustand.objectUrl} alt="" className="kd-hero-bild" data-testid="ref-hero-bild-img" />;
  }

  const zeile = !hero
    ? 'kein Bild hinterlegt'
    : zustand?.status === 'nichtLokal'
      ? `Bild nicht lokal — Quelle: ${zustand.quelle}`
      : 'Bild wird geprüft …';

  return (
    <div ref={halter} data-testid="ref-bild-platzhalter" className="kd-hero-platzhalter">
      <svg
        data-testid="karte-leerbild"
        aria-hidden="true"
        viewBox="0 0 48 34"
        width={signetGroesse}
        height={Math.round((signetGroesse * 34) / 48)}
        fill="none"
        stroke="var(--k-ink-faint)"
        strokeWidth={1.4}
        strokeLinejoin="round"
        strokeLinecap="round"
        className="kd-leerbild-signet"
      >
        {tuschePfade(entry.id, entry.entry_type).map((d, i) => (
          <path key={i} d={d} />
        ))}
      </svg>
      {zeigeQuelle && (
        // P-U (0.9.2, Befund ROADMAP 618): einzeilig mit Ellipsis statt
        // Zeichenumbruch (data.css `.kd-hero-quelle`) — `title` trägt den
        // Volltext weiter, auch wenn die Zelle (z. B. die 40px-OBJEKT-Spalte
        // der Referenzen-Tabelle) ihn beschneidet.
        <span data-testid="ref-bild-quelle" className="kd-hero-quelle" title={zeile}>
          {zeile}
        </span>
      )}
    </div>
  );
}
