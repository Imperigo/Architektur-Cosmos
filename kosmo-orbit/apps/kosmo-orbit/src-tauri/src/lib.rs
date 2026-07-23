use std::io::{BufRead, BufReader, Read};
use std::process::{Command, Stdio};

use tauri::{
    menu::MenuBuilder,
    tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent},
    Emitter, Manager,
};

/// Cloud-Login mit Abo («Mit Claude anmelden», Owner-Auftrag T-Cloud-Login) —
/// der Desktop-Weg zum echten OAuth-Token.
///
/// v0.9.1 Owner-Punkt 22.07.2026 («mit claude-abo anmelden geht immernoch
/// nicht»): die lokale Anthropic-CLI heisst REAL `claude` (Paket
/// `@anthropic-ai/claude-code`) — der bisher geprobte Binärname `ant`
/// existiert dort nicht, darum lief jeder Klick seit v0.8.4 in «nicht
/// gefunden», egal was installiert war. Verifizierte echte Befehle (CLI
/// 2.1.x): `claude auth login --claudeai` öffnet den Browser-Login fürs
/// Abo und blockiert bis zum Abschluss; `claude auth status --json`
/// antwortet `{"loggedIn":…,"authMethod":…}`; `claude auth logout` meldet
/// ab. Einen `print-credentials`-Befehl gibt es NICHT — das Access-Token
/// liegt nach dem Login in `~/.claude/.credentials.json`
/// (`claudeAiOauth.accessToken`; unter Windows `%USERPROFILE%`, auf macOS
/// stattdessen im Schlüsselbund — dort bleibt der Weg ehrlich verschlossen
/// und der Fehlertext sagt das).
///
/// Windows-Detail: npm installiert `claude` als `.cmd`-Shim, den
/// `CreateProcess` (also `Command::new`) nicht direkt starten kann — alle
/// CLI-Aufrufe laufen dort über `cmd /C`, mit `CREATE_NO_WINDOW`, damit
/// kein Konsolenfenster aufblitzt. `ant` bleibt als historischer Zweitname
/// in der Probe (kostet einen Fehlversuch, bricht niemandem etwas).
///
/// **Ehrliches Gerüst (Owner-Mandat):** dieser Pfad kompiliert und ist im
/// echten Desktop-Build wirksam; in der Container-CI fehlt die
/// Tauri-Laufzeit. Keine neuen Crates (serde_json ist bereits Dependency).
const CLI_NAMEN: [&str; 2] = ["claude", "ant"];

#[cfg(windows)]
fn cli_befehl(name: &str) -> Command {
    use std::os::windows::process::CommandExt;
    const CREATE_NO_WINDOW: u32 = 0x0800_0000;
    let mut c = Command::new("cmd");
    c.arg("/C").arg(name);
    c.creation_flags(CREATE_NO_WINDOW);
    c
}

#[cfg(not(windows))]
fn cli_befehl(name: &str) -> Command {
    Command::new(name)
}

/// Erster CLI-Name, der auf `--version` mit Exit 0 antwortet — `claude`
/// zuerst (der echte Name), `ant` als historischer Zweitversuch.
fn cli_name() -> Option<&'static str> {
    CLI_NAMEN.iter().copied().find(|name| {
        cli_befehl(name)
            .arg("--version")
            .output()
            .map(|o| o.status.success())
            .unwrap_or(false)
    })
}

/// Offizielle Statusauskunft der CLI: `Some(true)` = eingeloggt,
/// `Some(false)` = nicht eingeloggt, `None` = Auskunft nicht verfügbar
/// (ältere CLI ohne `auth status` — dann entscheidet `lese_token`).
fn cli_eingeloggt(name: &str) -> Option<bool> {
    let out = cli_befehl(name).args(["auth", "status", "--json"]).output().ok()?;
    if !out.status.success() {
        return None;
    }
    let text = String::from_utf8_lossy(&out.stdout);
    let wert: serde_json::Value = serde_json::from_str(text.trim()).ok()?;
    wert.get("loggedIn").and_then(|v| v.as_bool())
}

