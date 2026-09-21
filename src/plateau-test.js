import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js';
import { TilesRenderer } from '3d-tiles-renderer';

// This viewer is independent of the game's entry point and coordinate system.
const status = document.querySelector('#status');
const scene = new THREE.Scene();
scene.background = new THREE.Color(0xdce5ec);
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
document.body.appendChild(renderer.domElement);
const whiteFade = document.createElement('div');

Object.assign(whiteFade.style, {
  position: 'fixed',
  inset: '0',
  background: '#ffffff',
  opacity: '0',
  pointerEvents: 'none',
  zIndex: '9999'
});

document.body.appendChild(whiteFade);
const camera = new THREE.PerspectiveCamera(45, 1, 1, 20000);
camera.position.set(650, 700, 850);

const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();
let buildingMesh = null;
let originalBuildingMaterial = null;

const controls = new OrbitControls(camera, renderer.domElement);
controls.target.set(0, 35, 0);
controls.enableDamping = true;
controls.minDistance = 20;
controls.maxDistance = 6000;
controls.maxPolarAngle = Math.PI / 2;
scene.add(new THREE.HemisphereLight(0xffffff, 0x727984, 2.2));
const sunlight = new THREE.DirectionalLight(0xfff5e8, 2.8);
sunlight.position.set(-500, 1000, 350);
scene.add(sunlight);
const ground = new THREE.Mesh(
  new THREE.PlaneGeometry(5000, 5000),
  new THREE.MeshStandardMaterial({ color: 0xb8bcc2 })
);
ground.rotation.x = -Math.PI / 2;
scene.add(ground);

const tiles = new TilesRenderer('./assets/plateau/tileset.json');
const waterTiles = new TilesRenderer('./assets/plateau/tileset-water.json');
const vegetationTiles = new TilesRenderer('./assets/plateau/tileset-vegetation.json');
const roadTiles = new TilesRenderer('./assets/plateau/tileset-road.json');
const bridgeTiles = new TilesRenderer('./assets/plateau/tileset-bridge.json');
waterTiles.manager = tiles.manager;
vegetationTiles.manager = tiles.manager;
roadTiles.manager = tiles.manager;
bridgeTiles.manager = tiles.manager;
const draco = new DRACOLoader(tiles.manager);
draco.setDecoderPath('https://cdn.jsdelivr.net/npm/three@0.180.0/examples/jsm/libs/draco/gltf/');
const gltf = new GLTFLoader(tiles.manager);
gltf.setDRACOLoader(draco);
// Three.js does not apply this legacy glTF extension itself. Its centre is
// already ECEF; set the scene translation before B3DMLoader rotates glTF Y-up.
gltf.register(parser => ({
  name: 'CESIUM_RTC',
  afterRoot(result) {
    const center = parser.json.extensions?.CESIUM_RTC?.center;
    if (center) {
      for (const model of result.scenes) model.position.fromArray(center);
    }
  },
}));
tiles.manager.addHandler(/\.(gltf|glb)(\?.*)?$/i, gltf);

// WGS84 ECEF -> local east/up/south, in metres, centred near Akihabara station.
// Keep the source tileset, B3DM, RTC offsets and embedded geometry untouched.
const latitude = THREE.MathUtils.degToRad(35.6984);
const longitude = THREE.MathUtils.degToRad(139.7731);
const origin = new THREE.Vector3();
tiles.ellipsoid.getCartographicToPosition(latitude, longitude, 36, origin);
const east = new THREE.Vector3(-Math.sin(longitude), Math.cos(longitude), 0);
const up = new THREE.Vector3(Math.cos(latitude) * Math.cos(longitude), Math.cos(latitude) * Math.sin(longitude), Math.sin(latitude));
const south = new THREE.Vector3().crossVectors(east, up);
const localToECEF = new THREE.Matrix4().makeBasis(east, up, south).setPosition(origin);
tiles.group.matrix.copy(localToECEF).invert();
tiles.group.matrixAutoUpdate = false;
scene.add(tiles.group);
waterTiles.group.matrix.copy(localToECEF).invert();
waterTiles.group.matrixAutoUpdate = false;
scene.add(waterTiles.group);
vegetationTiles.group.matrix.copy(localToECEF).invert();
vegetationTiles.group.matrixAutoUpdate = false;
scene.add(vegetationTiles.group);
roadTiles.group.matrix.copy(localToECEF).invert();
roadTiles.group.matrixAutoUpdate = false;
scene.add(roadTiles.group);
bridgeTiles.group.matrix.copy(localToECEF).invert();
bridgeTiles.group.matrixAutoUpdate = false;
scene.add(bridgeTiles.group);
tiles.setCamera(camera);
waterTiles.setCamera(camera);
vegetationTiles.setCamera(camera);
roadTiles.setCamera(camera);
bridgeTiles.setCamera(camera);
roadTiles.setResolutionFromRenderer(camera, renderer);
waterTiles.setResolutionFromRenderer(camera, renderer);
vegetationTiles.setResolutionFromRenderer(camera, renderer);
bridgeTiles.setResolutionFromRenderer(camera, renderer);

