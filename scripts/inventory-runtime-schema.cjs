const fs=require('node:fs'),path=require('node:path');
const findings=[];
function walk(dir){for(const entry of fs.readdirSync(dir,{withFileTypes:true})){const file=path.join(dir,entry.name);if(entry.isDirectory())walk(file);else if(/\.(?:cjs|mjs|js|ts|tsx)$/.test(file)){
  fs.readFileSync(file,'utf8').split(/\r?\n/).forEach((line,index)=>{
    const kind=/\b(?:CREATE\s+(?:UNIQUE\s+)?(?:TABLE|INDEX)|ALTER\s+TABLE)\b/i.test(line)?'DDL_CANDIDATE':/\b(?:to_regclass|information_schema|pg_attribute|pg_class)\b/i.test(line)?'METADATA_CANDIDATE':null;
    if(kind)findings.push({file:file.replaceAll('\\','/'),line:index+1,kind});
  });
}}}
for(const root of ['src/app/api','server/routes','server/services','server/middleware','server/repositories'])if(fs.existsSync(root))walk(root);
fs.mkdirSync('artifacts/runtime-schema-inventory',{recursive:true});
fs.writeFileSync('artifacts/runtime-schema-inventory/inventory.json',JSON.stringify({classification:'STATIC_CANDIDATES_NOT_EXECUTION_COUNTS',scope:'API and server routes/services/middleware/repositories; excludes migrations, startup scripts and transitive dependency proof',findings,fullyEliminated:false},null,2));
console.log(JSON.stringify({ddlCandidateLines:findings.filter(f=>f.kind==='DDL_CANDIDATE').length,metadataCandidateLines:findings.filter(f=>f.kind==='METADATA_CANDIDATE').length}));
