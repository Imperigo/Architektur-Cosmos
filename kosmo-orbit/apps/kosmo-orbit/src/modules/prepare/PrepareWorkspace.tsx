import { useProject } from '../../state/project-store';
import { useEffect, useRef, useState } from 'react';
import { Karteikarte, Messrahmen, Badge, KButton, KIcon, KInput, KSelect, KToolbar, Panel, moduleHue } from '@kosmo/ui';
import { getChunk, ingestFile, listDocs, removeDoc, searchKnowledge, type KnowledgeDoc, type KnowledgeHit } from './knowledge';
import { useQuellen } from '../../state/quellen';
// PC4 (`docs/V084-SPEZ.md` §5 W3, C-20): die drei geteilten Unterflüsse
// (OneDrive/Basis-Import/Nachträglich vektorisieren) leben jetzt in
// `prepare-sections.tsx` (reine Ortsverlegung, s. dortiger Kopfkommentar) —
// sowohl dieser klassische Fluss ALS AUCH die neuen Insel-Inhalte
// importieren dieselbe Komponente, kein zirkulärer Import nötig.
import { BasisSection, NachtraeglichVektorisierenSection, OneDriveSection } from './prepare-sections';
import { useUiZustand } from '../../state/ui-zustand';
// PC4 (`docs/V084-SPEZ.md` §5 W3, C-20) — der Prepare-Island-Katalog (eigener
// Namensraum, s. `island/inhalte/registry.ts`-Kopfkommentar) + die
// Registrierung seiner Stufe-2/3-Inhalte als Import-Seiteneffekt (Muster
// `vis/VisWorkspace.tsx` ‖ `design/island/IslandShell.tsx`s Kopfimporte).
import { PREPARE_INSELN, prepareInhaltsRegistry } from './island';
// PC4/E1 (`docs/V084-SPEZ.md` §5 W3) — NUR IMPORTIEREN, design/island/**
// bleibt fremder Dateibesitz (Sanktion 2 gilt spiegelbildlich: PC4 fasst
// keine design-Datei an). `IslandBuehne` ist die generische PC0-Bühne,
// bereits stationsagnostisch gebaut (`inseln`+`registry`, Muster PC1).
import { IslandBuehne } from '../design/island/IslandShell';
import type { IslandWerkzeug } from '../design/island/island-katalog';
// PB4-Nachzug (C-25, E2-Orb-Gesetz): derselbe Kosmo-Orb wie in Publish
// (`PublishWorkspace.tsx`) — Kosmo ist überall gleich aufgebaut.
import { KosmoOrb } from '../design/island/KosmoOrb';
// C-14/Reserve-Vertrag (`docs/V084-SPEZ.md` §5 W3, C-20, «Nicht-Island
// behält Reserve»): Prepare hat KEINE `DockFlaeche`, die die reale
// Boden-Dock-Position live misst (Muster `e2e/boden-dock-reserve-c14.spec.
// ts`s Kopfkommentar zu daten/wissen/chat/pipeline) — im Manuell-Modus
// (BodenDock sichtbar, `bodenDockAusgeblendet===false`) bekommt der
// scrollende Viewport darum denselben statischen Bottom-Padding-Zuschlag
// wie `DataWorkspace.tsx`/`DevWorkspace.tsx`, NUR importiert.
import { BODEN_DOCK_RESERVE_PX } from '../../shell/BodenDock';
import './island/prepare-island.css';
import './prepare.css';

/**
 * KosmoPrepare — Grundlagen. Bürodokumente (Normen-Auszüge, Wettbewerbs-
 * programme, Hochbauzeichner-Bibliothek) werden lokal aufgenommen; Kosmo
 * zitiert daraus über «quellen_suchen» mit [Qn]-Belegen. OneDrive-Anbindung (Graph-Login)
 * folgt — die Wissensbasis ist dieselbe.
 *
 * v0.8.0B / W8c-A (Spez §2/§3, Owner-Entscheid 16.07. «Scope-Blindpunkt jetzt
 * nachziehen»): reiner Visual-Umbau auf `prepare.css` (Muster `publish.css`/
 * `data.css`) — Inline-Styles 60→<5 (Rest: Modul-Hue-Carrier `--_hue`).
 * **Signal-Audit:** «Dateien wählen» bleibt die EINE gefüllte Signal-Fläche
 * der Station (der Eintrittspunkt der Wissensaufnahme, Gesetz 1); Dossier-
 * «Übernehmen», Basis-«Laden» und OneDrive-«Anmelden» sind Neben-/
 * Abschluss-Aktionen ihrer eigenen (optionalen) Unterflüsse → `tone="quiet"`.
 */

