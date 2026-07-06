use std::process::Command;

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
#[tauri::command]
fn claude_login() -> Result<String, String> {
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

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .invoke_handler(tauri::generate_handler![claude_login])
        .run(tauri::generate_context!())
        .expect("Fehler beim Starten von KosmoOrbit");
}
