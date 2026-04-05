import { Capacitor, CapacitorHttp } from "@capacitor/core";

const NATIVE_PRODUCTION_FALLBACK_URL = "https://package-report.vercel.app";

// Default to same-origin on web, but provide a safe hosted fallback for Capacitor builds.
export const DEFAULT_FRONTEND_URL =
  process.env.NEXT_PUBLIC_FRONTEND_URL || "";

export function isElectronRuntime(): boolean {
  if (typeof window === 'undefined') {
    return false;
  }
  return /electron/i.test(navigator.userAgent);
}

export function isNativeStaticRuntime() {
  if (typeof window === 'undefined') {
    return false;
  }

  if (isElectronRuntime()) {
    return true;
  }

  const capacitor = (window as typeof window & {
    Capacitor?: { isNativePlatform?: () => boolean };
  }).Capacitor;

  return capacitor?.isNativePlatform?.() === true;
}

export function getAppRoute(path: string) {
  const trimmed = path.trim();
  if (!trimmed) {
    return '/';
  }

  const match = trimmed.match(/^([^?#]*)(.*)$/);
  const rawPath = match?.[1] || trimmed;
  const suffix = match?.[2] || '';
  const normalizedPath = rawPath.startsWith('/') ? rawPath : `/${rawPath}`;

  if (isNativeStaticRuntime() && normalizedPath !== '/' && !normalizedPath.endsWith('.html')) {
    return `${normalizedPath}.html${suffix}`;
  }

  return `${normalizedPath}${suffix}`;
}

export function redirectToAppRoute(path: string, replace = true) {
  if (typeof window === 'undefined') {
    return;
  }

  const target = getAppRoute(path);

  if (replace) {
    window.location.replace(target);
  } else {
    window.location.assign(target);
  }
}

type AppRouterLike = {
  push?: (href: string, options?: { scroll?: boolean }) => void;
  replace?: (href: string, options?: { scroll?: boolean }) => void;
};

let nativeHistoryRoutingPatched = false;
let nativeAnchorRoutingPatched = false;

export function getAppHref(path: string) {
  if (!path || path === '#') {
    return path;
  }

  return getAppRoute(path);
}

function getComparableAppPath(path: string) {
  const href = getAppHref(path);
  const match = href.match(/^([^?#]*)(.*)$/);
  const pathname = match?.[1] || href;
  return (pathname || '/').replace(/\.html$/i, '') || '/';
}

export function navigateToAppRoute(
  path: string,
  router?: AppRouterLike,
  replace = false,
  options?: { scroll?: boolean },
) {
  if (isNativeStaticRuntime()) {
    if (typeof window !== 'undefined') {
      const currentPath = (window.location.pathname || '/').replace(/\.html$/i, '') || '/';
      const targetPath = getComparableAppPath(path);
      const targetHref = getAppHref(path);

      // In native packaged apps, changing only query params on the same page
      // should not force a full reload. Use history state instead.
      if (currentPath === targetPath) {
        if (replace) {
          window.history.replaceState(window.history.state, '', targetHref);
        } else {
          window.history.pushState(window.history.state, '', targetHref);
        }
        return;
      }
    }

    redirectToAppRoute(path, replace);
    return;
  }

  if (!router) {
    redirectToAppRoute(path, replace);
    return;
  }

  if (replace) {
    router.replace?.(path, options);
  } else {
    router.push?.(path, options);
  }
}

function normalizeHistoryUrl(url: string | URL | null | undefined) {
  if (!url || typeof url !== 'string') {
    return url;
  }

  if (
    url.startsWith('#') ||
    /^([a-z][a-z\d+\-.]*:)?\/\//i.test(url) ||
    url.startsWith('/api') ||
    url.startsWith('/_next')
  ) {
    return url;
  }

  return getAppRoute(url);
}

export function ensureNativeHistoryRouting() {
  if (
    typeof window === 'undefined' ||
    !isNativeStaticRuntime()
  ) {
    return;
  }

  if (!nativeHistoryRoutingPatched) {
    nativeHistoryRoutingPatched = true;

    const originalPushState = window.history.pushState.bind(window.history);
    const originalReplaceState = window.history.replaceState.bind(window.history);

    window.history.pushState = function pushState(data, unused, url) {
      return originalPushState(data, unused, normalizeHistoryUrl(url));
    };

    window.history.replaceState = function replaceState(data, unused, url) {
      return originalReplaceState(data, unused, normalizeHistoryUrl(url));
    };
  }

  if (!nativeAnchorRoutingPatched && typeof document !== 'undefined') {
    nativeAnchorRoutingPatched = true;

    document.addEventListener('click', (event) => {
      if (event.defaultPrevented) {
        return;
      }

      const mouseEvent = event as MouseEvent;
      if (mouseEvent.button !== 0 || mouseEvent.metaKey || mouseEvent.ctrlKey || mouseEvent.shiftKey || mouseEvent.altKey) {
        return;
      }

      const target = event.target;
      if (!(target instanceof Element)) {
        return;
      }

      const anchor = target.closest('a[href]') as HTMLAnchorElement | null;
      if (!anchor) {
        return;
      }

      const href = anchor.getAttribute('href') || '';
      if (!href || href.startsWith('#') || anchor.target === '_blank' || anchor.hasAttribute('download')) {
        return;
      }

      if (/^([a-z][a-z\d+\-.]*:)?\/\//i.test(href) && !href.startsWith(window.location.origin)) {
        return;
      }

      if (href.startsWith('/api') || href.startsWith('/_next')) {
        return;
      }

      event.preventDefault();
      window.location.assign(getAppHref(href));
    }, true);
  }
}

export const DEFAULT_SERVER_URL =
  process.env.NEXT_PUBLIC_API_URL || "";

export const DEFAULT_ASSET_URL =
  process.env.NEXT_PUBLIC_ASSET_URL || "";

export const DEFAULT_SUPABASE_URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL || "";

export const DEFAULT_SUPABASE_STORAGE_BUCKET =
  process.env.NEXT_PUBLIC_SUPABASE_STORAGE_BUCKET || "uploads";

export const DEFAULT_SOCKET_URL =
  process.env.NEXT_PUBLIC_SOCKET_URL || "";

function normalizeBaseUrl(url: string) {
  const trimmed = url.trim();

  if (!trimmed) {
    return trimmed;
  }

  const withProtocol = /^[a-z][a-z\d+\-.]*:\/\//i.test(trimmed)
    ? trimmed
    : `https://${trimmed}`;

  return withProtocol.endsWith('/') ? withProtocol.slice(0, -1) : withProtocol;
}

function getBrowserOrigin() {
  return typeof window !== 'undefined' ? window.location.origin : '';
}

function ensureTrailingSlash(pathname: string) {
  if (!pathname || pathname === '/') {
    return '/';
  }

  return pathname.endsWith('/') ? pathname : `${pathname}/`;
}

function normalizeApiPath(path: string) {
  const trimmed = path.trim();
  if (!trimmed) {
    return '/';
  }

  const match = trimmed.match(/^([^?#]*)(.*)$/);
  const rawPath = match?.[1] || trimmed;
  const suffix = match?.[2] || '';
  const normalizedPath = rawPath.startsWith('/') ? rawPath : `/${rawPath}`;

  return `${ensureTrailingSlash(normalizedPath)}${suffix}`;
}

function shouldUseElectronApiProxy(requestUrl: string) {
  if (typeof window === 'undefined' || !isElectronRuntime()) {
    return false;
  }

  if (!/^https?:\/\//i.test(requestUrl)) {
    return false;
  }

  try {
    const parsed = new URL(requestUrl);
    const serverOrigin = new URL(getServerUrl()).origin;
    const fallbackOrigin = new URL(NATIVE_PRODUCTION_FALLBACK_URL).origin;
    return parsed.origin === serverOrigin || parsed.origin === fallbackOrigin;
  } catch {
    return false;
  }
}

function toElectronProxyUrl(requestUrl: string) {
  try {
    const parsed = new URL(requestUrl);
    return `${getBrowserOrigin()}${parsed.pathname}${parsed.search}`;
  } catch {
    return requestUrl;
  }
}

function normalizeRequestUrl(url: string) {
  const trimmed = url.trim();
  if (!trimmed) {
    return trimmed;
  }

  if (/^[a-z][a-z\d+\-.]*:\/\//i.test(trimmed)) {
    try {
      const parsed = new URL(trimmed);
      if (parsed.pathname === '/api' || parsed.pathname.startsWith('/api/')) {
        parsed.pathname = ensureTrailingSlash(parsed.pathname);
      }

      const normalizedUrl = parsed.toString();
      return normalizedUrl;
    } catch {
      return trimmed;
    }
  }

  const apiMatch = trimmed.match(/^\/?api(?=\/|$|\?|#)(.*)$/i);
  if (apiMatch) {
    return normalizeRequestUrl(getApiUrl(apiMatch[1] || '/'));
  }

  return trimmed;
}

async function nativeHttpRequest(
  requestUrl: string,
  requestOptions: RequestInit,
  headers: Record<string, string>,
) {
  const method = (requestOptions.method || 'GET').toUpperCase();
  const rawBody = requestOptions.body;
  let data: any;

  if (typeof rawBody === 'string') {
    if ((headers['Content-Type'] || headers['content-type'] || '').includes('application/json')) {
      try {
        data = JSON.parse(rawBody);
      } catch {
        data = rawBody;
      }
    } else {
      data = rawBody;
    }
  } else if (typeof URLSearchParams !== 'undefined' && rawBody instanceof URLSearchParams) {
    data = rawBody.toString();
  }

  const nativeResponse = await CapacitorHttp.request({
    url: requestUrl,
    method,
    headers,
    data,
    responseType: 'text',
    connectTimeout: 30000,
    readTimeout: 30000,
  });

  const responseHeaders = new Headers(nativeResponse.headers || {});
  const responseBody =
    typeof nativeResponse.data === 'string'
      ? nativeResponse.data
      : JSON.stringify(nativeResponse.data ?? '');

  return new Response(responseBody, {
    status: nativeResponse.status,
    headers: responseHeaders,
  });
}

function resolveSupabaseStorageUrl(path: string) {
  const supabaseBase = normalizeBaseUrl(DEFAULT_SUPABASE_URL);
  if (!supabaseBase) {
    return '';
  }

  const cleanPath = path.startsWith('/') ? path.slice(1) : path;
  if (!cleanPath.startsWith('uploads/')) {
    return '';
  }

  const objectPath = cleanPath.replace(/^uploads\//, '');
  if (!objectPath) {
    return '';
  }

  return `${supabaseBase}/storage/v1/object/public/${DEFAULT_SUPABASE_STORAGE_BUCKET}/${objectPath}`;
}

function isPrivateDevHost(hostname: string) {
  const host = hostname.toLowerCase();
  if (host === 'localhost' || host === '127.0.0.1' || host === '::1') {
    return true;
  }

  // Match common private network ranges for LAN testing.
  if (/^192\.168\./.test(host) || /^10\./.test(host)) {
    return true;
  }

  const match172 = host.match(/^172\.(\d{1,3})\./);
  if (match172) {
    const secondOctet = Number(match172[1]);
    return secondOctet >= 16 && secondOctet <= 31;
  }

  return false;
}

function getLocalDevServerUrl() {
  if (typeof window === 'undefined') {
    return '';
  }

  const { protocol, hostname } = window.location;
  if (!isPrivateDevHost(hostname)) {
    return '';
  }

  return `${protocol}//${hostname}:4000`;
}

export function getServerUrl() {
  const configuredServer = normalizeBaseUrl(DEFAULT_SERVER_URL);
  if (configuredServer) {
    return configuredServer;
  }

  // Handle local development access from physical devices (LAN) ONLY on web browsers
  if (typeof window !== 'undefined' && !isNativeStaticRuntime()) {
    const host = window.location.hostname.toLowerCase();
    const port = window.location.port;
    const isLanIp = /^192\.168\./.test(host) || /^10\./.test(host) || /^172\.(1[6-9]|2[0-9]|3[0-1])\./.test(host);
    const isLocalWebDev = (host === 'localhost' || host === '127.0.0.1') && port === '3000';

    if (isLanIp || isLocalWebDev) {
      return `${window.location.protocol}//${host}:4000`;
    }
  }

  // Fall back to production Vercel for all other cases (including Native .exe/.apk)
  const configuredFrontend = normalizeBaseUrl(DEFAULT_FRONTEND_URL);
  const finalUrl = configuredFrontend || NATIVE_PRODUCTION_FALLBACK_URL;
  if (configuredFrontend) return configuredFrontend;

  if (isNativeStaticRuntime()) {
    return NATIVE_PRODUCTION_FALLBACK_URL;
  }

  return getBrowserOrigin() || NATIVE_PRODUCTION_FALLBACK_URL;
}

function isKnownSocketlessHostedOrigin(url: string) {
  try {
    const { hostname } = new URL(url);
    return hostname.endsWith('.vercel.app');
  } catch {
    return false;
  }
}

export function getSocketUrl() {
  const configuredSocket = normalizeBaseUrl(DEFAULT_SOCKET_URL);
  if (configuredSocket) {
    return configuredSocket;
  }

  const localDevSocket = normalizeBaseUrl(getLocalDevServerUrl());
  if (localDevSocket) {
    return localDevSocket;
  }

  const fallbackServer = normalizeBaseUrl(getServerUrl());
  if (!fallbackServer || isKnownSocketlessHostedOrigin(fallbackServer)) {
    return '';
  }

  return fallbackServer;
}

export function getApiUrl(path: string) {
  const cleanPath = normalizeApiPath(path);
  const preferredBase = getServerUrl();

  // Ensure 'base' is an absolute URL.
  // If getServerUrl somehow returns empty, use the production fallback to prevent
  // the app from trying to hit relative routes on the user's device.
  let cleanBase = normalizeBaseUrl(preferredBase || NATIVE_PRODUCTION_FALLBACK_URL);

  // Clean up if the base already includes /api, but prevent duplication logic
  if (cleanBase.endsWith('/api')) {
    cleanBase = cleanBase.slice(0, -4);
  }

  return `${cleanBase}/api${cleanPath}`;
}

/**
 * Resolves an avatar URL consistently across the application.
 * Handles: null/undefined, absolute URLs, Base64 data URLs, and relative local paths.
 */
export function getAvatarUrl(avatar: string | null | undefined, name: string = "User") {
  if (!avatar) {
    return `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=random&color=fff&bold=true`;
  }

  // Handle absolute URLs (http:// or https://)
  if (avatar.startsWith('http://') || avatar.startsWith('https://')) {
    return avatar;
  }

  // Handle Base64 data URLs (data:image/...)
  if (avatar.startsWith('data:')) {
    return avatar;
  }

  const supabaseStorageUrl = resolveSupabaseStorageUrl(avatar);
  if (supabaseStorageUrl) {
    return supabaseStorageUrl;
  }

  const base =
    normalizeBaseUrl(DEFAULT_ASSET_URL) ||
    getServerUrl() ||
    getBrowserOrigin();
  const normalizedPath = avatar.startsWith('/')
    ? avatar
    : avatar.startsWith('uploads/')
      ? `/${avatar}`
      : avatar.includes('/')
        ? `/${avatar}`
        : `/uploads/${avatar}`;

  if (!base) {
    return normalizedPath;
  }

  return `${base}${normalizedPath}`;
}

type AuthenticatedFetchOptions = RequestInit & {
  suppressNativeErrorAlert?: boolean;
  includeAuthToken?: boolean;
  handleAuthErrors?: boolean;
};

export async function authenticatedFetch(url: string, options: AuthenticatedFetchOptions = {}) {
  // Use generic return type or specific if needed
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
  const requestUrl = normalizeRequestUrl(url);
  const {
    suppressNativeErrorAlert = false,
    includeAuthToken = true,
    handleAuthErrors = true,
    ...requestOptions
  } = options;

  const headers = { ...((requestOptions.headers as any) || {}) } as any;

  // Set default Content-Type to application/json if not provided and body is not FormData
  if (!headers['Content-Type'] &&
      !(typeof FormData !== 'undefined' && requestOptions.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
  }

  if (token && includeAuthToken) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  // console.log(`[Fetch] ${requestUrl}`); // Debug

  const canUseNativeHttpFallback =
    typeof window !== 'undefined' &&
    Capacitor.isNativePlatform() &&
    !isElectronRuntime() &&
    /^https?:\/\//i.test(requestUrl) &&
    !(typeof FormData !== 'undefined' && requestOptions.body instanceof FormData);

  const canUseElectronProxyFallback =
    typeof window !== 'undefined' &&
    isElectronRuntime() &&
    shouldUseElectronApiProxy(requestUrl);

  let response;
  try {
    response = await fetch(requestUrl, {
      ...requestOptions,
      headers,
    });
  } catch (err: any) {
    if (!response && canUseElectronProxyFallback) {
      try {
        const proxyUrl = toElectronProxyUrl(requestUrl);
        if (proxyUrl !== requestUrl) {
          response = await fetch(proxyUrl, {
            ...requestOptions,
            headers,
          });
        }
      } catch (electronErr: any) {
        err = electronErr;
      }
    }

    if (!response && canUseNativeHttpFallback) {
      try {
        response = await nativeHttpRequest(requestUrl, requestOptions, headers as Record<string, string>);
      } catch (nativeErr: any) {
        err = nativeErr;
      }
    }

    if (!response) {
      if (typeof window !== 'undefined') {
          const errorMsg = `[Fetch Failed] ${requestUrl}\nError: ${err?.message || 'Unknown error'}`;
          console.error(errorMsg, err);
          if (isNativeStaticRuntime() && !suppressNativeErrorAlert) {
            alert(errorMsg);
          }
      }
      throw err;
    }
  }

  if (handleAuthErrors && (response.status === 401 || response.status === 403)) {
    if (typeof window !== 'undefined' && !window.location.pathname.includes('/login')) {
      localStorage.removeItem('token'); // Clear invalid token
      redirectToAppRoute('/login');
      return new Promise(() => { }) as unknown as Response;
    }
    throw new Error(response.status === 401 ? "Unauthorized" : "Forbidden");
  }

  return response;
}

export function publicFetch(url: string, options: AuthenticatedFetchOptions = {}) {
  return authenticatedFetch(url, {
    ...options,
    includeAuthToken: false,
    handleAuthErrors: false,
  });
}