/// Access-Token aus der CLI-Credentials-Datei (`~/.claude/.credentials.json`,
/// Feld `claudeAiOauth.accessToken`). `None`, wenn die Datei fehlt (macOS:
/// Schlüsselbund), nicht lesbar ist oder das Feld leer bleibt.
fn lese_token() -> Option<String> {
    let home = std::env::var_os(if cfg!(windows) { "USERPROFILE" } else { "HOME" })?;
    let pfad = std::path::PathBuf::from(home).join(".claude").join(".credentials.json");
    let text = std::fs::read_to_string(pfad).ok()?;
    let wert: serde_json::Value = serde_json::from_str(&text).ok()?;
    let token = wert.get("claudeAiOauth")?.get("accessToken")?.as_str()?.trim().to_string();
    if token.is_empty() {
        None
    } else {
        Some(token)
    }
}

#[tauri::command]
fn claude_login() -> Result<String, String> {
    let Some(name) = cli_name() else {
        return Err(
            "Anthropic-CLI (`claude`) nicht gefunden — installieren oder API-Schlüssel nutzen.".to_string(),
        );
    };

    if cli_eingeloggt(name) != Some(true) {
        // Kein aktives Login: `auth login --claudeai` öffnet das
        // Anmelde-Fenster im Browser und wartet, bis sich der Architekt beim
        // Anthropic-Konto angemeldet hat (oder abbricht).
        match cli_befehl(name).args(["auth", "login", "--claudeai"]).status() {
            Ok(status) if status.success() => {}
            Ok(_) => return Err("Claude-Anmeldung abgebrochen oder fehlgeschlagen.".to_string()),
            Err(e) => return Err(format!("`{name} auth login` liess sich nicht starten: {e}")),
        }
    }

    lese_token().ok_or_else(|| {
        "Anmeldung ist aktiv, aber das Token ist nicht lesbar (auf macOS liegt es im Schlüsselbund) — bitte den API-Schlüssel-Weg unten nutzen.".to_string()
    })
}

/// v0.8.4 PA5 (E10 §3.1, `docs/V084-SPEZ.md`, C-5 «Status-Erkennung
/// dreiwertig»): reine Beobachtung, OHNE je einen Browser-Popup auszulösen —
/// `claude_login` (oben) darf das (der Architekt hat aktiv «Mit Claude-Abo
/// anmelden» geklickt), ein Status-Check beim Öffnen der Einstellungen oder
/// hinter «Erneut prüfen» darf es NICHT. Drei Zustände statt nur eines
/// Fehlertexts (seit v0.9.1 über den echten CLI-Namen `claude`, s. oben):
///  - `"fehlt"`: keine Anthropic-CLI lokal installiert.
///  - `"nicht-eingeloggt"`: CLI da, `auth status` meldet kein aktives Login
///    — ein Klick auf «Mit Claude-Abo anmelden» öffnet jetzt das
///    Anmelde-Fenster im Browser.
///  - `"eingeloggt"`: CLI da UND angemeldet (Abo aktiv) — ein Klick holt das
///    Token nur noch in Kosmo, ohne neuen Login-Dialog.
/// Liefert IMMER einen der drei String-Werte (kein `Result`) — die Prüfung
/// selbst kann nicht scheitern, sie beobachtet nur.
#[tauri::command]
fn claude_login_status() -> String {
    let Some(name) = cli_name() else {
        return "fehlt".to_string();
    };
    match cli_eingeloggt(name) {
        Some(true) => "eingeloggt".to_string(),
        Some(false) => "nicht-eingeloggt".to_string(),
        // Keine Statusauskunft (ältere CLI) — lesbares Token entscheidet.
        None => {
            if lese_token().is_some() {
                "eingeloggt".to_string()
            } else {
                "nicht-eingeloggt".to_string()
            }
        }
    }
}

/// v0.9.2 P-F3 (Owner-Punkt 23.07.2026 «claude-abo 401», ROADMAP-Nachtrag):
/// Delta-Event an den WebView — `anfrageId` grenzt mehrere gleichzeitige
/// Claude-Abo-Gespräche (Hauptpanel UND die schlanke Blasen-Antwort aus
/// `KosmoSymbol.tsx`, s. `baueChatProvider`-Kopfkommentar) sauber gegeneinander
/// ab, da `app.emit` ohne Ziel-Fenster GLOBAL an jeden Listener geht.
#[derive(Clone, serde::Serialize)]
struct ClaudeCliDelta {
    #[serde(rename = "anfrageId")]
    anfrage_id: String,
    text: String,
}

