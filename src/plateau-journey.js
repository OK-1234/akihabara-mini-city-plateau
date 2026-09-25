import * as THREE from 'three';
import { createJourneyCamera, createStationArrival } from './plateau-journey-camera.js';
import { createDistanceRoute, routeAnchors } from './plateau-route.js';
import { createJourneyReveal } from './plateau-journey-reveal.js';

export function createJourney({ scene, camera, controls, renderer, layers, toLocal, whiteFade }) {
  document.body.classList.add('journey-mode');
  document.title = '東京 → 神田 → 秋葉原 | PLATEAU 都市の旅';
  document.querySelector('aside').hidden = true;
  const panel = document.createElement('section');
  panel.className = 'journey-panel';
  panel.setAttribute('aria-label', '都市の旅');
  panel.innerHTML = `<div class="eyebrow">PLATEAU · CITY JOURNEY</div>
    <h1>東京から、秋葉原へ。</h1>
    <div class="journey-stations"><span>東京</span><span>神田</span><span>秋葉原</span></div>
    <progress aria-label="東京から秋葉原までの進捗" max="100" value="0"></progress>
    <p class="journey-location">東京駅 · 出発準備中</p>
    <p class="journey-status" role="status">街を準備しています…</p>
    <div class="journey-buttons"><button data-action="play" disabled>出発する</button>
    <button data-action="reset" disabled>東京へ戻る</button>
    <button data-action="follow">追従する</button><button data-action="view">全体を見る</button></div>
    <label class="speed-label">移動の速さ <select aria-label="移動の速さ"><option value="2">標準（旧2倍）</option><option value="3">3倍</option></select></label>
    <label class="speed-label">カメラの高さ <select aria-label="カメラの高さ"><option value="high">高い</option><option value="middle">中くらい</option><option value="low">低い</option></select></label>
    <p class="camera-help">左ドラッグ：角度変更 · 右ドラッグ：地図を自由に移動</p>
    <small>駅位置に基づく案内用の近似経路です。線路の高さ・細かな曲線は簡略化しています。</small>`;
  document.body.append(panel);
  const location = panel.querySelector('.journey-location');
  const status = panel.querySelector('.journey-status');
  const progress = panel.querySelector('progress');
  const play = panel.querySelector('[data-action=play]');
  const reset = panel.querySelector('[data-action=reset]');
  const view = panel.querySelector('[data-action=view]');
  const speed = panel.querySelector('[aria-label="移動の速さ"]');
  const heightSelect = panel.querySelector('[aria-label="カメラの高さ"]');
  const follow = panel.querySelector('[data-action=follow]');
  const points = routeAnchors.map(a => toLocal(a.lat, a.lon, 48));
  const route = createDistanceRoute(points);
  const kandaDistance = route.distances[routeAnchors.findIndex(a => a.station === '神田')];
  panel.querySelector('.journey-stations span:nth-child(2)').style.left = `${kandaDistance / route.length * 100}%`;
  const root = new THREE.Group();
  root.name = 'journey-guide';
  scene.add(root);
  const lineMaterial = new THREE.MeshBasicMaterial({ color: 0xe85556 });
  for (let i = 1; i < points.length; i++) {
    const curve = new THREE.LineCurve3(points[i - 1], points[i]);
    root.add(new THREE.Mesh(new THREE.TubeGeometry(curve, 1, 2.2, 6, false), lineMaterial));
  }
  const target = new THREE.Group();
  target.name = 'journey-target';
  const markerMaterial = new THREE.MeshBasicMaterial({ color: 0x087e8b, depthTest: false });
  const ball = new THREE.Mesh(new THREE.SphereGeometry(15, 20, 14), markerMaterial);
  ball.position.y = 23; ball.renderOrder = 20; target.add(ball);
  const arrow = new THREE.Mesh(new THREE.ConeGeometry(11, 26, 3), markerMaterial);
  arrow.rotation.x = -Math.PI / 2; arrow.position.set(0, 23, -29); arrow.renderOrder = 20;
  target.add(arrow);
  const ring = new THREE.Mesh(new THREE.RingGeometry(18, 23, 32),
    new THREE.MeshBasicMaterial({ color: 0xffffff, side: THREE.DoubleSide, depthTest: false }));
  ring.rotation.x = -Math.PI / 2; ring.position.y = 2; ring.renderOrder = 19; target.add(ring);
  root.add(target);
  const labels = [];
  const buildingObjects = [];
  let surveyed = false;
  const inspectRoute = new URLSearchParams(window.location.search).has('inspectRoute');
  // Reveal from the ground upward within the approaching camera view. Geometry stays at its
  // real position and scale; once revealed, buildings are never hidden again.
  const reveal = createJourneyReveal(points[0].z);
  const revealFront = { value: reveal.front };
  const revealMap = { value: 0 };
  let revealHeight = 600;
  let buildingNorthZ = null;
  for (let i = 0; i < points.length; i++) {
    if (!routeAnchors[i].station) continue;
    const label = document.createElement('button'); label.className = 'journey-map-label';
    label.textContent = `${routeAnchors[i].station}駅`;
    document.body.append(label); labels.push({ label, point: points[i], distance: route.distances[i], name: routeAnchors[i].station });
    label.disabled = true;
    if (routeAnchors[i].station === '秋葉原') label.onclick = enterStation;
    const station = new THREE.Mesh(new THREE.RingGeometry(18, 23, 32),
      new THREE.MeshBasicMaterial({ color: 0xe85556, side: THREE.DoubleSide }));
    station.rotation.x = -Math.PI / 2; station.position.copy(points[i]); station.position.y += 0.5; root.add(station);
  }

  // A second camera requests the registered corridor before departure. Actual rendering
  // still uses the viewing camera; no source geometry, bounds or geographic scale changes.
  const bounds = new THREE.Box3().setFromPoints(points);
  const center = bounds.getCenter(new THREE.Vector3());
  const preload = new THREE.OrthographicCamera(-2800, 2800, 2800, -2800, 1, 12000);
  preload.position.copy(center).add(new THREE.Vector3(0, 6000, 0));
  preload.up.set(0, 0, -1); preload.lookAt(center); preload.updateMatrixWorld();
  const states = layers.map(({ tiles, url, name }) => {
    const state = { name, loaded: new Set(), expected: null, error: null };
    tiles.errorTarget = 1;
    tiles.setCamera(preload);
    tiles.setResolution(preload, 2048, 2048);
    // Keep this short, bounded corridor resident, including when it is behind the viewer.
    tiles.addEventListener('load-model', event => {
      if (!event.tile.children?.length) state.loaded.add(event.tile);
      if (name === '建物') event.scene.traverse(object => {
        if (object.isMesh) {
          object.userData.journeyTile = event.tile.content.uri; buildingObjects.push(object);
          const decorate = source => {
            const material = source.clone();
            material.onBeforeCompile = shader => {
              shader.uniforms.journeyFront = revealFront;
              shader.uniforms.journeyMap = revealMap;
              shader.vertexShader = 'varying vec3 journeyWorld;\n' + shader.vertexShader;
              shader.vertexShader = shader.vertexShader.replace('#include <worldpos_vertex>', '#include <worldpos_vertex>\njourneyWorld = (modelMatrix * vec4(transformed, 1.0)).xyz;');
              shader.fragmentShader = 'varying vec3 journeyWorld;\nuniform float journeyFront;\nuniform float journeyMap;\n' + shader.fragmentShader;
              shader.fragmentShader = shader.fragmentShader.replace('#include <clipping_planes_fragment>', `#include <clipping_planes_fragment>\nfloat growth = smoothstep(-${reveal.width.toFixed(1)},${reveal.width.toFixed(1)},journeyWorld.z - journeyFront);\nif (journeyMap < .5 && growth < 1.0 && journeyWorld.y > mix(-30.0,350.0,growth)) discard;`);
            };
            material.customProgramCacheKey = () => 'journey-rise-v3';
            return material;
          };
          object.material = Array.isArray(object.material) ? object.material.map(decorate) : decorate(object.material);
        }
      });
    });
    tiles.addEventListener('dispose-model', event => state.loaded.delete(event.tile));
    tiles.addEventListener('load-error', event => {
      state.error = `${name}の読み込みに失敗しました：${event.url || ''}`;
    });
    fetch(url).then(r => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json(); })
      .then(json => {
        const leaves = [];
        function walk(tile) {
          if (!tile.children?.length && tile.content) leaves.push(tile);
          for (const child of tile.children || []) walk(child);
        }
        walk(json.root); state.expected = leaves.length;
      }).catch(error => { state.error = `${name}：${error.message}`; });
    return state;
  });

  let distance = 0, running = false, ready = false, overview = false, arrival = null;
  const cameraRig = createJourneyCamera(camera, controls, renderer.domElement, center);
  function enterStation() {
    if (distance < route.length || arrival) return;
    running = false; panel.hidden = true;
    labels.forEach(({label}) => label.hidden = true);
    arrival = createStationArrival(camera, controls, whiteFade, () => { window.location.href = './'; });
  }
  let dwell = 0, passedKanda = false, firstFrame = true, stableTime = 0, elapsed = 0;
  let last = performance.now(), uiTime = 0, viewportKey = '';
  const focus = points[0].clone();
  const desired = new THREE.Vector3(), ahead = new THREE.Vector3(), forward = new THREE.Vector3();

  play.onclick = () => {
    if (!ready || states.some(s => s.error)) return;
    if (distance >= route.length) restart();
    running = !running;
  };
  function restart() {
    distance = 0; passedKanda = false; dwell = 0; running = false; elapsed = 0;
    firstFrame = true;
    reveal.reset(); revealFront.value = reveal.front;
    overview = false; heightSelect.value = 'high'; cameraRig.select('follow', 'high', true);
  }
  reset.onclick = restart;
  view.onclick = () => { overview = true; cameraRig.select('overview', 'high'); heightSelect.value = 'high'; };
  follow.onclick = () => { overview = false; cameraRig.select('follow', 'high'); heightSelect.value = 'high'; };
  heightSelect.onchange = () => { overview = false; cameraRig.select('follow', heightSelect.value); };
  document.addEventListener('visibilitychange', () => { last = performance.now(); if (document.hidden) running = false; });
  renderer.domElement.addEventListener('webglcontextlost', () => { running = false; ready = false; states[0].error = '描画を続行できません。ページを再読み込みしてください。'; });

  return {
    update(now) {
      const key = `${window.innerWidth}:${window.innerHeight}`;
      if (key !== viewportKey) {
        viewportKey = key;
        // Reserve space for the controls instead of allowing them to cover the target.
        const wide = window.innerWidth > 650;
        camera.setViewOffset(window.innerWidth, window.innerHeight,
          wide ? -Math.min(170, window.innerWidth * 0.2) : 0,
          wide ? 0 : Math.min(140, window.innerHeight * 0.2),
          window.innerWidth, window.innerHeight);
      }
      const dt = Math.min(Math.max((now - last) / 1000, 0), 0.1); last = now;
      if (arrival) { arrival(dt); return; }
      const error = states.find(s => s.error)?.error;
      const allLoaded = states.every(s => s.expected !== null && s.loaded.size >= s.expected);
      stableTime = allLoaded && !error ? stableTime + dt : 0;
      ready = stableTime > 1;
      if (ready && buildingNorthZ === null) {
        // Bounds in the existing local frame, once all registered tiles loaded.
        scene.updateMatrixWorld(true);
        const extent = new THREE.Box3();
        for (const object of buildingObjects) {
          object.geometry.computeBoundingBox();
          extent.union(object.geometry.boundingBox.clone().applyMatrix4(object.matrixWorld));
        }
        if (!extent.isEmpty()) buildingNorthZ = extent.min.z;
      }
      if (ready && !surveyed && inspectRoute) {
        surveyed = true;
        scene.updateMatrixWorld(true);
        const ray = new THREE.Raycaster(), hits = [];
        for (let d = 0; d <= route.length; d += 2) {
          const p = new THREE.Vector3().copy(route.sample(d));
          ray.set(new THREE.Vector3(p.x, 500, p.z), new THREE.Vector3(0,-1,0));
          const hit = ray.intersectObjects(buildingObjects, false)[0];
          if (hit) hits.push({d:Math.round(d),x:p.x,z:p.z,y:hit.point.y,tile:hit.object.userData.journeyTile,
            id:hit.object.geometry.attributes._batchid?.getX(hit.face.a)});
        }
        const grouped = [...new Set(hits.map(h => h.tile + ':' + h.id))].map(key => {
          const samples = hits.filter(h => h.tile + ':' + h.id === key);
          return {key, from:samples[0].d, to:samples.at(-1).d, maxHeight:Math.max(...samples.map(h=>h.y))};
        });
        console.log('ROUTE CHECK', JSON.stringify(grouped));
      }
      if (!ready || error) running = false;
      if (running) {
        elapsed += dt;
        if (dwell > 0) dwell = Math.max(0, dwell - dt);
        else {
          // A gentle start/finish; fixed metres per second, independent of frame rate.
          const acceleration = Math.min(1, elapsed / 2);
          const braking = Math.max(0.2, Math.min(1, (route.length - distance) / 90));
          distance = Math.min(route.length, distance + 26 * Number(speed.value) * acceleration * braking * dt);
          if (!passedKanda && distance >= kandaDistance) { distance = kandaDistance; passedKanda = true; dwell = 2.5; }
          if (distance >= route.length) running = false;
        }
      }
      target.position.copy(route.sample(distance));
      ahead.copy(route.sample(Math.min(route.length, distance + 100)));
      forward.copy(ahead).sub(target.position);
      if (forward.lengthSq() > 0.01) {
        const angle = Math.atan2(-forward.x, -forward.z);
        target.quaternion.slerp(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), angle), 1 - Math.exp(-dt * 5));
      }
      const direction = new THREE.Vector3().copy(route.sample(Math.min(route.length, distance + 30))).sub(new THREE.Vector3().copy(route.sample(Math.max(0, distance - 30)))).normalize();
      cameraRig.update(target.position, direction, dt);
      // Overview/free map may show all data without consuming the future reveal.
      revealMap.value = cameraRig.mode === 'follow' ? 0 : 1;
      if (cameraRig.mode === 'follow') revealHeight = camera.position.y - target.position.y;
      revealFront.value = reveal.update(target.position.z, revealHeight, dt,
        { remaining: route.length - distance, northZ: buildingNorthZ });
      target.scale.setScalar(THREE.MathUtils.clamp(camera.position.distanceTo(target.position) / 600, .55, 1));
      camera.updateMatrixWorld();
      for (const { label, point, distance: stationDistance, name } of labels) {
        label.classList.toggle('reached', distance >= stationDistance);
        label.disabled = !(name === '秋葉原' && distance >= route.length);
        label.textContent = !label.disabled ? '秋葉原駅へ入る' : name + '駅';
        const projected = point.clone().add(new THREE.Vector3(0, 55, 0)).project(camera);
        label.hidden = Math.abs(projected.x) > 0.95 || Math.abs(projected.y) > 0.92 || projected.z > 1;
        label.style.left = `${(projected.x + 1) * window.innerWidth / 2}px`;
        label.style.top = `${(1 - projected.y) * window.innerHeight / 2}px`;
      }
      uiTime += dt;
      if (uiTime > 0.15) {
        uiTime = 0;
        const arrived = distance >= route.length;
        progress.value = distance / route.length * 100;
        location.textContent = arrived ? '秋葉原駅に到着しました' : dwell > 0 ? `神田駅 · ${running ? 'まもなく出発' : '一時停止中'}` : distance === 0 ? '東京駅 · 秋葉原方面' : `${distance < kandaDistance ? '東京 → 神田' : '神田 → 秋葉原'} · ${running ? '北へ進行中' : '一時停止中'}`;
        status.textContent = error || (!ready ? `街を準備しています · ${states.reduce((n,s) => n + s.loaded.size, 0)} / ${states.every(s=>s.expected!==null) ? states.reduce((n,s)=>n+s.expected,0) : '…'}` : arrived ? '秋葉原駅の表示をクリックすると、駅へ移動します。' : running ? `残り 約${Math.ceil((route.length - distance) / 10) * 10} m` : '準備完了 · 出発／再開できます');
        play.disabled = !ready || !!error; reset.disabled = !ready || !!error;
        play.textContent = arrived ? 'もう一度出発' : running ? '一時停止' : distance > 0 ? '再開する' : '出発する';
        panel.dataset.state = error ? 'error' : !ready ? 'loading' : arrived ? 'arrived' : running ? 'running' : 'paused';
        // Read-only verification values: distinguish loading from shader reveal.
        panel.dataset.buildingsLoaded = String(states.find(s=>s.name==='建物')?.loaded.size ?? 0);
        panel.dataset.buildingsExpected = String(states.find(s=>s.name==='建物')?.expected ?? '');
        panel.dataset.revealComplete = String(buildingNorthZ !== null && revealFront.value + reveal.width < buildingNorthZ);
        panel.dataset.remaining = String(Math.max(0, route.length-distance).toFixed(1));
      }
    },
  };
}

