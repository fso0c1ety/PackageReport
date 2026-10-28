// Per-mounted-board cache. No module-global user data or persisted responses.
function createTaskPager({ identity, fetchPage, onChange, onDiagnostic = (..._args) => {}, pendingValues = () => new Map(), pendingRows = () => [], isHidden = () => false }) {
  const pageSize = 100;
  let scopes = new Map(), revision = null, disposed = false, generation = 0;
  let controller = null, dirty = false, queue = Promise.resolve();
  const requests = new Map();
  const visibilityWaiters = new Set();
  const desiredScopes = new Map();
  const canonical = value => Array.isArray(value) ? value.map(canonical)
    : value && typeof value==='object' ? Object.fromEntries(Object.keys(value).sort().map(key=>[key,canonical(value[key])])) : value;
  const keyFor = params => JSON.stringify([identity.userId,identity.workspaceId,identity.tableId,canonical(params)]);
  const sortRows = (a,b) => {
    const x = a.values?.order == null ? null : Number(a.values.order);
    const y = b.values?.order == null ? null : Number(b.values.order);
    if (x !== y) { if(x===null)return -1;if(y===null)return 1;return x-y; }
    return String(b.created_at||'').localeCompare(String(a.created_at||'')) || String(a.id).localeCompare(String(b.id));
  };
  function snapshot() {
    const entities = new Map();
    for(const scope of scopes.values()) for(const row of scope.rows) entities.set(row.id,row);
    const confirmedCount=entities.size;
    // Only pending creates are retained outside server-confirmed page IDs.
    for(const row of pendingRows()) if(!entities.has(row.id))entities.set(row.id,row);
    const rows = [...entities.values()].map(row => {
      const values = {...row.values};
      for(const [key,pending] of pendingValues()) {
        if(key.startsWith(row.id+':')) values[key.slice(row.id.length+1)] = pending.value;
      }
      return {...row,values};
    }).sort(sortRows);
    const global = [...scopes.values()].find(scope => scope.params.statusValue === undefined);
    return {rows,revision,dirty,complete:!dirty&&Boolean(global)&&confirmedCount===global.total,global,total:global?.total||0,statusCounts:global?.statusCounts||{},scopes};
  }
  function publish() { if(!disposed)onChange(snapshot()); }
  function cancel() { generation++;controller?.abort();controller=null; }
  function waitForVisible() {
    if (disposed || !isHidden()) return Promise.resolve();
    return new Promise(resolve => visibilityWaiters.add(resolve));
  }
  function resume() {
    for (const resolve of visibilityWaiters) resolve();
    visibilityWaiters.clear();
  }
  function revoke() { cancel();scopes=new Map();revision=null;dirty=false;onChange({rows:[],revision:null,total:0,statusCounts:{},scopes,revoked:true}); }
  async function read(params,offset,expected,signal,trigger='load') {
    const requestId = `${generation}:${Date.now()}:${Math.random().toString(36).slice(2,7)}`;
    const startedAt = Date.now();
    const request = { requestId, trigger, params: canonical(params), offset, limit: pageSize, revision: expected || null, generation, cacheKey: keyFor(params) };
    onDiagnostic({ type:'request-start', ...request });
    try {
      const response = await fetchPage({...params,limit:pageSize,offset,includeCounts:expected ? '0' : '1',...(expected?{revision:expected}: {})},signal);
      onDiagnostic({ type:'request-response', ...request, status: response.status, elapsedMs: Date.now()-startedAt });
      if(signal.aborted || disposed)throw Object.assign(new Error('Obsolete request'),{name:'AbortError'});
      if([401,403,404].includes(response.status)) {revoke();throw Object.assign(new Error('Access lost'),{name:'AccessError'});}
      if(response.status===409)throw Object.assign(new Error('Revision changed'),{name:'RevisionError'});
      if(!response.ok)throw new Error(`Task page failed (${response.status})`);
      const data = await response.json();
      if(signal.aborted || disposed)throw Object.assign(new Error('Obsolete response'),{name:'AbortError'});
      // The deployed legacy API predates consistent pagination and has no
      // revision field. Accept that contract only for the initial/legacy
      // traversal; never invent a revision or treat a revision-bound page as
      // valid without one.
      const legacy = data.revision == null && !expected;
      if((!legacy && !data.revision) || !Array.isArray(data.rows) || (expected && data.revision!==expected))throw new Error('Invalid task page');
      if(data.rows.length>pageSize || (data.hasMore && !data.rows.length))throw new Error('Non-progressing task page');
      onDiagnostic({ type:'request-complete', ...request, elapsedMs: Date.now()-startedAt, rows:data.rows.length, nextRevision:data.revision });
      return legacy ? {...data, legacy: true} : data;
    } catch (error) {
      onDiagnostic({ type:'request-end', ...request, outcome:error.name || 'Error', elapsedMs: Date.now()-startedAt });
      throw error;
    }
  }
  async function rebuild(extra) {
    // Two complete attempts total. Never publish a partially collected scope.
    const targets = [...desiredScopes.entries()].map(([key,params])=>({params,target:Math.max(scopes.get(key)?.rows.length||0,pageSize)}));
    if(extra&&!targets.some(item=>keyFor(item.params)===keyFor(extra)))targets.push({params:extra,target:pageSize});
    if(!targets.length)return;
    for(let attempt=0;attempt<2;attempt++) {
      const mine = generation, abort = new AbortController();controller=abort;
      const drafts = new Map();let expected = null;
      try {
        for(const target of targets) {
          const global=[...drafts.values()].find(scope=>scope.params.statusValue===undefined&&scope.params.statusColumnId===target.params.statusColumnId);
          if(global&&target.params.statusValue!==undefined) {
            const prefix=global.rows.filter(row=>String(row.values?.[target.params.statusColumnId]??'')===target.params.statusValue);
            const total=global.statusCounts?.[target.params.statusValue]||0;
            const needed=Math.min(total,target.target);
            if(prefix.length>=needed) {
              const rows=prefix.slice(0,needed);
              drafts.set(keyFor(target.params),{params:target.params,rows,total,hasMore:rows.length<total,revision:expected});
              continue;
            }
          }
          let rows=[],data;
          do {
            data=await read(target.params,rows.length,expected,abort.signal,'rebuild');
            expected=data.revision;
            rows.push(...data.rows);
          } while(data.hasMore && rows.length<target.target);
          if(new Set(rows.map(row=>row.id)).size!==rows.length)throw new Error('Duplicate snapshot IDs');
          drafts.set(keyFor(target.params),{params:target.params,...data,rows});
        }
        if(mine!==generation||disposed)throw Object.assign(new Error('Obsolete snapshot'),{name:'AbortError'});
        scopes=drafts;revision=expected;dirty=false;publish();return;
      } catch(error) {
        if(error.name!=='RevisionError'||attempt===1)throw error;
      } finally { if(controller===abort)controller=null; }
    }
  }
  function enqueue(key,task) {
    if(disposed)return Promise.resolve();
    if(requests.has(key))return requests.get(key);
    const result=queue.catch(()=>{}).then(task);
    requests.set(key,result);queue=result;
    result.finally(()=>{if(requests.get(key)===result)requests.delete(key);}).catch(()=>{});
    return result;
  }
  async function load(params={},more=false) {
    params=canonical(params);
    const key=keyFor(params);
    desiredScopes.set(key,params);
    return enqueue(key,async()=>{
      if(disposed||isHidden())return false;
      if(dirty) {await rebuild(params);return true;}
      let previous=scopes.get(key);
      if(previous&&params.statusValue===undefined&&snapshot().complete) {
        const known=new Map();for(const scope of scopes.values())for(const row of scope.rows)known.set(row.id,row);
        previous={...previous,rows:[...known.values()].sort(sortRows),hasMore:false};scopes.set(key,previous);
      }
      // A global ordered prefix contains a contiguous prefix of each status.
      if(!previous && params.statusValue!==undefined) {
        const global=[...scopes.values()].find(scope=>scope.params.statusValue===undefined && scope.params.statusColumnId===params.statusColumnId);
        if(global) {
          const rows=global.rows.filter(row=>String(row.values?.[params.statusColumnId]??'')===params.statusValue);
          previous={params,rows,total:global.statusCounts?.[params.statusValue]||0,hasMore:rows.length<(global.statusCounts?.[params.statusValue]||0),revision};
          scopes.set(key,previous);
        }
      }
      if(previous && (!more || !previous.hasMore))return false;
      const mine=generation,abort=new AbortController();controller=abort;
      try {
        const data=await read(params,previous?.rows.length||0,revision,abort.signal,more ? 'load-more' : 'load');
        if(mine!==generation)return;
        const rows=[...(previous?.rows||[]),...data.rows];
        if(new Set(rows.map(row=>row.id)).size!==rows.length)throw new Error('Duplicate page IDs');
        scopes.set(key,{...previous,params,...data,rows});revision=data.revision;publish();return true;
      } catch(error) {
        if(error.name==='RevisionError') {dirty=true;await rebuild(params);}
        else throw error;
      } finally {if(controller===abort)controller=null;}
    });
  }
  /** @param {{onProgress?: (snapshot: any) => void}} options */
  async function loadAll(params = {}, { onProgress = () => {} } = {}) {
    let retries = 0;
    let zeroProgress = 0;
    while (!disposed) {
      if (isHidden()) {
        await waitForVisible();
        continue;
      }
      const current = snapshot().global;
      if (!current) {
        const progressed = await load(params, false);
        if (!progressed) {
          if (isHidden()) continue;
          zeroProgress += 1;
          if (zeroProgress > 3) throw new Error('Non-progressing task page');
          await new Promise(resolve => setTimeout(resolve, 250 * (2 ** (zeroProgress - 1))));
          continue;
        }
        zeroProgress = 0;
        retries = 0;
        onProgress(snapshot());
        continue;
      }
      if (!current.hasMore) return snapshot();
      try {
        const progressed = await load(params, true);
        if (!progressed) {
          if (isHidden()) continue;
          zeroProgress += 1;
          if (zeroProgress > 3) throw new Error('Non-progressing task page');
          await new Promise(resolve => setTimeout(resolve, 250 * (2 ** (zeroProgress - 1))));
          continue;
        }
        zeroProgress = 0;
        retries = 0;
        onProgress(snapshot());
      } catch (error) {
        if (error.name === 'AbortError' || error.name === 'AccessError') throw error;
        if (retries >= 3) throw error;
        await new Promise(resolve => setTimeout(resolve, 250 * (2 ** retries)));
        retries += 1;
      }
    }
    return snapshot();
  }
  return {
    identity: Object.freeze({...identity}), load, loadAll, snapshot, revoke, resume,
    reconcile() {cancel();dirty=true;return enqueue('reconcile',async()=>{if(!disposed&&!isHidden())await rebuild();});},
    invalidate() {cancel();dirty=true;},
    remove(id) {cancel();dirty=true;for(const scope of scopes.values())scope.rows=scope.rows.filter(row=>row.id!==id);publish();},
    update(row) {
      cancel();dirty=true;
      for(const scope of scopes.values()) {
        const matches=scope.params.statusValue===undefined||String(row.values?.[scope.params.statusColumnId]??'')===scope.params.statusValue;
        const existed=scope.rows.some(item=>item.id===row.id);
        scope.rows=scope.rows.filter(item=>item.id!==row.id);
        if(matches && (existed||!scope.hasMore||!scope.rows.length||sortRows(row,scope.rows[scope.rows.length-1])<=0))scope.rows.push(row);
        scope.rows.sort(sortRows);
      }
      publish();
    },
    dispose() {disposed=true;cancel();resume();scopes.clear();requests.clear();desiredScopes.clear();},
  };
}

