import {
  PublicClientApplication,
  type AccountInfo,
  type IPublicClientApplication,
} from '@azure/msal-browser';

/**
 * OneDrive-Anbindung (Owner-Q28) — Microsoft Graph über MSAL (PKCE, Popup).
 *
 * Voraussetzung einmalig: App-Registrierung im Azure-Portal (persönliches
 * Microsoft-Konto oder Büro-Tenant), Redirect-URI = App-Ursprung (SPA),
 * delegierte Berechtigungen Files.Read + User.Read. Die Client-ID wird in
 * KosmoPrepare hinterlegt — es fliesst kein Geheimnis, PKCE braucht keins.
 */

const SCOPES = ['User.Read', 'Files.Read'];
const GRAPH = 'https://graph.microsoft.com/v1.0';

let app: IPublicClientApplication | null = null;
let appClientId: string | null = null;

async function getApp(clientId: string): Promise<IPublicClientApplication> {
  if (app && appClientId === clientId) return app;
  app = new PublicClientApplication({
    auth: {
      clientId,
      authority: 'https://login.microsoftonline.com/common',
      redirectUri: window.location.origin,
    },
    cache: { cacheLocation: 'localStorage' },
  });
  await app.initialize();
  appClientId = clientId;
  return app;
}

export interface DriveAccount {
  name: string;
  username: string;
}

export async function signIn(clientId: string): Promise<DriveAccount> {
  const pca = await getApp(clientId);
  const existing = pca.getAllAccounts()[0];
  if (existing) {
    pca.setActiveAccount(existing);
    return { name: existing.name ?? existing.username, username: existing.username };
  }
  const res = await pca.loginPopup({ scopes: SCOPES });
  pca.setActiveAccount(res.account);
  return { name: res.account.name ?? res.account.username, username: res.account.username };
}

export async function signOut(clientId: string): Promise<void> {
  const pca = await getApp(clientId);
  const account = pca.getActiveAccount();
  if (account) await pca.logoutPopup({ account });
}

export function currentAccount(): DriveAccount | null {
  const acc: AccountInfo | undefined = app?.getAllAccounts()[0];
  return acc ? { name: acc.name ?? acc.username, username: acc.username } : null;
}

async function token(clientId: string): Promise<string> {
  const pca = await getApp(clientId);
  const account = pca.getActiveAccount() ?? pca.getAllAccounts()[0];
  if (!account) throw new Error('Nicht angemeldet');
  try {
    const res = await pca.acquireTokenSilent({ scopes: SCOPES, account });
    return res.accessToken;
  } catch {
    const res = await pca.acquireTokenPopup({ scopes: SCOPES });
    return res.accessToken;
  }
}

export interface DriveItem {
  id: string;
  name: string;
  isFolder: boolean;
  size?: number;
  downloadUrl?: string;
}

interface GraphItem {
  id: string;
  name: string;
  size?: number;
  folder?: unknown;
  file?: unknown;
  '@microsoft.graph.downloadUrl'?: string;
}

/** Ordnerinhalt: itemId null = Wurzel des persönlichen OneDrive. */
export async function listFolder(clientId: string, itemId: string | null): Promise<DriveItem[]> {
  const t = await token(clientId);
  const path = itemId ? `/me/drive/items/${itemId}/children` : '/me/drive/root/children';
  const res = await fetch(`${GRAPH}${path}?$top=200&$select=id,name,size,folder,file`, {
    headers: { Authorization: `Bearer ${t}` },
  });
  if (!res.ok) throw new Error(`Graph ${res.status}: ${await res.text()}`);
  const json = (await res.json()) as { value: GraphItem[] };
  return json.value
    .map((it) => ({
      id: it.id,
      name: it.name,
      isFolder: Boolean(it.folder),
      ...(it.size !== undefined ? { size: it.size } : {}),
    }))
    .sort((a, b) => Number(b.isFolder) - Number(a.isFolder) || a.name.localeCompare(b.name, 'de'));
}

/** Datei herunterladen (für die Ingestion-Pipeline). */
export async function downloadFile(clientId: string, itemId: string, name: string): Promise<File> {
  const t = await token(clientId);
  const meta = await fetch(`${GRAPH}/me/drive/items/${itemId}?$select=id,name,@microsoft.graph.downloadUrl`, {
    headers: { Authorization: `Bearer ${t}` },
  });
  if (!meta.ok) throw new Error(`Graph ${meta.status}`);
  const item = (await meta.json()) as GraphItem;
  const url = item['@microsoft.graph.downloadUrl'];
  if (!url) throw new Error('Kein Download-Link (Ordner?)');
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Download ${res.status}`);
  const blob = await res.blob();
  return new File([blob], name, { type: blob.type });
}

export function isIngestable(name: string): boolean {
  return /\.(pdf|txt|md)$/i.test(name);
}
