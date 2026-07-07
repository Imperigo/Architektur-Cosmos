/**
 * CSP-Härtung (Serie I / Batch B2, R6) — deaktiviert Zods internen
 * eval-Schnellpfad-Test, BEVOR irgendein Command-Zod-Schema gebaut wird.
 *
 * `zod` v4 probiert beim Bau eines Objekt-Schemas einmalig `new Function("")`,
 * um zu entscheiden, ob es einen kompilierten («fast») oder einen
 * interpretierten Parse-Pfad nimmt (`node_modules/zod/v4/core/util.js`,
 * `allowsEval`). Unter unserer strikten CSP (`script-src 'self'`, kein
 * `'unsafe-eval'`) wirft dieser Test intern — Zod fängt den Fehler ab und
 * fällt sauber auf den interpretierten Pfad zurück (funktional folgenlos),
 * ABER der Browser meldet den geblockten `Function`-Aufruf trotzdem als
 * `securitypolicyviolation`. Zod kennt dieses Muster genau (siehe Kommentar
 * in `util.js`: „strict CSPs report the caught new Function as a
 * securitypolicyviolation“) und bietet dafür `z.config({ jitless: true })` —
 * das überspringt den Test komplett, keine Konsolen-Meldung mehr, keine
 * CSP-Lockerung nötig.
 *
 * WICHTIG: Diese Datei muss der ERSTE Applikations-Import in `main.tsx` vor
 * `./App` bleiben — ESM wertet Geschwister-Imports in Quelltextreihenfolge
 * vollständig aus, bevor der nächste an der Reihe ist; nur so läuft dieser
 * Aufruf, bevor `@kosmo/kernel`/`@kosmo/ai` beim Import von `App` ihre
 * Command-Schemas anlegen.
 */
import { z } from 'zod';

z.config({ jitless: true });
