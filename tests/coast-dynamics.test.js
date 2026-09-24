import test from 'node:test';
import assert from 'node:assert/strict';
import { washEdge, washFootprint } from '../src/map/coast-dynamics.js';
test('波が届いた足跡だけを徐々に洗い、乾いた砂の足跡を保持する',()=>{
  const wet={distance:.4,strength:1},dry={distance:2.5,strength:1};
  for(let i=0;i<1200;i++){
    const edge=washEdge(0,i/60);
    washFootprint(wet,edge,1/60);washFootprint(dry,edge,1/60);
  }
  assert.equal(wet.strength,0);assert.equal(dry.strength,1);
});
test('同じ時刻でも場所別の波の到達範囲で判定する',()=>{
  const marks=[0,5].map(x=>({x,distance:.9,strength:1}));
  for(let i=0;i<12;i++)for(const m of marks)washFootprint(m,washEdge(m.x,i/60),1/60);
  assert.notEqual(marks[0].strength,marks[1].strength);
});
test('波が引いた後も消えた足跡は復活しない',()=>{
  const m={distance:.3,strength:.1};washFootprint(m,1,.1);washFootprint(m,-1,.1);assert.equal(m.strength,0);
});
