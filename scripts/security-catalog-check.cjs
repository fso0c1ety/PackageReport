const assert = require('node:assert/strict');
const fs = require('node:fs');
const crypto = require('node:crypto');
const { Client } = require('pg');

async function inspect(client, backend, phase) {
  assert.ok(['before', 'after'].includes(phase), 'phase must be before or after');
  assert.ok(backend, 'explicit backend role required');
  const sql = fs.readFileSync('server/db/migrations/048_server_only_sensitive_rls.sql', 'utf8');
  assert.equal(crypto.createHash('sha256').update(sql.replace(/\r\n/g, '\n')).digest('hex'), 'fc3da9f13f6dea3d7d8d96d231b6af78bc6db464666541df82460e6f0a7c14ba');
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
    const fingerprint=crypto.createHash('sha256').update(JSON.stringify(tables)).digest('hex');
    return {phase,tables,permissions,roles,dependencies,fingerprint,limitations:['Catalog dependencies require review; dynamic SQL dependencies may be absent.','Backend grants do not prove application workflow or live runtime identity.','Fingerprint requires comparison with independently approved baseline.']};
  } finally {await client.query('ROLLBACK');}
}
module.exports={inspect};
if(require.main===module){
  const client=new Client(process.env.DATABASE_URL ? {connectionString:process.env.DATABASE_URL} : {});
  client.connect().then(()=>inspect(client,process.env.EXPECTED_BACKEND_ROLE,process.argv[2])).then(result=>console.log(JSON.stringify(result,null,2))).catch(error=>{console.error(error.message);process.exitCode=1;}).finally(()=>client.end());
}
