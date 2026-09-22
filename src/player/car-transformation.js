import * as THREE from 'three';
import { createTransformationLabel } from './transformation-label.js';
import { createOuterDriveRoute } from './outer-drive-route.js';
import { createTransformationSmoke } from './transformation-smoke.js';

export const CAR_SETTINGS={range:1.7,initialSpeed:5,maxSpeed:8,lowSpeed:.85,reverseSpeed:.35,reverseDistance:1.5,switchTime:.25,stopSpeed:0,duration:.65};

// One reusable appearance; the parked car and all shared GLB materials stay intact.
export function createCarTransformation(scene,player,camera,target,isAvailable=()=>true) {
  const initial={position:target.position.clone(),quaternion:target.quaternion.clone(),visible:target.visible};
  target.updateWorldMatrix(true,true);
  const targetBounds=new THREE.Box3().setFromObject(target,true);
  const car=new THREE.Group();car.name='tanuki-car';
  const appearance=target.clone(true);appearance.position.set(0,0,0);appearance.quaternion.identity();
  car.add(appearance);scene.add(car);car.updateMatrixWorld(true);
  const box=new THREE.Box3().setFromObject(car,true),size=box.getSize(new THREE.Vector3()),center=box.getCenter(new THREE.Vector3());
  appearance.position.set(-center.x,-box.min.y,-center.z);
  let sourceLeaf;
  player.model.traverse(o=>{if(o.name.startsWith('Leaf_CTRL_'))sourceLeaf=o;});
  if(!sourceLeaf)throw new Error('タヌキの葉っぱが見つかりません');
  sourceLeaf.updateWorldMatrix(true,true);
  const leaf=sourceLeaf.clone(true);
  sourceLeaf.matrixWorld.decompose(leaf.position,leaf.quaternion,leaf.scale);
  leaf.position.set(0,0,0);car.add(leaf);car.updateMatrixWorld(true);
  const leafBounds=new THREE.Box3().setFromObject(leaf,true),leafCenter=leafBounds.getCenter(new THREE.Vector3());
  leaf.position.set(-leafCenter.x,size.y+.04-leafBounds.min.y,-leafCenter.z);
  car.visible=false;

  const discover=createTransformationLabel(scene,'E：化ける',true),revert=createTransformationLabel(scene,'E：元に戻る');
  const smokeEffect=createTransformationSmoke(scene),smoke=smokeEffect.root;
  const keys=new Set(),controls=new Set(['KeyW','KeyS','KeyA','KeyD','ArrowUp','ArrowDown','ArrowLeft','ArrowRight']);
  let mode='walk',speed=0,heading=0,elapsed=0,entering=false,swapped=false;
  let stage=0,switchFrom=0,switchElapsed=0,reverseRemaining=0;
  const stageSpeed=()=>stage===-1?-CAR_SETTINGS.reverseSpeed:[0,CAR_SETTINGS.lowSpeed,CAR_SETTINGS.initialSpeed,CAR_SETTINGS.maxSpeed][stage];
  function changeStage(next){stage=next;switchFrom=speed;switchElapsed=0;if(next===-1)reverseRemaining=CAR_SETTINGS.reverseDistance;}
  const route=createOuterDriveRoute();let distance=0,entry=null,entryDistance=0,entryLength=0;
  const drivingPosition=new THREE.Vector3(),nearest=new THREE.Vector3();
  function nearCar(){nearest.copy(player.position);nearest.y=targetBounds.min.y;targetBounds.clampPoint(nearest,nearest);return Math.hypot(player.position.x-nearest.x,player.position.z-nearest.z)<=CAR_SETTINGS.range;}
  function begin(toCar){
    entering=toCar;mode='smoke';elapsed=0;swapped=false;speed=0;keys.clear();player.setWalking(false);
    drivingPosition.copy(player.position);drivingPosition.y=0;
    if(toCar){
      const nearest=route.nearest(drivingPosition);distance=nearest+3.5;
      const tangent=route.tangent(nearest),end=route.point(distance),endTangent=route.tangent(distance);
      entry=new THREE.CubicBezierCurve3(drivingPosition.clone(),drivingPosition.clone().addScaledVector(tangent,1.2),end.clone().addScaledVector(endTangent,-1.2),end);
      entry.arcLengthDivisions=200;entryLength=entry.getLength();entryDistance=0;
      heading=Math.atan2(tangent.x,tangent.z);
    }
    smoke.position.copy(drivingPosition);smoke.visible=true;discover.visible=false;revert.visible=false;
  }
  window.addEventListener('keydown',event=>{
    if(!isAvailable())return;
    if(controls.has(event.code)&&mode!=='walk'){
      event.preventDefault();
      if(mode==='car'&&!event.repeat&&!keys.has(event.code)){
        keys.add(event.code);
        if(event.code==='ArrowUp')changeStage(stage===-1?0:Math.min(3,stage+1));
        if(event.code==='ArrowDown'){
          if(stage===3)changeStage(2);
          else if(stage===1||stage===2)changeStage(0);
          else if(stage===0&&speed===0)changeStage(-1);
        }
      }
    }
    if(event.code==='KeyE'&&!event.repeat){
      if(mode==='walk'&&nearCar())begin(true);
      else if(mode==='car'&&Math.abs(speed)<=CAR_SETTINGS.stopSpeed)begin(false);
    }
  });
  window.addEventListener('keyup',event=>keys.delete(event.code));
  window.addEventListener('blur',()=>keys.clear());
  document.addEventListener('visibilitychange',()=>{if(document.hidden)keys.clear();});
  function update(dt){
    if(!isAvailable()){discover.visible=false;revert.visible=false;return;}
    if(mode==='smoke'){
      elapsed+=dt;const t=Math.min(elapsed/CAR_SETTINGS.duration,1);
      smokeEffect.update(t);
      if(t>=.42&&!swapped){
        swapped=true;player.setVisible(!entering);car.visible=entering;
        if(entering){target.visible=false;car.position.copy(drivingPosition);car.rotation.y=heading-Math.PI/2;}
        else {target.position.copy(initial.position);target.quaternion.copy(initial.quaternion);target.visible=initial.visible;player.setPosition(drivingPosition);player.tanuki.rotation.y=heading;}
      }
      if(t>=1){mode=entering?'car':'walk';smoke.visible=false;player.setWalking(!entering);if(entering){stage=2;speed=CAR_SETTINGS.initialSpeed;switchFrom=speed;switchElapsed=CAR_SETTINGS.switchTime;}}
    } else if(mode==='car'){
      switchElapsed=Math.min(CAR_SETTINGS.switchTime,switchElapsed+dt);
      const t=switchElapsed/CAR_SETTINGS.switchTime;
      speed=THREE.MathUtils.lerp(switchFrom,stageSpeed(),t*t*(3-2*t));
      let travel=speed*dt,tangent;
      if(travel<0){
        const allowed=Math.min(-travel,reverseRemaining,entry?entryDistance:Infinity);
        travel=-allowed;reverseRemaining=Math.max(0,reverseRemaining-allowed);
        if(reverseRemaining<=1e-8||(entry&&entryDistance+travel<=1e-8)){speed=0;changeStage(0);}
      }
      if(entry){
        entryDistance+=travel;
        if(entryDistance<entryLength){drivingPosition.copy(entry.getPointAt(entryDistance/entryLength));tangent=entry.getTangentAt(entryDistance/entryLength);travel=0;}
        else {travel=entryDistance-entryLength;entry=null;}
      }
      if(!entry){distance=(distance+travel)%route.length;drivingPosition.copy(route.point(distance));tangent=route.tangent(distance);}
      heading=Math.atan2(tangent.x,tangent.z);
      player.setPosition(drivingPosition);car.position.copy(drivingPosition);car.rotation.y=heading-Math.PI/2;
    }
    const zoomTarget=(mode==='car'||(mode==='smoke'&&entering))?1/1.12:1;
    camera.zoom=THREE.MathUtils.damp(camera.zoom,zoomTarget,7,dt);camera.updateProjectionMatrix();
    discover.visible=mode==='walk'&&nearCar();revert.visible=mode==='car'&&Math.abs(speed)<=CAR_SETTINGS.stopSpeed;
    discover.position.set(player.position.x,player.height+.65,player.position.z);
    revert.position.set(player.position.x,size.y+.8,player.position.z);
  }
  return {update,car,leaf,route,get mode(){return mode;},get speed(){return speed;},get stage(){return stage;},get heading(){return heading;},discover,revert};
}
