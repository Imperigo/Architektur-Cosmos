import { describe, expect, it } from 'vitest';
import {
  CLOUD_MODELL_MIN,
  bereinigeHost,
  betriebKonfig,
  editionBetriebsart,
  leseEdition,
  lizenzHinweis,
  mindestensOpus,
} from '../src';

describe('Betriebsart → Konfiguration', () => {
  it('standard: alle Dienste auf localhost, Ollama, keine Cloud', () => {
    const k = betriebKonfig({ betriebsart: 'standard' });
    expect(k.provider).toBe('ollama');
    expect(k.llmBaseUrl).toBe('http://localhost:11434');
    expect(k.bridgeUrl).toBe('http://localhost:8600');
    expect(k.syncUrl).toBe('ws://localhost:8700');
    expect(k.cloud).toBe(false);
  });

  it('remote: alle Dienste auf den VPN-Host, Ports bleiben', () => {
    const k = betriebKonfig({ betriebsart: 'remote', remoteHost: '100.87.3.2' });
    expect(k.provider).toBe('ollama');
    expect(k.llmBaseUrl).toBe('http://100.87.3.2:11434');
    expect(k.bridgeUrl).toBe('http://100.87.3.2:8600');
    expect(k.syncUrl).toBe('ws://100.87.3.2:8700');
    expect(k.cloud).toBe(false);
  });

  it('remote ohne Host fällt sicher auf localhost zurück (kein leerer Host)', () => {
    const k = betriebKonfig({ betriebsart: 'remote', remoteHost: '' });
    expect(k.llmBaseUrl).toBe('http://localhost:11434');
  });

  it('cloud: Anthropic, keine lokalen Dienste, Modell mind. Opus 4.8', () => {
    const k = betriebKonfig({ betriebsart: 'cloud' });
    expect(k.provider).toBe('anthropic');
    expect(k.llmBaseUrl).toBe('');
    expect(k.bridgeUrl).toBe('');
    expect(k.syncUrl).toBe('');
    expect(k.cloud).toBe(true);
    expect(k.cloudModell).toBe(CLOUD_MODELL_MIN);
  });

  it('cloud hebt ein zu schwaches Modell auf Opus 4.8 an, lässt Opus/Eigenes stehen', () => {
    expect(betriebKonfig({ betriebsart: 'cloud', cloudModell: 'claude-haiku-4-5-20251001' }).cloudModell).toBe(CLOUD_MODELL_MIN);
    expect(betriebKonfig({ betriebsart: 'cloud', cloudModell: 'claude-sonnet-5' }).cloudModell).toBe(CLOUD_MODELL_MIN);
    expect(betriebKonfig({ betriebsart: 'cloud', cloudModell: 'claude-opus-4-8' }).cloudModell).toBe('claude-opus-4-8');
  });
});

describe('Betriebsart → Konfiguration (Default unverändert, B8-Regressionsschutz)', () => {
  it('standard bleibt ws/http, auch wenn remoteTls gesetzt würde (Standard ignoriert das Flag)', () => {
    const k = betriebKonfig({ betriebsart: 'standard', remoteTls: true });
    expect(k.llmBaseUrl).toBe('http://localhost:11434');
    expect(k.bridgeUrl).toBe('http://localhost:8600');
    expect(k.syncUrl).toBe('ws://localhost:8700');
    expect(k.remoteTls).toBeUndefined();
  });

  it('remote ohne remoteTls (Default) bleibt ws/http wie bisher', () => {
    const k = betriebKonfig({ betriebsart: 'remote', remoteHost: '100.87.3.2' });
    expect(k.llmBaseUrl).toBe('http://100.87.3.2:11434');
    expect(k.bridgeUrl).toBe('http://100.87.3.2:8600');
    expect(k.syncUrl).toBe('ws://100.87.3.2:8700');
    expect(k.remoteTls).toBeUndefined();
  });

  it('remote mit remoteTls: false bleibt ws/http (kein remoteTls-Feld im Ergebnis)', () => {
    const k = betriebKonfig({ betriebsart: 'remote', remoteHost: '100.87.3.2', remoteTls: false });
    expect(k.llmBaseUrl).toBe('http://100.87.3.2:11434');
    expect(k.syncUrl).toBe('ws://100.87.3.2:8700');
    expect(k.remoteTls).toBeUndefined();
  });

  it('remote mit remoteTls: true baut https/wss statt http/ws', () => {
    const k = betriebKonfig({ betriebsart: 'remote', remoteHost: '100.87.3.2', remoteTls: true });
    expect(k.provider).toBe('ollama');
    expect(k.llmBaseUrl).toBe('https://100.87.3.2:11434');
    expect(k.bridgeUrl).toBe('https://100.87.3.2:8600');
    expect(k.syncUrl).toBe('wss://100.87.3.2:8700');
    expect(k.cloud).toBe(false);
    expect(k.remoteTls).toBe(true);
  });

  it('remote mit remoteTls: true und leerem Host fällt weiterhin sicher auf localhost zurück, aber mit TLS-Schema', () => {
    const k = betriebKonfig({ betriebsart: 'remote', remoteHost: '', remoteTls: true });
    expect(k.llmBaseUrl).toBe('https://localhost:11434');
    expect(k.syncUrl).toBe('wss://localhost:8700');
  });

  it('cloud ignoriert remoteTls (bleibt leer, kein http/https-Bezug)', () => {
    const k = betriebKonfig({ betriebsart: 'cloud', remoteTls: true });
    expect(k.llmBaseUrl).toBe('');
    expect(k.bridgeUrl).toBe('');
    expect(k.syncUrl).toBe('');
    expect(k.remoteTls).toBeUndefined();
  });
});

