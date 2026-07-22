use std::process::Command;

use tauri::{
    menu::MenuBuilder,
    tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent},
    Manager,
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
