#!/usr/bin/env node
/**
 * netz-check.mjs — Serie I / Batch B8 Prüfskript (R10, siehe
 * `docs/SERIE-I-BUILDPLAN.md` §B8 + `docs/FIREWALL-KONZEPT.md`). Reines Node,
 * KEINE npm-Dependency.
 *
 * EHRLICH VORAB: eine echte Firewall/VPN/TLS-Terminierung ist HomeStation-/
 * Router-Arbeit — das lässt sich aus einer Cloud-/Container-Umgebung heraus
 * nicht real herstellen oder abschliessend prüfen. Was dieses Skript
 * tatsächlich prüfen KANN:
 *
 *   1. KONFIG-LINT — liest `packages/kosmo-ai/src/betrieb.ts` als Text und
 *      prüft, dass die Standard-Betriebsart ausschliesslich `localhost`-
 *      Adressen baut, dass ein TLS-Schema (`https`/`wss`) nur beim expliziten
 *      Remote-Flag verwendet wird, und dass nirgends fest auf `0.0.0.0`
 *      gebunden wird. Das ist ein Text-Lint gegen die eine Quelle der
 *      Wahrheit für Adressbau — kein Ersatz für eine echte Firewall-Prüfung.
 *   2. BIND-SMOKE — startet einen Testdienst, der bewusst nur auf `127.0.0.1`
 *      bindet (so wie Bridge/Sync/Ollama es in Standard-Konfiguration laut
 *      Konzept tun SOLLEN), und versucht, ihn über die LAN-Adresse dieses
 *      Hosts zu erreichen. Das muss fehlschlagen — das beweist das
 *      Betriebssystem-Prinzip «loopback-only bindet wirklich nur loopback»,
 *      NICHT, dass die reale Installation auf der HomeStation tatsächlich so
 *      konfiguriert ist (das bleibt Host-Firewall-Arbeit, siehe unten). Gibt
 *      es im Container kein LAN-Interface (nur `lo`), wird das ehrlich als
 *      übersprungen gemeldet statt einen Fehlschlag vorzutäuschen.
 *
 * BLEIBT ECHT HOMESTATION-/ROUTER-SACHE (hier bewusst NICHT geprüft):
 *   - ob `ufw`/`nftables` auf der realen HomeStation aktiv & korrekt geladen ist
 *   - ob der Router tatsächlich keine Portweiterleitung für 8600/8700/11434 hat
 *   - WireGuard-Konfiguration/Schlüsselverwaltung
 *   - TLS-Zertifikat/mTLS-Setup eines echten Reverse-Proxys
 *
 * Aufruf:  node tools/netz-check.mjs
 * Exit 0 = alle real durchführbaren Prüfungen bestanden (oder ehrlich
 *          übersprungen, weil die Umgebung sie nicht zulässt).
 * Exit 1 = ein durchführbarer Check ist fehlgeschlagen.
 */

import { readFileSync, existsSync } from 'node:fs';
import net from 'node:net';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const kosmoOrbitRoot = path.resolve(__dirname, '..');

/** Ports, die laut Konzept (Standard) nur LAN/VPN, nie offenes Internet sind. */
export const SENSIBLE_PORTS = Object.freeze({ bridge: 8600, sync: 8700, ollama: 11434 });

// ---------------------------------------------------------------------------
// 1) Konfig-Lint gegen die betrieb.ts-Quelle
// ---------------------------------------------------------------------------

/**
 * Prüft den Quelltext von `betrieb.ts` (als reinen Text, nicht ausgeführt)
 * gegen die im Firewall-Konzept versprochenen Eigenschaften. Gibt eine Liste
 * von Fund-Texten zurück — leer bedeutet: alle Prüfungen bestanden.
 */
export function lintBetriebSource(src) {
  const findings = [];

  if (!src.includes("'localhost'")) {
    findings.push('Standard-Host "localhost" nicht gefunden — Adressbau könnte nicht mehr auf localhost fallen.');
  }

  // Die drei sensiblen Ports müssen literal im Adressbau stehen (kein
  // dynamischer/konfigurierbarer offener Port ohne Deckel).
  for (const [name, port] of Object.entries(SENSIBLE_PORTS)) {
    if (!src.includes(`:${port}`)) {
      findings.push(`Port ${port} (${name}) nicht mehr literal im Adressbau gefunden.`);
    }
  }

  // TLS-Schema darf nur bei explizitem remote+remoteTls verwendet werden —
  // sonst würde Standard versehentlich auch https/wss bauen können.
  if (!/betriebsart\s*===\s*'remote'\s*&&\s*ein\.remoteTls\s*===\s*true/.test(src)) {
    findings.push('TLS-Wächter (`betriebsart === \'remote\' && ein.remoteTls === true`) nicht gefunden — https/wss könnte ungewollt auch ausserhalb von Remote greifen.');
  }

  // Nie fest auf alle Interfaces binden/adressieren.
  if (src.includes('0.0.0.0')) {
    findings.push('Quelle enthält "0.0.0.0" — Adressbau darf nie auf alle Interfaces zielen.');
  }

  return findings;
}

// ---------------------------------------------------------------------------
// 2) Bind-Smoke: loopback-only ist wirklich nur loopback erreichbar
// ---------------------------------------------------------------------------

