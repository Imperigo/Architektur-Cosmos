# Cloud-Login mit Abo — «Mit Claude anmelden» (OAuth)

Der Owner wollte den Cloud-Betrieb auch mit einem bestehenden Claude-Abo per
Browser-Popup-Login nutzen können — nicht nur mit einem eingetippten
API-Schlüssel. So ist es gebaut, und so ehrlich sind seine Grenzen.

## Der Mechanismus: OAuth, wie Claude Code

«Mit Claude anmelden» ist derselbe Weg, den Anthropics eigene Werkzeuge nutzen
(`ant`-CLI, Claude Code, das Agent-SDK):

1. Ein Browser-Popup öffnet sich, der Architekt meldet sich beim
   Anthropic-Konto an.
2. Ein kurzlebiges Access-Token landet lokal (über die Anthropic-CLI).
3. KosmoOrbit schickt Anfragen mit diesem Token statt einem Schlüssel:

   ```
   Authorization: Bearer <token>
   anthropic-beta: oauth-2025-04-20
   ```

   — anstelle von `x-api-key`. Die Anthropic-API akzeptiert nicht beide
   Header gleichzeitig; KosmoOrbit sendet also **entweder/oder**.

Der reine Header-Baustein ist `anthropicAuthHeader()` in
`packages/kosmo-ai/src/anthropic.ts` — unit-getestet
(`packages/kosmo-ai/test/anthropic-auth.test.ts`), unabhängig von Netzwerk/DOM.

## Desktop-only — ehrlich benannt

Der eigentliche Login-Schritt (Browser-Popup + lokales Token-Ablegen) braucht
einen lokalen Prozess, den nur die **Desktop-Edition** (Tauri) starten kann.
Die reine Web-/PWA-Version hat diesen Helfer nicht — sie bleibt beim
API-Schlüssel.

KosmoOrbit erkennt das zur Laufzeit über `istTauriDesktop()`
(`apps/kosmo-orbit/src/shell/cloud-login.ts`): geprüft wird
`'__TAURI_INTERNALS__' in window`, das offizielle Tauri-v2-Merkmal (der
IPC-Kanal, den `@tauri-apps/api` intern nutzt — anders als `window.__TAURI__`
ist er unabhängig von der `app.withGlobalTauri`-Einstellung immer vorhanden).

Im Kosmo-Panel (⚙ → Betriebsart **Cloud**):

- **Desktop**: Knopf «Mit Claude-Abo anmelden» (`data-testid="cloud-login-abo"`)
  ist aktiv, ruft den Tauri-Command `claude_login` auf und hinterlegt das
  zurückgegebene Token.
- **Web/PWA**: statt des Knopfs steht dort ehrlich
  (`data-testid="cloud-login-hinweis"`):

  > Mit-Claude-Anmeldung nur in der Desktop-App — im Browser bitte
  > API-Schlüssel.

  Nicht klickbar, nichts vorgetäuscht.

Ein Statuszeile (`data-testid="cloud-login-status"`) zeigt jederzeit, welcher
Weg aktiv ist: *angemeldet als Abo* / *API-Schlüssel hinterlegt* / *nicht
angemeldet*.

## Der Desktop-Anmelde-Helfer (Tauri-Command)

`apps/kosmo-orbit/src-tauri/src/lib.rs` definiert `#[tauri::command] fn
claude_login() -> Result<String, String>`:

1. Prüft, ob die Anthropic-CLI `ant` lokal installiert ist. Fehlt sie, kommt
   sofort ein klarer Fehlertext zurück: *«Anthropic-CLI (`ant`) nicht gefunden
   — installieren oder API-Schlüssel nutzen.»*
2. Ist `ant` da, versucht es zuerst, ein bereits aktives Login auszulesen
   (`ant auth print-credentials --access-token`).
3. Ohne aktives Login stösst es `ant auth login` an — das öffnet den
   Browser-Popup und wartet, bis der Architekt sich angemeldet hat — und
   liest danach erneut das Token.

Bewusst ohne zusätzliche Rust-Crates (nur `std::process::Command`), damit
dieser Code den Desktop-Build nicht gefährdet. Der Command ist im
`invoke_handler` registriert und **kompiliert sauber** — geprüft mit
`cargo check` gegen die vollen Tauri-v2-Systembibliotheken (GTK/WebKitGTK).

**Was hier ehrliches Gerüst bleibt:** dieser Pfad lässt sich in der
Container-Testumgebung nicht *ausführen* — es gibt hier weder `ant` noch eine
laufende Tauri-Laufzeit (kein Browser-Popup, kein echtes Konto-Login). Er wird
erst im echten Desktop-Build wirksam geprüft, wenn ein Architekt mit
installiertem `ant` und aktivem Anthropic-Konto den Knopf tatsächlich klickt.

## Entitlement — was das Token wirklich freischaltet

Ehrlicher Hinweis, kein Versprechen: das OAuth-Token authentifiziert das
**Anthropic-Konto**, nicht automatisch «beliebig viel API-Nutzung». Was damit
an API-Aufrufen möglich ist, hängt an der Freigabe, die dieses Konto hat:

- Läuft die lokale Anmeldung über denselben Weg wie Claude Code (Pro/Max-Abo
  mit Code-Nutzung freigeschaltet), deckt das die Kosmo-Cloud-Anfragen aus
  demselben Kontingent ab.
- Ist das Konto nicht für diesen Weg freigeschaltet, weist die API das mit
  einem Fehler zurück (401/403) — KosmoOrbit fällt dann ehrlich auf den
  Hinweis zurück, den API-Schlüssel einzutragen (derselbe Pfad wie beim
  bestehenden Cloud-Fallback, `docs/BETRIEBSARTEN.md`).

Es gibt keinen Kosmo-eigenen Mechanismus, der ein Konto ohne API-Freigabe
dazu befähigt — das wäre eine Täuschung, und die ist hier explizit nicht
gewollt.

## Geänderte/neue Dateien

| Datei | Rolle |
| --- | --- |
| `packages/kosmo-ai/src/anthropic.ts` | `AnthropicConfig.oauthToken`, `anthropicAuthHeader()` |
| `packages/kosmo-ai/test/anthropic-auth.test.ts` | Unit-Test für den Header-Baustein |
| `packages/kosmo-ai/src/betrieb.ts` | `CloudAuthArt` (additiv, Vokabular für die Anmeldeart) |
| `apps/kosmo-orbit/src/shell/cloud-login.ts` | `istTauriDesktop()`, `claudeAboAnmeldung()` |
| `apps/kosmo-orbit/src/shell/KosmoPanel.tsx` | Settings-Felder + UI (Abo-Knopf/Hinweis/Status) |
| `apps/kosmo-orbit/src-tauri/src/lib.rs` | Tauri-Command `claude_login` |
| `e2e/cloud-login.spec.ts` | Web-Preview: Hinweis sichtbar, Schlüssel-Weg funktioniert |
