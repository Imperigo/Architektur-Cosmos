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
- Kritik-Runde 1 folgt nach W1-B-Integration.

<!-- Weitere Einträge folgen je Welle -->
