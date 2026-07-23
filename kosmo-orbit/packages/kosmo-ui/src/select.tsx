import {
  Children,
  isValidElement,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type CSSProperties,
  type KeyboardEvent as ReactKeyboardEvent,
  type OptionHTMLAttributes,
  type ReactNode,
  type SelectHTMLAttributes,
} from 'react';
import { createPortal } from 'react-dom';

/**
 * KSelect (v0.6.9) — ECHTES Custom-Dropdown im Werkplan-Stil.
 *
 * Der historische Vertrag «bleibt ein natives <select>, E2E bedient es per
 * `selectOption`» ist mit v0.6.9 bewusst und als EIN kohärenter Schnitt
 * gebrochen. Der NEUE Vertrag:
 *
 * - Der Trigger ist ein `<button>` mit den bisherigen `.k-select`-Klassen
 *   (1px-Tusche-Rahmen, `--k-radius-sm`, SVG-Chevron über `background-image`
 *   — die Akzent×Theme-Varianten in aura.css gelten unverändert). KEINE
 *   45°-Ecke: die gehört den Karteikarten (gleiches Prinzip wie KDialog).
 * - `data-testid` sitzt auf dem TRIGGER; der Trigger trägt zusätzlich
 *   `data-value` mit dem aktuellen Wert (E2E-Ersatz für `toHaveValue`).
 * - Das Popup (nur offen gemountet, `.k-menu`-Karte wie KMenu) trägt
 *   `data-testid="${testid}-popup"`, `role="listbox"`; jede Option ist ein
 *   Button mit `role="option"`, `aria-selected` und `data-value`.
 * - E2E bedient KSelect über `e2e/helfer/waehleOption.ts` (Trigger klicken →
 *   Popup abwarten → `[data-value="…"]` klicken), NICHT mehr `selectOption`.
 * - Tastatur: ↑/↓ (überspringt disabled), Home/End, Enter/Space wählt,
 *   Esc schliesst, Type-ahead auf Label-Anfangsbuchstaben. Fokus bleibt auf
 *   dem Trigger (`aria-activedescendant`-Muster), darum keine Fokus-Falle.
 * - Aussenklick schliesst (mousedown-Muster von KMenu, touch-tauglich).
 * - Bewegung: Popup öffnet mit `.k-einblenden` (aura.css) — der globale
 *   `prefers-reduced-motion`-Killswitch dämpft das automatisch, kein
 *   Sonderfall hier.
 *
 * API bleibt DROP-IN-kompatibel zur nativen Ära: `value`/`defaultValue`/
 * `onChange` + `<option>`-CHILDREN (Entscheid: children-Parsing statt
 * options-Prop, weil ALLE ~36 Verwendungsstellen bereits `<option>`-Kinder
 * übergeben, teils konditional gerendert). `onChange` erhält ein
 * synthetisches Event, dessen `target.value`/`currentTarget.value` gesetzt
 * sind — mehr liest keine Verwendungsstelle. Ein `onChange` feuert (nativ-
 * treu) nur bei tatsächlichem Wertwechsel. `multiple`/`<optgroup>` werden im
 * Custom-Modus nicht unterstützt — dafür (und für andere Sonderfälle, in
 * denen das Betriebssystem-Popup zwingend ist) gibt es die `nativ`-Prop.
 *
 * `style` wird deterministisch GESPLITTET: Layout-Schlüssel (width/flex/
 * position/margin/…) wandern auf den Wrapper (der die Layout-Rolle des
 * früheren `<select>` übernimmt), alle übrigen (padding/font/color/…) auf
 * den Trigger. Damit bleiben `style={{ width: '100%' }}`-Verwender pixel-
 * kompatibel.
 */
export interface KSelectProps extends Omit<SelectHTMLAttributes<HTMLSelectElement>, 'size'> {
  size?: 'sm' | 'md';
  /** true → natives `<select>` wie vor v0.6.9 (Sonderfälle). Default: custom. */
  nativ?: boolean;
  'data-testid'?: string;
}

interface OptionEintrag {
  value: string;
  label: string;
  disabled: boolean;
}

/** Flacht die `<option>`-children eines Labels zu reinem Text (Labels wie
 * `{name} ({masse})` kommen als Arrays aus Strings/Zahlen an). */
function textVon(knoten: ReactNode): string {
  if (knoten === null || knoten === undefined || typeof knoten === 'boolean') return '';
  if (typeof knoten === 'string' || typeof knoten === 'number') return String(knoten);
  if (Array.isArray(knoten)) return knoten.map(textVon).join('');
  if (isValidElement(knoten)) return textVon((knoten.props as { children?: ReactNode }).children);
  return '';
}

