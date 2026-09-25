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
