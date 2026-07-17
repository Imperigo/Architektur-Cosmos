import { useEffect, useMemo, useRef, useState } from 'react';
import {
  LearningJournal,
  LORA_ADAPTER_REGISTRY,
  baueKosmoSftAusJournal,
  baueLoraTrainManifest,
  exportiereUndTrainiere,
  generalisiereLoraTrainBericht,
  type AussortierterJournalEintrag,
  type Learning,
} from '@kosmo/ai';
import { LoraTrainBerichtV1, LoraTrainManifest } from '@kosmo/contracts';
import {
  Badge,
  Hairline,
  Karteikarte,
  KButton,
  KDialog,
  KIcon,
  KInput,
  KToolbar,
  Measure,
  Messrahmen,
  moduleHue,
} from '@kosmo/ui';
import { listDocs } from '../prepare/knowledge';
import { useQuellen } from '../../state/quellen';
import { journalStore } from '../../state/journal-store';
import './train.css';

/** Ehrliches Ampel-Etikett je Registry-Status (§2.4/§5.2) — reiner Text, keine erfundene Zahl. */
const STATUS_ETIKETT: Record<(typeof LORA_ADAPTER_REGISTRY)[number]['status'], string> = {
  leer: 'leer',
  wächst: 'wächst',
  reproduzierbar: 'reproduzierbar',
  vollständig: 'vollständig',
  wartet: 'wartet auf Owner/HomeStation',
};

function ladeDatei(name: string, inhalt: string, typ: string) {
  const url = URL.createObjectURL(new Blob([inhalt], { type: typ }));
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}

/**
 * KosmoTrain — das Lernprogramm als Oberfläche (Q8, Vision Persona 4):
 * Lernstand (was gesammelt ist), Kuration (was ins Training darf) und
 * das Trainingspaket (JSONL + Rezept). Das eigentliche LoRA-Training
 * läuft auf der HomeStation (docs/KOSMOTRAIN.md) — hier wird der
 * Datensatz gepflegt, ehrlich und ohne Attrappen.
 *
 * v0.8.0B / W8c-A (Spez §2/§3, Owner-Entscheid 16.07. «Scope-Blindpunkt jetzt
 * nachziehen»): reiner Visual-Umbau auf `train.css` (Muster `publish.css`/
 * `data.css`) — Inline-Styles 20→<5 (Rest: Modul-Hue-Carrier `--_hue`).
 * **Signal-Audit:** «JSONL exportieren» war bereits die einzige gefüllte
 * Signal-Fläche (Gesetz 1 schon erfüllt), keine Änderung nötig.
 */

