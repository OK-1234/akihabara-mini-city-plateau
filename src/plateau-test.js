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
const camera = new THREE.PerspectiveCamera(45, 1, 1, 20000);
camera.position.set(650, 700, 850);
const controls = new OrbitControls(camera, renderer.domElement);
controls.target.set(0, 35, 0);
controls.enableDamping = true;
controls.minDistance = 20;
controls.maxDistance = 6000;
controls.maxPolarAngle = Math.PI * 0.49;
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
      color:  0x8fd3ff,
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
  model.traverse(object => {
    if (!object.isMesh) return;
    const geometry = object.geometry;
    triangles += (geometry.index ? geometry.index.count : geometry.attributes.position.count) / 3;
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
renderer.setAnimationLoop(() => {
  controls.update();
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
