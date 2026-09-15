const AUTH_KEY = 'lumex.minecraft.auth';

async function jsonFetch(url, options = {}) {
  const response = await fetch(url, options);
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(body.error_description || body.errorMessage || body.message || `HTTP ${response.status}`);
  return body;
}

export class AuthService {
  async getSession() {
    try { return JSON.parse(await Neutralino.storage.getData(AUTH_KEY)); } catch { return null; }
  }

  async logout() {
    try { await Neutralino.storage.deleteData(AUTH_KEY); } catch {}
  }

  async loginWithDeviceCode(clientId, onCode) {
    if (!clientId) throw new Error('Set a Microsoft OAuth client ID in Settings first.');
    const form = new URLSearchParams({ client_id: clientId, scope: 'XboxLive.signin offline_access' });
    const device = await jsonFetch('https://login.microsoftonline.com/consumers/oauth2/v2.0/devicecode', {
      method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: form
    });
    onCode?.(device);
    if (device.verification_uri) await Neutralino.os.open(device.verification_uri).catch(() => {});

    const expiresAt = Date.now() + device.expires_in * 1000;
    let microsoft;
    while (Date.now() < expiresAt) {
      await new Promise(r => setTimeout(r, (device.interval || 5) * 1000));
      const tokenForm = new URLSearchParams({
        grant_type: 'urn:ietf:params:oauth:grant-type:device_code', client_id: clientId, device_code: device.device_code
      });
      const response = await fetch('https://login.microsoftonline.com/consumers/oauth2/v2.0/token', {
        method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: tokenForm
      });
      const data = await response.json();
      if (response.ok) { microsoft = data; break; }
      if (data.error === 'authorization_pending') continue;
      if (data.error === 'slow_down') { device.interval = (device.interval || 5) + 5; continue; }
      throw new Error(data.error_description || data.error || 'Microsoft login failed');
    }
    if (!microsoft) throw new Error('Microsoft login timed out.');

    const xbox = await jsonFetch('https://user.auth.xboxlive.com/user/authenticate', {
      method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ Properties: { AuthMethod: 'RPS', SiteName: 'user.auth.xboxlive.com', RpsTicket: `d=${microsoft.access_token}` }, RelyingParty: 'http://auth.xboxlive.com', TokenType: 'JWT' })
    });
    const xsts = await jsonFetch('https://xsts.auth.xboxlive.com/xsts/authorize', {
      method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ Properties: { SandboxId: 'RETAIL', UserTokens: [xbox.Token] }, RelyingParty: 'rp://api.minecraftservices.com/', TokenType: 'JWT' })
    });
    const uhs = xsts.DisplayClaims?.xui?.[0]?.uhs;
    if (!uhs) throw new Error('Xbox authentication did not return a user hash.');
    const mc = await jsonFetch('https://api.minecraftservices.com/authentication/login_with_xbox', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ identityToken: `XBL3.0 x=${uhs};${xsts.Token}` })
    });
    const profile = await jsonFetch('https://api.minecraftservices.com/minecraft/profile', {
      headers: { Authorization: `Bearer ${mc.access_token}` }
    });
    const session = { accessToken: mc.access_token, expiresAt: Date.now() + (mc.expires_in || 86400) * 1000, profile, refreshToken: microsoft.refresh_token || '' };
    await Neutralino.storage.setData(AUTH_KEY, JSON.stringify(session));
    return session;
  }
}
