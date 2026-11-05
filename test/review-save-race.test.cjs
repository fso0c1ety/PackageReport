const {test}=require('node:test');
const assert=require('node:assert/strict');
const {mergeReviewSaveResult}=require('../src/app/board/reviewSaveState.cjs');
test('late create-save acknowledgements cannot erase the next typed title',()=>{
  const saved={id:'task',values:{name:'created',status:'Done'}};
  const typing={id:'task',values:{name:'edited',status:'Done'}};
  const first=mergeReviewSaveResult(typing,saved,'name','created');
  const duplicate=mergeReviewSaveResult(first,saved,'name','created');
  assert.equal(duplicate.values.name,'edited');
  assert.equal(duplicate.values.status,'Done');
  const committed={id:'task',values:{name:'edited',status:'Done'}};
  assert.equal(mergeReviewSaveResult(duplicate,committed,'name','edited'),committed);
});
test('save acknowledgements never carry a draft into another task',()=>{
  const saved={id:'other',values:{name:'server'}};
  assert.equal(mergeReviewSaveResult({id:'task',values:{name:'draft'}},saved,'name','previous'),saved);
});