/// Abschluss-Event (zusätzlich zum Promise-Ergebnis von `claude_cli_chat`
/// selbst) — Owner-Auftrag verlangt explizit ein Abschluss-Event neben den
/// Delta-Events; das Tauri-`invoke()`-Promise bleibt trotzdem die
/// AUTORITATIVE Fehlerquelle für den JS-Provider (kein Race mit `listen()`).
#[derive(Clone, serde::Serialize)]
struct ClaudeCliDone {
    #[serde(rename = "anfrageId")]
    anfrage_id: String,
    ok: bool,
    error: Option<String>,
}

/// WURZEL des behobenen 401-Fehlers (Owner-Punkt 23.07.2026): Im Abo-Modus
/// sprach `AnthropicProvider` bislang SELBST per `fetch` gegen
/// `api.anthropic.com` — mit dem OAuth-Abo-Token aus
/// `~/.claude/.credentials.json` als `Authorization: Bearer`-Header
/// (`packages/kosmo-ai/src/anthropic.ts`). Das Token ist aber KEIN API-Key —
/// Anthropic weist direkte Cloud-Aufrufe mit einem Abo-Token korrekt mit 401
/// zurück, unabhängig vom gesendeten Beta-Header. Dieser Command macht die
/// App im Abo-Modus zum Nicht-mehr-HTTP-Client: statt selbst zu sprechen,
/// startet er die BEREITS eingeloggte lokale `claude`-CLI (`cli_name()`/
/// `cli_befehl()` oben, s. deren Kopfkommentar für die verifizierten
/// Binär-/Windows-Details) als Subprozess und streamt ihre Text-Antwort.
///
/// **Verifizierte CLI-Flags (live im Container geprüft, `claude --help` /
/// `claude -p --help`, s. Bauagenten-Bericht für die vollen Ausschnitte):**
///  - `-p <prompt> --output-format stream-json --verbose
///    --include-partial-messages`: JSONL auf stdout, EINE Zeile je Ereignis.
///    Mit `--include-partial-messages` erscheinen rohe Anthropic-Stream-
///    Events unter `{"type":"stream_event","event":{...}}` — ein Text-Delta
///    ist `event.type == "content_block_delta"` mit
///    `event.delta.type == "text_delta"` (live geprüft: `thinking_delta`/
///    `signature_delta`/`input_json_delta` kommen ebenso vor und werden HIER
///    bewusst NICHT als Text weitergereicht — exakt dieselbe Entscheidung wie
///    `AnthropicProvider` in `anthropic.ts` für Denk-Blöcke). Das letzte
///    JSONL-Objekt ist immer `{"type":"result","is_error":bool,"result":
///    "<Volltext>",...}` — der ehrliche Abschluss-/Fehlerbeleg.
///  - `--tools ""`: schaltet ALLE eingebauten Werkzeuge ab (live geprüft:
///    das `system`/`init`-Ereignis meldet danach `"tools":[]`) — Sicherheits-
///    entscheidung fürs v1-Gerüst (s. `claude-cli.ts`-Kopfkommentar): der
///    Subprozess darf auf dem Architekten-Gerät NIE selbständig Bash/Edit/
///    Read etc. ausführen, nur reden.
///  - `--disable-slash-commands`/`--strict-mcp-config` (ohne `--mcp-config`):
///    verhindert, dass irgendwelche lokal konfigurierten Skills/MCP-Server
///    des Architekten-Kontos unbemerkt in ein Kosmo-Chat-Gespräch hineinwirken.
///  - `--system-prompt <text>` (volles Ersetzen, NICHT `--append-system-
///    prompt`): Kosmo baut seinen kompletten Systemprompt selbst
///    (`baueSystemprompt()`, `@kosmo/ai`) — ein zusätzliches Anhängen an
///    Claude Codes eigenen (agentischen, umgebungsbezogenen) Standard-System-
///    prompt wäre hier unpassend und würde Kosmos Stimme verwässern.
///  - `--model <id>`: Modellwahl (Owner-Auswahl aus `ANTHROPIC_MODELLE`).
///
/// **cwd-Isolation:** läuft bewusst in `std::env::temp_dir()`, NICHT im
/// Arbeitsverzeichnis der App — verhindert, dass ein zufällig dort liegendes
/// `CLAUDE.md`/eine `.claude/`-Projektkonfiguration unbemerkt in ein
/// Kosmo-Architektur-Gespräch einsickert (die CLI liest Projekt-Dateien nur
/// relativ zu ihrem cwd, s. `--bare`-Beschreibung in `claude --help`).
///
/// **Ehrlicher Fehlerpfad:** CLI fehlt → derselbe Text wie `claude_login`
/// oben; Exit≠0 → deutscher Fehlertext MIT stderr-Auszug (max. 400 Zeichen,
/// UTF-8-sicher abgeschnitten); ein `result`-Ereignis mit `is_error:true`
/// liefert Anthropics eigenen Fehlertext zusätzlich.
#[tauri::command]
async fn claude_cli_chat(
    anfrage_id: String,
    prompt: String,
    system_prompt: Option<String>,
    model: Option<String>,
    app: tauri::AppHandle<tauri::Wry>,
) -> Result<(), String> {
    let Some(name) = cli_name() else {
        let fehler = "Anthropic-CLI (`claude`) nicht gefunden — installieren oder API-Schlüssel nutzen.".to_string();
        let _ = app.emit(
            "claude-cli-done",
            ClaudeCliDone { anfrage_id, ok: false, error: Some(fehler.clone()) },
        );
        return Err(fehler);
    };
    let name = name.to_string();

    let lauf_ergebnis = tauri::async_runtime::spawn_blocking({
        let app = app.clone();
        let anfrage_id = anfrage_id.clone();
        move || -> Result<(), String> {
            let mut befehl = cli_befehl(&name);
            befehl
                .current_dir(std::env::temp_dir())
                .arg("-p")
                .arg(&prompt)
                .args(["--output-format", "stream-json"])
                .arg("--verbose")
                .arg("--include-partial-messages")
                .args(["--tools", ""])
                .arg("--disable-slash-commands")
                .arg("--strict-mcp-config")
                .stdin(Stdio::null())
                .stdout(Stdio::piped())
                .stderr(Stdio::piped());
            if let Some(sp) = &system_prompt {
                befehl.args(["--system-prompt", sp]);
            }
            if let Some(m) = &model {
                befehl.args(["--model", m]);
            }

            let mut kind = befehl
                .spawn()
                .map_err(|e| format!("Claude-CLI liess sich nicht starten: {e}"))?;
            let stdout = kind.stdout.take().expect("stdout wurde als piped angefordert");
            let stderr = kind.stderr.take().expect("stderr wurde als piped angefordert");

            // stderr in einem eigenen Thread mitschneiden — sonst blockiert ein
            // volles Pipe-Polster den stdout-Read (Deadlock-Risiko bei zwei
            // parallelen, unabhängig gefüllten Pipes).
            let stderr_thread = std::thread::spawn(move || {
                let mut puffer = String::new();
                let _ = BufReader::new(stderr).read_to_string(&mut puffer);
                puffer
            });

            let mut anthropic_fehlertext: Option<String> = None;
            let mut war_fehler = false;
            for zeile in BufReader::new(stdout).lines() {
                let Ok(zeile) = zeile else { break };
                let zeile = zeile.trim();
                if zeile.is_empty() {
                    continue;
                }
                let Ok(wert) = serde_json::from_str::<serde_json::Value>(zeile) else { continue };
                match wert.get("type").and_then(|v| v.as_str()) {
                    Some("stream_event") => {
                        let text = wert
                            .get("event")
                            .filter(|e| e.get("type").and_then(|t| t.as_str()) == Some("content_block_delta"))
                            .and_then(|e| e.get("delta"))
                            .filter(|d| d.get("type").and_then(|t| t.as_str()) == Some("text_delta"))
                            .and_then(|d| d.get("text"))
                            .and_then(|t| t.as_str());
                        if let Some(text) = text {
                            if !text.is_empty() {
                                let _ = app.emit(
                                    "claude-cli-delta",
                                    ClaudeCliDelta { anfrage_id: anfrage_id.clone(), text: text.to_string() },
                                );
                            }
                        }
                    }
                    Some("result") => {
                        war_fehler = wert.get("is_error").and_then(|v| v.as_bool()).unwrap_or(false);
                        if war_fehler {
                            anthropic_fehlertext = wert.get("result").and_then(|v| v.as_str()).map(str::to_string);
                        }
                    }
                    _ => {}
                }
            }

            let status = kind
                .wait()
                .map_err(|e| format!("Claude-CLI-Prozess nicht abwartbar: {e}"))?;
            let stderr_text = stderr_thread.join().unwrap_or_default();

            if !status.success() || war_fehler {
                let stderr_auszug: String = stderr_text.trim().chars().take(400).collect();
                let mut teile: Vec<String> = Vec::new();
                if let Some(t) = anthropic_fehlertext {
                    teile.push(t);
                }
                if !stderr_auszug.is_empty() {
                    teile.push(format!("stderr: {stderr_auszug}"));
                }
                if teile.is_empty() {
                    teile.push(format!("Exit-Code {}", status.code().unwrap_or(-1)));
                }
                return Err(format!("Claude-CLI antwortet mit einem Fehler — {}", teile.join(" · ")));
            }
            Ok(())
        }
    })
    .await
    .map_err(|e| format!("Claude-CLI-Aufgabe abgebrochen: {e}"))?;

    let _ = app.emit(
        "claude-cli-done",
        ClaudeCliDone {
            anfrage_id,
            ok: lauf_ergebnis.is_ok(),
            error: lauf_ergebnis.as_ref().err().cloned(),
        },
    );
    lauf_ergebnis
}

