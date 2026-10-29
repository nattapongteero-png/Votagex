// LINE login for VOTAGEX (Cloudflare Workers, free plan). Firebase has no LINE sign-in, so this Worker does it:
//   /start?return=<app page>  → off to LINE's login page
//   /callback (LINE comes back here) → asks LINE who it is, then makes a Firebase custom token for "line:<LINE id>"
//   and sends the person back to the app page with it after the #: #line=<token>&name=…&pic=…
//   (cancelled or failed: #line_error=…). The app signs in with the token (cloud.js).
// Settings: LINE_CHANNEL_ID and ALLOWED_ORIGINS in wrangler.toml; LINE_CHANNEL_SECRET and FIREBASE_SERVICE_ACCOUNT
// (the service account's JSON key) are secrets (wrangler secret put), never in code. Steps: README.md.

const LINE_AUTHORIZE = 'https://access.line.me/oauth2/v2.1/authorize';
const LINE_API = 'https://api.line.me/oauth2/v2.1';
const FIREBASE_AUD = 'https://identitytoolkit.googleapis.com/google.identity.identitytoolkit.v1.IdentityToolkit';
const COOKIE = 'votagex_line';

export default {
  async fetch(req, env) {
    const url = new URL(req.url);
    try {
      if (url.pathname === '/start') return start(url, env);
      if (url.pathname === '/callback') return await callback(req, url, env);
    } catch (e) {
      console.error(e);
      return new Response('LINE login failed', { status: 500 });
    }
    return new Response('Not found', { status: 404 });
  },
};

// only back to our own app: the token must never go to someone else's page
function allowedReturn(ret, env) {
  try {
    const u = new URL(ret);
    return env.ALLOWED_ORIGINS.split(',').map((o) => o.trim()).includes(u.origin) ? `${u.origin}${u.pathname}${u.search}` : null;
  } catch {
    return null;
  }
}

const random = () => [...crypto.getRandomValues(new Uint8Array(16))].map((b) => b.toString(16).padStart(2, '0')).join('');
const b64url = (bytes) => btoa(String.fromCharCode(...new Uint8Array(bytes))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const b64urlText = (s) => b64url(new TextEncoder().encode(s));
const redirect = (to, headers = {}) => new Response(null, { status: 302, headers: { Location: to, 'Cache-Control': 'no-store', ...headers } });

function start(url, env) {
  const ret = allowedReturn(url.searchParams.get('return') || '', env);
  if (!ret) return new Response('Bad return address', { status: 400 });
  const state = random();
  const nonce = random();
  const to = new URL(env.LINE_AUTHORIZE || LINE_AUTHORIZE);
  Object.entries({
    response_type: 'code', client_id: env.LINE_CHANNEL_ID, redirect_uri: `${url.origin}/callback`,
    state, nonce, scope: 'profile openid',
  }).forEach(([k, v]) => to.searchParams.set(k, v));
  // what /callback checks LINE's answer against, for 10 minutes
  const cookie = `${COOKIE}=${state}.${nonce}.${b64urlText(ret)}; Path=/callback; Max-Age=600; HttpOnly; Secure; SameSite=Lax`;
  return redirect(to.toString(), { 'Set-Cookie': cookie });
}

async function callback(req, url, env) {
  const [state, nonce, retB64] = (req.headers.get('Cookie') || '').split(/;\s*/).find((c) => c.startsWith(`${COOKIE}=`))?.slice(COOKIE.length + 1).split('.') || [];
  const ret = retB64 && allowedReturn(atob(retB64.replace(/-/g, '+').replace(/_/g, '/')), env);
  if (!ret) return new Response('Login expired, start again', { status: 400 });
  const clear = { 'Set-Cookie': `${COOKIE}=; Path=/callback; Max-Age=0; HttpOnly; Secure; SameSite=Lax` };
  const fail = (why) => redirect(`${ret}#line_error=${why}`, clear);
  if (url.searchParams.get('error')) return fail('cancel'); // pressed cancel on LINE
  if (!state || url.searchParams.get('state') !== state) return fail('state');

  // the code for LINE's ID token, then LINE checks the token (signature, our channel, our nonce) and says who it is
  const api = env.LINE_API || LINE_API;
  const form = (o) => ({ method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams(o) });
  const tok = await fetch(`${api}/token`, form({
    grant_type: 'authorization_code', code: url.searchParams.get('code') || '', redirect_uri: `${url.origin}/callback`,
    client_id: env.LINE_CHANNEL_ID, client_secret: env.LINE_CHANNEL_SECRET,
  }));
  if (!tok.ok) return fail('token');
  const { id_token: idToken } = await tok.json();
  const who = await fetch(`${api}/verify`, form({ id_token: idToken, client_id: env.LINE_CHANNEL_ID, nonce }));
  if (!who.ok) return fail('verify');
  const { sub, name = '', picture = '' } = await who.json();
  if (!sub) return fail('verify');

  const token = await firebaseToken(`line:${sub}`, JSON.parse(env.FIREBASE_SERVICE_ACCOUNT));
  const back = new URLSearchParams({ line: token, name, pic: picture });
  return redirect(`${ret}#${back}`, clear);
}

// A Firebase custom token: a JWT signed with the service account's key (what the Admin SDK's createCustomToken makes)
async function firebaseToken(uid, sa) {
  const now = Math.floor(Date.now() / 1000);
  const head = b64urlText(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
  const body = b64urlText(JSON.stringify({ iss: sa.client_email, sub: sa.client_email, aud: FIREBASE_AUD, iat: now, exp: now + 3600, uid }));
  const der = Uint8Array.from(atob(sa.private_key.replace(/-----[^-]+-----|\s/g, '')), (c) => c.charCodeAt(0));
  const key = await crypto.subtle.importKey('pkcs8', der, { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' }, false, ['sign']);
  const sig = await crypto.subtle.sign('RSASSA-PKCS1-v1_5', key, new TextEncoder().encode(`${head}.${body}`));
  return `${head}.${body}.${b64url(sig)}`;
}
