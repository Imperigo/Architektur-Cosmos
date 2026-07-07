import { expect, test } from '@playwright/test';
import { BRIDGE_FEHLT_HINWEIS, bridgeVerfuegbar } from './sim/bausteine';

/**
 * Serie H / H3a (`docs/SERIE-H-BUILDPLAN.md` Abschnitt 3, 6→H3a, 8→H3a) — die
 * fünf KI-/Imaging-Ehrlichkeits-Assertions, gebündelt in EINER Datei und
 * gefahren DIREKT gegen die (Fake-)Bridge (`tools/homestation-bridge/
 * kosmo_bridge/main.py`) aus dem NODE-Kontext (kein `page` nötig — reine
 * HTTP-Kette). Geprüft wird ausschliesslich **der Weg und die ehrliche
 * Meldung**, NIE die Qualität: echtes Bildrendering, Whisper/Piper scharf,
 * LoRA und SfM bleiben HomeStation-Sache (Abschnitt 9).
 *
 * Jede Assertion trägt einen Quellkommentar auf die exakte main.py-Zeile/
 * Funktion, gegen die sie geprüft wurde (verifiziert vor dem Schreiben,
 * zusätzlich live gegen eine laufende `--fake-worker`-Bridge gegengeprüft).
 *
 * Gate (Regel R7): `bridgeVerfuegbar()` — tote Bridge → ehrlicher Skip mit
 * `BRIDGE_FEHLT_HINWEIS`, nie ein stiller Pass.
 */

const BRIDGE = 'http://127.0.0.1:8600';

let bridgeOk = false;

test.beforeAll(async () => {
  bridgeOk = await bridgeVerfuegbar(); // [Quelle: e2e/sim/bausteine.ts Baustein 15]
  if (!bridgeOk) {
    // eslint-disable-next-line no-console
    console.warn(`[sim-ki-imaging] ${BRIDGE_FEHLT_HINWEIS}`);
  }
});

