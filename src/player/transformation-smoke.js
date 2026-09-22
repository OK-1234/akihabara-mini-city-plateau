import * as THREE from 'three';

// The original car-transformation puffs, shared without changing their timing or shape.
export function createTransformationSmoke(scene){
  const root=new THREE.Group();scene.add(root);root.visible=false;
  const material=new THREE.MeshBasicMaterial({color:0xffffff,transparent:true,depthWrite:false});
  const geometry=new THREE.SphereGeometry(1,10,8);
  for(let i=0;i<10;i++)root.add(new THREE.Mesh(geometry,material));
  function update(t){
    material.opacity=Math.sin(Math.PI*t);
    root.children.forEach((p,i)=>{const a=i*Math.PI*2/10;p.position.set(Math.cos(a)*(.28+t*.95),.4+(i%3)*.3+t*.45,Math.sin(a)*(.28+t*.95));p.scale.setScalar(.42+Math.sin(Math.PI*t)*.4);});
  }
  return {root,update};
}
