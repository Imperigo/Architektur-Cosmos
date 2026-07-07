// Extensionslos: der App-Konsument (Vite/tsc, bundler-Resolution) liest diese
// Datei; er würde eine `.ts`-Endung im Re-Export ohne `allowImportingTsExtensions`
// ablehnen. Node-Konsumenten (sync-server) laden NICHT über diesen Index,
// sondern über den self-contained Subpfad `@kosmo/lizenz/verify` (siehe
// package.json "exports") — `lizenz.ts` hat keine relativen Importe und lädt
// unter Node-Type-Stripping direkt.
export * from './lizenz';
