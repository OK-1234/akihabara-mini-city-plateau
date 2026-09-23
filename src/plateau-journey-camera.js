import * as THREE from 'three';

export function createJourneyCamera(camera, controls, canvas, center) {
  const heights = { high: [600, 420], middle: [260, 380], low: [100, 260] };
  let mode = 'follow', height = 'high', transition = true, initialized = false;
  let previous = new THREE.Vector3();
  controls.enabled = true;
  controls.enablePan = true;
  controls.screenSpacePanning = true;
  controls.maxPolarAngle = Math.PI / 2 - 0.06;
  canvas.addEventListener('pointerdown', event => {
    if (!controls.enabled) return;
    if (event.button === 2) mode = 'free';
    transition = false;
  }, true);
  canvas.addEventListener('wheel', () => { transition = false; }, { passive: true });
  return {
    get mode() { return mode; },
    select(next, preset = height, snap = false) {
      mode = next; height = preset; transition = true;
      if (snap) initialized = false;
    },
    update(point, direction, dt) {
      const pivot = point.clone().add(new THREE.Vector3(0, 18, 0));
      if (mode === 'follow' && initialized && !transition) {
        const delta = pivot.clone().sub(previous);
        camera.position.add(delta); controls.target.add(delta);
      }
      if (transition || !initialized) {
        const aim = mode === 'overview' ? center : pivot;
        const [y, back] = heights[height];
        const offset = mode === 'overview' ? new THREE.Vector3(0, 3100, 850)
          : new THREE.Vector3(-direction.x * back, y, -direction.z * back);
        const goal = aim.clone().add(offset);
        const t = initialized ? 1 - Math.exp(-dt * 4) : 1;
        camera.position.lerp(goal, t); controls.target.lerp(aim, t);
        camera.up.set(0, 1, 0);
        if (camera.position.distanceTo(goal) < 1 && controls.target.distanceTo(aim) < 1) transition = false;
      }
      previous.copy(pivot); initialized = true;
      controls.update();
    },
  };
}

// Same arrival pose, quaternion hand-off and white zoom as the existing viewer.
export function createStationArrival(camera, controls, fade, onComplete) {
  const start = camera.position.clone(), startTarget = controls.target.clone();
  const up = camera.up.clone(), end = new THREE.Vector3(0, 700, 0), target = new THREE.Vector3();
  const finalUp = new THREE.Vector3(.09, 0, -1).normalize();
  let elapsed = 0, arrivalQuaternion, completed = false;
  const endCamera = camera.clone(); endCamera.position.copy(end); endCamera.up.copy(finalUp); endCamera.lookAt(target);
  controls.enabled = false;
  const smooth = t => t * t * (3 - 2 * t);
  return dt => {
    elapsed += dt;
    // Remove the panel framing gradually; do not jump the projection at the click.
    if (camera.view?.enabled && elapsed < 1.8) {
      camera.view.offsetX *= Math.exp(-dt * 4); camera.view.offsetY *= Math.exp(-dt * 4); camera.updateProjectionMatrix();
    }
    if (elapsed < 1.8) {
      const t = smooth(elapsed / 1.8);
      camera.position.lerpVectors(start, end, t); controls.target.lerpVectors(startTarget, target, t);
      camera.up.copy(up); camera.lookAt(controls.target);
    } else if (elapsed < 3.6) {
      if (!arrivalQuaternion) {
        const direction = camera.getWorldDirection(new THREE.Vector3());
        camera.quaternion.premultiply(new THREE.Quaternion().setFromUnitVectors(direction, new THREE.Vector3(0,-1,0)));
        arrivalQuaternion = camera.quaternion.clone(); camera.clearViewOffset();
      }
      camera.position.copy(end); controls.target.copy(target);
      camera.quaternion.slerpQuaternions(arrivalQuaternion, endCamera.quaternion, smooth((elapsed - 1.8) / 1.8));
    } else if (elapsed < 4.5) {
      camera.quaternion.copy(endCamera.quaternion); camera.up.copy(finalUp);
    } else {
      const t = Math.min(1, (elapsed - 4.5) / 1.8);
      camera.position.lerpVectors(end, new THREE.Vector3(0,180,0), smooth(t));
      fade.style.opacity = String(Math.max(0, (t - .35) / .65));
      if (t === 1 && !completed) { completed = true; onComplete(); }
    }
    camera.updateMatrixWorld();
  };
}
