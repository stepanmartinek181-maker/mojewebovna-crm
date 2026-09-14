import test from 'node:test';
import assert from 'node:assert/strict';
import { changeCloud, readCloud } from './cloud.js';
const lead = id => ({ id, name:id, phone:'',email:'',contact:'',research:'',source:'',note:'',status:'Nevoláno',category:'Jiné',priority:'Střední',archived:false,nextAt:'',updatedAt:'2026-09-14T10:00:00Z',calls:[] });
const doc = ids => ({ version:1,leads:ids.map(lead) });
function fake({row=null, conflict=false,error=null}={}) {
  const state={row,conflict,writes:0};
  return {state,from() {
    let operation='read',value,filters={};
    const query={select(){return query},eq(k,v){filters[k]=v;return query},insert(v){operation='insert';value=v;return query},update(v){operation='update';value=v;return query},async maybeSingle(){
      if(error)return {data:null,error};
      if(operation==='read')return {data:state.row ? structuredClone(state.row):null,error:null};
      state.writes++;
      if(state.conflict){state.conflict=false;state.row={document:doc(['other-device']),revision:2};return {data:null,error:operation==='insert'?{code:'23505'}:null};}
      if(operation==='update' && filters.revision!==state.row.revision)return {data:null,error:null};
      state.row={document:value.document,revision:value.revision};return {data:structuredClone(state.row),error:null};
    }};return query;
  }};
}
test('cloud creates a missing document only through the authenticated owner id',async()=>{
  const client=fake(); const r=await changeCloud('owner',()=>doc(['new']),client);
  assert.equal(r.revision,1);assert.equal(r.document.leads[0].id,'new');
});
test('concurrent update retries against latest data and preserves other-device contact',async()=>{
  const client=fake({row:{document:doc([]),revision:1},conflict:true});
  const r=await changeCloud('owner',current=>({...current,leads:[...current.leads,lead('mine')]}),client);
  assert.deepEqual(r.document.leads.map(l=>l.id),['other-device','mine']);assert.equal(r.revision,3);assert.equal(client.state.writes,2);
});
test('simultaneous first insert handles duplicate conflict safely',async()=>{
  const client=fake({conflict:true});const r=await changeCloud('owner',current=>({...current,leads:[...current.leads,lead('mine')]}),client);
  assert.equal(r.document.leads.length,2);
});
test('network or auth failure never reports saved',async()=>{
  const client=fake({error:{message:'Unauthorized',code:'42501'}});
  await assert.rejects(changeCloud('owner',()=>doc(['lost']),client));assert.equal(client.state.writes,0);
});
test('invalid cloud data fails closed',async()=>{
  await assert.rejects(readCloud('owner',fake({row:{revision:1,document:{version:99}}})));
});
test('invalid user edit is rejected before writing',async()=>{
  const client=fake();await assert.rejects(changeCloud('owner',()=>({version:1,leads:[{}]}),client));assert.equal(client.state.writes,0);
});