/** Liefert die nicht-internen IPv4-Adressen dieses Hosts (LAN-Interfaces). */
export function lanIPv4Adressen() {
  const out = [];
  const ifaces = os.networkInterfaces();
  for (const entries of Object.values(ifaces)) {
    for (const e of entries ?? []) {
      if (e.family === 'IPv4' && !e.internal) out.push(e.address);
    }
  }
  return out;
}

/**
 * Versucht, `host:port` innerhalb von `timeoutMs` zu verbinden. Löst mit
 * `true` (Verbindung stand), `false` (abgelehnt/Zeitüberschreitung) auf —
 * wirft nie.
 */
function versucheVerbindung(host, port, timeoutMs) {
  return new Promise((resolve) => {
    const socket = new net.Socket();
    let erledigt = false;
    const fertig = (ok) => {
      if (erledigt) return;
      erledigt = true;
      socket.destroy();
      resolve(ok);
    };
    socket.setTimeout(timeoutMs);
    socket.once('connect', () => fertig(true));
    socket.once('timeout', () => fertig(false));
    socket.once('error', () => fertig(false));
    socket.connect(port, host);
  });
}

/**
 * Startet einen Testdienst nur auf `127.0.0.1` und prüft, dass er über keine
 * LAN-Adresse dieses Hosts erreichbar ist. Gibt `{status, detail}` zurück,
 * `status` ∈ `'ok' | 'fail' | 'skipped'`.
 */
export async function bindSmokeCheck({ timeoutMs = 400 } = {}) {
  const lanAdressen = lanIPv4Adressen();
  if (lanAdressen.length === 0) {
    return {
      status: 'skipped',
      detail: 'kein nicht-loopback IPv4-Interface in dieser Umgebung gefunden (Container ohne LAN) — Bind-Smoke ehrlich übersprungen, real auf der HomeStation nachholen.',
    };
  }

  const server = net.createServer((socket) => socket.end());
  await new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', resolve);
  });

  try {
    const port = server.address().port;
    const erreichbar = [];
    for (const host of lanAdressen) {
      // eslint-disable-next-line no-await-in-loop
      const ok = await versucheVerbindung(host, port, timeoutMs);
      if (ok) erreichbar.push(host);
    }
    if (erreichbar.length > 0) {
      return {
        status: 'fail',
        detail: `ein nur auf 127.0.0.1 gebundener Testdienst war über ${erreichbar.join(', ')} erreichbar — loopback-Bindung wird auf diesem Host nicht durchgesetzt.`,
      };
    }
    return {
      status: 'ok',
      detail: `Testdienst nur auf 127.0.0.1 gebunden (Port ${port}) — über ${lanAdressen.length} LAN-Adresse(n) [${lanAdressen.join(', ')}] wie erwartet unerreichbar.`,
    };
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
}

// ---------------------------------------------------------------------------
// CLI
// ---------------------------------------------------------------------------

async function main() {
  const failures = [];

  console.log('[netz-check] Serie I / Batch B8 — Netz-Prüfskript (R10)');
  console.log('[netz-check] Ehrlich: reale Firewall/VPN/TLS = HomeStation-/Router-Arbeit, siehe docs/FIREWALL-KONZEPT.md.');
  console.log();

  console.log('[netz-check] 1) Konfig-Lint (betrieb.ts) …');
  const betriebPath = path.join(kosmoOrbitRoot, 'packages', 'kosmo-ai', 'src', 'betrieb.ts');
  let lintFindings;
  if (!existsSync(betriebPath)) {
    lintFindings = [`betrieb.ts nicht gefunden unter ${betriebPath}`];
  } else {
    lintFindings = lintBetriebSource(readFileSync(betriebPath, 'utf8'));
  }
  if (lintFindings.length === 0) {
    console.log('  OK   Standard baut nur localhost, TLS nur mit explizitem Remote-Flag, kein 0.0.0.0.');
  } else {
    for (const f of lintFindings) {
      console.error(`  FEHL ${f}`);
      failures.push(f);
    }
  }

  console.log('[netz-check] 2) Bind-Smoke (loopback-only bleibt loopback-only) …');
  const bind = await bindSmokeCheck();
  if (bind.status === 'ok') {
    console.log(`  OK   ${bind.detail}`);
  } else if (bind.status === 'skipped') {
    console.log(`  ...  übersprungen (ehrlich): ${bind.detail}`);
  } else {
    console.error(`  FEHL ${bind.detail}`);
    failures.push(bind.detail);
  }

  console.log();
  console.log(
    '[netz-check] Bleibt HomeStation-/Router-Sache: reale ufw/nftables-Aktivierung, Router-Portforwarding, ' +
      'WireGuard-Konfiguration, TLS-Zertifikat/mTLS eines Reverse-Proxys (siehe docs/FIREWALL-KONZEPT.md).',
  );

  if (failures.length > 0) {
    console.error(`[netz-check] ROT — ${failures.length} Prüfung(en) fehlgeschlagen.`);
    process.exitCode = 1;
    return;
  }
  console.log('[netz-check] GRÜN — alle real durchführbaren Prüfungen bestanden (oder ehrlich übersprungen).');
}

const isDirectRun = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isDirectRun) {
  main();
}