test.describe('Serie H / H3a — Ehrlichkeits-Assertions gegen die Fake-Bridge', () => {
  test('TTS-Prüfton: /tts liefert deterministisches WAV, Länge > Header (44 Byte)', async () => {
    test.skip(!bridgeOk, BRIDGE_FEHLT_HINWEIS);

    const text = 'Kosmo prüft den Sprachausgang.';
    const res = await fetch(`${BRIDGE}/tts`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text }),
    }); // [Quelle: main.py '@app.post("/tts")' Z.430-437 — FAKE_WORKER-Zweig: Response(_fake_tts_wav(text), media_type='audio/wav')]
    expect(res.status).toBe(200);
    expect(res.headers.get('content-type')).toBe('audio/wav');
    const buf = Buffer.from(await res.arrayBuffer());
    // `_wav_header()` (main.py Z.404-412) ist exakt 44 Bytes lang (RIFF-Header
    // ohne Nutzdaten) — Body-Länge > 44 beweist echte (Prüfton-)Nutzdaten.
    expect(buf.length).toBeGreaterThan(44);

    // Deterministisch (main.py Z.415-427 `_fake_tts_wav`: fixe Formel aus
    // Textlänge, kein Zufall) — derselbe Text liefert bitgleiche Bytes.
    const res2 = await fetch(`${BRIDGE}/tts`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text }),
    });
    const buf2 = Buffer.from(await res2.arrayBuffer());
    expect(buf2.equals(buf)).toBe(true);

    // Länge folgt dem Text (main.py Z.421 `seconds = min(0.3 + len(text)*0.01, 2.0)`).
    const kurzRes = await fetch(`${BRIDGE}/tts`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: 'Hi' }),
    });
    const kurzBuf = Buffer.from(await kurzRes.arrayBuffer());
    expect(buf.length).toBeGreaterThan(kurzBuf.length);
  });

  test('STT-Ehrlichkeit: /stt meldet 501 mit Installationshinweis statt eines vorgetäuschten Transkripts', async () => {
    test.skip(!bridgeOk, BRIDGE_FEHLT_HINWEIS);

    // `/health` zuerst befragen: der ehrliche 501-Pfad greift NUR, wenn
    // faster-whisper nicht importierbar ist (main.py `_stt_available()`
    // Z.360-365, verwendet im health-Feld `services.stt` Z.221). Normalfall
    // im Container laut Buildplan ist "fehlt"; ist es (wie im Build-Sandbox
    // dieses Batches beobachtet, siehe SIM-BEFUNDE H-20) ausnahmsweise
    // installiert, nimmt /stt den echten Whisper-Pfad — dann wird dieser
    // Test EHRLICH übersprungen (kein stiller Pass, kein Erzwingen eines
    // Statuscodes gegen eine andere Umgebungsannahme).
    const health = (await (await fetch(`${BRIDGE}/health`)).json()) as { services?: { stt?: boolean } };
    test.skip(
      health.services?.stt === true,
      'faster-whisper ist in dieser Bridge-Umgebung importierbar (Normalfall wäre fehlend, SIM-BEFUNDE H-20) — 501-Ehrlichkeitspfad hier nicht auslösbar',
    );

    const form = new FormData();
    form.set('audio', new Blob([new Uint8Array(64)], { type: 'audio/wav' }), 'mini.wav'); // [Quelle: main.py '@app.post("/stt")' audio: UploadFile = File(...) Z.369]
    const res = await fetch(`${BRIDGE}/stt`, { method: 'POST', body: form });
    expect(res.status).toBe(501); // [Quelle: main.py Z.375-380 raise HTTPException(501, "faster-whisper fehlt: …")]
    const body = (await res.json()) as { detail: string };
    expect(body.detail).toContain('faster-whisper fehlt');
    expect(body.detail).toContain('pip install');
  });

  test('Embed-Modellname: /embed kennzeichnet sich ehrlich als "fake-trigram-64"', async () => {
    test.skip(!bridgeOk, BRIDGE_FEHLT_HINWEIS);

    const res = await fetch(`${BRIDGE}/embed`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ texts: ['Wärmedämmung Fassade', 'Grenzabstand Zonenregel'] }),
    }); // [Quelle: main.py '@app.post("/embed")' Z.498-505]
    expect(res.status).toBe(200);
    const json = (await res.json()) as { model: string; vectors: number[][] };
    expect(json.model).toBe('fake-trigram-64'); // [Quelle: main.py Z.505 FAKE_WORKER-Zweig: {"model": "fake-trigram-64", ...}]
    expect(json.vectors).toHaveLength(2);
    for (const vektor of json.vectors) {
      expect(vektor.length).toBe(64); // [Quelle: main.py '_fake_embed(text, dim=64)' Z.483-495]
    }
  });

  test('Render-QA-Verdict: render-result.json trägt method:"fake-worker" und die ehrliche Reason', async () => {
    test.skip(!bridgeOk, BRIDGE_FEHLT_HINWEIS);

    const form = new FormData();
    form.set('scene', '{}'); // [Quelle: main.py '@app.post("/jobs")' scene: str = Form(...) Z.251]
    form.set('model', new Blob([new Uint8Array([0, 1, 2, 3])], { type: 'model/gltf-binary' }), 'model.glb'); // [Quelle: main.py Z.251 model: UploadFile = File(...)]
    const createRes = await fetch(`${BRIDGE}/jobs`, { method: 'POST', body: form });
    expect(createRes.status).toBe(200);
    const created = (await createRes.json()) as { job_id: string; status: string };
    expect(created.status).toBe('queued'); // [Quelle: main.py Z.274 record["status"] = "queued"]

    await expect
      .poll(
        async () => {
          const job = (await (await fetch(`${BRIDGE}/jobs/${created.job_id}`)).json()) as { status: string };
          return job.status;
        },
        { timeout: 15_000, message: 'Fake-Worker liefert den Render-Job nicht rechtzeitig fertig' },
      )
      .toBe('done'); // [Quelle: main.py '_fake_worker_loop' Z.577-603, Poll-Intervall 1.5s]

    // Wörtlich das render-result.json-Artefakt lesen (nicht nur das
    // eingebettete `result`-Feld aus GET /jobs/{id}).
    const artifactRes = await fetch(`${BRIDGE}/jobs/${created.job_id}/artifacts/render-result.json`); // [Quelle: main.py '@app.get("/jobs/{job_id}/artifacts/{name}")' Z.308-313]
    expect(artifactRes.status).toBe(200);
    const artifact = (await artifactRes.json()) as {
      qa: { geometry: { method: string }; verdict: { passed: boolean; reason: string } };
    };
    expect(artifact.qa.geometry.method).toBe('fake-worker'); // [Quelle: main.py Z.595 "method": "fake-worker"]
    expect(artifact.qa.verdict.reason).toBe('Fake-Worker (Demo ohne GPU)'); // [Quelle: main.py Z.597 "reason": "Fake-Worker (Demo ohne GPU)"]
  });

  test('video-splat: ehrliche Grenze "kein-sfm-worker" statt eines vorgetäuschten Splats', async () => {
    test.skip(!bridgeOk, BRIDGE_FEHLT_HINWEIS);

    const form = new FormData();
    form.append('frames', new Blob([new Uint8Array([1, 2, 3])], { type: 'image/jpeg' }), 'frame-0000.jpg'); // [Quelle: main.py '@app.post("/jobs/video-splat")' frames: list[UploadFile] = File(...) Z.328]
    form.set('meta', JSON.stringify({ fps: 2 })); // [Quelle: main.py Z.328 meta: str = Form("{}")]
    const res = await fetch(`${BRIDGE}/jobs/video-splat`, { method: 'POST', body: form });
    expect(res.status).toBe(200);
    const created = (await res.json()) as { job_id: string; kind: string; status: string; frame_count: number };
    expect(created.kind).toBe('video-splat'); // [Quelle: main.py Z.348 record["kind"] = "video-splat"]
    expect(created.status).toBe('queued');
    expect(created.frame_count).toBe(1);

    await expect
      .poll(
        async () => {
          const job = (await (await fetch(`${BRIDGE}/jobs/${created.job_id}`)).json()) as { status: string };
          return job.status;
        },
        { timeout: 15_000, message: 'Fake-Worker meldet den video-splat-Job nicht als kein-sfm-worker' },
      )
      .toBe('kein-sfm-worker'); // [Quelle: main.py '_fake_worker_loop' Z.564-576 — KEIN Platzhalter-Splat, ehrlicher Status]

    const final = (await (await fetch(`${BRIDGE}/jobs/${created.job_id}`)).json()) as { message: string };
    expect(final.message).toContain('SfM'); // [Quelle: main.py Z.569-573 Begründungstext]
    expect(final.message).toContain('HomeStation');
  });

  // ─── V2-Technik Block 1 / HS6 — die neuen Block-Marker als Regressionsnetz ───
  // Append-only: die fünf Assertions oben bleiben zeichengenau. Freigabe-Pflicht
  // und Idle-Gate sind hier bewusst NICHT dupliziert — sie prüfen
  // test_bridge_haerte.py (HS2) und homestation-kette.spec.ts (HS3) gegen eine
  // eigene Bridge-Instanz; hier läuft alles gegen die Default-Fake-Bridge.

  test('HS6 (6) blender-sim: ehrliche Grenze "kein-blender-worker" (Physik wird NIE gefakt)', async () => {
    test.skip(!bridgeOk, BRIDGE_FEHLT_HINWEIS);

    const form = new FormData();
    form.set(
      'szene',
      JSON.stringify({ schema: 'kosmo.blender-sim/v1', art: 'wind', geometry: { path: 'x', format: 'glb' }, params: {}, out: 'x' }),
    ); // [Quelle: main.py '@app.post("/jobs/blender-sim")' szene: str = Form(...)]
    form.set('model', new Blob([new Uint8Array([0, 1, 2, 3])], { type: 'model/gltf-binary' }), 'model.glb');
    const createRes = await fetch(`${BRIDGE}/jobs/blender-sim`, { method: 'POST', body: form });
    expect(createRes.status).toBe(200);
    const created = (await createRes.json()) as { job_id: string; kind: string; status: string };
    expect(created.kind).toBe('blender-sim');
    expect(created.job_id.startsWith('bsim-')).toBe(true);
    expect(created.status).toBe('queued'); // Default-Bridge ohne Freigabe-Pflicht

    await expect
      .poll(
        async () => {
          const job = (await (await fetch(`${BRIDGE}/jobs/${created.job_id}`)).json()) as { status: string };
          return job.status;
        },
        { timeout: 15_000, message: 'Fake-Worker meldet den blender-sim-Job nicht als kein-blender-worker' },
      )
      .toBe('kein-blender-worker'); // [Quelle: main.py '_fake_worker_step' blender-sim-Zweig — kein vorgetäuschtes Ergebnis]

    const final = (await (await fetch(`${BRIDGE}/jobs/${created.job_id}`)).json()) as { message: string };
    expect(final.message).toContain('Blender');
    expect(final.message).toContain('HomeStation');
  });

  test('HS6 (7) Render-Record: approval_token CONFIRMED_RENDER_, idle_window_only, nach done worker fake-worker', async () => {
    test.skip(!bridgeOk, BRIDGE_FEHLT_HINWEIS);

    const form = new FormData();
    form.set('scene', '{}');
    form.set('model', new Blob([new Uint8Array([0, 1, 2, 3])], { type: 'model/gltf-binary' }), 'model.glb');
    const createRes = await fetch(`${BRIDGE}/jobs`, { method: 'POST', body: form });
    const created = (await createRes.json()) as {
      job_id: string;
      approval_token: string;
      idle_window_only: boolean;
    };
    // Die Kette benennt Freigabe-Token + Idle-Fenster offen (HS1/HS2).
    expect(created.approval_token.startsWith('CONFIRMED_RENDER_')).toBe(true); // [Quelle: main.py create_job approval_token]
    expect(created.idle_window_only).toBe(true);

    await expect
      .poll(async () => {
        const job = (await (await fetch(`${BRIDGE}/jobs/${created.job_id}`)).json()) as { status: string };
        return job.status;
      }, { timeout: 15_000 })
      .toBe('done');

    // Nach done sagt die Kette selbst, WER gerendert hat (HS2 worker-Marker).
    const done = (await (await fetch(`${BRIDGE}/jobs/${created.job_id}`)).json()) as { worker: string };
    expect(done.worker).toBe('fake-worker'); // [Quelle: main.py _fake_worker_step record["worker"] = "fake-worker"]
  });

  test('HS6 (8) vis.skip: true → requested_engine "cycles", aber method bleibt "fake-worker" (Cycles nicht vorgetäuscht)', async () => {
    test.skip(!bridgeOk, BRIDGE_FEHLT_HINWEIS);

    const form = new FormData();
    // vis.skip: true = «nur Cycles» bestellt (HS5-Schalter schreibt genau das).
    form.set('scene', JSON.stringify({ schema: 'kosmovis.render-scene/v1', vis: { skip: true, backbone: 'qwen', upscale: false } }));
    form.set('model', new Blob([new Uint8Array([0, 1, 2, 3])], { type: 'model/gltf-binary' }), 'model.glb');
    const createRes = await fetch(`${BRIDGE}/jobs`, { method: 'POST', body: form });
    const created = (await createRes.json()) as { job_id: string; requested_engine: string };
    // BESTELLT: Cycles (HS2 leitet requested_engine aus vis.skip ab).
    expect(created.requested_engine).toBe('cycles'); // [Quelle: main.py create_job requested_engine]

    await expect
      .poll(async () => {
        const job = (await (await fetch(`${BRIDGE}/jobs/${created.job_id}`)).json()) as { status: string };
        return job.status;
      }, { timeout: 15_000 })
      .toBe('done');

    // GELIEFERT: der markierte Fake — Cycles wird NICHT vorgetäuscht. Das
    // Ergebnis trägt weiter method:"fake-worker" (die ehrliche Grenze im
    // Container; ein echter Cycles-Worker auf der HomeStation flippt das).
    const artifact = (await (
      await fetch(`${BRIDGE}/jobs/${created.job_id}/artifacts/render-result.json`)
    ).json()) as { qa: { geometry: { method: string } } };
    expect(artifact.qa.geometry.method).toBe('fake-worker');
  });

  test('HS6 (9) cancel: sofortiger Abbruch → cancelled, KEIN render-result.json (404 aufs Artefakt)', async () => {
    test.skip(!bridgeOk, BRIDGE_FEHLT_HINWEIS);

    const form = new FormData();
    form.set('scene', '{}');
    form.set('model', new Blob([new Uint8Array([0, 1, 2, 3])], { type: 'model/gltf-binary' }), 'model.glb');
    const createRes = await fetch(`${BRIDGE}/jobs`, { method: 'POST', body: form });
    const created = (await createRes.json()) as { job_id: string };

    // Sofort abbrechen (der Job ist noch queued — der Poll läuft im Sekundentakt).
    const cancelRes = await fetch(`${BRIDGE}/jobs/${created.job_id}/cancel`, { method: 'POST' }); // [Quelle: main.py '@app.post("/jobs/{job_id}/cancel")']
    expect(cancelRes.status).toBe(200);
    expect(((await cancelRes.json()) as { status: string }).status).toBe('cancelled');

    // Ein abgebrochener Job erzeugt kein Ergebnis — das Artefakt fehlt (404).
    // Kurz gegenprobieren, dass es auch nach einem Worker-Durchlauf 404 bleibt.
    await expect
      .poll(
        async () => (await fetch(`${BRIDGE}/jobs/${created.job_id}/artifacts/render-result.json`)).status,
        { timeout: 5_000, intervals: [500, 1000, 1500], message: 'render-result.json entstand trotz Abbruch' },
      )
      .toBe(404);
  });
});

test.describe('Abnahme H3a — jede H2-Journey trägt ihr renderUeberBridge-Segment', () => {
  test('efh/hochhaus/stadthaus/blockrand rufen alle Baustein 14 (renderUeberBridge) auf', async () => {
    // Reiner Datei-Grep (kein `page` nötig) — Belegt Abnahmekriterium H3a
    // ("jede H2-Journey trägt ihr Render-Segment", Buildplan Abschnitt 8).
    // Läuft aus `kosmo-orbit/` (Regel R6), darum relativer Pfad ab `e2e/`.
    const { readFileSync } = await import('node:fs');
    const journeys = ['sim-efh.spec.ts', 'sim-hochhaus.spec.ts', 'sim-stadthaus.spec.ts', 'sim-blockrand.spec.ts'];
    const fehlend: string[] = [];
    for (const journey of journeys) {
      const inhalt = readFileSync(`e2e/${journey}`, 'utf8');
      if (!inhalt.includes('renderUeberBridge')) fehlend.push(journey);
    }
    expect(fehlend, `Journeys ohne renderUeberBridge-Segment: ${fehlend.join(', ')}`).toEqual([]);
  });
});
