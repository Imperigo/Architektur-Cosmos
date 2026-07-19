import { useState } from 'react';
import type { Pt } from '@kosmo/kernel';
import { KButton, KInput, meldeFehler } from '@kosmo/ui';
import { useProject } from '../../../../state/project-store';
import { useUiZustand } from '../../../../state/ui-zustand';

/**
 * D11 (PB3, `docs/V085-SPEZ.md` §2 D11 + §7 C-20) — das Kommentar-Erfassen-
 * Formular (Text + Autor, `design.kommentarSetzen`) EXTRAHIERT aus der
 * PROJEKT-Insel (`island/inhalte/projekt.tsx`s bisheriger `KommentarErfassen`-
 * Funktion, wörtlich identische Felder/Testids/Validierung — reine
 * Bewegung + Parametrisierung, keine Verhaltensänderung) in einen
 * wiederverwendbaren Baustein (`KommentarFormular`). Zwei Konsumenten:
 * - `island/inhalte/projekt.tsx`s `KommentarErfassen` (Island-Zugang,
 *   unverändert eingebettet in die Insel-Stufe2, `testIdPraefix="island"`
 *   erhält jeden Bestands-Testid byte-gleich).
 * - `KommentarErfassenAmPunkt` unten (Manuell-Modus-Zugang, D11/C-20):
 *   dasselbe Formular, an einem Bildschirmpunkt verankert.
 *
 * **Befund (D11, PB5-Bericht v0.8.4 Punkt 6.3):** im Manuell-Modus setzt das
 * Kommentar-Werkzeug (Kürzel K) einen Klick nur als Welt-mm-Punkt
 * (`useUiZustand().kommentarPunkt`, gesetzt in `DesignWorkspace.tsx`s
 * `tool === 'kommentar'`-Zweig, Zeile ~1416-1422 — GELESEN, NICHT verändert)
 * — ohne die Insel offen zu haben, kam bisher NIE ein Formular. `WICHTIG,
 * NICHT SELBST GEMACHT (Hotspot-Sanktion, s. PB3-Bericht):` `kommentarPunkt`
 * ist ein Welt-mm-Punkt, kein Bildschirm-Punkt — ihn an der richtigen
 * Stelle über dem Plan zu verankern braucht die Welt→Bildschirm-Umrechnung,
 * die NUR `PlanView.tsx` kennt (Kamera-Pan/-Zoom). `PlanView.tsx` hat dafür
 * bereits ein exportiertes Präzedenzmuster: `SketchOverlay` (Zeile
 * ~1998-2020) bekommt eine `toScreen(p: Pt): {x,y}`-Prop von aussen gereicht
 * — `KommentarErfassenAmPunkt` unten ist nach GENAU diesem Muster gebaut
 * (`toScreen`-Prop statt eigener Kamera-Kenntnis), MOUNTEN muss es aber
 * `PlanView.tsx` selbst (PB1-Hotspot, s. `docs/V085-SPEZ.md` §4) — dieses
 * Paket (PB3) darf diese Datei nicht anfassen, s. Abschlussbericht für die
 * exakte Stelle/das exakte JSX, das Fable/PB1 dort nachziehen kann.
 */

export interface KommentarFormularProps {
  /** Welt-mm-Punkt, an dem der Kommentar entsteht (`design.kommentarSetzen`s `at`). */
  punkt: Pt;
  /** Aktives Geschoss (optional — `design.kommentarSetzen`s `storeyId`). */
  storeyId?: string | null;
  /** Nach erfolgreichem Absenden (Erfolgsfall committet bereits vorher). */
  onFertig: () => void;
  /** Wrapper-Klasse — Island (`pd3b-block`, Insel-Chrome liefert Hintergrund)
   *  vs. freistehendes Overlay (braucht eigene Optik) unterscheiden sich. */
  className?: string;
  /** Testid-Präfix — hält Island- (`island-kommentar-*`) und Manuell-Testids
   *  (`manuell-kommentar-*`) auseinander, dieselbe Formularlogik darunter. */
  testIdPraefix: 'island' | 'manuell';
}

/** Das Formular selbst — Text/Autor Pflichtfelder, `design.kommentarSetzen`
 *  committet erst beim Absenden (nie ein blosser Klick, s. Kopfkommentar). */