/// Auto-Setup: einen geprüften Installations-Befehl je Werkzeug ausführen
/// (V1.6 Block A / A2–A3, Owner-Frage P1 «Ein-Klick-Installieren»).
///
/// Jeder Befehl kommt als bereits getrennte Programm+Argument-Liste aus dem
/// Client-Manifest (`state/werkzeuge.ts`), das dort schon gegen die Allowlist
/// geprüft ist. **Defense in depth (Serie-I-Grundsatz «dem Client nie
/// vertrauen»):** die Rust-Seite prüft NOCH EINMAL — das erste Wort MUSS in
/// der hier fest verdrahteten Allowlist stehen, und kein Argument darf ein
/// Shell-Metazeichen enthalten. Ausgeführt wird über `Command::new(programm)
/// .args(rest)` OHNE Shell (keine Interpolation), die Prüfung hält zusätzlich
/// versehentlich/böswillig eingeschleuste Ketten ab.
///
/// Gibt bei Erfolg ein knappes Protokoll zurück; beim ersten Fehlschlag bricht
/// die Kette ehrlich ab und meldet, welcher Befehl warum scheiterte. Grosse
/// Downloads (LLM-Gewichte) laufen NUR, weil der Nutzer im UI vorher die
/// Grösse gesehen und «Holen» gedrückt hat — dieser Command lädt nie von
/// selbst.
#[tauri::command]
fn werkzeug_holen(befehle: Vec<Vec<String>>) -> Result<String, String> {
    // Fest verdrahtet — muss ERLAUBTE_INSTALLER in state/werkzeuge.ts spiegeln.
    const ERLAUBTE_INSTALLER: [&str; 9] = [
        "winget", "brew", "curl", "ollama", "pip", "pip3", "python", "python3", "node",
    ];
    fn ist_metazeichen(s: &str) -> bool {
        s.chars()
            .any(|c| matches!(c, ';' | '&' | '|' | '`' | '$' | '(' | ')' | '{' | '}' | '<' | '>' | '\n'))
    }
    fn ist_erlaubt(befehl: &[String]) -> bool {
        match befehl.first() {
            None => false,
            Some(erstes) if !ERLAUBTE_INSTALLER.contains(&erstes.as_str()) => false,
            _ => befehl.iter().all(|t| !t.is_empty() && !ist_metazeichen(t)),
        }
    }

    if befehle.is_empty() {
        return Err("Keine Befehle übergeben.".to_string());
    }

    let mut protokoll = String::new();
    for befehl in &befehle {
        if !ist_erlaubt(befehl) {
            return Err(format!(
                "Befehl abgewiesen (nicht in der Allowlist oder Shell-Metazeichen): {}",
                befehl.join(" ")
            ));
        }
        let (programm, args) = befehl.split_first().expect("nicht leer, siehe ist_erlaubt");
        match Command::new(programm).args(args).status() {
            Ok(status) if status.success() => {
                protokoll.push_str(&format!("✓ {}\n", befehl.join(" ")));
            }
            Ok(status) => {
                return Err(format!(
                    "«{}» endete mit Code {}. Bisher:\n{protokoll}",
                    befehl.join(" "),
                    status.code().unwrap_or(-1)
                ));
            }
            Err(e) => {
                return Err(format!(
                    "«{}» liess sich nicht starten: {e}. Bisher:\n{protokoll}",
                    befehl.join(" ")
                ));
            }
        }
    }
    Ok(protokoll)
}

