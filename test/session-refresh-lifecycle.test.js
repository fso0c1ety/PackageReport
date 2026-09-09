const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');

function harness(fetch) {
  const source = fs.readFileSync('src/app/apiUrl.ts', 'utf8');
  const start = source.indexOf('let sessionRefreshPromise:');
  const end = source.indexOf('const NATIVE_PRODUCTION_FALLBACK_URL');
  const values = new Map([['token', 'expired-access']]);
  let refreshToken = 'valid-refresh';
  const context = {
    exports: {},
    authenticatedFetch: fetch, isNativeStaticRuntime: () => true, getApiUrl: () => '/api/auth/refresh',
    localStorage: { getItem: k => values.get(k) || null, setItem: (k,v) => values.set(k,v) },
    getNativeRefreshToken: async () => refreshToken,
    setNativeRefreshToken: async value => { refreshToken = value; },
  };
  vm.createContext(context);
  vm.runInContext(ts.transpile(source.slice(start,end)), context);
  return { refresh: () => context.refreshAccessSession('expired-access'), values, token: () => refreshToken };
}

test('Electron startup restores an access session from secure refresh storage', async () => {
  const values = new Map();
  let storedRefresh = 'valid-refresh';
  const context = {
    exports: {}, require: name => name === './authStorage' ? {
      getNativeRefreshToken: async () => storedRefresh,
      setNativeRefreshToken: async value => { storedRefresh = value; },
      clearNativeRefreshToken: async () => { storedRefresh = null; },
    } : { Capacitor: { isNativePlatform: () => false } },
    fetch: async () => Response.json({token:'restored-access',refreshToken:'rotated-refresh'}),
    URL, URLSearchParams, Response, Headers, FormData, console,
    process: { env: {} }, navigator: { userAgent: 'Electron' },
    localStorage: { getItem: key => values.get(key) || null, setItem: (key,value) => values.set(key,value), removeItem: key => values.delete(key) },
    sessionStorage: { removeItem() {} },
    window: { smartManageRuntime: {isElectron:true}, location: {origin:'app://localhost',hostname:'localhost',port:'',protocol:'app:',pathname:'/home',replace() {}} },
  };
  vm.createContext(context);
  vm.runInContext(ts.transpile(fs.readFileSync('src/app/apiUrl.ts', 'utf8'), {module:ts.ModuleKind.CommonJS}), context);
  assert.equal(await context.exports.restoreNativeSession(), 'refreshed');
  assert.equal(values.get('token'), 'restored-access');
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(storedRefresh, 'rotated-refresh');
});

test('successful login commits local session before non-blocking secure persistence', () => {
  const source = fs.readFileSync('src/app/(auth)/LoginForm.tsx', 'utf8');
  const tokenWrite = source.indexOf("localStorage.setItem('token', data.token)");
  const secureWrite = source.indexOf('void setNativeRefreshToken(data.refreshToken)');
  const redirect = source.indexOf("redirectToAppRoute('/home')");
  assert.ok(tokenWrite > 0 && secureWrite > tokenWrite && redirect > secureWrite);
  assert.equal(source.includes('await setNativeRefreshToken(data.refreshToken)'), false);
});

test('simultaneous expired requests rotate once and persist replacement credentials', async () => {
  let calls = 0;
  const app = harness(async () => {
    calls++;
    await new Promise(resolve => setTimeout(resolve, 5));
    return { ok: true, status: 200, json: async () => ({ token: 'new-access', refreshToken: 'new-refresh' }) };
  });
  const results = await Promise.all(Array.from({length:20}, () => app.refresh()));
  assert.equal(calls, 1);
  assert.ok(results.every(result => result === 'refreshed'));
  assert.equal(app.values.get('token'), 'new-access');
  assert.equal(app.token(), 'new-refresh');
  assert.equal(await app.refresh(), 'refreshed');
  assert.equal(calls, 1);
});

test('network failure and backend outage preserve credentials and permit retry', async () => {
  for (const fetch of [async () => { throw Error('offline'); }, async () => ({ok:false,status:503})]) {
    const app = harness(fetch);
    assert.equal(await app.refresh(), 'unavailable');
    assert.equal(app.values.get('token'), 'expired-access');
    assert.equal(app.token(), 'valid-refresh');
    assert.equal(await app.refresh(), 'unavailable');
  }
});

test('server-rejected refresh is distinguished from temporary failure', async () => {
  const app = harness(async () => ({ok:false,status:401}));
  assert.equal(await app.refresh(), 'invalid');
});