export function KommentarFormular({ punkt, storeyId, onFertig, className, testIdPraefix }: KommentarFormularProps) {
  const runCommand = useProject((s) => s.runCommand);
  const [text, setText] = useState('');
  const [autor, setAutor] = useState('');
  const gueltig = text.trim().length > 0 && autor.trim().length > 0;
  const absenden = () => {
    if (!gueltig) return;
    try {
      runCommand('design.kommentarSetzen', {
        text: text.trim(),
        autor: autor.trim(),
        at: punkt,
        ...(storeyId ? { storeyId } : {}),
        erstelltAm: new Date().toLocaleDateString('de-CH'),
      });
      onFertig();
    } catch (err) {
      meldeFehler(err);
    }
  };
  return (
    <div className={className ?? 'pd3b-block'} data-testid={`${testIdPraefix}-kommentar-erfassen`} onClick={(e) => e.stopPropagation()}>
      <label className="pd3b-feld">
        <span>Text</span>
        <KInput size="sm" data-testid={`${testIdPraefix}-kommentar-text`} value={text} onChange={(e) => setText(e.target.value)} />
      </label>
      <label className="pd3b-feld">
        <span>Autor</span>
        <KInput size="sm" data-testid={`${testIdPraefix}-kommentar-autor`} value={autor} onChange={(e) => setAutor(e.target.value)} />
      </label>
      <KButton size="sm" data-testid={`${testIdPraefix}-kommentar-setzen`} disabled={!gueltig} onClick={absenden}>
        Kommentar setzen
      </KButton>
    </div>
  );
}

export interface KommentarErfassenAmPunktProps {
  /** Welt-mm → Bildschirm-px, s. Kopfkommentar. `PlanView.tsx`s
   *  `SketchOverlay`-Aufrufstelle rechnet das bereits identisch aus
   *  (`(p.x - view.cx) * view.scale + w/2`, gespiegelte y-Achse). */
  toScreen: (p: Pt) => { x: number; y: number };
}

/**
 * D11/C-20 — manuell-Modus-Zugang: rendert NUR, wenn `designOberflaeche ===
 * 'manuell'` UND ein `kommentarPunkt` gesetzt ist (Kommentar-Werkzeug aktiv,
 * ein Punkt wurde geklickt). Absichtlich UNABHÄNGIG von der Insel — das
 * bestehende `KommentarErfassen` (`island/inhalte/projekt.tsx`) bleibt der
 * Insel-Zugang, dieser hier ist der zusätzliche, in D11 fehlende
 * Manuell-Zugang. Escape/Abbrechen bleibt bewusst ausserhalb dieser
 * Komponente (Escape-Handling ist `DesignWorkspace.tsx`-Hotspot-Gebiet,
 * D10-Präzedenzfall) — der «Kommentar setzen»-Knopf ist der einzige
 * Bestätigungsweg; ein Klick auf einen anderen Punkt mit demselben Werkzeug
 * setzt `kommentarPunkt` ohnehin neu (`DesignWorkspace.tsx`, unverändert).
 */
export function KommentarErfassenAmPunkt({ toScreen }: KommentarErfassenAmPunktProps) {
  const designOberflaeche = useUiZustand((s) => s.designOberflaeche);
  const kommentarPunkt = useUiZustand((s) => s.kommentarPunkt);
  const setKommentarPunkt = useUiZustand((s) => s.setKommentarPunkt);
  const activeStoreyId = useProject((s) => s.activeStoreyId);
  if (designOberflaeche !== 'manuell' || !kommentarPunkt) return null;
  const pos = toScreen(kommentarPunkt);
  return (
    <div
      data-testid="manuell-kommentar-erfassen-anker"
      className="k-glass"
      style={{
        position: 'absolute',
        left: pos.x,
        top: pos.y,
        zIndex: 40,
        padding: 'var(--k-s3, 10px)',
        borderRadius: 'var(--k-radius, 8px)',
        minWidth: 180,
      }}
    >
      <KommentarFormular
        punkt={kommentarPunkt}
        storeyId={activeStoreyId}
        onFertig={() => setKommentarPunkt(null)}
        testIdPraefix="manuell"
      />
    </div>
  );
}