export function TrainWorkspace() {
  const journal = useMemo(() => new LearningJournal(journalStore()), []);
  const [eintraege, setEintraege] = useState<readonly Learning[]>(journal.all);
  const [wissen, setWissen] = useState<{ docs: number } | null>(null);

  useEffect(() => {
    void listDocs().then((d) => setWissen({ docs: d.length }));
  }, []);

  // Quellensprung: von Kosmo zitierten Journal-Eintrag markieren
  const ziel = useQuellen((s) => s.ziel);
  const zielSeq = useQuellen((s) => s.zielSeq);
  const sprungRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (ziel?.typ === 'journal') {
      setTimeout(() => sprungRef.current?.scrollIntoView({ block: 'center', behavior: 'smooth' }), 60);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [zielSeq]);

  const gut = eintraege.filter((e) => e.sentiment === 'gut').length;
  const refresh = () => setEintraege([...journal.all]);

  // v0.8.2 / P5 «Trainer-Contract + Trainingspaket» (docs/V082-SPEZ.md §6.5):
  // je Adapter eine ehrliche Statuszeile aus der (eigenen) Registry-Logik in
  // @kosmo/ai; nur kosmo-buero ist heute real aus dem Journal befüllbar —
  // die anderen zeigen ihren Registry-Hinweis ohne Trainingslauf-Versprechen.
  const [paket, setPaket] = useState<{ manifest: LoraTrainManifest; jsonl: string } | null>(null);
  const [probelauf, setProbelauf] = useState<LoraTrainBerichtV1 | null>(null);
  const [schnuerenFehler, setSchnuerenFehler] = useState<string | null>(null);
  /**
   * v0.8.2 / P6 «Staffelung + Kuratier-Flow» (`docs/V082-SPEZ.md` §6.7) —
   * der ehrliche Kuratier-Flow bedient den Weg Journal → Kuration →
   * `exportiereUndTrainiere` bedienbar: `verworfen` (unten, aus derselben
   * `baueKosmoSftAusJournal`-Logik wie das «Trainingspaket schnüren»)
   * beweist SOFORT beim Sichten, welche Journal-Einträge (noch) NICHT ins
   * kuratierte kosmo-buero-Beispiel einfliessen — MIT Begründung
   * (`AussortierterJournalEintrag.grund`, `lora-training.ts`), nicht als
   * stilles Verschwinden. `kuratierAussortiert` hält zusätzlich die
   * Aussortierungs-Gründe des LETZTEN Fake-Probelaufs (`baueLoraDatensatz
   * AusJsonl`-Pfad über `journal.toJsonl()` — dieselbe Aussortierungs-Logik,
   * andere Quelle: das RAW Journal statt der kuratierten kosmo-sft-Sicht).
   */
  const [kuratierAussortiert, setKuratierAussortiert] = useState<AussortierterJournalEintrag[]>([]);

  const kosmoSft = useMemo(() => baueKosmoSftAusJournal(eintraege, 'private'), [eintraege]);

  const schnuereTrainingspaket = async () => {
    setSchnuerenFehler(null);
    try {
      const jsonl = kosmoSft.beispiele.map((b) => JSON.stringify(b)).join('\n');
      const manifestDaten = await baueLoraTrainManifest({
        adapter: 'kosmo-buero',
        dateien: [{ pfad: 'kosmo-buero-sft.jsonl', inhalt: jsonl, format: 'kosmo-sft/v1', visibility: 'private' }],
        rezept: 'docs/KOSMOTRAIN.md §3',
        evalSuite: 'wissen/training/eval/kosmo-buero/',
        visibility: 'private',
        hinweis: `${kosmoSft.beispiele.length} Beispiel(e) aus dem Lernjournal, ${kosmoSft.verworfen.length} ohne Notiz verworfen.`,
      });
      const manifest = LoraTrainManifest.parse(manifestDaten);
      setPaket({ manifest, jsonl });
    } catch (fehler) {
      setSchnuerenFehler(fehler instanceof Error ? fehler.message : 'Manifest liess sich nicht bauen.');
    }
  };

  const ladeManifestUndJsonl = () => {
    if (!paket) return;
    ladeDatei('kosmo-buero-manifest.json', JSON.stringify(paket.manifest, null, 2), 'application/json');
    ladeDatei('kosmo-buero-sft.jsonl', paket.jsonl, 'application/jsonl');
  };

  const fakeProbelauf = async () => {
    const { datensatz, bericht } = await exportiereUndTrainiere(journal);
    setProbelauf(LoraTrainBerichtV1.parse(generalisiereLoraTrainBericht(bericht, 'kosmo-buero')));
    // v0.8.2/P6 (§6.7, additiv): dieselbe Aussortierungs-mit-Grund-Logik
    // (`lora-training.ts#baueLoraDatensatzAusJsonl`), hier nur zusätzlich
    // SICHTBAR gemacht statt nur als Zahl (`bericht.anzahlAussortiert`).
    setKuratierAussortiert(datensatz.aussortiert);
  };

  const exportJsonl = () => {
    const url = URL.createObjectURL(new Blob([journal.toJsonl()], { type: 'application/jsonl' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = 'kosmo-lernjournal.jsonl';
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 10_000);
  };

  const REZEPT = [
    'Journal hier kuratieren: schlechte Beispiele schärfen (Notiz!), Unbrauchbares löschen.',
    'JSONL exportieren und auf die HomeStation legen.',
    'Unsloth-QLoRA nach docs/KOSMOTRAIN.md auf der 5090 laufen lassen (~Stunden, nicht Tage).',
    'GGUF exportieren → «ollama create kosmo-buero» → in den Kosmo-Einstellungen als Modell wählen.',
    'Eine Woche arbeiten, wieder kuratieren — der Zyklus macht Kosmo zum Büro-Kosmo.',
  ];

  return (
    <div className="train-viewport">
      <div className="train-content">
        {/* Kosmos-Kopf — reine Kopf-/Rahmen-Optik (Glass + Modul-Tönung),
            Inhalt/Testids/Logik der Werkzeugleiste unverändert. */}
        <div className="k-glass train-kopf" style={{ ['--_hue' as string]: moduleHue.train }}>
          <KToolbar data-testid="train-werkzeugleiste" className="train-kopf-leiste">
            <Badge hue={moduleHue.train}>KosmoTrain</Badge>
            <span className="train-kopf-satz">
              Das System lernt DICH — Journal kuratieren, Trainingspaket schnüren.
            </span>
            <div className="train-kopf-spacer" />
            {/* Dezenter Train-Hue-Glow (35%) auf der Primäraktion — reine
                Optik, Logik/Testid unverändert. */}
            <KButton
              size="sm"
              tone="accent"
              onClick={exportJsonl}
              data-testid="train-export"
              disabled={eintraege.length === 0}
              className="train-export-knopf"
            >
              JSONL exportieren
            </KButton>
          </KToolbar>
        </div>
        <Hairline />

        {/* Lernstand — Glass + dezente Train-Hue-Note (40%). */}
        <div className="k-glass train-stand" style={{ ['--_hue' as string]: moduleHue.train }} data-testid="train-stand">
          <span className="k-titel train-stand-titel">Lernstand</span>
          <Measure>{eintraege.length} Journal-Einträge</Measure>
          {/* `Measure` (kosmo-ui) nimmt kein `className` — die Farbe erbt
              darum über einen klassenbasierten Wrapper. */}
          <span className="train-stand-gut"><Measure>{gut} 👍</Measure></span>
          <span className="train-stand-schlecht"><Measure>{eintraege.length - gut} 👎</Measure></span>
          <Measure>{wissen ? `${wissen.docs} Grundlagen-Dokumente` : '… Wissensbasis'}</Measure>
        </div>

        {/* Kuration */}
        {eintraege.length === 0 ? (
          <Messrahmen
            height={180}
            caption="Noch nichts zu kuratieren — 👍/👎 unter Kosmo-Antworten sammelt Beispiele"
          />
        ) : (
          // Glass-Rahmen + dezente Train-Hue-Note (40%) um die Kuration-
          // Liste — die einzelnen Karteikarte-Einträge behalten ihre eigene
          // (geschnittene) Kartenoptik unangetastet.
          <div
            className="k-glass train-kuration"
            style={{ ['--_hue' as string]: moduleHue.train }}
            data-testid="train-kuration"
          >
            {[...eintraege].reverse().map((e) => {
              const zitiert = ziel?.typ === 'journal' && ziel.ts === e.ts;
              return (
              <div
                key={e.ts}
                ref={zitiert ? sprungRef : undefined}
                {...(zitiert ? { 'data-testid': 'quelle-sprung-journal' } : {})}
                className={zitiert ? 'train-kuration-eintrag--zitiert' : undefined}
              >
              <Karteikarte>
                <div className="train-kuration-zeile">
                  <div className="train-kuration-kopf">
                    <span>{e.sentiment === 'gut' ? '👍' : '👎'}</span>
                    <span className="train-kuration-text">{e.context}</span>
                    <span className="train-kuration-zeit">
                      {e.ts.slice(0, 16).replace('T', ' ')}
                    </span>
                    <KButton
                      size="sm"
                      tone="ghost"
                      aria-label="Eintrag löschen"
                      onClick={() => {
                        journal.entfernen(e.ts);
                        refresh();
                      }}
                    >
                      <KIcon name="schliessen" size={14} title="Eintrag löschen" />
                    </KButton>
                  </div>
                  <KInput
                    size="sm"
                    defaultValue={e.note ?? ''}
                    placeholder="Notiz schärfen — sie ist der Trainings-Kern (z.B. «nie Fenster unter 900 Brüstung vorschlagen»)"
                    onBlur={(ev) => {
                      if (ev.target.value !== (e.note ?? '')) {
                        journal.notieren(e.ts, ev.target.value);
                        refresh();
                      }
                    }}
                  />
                </div>
              </Karteikarte>
              </div>
              );
            })}
          </div>
        )}

        <Hairline />

        {/* Trainingspaket — Adapter-Status (Registry-Logik) + Schnüren/Probelauf,
            v0.8.2 / P5 (docs/V082-SPEZ.md §6.5). Nur kosmo-buero ist heute real
            aus dem Journal befüllbar; die anderen Adapter zeigen ihren
            ehrlichen Registry-Hinweis, kein Trainingslauf-Versprechen. */}
        <div className="k-glass train-paket" style={{ ['--_hue' as string]: moduleHue.train }} data-testid="train-paket">
          <span className="k-titel train-paket-titel">Trainingspaket</span>
          <div className="train-paket-registry" data-testid="train-adapter-registry">
            {LORA_ADAPTER_REGISTRY.map((r) => (
              <div key={r.id} className="train-paket-adapter" data-testid={`train-adapter-${r.id}`}>
                <span className="train-paket-adapter-id">{r.id}</span>
                <span className="train-paket-adapter-ziel">{r.ziel}</span>
                <span className="train-paket-adapter-status" data-testid={`train-adapter-status-${r.id}`}>
                  {STATUS_ETIKETT[r.status]}
                </span>
                <span className="train-paket-adapter-hinweis">{r.hinweis}</span>
              </div>
            ))}
          </div>

          {/* v0.8.2 / P6 «Kuratier-Flow» (docs/V082-SPEZ.md §6.7) — Journal →
              Kuration: SICHTEN, welche Einträge (noch) nicht ins kuratierte
              kosmo-buero-Beispiel einfliessen, MIT Begründung (dieselbe
              Aussortierung-mit-Grund-Logik wie exportiereUndTrainiere unten). */}
          <div className="train-kuratier-flow" data-testid="train-kuratier-flow">
            <span className="train-kuratier-flow-titel">Kuratier-Flow — sichten &amp; aussortieren (kosmo-buero)</span>
            {kosmoSft.verworfen.length === 0 ? (
              <div data-testid="train-kuratier-verworfen-leer">
                <Measure>
                  Kein Journal-Eintrag aussortiert — jeder vorhandene Eintrag ist entweder schon kuratiert oder noch
                  nicht bewertet.
                </Measure>
              </div>
            ) : (
              <div className="train-kuratier-liste" data-testid="train-kuratier-verworfen">
                {kosmoSft.verworfen.map((v, i) => (
                  <div key={v.quelleTs ?? i} className="train-kuratier-eintrag" data-testid="train-kuratier-verworfen-eintrag">
                    <span className="train-kuratier-eintrag-quelle">{v.quelleTs ?? `Zeile ${v.index}`}</span>
                    <span className="train-kuratier-eintrag-grund">{v.grund}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="train-paket-aktionen">
            <KButton
              size="sm"
              tone="accent"
              onClick={() => void schnuereTrainingspaket()}
              data-testid="train-paket-schnueren"
              disabled={kosmoSft.beispiele.length === 0}
            >
              Trainingspaket schnüren (kosmo-buero)
            </KButton>
            <KButton size="sm" tone="ghost" onClick={() => void fakeProbelauf()} data-testid="train-fake-probelauf">
              Fake-Probelauf
            </KButton>
          </div>
          {kosmoSft.beispiele.length === 0 && (
            <Measure>Noch keine kuratierten Einträge (mit Notiz) — kein kosmo-sft/v1-Beispiel möglich.</Measure>
          )}
          {schnuerenFehler !== null && (
            <span className="train-paket-fehler" data-testid="train-paket-fehler">
              {schnuerenFehler}
            </span>
          )}
          {probelauf !== null && (
            <div className="train-paket-bericht" data-testid="train-fake-bericht">
              <Measure>
                Fake-Bericht ({probelauf.trainerId}, fake={String(probelauf.fake)}): {probelauf.beispiele} Beispiel(e),{' '}
                {probelauf.verworfen} verworfen — {probelauf.hinweise[0]}
              </Measure>
              {/* v0.8.2/P6 (§6.7, additiv): dieselbe Aussortierung-mit-Grund-
                  Logik, hier je Zeile statt nur als Zahl. */}
              {kuratierAussortiert.length > 0 && (
                <div className="train-kuratier-liste" data-testid="train-kuratier-aussortiert">
                  {kuratierAussortiert.map((a, i) => (
                    <div key={a.quelleTs ?? i} className="train-kuratier-eintrag" data-testid="train-kuratier-aussortiert-eintrag">
                      <span className="train-kuratier-eintrag-quelle">{a.quelleTs ?? `Zeile ${a.index}`}</span>
                      <span className="train-kuratier-eintrag-grund">{a.grund}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {paket !== null && (
          <KDialog
            titel="Trainingspaket schnüren — kosmo-buero"
            onClose={() => setPaket(null)}
            data-testid="train-paket-dialog"
            fusszeile={
              <KButton size="sm" tone="accent" onClick={ladeManifestUndJsonl} data-testid="train-paket-download">
                Manifest + JSONL herunterladen
              </KButton>
            }
          >
            <div className="train-paket-vorschau">
              <Measure>Adapter: {paket.manifest.adapter}</Measure>
              <Measure>Rezept: {paket.manifest.rezept}</Measure>
              <Measure>Visibility-Deckel: {paket.manifest.visibility}</Measure>
              {paket.manifest.dateien.map((d) => (
                <span key={d.pfad} className="train-paket-vorschau-datei" data-testid="train-paket-datei">
                  {d.pfad} — {d.anzahlZeilen ?? 0} Zeile(n) — sha256 {d.sha256.slice(0, 12)}…
                </span>
              ))}
              {paket.manifest.hinweis !== undefined && <Measure>{paket.manifest.hinweis}</Measure>}
            </div>
          </KDialog>
        )}

        {/* Trainings-Zyklus */}
        <div className="train-zyklus">
          <span className="k-titel train-zyklus-titel">Trainings-Zyklus (HomeStation)</span>
          {REZEPT.map((r, i) => (
            <Karteikarte key={i} nr={i + 1}>
              <span className="train-zyklus-text">{r}</span>
            </Karteikarte>
          ))}
          <span className="train-zyklus-fuss">
            Ehrlich: Schritte 3–5 brauchen die 5090 — das volle Rezept steht in docs/KOSMOTRAIN.md.
            Hier entsteht der Datensatz; trainiert wird zuhause.
          </span>
        </div>
      </div>
    </div>
  );
}
