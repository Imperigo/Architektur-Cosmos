import { describe, expect, it } from 'vitest';
import { anthropicAuthHeader } from '../src/anthropic';

/**
 * Cloud-Login mit Abo (OAuth, wie Claude Code/`ant`/Agent-SDK): der reine
 * Header-Baustein hinter dem Bearer-Weg. Beide Modi schliessen sich aus —
 * die Anthropic-API akzeptiert nicht `x-api-key` und `Authorization`
 * gleichzeitig.
 */
describe('anthropicAuthHeader', () => {
  it('liefert bei oauthToken den Bearer- + Beta-Header, ohne x-api-key', () => {
    const h = anthropicAuthHeader({ oauthToken: 'sk-ant-oat-test' });
    expect(h).toEqual({
      Authorization: 'Bearer sk-ant-oat-test',
      'anthropic-beta': 'oauth-2025-04-20',
    });
    expect(h['x-api-key']).toBeUndefined();
  });

  it('liefert bei apiKey den x-api-key-Header, ohne Authorization', () => {
    const h = anthropicAuthHeader({ apiKey: 'sk-ant-test' });
    expect(h).toEqual({ 'x-api-key': 'sk-ant-test' });
    expect(h.Authorization).toBeUndefined();
    expect(h['anthropic-beta']).toBeUndefined();
  });

  it('oauthToken hat Vorrang, wenn beide gesetzt sind', () => {
    const h = anthropicAuthHeader({ apiKey: 'sk-ant-test', oauthToken: 'sk-ant-oat-test' });
    expect(h['x-api-key']).toBeUndefined();
    expect(h.Authorization).toBe('Bearer sk-ant-oat-test');
  });

  it('ohne beides: leerer x-api-key statt Absturz', () => {
    const h = anthropicAuthHeader({});
    expect(h).toEqual({ 'x-api-key': '' });
  });
});
