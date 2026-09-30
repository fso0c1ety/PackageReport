import { createClient } from '@supabase/supabase-js';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
if (!url || !anonKey) {
  console.error('LOCAL SUPABASE REALTIME -> FAIL (stage=config)');
  process.exit(1);
}

const topic = `portal-acceptance-${Date.now()}-${Math.random().toString(36).slice(2)}`;
const event = 'portal_acceptance_probe';
const listener = createClient(url, anonKey);
const sender = createClient(url, anonKey);
let received = false;
let stage = 'subscribe';

const waitFor = (predicate, timeoutMs) => new Promise((resolve, reject) => {
  const started = Date.now();
  const tick = () => {
    if (predicate()) return resolve();
    if (Date.now() - started >= timeoutMs) return reject(new Error(stage));
    setTimeout(tick, 100);
  };
  tick();
});

const listenerChannel = listener.channel(topic, { config: { broadcast: { self: false } } });
listenerChannel.on('broadcast', { event }, () => { received = true; });
const senderChannel = sender.channel(topic);

try {
  let listenerStatus;
  listenerStatus = await new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error('listener-subscribe-timeout')), 20000);
    listenerChannel.subscribe((status) => {
      if (status === 'SUBSCRIBED') { clearTimeout(timeout); resolve(status); }
      else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') { clearTimeout(timeout); reject(new Error(status)); }
    });
  });
  if (listenerStatus !== 'SUBSCRIBED') throw new Error('listener-subscribe');
  stage = 'sender-subscribe';
  await new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error('sender-subscribe-timeout')), 20000);
    senderChannel.subscribe((status) => {
      if (status === 'SUBSCRIBED') { clearTimeout(timeout); resolve(); }
      else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') { clearTimeout(timeout); reject(new Error(status)); }
    });
  });
  stage = 'broadcast';
  const result = await senderChannel.send({ type: 'broadcast', event, payload: { probe: true } });
  if (result !== 'ok') throw new Error('broadcast-send');
  stage = 'receive';
  await waitFor(() => received, 20000);
  console.log('LOCAL SUPABASE REALTIME -> PASS');
} catch (error) {
  console.error(`LOCAL SUPABASE REALTIME -> FAIL (stage=${stage})`);
  process.exitCode = 1;
} finally {
  await Promise.allSettled([listener.removeChannel(listenerChannel), sender.removeChannel(senderChannel)]);
}