export function PrepareWorkspace() {
  // PC4 (`docs/V084-SPEZ.md` §5 W3, C-20) — Island-Modus. `prepareOberflaeche`
  // spiegelt `VisWorkspace.tsx`s `visOberflaeche`-Umschalter 1:1 (additives
  // Store-Feld, `state/ui-zustand.ts`, Default 'island'). Alle Hooks unten
  // (inkl. `docs`/`addFiles`/Quellensprung) bleiben UNVERÄNDERT und laufen bei
  // JEDEM Render — der Island/Manuell-Zweig entscheidet sich erst am frühen
  // Return weiter unten (Muster `VisWorkspace.tsx` Z.394, exakt dieselbe
  // Reihenfolge: alle Hooks zuerst, Verzweigung danach).
  const prepareOberflaeche = useUiZustand((s) => s.prepareOberflaeche);
  const setPrepareOberflaeche = useUiZustand((s) => s.setPrepareOberflaeche);
  const [docs, setDocs] = useState<KnowledgeDoc[]>([]);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [hits, setHits] = useState<KnowledgeHit[]>([]);
  const [dragOver, setDragOver] = useState(false);
  const searchSeq = useRef(0);

  const refresh = () => void listDocs().then(setDocs);
  useEffect(refresh, []);

  // Quellensprung aus einer Kosmo-Antwort: zitierten Abschnitt zeigen
  const ziel = useQuellen((s) => s.ziel);
  const zielSeq = useQuellen((s) => s.zielSeq);
  const [sprung, setSprung] = useState<{ titel: string; text: string } | null>(null);
  const sprungRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!ziel || ziel.typ !== 'wissen' || ziel.docId === undefined || ziel.seq === undefined) return;
    void getChunk(ziel.docId, ziel.seq).then((c) => {
      setSprung({ titel: ziel.titel, text: c?.text ?? ziel.text });
      setTimeout(() => sprungRef.current?.scrollIntoView({ block: 'start', behavior: 'smooth' }), 60);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [zielSeq]);

  useEffect(() => {
    const q = query.trim();
    const seq = ++searchSeq.current;
    if (q.length < 3) {
      setHits([]);
      return;
    }
    void searchKnowledge(q, 6).then((h) => {
      if (searchSeq.current === seq) setHits(h);
    });
  }, [query]);

  async function addFiles(files: FileList | File[]) {
    setError(null);
    for (const f of Array.from(files)) {
      setBusy(f.name);
      try {
        await ingestFile(f);
      } catch (err) {
        setError(err instanceof Error ? err.message : String(err));
      }
    }
    setBusy(null);
    refresh();
  }

  function pickFiles() {
    const input = document.createElement('input');
    input.type = 'file';
    input.multiple = true;
    input.accept = '.pdf,.txt,.md,text/plain,application/pdf';
    input.onchange = () => input.files && void addFiles(input.files);
    input.click();
  }

  // -----------------------------------------------------------------------
  // PC4 (`docs/V084-SPEZ.md` §5 W3, C-20) — Island-Modus, EIGENER früher
  // Return VOR der klassischen Werkzeugleiste/Dokumentliste unten (Muster
  // `VisWorkspace.tsx` Z.380-414): wird dieser Zweig nie erreicht (jeder
  // Bestands-E2E-Lauf startet über `manuell-seed.ts` mit
  // `prepareOberflaeche:'manuell'`), bleibt JEDE Zeile unterhalb byte-gleich
  // zum Vorzustand (Bestandsschutz, Sanktion 8). Die zentrale Bühne zeigt
  // einen ehrlichen Bestands-Schnellüberblick (echte `docs`-Zahlen, kein
  // Platzhaltertext) statt eines Canvas — Prepare hat keine Zeichenfläche wie
  // design/vis, s. Abschlussbericht «ehrliche Grenzen».
  if (prepareOberflaeche === 'island') {
    const chunkGesamt = docs.reduce((s, d) => s + d.chunkCount, 0);
    return (
      <div className="prepare-island-viewport" data-testid="prepare-island-fuellen">
        <div className="prepare-island-buehne">
          <div className="prepare-island-stand" data-testid="prepare-island-stand">
            {docs.length === 0 ? (
              <Messrahmen
                height={180}
                caption="Noch keine Grundlagen — die AUFNAHME-Insel (links) nimmt die ersten Dokumente auf"
              />
            ) : (
              <>
                <span className="prepare-island-stand-zahl" data-testid="prepare-island-doc-zahl">
                  {docs.length}
                </span>
                <span className="prepare-island-stand-satz">
                  {docs.length === 1 ? 'Dokument' : 'Dokumente'} · {chunkGesamt}{' '}
                  {chunkGesamt === 1 ? 'Abschnitt' : 'Abschnitte'} · lokal, verlässt das Gerät nie — BESTAND (rechts)
                  zeigt die Liste, WISSEN (oben) durchsucht sie.
                </span>
              </>
            )}
          </div>
        </div>
        <IslandBuehne
          inseln={PREPARE_INSELN}
          registry={prepareInhaltsRegistry}
          onWerkzeugAktion={(w: IslandWerkzeug) => {
            if (w.id === 'manuell') setPrepareOberflaeche('manuell');
          }}
        />
        <KosmoOrb />
      </div>
    );
  }

  return (
    // C-14/Reserve-Vertrag (s. Kopfimport-Kommentar zu `BODEN_DOCK_RESERVE_PX`
    // oben): additiver Inline-Style-Zuschlag auf dem bestehenden
    // `.prepare-viewport`-Rahmen — Klasse/Kinder/Testids/Logik darunter
    // bleiben WÖRTLICH unverändert («Manuell unverändert»).
    <div className="prepare-viewport" style={{ paddingBottom: `calc(var(--k-s6) + ${BODEN_DOCK_RESERVE_PX}px)` }}>
      <div className="prepare-content">
        {/* Kosmos-Kopf — reine Kopf-/Rahmen-Optik (Glass + Modul-Tönung),
            Inhalt/Testids/Logik der Werkzeugleiste unverändert. */}
        <div className="k-glass prepare-kopf" style={{ ['--_hue' as string]: moduleHue.prepare }}>
          <KToolbar data-testid="prepare-werkzeugleiste" className="prepare-kopf-leiste">
            <Badge hue={moduleHue.prepare}>Grundlagen</Badge>
            <span className="prepare-kopf-satz">
              Lokal aufgenommen — Dokumente verlassen das Gerät nie. Kosmo zitiert daraus.
            </span>
            {/* PC4 (`docs/V084-SPEZ.md` §5 W3, C-20): additiver Rückweg AUS
                'manuell' — Muster `VisWorkspace.tsx`s `island-zurueck`-Knopf
                (PC1). Der Vorwärtsweg ('manuell' → 'island') ist das
                'Manuell'-Insel-Werkzeug in AUSTAUSCH (nur im Island-Modus
                sichtbar); dieser Knopf ist sein Gegenstück. Additiv, kein
                Ersatz — die klassische Werkzeugleiste/Dokumentliste bleibt
                vollständig erhalten («Manuell unverändert», Bestandsschutz). */}
            <div className="prepare-dossier-spacer" />
            <KButton
              size="sm"
              tone="ghost"
              data-testid="island-zurueck"
              title="Zurück zur Island-UI"
              aria-label="Zurück zur Island-UI"
              onClick={() => setPrepareOberflaeche('island')}
            >
              Island-UI
            </KButton>
          </KToolbar>
        </div>

        {/* Quellensprung: der von Kosmo zitierte Abschnitt, hervorgehoben */}
        {sprung && (
          <div ref={sprungRef}>
            <Panel data-testid="quelle-sprung" className="prepare-sprung">
              <div className="prepare-sprung-kopf">
                <span className="k-titel prepare-sprung-titel">Quellensprung</span>
                <span className="prepare-sprung-quelle">{sprung.titel}</span>
                <div className="prepare-dossier-spacer" />
                <KButton size="sm" tone="ghost" onClick={() => setSprung(null)} aria-label="Quellensprung schliessen">
                  <KIcon name="schliessen" size={14} title="Quellensprung schliessen" />
                </KButton>
              </div>
              <div className="prepare-sprung-text">{sprung.text}</div>
            </Panel>
          </div>
        )}

        {/* Aufnahme-Zone — Glass + dezente Prepare-Hue-Note (40%) im
            Ruhezustand; der aktive Drag-Zustand (Akzentfarbe/-Wash) bleibt
            unverändert Vorrang. */}
        <Panel
          className={`k-glass prepare-ingest${dragOver ? ' prepare-ingest--drag' : ''}`}
          data-testid="ingest-zone"
          style={{ ['--_hue' as string]: moduleHue.prepare }}
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragOver(false);
            if (e.dataTransfer.files.length) void addFiles(e.dataTransfer.files);
          }}
        >
          <div className="prepare-ingest-titel">
            PDF, Text oder Markdown hierher ziehen
          </div>
          <div className="prepare-ingest-hinweis">
            Normen-Auszüge · Wettbewerbsprogramme · Baubeschriebe · Detailbibliothek
          </div>
          <KButton size="sm" tone="accent" onClick={pickFiles} data-testid="pick-files">
            Dateien wählen
          </KButton>
          {busy && (
            <div className="prepare-ingest-status">
              Nehme «{busy}» auf …
            </div>
          )}
          {error && (
            <div className="prepare-ingest-fehler">⚠ {error}</div>
          )}
        </Panel>

        {/* Suche */}
        <div>
          <KInput
            data-testid="knowledge-search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Wissensbasis durchsuchen … (z.B. «Brandschutz Treppenhaus»)"
            className="prepare-w-full"
          />
          {hits.length > 0 && (
            <div className="prepare-treffer-liste">
              {hits.map((h) => (
                <Panel
                  key={h.id}
                  className="k-glass prepare-treffer"
                  data-testid="knowledge-hit"
                  style={{ ['--_hue' as string]: moduleHue.prepare }}
                >
                  <div className="prepare-treffer-kopf">
                    {h.docName} · Abschnitt {h.seq + 1}
                  </div>
                  <div className="prepare-treffer-text">
                    {h.text.length > 320 ? `${h.text.slice(0, 320)} …` : h.text}
                  </div>
                </Panel>
              ))}
            </div>
          )}
        </div>

        <NachtraeglichVektorisierenSection />

        <BasisSection onGeladen={refresh} />

        {/* Dokumente (Basis-Sammlungen erscheinen kompakt oben, nicht als Einzelzeilen) */}
        <div className="prepare-sektion">
          <div className="prepare-sektion-titel">
            Aufgenommen ({docs.filter((d) => d.source !== 'basis').length})
          </div>
          {docs.filter((d) => d.source !== 'basis').length === 0 && (
            <Messrahmen
              height={180}
              caption="Noch keine Grundlagen — sobald Dokumente da sind, beantwortet Kosmo Fragen daraus"
            />
          )}
          {docs.filter((d) => d.source !== 'basis').map((d) => (
            <Panel key={d.id} data-testid={`doc-${d.id}`} className="prepare-doc-zeile">
              <div className="prepare-doc-info">
                <div className="prepare-doc-name">
                  {d.name}
                </div>
                <div className="prepare-doc-meta">
                  {d.pages ? `${d.pages} ${d.pages === 1 ? 'Seite' : 'Seiten'} · ` : ''}
                  {d.chunkCount} Abschnitte · {new Date(d.addedAt).toLocaleDateString('de-CH')} · {d.source}
                </div>
              </div>
              <KButton
                size="sm"
                tone="ghost"
                onClick={() => void removeDoc(d.id).then(refresh)}
                aria-label={`${d.name} entfernen`}
              >
                Entfernen
              </KButton>
            </Panel>
          ))}
        </div>

        <DossierSection />
        <OneDriveSection onIngested={refresh} />
      </div>
    </div>
  );
}

