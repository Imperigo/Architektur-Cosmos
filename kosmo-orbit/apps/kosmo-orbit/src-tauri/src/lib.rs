use std::process::Command;

use tauri::{
    menu::MenuBuilder,
    tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent},
    Manager,
};

/// Cloud-Login mit Abo («Mit Claude anmelden», Owner-Auftrag T-Cloud-Login) —
/// der Desktop-Weg zum echten OAuth-Token.
///
/// KosmoOrbit nutzt dafür denselben Mechanismus wie Anthropics eigene
/// Werkzeuge (Claude Code, das Agent-SDK, die `ant`-CLI): ein
/// Browser-Popup-Login beim Anthropic-Konto, danach ein kurzlebiges
/// Access-Token lokal. Dieser Command liest das Token über die lokale
/// Anthropic-CLI `ant`:
///
/// 1. Ist bereits ein Login aktiv, liefert `ant auth print-credentials
///    --access-token` das Token direkt.
/// 2. Sonst stösst `ant auth login` den Browser-Popup an (blockiert, bis der
///    Nutzer sich angemeldet hat) und `print-credentials` wird erneut
///    versucht.
/// 3. Fehlt `ant` ganz, kommt ein klarer, ehrlicher Fehlertext zurück statt
///    eines Absturzes — der Architekt weicht dann auf den API-Schlüssel aus.
///
/// **Ehrliches Gerüst (Owner-Mandat):** dieser Pfad kompiliert und ist im
/// echten Desktop-Build wirksam, lässt sich aber in der Container-CI/-Testumgebung
/// nicht ausführen — hier fehlen `ant` und die Tauri-Laufzeit. Bewusst ohne
/// zusätzliche Crates (nur `std::process::Command`), damit der Desktop-Build
/// dadurch nicht gefährdet wird.
///
/// v0.8.4 PA5 (E10 §3.1, `docs/V084-SPEZ.md`): `ant_installiert`/`lese_token`
/// wanderten aus dem Körper von `claude_login` auf Modulebene, damit
/// `claude_login_status` (unten) denselben Probe-Code nutzt, OHNE je
/// `ant auth login` (den Browser-Popup) auszulösen — reine Status-Erkennung.
fn ant_installiert() -> bool {
    Command::new("ant").arg("--version").output().is_ok()
}

fn lese_token() -> Option<String> {
    let out = Command::new("ant")
        .args(["auth", "print-credentials", "--access-token"])
        .output()
        .ok()?;
    if !out.status.success() {
        return None;
    }
    let token = String::from_utf8_lossy(&out.stdout).trim().to_string();
    if token.is_empty() {
        None
    } else {
        Some(token)
    }
}

#[tauri::command]
fn claude_login() -> Result<String, String> {
    if !ant_installiert() {
        return Err(
            "Anthropic-CLI (`ant`) nicht gefunden — installieren oder API-Schlüssel nutzen.".to_string(),
        );
    }

    if let Some(token) = lese_token() {
        return Ok(token);
    }

    // Kein aktives Login: `ant auth login` öffnet den Browser-Popup und
    // wartet, bis sich der Architekt beim Anthropic-Konto angemeldet hat.
    match Command::new("ant").args(["auth", "login"]).status() {
        Ok(status) if status.success() => {}
        Ok(_) => return Err("Claude-Anmeldung abgebrochen oder fehlgeschlagen.".to_string()),
        Err(e) => return Err(format!("`ant auth login` liess sich nicht starten: {e}")),
    }

    lese_token().ok_or_else(|| "Anmeldung abgeschlossen, aber kein Token lesbar.".to_string())
}

/// v0.8.4 PA5 (E10 §3.1, `docs/V084-SPEZ.md`, C-5 «Status-Erkennung
/// dreiwertig»): reine Beobachtung, OHNE je einen Browser-Popup auszulösen —
/// `claude_login` (oben) darf das (der Architekt hat aktiv «Mit Claude-Abo
/// anmelden» geklickt), ein Status-Check beim Öffnen der Einstellungen oder
/// hinter «Erneut prüfen» darf es NICHT. Drei Zustände statt nur eines
/// Fehlertexts:
///  - `"fehlt"`: `ant` ist lokal nicht installiert.
///  - `"nicht-eingeloggt"`: `ant` ist da, aber `print-credentials` liefert
///    (noch) kein Token — ein Klick auf «Mit Claude-Abo anmelden» würde jetzt
///    den Browser-Popup öffnen.
///  - `"eingeloggt"`: `ant` ist da UND bereits angemeldet (Abo aktiv) — ein
///    Klick auf «Mit Claude-Abo anmelden» holt das Token nur noch in Kosmo,
///    ohne neuen Login-Dialog.
/// Liefert IMMER einen der drei String-Werte (kein `Result`) — die Prüfung
/// selbst kann nicht scheitern, sie beobachtet nur.
#[tauri::command]
fn claude_login_status() -> String {
    if !ant_installiert() {
        return "fehlt".to_string();
    }
    if lese_token().is_some() {
        "eingeloggt".to_string()
    } else {
        "nicht-eingeloggt".to_string()
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
