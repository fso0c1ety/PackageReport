import test from 'node:test';
import assert from 'node:assert/strict';
import { applyFilterGroup, matchesCondition, normalizeUserPreferences } from '../server/services/advancedFilterEngine.js';

const rows = [{ id:'1',values:{status:'Open',amount:50,email:'a@ags.com'}},{id:'2',values:{status:'Done',amount:10,email:''}}];
test('advanced filters support text, number and empty operators',()=>{
  assert.equal(matchesCondition(rows[0],{columnId:'status',operator:'contains',value:'pen'}),true);
  assert.equal(matchesCondition(rows[0],{columnId:'amount',operator:'greater_than',value:20}),true);
  assert.equal(matchesCondition(rows[1],{columnId:'email',operator:'is_empty'}),true);
});
test('nested AND and OR filter groups stay deterministic',()=>{
  const result=applyFilterGroup(rows,{mode:'AND',items:[{columnId:'amount',operator:'greater_than',value:20},{mode:'OR',items:[{columnId:'status',operator:'equals',value:'Open'},{columnId:'status',operator:'equals',value:'Waiting'}]}]});
  assert.deepEqual(result.map((row)=>row.id),['1']);
});
test('user preferences normalize every persistent board option',()=>{
  const prefs=normalizeUserPreferences({hiddenColumns:['a','a'],selectedView:'kanban',density:'compact',columnWidths:{a:220}});
  assert.deepEqual(prefs.hiddenColumns,['a']); assert.equal(prefs.selectedView,'kanban'); assert.equal(prefs.columnWidths.a,220);
});
