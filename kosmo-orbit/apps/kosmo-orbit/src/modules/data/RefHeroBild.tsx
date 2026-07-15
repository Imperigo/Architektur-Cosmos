import { useEffect, useRef } from 'react';
import type { RefEntry } from '@kosmo/data';
import './data.css';
import { ladeHeroBild, tuschePfade, useDataRuntime } from './data-runtime';

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
 */
export function RefHeroBild({
  entry,
  signetGroesse = 34,
  zeigeQuelle = true,
}: {
  entry: Pick<RefEntry, 'id' | 'title' | 'hero' | 'entry_type'>;
  /** Breite des Piktogramms in px (Karte klein, Dossier grösser). */
  signetGroesse?: number;
  /** Ehrliche Quellen-/Leer-Zeile unter dem Signet (Karte + Dossier). */
  zeigeQuelle?: boolean;
}) {
  const zustand = useDataRuntime((s) => s.bilder[entry.id]);
  const hero = entry.hero ?? null;
  const halter = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = halter.current;
    if (!hero || !el) return;
    // On-demand: der Abruf startet erst, wenn die Kachel sichtbar wird.
    if (typeof IntersectionObserver === 'undefined') {
      void ladeHeroBild(entry.id, hero);
      return;
    }
    const io = new IntersectionObserver((beobachtet) => {
      if (beobachtet.some((b) => b.isIntersecting)) {
        io.disconnect();
        void ladeHeroBild(entry.id, hero);
      }
    });
    io.observe(el);
    return () => io.disconnect();
  }, [entry.id, hero]);

  if (hero && zustand?.status === 'lokal') {
    return <img src={zustand.objectUrl} alt="" className="kd-hero-bild" />;
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
        <span data-testid="ref-bild-quelle" className="kd-hero-quelle">
          {zeile}
        </span>
      )}
    </div>
  );
}
