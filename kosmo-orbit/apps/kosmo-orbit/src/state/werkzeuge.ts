/**
 * Werkzeug-Manifest (Owner-Auftrag «sämtliche Tools im Installer zur Auswahl»):
 * die vollständige Liste dessen, was ein vollumfängliches KosmoOrbit braucht —
 * gruppiert nach Betriebsart. Der Setup-Assistent zeigt daraus die für die
 * aktive Betriebsart nötigen Werkzeuge, erkennt die erreichbaren live und gibt
 * für den Rest den exakten Hol-Befehl.
 *
 * Ehrlich: die schweren Brocken (LLM-Gewichte ~20 GB, Blender, ComfyUI/PyTorch,
 * Whisper) werden NICHT in die .exe gebacken — das wären zweistellige GB. Der
 * Assistent lädt/prüft sie stattdessen gezielt. Genau so machen es auch die
 * grossen Suiten.
 */
import type { Betriebsart } from '@kosmo/ai';

/** Wie der Assistent den Zustand erkennt. */
export type Pruefung = 'ollama' | 'bridge' | 'sync' | 'konto' | 'manuell';

/** Betriebssystem-Achse für die maschinen-ausführbaren Befehle (V1.6 Block A). */
export type Plattform = 'win' | 'mac' | 'linux';

/**
 * Allowlist der Installer-Programme (V1.6 Block A / A2, Serie-I-konform): der
 * Auto-Setup darf NUR diese Erstbefehle ausführen — kein aus der App
 * zusammengebauter beliebiger Shell-String. Jeder `install`-Befehl unten wird
 * gegen diese Liste geprüft (`istErlaubterBefehl`), bevor ein Runner ihn je
 * anfassen darf.
 */
export const ERLAUBTE_INSTALLER = [
  'winget',
  'brew',
  'curl',
  'ollama',
  'pip',
  'pip3',
  'python',
  'python3',
  'node',
] as const;
export type ErlaubterInstaller = (typeof ERLAUBTE_INSTALLER)[number];

export interface Werkzeug {
  id: string;
  name: string;
  zweck: string;
  /** In welchen Betriebsarten dieses Werkzeug gebraucht wird. */
  editionen: Betriebsart[];
  /** Grobe Grösse (für die «passt das noch»-Einschätzung). */
  groesse: string;
  /** Wie man es holt — Befehl oder Quelle, copy-fertig (menschenlesbar). */
  holen: string;
  /**
   * Maschinen-ausführbare Installations-Befehle je Plattform (V1.6 Block A).
   * Ein Eintrag = EIN Befehl (Programm + Argumente, bereits getrennt — kein
   * Parsen eines Strings). Fehlt eine Plattform, ist dieses Werkzeug dort
   * NICHT auto-installierbar (der Assistent zeigt dann nur `holen`). Der erste
   * Eintrag jedes Befehls MUSS in ERLAUBTE_INSTALLER stehen.
   */
  install?: Partial<Record<Plattform, string[][]>>;
  pruefung: Pruefung;
  /** Kern (ohne läuft die Betriebsart nicht) vs. optional/V2. */
  pflicht: boolean;
}

