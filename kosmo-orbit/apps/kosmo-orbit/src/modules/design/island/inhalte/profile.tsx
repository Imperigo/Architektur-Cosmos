import { useMemo, useState } from 'react';
import { type Profil } from '@kosmo/kernel';
import { KButton, KInput, KSelect, meldeFehler } from '@kosmo/ui';
import { useProject } from '../../../../state/project-store';
import { registriereInhalt } from './registry';
import './pd3b-inhalte.css';

/**
 * Profil-Manager (v0.9.2 P-P2, `docs/V092-SPEZ.md` §P-P2) — Verwaltungs-
 * Panel für den Profil-Typenkatalog (`Profil`, projektglobal wie `Assembly`),
 * registriert als neues PROJEKT-Insel-Werkzeug (`island-katalog.ts`s
 * `profil`-Eintrag, Katalog-Id `profil` — kein `toolId`, reine Katalogpflege
 * ohne Plan-Klickmodus, s. dortigen Kommentar). Muster 1:1 aus
 * `island/inhalte/zeichnen.tsx`s `AufbauKatalogTabelle`/`WandStufe3` (Liste +
 * Command-Wirkweg) übernommen, hier aber um echtes Anlegen/Ändern/Löschen
 * erweitert — die Kernel-Commands `design.profilErstellen`/`profilAendern`/
 * `profilLoeschen` (P-P1) erlauben das bereits vollständig.
 *
 * **Wirkweg (verbindlich, wie jeder andere Insel-Inhalt):** jede
 * Modelländerung läuft über `useProject().runCommand` — nie am Store vorbei.
 * Löschen eines referenzierten Profils lehnt der Kernel ehrlich ab (die
 * Fehlermeldung nennt die referenzierenden Stützen/Unterzüge, s.
 * `design.profilLoeschen`) — dieser Fehlertext wird HIER unverändert sowohl
 * als Toast (`meldeFehler`, Bestandsweg) ALS AUCH inline unter der
 * betroffenen Zeile angezeigt (`island-profil-loesch-fehler-<id>`), damit er
 * nicht nach 8 s stillschweigend verschwindet, bevor er gelesen/geprüft
 * werden kann (E2E-Beweisbarkeit, kein stummes Schlucken).
 */

const FORM_LABEL: Record<Profil['form'], string> = {
  rechteck: 'Rechteck',
  rund: 'Rund',
  'stahl-i': 'Stahl I',
  'stahl-u': 'Stahl U',
};

/** Welche Mass-Felder je Form zählen — Muster `pruefeProfilMasse` (design.ts),
 *  additiv dupliziert (reines UI-Feld-Sichtbarkeits-Wissen, kein Kernel-Import
 *  nötig). */
const FORM_FELDER: Record<Profil['form'], readonly ('b' | 'h' | 'd' | 'steg' | 'flansch')[]> = {
  rechteck: ['b', 'h'],
  rund: ['d'],
  'stahl-i': ['b', 'h', 'steg', 'flansch'],
  'stahl-u': ['b', 'h', 'steg', 'flansch'],
};

function profilMasseText(p: Profil): string {
  switch (p.form) {
    case 'rechteck':
      return `${p.b ?? '—'} × ${p.h ?? '—'} mm`;
    case 'rund':
      return `Ø ${p.d ?? '—'} mm`;
    case 'stahl-i':
    case 'stahl-u':
      return `H${p.h ?? '—'} · B${p.b ?? '—'} · Steg ${p.steg ?? '—'} · Flansch ${p.flansch ?? '—'} mm`;
    default:
      return '—';
  }
}

interface ProfilFormWerte {
  name: string;
  form: Profil['form'];
  b: string;
  h: string;
  d: string;
  steg: string;
  flansch: string;
}

function leereFormWerte(form: Profil['form'] = 'rechteck'): ProfilFormWerte {
  return { name: '', form, b: '', h: '', d: '', steg: '', flansch: '' };
}

function formWerteAusProfil(p: Profil): ProfilFormWerte {
  return {
    name: p.name,
    form: p.form,
    b: p.b !== undefined ? String(p.b) : '',
    h: p.h !== undefined ? String(p.h) : '',
    d: p.d !== undefined ? String(p.d) : '',
    steg: p.steg !== undefined ? String(p.steg) : '',
    flansch: p.flansch !== undefined ? String(p.flansch) : '',
  };
}

/** Baut die Command-Params aus den Formular-Strings — nur die für die
 *  gewählte Form relevanten Masse werden als Zahl mitgeschickt, ein leeres
 *  Feld fehlt im Ergebnis ganz (der Kernel übernimmt dann bei `profilAendern`
 *  den Bestandswert, s. dortigen Merge-Kommentar; bei `profilErstellen`
 *  wirft `pruefeProfilMasse` ehrlich, wenn ein Pflichtfeld fehlt). */
function masseParams(werte: ProfilFormWerte): Record<string, number> {
  const num = (s: string): number | undefined => (s.trim() === '' ? undefined : Number(s));
  const out: Record<string, number> = {};
  for (const feld of FORM_FELDER[werte.form]) {
    const n = num(werte[feld]);
    if (n !== undefined) out[feld] = n;
  }
  return out;
}

