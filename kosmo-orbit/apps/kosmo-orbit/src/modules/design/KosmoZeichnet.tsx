import { useEffect, useRef, useState } from 'react';
import type { AbspielSchritt } from '../../state/abspiel-anschluss';
import {
  meldeOverlayAn,
  useAbspielEbene,
  weltPfadeFuerSchritt,
  type AbspielSpur,
  type WeltPunkt,
} from '../../state/abspiel-ebene';
import './kosmo-zeichnet.css';

/**
 * KosmoZeichnet (v0.7.2 §7, Paket 06.8 Stufe 1 — Stream W3-E): das Overlay
 * über der PlanView, das Kosmos Paket-Schritte SICHTBAR zeichnet, BEVOR der
 * unveränderte atomare Apply läuft. Gemountet einmal in `DesignWorkspace.tsx`
 * (eine Zeile), gesteuert über `state/abspiel-ebene.ts` (Spur-Store) —
 * `KosmoPanel.tsx`/`App.tsx` bleiben unangetastet (Merge-Gesetz §12).
 *
 * Darstellung je Schritt: SVG-Pfade (Welt-Geometrie aus params bzw.
 * Vorschau-Umkreisung, s. `weltPfadeFuerSchritt`) mit stroke-dasharray/
 * -dashoffset-Draw; der Orb (Teal-Kern r7 + Halo, `var(--k-signal)`) folgt
 * der Zeichenspitze via rAF + `getPointAtLength`, Tempo ≤ 3000 px/s
 * (Bildschirm), je Element 120ms Snap-Pause + Einmal-Puls; Kometen-Schweif
 * aus 3 Punkten; Etikett-Chip 8px neben dem Orb zeigt das Schritt-`summary`
 * (UPPERCASE Mono via CSS). Leertaste = Pause/Weiter, ESC (oder der
 * Stopp-Chip unten) = Stopp ⇒ das Vorspiel-Promise löst sofort auf.
 *
 * ── Verträge/Härte ──────────────────────────────────────────────────────
 * - `pointer-events: none` auf der ganzen Ebene — EINZIGE Ausnahme ist der
 *   Stopp/Pause-Chip (`.kz-bedienung`). Die ~40 Bestands-Specs, die
 *   `module-design` direkt klicken, laufen unter webdriver und sehen das
 *   Overlay ohnehin NIE (Gate in abspiel-ebene.ts) — aber selbst erzwungen
 *   fängt die Ebene keine Plan-Klicks.
 * - KEIN React-State pro Frame (Spec §0): Orb/Schweif/Dashoffset werden im
 *   rAF direkt als `style.transform`/`style.strokeDashoffset` geschrieben;
 *   React rendert nur die Hülle und den Pausen-Zustand des Chips.
 * - Das rAF prüft `prefers-reduced-motion` selbst je Frame (Spec §0) —
 *   kippt die Einstellung mitten im Abspiel, wird sofort gestoppt.
 * - Koordinaten: die Ebene liest die Welt→Bildschirm-Abbildung REIN LESEND
 *   aus dem DOM der PlanView (`svg[data-testid="planview"] > g[transform]`,
 *   `getScreenCTM()`) — kein Eingriff in `PlanView.tsx`. Fehlt die PlanView
 *   (reine 3D-Ansicht), wird die Schritt-Geometrie ehrlich zentriert in die
 *   Arbeitsfläche eingepasst (eigener Massstab, dokumentierte Grenze).
 */

const SVG_NS = 'http://www.w3.org/2000/svg';
/** Spec §7: Zeichentempo auf dem Bildschirm — hartes Maximum. */
const TEMPO_PX_S = 3000;
/** Untergrenze je Element, damit kurze Wände nicht «aufblitzen» (Tempo sinkt, steigt nie). */
const MIN_PFAD_MS = 320;
/** Spec §7: Snap-Pause je Element. */
const SNAP_PAUSE_MS = 120;
/** Schritte ohne zeichenbare Pfade: Orb pulsiert kurz mit Chip statt zu zeichnen. */
const OHNE_PFAD_MS = 600;
/** Abstand der 3 Kometen-Schweif-Punkte entlang des Pfads (px). */
const SCHWEIF_ABSTAND_PX = 14;
/** Ausblend-Dauer nach Promise-Auflösung (CSS-Transition `.kz-aus` + Puffer). */
const AUSBLENDEN_MS = 260;

