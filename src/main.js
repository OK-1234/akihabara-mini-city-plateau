import * as THREE from 'three';
import { createWorld } from './map/world.js';
import { createCalibration } from './map/calibration.js';
import { createComparison } from './map/comparison.js';
import { createSedanTest } from './map/sedan-test.js';
import { createTrainTest } from './map/train-test.js';
import { createViaductTest } from './map/viaduct-test.js';
import { createDeckTest } from './map/deck-test.js';
import { createBuildingVolumes } from './map/building-volumes.js';
import { createStreetBlock } from './map/street-block.js';
import { createDensityTest } from './map/density-test.js';
import { createCleanBuildingsTest } from './map/clean-buildings-test.js';
import { createCity } from './map/city.js';
import { createCamera } from './camera.js';
import { createPlayer } from './player/player.js';
import { createSupportArrival } from './player/support-arrival.js';
import { createCarTransformation } from './player/car-transformation.js';
import { createTrainTransformation } from './player/train-transformation.js';
import { createOpening } from './player/opening.js';
import { createAmbientTraffic } from './map/ambient-traffic.js';
const scene=new THREE.Scene(); scene.background=new THREE.Color(0xe6e8e6);
const renderer=new THREE.WebGLRenderer({antialias:true});
renderer.setPixelRatio(Math.min(devicePixelRatio,2));
renderer.outputColorSpace=THREE.SRGBColorSpace;
renderer.toneMapping=THREE.ACESFilmicToneMapping; renderer.toneMappingExposure=1.15;
renderer.shadowMap.enabled=true; renderer.shadowMap.type=THREE.PCFSoftShadowMap;
renderer.domElement.setAttribute('aria-label','秋葉原ミニシティ 街の骨格');
document.body.append(renderer.domElement);
const whiteFade = document.createElement('div');

Object.assign(whiteFade.style, {
  position: 'fixed',
  inset: '0',
  background: '#ffffff',
  opacity: '1',
  pointerEvents: 'none',
  zIndex: '9999'
});

document.body.appendChild(whiteFade);
requestAnimationFrame(() => {
  whiteFade.style.transition = 'opacity 1.8s ease-in-out';
  whiteFade.style.opacity = '0';
});
scene.add(new THREE.HemisphereLight(0xf4f8ff,0xb5ada0,2.2));
const sun=new THREE.DirectionalLight(0xfff5e7,3);sun.position.set(-15,30,20);sun.castShadow=true;
sun.shadow.mapSize.set(2048,2048);Object.assign(sun.shadow.camera,{left:-25,right:25,top:25,bottom:-25,near:.1,far:100});sun.shadow.normalBias=.015;scene.add(sun);
createWorld(scene);
let deckTest,densityTest,city;
if (document.body.dataset.comparison === 'city') {
  city=await createCity(scene);
} else if (document.body.dataset.comparison === 'clean-buildings') {
  densityTest=await createCleanBuildingsTest(scene);
} else if (document.body.dataset.comparison === 'density') {
  densityTest=await createDensityTest(scene);
} else if (document.body.dataset.comparison === 'block') {
  await createStreetBlock(scene);
} else if (document.body.dataset.comparison === 'buildings') {
  await createBuildingVolumes(scene);
} else if (document.body.dataset.comparison === 'deck') {
  deckTest=await createDeckTest(scene);
} else if (document.body.dataset.comparison === 'viaduct') {
  await createViaductTest(scene);
} else if (document.body.dataset.comparison === 'train') {
  await createTrainTest(scene);
} else if (document.body.dataset.comparison === 'sedan') {
  await createSedanTest(scene);
} else if (document.body.dataset.comparison === 'vehicles') createComparison(scene);
else createCalibration(scene);
const rig=createCamera();
function resize(){renderer.setSize(innerWidth,innerHeight);rig.resize(innerWidth,innerHeight);}
window.addEventListener('resize',resize);resize();
try {
  const player=await createPlayer(scene,rig.camera);
  const traffic=city?await createAmbientTraffic(scene):null;
  let trainTransformation;
  const viaductWalk=city?.access.mount(player);
  const transformation=city?createCarTransformation(scene,player,rig.camera,city.volumes.deck.source.sedan.placement,()=>!trainTransformation?.active&&!viaductWalk?.elevated):null;
  const opening=city?createOpening(player,rig,city.root.getObjectByName('station'),city.viaduct.trains.horizontal):null;
  const arrival=city?createSupportArrival(scene,player,rig.camera,city.root.getObjectByName('support'),transformation):null;
  trainTransformation=city?createTrainTransformation(scene,player,city.viaduct.trains.vertical,()=>!opening.active&&!arrival.active&&transformation.mode==='walk',viaductWalk):null;
  densityTest?.spawnPlayer(player);
  const deckWalk=deckTest?.mountPlayer(player);
  document.querySelector('#status').textContent='';
  if(['buildings','block','density','clean-buildings'].includes(document.body.dataset.comparison)) document.querySelector('#status').textContent='';
  console.info('街の骨格 試作3号・縮尺校正', {tanukiHeight:player.height,walkSpeed:3,dashSpeed:4.8});
  let previous;
  renderer.setAnimationLoop(time=>{const dt=previous===undefined?0:Math.min((time-previous)/1000,.05);previous=time;player.update(dt);if(!trainTransformation?.active)viaductWalk?.update();traffic?.update(dt);if(!trainTransformation?.active)city?.viaduct.trains.vertical.update(dt);opening?.update(dt);trainTransformation?.update(dt);if(!opening?.active){city?.viaduct.trains.horizontal.update(dt);if(!arrival?.active)transformation?.update(dt);if(!trainTransformation?.active)arrival?.update(dt);}deckWalk?.update();if(!opening?.active&&!arrival?.active)rig.follow(player.position,dt,!!trainTransformation?.active||(!!transformation&&transformation.mode!=='walk'));if(deckWalk)rig.camera.position.y+=deckWalk.cameraLift;if(city&&!opening?.active&&!arrival?.active)rig.camera.position.y+=viaductWalk.updateCamera(dt);city?.finish.userData.coast?.update(dt,player,!opening?.active&&!arrival?.active&&!trainTransformation?.active&&transformation?.mode==='walk');renderer.render(scene,rig.camera);});
} catch(error) {document.querySelector('#status').textContent='読み込みに失敗しました。ページを再読み込みしてください。';console.error(error);}




