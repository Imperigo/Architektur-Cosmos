import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Badge, Hairline, KButton, moduleHue, type ModuleId, type ThemeName } from '@kosmo/ui';
import { AKZENTE } from './akzente';
import { NEUIGKEITEN, neuigkeitenFuerStation } from './neuigkeiten';
import { adaptionAktiv, adaptionZuruecksetzen, setAdaptionAktiv } from '../state/oberflaeche-adaption-kern';
import {
  effektiveLeistungsStufe,
  formatiereLeistungsBericht,
  holeLetztesErgebnis,
  holeOverride,
  istZustimmungErteilt,
  pruefeLeistungMitFreigabe,
  setOverride,
  setZustimmung,
  type LeistungsOverride,
} from '../state/leistung';
import { WerkzeugSetup } from './WerkzeugSetup';
import { loadSettings } from './KosmoPanel';

/**
 * Zentrales Einstellungs-Panel (Serie K / Batch A4, Owner-Befund K14, wörtlich:
 * «Einstellungsmenüs: zentral in der Übersicht + je Station … Funktionen &
 * Neues»). EIN Panel für die ganze App — die Kopfleiste öffnet es ungefiltert
 * (`station` undefined), jede Station öffnet dasselbe Panel mit einem
 * Filter-Prop (siehe die `station-einstellungen-<id>`-Zahnräder in den
 * Workspaces). Kein zweites Panel, keine zweite Logik: Darstellung (Thema/
 * Akzent) und Rundgang rufen exakt dieselben Setter/Funktionen wie die
 * Kopfleiste/der «?»-Knopf; Betriebsart/TTS/Lizenz bleiben ehrlich im
 * Kosmo-Panel (nur ein Öffnen-Knopf hierher, kein Duplikat); Werkzeuge
 * einrichten bettet die bestehende `WerkzeugSetup`-Komponente direkt ein;
 * die Oberflächen-Anpassung (Serie J3c) ruft den stationsneutralen Adaptions-
 * Kern direkt (`oberflaeche-adaption-kern.ts`) — derselbe globale Schalter,
 * den DesignWorkspace/DataWorkspace über ihre eigene Kopie schon anzeigen.
 */

export interface EinstellungenProps {
  theme: ThemeName;
  setTheme: (t: ThemeName) => void;
  akzent: string;
  setAkzent: (a: string) => void;
  onClose: () => void;
  /** Ruft denselben Weg wie der «?»-Knopf der Kopfleiste (A3-Versprechen). */
  aufRundgangStarten: () => void;
  /** Öffnet das Kosmo-Panel (Betriebsart/TTS/Lizenz leben dort, kein Duplikat). */
  aufKosmoOeffnen: () => void;
  /** F2 (v0.6.4, Entdoppelung): öffnet den Deinstallieren-Dialog — der Knopf
   *  wohnt NUR noch hier (eine Funktion = ein Ort), nicht mehr in der
   *  Kopfleiste; der Dialog selbst (AppDeinstallieren) bleibt in App.tsx. */
  aufDeinstallieren: () => void;
  /** Gesetzt, wenn über ein Stations-Zahnrad geöffnet — filtert «Funktionen &
   *  Neues» oben auf diese Station vor; die übrigen Sektionen bleiben gleich. */
  station?: ModuleId;
  /** Anzeigename der Station, für die Kopfzeile/den Filter-Titel. */
  stationName?: string;
}