/** Liest die `<option>`-Kinder in eine flache Options-Liste (nur direkte
 * `<option>`-Elemente — kein `<optgroup>` im Bestand, s. Doc-Kommentar). */
function leseOptionen(children: ReactNode): OptionEintrag[] {
  const liste: OptionEintrag[] = [];
  Children.forEach(children, (kind) => {
    if (!isValidElement(kind) || kind.type !== 'option') return;
    const p = kind.props as OptionHTMLAttributes<HTMLOptionElement>;
    const label = textVon(p.children);
    const value = p.value !== undefined ? String(p.value) : label;
    liste.push({ value, label, disabled: p.disabled === true });
  });
  return liste;
}

/** Layout-Schlüssel → Wrapper; Rest (Optik) → Trigger. S. Doc-Kommentar. */
const WRAP_STYLE_KEYS = new Set([
  'display', 'width', 'minWidth', 'maxWidth', 'flex', 'flexGrow', 'flexShrink',
  'flexBasis', 'alignSelf', 'justifySelf', 'gridColumn', 'gridRow', 'order',
  'position', 'top', 'right', 'bottom', 'left', 'zIndex',
  'margin', 'marginTop', 'marginRight', 'marginBottom', 'marginLeft',
]);

function splitStyle(style: CSSProperties | undefined): { wrap: CSSProperties; trigger: CSSProperties } {
  const wrap: Record<string, unknown> = {};
  const trigger: Record<string, unknown> = {};
  if (style) {
    for (const [k, v] of Object.entries(style)) {
      if (WRAP_STYLE_KEYS.has(k)) wrap[k] = v;
      else trigger[k] = v;
    }
  }
  return { wrap: wrap as CSSProperties, trigger: trigger as CSSProperties };
}

function syntheticChange(value: string): ChangeEvent<HTMLSelectElement> {
  const ziel = { value } as unknown as EventTarget & HTMLSelectElement;
  return { target: ziel, currentTarget: ziel, type: 'change' } as unknown as ChangeEvent<HTMLSelectElement>;
}