test('explicit logout during refresh cannot resurrect the access session', async () => {
  let resolve;
  let started;
  const fetching = new Promise(r => { started = r; });
  const app = harness(() => new Promise(r => { resolve = r; started(); }));
  const pending = app.refresh();
  await fetching;
  app.values.delete('token');
  resolve({ok:true,status:200,json:async () => ({token:'new-access',refreshToken:'new-refresh'})});
  assert.equal(await pending, 'unavailable');
  assert.equal(app.values.has('token'), false);
});

function clientHarness(fetch, native = false) {
  const values = new Map([['token', 'expired-access'], ['user', '{}']]);
  const redirects = [];
  const storage = { getItem: key => values.get(key) || null, setItem: (key,value) => values.set(key,value), removeItem: key => values.delete(key) };
  let refreshToken = 'valid-refresh';
  const secure = {
    getNativeRefreshToken: async () => refreshToken,
    setNativeRefreshToken: async value => { refreshToken = value; },
    clearNativeRefreshToken: async () => { refreshToken = null; },
  };
  const context = {
    exports: {}, require: name => name === './authStorage' ? secure : { Capacitor: { isNativePlatform: () => false } },
    fetch, URL, URLSearchParams, Response, Headers, FormData, console,
    process: { env: {} }, navigator: { userAgent: native ? 'Electron' : 'Chrome' },
    localStorage: storage, sessionStorage: { removeItem() {} },
    window: { location: { origin: native ? 'app://localhost' : 'https://demo.example', hostname: native ? 'localhost' : 'demo.example', port: '', protocol: native ? 'app:' : 'https:', pathname: '/home', replace: path => redirects.push(path) } },
  };
  vm.createContext(context);
  vm.runInContext(ts.transpile(fs.readFileSync('src/app/apiUrl.ts', 'utf8'), {module:ts.ModuleKind.CommonJS}), context);
  return { request: path => context.exports.authenticatedFetch('https://demo.example/api/' + path), values, redirects, refresh: () => refreshToken };
}

for (const native of [false, true]) {
  test(`${native ? 'Electron' : 'web'} concurrent consumers all recover through one refresh`, async () => {
    let rotations = 0;
    const app = clientHarness(async (url, options) => {
      if (url.includes('auth/refresh')) {
        rotations++;
        await new Promise(resolve => setTimeout(resolve, 5));
        return Response.json({token:'new-access',refreshToken:'new-refresh'});
      }
      return options.headers.Authorization === 'Bearer new-access'
        ? Response.json({ok:true}) : Response.json({error:'expired'}, {status:401});
    }, native);
    const responses = await Promise.all(Array.from({length:20}, () => app.request('rows')));
    assert.ok(responses.every(response => response.ok));
    assert.equal(rotations, 1);
    assert.equal(app.redirects.length, 0);
  });
}

test('token-expired 403 refreshes; permission-denied 403 does not log out', async () => {
  let rotations = 0;
  const app = clientHarness(async (url, options) => {
    if (url.includes('auth/refresh')) { rotations++; return Response.json({token:'new-access'}); }
    if (url.includes('forbidden')) return Response.json({error:'Forbidden'}, {status:403});
    return options.headers.Authorization === 'Bearer new-access' ? Response.json({ok:true})
      : Response.json({message:'Token is invalid or expired'}, {status:403});
  });
  assert.equal((await app.request('rows')).status, 200);
  assert.equal((await app.request('forbidden')).status, 403);
  assert.equal(rotations, 1);
  assert.equal(app.values.get('token'), 'new-access');
});

test('transient refresh failure preserves session, but revoked refresh clears it', async () => {
  for (const status of [500, 503, 401]) {
    const app = clientHarness(async url => Response.json({}, {status:url.includes('auth/refresh') ? status : 401}), true);
    await assert.rejects(app.request('rows'));
    assert.equal(app.values.has('token'), status !== 401);
    assert.equal(app.redirects.length, status === 401 ? 1 : 0);
    assert.equal(app.refresh(), status === 401 ? null : 'valid-refresh');
  }
});

test('resource rejection after successful refresh cannot erase valid rotated credentials', async () => {
  const app = clientHarness(async url => url.includes('auth/refresh')
    ? Response.json({token:'new-access',refreshToken:'new-refresh'})
    : Response.json({error:'Unauthorized'}, {status:401}), true);
  await assert.rejects(app.request('rows'));
  assert.equal(app.values.get('token'), 'new-access');
  assert.equal(app.refresh(), 'new-refresh');
  assert.equal(app.redirects.length, 0);
});
