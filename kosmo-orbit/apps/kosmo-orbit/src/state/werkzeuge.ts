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

export interface Werkzeug {
  id: string;
  name: string;
  zweck: string;
  /** In welchen Betriebsarten dieses Werkzeug gebraucht wird. */
  editionen: Betriebsart[];
  /** Grobe Grösse (für die «passt das noch»-Einschätzung). */
  groesse: string;
  /** Wie man es holt — Befehl oder Quelle, copy-fertig. */
  holen: string;
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
