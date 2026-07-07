import { describe, expect, it } from 'vitest';
import {
  ERLAUBTE_INSTALLER,
  WERKZEUGE,
  installBefehleFuer,
  istAutoInstallierbar,
  istErlaubterBefehl,
  plattformAus,
  werkzeugeFuer,
} from '../src/state/werkzeuge';

/**
 * V1.6 Block A / A1 — das reine Fundament des Auto-Setups (Werkzeug-Manifest
 * + Allowlist + Plattform-Befehle) ohne Tauri/DOM. Der Runner (A2/A3) baut
 * darauf; hier wird bewiesen, dass NUR erlaubte Befehle je durchkommen.
 */

describe('plattformAus (rein)', () => {
  it('erkennt Windows/macOS/Linux und fällt konservativ auf linux', () => {
    expect(plattformAus('Win32')).toBe('win');
    expect(plattformAus('MacIntel')).toBe('mac');
    expect(plattformAus('Linux x86_64')).toBe('linux');
    expect(plattformAus('iPad')).toBe('mac');
    expect(plattformAus('irgendwas-unbekanntes')).toBe('linux');
  });
});

describe('istErlaubterBefehl (Allowlist-Wächter, Serie-I)', () => {
  it('lässt nur Befehle durch, deren erstes Wort in der Allowlist steht', () => {
    expect(istErlaubterBefehl(['winget', 'install', 'Ollama.Ollama'])).toBe(true);
    expect(istErlaubterBefehl(['ollama', 'pull', 'qwen3-coder:30b'])).toBe(true);
    expect(istErlaubterBefehl(['rm', '-rf', '/'])).toBe(false);
    expect(istErlaubterBefehl(['bash', '-c', 'evil'])).toBe(false);
    expect(istErlaubterBefehl([])).toBe(false);
  });

  it('weist Shell-Metazeichen ab (kein eingeschleuster Pipe/Semikolon)', () => {
    expect(istErlaubterBefehl(['curl', 'https://x.sh', '|', 'sh'])).toBe(false);
    expect(istErlaubterBefehl(['ollama', 'pull', 'x; rm -rf /'])).toBe(false);
    expect(istErlaubterBefehl(['winget', 'install', '$(whoami)'])).toBe(false);
  });

  it('deckt genau die dokumentierte Installer-Menge ab', () => {
    expect([...ERLAUBTE_INSTALLER].sort()).toEqual(
      ['brew', 'curl', 'node', 'ollama', 'pip', 'pip3', 'python', 'python3', 'winget'].sort(),
    );
  });
});

describe('installBefehleFuer (fail closed)', () => {
  const ollama = WERKZEUGE.find((w) => w.id === 'ollama')!;
  const blender = WERKZEUGE.find((w) => w.id === 'blender')!;
  const claudeKey = WERKZEUGE.find((w) => w.id === 'claude-key')!;

  it('liefert die geprüften Befehle je Plattform', () => {
    expect(installBefehleFuer(ollama, 'win')?.[0]?.[0]).toBe('winget');
    expect(installBefehleFuer(ollama, 'mac')?.[0]).toEqual(['brew', 'install', 'ollama']);
    expect(installBefehleFuer(ollama, 'linux')?.[0]?.[0]).toBe('curl');
  });

  it('gibt null, wo keine Befehle hinterlegt sind (nur manueller Weg)', () => {
    // Claude-Key ist kein Download — keine install-Befehle, ergo nicht auto.
    expect(installBefehleFuer(claudeKey, 'win')).toBeNull();
    expect(istAutoInstallierbar(claudeKey, 'win')).toBe(false);
    // Blender hat win/mac, aber kein linux-Befehl im Manifest.
    expect(installBefehleFuer(blender, 'linux')).toBeNull();
    expect(istAutoInstallierbar(blender, 'win')).toBe(true);
  });

  it('liefert eine Kopie (kein Aliasing des Manifests)', () => {
    const a = installBefehleFuer(ollama, 'win')!;
    a[0]!.push('--boese');
    expect(installBefehleFuer(ollama, 'win')![0]).not.toContain('--boese');
  });

  it('JEDER install-Befehl im ganzen Manifest ist Allowlist-konform (kein Schmuggel)', () => {
    for (const w of WERKZEUGE) {
      for (const plattform of ['win', 'mac', 'linux'] as const) {
        for (const befehl of w.install?.[plattform] ?? []) {
          expect(istErlaubterBefehl(befehl), `${w.id}/${plattform}: ${befehl.join(' ')}`).toBe(true);
        }
      }
    }
  });
});

describe('werkzeugeFuer (unverändert, Regressionsanker)', () => {
  it('Cloud-Edition braucht den Claude-Key als Pflicht, kein Ollama', () => {
    const cloud = werkzeugeFuer('cloud');
    expect(cloud.some((w) => w.id === 'claude-key' && w.pflicht)).toBe(true);
    expect(cloud.some((w) => w.id === 'ollama')).toBe(false);
  });
});