function istFormularZiel(ziel: EventTarget | null): boolean {
  if (!(ziel instanceof HTMLElement)) return false;
  return (
    ziel.tagName === 'INPUT' ||
    ziel.tagName === 'TEXTAREA' ||
    ziel.tagName === 'SELECT' ||
    ziel.isContentEditable
  );
}

interface PixelPunkt {
  x: number;
  y: number;
}

/**
 * Welt (mm, Modell-Y) → Overlay-Pixel. Erster Weg: die echte PlanView-
 * Transformationskette über `getScreenCTM()` des Pan/Zoom-`<g>` (Welt wird
 * dort bei −y gezeichnet, s. PlanView.tsx). Fallback ohne PlanView:
 * zentriertes Einpassen aller Spur-Punkte in ~55% der Fläche.
 */
function baueAbbildung(wurzel: HTMLElement, allePunkte: readonly WeltPunkt[]): (p: WeltPunkt) => PixelPunkt {
  const rect = wurzel.getBoundingClientRect();
  const planSvg = document.querySelector<SVGSVGElement>('svg[data-testid="planview"]');
  const panZoomG = planSvg?.querySelector<SVGGElement>(':scope > g[transform]') ?? null;
  const ctm = panZoomG && typeof panZoomG.getScreenCTM === 'function' ? panZoomG.getScreenCTM() : null;
  if (ctm) {
    return (p) => ({
      x: ctm.a * p.x + ctm.c * -p.y + ctm.e - rect.left,
      y: ctm.b * p.x + ctm.d * -p.y + ctm.f - rect.top,
    });
  }
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const p of allePunkte) {
    minX = Math.min(minX, p.x);
    maxX = Math.max(maxX, p.x);
    minY = Math.min(minY, p.y);
    maxY = Math.max(maxY, p.y);
  }
  if (!Number.isFinite(minX)) {
    minX = 0;
    minY = 0;
    maxX = 1;
    maxY = 1;
  }
  const spanX = Math.max(1, maxX - minX);
  const spanY = Math.max(1, maxY - minY);
  const massstab = Math.min((rect.width * 0.55) / spanX, (rect.height * 0.55) / spanY, 0.2);
  const mx = (minX + maxX) / 2;
  const my = (minY + maxY) / 2;
  return (p) => ({
    x: rect.width / 2 + (p.x - mx) * massstab,
    y: rect.height / 2 - (p.y - my) * massstab,
  });
}

