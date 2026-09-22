import * as THREE from 'three';
import { ELEVATION } from './world.js';
import { PLAYER_RADIUS, WALL_THICKNESS } from './deck-test.js';

// Match the reference: descend west, perpendicular to the vertical railway.
export function createViaductAccess(scene,viaduct){
  const deck=new THREE.Box3().setFromObject(scene.getObjectByName('vertical-deck-3'),true);
  const horizontal=new THREE.Box3().setFromObject(scene.getObjectByName('horizontal-deck-3'),true);
  const width=1.6,x=deck.min.x-width/2,z=deck.min.z+width/2;
  const topX=deck.min.x-width,bottomX=topX-4.2;
  const root=new THREE.Group();root.name='sea-viaduct-stairs';scene.add(root);
  const floor=scene.getObjectByName('vertical-deck-3').material;
  const wall=scene.getObjectByName('east-wall').material;
  function box(w,h,d,px,py,pz,material,name){const m=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),material);m.position.set(px,py,pz);m.name=name;m.castShadow=true;m.receiveShadow=true;root.add(m);return m;}
  box(width,.2,width,x,ELEVATION-.1,z,floor,'stair-top-landing');
  const steps=14,run=4.2/steps;
  for(let i=0;i<steps;i++){
    const h=ELEVATION*(steps-i)/steps,px=topX-(i+.5)*run;
    box(run,h,width,px,h/2,z,floor,'stair-step');
    for(const side of [-1,1])box(run,.35,WALL_THICKNESS,px,h+.175,z+side*(width-WALL_THICKNESS)/2,wall,'stair-side-wall');
  }
  box(.6,.02,width,bottomX-.3,.01,z,floor,'stair-bottom-landing');
  for(const side of [-1,1])box(width,.35,WALL_THICKNESS,x,ELEVATION+.175,z+side*(width-WALL_THICKNESS)/2,wall,side===-1?'landing-sea-wall':'landing-road-wall');
  const radius=PLAYER_RADIUS,margin=radius+WALL_THICKNESS;
  // Use the existing track surfaces as ground when crossing rails on the deck.
  const tracks=viaduct.root.children.filter(object=>object.name==='real-track');
  const groundRay=new THREE.Raycaster(new THREE.Vector3(),new THREE.Vector3(0,-1,0),0,1);
  function deckHeight(px,pz){
    groundRay.ray.origin.set(px,ELEVATION+1,pz);
    return Math.max(ELEVATION,groundRay.intersectObjects(tracks,true)[0]?.point.y??ELEVATION);
  }
  const laneMin=z-width/2+margin,laneMax=z+width/2-margin;
  const openingMin=deck.min.z+margin,openingMax=viaduct.openingEnd-radius;
  function surfaceHeight(px){return px>=topX?ELEVATION:px<=bottomX?0:Math.ceil((px-bottomX)/run-1e-8)*ELEVATION/steps;}
  function mount(player){
    let elevated=false,onStairs=false,smoothing=false,cameraHeight=player.groundHeight;const previous=player.position.clone();
    const valid=(px,pz)=>
      (px>=deck.min.x+margin&&px<=deck.max.x-margin&&pz>=deck.min.z+margin&&pz<=horizontal.max.z-margin)||
      (px>=horizontal.min.x+margin&&px<=horizontal.max.x-margin&&pz>=horizontal.min.z+margin&&pz<=horizontal.max.z-margin)||
      (px>=topX&&px<=deck.min.x+margin&&pz>=openingMin&&pz<=openingMax)||
      (px>=bottomX-.6&&px<=topX+margin&&pz>=laneMin&&pz<=laneMax);
    function land(z){elevated=true;onStairs=false;smoothing=false;player.setPosition(new THREE.Vector3(-.99,0,THREE.MathUtils.clamp(z,deck.min.z+margin,deck.max.z-radius)));player.setGroundHeight(ELEVATION);previous.copy(player.position);}
    function update(){
      const p=player.position.clone();
      if(!elevated){
        if(p.z>=laneMin&&p.z<=laneMax&&p.x>=bottomX-.5&&p.x<=bottomX+.1&&previous.x<=bottomX+.1)elevated=true;
        else {previous.copy(p);return;}
      }
      // Axis-by-axis sliding prevents falling off edges but leaves the opening connected.
      let px=previous.x,pz=previous.z;
      if(valid(p.x,pz))px=p.x;
      if(valid(px,p.z))pz=p.z;
      p.set(px,0,pz);player.setPosition(p);
      onStairs=px<deck.min.x+margin&&pz<horizontal.min.z;
      player.setGroundHeight(onStairs?surfaceHeight(px):deckHeight(px,pz));
      if(onStairs&&px<=bottomX&&pz>=laneMin&&pz<=laneMax){elevated=false;onStairs=false;player.setGroundHeight(0);}
      previous.copy(player.position);
    }
    function updateCamera(dt){
      if(onStairs)smoothing=true;
      if(smoothing){
        cameraHeight=THREE.MathUtils.damp(cameraHeight,player.groundHeight,8,dt);
        if(!onStairs&&Math.abs(cameraHeight-player.groundHeight)<.001){cameraHeight=player.groundHeight;smoothing=false;}
      }else cameraHeight=player.groundHeight;
      return cameraHeight;
    }
    return {land,update,updateCamera,get elevated(){return elevated;}};
  }
  return {root,mount,x,z,width,topX,bottomX,openingMin,openingMax,laneMin,laneMax,deck,horizontal};
}