/// v0.7.2 §9 (Paket 07, Stream W3-F): das Charakter-Zweitfenster
/// (`tauri.conf.json`: label `kosmo-charakter`, `visible:false`) an die
/// Bildschirm-Ecke unten rechts rücken — "Monitor − Fenster − 24px Rand"
/// (Spec-Wortlaut). Läuft "zur Laufzeit" im `setup`-Hook, weil die feste
/// Fenstergrösse aus der Config (200×220) zwar bekannt ist, der tatsächlich
/// verfügbare Monitor (Grösse/Position, Multi-Monitor-Setups) das aber
/// nicht ist. Fehlt das Fenster (z.B. Mobile-Build ohne Desktop-Fenster)
/// oder lässt sich kein Monitor ermitteln, passiert nichts — kein Absturz
/// für ein rein kosmetisches Detail.
fn positioniere_charakter_fenster_unten_rechts(app: &tauri::App<tauri::Wry>) {
    const RAND_PX: i32 = 24;
    const BREITE_PX: i32 = 200;
    const HOEHE_PX: i32 = 220;

    let Some(fenster) = app.get_webview_window("kosmo-charakter") else {
        return;
    };
    let Ok(Some(monitor)) = fenster.current_monitor() else {
        return;
    };
    let monitor_pos = *monitor.position();
    let monitor_groesse = *monitor.size();
    let x = monitor_pos.x + monitor_groesse.width as i32 - BREITE_PX - RAND_PX;
    let y = monitor_pos.y + monitor_groesse.height as i32 - HOEHE_PX - RAND_PX;
    let _ = fenster.set_position(tauri::PhysicalPosition::new(x, y));
}