function pfadD(punkte: readonly PixelPunkt[], geschlossen: boolean): string {
  const teile = punkte.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`);
  return `${teile.join(' ')}${geschlossen ? ' Z' : ''}`;
}

export function KosmoZeichnet() {
  const spur = useAbspielEbene((s) => s.spuren[0] ?? null);
  const pausiert = useAbspielEbene((s) => s.pausiert);

  // Anzeige-Kopie: bleibt für die Ausblend-Transition kurz stehen, nachdem
  // die Spur (und damit das aufgelöste Promise) schon weg ist — die
  // imperativ gezeichneten Pfade leben in Refs und überstehen das Fade.
  const [anzeige, setAnzeige] = useState<AbspielSpur | null>(null);

  const wurzelRef = useRef<HTMLDivElement>(null);
  const pfadGRef = useRef<SVGGElement>(null);
  const pulsGRef = useRef<SVGGElement>(null);
  const orbRef = useRef<HTMLDivElement>(null);
  const chipRef = useRef<HTMLDivElement>(null);
  const schweifRef = useRef<(HTMLDivElement | null)[]>([]);

  // Overlay an der Ebene anmelden — registriert (erstes Overlay) das
  // Vorspiel am Anschluss, Abmelden beim Unmount stoppt laufende Spuren.
  useEffect(() => meldeOverlayAn(), []);

  // Spur → Anzeige synchronisieren (inkl. Ausblende-Verzögerung).
  useEffect(() => {
    if (spur) {
      setAnzeige(spur);
      return;
    }
    if (!anzeige) return;
    const t = setTimeout(() => setAnzeige(null), AUSBLENDEN_MS);
    return () => clearTimeout(t);
    // `anzeige` bewusst nicht in den Deps: der Effekt reagiert auf den
    // Spur-Wechsel; die Ausblendung läuft genau einmal pro Verschwinden.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [spur]);

  // Abbruch-Bedienung: ESC = Stopp, Leertaste = Pause/Weiter — nur solange
  // wirklich eine Spur läuft (capture, damit kein Panel das ESC vorher isst).
  useEffect(() => {
    if (!spur) return;
    const aufTaste = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        useAbspielEbene.getState().stoppeAlle();
      } else if (e.key === ' ' && !istFormularZiel(e.target)) {
        e.preventDefault();
        useAbspielEbene.getState().pauseUmschalten();
      }
    };
    window.addEventListener('keydown', aufTaste, true);
    return () => window.removeEventListener('keydown', aufTaste, true);
  }, [spur?.id]);

  // ── Der Zeichner: eine async-Sequenz je Spur, rAF-getrieben ───────────
  useEffect(() => {
    if (!anzeige) return;
    // Nur animieren, wenn die Spur im Store noch lebt (nicht während des Fades).
    if (!useAbspielEbene.getState().spuren.some((s) => s.id === anzeige.id)) return;
    const wurzel = wurzelRef.current;
    const pfadG = pfadGRef.current;
    const pulsG = pulsGRef.current;
    const orb = orbRef.current;
    const chip = chipRef.current;
    if (!wurzel || !pfadG || !pulsG || !orb || !chip) return;

    let abbruch = false;
    let rafId = 0;
    const timers = new Set<ReturnType<typeof setTimeout>>();
    const reduziert = typeof window.matchMedia === 'function' ? window.matchMedia('(prefers-reduced-motion: reduce)') : null;

    // Externer Stopp (ESC/Wache/stoppeAlle): Spur verschwindet aus dem Store
    // → Sequenz sauber abbrechen (spurFertig ist idempotent).
    const abo = useAbspielEbene.subscribe((s) => {
      if (!s.spuren.some((sp) => sp.id === anzeige.id)) abbruch = true;
    });

    pfadG.replaceChildren();
    pulsG.replaceChildren();

    const schrittPfade = anzeige.schritte.map((s: AbspielSchritt) => weltPfadeFuerSchritt(s));
    const inPixel = baueAbbildung(
      wurzel,
      schrittPfade.flat().flatMap((pf) => pf.punkte),
    );

    const orbSetzen = (x: number, y: number) => {
      orb.style.transform = `translate(${x}px, ${y}px)`;
      // Chip kippt an der rechten Kante auf die linke Orb-Seite (kein Abschneiden).
      orb.classList.toggle('kz-orb-chip-links', x > wurzel.clientWidth - 260);
    };

    const schweifSetzen = (punkte: readonly PixelPunkt[]) => {
      for (let i = 0; i < schweifRef.current.length; i++) {
        const el = schweifRef.current[i];
        const p = punkte[i];
        if (el && p) el.style.transform = `translate(${p.x}px, ${p.y}px)`;
      }
    };

    const warte = (ms: number) =>
      new Promise<void>((resolve) => {
        const t = setTimeout(() => {
          timers.delete(t);
          resolve();
        }, ms);
        timers.add(t);
      });

    const puls = (x: number, y: number) => {
      const kreis = document.createElementNS(SVG_NS, 'circle');
      kreis.setAttribute('cx', x.toFixed(1));
      kreis.setAttribute('cy', y.toFixed(1));
      kreis.setAttribute('r', '10');
      kreis.setAttribute('class', 'kz-puls');
      kreis.addEventListener('animationend', () => kreis.remove());
      pulsG.appendChild(kreis);
      // Fallback-Aufräumer (reduced-motion-Riegel o.ä. verschluckt animationend).
      const t = setTimeout(() => {
        timers.delete(t);
        kreis.remove();
      }, 900);
      timers.add(t);
    };

    /** Zeichnet EIN Element: Dash-Draw + Orb/Schweif-Verfolgung im rAF. */
    const zeichne = (el: SVGPathElement, laenge: number) =>
      new Promise<void>((resolve) => {
        const dauerMs = Math.max((laenge / TEMPO_PX_S) * 1000, MIN_PFAD_MS);
        let anteil = 0;
        let letzte = performance.now();
        const frame = (t: number) => {
          if (abbruch) {
            resolve();
            return;
          }
          if (reduziert?.matches) {
            // Spec §0: das rAF prüft matchMedia selbst — reduced-motion
            // mitten im Lauf ⇒ sofort auflösen (Direkt-Apply-Pfad).
            useAbspielEbene.getState().stoppeAlle();
            resolve();
            return;
          }
          const dt = t - letzte;
          letzte = t;
          if (!useAbspielEbene.getState().pausiert) {
            anteil = Math.min(1, anteil + dt / dauerMs);
          }
          const dist = laenge * anteil;
          el.style.strokeDashoffset = `${laenge - dist}`;
          const spitze = el.getPointAtLength(dist);
          orbSetzen(spitze.x, spitze.y);
          const schweif: PixelPunkt[] = [];
          for (let i = 1; i <= 3; i++) {
            schweif.push(el.getPointAtLength(Math.max(0, dist - i * SCHWEIF_ABSTAND_PX)));
          }
          schweifSetzen(schweif);
          if (anteil >= 1) {
            resolve();
          } else {
            rafId = requestAnimationFrame(frame);
          }
        };
        rafId = requestAnimationFrame(frame);
      });

    const lauf = async () => {
      for (const [i, schritt] of anzeige.schritte.entries()) {
        if (abbruch) break;
        chip.textContent = schritt.summary;
        const pfade = schrittPfade[i] ?? [];
        if (pfade.length === 0) {
          // Ehrliche Grenze: keine zeichenbare Geometrie UND keine Vorschau —
          // der Orb steht kurz in der Flächenmitte, der Chip nennt den Schritt.
          const x = wurzel.clientWidth / 2;
          const y = wurzel.clientHeight / 2;
          orbSetzen(x, y);
          schweifSetzen([
            { x, y },
            { x, y },
            { x, y },
          ]);
          puls(x, y);
          await warte(OHNE_PFAD_MS);
          continue;
        }
        for (const weltPfad of pfade) {
          if (abbruch) break;
          const pixel = weltPfad.punkte.map(inPixel);
          const el = document.createElementNS(SVG_NS, 'path');
          el.setAttribute('d', pfadD(pixel, weltPfad.geschlossen));
          el.setAttribute('class', weltPfad.art === 'umkreisung' ? 'kz-pfad kz-pfad-umkreisung' : 'kz-pfad');
          pfadG.appendChild(el);
          const laenge = Math.max(el.getTotalLength(), 1);
          el.style.strokeDasharray = `${laenge}`;
          el.style.strokeDashoffset = `${laenge}`;
          await zeichne(el, laenge);
          if (abbruch) break;
          el.classList.add('kz-pfad-fertig');
          // Snap: 120ms Halt + Einmal-Puls am Element-Ende (Spec §7).
          const ende = el.getPointAtLength(laenge);
          puls(ende.x, ende.y);
          await warte(SNAP_PAUSE_MS);
        }
      }
      // Fertig ODER abgebrochen: die Spur IMMER auflösen (idempotent) — das
      // Vorspiel-Promise löst auf, der atomare Apply läuft, die Ebene blendet aus.
      useAbspielEbene.getState().spurFertig(anzeige.id);
    };
    void lauf();

    return () => {
      abbruch = true;
      abo();
      cancelAnimationFrame(rafId);
      for (const t of timers) clearTimeout(t);
    };
  }, [anzeige?.id]);

  if (!anzeige) return null;

  return (
    <div
      ref={wurzelRef}
      data-testid="kosmo-zeichnet"
      data-pausiert={pausiert ? '1' : '0'}
      className={`kz-ebene${spur ? '' : ' kz-aus'}`}
    >
      <svg className="kz-flaeche" aria-hidden="true">
        <g ref={pfadGRef} />
        <g ref={pulsGRef} />
      </svg>
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          ref={(el) => {
            schweifRef.current[i] = el;
          }}
          className={`kz-schweif kz-schweif-${i + 1}`}
        />
      ))}
      <div ref={orbRef} className="kz-orb">
        <span className="kz-orb-halo" />
        <span className="kz-orb-kern" />
        <div ref={chipRef} className="kz-chip" data-testid="kosmo-zeichnet-chip" />
      </div>
      {/* Einzige klickbare Stelle der Ebene (pointer-events:auto nur hier) —
          Abbruch-Bedienung gemäss §7: Klick = Stopp, sonst ESC/Leertaste. */}
      <div className="kz-bedienung">
        <button
          type="button"
          data-testid="kosmo-zeichnet-stopp"
          className="kz-bedien-chip"
          onClick={() => useAbspielEbene.getState().stoppeAlle()}
          title="Abspiel stoppen — der Apply läuft sofort"
        >
          {pausiert ? 'PAUSIERT · LEER WEITER · ESC STOPP' : 'KOSMO ZEICHNET · LEER PAUSE · ESC STOPP'}
        </button>
      </div>
    </div>
  );
}
