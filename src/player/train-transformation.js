import * as THREE from 'three';
import { createTransformationLabel } from './transformation-label.js';
import { ELEVATION } from '../map/world.js';
import { createTransformationSmoke } from './transformation-smoke.js';

export const TRAIN_SPEEDS=[0,.65,1.6,2.4];
const SWITCH_TIME=.25;

// Keep the autonomous formation intact; only the player copy is driven manually.
export function createTrainTransformation(scene,player,automaticTrain,isAvailable,access) {
  const root=automaticTrain.root.clone(true);root.name='tanuki-operated-train';automaticTrain.root.parent.add(root);
  const train={root,cars:automaticTrain.cars.map(car=>root.getObjectByName(car.name)),min:automaticTrain.min,max:automaticTrain.max};
  const deck=scene.getObjectByName('vertical-deck-3');
  const bounds=new THREE.Box3().setFromObject(deck,true);
  const point=new THREE.Vector3((bounds.min.x+bounds.max.x)/2,0,bounds.max.z);
  const discover=createTransformationLabel(scene,'E：電車に化ける',true);
  const revert=createTransformationLabel(scene,'E：タヌキに戻る');
  discover.name='train-transform-discover';revert.name='train-transform-revert';
  let active=false,armed=false,wasAvailable=false;
  let phase=null,elapsed=0,swapped=false;
  const duration=.85;
  const smoke=train.cars.map(()=>createTransformationSmoke(scene));
  const groundSmoke=createTransformationSmoke(scene);
  smoke.forEach(effect=>effect.root.scale.set(1.7,1.8,1.7));
  let speed=0,stage=0,switchFrom=0,switchElapsed=0,direction=-1;
  const keys=new Set();
  const canRevert=()=>active&&!phase&&stage===0&&speed===0;
  function changeStage(next){stage=next;switchFrom=speed;switchElapsed=0;revert.visible=false;}

  // The sea is -Z. Choose its carriage by position, never by current velocity.
  train.root.updateWorldMatrix(true,true);
  const seaCar=[...train.cars].sort((a,b)=>new THREE.Box3().setFromObject(a,true).getCenter(new THREE.Vector3()).z-new THREE.Box3().setFromObject(b,true).getCenter(new THREE.Vector3()).z)[0];
  const carBounds=new THREE.Box3().setFromObject(seaCar,true);
  const roofX=(carBounds.min.x+carBounds.max.x)/2;
  const roofZ=carBounds.min.z+(carBounds.max.z-carBounds.min.z)*.22;
  const ray=new THREE.Raycaster(new THREE.Vector3(roofX,carBounds.max.y+1,roofZ),new THREE.Vector3(0,-1,0));
  const roofHit=ray.intersectObject(seaCar,true)[0];
  if(!roofHit)throw new Error('海側車両の屋根が見つかりません');
  const sourceLeaf=player.model.getObjectByName('Leaf_CTRL_葉っぱ全体');
  if(!sourceLeaf)throw new Error('タヌキの葉っぱが見つかりません');
  sourceLeaf.updateWorldMatrix(true,true);
  const leaf=sourceLeaf.clone(true);leaf.name='tanuki-train-leaf';
  sourceLeaf.matrixWorld.decompose(leaf.position,leaf.quaternion,leaf.scale);
  leaf.position.set(0,0,0);train.root.add(leaf);leaf.updateWorldMatrix(true,true);
  const leafBounds=new THREE.Box3().setFromObject(leaf,true),center=leafBounds.getCenter(new THREE.Vector3());
  const worldOrigin=leaf.getWorldPosition(new THREE.Vector3());
  worldOrigin.add(new THREE.Vector3(roofX-center.x,roofHit.point.y+.04-leafBounds.min.y,roofZ-center.z));
  leaf.position.copy(train.root.worldToLocal(worldOrigin));leaf.visible=false;train.root.visible=false;
  const near=()=>player.groundHeight===0&&Math.abs(player.position.x-point.x)<=.8&&Math.abs(player.position.z-point.z)<=.75;
  function eligible(){return !active&&armed&&isAvailable()&&near();}
  function syncPosition(){player.setPosition(new THREE.Vector3(train.root.position.x,0,train.root.position.z));player.setGroundHeight(ELEVATION);}
  function beginSmoke(entering){
    phase=entering?'enter':'exit';elapsed=0;swapped=false;active=true;armed=false;keys.clear();player.setWalking(false);
    if(entering){
      train.root.position.z=train.max;speed=0;stage=0;switchFrom=0;switchElapsed=0;direction=-1;
      automaticTrain.root.visible=false;
      groundSmoke.root.position.set(player.position.x,0,player.position.z);groundSmoke.root.visible=true;groundSmoke.update(0);
    }
    train.root.updateWorldMatrix(true,true);
    smoke.forEach((effect,i)=>{const b=new THREE.Box3().setFromObject(train.cars[i],true);b.getCenter(effect.root.position);effect.root.position.y=ELEVATION;effect.root.visible=true;effect.update(0);});
    discover.visible=false;revert.visible=false;
  }
  window.addEventListener('keydown',event=>{
    if(active&&['ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(event.code)){
      event.preventDefault();event.stopImmediatePropagation();
      if(!phase&&!event.repeat&&!keys.has(event.code)){
        keys.add(event.code);
        if(event.code==='ArrowUp')changeStage(Math.max(-3,stage-1));
        if(event.code==='ArrowDown')changeStage(Math.min(3,stage+1));
      }
      return;
    }
    if(event.code!=='KeyE'||event.repeat)return;
    if(!active&&!eligible())return;
    event.preventDefault();event.stopImmediatePropagation();
    if(phase)return;
    if(active){
      if(!canRevert())return;
      beginSmoke(false);
    }else{
      beginSmoke(true);
    }
    discover.visible=false;revert.visible=false;
  },true);
  window.addEventListener('keyup',event=>keys.delete(event.code));
  window.addEventListener('blur',()=>keys.clear());
  document.addEventListener('visibilitychange',()=>{if(document.hidden)keys.clear();});
  function update(dt=0){
    const available=isAvailable();
    if(!active){
      // Never arm during the opening. Require an outside -> inside approach.
      if(!available)armed=false;
      else if(!near())armed=true;
      if(!wasAvailable&&near())armed=false;
    }
    wasAvailable=available;
    if(phase){
      elapsed+=dt;const t=Math.min(elapsed/duration,1);
      smoke.forEach(effect=>effect.update(t));groundSmoke.update(t);
      // Match the car's swap threshold, while the smoke is almost fully opaque.
      if(t>=.42&&!swapped){
        swapped=true;
        if(phase==='enter'){player.setVisible(false);syncPosition();train.root.visible=true;leaf.visible=true;}
        else {train.root.visible=false;leaf.visible=false;access.land(train.root.position.z);player.tanuki.rotation.y=direction<0?Math.PI:0;player.setVisible(true);}
      }
      if(t===1){
        const exiting=phase==='exit';phase=null;smoke.forEach(effect=>effect.root.visible=false);groundSmoke.root.visible=false;
        if(exiting){active=false;automaticTrain.root.visible=true;player.setWalking(true);}
        keys.clear();
      }
    }else if(active){
      switchElapsed=Math.min(SWITCH_TIME,switchElapsed+dt);
      const t=switchElapsed/SWITCH_TIME;
      const targetSpeed=Math.sign(stage)*TRAIN_SPEEDS[Math.abs(stage)];
      speed=t===1?targetSpeed:THREE.MathUtils.lerp(switchFrom,targetSpeed,t*t*(3-2*t));
      const travel=speed*dt;
      if(travel!==0){
        direction=Math.sign(travel);
        const z=train.root.position.z+travel;
        train.root.position.z=THREE.MathUtils.clamp(z,train.min,train.max);
        if(z<=train.min||z>=train.max){speed=0;stage=0;switchFrom=0;switchElapsed=SWITCH_TIME;}
      }
      syncPosition();
    }
    discover.visible=eligible();
    discover.position.set(point.x,player.height+.65,point.z);
    revert.visible=canRevert();
    revert.position.set(train.root.position.x,5.1,train.root.position.z);
  }
  return {update,point,discover,revert,leaf,seaCar,train,smoke,groundSmoke,get phase(){return phase;},get active(){return active;},get speed(){return speed;},get stage(){return stage;},get direction(){return direction;}};
}