/// v0.8.4 PA5 (E9, `docs/V084-SPEZ.md` §3): Name der winzigen Klartext-Datei
/// im App-Datenverzeichnis, die die Einstellung «Beim Start maximieren»
/// über einen Neustart hinweg trägt. `tauri.conf.json`s statisches
/// `"maximized": true` deckt den Standardfall (Default AN) OHNE jeden
/// Rust-Code ab; diese Datei trägt NUR den Ausnahmefall (Schalter AUS) —
/// aus dem `setup()`-Hook heraus ist `localStorage` (Webview) nicht lesbar,
/// bevor die Seite überhaupt geladen hat, darum eine Datei statt dessen.
/// Bewusst ohne neue Crate: nur `std::fs` + das ohnehin vorhandene
/// `tauri::Manager::path()`.
const STARTMAX_DATEI: &str = "startmaximierung.txt";

fn startmax_pfad(app: &tauri::AppHandle<tauri::Wry>) -> Option<std::path::PathBuf> {
    app.path().app_data_dir().ok().map(|d| d.join(STARTMAX_DATEI))
}

/// Trägt den Einstellungen-Schalter «Beim Start maximieren»
/// (`einstellung-start-maximiert` in `Einstellungen.tsx`, Default AN):
/// wirkt SOFORT auf das aktuell offene Hauptfenster (Live-Effekt, spürbar
/// ohne Neustart) UND schreibt die Präferenz für den NÄCHSTEN Start weg.
/// Schreibfehler (z. B. kein beschreibbares App-Datenverzeichnis) brechen
/// den Live-Effekt nicht ab — sie kommen als `Err` zurück, die Einstellungen
/// zeigen sie als ehrlichen Hinweistext statt eines stillen Fehlschlags.
#[tauri::command]
fn fenster_startmaximierung_setzen(an: bool, app: tauri::AppHandle<tauri::Wry>) -> Result<(), String> {
    if let Some(fenster) = app.get_webview_window("main") {
        if an {
            let _ = fenster.maximize();
        } else {
            let _ = fenster.unmaximize();
        }
    }
    let pfad = startmax_pfad(&app).ok_or_else(|| "App-Datenverzeichnis nicht auflösbar.".to_string())?;
    if let Some(ordner) = pfad.parent() {
        std::fs::create_dir_all(ordner).map_err(|e| e.to_string())?;
    }
    std::fs::write(&pfad, if an { "1" } else { "0" }).map_err(|e| e.to_string())
}

