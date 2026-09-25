import test from 'node:test';
import assert from 'node:assert/strict';
import { createJourneyReveal } from '../src/plateau-journey-reveal.js';

test('2x/3x travel keeps the reveal within 350m ahead at all presets', () => {
  for (const speed of [52,78]) for (const height of [100,260,600]) {
    const reveal=createJourneyReveal(2000);
    for(let frame=1;frame<=1800;frame++) {
      const z=2000-speed*frame/60;
      const front=reveal.update(z,height,1/60);
      assert.ok(z-front+reveal.width < 350);
      assert.ok(z-front-reveal.width > -20);
    }
  }
});

test('camera changes are bounded, revealed streets persist, reset replays', () => {
  const reveal=createJourneyReveal(2000);
  for(let i=0;i<60;i++)reveal.update(1700,100,1/60);
  const before=reveal.front;
  const next=reveal.update(1700,600,1/60);
  assert.ok(before-next<=110/60+1e-9);
  for(let i=0;i<60;i++)reveal.update(2000,100,1/60);
  assert.equal(reveal.front,next);
  reveal.reset();assert.equal(reveal.front,1840);
});

test('final approach finishes the full loaded extent before arrival at both speeds', () => {
  for(const speed of [52,78])for(const height of [100,260,600]){
    const reveal=createJourneyReveal(2300),northZ=-900;
    let remaining=2300,previous=reveal.front,maxStep=0;
    while(remaining>0){
      remaining=Math.max(0,remaining-speed/60);
      const front=reveal.update(remaining,height,1/60,{remaining,northZ});
      assert.ok(front<=previous);
      maxStep=Math.max(maxStep,previous-front);previous=front;
      if(remaining<=25)assert.ok(front+reveal.width<northZ);
    }
    assert.ok(maxStep<10,'no single-frame arrival jump');
    const completed=reveal.front;
    for(let i=0;i<120;i++)reveal.update(0,600,1/60,{remaining:0,northZ});
    assert.equal(reveal.front,completed);
    reveal.reset();assert.equal(reveal.front,2140);
    reveal.update(2300,100,1/60,{remaining:2300,northZ});
    assert.ok(reveal.front+reveal.width>northZ,'restart restores the travelling reveal');
  }
});

test('unfinished loading does not invent an extent; pausing final approach does not jump',()=>{
  const reveal=createJourneyReveal(2300);
  reveal.update(450,600,1/60,{remaining:450,northZ:null});
  const front=reveal.front;
  assert.ok(front>2000);
  for(let i=0;i<1800;i++)reveal.update(400,600,1/60,{remaining:400,northZ:-900});
  const paused=reveal.front;
  for(let i=0;i<60;i++)reveal.update(400,600,1/60,{remaining:400,northZ:-900});
  assert.equal(reveal.front,paused);
});
