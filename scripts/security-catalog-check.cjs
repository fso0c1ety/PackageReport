const assert = require('node:assert/strict');
const fs = require('node:fs');
const crypto = require('node:crypto');
const { Client } = require('pg');

async function inspect(client, backend, phase) {
  assert.ok(['before', 'after'].includes(phase), 'phase must be before or after');
  assert.ok(backend, 'explicit backend role required');
  const sql = fs.readFileSync('server/db/migrations/048_server_only_sensitive_rls.sql', 'utf8');
  // Repository blobs use LF; the previously approved Windows byte hash used CRLF.
  assert.equal(crypto.createHash('sha256').update(sql.replace(/\r\n/g, '\n')).digest('hex'), 'ce15210c3d4165230d1909e73994738ddbbb1fd04fd12e2b23252ff3ca6e24d1');
  const names = [...sql.match(/required_tables text\[\] := ARRAY\[([\s\S]*?)\];/)[1].matchAll(/'([^']+)'/g)].map(x => x[1]);
  assert.equal(new Set(names).size, 29);
  await client.query('BEGIN READ ONLY');
  try {
    await client.query("SET LOCAL statement_timeout='30s'");
    const tables = (await client.query(`SELECT c.oid,c.relname,c.relkind,c.relrowsecurity,pg_get_userbyid(c.relowner) AS owner,
      (SELECT jsonb_agg(jsonb_build_object('name',a.attname,'type',format_type(a.atttypid,a.atttypmod),'required',a.attnotnull) ORDER BY a.attnum) FROM pg_attribute a WHERE a.attrelid=c.oid AND a.attnum>0 AND NOT a.attisdropped) AS columns,
      (SELECT jsonb_agg(pg_get_constraintdef(k.oid) ORDER BY k.conname) FROM pg_constraint k WHERE k.conrelid=c.oid) AS constraints,
      (SELECT jsonb_agg(jsonb_build_object('grantee',a.grantee,'privilege',a.privilege_type)) FROM aclexplode(coalesce(c.relacl,acldefault('r',c.relowner))) a) AS acl
      FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' AND c.relname=ANY($1) ORDER BY c.relname`, [names])).rows;
    assert.equal(tables.length,29);
    const permissions=[];
    for(const table of tables){
      assert.ok(['r','p'].includes(table.relkind));
      if(phase==='after') assert.equal(table.relrowsecurity,true,table.relname);
      for(const role of ['anon','authenticated',backend]) for(const privilege of ['SELECT','INSERT','UPDATE','DELETE']) {
        const allowed=(await client.query('SELECT has_table_privilege($1,$2::oid,$3) AS allowed',[role,table.oid,privilege])).rows[0].allowed;
        permissions.push({table:table.relname,role,privilege,allowed});
        if(role===backend) assert.equal(allowed,true,`${role} ${table.relname} ${privilege}`);
        else if(phase==='after') assert.equal(allowed,false,`${role} ${table.relname} ${privilege}`);
      }
      if(phase==='after') assert.equal(table.acl.some(a=>a.grantee===0 && ['SELECT','INSERT','UPDATE','DELETE'].includes(a.privilege)),false);
    }
    const dependencies=(await client.query(`SELECT DISTINCT d.classid::regclass::text AS catalog,d.objid::text,d.deptype FROM pg_depend d WHERE d.refobjid=ANY($1::oid[]) ORDER BY 1,2,3`,[tables.map(t=>t.oid)])).rows;
    const roles=(await client.query('SELECT rolname,rolsuper,rolbypassrls FROM pg_roles WHERE rolname=ANY($1)',[['anon','authenticated',backend]])).rows;
    assert.equal(roles.length,3,'three distinct existing roles required');
    const functions=(await client.query(`SELECT n.nspname,p.proname,pg_get_function_identity_arguments(p.oid) AS arguments,p.prosecdef,pg_get_userbyid(p.proowner) AS owner,p.proconfig,md5(pg_get_functiondef(p.oid)) AS definition_hash FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='public' AND p.prokind='f' ORDER BY 1,2,3`)).rows;
    const views=(await client.query(`SELECT schemaname,viewname,definition FROM pg_views WHERE schemaname='public' ORDER BY viewname`)).rows;
    const memberships=(await client.query(`SELECT pg_get_userbyid(roleid) AS granted_role,pg_get_userbyid(member) AS member,admin_option FROM pg_auth_members ORDER BY 1,2`)).rows;
    const stable=tables.map(({relname,relkind,columns,constraints})=>({relname,relkind,columns,constraints}));
    const fingerprint=crypto.createHash('sha256').update(JSON.stringify(stable)).digest('hex');
    return {phase,tables,permissions,roles,dependencies,functions,views,memberships,fingerprint,limitations:['Catalog dependencies require review; dynamic SQL dependencies may be absent.','Backend grants do not prove application workflow or live runtime identity.','Fingerprint excludes OIDs, ACLs and RLS; compare with independently approved baseline.']};
  } finally {await client.query('ROLLBACK');}
}
module.exports={inspect};
if(require.main===module){
  const client=new Client(process.env.DATABASE_URL ? {connectionString:process.env.DATABASE_URL} : {});
  client.connect().then(()=>inspect(client,process.env.EXPECTED_BACKEND_ROLE,process.argv[2])).then(result=>console.log(JSON.stringify(result,null,2))).catch(error=>{console.error(error.message);process.exitCode=1;}).finally(()=>client.end());
}