export function KSelect(props: KSelectProps) {
  const {
    size = 'md',
    nativ = false,
    className,
    style,
    children,
    value,
    defaultValue,
    onChange,
    disabled,
    'data-testid': testid,
    ...rest
  } = props;
  const klassen = ['k-select', `k-select--${size}`, className].filter(Boolean).join(' ');

  const [offen, setOffen] = useState(false);
  const [aktivIndex, setAktivIndex] = useState(0);
  // P-F6 (v0.9.2): fixe Lage der portalierten Listbox, berechnet beim
  // Öffnen aus dem Trigger-Rechteck (`oeffne()`); top-Variante = normal
  // nach unten, bottom-Variante = nach oben geklappt (Platzmangel).
  const [popupLage, setPopupLage] = useState<
    { left: number; breite: number; top?: number; bottom?: number } | null
  >(null);
  const [intern, setIntern] = useState<string | undefined>(() =>
    defaultValue !== undefined ? String(defaultValue) : undefined,
  );
  const wrapRef = useRef<HTMLSpanElement | null>(null);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const listeRef = useRef<HTMLDivElement | null>(null);
  const typeahead = useRef<{ puffer: string; zeit: number }>({ puffer: '', zeit: 0 });
  const id = useId();

  const optionen = useMemo(() => leseOptionen(children), [children]);
  const gesteuert = value !== undefined;
  const wert = gesteuert ? String(value) : (intern ?? optionen[0]?.value ?? '');
  const gewaehlt = optionen.find((o) => o.value === wert);
  // Nativ-treu: kennt das select den Wert nicht, zeigt es die erste Option.
  const anzeige = gewaehlt?.label ?? optionen[0]?.label ?? '';

  // Aussenklick + Escape schliessen — exakt das KMenu-Muster (overlay.tsx).
  // P-F6 (v0.9.2): die Liste hängt seit dem Portal-Umbau an document.body —
  // der Aussenklick-Test muss BEIDE Wurzeln kennen (Trigger-Span UND
  // portaliertes Listbox-Div), sonst schlösse jeder Optionsklick sofort.
  useEffect(() => {
    if (!offen) return undefined;
    const schliesseAussen = (e: MouseEvent) => {
      const ziel = e.target as Node;
      const imTrigger = wrapRef.current?.contains(ziel) ?? false;
      const inListe = listeRef.current?.contains(ziel) ?? false;
      if (!imTrigger && !inListe) setOffen(false);
    };
    const schliesseEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOffen(false);
    };
    // P-F6: die Liste ist position:fixed — beim Scrollen/Resize irgendeines
    // Containers würde sie am alten Fleck schweben; schliessen ist das
    // ehrliche Standardverhalten (natives <select> macht dasselbe).
    // capture:true fängt auch Scrolls in inneren Overflow-Containern
    // (.isl-popup/.isl-fenster), die nie bis window bubbeln.
    const schliesseScroll = (e: Event) => {
      if (listeRef.current && e.target instanceof Node && listeRef.current.contains(e.target)) return;
      setOffen(false);
    };
    document.addEventListener('mousedown', schliesseAussen);
    document.addEventListener('keydown', schliesseEsc);
    window.addEventListener('scroll', schliesseScroll, { capture: true, passive: true });
    window.addEventListener('resize', schliesseScroll);
    return () => {
      document.removeEventListener('mousedown', schliesseAussen);
      document.removeEventListener('keydown', schliesseEsc);
      window.removeEventListener('scroll', schliesseScroll, { capture: true } as EventListenerOptions);
      window.removeEventListener('resize', schliesseScroll);
    };
  }, [offen]);

  // Aktive Option in Sicht halten (Listbox scrollt ab maxHeight).
  useEffect(() => {
    if (!offen) return;
    const el = listeRef.current?.querySelector<HTMLElement>(`[data-index="${aktivIndex}"]`);
    if (el && typeof el.scrollIntoView === 'function') el.scrollIntoView({ block: 'nearest' });
  }, [offen, aktivIndex]);

  if (nativ) {
    return (
      <select
        {...rest}
        {...(testid !== undefined ? { 'data-testid': testid } : {})}
        {...(value !== undefined ? { value } : {})}
        {...(defaultValue !== undefined ? { defaultValue } : {})}
        {...(onChange !== undefined ? { onChange } : {})}
        {...(disabled !== undefined ? { disabled } : {})}
        {...(style !== undefined ? { style } : {})}
        className={klassen}
      >
        {children}
      </select>
    );
  }

  const naechsterWaehlbare = (start: number, richtung: 1 | -1): number => {
    let i = start;
    while (i >= 0 && i < optionen.length) {
      if (!optionen[i]!.disabled) return i;
      i += richtung;
    }
    return -1;
  };

  const oeffne = (zielIndex?: number) => {
    const startIndex =
      zielIndex ?? Math.max(0, optionen.findIndex((o) => o.value === wert));
    setAktivIndex(startIndex);
    // P-F6 (v0.9.2, Owner-Feedback/P-F4-Fund): Lage der portalierten Liste
    // aus dem Trigger-Rechteck — position:fixed entkommt jedem
    // overflow:auto-Vorfahren (die Insel-Popups .isl-popup/.isl-fenster
    // klippten den absoluten Dropdown, island.css §Stufe 3). Unten öffnen
    // ist der Normalfall; reicht der Platz unter dem Trigger nicht für die
    // maxHeight (280) UND ist oben mehr Luft, klappt die Liste nach oben
    // (bottom-verankert — die tatsächliche Listenhöhe ist vor dem Render
    // nicht bekannt, der Anker braucht sie nicht).
    const r = triggerRef.current?.getBoundingClientRect();
    if (r) {
      const platzUnten = window.innerHeight - r.bottom;
      const nachOben = platzUnten < 292 && r.top > platzUnten;
      setPopupLage(
        nachOben
          ? { left: r.left, bottom: window.innerHeight - r.top + 2, breite: r.width }
          : { left: r.left, top: r.bottom + 2, breite: r.width },
      );
    } else {
      setPopupLage(null);
    }
    setOffen(true);
  };

  const waehle = (v: string) => {
    setOffen(false);
    triggerRef.current?.focus();
    if (!gesteuert) setIntern(v);
    if (v !== wert) onChange?.(syntheticChange(v));
  };

  const tastatur = (e: ReactKeyboardEvent<HTMLButtonElement>) => {
    if (!offen) {
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp' || e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        oeffne();
      } else if (e.key === 'Home') {
        e.preventDefault();
        oeffne(Math.max(0, naechsterWaehlbare(0, 1)));
      } else if (e.key === 'End') {
        e.preventDefault();
        oeffne(Math.max(0, naechsterWaehlbare(optionen.length - 1, -1)));
      }
      return;
    }
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      const richtung: 1 | -1 = e.key === 'ArrowDown' ? 1 : -1;
      const neu = naechsterWaehlbare(aktivIndex + richtung, richtung);
      if (neu >= 0) setAktivIndex(neu);
    } else if (e.key === 'Home') {
      e.preventDefault();
      const neu = naechsterWaehlbare(0, 1);
      if (neu >= 0) setAktivIndex(neu);
    } else if (e.key === 'End') {
      e.preventDefault();
      const neu = naechsterWaehlbare(optionen.length - 1, -1);
      if (neu >= 0) setAktivIndex(neu);
    } else if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      const o = optionen[aktivIndex];
      if (o && !o.disabled) waehle(o.value);
    } else if (e.key === 'Escape') {
      // Der document-Listener oben schliesst ebenfalls — hier zusätzlich
      // stoppen, damit kein umgebendes Overlay (Dialog/Menü) mitschliesst.
      e.stopPropagation();
      setOffen(false);
    } else if (e.key === 'Tab') {
      setOffen(false);
    } else if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
      // Type-ahead: Anfangsbuchstaben sammeln (500ms-Fenster).
      const jetzt = Date.now();
      const t = typeahead.current;
      t.puffer = jetzt - t.zeit > 500 ? e.key.toLowerCase() : t.puffer + e.key.toLowerCase();
      t.zeit = jetzt;
      const treffer = optionen.findIndex(
        (o) => !o.disabled && o.label.toLowerCase().startsWith(t.puffer),
      );
      if (treffer >= 0) setAktivIndex(treffer);
    }
  };

  const { wrap: wrapStyle, trigger: triggerStyle } = splitStyle(style);
  const popupId = `${id}-listbox`;

  return (
    <span ref={wrapRef} style={{ position: 'relative', display: 'inline-block', ...wrapStyle }}>
      <button
        {...(rest as Record<string, unknown>)}
        ref={triggerRef}
        type="button"
        className={klassen}
        role="combobox"
        aria-haspopup="listbox"
        aria-expanded={offen}
        aria-controls={popupId}
        {...(offen ? { 'aria-activedescendant': `${id}-opt-${aktivIndex}` } : {})}
        {...(testid !== undefined ? { 'data-testid': testid } : {})}
        data-value={wert}
        disabled={disabled ?? false}
        onClick={() => (offen ? setOffen(false) : oeffne())}
        onKeyDown={tastatur}
        style={{
          font: 'inherit',
          textAlign: 'left',
          display: 'block',
          width: '100%',
          boxSizing: 'border-box',
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          ...triggerStyle,
        }}
      >
        {anzeige === '' ? ' ' : anzeige}
      </button>
      {offen &&
        // P-F6 (v0.9.2): Listbox als body-Portal mit fixer Lage aus dem
        // Trigger-Rechteck — entkommt den overflow-Klippen der Insel-Popups
        // (P-F4-Fund, island.css:410/446 ↔ vorher position:absolute hier).
        // z-index unter der CursorEbene (2147483000), über allen Fenstern.
        createPortal(
        <div
          ref={listeRef}
          id={popupId}
          role="listbox"
          {...(testid !== undefined ? { 'data-testid': `${testid}-popup` } : {})}
          className="k-menu offen k-einblenden"
          style={{
            position: 'fixed',
            zIndex: 2147482000,
            ...(popupLage
              ? {
                  left: popupLage.left,
                  minWidth: popupLage.breite,
                  ...('top' in popupLage && popupLage.top !== undefined ? { top: popupLage.top } : {}),
                  ...('bottom' in popupLage && popupLage.bottom !== undefined ? { bottom: popupLage.bottom } : {}),
                }
              : { minWidth: '100%' }),
            maxWidth: 'min(420px, 80vw)',
            maxHeight: 280,
            overflowY: 'auto',
            overflowX: 'hidden',
          }}
        >
          {optionen.map((o, i) => (
            <button
              // Werte dürfen doppelt/leer sein — Index gehört zur Identität.
              // eslint-disable-next-line react/no-array-index-key
              key={`${o.value}-${i}`}
              id={`${id}-opt-${i}`}
              type="button"
              role="option"
              aria-selected={o.value === wert}
              data-value={o.value}
              data-index={i}
              disabled={o.disabled}
              tabIndex={-1}
              className="k-menu-item"
              onMouseEnter={() => setAktivIndex(i)}
              onClick={(e) => {
                // Steckt das KSelect in einem <label> (verbreitet: «Phase»,
                // «Verbindung», …), löst der Browser als Default-Action des
                // Klicks einen synthetischen Klick aufs Label-Control (den
                // Trigger) aus, sobald die geklickte Option nach dem React-
                // Commit nicht mehr im DOM hängt — das Popup ginge sofort
                // wieder auf. preventDefault unterbindet genau das.
                e.preventDefault();
                waehle(o.value);
              }}
              style={{
                fontSize: size === 'sm' ? 'var(--k-t-sm)' : 'var(--k-t-md)',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                display: 'block',
                textAlign: 'left',
                ...(i === aktivIndex ? { background: 'var(--k-surface)' } : {}),
                ...(o.value === wert ? { fontWeight: 600 } : {}),
              }}
            >
              {o.label === '' ? ' ' : o.label}
            </button>
          ))}
        </div>,
          document.body,
        )}
    </span>
  );
}