waterTiles.addEventListener('load-model', ({ scene: model }) => {
  status.textContent = '水データ読み込み成功';

  model.traverse(object => {
    if (!object.isMesh) return;
    object.material = new THREE.MeshStandardMaterial({
      color: 0x8fd3ff,
      roughness: 0.8
    });
  });
});
vegetationTiles.addEventListener('load-model', ({ scene: model }) => {
  status.textContent = '植生データ読み込み成功';
  model.traverse(object => {
    if (!object.isMesh) return;
    object.material = new THREE.MeshStandardMaterial({
      color: 0xb7d9a8,
      roughness: 0.8
    });
  });
});
roadTiles.addEventListener('load-model', ({ scene: model }) => {
  status.textContent = '道路データ読み込み成功';

  model.traverse(object => {
    if (!object.isMesh) return;

    object.material = new THREE.MeshStandardMaterial({
      color: 0xff9800,
      roughness: 0.8
    });
  });
});

status.textContent = 'ローカルの tileset.json / data0.b3dm を読み込み中…';
let failed = false;
let loaded = false;
tiles.addEventListener('load-model', ({ scene: model }) => {
  let triangles = 0;

  model.updateMatrixWorld(true);

  model.traverse(object => {
    if (!object.isMesh) return;
    buildingMesh = object;
    originalBuildingMaterial = object.material;
    console.log('MESH INFO', object.name, object.geometry.groups.length);

    const geometry = object.geometry;
    triangles +=
      (geometry.index ? geometry.index.count : geometry.attributes.position.count) / 3;


    geometry.computeBoundingBox();

    const center = new THREE.Vector3();
    geometry.boundingBox.getCenter(center);

    // B3DM内部座標 → ECEF座標
    center.applyMatrix4(object.matrixWorld);

    // ECEF座標 → 秋葉原を原点としたローカル座標
    center.applyMatrix4(localToECEF.clone().invert());

    console.log('BUILDING', center.x.toFixed(1), center.z.toFixed(1));

  });

  loaded = true;
  status.textContent = `読み込み完了 · ${triangles.toLocaleString()} 三角形`;
});
tiles.addEventListener('load-error', ({ error, url }) => {
  failed = true;
  status.dataset.error = 'true';
  status.textContent = `読み込み失敗：${url || ''} ${error?.message || error || ''}`;
  console.error('PLATEAU loading failed', error);
});
function resize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);

  tiles.setResolutionFromRenderer(camera, renderer);
  waterTiles.setResolutionFromRenderer(camera, renderer);
  vegetationTiles.setResolutionFromRenderer(camera, renderer);
  roadTiles.setResolutionFromRenderer(camera, renderer);
  bridgeTiles.setResolutionFromRenderer(camera, renderer);
}
window.addEventListener('resize', resize);
resize();

// 建物にマウスを乗せたときだけ青くする
renderer.domElement.addEventListener('pointermove', event => {
  if (!buildingMesh) return;

  const rect = renderer.domElement.getBoundingClientRect();

  mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
  mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

  raycaster.setFromCamera(mouse, camera);

  const hits = raycaster.intersectObject(buildingMesh, true);

  if (hits.length > 0) {
    buildingMesh.material = new THREE.MeshStandardMaterial({
      color: 0x4da6ff,
      roughness: 0.8
    });
  } else {
    buildingMesh.material = originalBuildingMaterial;
  }
});

let cameraMoving = false;
let overheadReady = false;