describe('bereinigeHost', () => {
  it('nimmt blossen Host, Name oder IP unverändert', () => {
    expect(bereinigeHost('kosmo.local')).toBe('kosmo.local');
    expect(bereinigeHost('100.87.3.2')).toBe('100.87.3.2');
  });
  it('streift Schema, Port und Pfad ab', () => {
    expect(bereinigeHost('http://kosmo.local:11434/')).toBe('kosmo.local');
    expect(bereinigeHost('https://100.87.3.2:8600/api')).toBe('100.87.3.2');
    expect(bereinigeHost('  kosmo.local:8700  ')).toBe('kosmo.local');
  });
  it('leere Eingabe bleibt leer', () => {
    expect(bereinigeHost('')).toBe('');
  });
});

describe('Edition', () => {
  it('liest den rohen Build-String robust, Default = standard', () => {
    expect(leseEdition('remote')).toBe('remote');
    expect(leseEdition('CLOUD')).toBe('cloud');
    expect(leseEdition('  standard ')).toBe('standard');
    expect(leseEdition('')).toBe('standard');
    expect(leseEdition(undefined)).toBe('standard');
    expect(leseEdition('quatsch')).toBe('standard');
  });
  it('Edition → Erststart-Betriebsart', () => {
    expect(editionBetriebsart('standard')).toBe('standard');
    expect(editionBetriebsart('remote')).toBe('remote');
    expect(editionBetriebsart('cloud')).toBe('cloud');
  });
});

describe('lizenzHinweis (Serie I / Batch B6 — additiv, Default unverändert)', () => {
  it('ohne konfigurierten Public Key: keine Pflicht, kein Hinweistext (Default vor B6)', () => {
    const h = lizenzHinweis(false, null);
    expect(h.status).toBe('keine-pflicht');
    expect(h.text).toBe('');
    // Selbst ein (theoretisch) vorhandenes Ergebnis ändert daran nichts —
    // ohne Public Key im Build/Env greift die Pflicht gar nicht erst.
    expect(lizenzHinweis(false, { gueltig: false, grund: 'abgelaufen' }).status).toBe('keine-pflicht');
  });

  it('Public Key konfiguriert, keine Lizenz gespeichert: fehlt, lokale Arbeit bleibt möglich', () => {
    const h = lizenzHinweis(true, null);
    expect(h.status).toBe('fehlt');
    expect(h.text).toContain('lokale Arbeit bleibt möglich');
  });

  it('gültige Lizenz', () => {
    const h = lizenzHinweis(true, { gueltig: true });
    expect(h.status).toBe('gueltig');
  });

  it('abgelaufene Lizenz', () => {
    const h = lizenzHinweis(true, { gueltig: false, grund: 'abgelaufen' });
    expect(h.status).toBe('abgelaufen');
    expect(h.text).toContain('lokale Arbeit bleibt möglich');
  });

  it('sonstige Ungültigkeit (Signatur/Format/Widerruf)', () => {
    expect(lizenzHinweis(true, { gueltig: false, grund: 'signatur_ungueltig' }).status).toBe('ungueltig');
    expect(lizenzHinweis(true, { gueltig: false, grund: 'lizenz_widerrufen' }).status).toBe('ungueltig');
  });
});

describe('mindestensOpus', () => {
  it('leer → Opus 4.8', () => {
    expect(mindestensOpus()).toBe(CLOUD_MODELL_MIN);
    expect(mindestensOpus('')).toBe(CLOUD_MODELL_MIN);
  });
  it('schwache Stufen werden angehoben', () => {
    expect(mindestensOpus('claude-haiku-4-5-20251001')).toBe(CLOUD_MODELL_MIN);
    expect(mindestensOpus('claude-sonnet-5')).toBe(CLOUD_MODELL_MIN);
  });
  it('Opus bleibt', () => {
    expect(mindestensOpus('claude-opus-4-8')).toBe('claude-opus-4-8');
  });
});
