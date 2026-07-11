# V0.7.2 «Visuelles Update» — Bauprotokoll (Opus-Leiter)

> Fortlaufendes Integrations- und Gate-Protokoll des Opus-Leiters. Gedächtnis-
> stütze für den Leiter, Lesegrundlage für Fable. Ehrlichkeit vor Politur:
> Grenzen werden benannt, nichts vorgetäuscht.
>
> Branch: `claude/kosmo-orbit-v1-build-pzxkbj` · Version bleibt 0.7.1 bis zum
> Finale (Bump 0.7.2 = Fable). Muster je Welle: cherry-pick + amend/reset-author,
> Gates (Kernel/App/UI-Units, typecheck, Vertragswächter-E2E 2×), Push je Batch,
> Worktree-Hygiene sofort.

## Vertragswächter (brechen NIE unbemerkt)
`e2e/oberflaeche-minimal.spec.ts` (Mehr-Menü 18, tool-*-Aria, tool-treppe/dach
TEXT) · `e2e/orbit-start.spec.ts` (4 orbit-haupt, Animationsnamen, Untertools
immer im DOM, reduced-motion→none) · `e2e/kosmo-symbol.spec.ts` (Symbol↔Panel-
DOM) · Kernel-Goldens byte-identisch.

## Umgebungs-Notizen
- Bridge :8600 (`--fake`) und Sync :8700 laufen als Dauerprozesse; bei Tod mit
  `setsid` neu starten (Container-Eigenheit).
- Haupt-Gate-Preview: :5183 (Bundle == dist prüfen; Preview separat killen —
  Exit 144 killt Ketten!). Agenten: 5174/5175.
- Vor Journeys `rm -rf /tmp/kosmo-jobs*`. `PLAYWRIGHT_CHROMIUM_PATH=/opt/pw-browsers/chromium`.

---

## Chronik

### §0 + W1-A (bereits auf origin, Stand Übernahme)
- `9ebcb76` §0: Bau-Spezifikation (`docs/V072-VISUELLES-UPDATE-SPEZ.md`) +
  Scan-Erstlauf.
- `0c54c1b` W1-A (Paket 01 + Token-Fundament): orbit-Theme, Logo 6a, Splash,
  self-hosted Fonts, App-Icons. Gates grün, Papier-Regression sauber (laut
  Übergabe).
- origin HEAD bei Übernahme = `0c54c1b`.

### Tag 1 — Fundament (Opus-Leiter übernimmt)
- **W1-B «Icon-Familie»** (Fable-Agent, Branch `worktree-agent-a032596d0324d06e6`):
  bei Übernahme noch nicht committet (Branch-HEAD = 9ebcb76). Integration =
  erste Handlung des Leiters, sobald Fable den Abschluss-Hash meldet.
- **W1-B «Icon-Familie» integriert** als `b721924` (cherry-pick `f42738b`
  vom Agent-Branch, konfliktfrei — Dateien disjunkt zu W1-A). Inhalt: NEU
  `shell/werkzeug-glyphen.tsx` (14 Glyphen, STATION_GLYPHE, GLYPHEN_PUNKT),
  orbit-icons.tsx, design/werkzeug-icons.tsx (sw 1.17 im 16er-Raster),
  EntwurfsDock (7 Icons + Rollen-Punkt; Kontrast-Eigenfix: aktiver
  Accent-Knopf setzt --k-ink lokal auf --k-accent-ink), Unit-Test, 4 Shots.
- **Gates nach Integration:** Kernel 728 · App 749 (739+10 neue) · kosmo-ui
  25 · typecheck sauber · Wächter oberflaeche-minimal/orbit-start/
  kosmo-symbol **2× grün** (14 passed je Lauf) · faehigkeiten-phasen +
  module.spec 75 grün. Der module.spec-Einzelfail des Agenten (Vis→Blatt)
  war Umgebung: die alte Bridge-Instanz :8600 kannte CORS nur für 5183;
  Bridge neu gestartet (aktueller Code, Ports 5174–5177), Fail weg.
- Umgebung: Preview :5183 neu aufgesetzt (Bundle == dist, index-DXZKTcHe);
  Worktrees agent-a032596d0324d06e6 + agent-a57fd714bc53e576a entfernt
  (Disk 54 % → 44 %).
- **Offene Befunde für Kritik-Runde 1:** (a) Rollen-Punkte hängen an
  --k-rolle-*/--k-signal aus W1-A — real in orbit UND paper prüfen;
  (b) `packages/kosmo-ui/src/icons.tsx` (KIcon-Registry, ~30 Zeichen)
  bleibt im alten 16/1.5-Stil — Frage an Fable: app-weite Icon-Norm in
  W4-H nachziehen oder ehrlich 0.7.3? (c) evtl. tote Dock-Icon-Exporte in
  werkzeug-icons.tsx (DesignWorkspace war nicht W1-B-Besitz) — prüfen,
  ggf. W4-H-Restfix.
- Kritik-Runde 1 folgt (Shots paper+orbit auf :5183).

<!-- Weitere Einträge folgen je Welle -->