renderer.domElement.addEventListener('click', () => {
  if (overheadReady) {
    overheadReady = false;
    cameraMoving = true;

    const startPosition = camera.position.clone();

    // 真上の向きを維持したまま、秋葉原駅へ近づく
    const endPosition = new THREE.Vector3(0, 180, 0);

    const startTime = performance.now();
    const duration = 1800;

    function zoomToStation(now) {
      const t = Math.min((now - startTime) / duration, 1);
      const smooth = t * t * (3 - 2 * t);
      // ズーム途中から白くなり、到着時には完全な白
      const fadeStart = 0.35;
      const fadeProgress = Math.max(0, (t - fadeStart) / (1 - fadeStart));

      whiteFade.style.opacity = String(fadeProgress);

      camera.position.lerpVectors(
        startPosition,
        endPosition,
        smooth
      );

      camera.updateMatrixWorld(true);

      if (t < 1) {
        requestAnimationFrame(zoomToStation);
      } else {
        camera.position.copy(endPosition);
        camera.updateMatrixWorld(true);

        cameraMoving = false;
        console.log('STATION ZOOM COMPLETE');
      }
    }

    requestAnimationFrame(zoomToStation);
    return;
  }

  if (!buildingMesh || cameraMoving) return;

  const hits = raycaster.intersectObject(buildingMesh, true);
  if (hits.length === 0) return;

  cameraMoving = true;
  controls.enabled = false;

  const startPosition = camera.position.clone();
  const startTarget = controls.target.clone();

  // 完成済みのゴール
  const endPosition = new THREE.Vector3(0, 700, 0);
  const endTarget = new THREE.Vector3(0, 0, 0);

  // 画面の左右回転は途中で行わない
  const currentUp = camera.up.clone();
  const endUp = new THREE.Vector3(0.09, 0, -1).normalize();

  const startTime = performance.now();
  const duration = 1800;

  function moveCamera(now) {
    const t = Math.min((now - startTime) / duration, 1);

    // ゆっくり始まり、ゆっくり止まる
    const smooth = t * t * (3 - 2 * t);

    // 上昇しながら秋葉原駅の真上へ近づく
    camera.position.lerpVectors(
      startPosition,
      endPosition,
      smooth
    );

    // 視線も徐々に秋葉原駅へ
    controls.target.lerpVectors(
      startTarget,
      endTarget,
      smooth
    );

    camera.up.copy(currentUp);

    if (t < 1) {
      camera.lookAt(controls.target);
    } else {
      // 真上では up と視線が平行になるため lookAt で姿勢を作り直さない。
      // 直前の画面の向きを保ち、残った傾きだけを真下へ合わせる。
      const viewDirection = camera.getWorldDirection(new THREE.Vector3());
      const arrivalRotation = new THREE.Quaternion().setFromUnitVectors(
        viewDirection,
        new THREE.Vector3(0, -1, 0)
      );
      camera.quaternion.premultiply(arrivalRotation);
    }
    camera.updateMatrixWorld(true);

    if (t < 1) {
      requestAnimationFrame(moveCamera);
    } else {
      // ゴール位置
      camera.position.copy(endPosition);
      controls.target.copy(endTarget);

      // 到着時の姿勢を保存
      // 真上に到着した瞬間の見た目を、そのまま開始姿勢にする
      const startQuaternion = camera.quaternion.clone();

      // 最終姿勢はコピー上だけで計算し、表示中のカメラには触れない。
      const endCamera = camera.clone();
      endCamera.up.copy(endUp);
      endCamera.lookAt(endTarget);
      const endQuaternion = endCamera.quaternion.clone();

      const rotateStartTime = performance.now();
      const rotateDuration = 1800;

      function rotateMap(now) {
        const t = Math.min((now - rotateStartTime) / rotateDuration, 1);

        // ゆっくり始まり、ゆっくり止まる
        const smooth = t * t * (3 - 2 * t);

        // 到着した瞬間の見た目から、そのまま回転
        camera.quaternion.slerpQuaternions(
          startQuaternion,
          endQuaternion,
          smooth
        );

        camera.updateMatrixWorld(true);

        if (t < 1) {
          requestAnimationFrame(rotateMap);
        } else {
          camera.quaternion.copy(endQuaternion);
          camera.up.copy(endUp);
          camera.updateMatrixWorld(true);

          cameraMoving = false;
          overheadReady = true;
        }
      }

      requestAnimationFrame(rotateMap);
    }
  }

  requestAnimationFrame(moveCamera);
});

renderer.setAnimationLoop(() => {
  if (!cameraMoving && controls.enabled) {
    controls.update();
  }

  camera.updateMatrixWorld();
  scene.updateMatrixWorld(true);
  tiles.update();
  waterTiles.update();
  vegetationTiles.update();
  roadTiles.update();
  bridgeTiles.update();
  renderer.render(scene, camera);
  if (loaded && !failed && renderer.info.render.triangles > 0) {
    status.textContent = `表示中 · ${renderer.info.render.triangles.toLocaleString()} 三角形`;
  }
});