/// Läuft im `setup()`-Hook (JEDER Start): `tauri.conf.json` maximiert das
/// Hauptfenster bereits standardmässig — hier wird NUR der Ausnahmefall
/// nachgezogen, wenn der Architekt den Schalter zuvor ausgeschaltet hat
/// (Präferenz-Datei enthält `"0"`). Fehlt die Datei (nie gesetzt) oder lässt
/// sie sich nicht lesen, bleibt es beim maximierten Default — kein Absturz
/// für eine kosmetische Präferenz.
fn wende_startmaximierung_an(app: &tauri::App<tauri::Wry>) {
    let Some(pfad) = startmax_pfad(&app.handle()) else { return };
    let Ok(inhalt) = std::fs::read_to_string(&pfad) else { return };
    if inhalt.trim() == "0" {
        if let Some(fenster) = app.get_webview_window("main") {
            let _ = fenster.unmaximize();
        }
    }
}

/// Zeigt/fokussiert das Hauptfenster — gemeinsamer Weg für Tray-Klick UND
/// Menüpunkt «Öffnen» (Spec §9: "Klick zeigt Hauptfenster").
fn zeige_hauptfenster(app: &tauri::AppHandle<tauri::Wry>) {
    if let Some(fenster) = app.get_webview_window("main") {
        let _ = fenster.show();
        let _ = fenster.set_focus();
    }
}

/// v0.7.2 §9/W4-H (Einstellungs-Verdrahtung, Schalter `einstellung-charakter`
/// in `Einstellungen.tsx`): schaltet das Charakter-Zweitfenster sichtbar/
/// unsichtbar — das Fenster startet `visible:false` (`tauri.conf.json`) und
/// wurde bislang von NICHTS im Produkt je gezeigt (ehrlicher Befund, s.
/// Abschlussbericht). Bewusst KEIN `set_focus()`: das Fenster bleibt
/// `alwaysOnTop`/`skipTaskbar` — ein unaufdringlicher Begleiter, kein
/// Fokus-Dieb. Liefert den NEUEN Sichtbarkeitsstand zurück, damit die
/// Einstellungen den Schalter korrekt spiegeln, auch wenn mehrere Quellen
/// (Tray/Einstellungen) gleichzeitig schalten könnten.
#[tauri::command]
fn charakter_fenster_umschalten(app: tauri::AppHandle<tauri::Wry>) -> Result<bool, String> {
    let fenster = app
        .get_webview_window("kosmo-charakter")
        .ok_or_else(|| "Charakter-Fenster nicht gefunden.".to_string())?;
    let sichtbar = fenster.is_visible().map_err(|e| e.to_string())?;
    if sichtbar {
        fenster.hide().map_err(|e| e.to_string())?;
    } else {
        fenster.show().map_err(|e| e.to_string())?;
    }
    Ok(!sichtbar)
}

/// Baut den System-Tray (Spec §9: TrayIconBuilder, Menü Öffnen/Beenden,
/// Klick zeigt Hauptfenster). Nutzt bewusst dasselbe Icon wie die Fenster
/// (`app.default_window_icon()`, aus `tauri.conf.json`s `bundle.icon`
/// gebaut) statt eines eigenen Assets — kein zusätzlicher Icon-Satz zu
/// pflegen.
fn baue_tray(app: &tauri::App<tauri::Wry>) -> tauri::Result<()> {
    let menu = MenuBuilder::new(app)
        .text("oeffnen", "Öffnen")
        .separator()
        .text("beenden", "Beenden")
        .build()?;

    let mut tray = TrayIconBuilder::new()
        .tooltip("KosmoOrbit")
        .menu(&menu)
        .show_menu_on_left_click(false)
        .on_menu_event(|app, event| match event.id().as_ref() {
            "oeffnen" => zeige_hauptfenster(app),
            "beenden" => app.exit(0),
            _ => {}
        })
        .on_tray_icon_event(|tray, event| {
            if let TrayIconEvent::Click {
                button: MouseButton::Left,
                button_state: MouseButtonState::Up,
                ..
            } = event
            {
                zeige_hauptfenster(tray.app_handle());
            }
        });
    if let Some(icon) = app.default_window_icon() {
        tray = tray.icon(icon.clone());
    }
    tray.build(app)?;
    Ok(())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .invoke_handler(tauri::generate_handler![
            claude_login,
            claude_login_status,
            claude_cli_chat,
            werkzeug_holen,
            charakter_fenster_umschalten,
            fenster_startmaximierung_setzen
        ])
        .setup(|app| {
            positioniere_charakter_fenster_unten_rechts(app);
            wende_startmaximierung_an(app);
            baue_tray(app)?;
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("Fehler beim Starten von KosmoOrbit");
}