export const WERKZEUGE: Werkzeug[] = [
  {
    id: 'ollama',
    name: 'Ollama (LLM-Server)',
    zweck: 'Führt das lokale Sprachmodell aus — Kosmos Gehirn am HomePC.',
    editionen: ['standard', 'remote'],
    groesse: '~50 MB',
    holen: 'winget install Ollama.Ollama  ·  macOS: brew install ollama  ·  Linux: curl -fsSL https://ollama.com/install.sh | sh',
    install: {
      win: [['winget', 'install', '--id', 'Ollama.Ollama', '-e', '--accept-source-agreements', '--accept-package-agreements']],
      mac: [['brew', 'install', 'ollama']],
      linux: [['curl', '-fsSL', 'https://ollama.com/install.sh', '-o', '/tmp/ollama-install.sh']],
    },
    pruefung: 'ollama',
    pflicht: true,
  },
  {
    id: 'llm-modell',
    name: 'LLM-Modell (qwen3-coder:30b)',
    zweck: 'Das Modell selbst. Kleiner (z.B. qwen3:8b) für schwächere GPUs.',
    editionen: ['standard', 'remote'],
    groesse: '~20 GB (8b ≈ 5 GB)',
    holen: 'ollama pull qwen3-coder:30b   (schwächer: ollama pull qwen3:8b)',
    // Grosser Download (~20 GB) — der Assistent zeigt die Grösse VOR dem Klick
    // und lädt nur nach ausdrücklichem OK (Buildplan Block A / A4).
    install: {
      win: [['ollama', 'pull', 'qwen3-coder:30b']],
      mac: [['ollama', 'pull', 'qwen3-coder:30b']],
      linux: [['ollama', 'pull', 'qwen3-coder:30b']],
    },
    pruefung: 'ollama',
    pflicht: true,
  },
  {
    id: 'bridge',
    name: 'HomeStation-Bridge (Render/STT/TTS)',
    zweck: 'Vermittelt Render-Aufträge, Whisper-Spracherkennung und Stimme.',
    editionen: ['standard', 'remote'],
    groesse: 'Python + wenige MB',
    holen: 'pip install fastapi uvicorn python-multipart httpx  ·  python3 tools/homestation-bridge/kosmo_bridge/main.py --port 8600',
    // Nur die Python-Abhängigkeiten werden auto-installiert; das Starten der
    // Bridge selbst bleibt eine bewusste Nutzer-Handlung (ein laufender Server
    // ist kein Installations-Schritt — Serie-I-Grenze).
    install: {
      win: [['pip', 'install', 'fastapi', 'uvicorn', 'python-multipart', 'httpx']],
      mac: [['pip3', 'install', 'fastapi', 'uvicorn', 'python-multipart', 'httpx']],
      linux: [['pip3', 'install', 'fastapi', 'uvicorn', 'python-multipart', 'httpx']],
    },
    pruefung: 'bridge',
    pflicht: true,
  },
  {
    id: 'sync',
    name: 'Sync-Server (Yjs, Gerätekopplung)',
    zweck: 'Live am selben Modell auf mehreren Geräten (iPad koppeln).',
    editionen: ['standard', 'remote'],
    groesse: 'Node + wenige MB',
    holen: 'node tools/sync-server/src/server.mjs   (Port 8700)',
    pruefung: 'sync',
    pflicht: false,
  },
  {
    id: 'blender',
    name: 'Blender (headless Render/Sim-Worker)',
    zweck: 'Cycles-Renders, Wind-/Gebäudesimulation als Bridge-Worker (V2).',
    editionen: ['standard', 'remote'],
    groesse: '~300 MB',
    holen: 'https://www.blender.org/download/  (oder: winget install BlenderFoundation.Blender)',
    install: {
      win: [['winget', 'install', '--id', 'BlenderFoundation.Blender', '-e', '--accept-source-agreements', '--accept-package-agreements']],
      mac: [['brew', 'install', '--cask', 'blender']],
    },
    pruefung: 'manuell',
    pflicht: false,
  },
  {
    id: 'comfyui',
    name: 'ComfyUI + PyTorch (Diffusion-Render)',
    zweck: 'KI-Renderings aus dem Node-Tree auf der RTX 5090.',
    editionen: ['standard', 'remote'],
    groesse: 'mehrere GB',
    holen: 'https://github.com/comfyanonymous/ComfyUI  (CUDA-PyTorch nach GPU)',
    pruefung: 'bridge',
    pflicht: false,
  },
  {
    id: 'whisper',
    name: 'Whisper-Modell (Schweizerdeutsch STT)',
    zweck: 'Präzise Spracherkennung; ohne läuft der Browser-Fallback.',
    editionen: ['standard', 'remote'],
    groesse: '~1–3 GB',
    holen: 'Über die Bridge geladen (faster-whisper); Modellgrösse in der Bridge-Konfig.',
    pruefung: 'bridge',
    pflicht: false,
  },
  {
    id: 'vpn',
    name: 'VPN (Tailscale oder WireGuard)',
    zweck: 'Sicherer Tunnel vom Laptop zum HomePC — Grundlage des Remote-Modus.',
    editionen: ['remote'],
    groesse: '~40 MB',
    holen: 'https://tailscale.com/download  (auf HomePC UND Laptop; danach die Tailscale-Adresse als HomePC-Adresse eintragen)',
    pruefung: 'manuell',
    pflicht: true,
  },
  {
    id: 'claude-key',
    name: 'Claude-API-Schlüssel',
    zweck: 'Zugang zu Claude (mind. Opus 4.8) — das Gehirn im Cloud-Modus.',
    editionen: ['cloud'],
    groesse: 'kein Download',
    holen: 'https://console.anthropic.com/ → API Keys → Schlüssel in den Kosmo-Einstellungen eintragen (bleibt auf dem Gerät).',
    pruefung: 'konto',
    pflicht: true,
  },
];

