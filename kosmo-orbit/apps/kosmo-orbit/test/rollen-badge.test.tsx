import { describe, expect, it } from 'vitest';
import { KOSMO_ROLLEN, type KosmoRolle } from '@kosmo/ai';
import { rollenBadgeLabel, rollenBadgeTestId, rollenBadgeTitel } from '../src/shell/KosmoPanel';

/**
 * v0.8.2 / P6 «Staffelung + Kuratier-Flow» (`docs/V082-SPEZ.md` §6.7,
 * Owner-Entscheid 3/C-3/C-11) — die drei reinen Hilfsfunktionen hinter dem
 * Rollen-Badge (`KosmoPanel.tsx`). Bewusst als Unit-Test auf den reinen
 * Funktionen statt eines vollen `KosmoPanel`-Renders (der braucht
 * IndexedDB/Zustand-Stores/localStorage-Settings, die kein bestehender
 * App-Test aufsetzt) — der tatsächliche Bubble-Render mit Badge ist Sache
 * von `e2e/staffelung-kuratier.spec.ts` (Screenshot-Beweis).
 */
describe('rollenBadgeLabel — Kosmo-eigene Namen (docs/KI-MODELL-GUIDELINE.md Teil C)', () => {
  it('liefert die drei Kosmo-Stufennamen', () => {
    expect(rollenBadgeLabel('meister')).toBe('Kosmo-Meister');
    expect(rollenBadgeLabel('leiter')).toBe('Kosmo-Leiter');
    expect(rollenBadgeLabel('zeichner')).toBe('Kosmo-Zeichner');
  });

  it('deckt ALLE KOSMO_ROLLEN ab (keine Rolle ohne Label)', () => {
    for (const r of KOSMO_ROLLEN) {
      expect(rollenBadgeLabel(r)).toMatch(/^Kosmo-/);
    }
  });
});

describe('rollenBadgeTestId — «rollen-badge-<rolle>»-Schema', () => {
  it('folgt dem additiven testid-Schema für alle drei Rollen', () => {
    const erwartet: Record<KosmoRolle, string> = {
      meister: 'rollen-badge-meister',
      leiter: 'rollen-badge-leiter',
      zeichner: 'rollen-badge-zeichner',
    };
    for (const r of KOSMO_ROLLEN) {
      expect(rollenBadgeTestId(r)).toBe(erwartet[r]);
    }
  });
});

describe('rollenBadgeTitel — Ehrlichkeit vor Politur (Ein-Modell-Betrieb offen benannt)', () => {
  it('benennt den Ein-Modell-Betrieb offen, statt einen Modellwechsel vorzutäuschen', () => {
    expect(rollenBadgeTitel(true, 'chat-standard')).toContain('Ein-Modell-Betrieb');
    expect(rollenBadgeTitel(true, 'chat-standard')).toContain('kein Modellwechsel');
  });

  it('zeigt ohne Ein-Modell-Betrieb nur die Aufgabenklasse, ohne Ein-Modell-Zusatz', () => {
    const titel = rollenBadgeTitel(false, 'werkzeug-schreibend');
    expect(titel).toContain('werkzeug-schreibend');
    expect(titel).not.toContain('Ein-Modell-Betrieb');
  });
});
