// KosmoOrbit braucht kein PostCSS — diese Datei stoppt Vites Config-Suche,
// bevor sie die Tailwind-Konfiguration der Root-Website findet (deren
// Plugins sind im kosmo-orbit-Workspace nicht installiert; brach den
// Windows-Desktop-Build).
module.exports = { plugins: [] };