export function Einstellungen({
  theme,
  setTheme,
  akzent,
  setAkzent,
  onClose,
  aufRundgangStarten,
  aufDeinstallieren,
  aufKosmoOeffnen,
  station,
  stationName,
}: EinstellungenProps) {
  const [werkzeugSetupOffen, setWerkzeugSetupOffen] = useState(false);
  const [adaptionIstAn, setAdaptionIstAn] = useState(() => adaptionAktiv());

  // A9 (Owner-Befund K19, Leistungs-Autotuning): Zustimmung, letztes Ergebnis
  // und Override leben in leistung.ts (localStorage kosmo.leistung.v1) — hier
  // nur der React-Spiegel für die Anzeige, dieselben Setter wie überall sonst.
  const [leistungZustimmung, setLeistungZustimmungState] = useState(() => istZustimmungErteilt());
  const [leistungErgebnis, setLeistungErgebnis] = useState(() => holeLetztesErgebnis());
  const [leistungOverride, setLeistungOverrideState] = useState<LeistungsOverride>(() => holeOverride());

  // Escape schliesst das Panel (Muster wie ZentraleKachel-Info/Kurzbefehle).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const stationPunkte = station ? neuigkeitenFuerStation(station) : [];

  return createPortal(
    <div
      data-testid="einstellungen-scrim"
      role="dialog"
      aria-modal
      aria-label="Einstellungen"
      className="k-dialog-scrim"
      style={{ zIndex: 250, background: 'color-mix(in srgb, var(--k-ink) 22%, transparent)' }}
      onClick={onClose}
    >
      <div
        data-testid="einstellungen-panel"
        className="k-karte k-skalieren-ein k-dialog"
        onClick={(e) => e.stopPropagation()}
        style={{
          background: 'var(--k-raised)',
          padding: '16px 20px',
          width: 'min(640px, calc(100vw - 48px))',
          maxHeight: 'calc(100vh - 48px)',
          overflowY: 'auto',
          display: 'grid',
          gap: 16,
        }}
      >
        {werkzeugSetupOffen && (
          <WerkzeugSetup betriebsart={loadSettings().betriebsart} onClose={() => setWerkzeugSetupOffen(false)} />
        )}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div className="k-titel" style={{ fontSize: 14, fontWeight: 650 }}>
            Einstellungen{station && stationName ? ` — ${stationName}` : ''}
          </div>
          <div style={{ flex: 1 }} />
          <KButton size="sm" tone="ghost" aria-label="Schliessen" onClick={onClose}>
            ×
          </KButton>
        </div>

        {station && (
          <section data-testid="einstellungen-neuigkeiten-station" style={{ display: 'grid', gap: 8 }}>
            <div className="k-primaer">Neu in {stationName ?? station}</div>
            {stationPunkte.length === 0 ? (
              <div style={{ fontSize: 12.5, color: 'var(--k-ink-faint)' }}>
                Noch keine eigenen Einträge für diese Station — siehe «Funktionen &amp; Neues» unten.
              </div>
            ) : (
              <ul style={{ margin: 0, paddingLeft: 18, display: 'grid', gap: 4, fontSize: 12.5, color: 'var(--k-ink-soft)', lineHeight: 1.5 }}>
                {stationPunkte.map((t, i) => (
                  <li key={i}>
                    <span style={{ color: 'var(--k-ink-faint)', fontFamily: 'var(--k-font-mono)', fontSize: 11 }}>
                      {t.version}
                      {t.inArbeit ? ' · in Arbeit' : ''}
                    </span>{' '}
                    {t.punkt.text}
                  </li>
                ))}
              </ul>
            )}
            <Hairline />
          </section>
        )}

        <section data-testid="einstellungen-darstellung" style={{ display: 'grid', gap: 8 }}>
          <div className="k-primaer">Darstellung</div>
          <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
            <KButton
              size="sm"
              tone="ghost"
              data-testid="einstellung-thema"
              onClick={() => setTheme(theme === 'paper' ? 'ink' : 'paper')}
            >
              {theme === 'paper' ? 'Zu Tinte wechseln' : 'Zu Papier wechseln'}
            </KButton>
            <span style={{ display: 'inline-flex', gap: 7, alignItems: 'center' }}>
              {AKZENTE.map((a) => (
                <button
                  key={a.key}
                  onClick={() => setAkzent(a.key)}
                  title={`Akzent ${a.name}`}
                  aria-label={`Akzent ${a.name}`}
                  data-testid={`einstellung-akzent-${a.key}`}
                  style={{
                    all: 'unset',
                    cursor: 'pointer',
                    width: 14,
                    height: 14,
                    borderRadius: 999,
                    background: a.farbe ?? 'var(--k-technik)',
                    boxShadow:
                      akzent === a.key
                        ? '0 0 0 1.5px var(--k-field), 0 0 0 3px var(--k-technik)'
                        : '0 0 0 1px var(--k-line-strong)',
                  }}
                />
              ))}
            </span>
          </div>
        </section>
        <Hairline />

        <section data-testid="einstellungen-rundgang" style={{ display: 'grid', gap: 8 }}>
          <div className="k-primaer">Rundgang &amp; Hilfe</div>
          <div>
            <KButton size="sm" tone="quiet" data-testid="einstellung-rundgang" onClick={aufRundgangStarten}>
              Rundgang erneut zeigen
            </KButton>
          </div>
        </section>
        <Hairline />

        <section data-testid="einstellungen-kosmo" style={{ display: 'grid', gap: 8 }}>
          <div className="k-primaer">Kosmo &amp; Betrieb</div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <KButton size="sm" tone="quiet" data-testid="einstellung-kosmo-oeffnen" onClick={aufKosmoOeffnen}>
              Kosmo-Einstellungen öffnen
            </KButton>
            <KButton size="sm" tone="quiet" data-testid="einstellung-werkzeuge" onClick={() => setWerkzeugSetupOffen(true)}>
              Werkzeuge einrichten
            </KButton>
          </div>
          <div style={{ fontSize: 11.5, color: 'var(--k-ink-faint)', lineHeight: 1.5 }}>
            Betriebsart, Sprachausgabe und Lizenz stehen im Kosmo-Panel selbst (⚙ dort) — kein zweiter Ort für dieselbe
            Einstellung.
          </div>
        </section>
        <Hairline />

        <section data-testid="einstellungen-adaption" style={{ display: 'grid', gap: 8 }}>
          <div className="k-primaer">Oberflächen-Anpassung</div>
          <label style={{ fontSize: 12.5, color: 'var(--k-ink-soft)', display: 'flex', alignItems: 'center', gap: 6 }}>
            <input
              type="checkbox"
              data-testid="einstellung-adaption-schalter"
              checked={adaptionIstAn}
              onChange={(e) => {
                setAdaptionAktiv(e.target.checked);
                setAdaptionIstAn(e.target.checked);
              }}
            />
            Werkzeugleisten passen sich der Nutzung an (Design, Data, weitere Stationen)
          </label>
          <div>
            <KButton
              size="sm"
              tone="ghost"
              data-testid="einstellung-adaption-reset"
              title="Gelerntes Nutzungsprofil löschen — betrifft alle Stationen, der Schalter bleibt unverändert."
              onClick={() => adaptionZuruecksetzen()}
            >
              Oberfläche zurücksetzen
            </KButton>
          </div>
        </section>
        <Hairline />

        <section data-testid="einstellungen-leistung" style={{ display: 'grid', gap: 8 }}>
          <div className="k-primaer">Leistung</div>
          <label style={{ fontSize: 12.5, color: 'var(--k-ink-soft)', display: 'flex', alignItems: 'center', gap: 6 }}>
            <input
              type="checkbox"
              data-testid="leistung-zustimmung"
              checked={leistungZustimmung}
              onChange={(e) => {
                setZustimmung(e.target.checked);
                setLeistungZustimmungState(e.target.checked);
              }}
            />
            Kosmo darf die Systemleistung prüfen (Kerne, Speicher, Grafiktreiber, ein kurzer Mikro-Benchmark) und die
            Render-Qualität selbst drosseln
          </label>
          <div>
            <KButton
              size="sm"
              tone="quiet"
              data-testid="leistung-pruefen"
              disabled={!leistungZustimmung}
              title={leistungZustimmung ? undefined : 'Erst die Zustimmung oben aktivieren'}
              onClick={() => {
                const ergebnis = pruefeLeistungMitFreigabe();
                if (ergebnis) setLeistungErgebnis(ergebnis);
              }}
            >
              Systemleistung jetzt prüfen
            </KButton>
          </div>
          {leistungErgebnis && (
            <div
              data-testid="leistung-bericht"
              style={{
                fontSize: 12,
                color: 'var(--k-ink-soft)',
                lineHeight: 1.6,
                background: 'var(--k-surface)',
                borderRadius: 8,
                padding: '8px 10px',
                display: 'grid',
                gap: 2,
              }}
            >
              {(() => {
                const bericht = formatiereLeistungsBericht(leistungErgebnis);
                return (
                  <>
                    <div>Kerne: {bericht.kerne}</div>
                    <div>Speicher: {bericht.speicher}</div>
                    <div>Grafiktreiber: {bericht.renderer}</div>
                    <div>
                      Stufe: <strong data-testid="leistung-stufe">{bericht.stufe}</strong>
                    </div>
                  </>
                );
              })()}
            </div>
          )}
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
            <span style={{ fontSize: 12, color: 'var(--k-ink-faint)' }}>Render-Qualität:</span>
            {(['auto', 'hoch', 'mittel', 'niedrig'] as const).map((stufe) => (
              <button
                key={stufe}
                data-testid={`leistung-override-${stufe}`}
                onClick={() => {
                  setOverride(stufe);
                  setLeistungOverrideState(stufe);
                }}
                className="k-primaer"
                style={{
                  all: 'unset',
                  cursor: 'pointer',
                  fontSize: 11.5,
                  padding: '3px 9px',
                  borderRadius: 999,
                  color: leistungOverride === stufe ? 'var(--k-field)' : 'var(--k-ink-soft)',
                  background: leistungOverride === stufe ? 'var(--k-technik)' : 'var(--k-surface)',
                }}
              >
                {stufe === 'auto' ? `Automatisch (${effektiveLeistungsStufe()})` : stufe}
              </button>
            ))}
          </div>
          <div style={{ fontSize: 11, color: 'var(--k-ink-faint)', lineHeight: 1.5 }}>
            🔒 Cycles-Preview-Synchro, ein Host-PC-Client und die Wahl des lokalen LLM nach Leistung folgen erst mit der
            HomeStation — hier gibt es dafür bewusst keinen Regler.
          </div>
        </section>
        <Hairline />

        <section data-testid="einstellungen-neuigkeiten" style={{ display: 'grid', gap: 10 }}>
          <div className="k-primaer">Funktionen &amp; Neues</div>
          {NEUIGKEITEN.map((eintrag) => (
            <div key={eintrag.version} data-testid={`neuigkeiten-version-${eintrag.version}`} style={{ display: 'grid', gap: 4 }}>
              <div style={{ display: 'flex', gap: 8, alignItems: 'baseline' }}>
                <span style={{ fontWeight: 600, fontSize: 13 }}>Version {eintrag.version}</span>
                {eintrag.inArbeit && <Badge hue={moduleHue.kosmo}>in Arbeit</Badge>}
                <span style={{ fontSize: 11, color: 'var(--k-ink-faint)' }}>{eintrag.datum}</span>
              </div>
              <ul style={{ margin: 0, paddingLeft: 18, fontSize: 12.5, color: 'var(--k-ink-soft)', lineHeight: 1.6 }}>
                {eintrag.punkte.map((p, i) => (
                  <li key={i}>{p.text}</li>
                ))}
              </ul>
            </div>
          ))}
        </section>
        <Hairline />

        {/* F2 (v0.6.4, Entdoppelung): «App deinstallieren…» zog aus der
            Kopfleiste hierher um — selten gebraucht, gehört zu den
            System-Einstellungen, nicht auf den teuersten Platz der App. */}
        <section data-testid="einstellungen-system" style={{ display: 'grid', gap: 10 }}>
          <div className="k-primaer">System</div>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
            <KButton size="sm" tone="quiet" data-testid="einstellung-deinstallieren" onClick={aufDeinstallieren}>
              App deinstallieren…
            </KButton>
            <span style={{ fontSize: 11.5, color: 'var(--k-ink-faint)' }}>
              öffnet die ehrliche Anleitung für dein Betriebssystem — nichts wird sofort gelöscht.
            </span>
          </div>
        </section>
      </div>
    </div>,
    document.body,
  );
}