/** Die für eine Betriebsart relevanten Werkzeuge (Pflicht zuerst). */
export function werkzeugeFuer(betriebsart: Betriebsart): Werkzeug[] {
  return WERKZEUGE.filter((w) => w.editionen.includes(betriebsart)).sort(
    (a, b) => Number(b.pflicht) - Number(a.pflicht),
  );
}

/**
 * Plattform aus einem `navigator.platform`/UA-String ableiten (rein testbar —
 * kein Zugriff auf globale Objekte). Fällt auf 'linux' zurück, wenn nichts
 * passt (der konservativste Auto-Setup-Weg: curl/pip statt winget/brew).
 */
export function plattformAus(kennung: string): Plattform {
  const s = kennung.toLowerCase();
  if (s.includes('win')) return 'win';
  if (s.includes('mac') || s.includes('darwin') || s.includes('iphone') || s.includes('ipad')) return 'mac';
  return 'linux';
}

/**
 * Ist ein einzelner Befehl (Programm + Argumente) erlaubt? Der erste Eintrag
 * MUSS in ERLAUBTE_INSTALLER stehen (V1.6 Block A / A2, Serie-I-konform).
 * Zusätzlich: kein Argument darf Shell-Metazeichen enthalten — der Runner
 * führt Programm+Args als Array aus (kein Shell-Parsing), aber die Prüfung
 * hält auch versehentlich eingeschleuste Pipes/Semikolons ab.
 */
export function istErlaubterBefehl(befehl: readonly string[]): boolean {
  if (befehl.length === 0) return false;
  if (!(ERLAUBTE_INSTALLER as readonly string[]).includes(befehl[0]!)) return false;
  return befehl.every((teil) => teil.length > 0 && !/[;&|`$(){}<>\n]/.test(teil));
}

/**
 * Die maschinen-ausführbaren Befehle eines Werkzeugs für eine Plattform —
 * oder `null`, wenn dort NICHT auto-installierbar (der Assistent zeigt dann
 * nur `holen`). Jeder gelieferte Befehl ist gegen die Allowlist geprüft;
 * schlägt EIN Befehl durch, gilt das ganze Werkzeug als nicht auto-fähig
 * (fail closed — lieber der manuelle Weg als ein ungeprüfter Befehl).
 */
export function installBefehleFuer(werkzeug: Werkzeug, plattform: Plattform): string[][] | null {
  const befehle = werkzeug.install?.[plattform];
  if (!befehle || befehle.length === 0) return null;
  if (!befehle.every((b) => istErlaubterBefehl(b))) return null;
  return befehle.map((b) => [...b]);
}

/** Kann dieses Werkzeug auf dieser Plattform automatisch geholt werden? */
export function istAutoInstallierbar(werkzeug: Werkzeug, plattform: Plattform): boolean {
  return installBefehleFuer(werkzeug, plattform) !== null;
}
