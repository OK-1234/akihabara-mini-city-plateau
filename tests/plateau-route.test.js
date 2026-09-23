import test from 'node:test';
import assert from 'node:assert/strict';
import { createDistanceRoute, routeAnchors } from '../src/plateau-route.js';

test('metre-based route clamps endpoints and crosses joins without speed jumps', () => {
  const route = createDistanceRoute([{x:0,y:0,z:0},{x:3,y:0,z:0},{x:3,y:0,z:4}]);
  assert.equal(route.length, 7);
  assert.deepEqual(route.sample(-100), {x:0,y:0,z:0});
  assert.deepEqual(route.sample(100), {x:3,y:0,z:4});
  assert.deepEqual(route.sample(3), {x:3,y:0,z:0});
  assert.deepEqual(route.sample(5), {x:3,y:0,z:2});
  const a = route.sample(2.999), b = route.sample(3.001);
  assert.ok(Math.hypot(a.x-b.x,a.z-b.z) < .002);
});

test('station order and geographic progression remain Tokyo, Kanda, Akihabara', () => {
  assert.deepEqual(routeAnchors.filter(p=>p.station).map(p=>p.station), ['東京','神田','秋葉原']);
  for(let i=1;i<routeAnchors.length;i++) {
    assert.ok(routeAnchors[i].lat > routeAnchors[i-1].lat);
  }
  // Local scale approximation for checking sample progression, not production conversion.
  const route = createDistanceRoute(routeAnchors.map(a=>({x:a.lon*90500,y:12,z:-a.lat*111000})));
  assert.ok(route.length > 1800 && route.length < 2300);
  for(let d=1;d<route.length;d+=1) {
    const a=route.sample(d-1),b=route.sample(d);
    assert.ok(Math.hypot(a.x-b.x,a.z-b.z)<=1.000001);
    assert.ok(b.z<a.z);
  }
});