function useProfile(): readonly Profil[] {
  const revision = useProject((s) => s.revision);
  const doc = useProject.getState().doc;
  return useMemo(() => doc.byKind<Profil>('profil'), [doc, revision]);
}

function ProfilFormFelder({
  werte,
  patch,
  testPrefix,
}: {
  werte: ProfilFormWerte;
  patch: (p: Partial<ProfilFormWerte>) => void;
  testPrefix: string;
}) {
  const felder = FORM_FELDER[werte.form];
  return (
    <>
      <label className="pd3b-feld">
        <span>Name</span>
        <KInput size="sm" data-testid={`${testPrefix}-name`} value={werte.name} onChange={(e) => patch({ name: e.target.value })} />
      </label>
      <label className="pd3b-feld">
        <span>Form</span>
        <KSelect
          size="sm"
          data-testid={`${testPrefix}-form`}
          value={werte.form}
          onChange={(e) => patch({ form: e.target.value as Profil['form'] })}
        >
          <option value="rechteck">Rechteck</option>
          <option value="rund">Rund</option>
          <option value="stahl-i">Stahl I</option>
          <option value="stahl-u">Stahl U</option>
        </KSelect>
      </label>
      {felder.includes('b') && (
        <label className="pd3b-feld">
          <span>{werte.form === 'rechteck' ? 'Breite (mm)' : 'Flanschbreite (mm)'}</span>
          <KInput size="sm" mono type="number" data-testid={`${testPrefix}-b`} value={werte.b} onChange={(e) => patch({ b: e.target.value })} />
        </label>
      )}
      {felder.includes('h') && (
        <label className="pd3b-feld">
          <span>{werte.form === 'rechteck' ? 'Höhe (mm)' : 'Gesamthöhe (mm)'}</span>
          <KInput size="sm" mono type="number" data-testid={`${testPrefix}-h`} value={werte.h} onChange={(e) => patch({ h: e.target.value })} />
        </label>
      )}
      {felder.includes('d') && (
        <label className="pd3b-feld">
          <span>Durchmesser (mm)</span>
          <KInput size="sm" mono type="number" data-testid={`${testPrefix}-d`} value={werte.d} onChange={(e) => patch({ d: e.target.value })} />
        </label>
      )}
      {felder.includes('steg') && (
        <label className="pd3b-feld">
          <span>Stegdicke (mm)</span>
          <KInput size="sm" mono type="number" data-testid={`${testPrefix}-steg`} value={werte.steg} onChange={(e) => patch({ steg: e.target.value })} />
        </label>
      )}
      {felder.includes('flansch') && (
        <label className="pd3b-feld">
          <span>Flanschdicke (mm)</span>
          <KInput
            size="sm"
            mono
            type="number"
            data-testid={`${testPrefix}-flansch`}
            value={werte.flansch}
            onChange={(e) => patch({ flansch: e.target.value })}
          />
        </label>
      )}
    </>
  );
}

function ProfilAnlegenFormular({ onFertig }: { onFertig: () => void }) {
  const runCommand = useProject((s) => s.runCommand);
  const [werte, setWerte] = useState<ProfilFormWerte>(leereFormWerte());
  const patch = (p: Partial<ProfilFormWerte>) => setWerte((w) => ({ ...w, ...p }));

  const anlegen = () => {
    if (werte.name.trim().length === 0) {
      meldeFehler(new Error('Name darf nicht leer sein'));
      return;
    }
    try {
      runCommand('design.profilErstellen', { name: werte.name, form: werte.form, ...masseParams(werte) });
      setWerte(leereFormWerte(werte.form));
      onFertig();
    } catch (err) {
      meldeFehler(err);
    }
  };

  return (
    <div className="pd3b-block" data-testid="island-profil-anlegen-formular">
      <ProfilFormFelder werte={werte} patch={patch} testPrefix="island-profil-neu" />
      <KButton size="sm" tone="accent" data-testid="island-profil-anlegen" onClick={anlegen}>
        Profil anlegen
      </KButton>
    </div>
  );
}