/** Phase 0: Wettbewerbsdossier — Do's, Don'ts, Fakten. Kosmo beachtet sie bindend. */
function DossierSection() {
  const revision = useProject((s) => s.revision);
  const runCommand = useProject((s) => s.runCommand);
  const doc = useProject.getState().doc;
  // Quellensprung: zitierten Dossier-Eintrag markieren
  const ziel = useQuellen((s) => s.ziel);
  const zielSeq = useQuellen((s) => s.zielSeq);
  const dossierSprungRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (ziel?.typ === 'dossier') {
      setTimeout(() => dossierSprungRef.current?.scrollIntoView({ block: 'center', behavior: 'smooth' }), 60);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [zielSeq]);
  // Entwurf lokal, «Übernehmen» = ein Undo-Schritt
  const [entwurf, setEntwurf] = useState<{ typ: 'do' | 'dont' | 'fakt'; text: string }[]>(() =>
    doc.settings.dossier.length > 0 ? [...doc.settings.dossier] : [{ typ: 'dont', text: '' }],
  );
  void revision;

  const TYPEN = [
    { key: 'do', label: 'Gefordert' },
    { key: 'dont', label: 'No-go' },
    { key: 'fakt', label: 'Fakt' },
  ] as const;

  return (
    // Glass-Rahmen + dezente Prepare-Hue-Note (40%) um den ganzen
    // Dossier-Block — reine Kartenoptik, Inhalt/Testid/Logik unverändert.
    <div className="k-glass prepare-dossier" style={{ ['--_hue' as string]: moduleHue.prepare }} data-testid="dossier">
      <div className="k-titel prepare-dossier-titel">Phase 0 — Wettbewerbsdossier</div>
      <span className="prepare-dossier-satz">
        Harte Regeln und Fakten aus dem Programm. Kosmo behandelt sie in jeder Antwort als bindend.
      </span>
      {entwurf.map((e, i) => (
        <div key={i} className="prepare-dossier-zeile">
          <KSelect
            size="sm"
            value={e.typ}
            data-testid={`dossier-typ-${i}`}
            onChange={(ev) => {
              const next = [...entwurf];
              next[i] = { ...e, typ: ev.target.value as 'do' | 'dont' | 'fakt' };
              setEntwurf(next);
            }}
          >
            {TYPEN.map((t) => (
              <option key={t.key} value={t.key}>{t.label}</option>
            ))}
          </KSelect>
          <KInput
            size="sm"
            value={e.text}
            data-testid={`dossier-text-${i}`}
            placeholder="z.B. «Nordwohnungen ohne Direktsonne sind ein No-go»"
            onChange={(ev) => {
              const next = [...entwurf];
              next[i] = { ...e, text: ev.target.value };
              setEntwurf(next);
            }}
            className="prepare-dossier-input"
          />
          <KButton size="sm" tone="ghost" onClick={() => setEntwurf(entwurf.filter((_, j) => j !== i))} aria-label="Eintrag entfernen">
            <KIcon name="minus" size={14} title="Eintrag entfernen" />
          </KButton>
        </div>
      ))}
      <div className="prepare-dossier-fuss">
        <KButton size="sm" tone="ghost" onClick={() => setEntwurf([...entwurf, { typ: 'do', text: '' }])}>
          <KIcon name="plus" size={14} /> Eintrag
        </KButton>
        <div className="prepare-dossier-spacer" />
        <KButton
          size="sm"
          tone="quiet"
          data-testid="dossier-uebernehmen"
          onClick={() => runCommand('design.dossierSetzen', { eintraege: entwurf.filter((e) => e.text.trim().length > 0) })}
        >
          Übernehmen
        </KButton>
      </div>
      {doc.settings.dossier.length > 0 && (
        <div className="prepare-sektion">
          {doc.settings.dossier.map((e, i) => {
            const zitiert = ziel?.typ === 'dossier' && ziel.index === i;
            return (
            <div
              key={i}
              ref={zitiert ? dossierSprungRef : undefined}
              {...(zitiert ? { 'data-testid': 'quelle-sprung-dossier' } : {})}
              className={zitiert ? 'prepare-dossier-eintrag--zitiert' : undefined}
            >
              <Karteikarte nr={i + 1}>
                <div className="prepare-dossier-zeile">
                  <span
                    className={`prepare-dossier-typ prepare-dossier-typ--${e.typ}`}
                  >
                    {e.typ === 'dont' ? 'NO-GO' : e.typ === 'do' ? 'GEFORDERT' : 'FAKT'}
                  </span>
                  <span className="prepare-dossier-eintrag-text">{e.text}</span>
                </div>
              </Karteikarte>
            </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