// Subscription lifecycle independent of polling ticks. Recovery is serialized
// by the pager; repeated SUBSCRIBED callbacks do not create new requests.
function createRecoveryLifecycle({ pager, visible = () => true, onError = (_error) => {}, schedule = setTimeout, unschedule = clearTimeout }) {
  let interrupted=false,needed=false,active=true,pending=null,timer=null,attempts=0,healthy=false,everHealthy=false;
  function recover() {
    if(!active||!needed||!visible()||pending)return pending;
    needed=false;
    let failed=false;
    pending=Promise.resolve().then(()=>pager.reconcile()).catch(error=>{
      if(error.name==='AbortError')needed=true;
      else if(error.name!=='AccessError'){failed=true;needed=true;onError(error);}
    }).finally(()=>{pending=null;if(active&&needed&&healthy&&visible()&&!failed)void recover();});
    return pending;
  }
  function fallback() {
    if(timer||attempts>=3||!active||healthy)return;
    timer=schedule(()=>{timer=null;attempts++;needed=true;void Promise.resolve(recover()).finally(fallback);},15000*Math.pow(2,attempts));
  }
  return {
    status(status) {
      if(!active)return;
      if(['CHANNEL_ERROR','TIMED_OUT','CLOSED'].includes(status)) {
        if(healthy||pending)pager.invalidate();
        // An initial channel failure is not evidence that an established
        // realtime stream was interrupted. The initial HTTP snapshot remains
        // authoritative; start bounded recovery only after one subscription
        // has actually been established.
        healthy=false;
        if(everHealthy){ interrupted=true;needed=true;fallback(); }
      } else if(status==='SUBSCRIBED') {
        healthy=true;everHealthy=true;if(timer)unschedule(timer);timer=null;attempts=0;
        if(interrupted){interrupted=false;needed=true;void recover();}
      }
    },
    resume(){if(needed)void recover();},
    retry(){needed=true;return recover();},
    dispose(){active=false;if(timer)unschedule(timer);pager.invalidate();},
  };
}
module.exports={createTaskPager,createRecoveryLifecycle};