function ProfilZeile({ profil }: { profil: Profil }) {
  const runCommand = useProject((s) => s.runCommand);
  const [bearbeiten, setBearbeiten] = useState(false);
  const [werte, setWerte] = useState<ProfilFormWerte>(() => formWerteAusProfil(profil));
  const [loeschFehler, setLoeschFehler] = useState<string | null>(null);
  const patch = (p: Partial<ProfilFormWerte>) => setWerte((w) => ({ ...w, ...p }));

  const speichern = () => {
    if (werte.name.trim().length === 0) {
      meldeFehler(new Error('Name darf nicht leer sein'));
      return;
    }
    try {
      runCommand('design.profilAendern', {
        profilId: profil.id,
        name: werte.name,
        form: werte.form,
        ...masseParams(werte),
      });
      setBearbeiten(false);
    } catch (err) {
      meldeFehler(err);
    }
  };

  const loeschen = () => {
    setLoeschFehler(null);
    try {
      runCommand('design.profilLoeschen', { profilId: profil.id });
    } catch (err) {
      // EHRLICH anzeigen statt stumm schlucken (V092-SPEZ §P-P2) — Toast
      // (Bestandsweg) PLUS ein bleibender Inline-Hinweis unter der Zeile,
      // damit die Referenzliste des Kernel-Fehlers lesbar bleibt, auch wenn
      // der 8s-Toast längst verschwunden ist.
      setLoeschFehler(err instanceof Error ? err.message : String(err));
      meldeFehler(err);
    }
  };

  if (bearbeiten) {
    return (
      <div className="pd3b-profil-zeile pd3b-block" data-testid={`island-profil-bearbeiten-formular-${profil.id}`}>
        <ProfilFormFelder werte={werte} patch={patch} testPrefix={`island-profil-bearb-${profil.id}`} />
        <div className="pd3b-knopfreihe">
          <KButton size="sm" tone="accent" data-testid={`island-profil-speichern-${profil.id}`} onClick={speichern}>
            Speichern
          </KButton>
          <KButton
            size="sm"
            tone="ghost"
            data-testid={`island-profil-abbrechen-${profil.id}`}
            onClick={() => {
              setWerte(formWerteAusProfil(profil));
              setBearbeiten(false);
            }}
          >
            Abbrechen
          </KButton>
        </div>
      </div>
    );
  }

  return (
    <div className="pd3b-profil-zeile" data-testid={`island-profil-zeile-${profil.id}`}>
      <div className="pd3b-profil-zeile-kopf">
        <span className="pd3b-profil-name" data-testid={`island-profil-name-${profil.id}`}>
          {profil.name}
        </span>
        <span className="pd3b-profil-form" data-testid={`island-profil-form-${profil.id}`}>
          {FORM_LABEL[profil.form]}
        </span>
        <span className="pd3b-profil-masse" data-testid={`island-profil-masse-${profil.id}`}>
          {profilMasseText(profil)}
        </span>
      </div>
      <div className="pd3b-knopfreihe">
        <KButton size="sm" tone="ghost" data-testid={`island-profil-bearbeiten-${profil.id}`} onClick={() => setBearbeiten(true)}>
          Ändern
        </KButton>
        <KButton size="sm" tone="danger" data-testid={`island-profil-loeschen-${profil.id}`} onClick={loeschen}>
          Löschen
        </KButton>
      </div>
      {loeschFehler !== null && (
        <p className="pd3b-hinweis pd3b-profil-fehler" data-testid={`island-profil-loesch-fehler-${profil.id}`}>
          {loeschFehler}
        </p>
      )}
    </div>
  );
}

function ProfilStufe2() {
  const profile = useProfile();
  return (
    <div className="pd3b-liste" data-testid="island-profil-stufe2" onClick={(e) => e.stopPropagation()}>
      <div className="pd3b-zeile">
        <span>Profile im Katalog</span>
        <strong data-testid="island-profil-anzahl">{profile.length}</strong>
      </div>
      {profile.length > 0 ? (
        <ul className="pd3b-profil-mini-liste">
          {profile.slice(0, 3).map((p) => (
            <li key={p.id}>
              {p.name} ({FORM_LABEL[p.form]})
            </li>
          ))}
        </ul>
      ) : (
        <p className="pd3b-hinweis">Noch kein Profil — im Einstellungsfenster anlegen.</p>
      )}
      <p className="pd3b-hinweis">Anlegen/Ändern/Löschen im Einstellungsfenster (2. Klick).</p>
    </div>
  );
}

function ProfilStufe3() {
  const profile = useProfile();
  const [neuOffen, setNeuOffen] = useState(false);
  return (
    <div className="pd3b-block pd3b-profil-manager" data-testid="island-profil-stufe3">
      <p className="pd3b-hinweis">
        Typenkatalog für Stützen-/Unterzugprofile (projektglobal, wie Aufbauten) — ein noch
        referenziertes Profil kann NICHT gelöscht werden, die Fehlermeldung nennt die Stützen/
        Unterzüge, die es referenzieren.
      </p>
      {profile.length === 0 ? (
        <p className="pd3b-hinweis" data-testid="island-profil-leer">
          Noch kein Profil im Katalog.
        </p>
      ) : (
        <div className="pd3b-profil-liste" data-testid="island-profil-liste">
          {profile.map((p) => (
            <ProfilZeile key={p.id} profil={p} />
          ))}
        </div>
      )}
      {neuOffen ? (
        <ProfilAnlegenFormular onFertig={() => setNeuOffen(false)} />
      ) : (
        <KButton size="sm" tone="ghost" data-testid="island-profil-neu-oeffnen" onClick={() => setNeuOffen(true)}>
          + Neues Profil
        </KButton>
      )}
    </div>
  );
}

registriereInhalt('profil', { Stufe2: ProfilStufe2, Stufe3: ProfilStufe3 });
