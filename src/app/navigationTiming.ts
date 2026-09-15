"use client";

const enabled = typeof window !== 'undefined' && window.location.hostname !== 'package-report.vercel.app'
  && new URLSearchParams(window.location.search).get('smperf') === '1';
let start = 0;
let phases: Record<string, number> = {};
let frame = 0;
let planRequested = false;
const ms = () => Math.round((performance.now() - start) * 10) / 10;

export function navigationPhase(name: string) {
  if (enabled && start && phases[name] === undefined) phases[name] = ms();
}

if (enabled) {
  document.addEventListener('pointerdown', (event) => {
    const link = (event.target as Element)?.closest('a');
    if (!link || !new URL(link.href).pathname.startsWith('/workspace')) return;
    cancelAnimationFrame(frame);
    start = performance.now();
    phases = {};
    const observe = () => {
      if (window.location.pathname.startsWith('/workspace')) navigationPhase('route');
      if (document.querySelector('[data-board-header-row]')) navigationPhase('shell');
      if (document.querySelector('[data-row-id]')) navigationPhase('firstDom');
      if (phases.firstDom !== undefined && document.body.innerText.includes('478 items')) {
        navigationPhase('full');
        console.info('[SM_NAV]', JSON.stringify(phases));
        return;
      }
      if (ms() < 30000) frame = requestAnimationFrame(observe);
      else console.info('[SM_NAV_TIMEOUT]', JSON.stringify(phases));
    };
    frame = requestAnimationFrame(observe);
  }, true);
}

export function navigationRequest(url: string, headers: Record<string, string>) {
  if (!enabled) return undefined;
  const parsed = new URL(url, window.location.origin);
  const firstRows = /\/tables\/[^/]+\/tasks\/?$/.test(parsed.pathname) && parsed.searchParams.get('offset') === '0';
  const metadata = /\/tables\/[^/]+\/?$/.test(parsed.pathname);
  if (!firstRows && !metadata) return undefined;
  const kind = firstRows ? 'rows' : 'metadata';
  navigationPhase(`${kind}Request`);
  headers['x-sm-perf'] = '1';
  if (firstRows && !planRequested && new URLSearchParams(window.location.search).get('smplan') === '1') {
    headers['x-sm-query-plan'] = '1';
    planRequested = true;
  }
  const sent = performance.now();
  return (response: Response) => {
    navigationPhase(`${kind}Response`);
    console.info('[SM_API]', JSON.stringify({kind, duration: Math.round(performance.now()-sent), status: response.status,
      serverTiming: response.headers.get('server-timing'), plan: response.headers.get('x-sm-query-plan')}));
  };
}
