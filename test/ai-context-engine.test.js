const test = require("node:test");
const assert = require("node:assert/strict");
const ai = require("../server/services/aiContextEngine.cjs");
test("Phase 17 exposes every AI capability",()=>assert.deepEqual(ai.CAPABILITIES,["summary","email","translate","autofill","reports","expense_analysis","delayed_loads","document_summary","missing_fields","data_cleanup","formula_assistant","automation_assistant"]));
test("AI context excludes rows from hidden boards",()=>{const context=ai.buildWorkspaceContext({workspace:{id:"w",name:"W"},tables:[{id:"a",name:"A",columns:[]}],rows:[{id:"1",table_id:"a",values:{}},{id:"2",table_id:"hidden",values:{secret:true}}]});assert.equal(context.rows.length,1);assert.equal(context.rows[0].id,"1")});
test("missing field analysis is deterministic",()=>{const context=ai.buildWorkspaceContext({tables:[{id:"a",name:"A",columns:[{id:"name",name:"Name",type:"Text"}]}],rows:[{id:"1",table_id:"a",values:{name:""}}]});assert.equal(ai.findMissingFields(context).length,1);assert.equal(ai.buildDeterministicInsight("missing_fields",context).missingFields,1)});
