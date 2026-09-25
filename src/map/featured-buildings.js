import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

// Local roof positions: paired units share Z and face the same direction.
// Select spacious ordinary roofs, leaving the remaining skyline unchanged.
const roofs=[
  {id:'general-west-north',x:-1.02,z:-.9,roomZ:-1,ivory:true},
  {id:'general-east-west',x:-.6,z:0,roomZ:1.2},
  {id:'general-west-south',x:-.45,z:-.8,roomZ:1.1},
  {id:'general-east-rear',x:-.8,z:-.65,roomZ:-.8,ivory:true},
  {id:'outer-east-north',x:-.55,z:0},
];
// Keep the original facades, parapets and roof gardens; exclude Yodobashi.
export function decorateFeaturedBuildings(root, configs) {
  const palette={ivory:0xf0e9da,white:0xf4f3ee,frame:0x6b7e8b,
    roof:0xbec6ce,metal:0xa4adb5,dark:0x465762};
  const materials=Object.fromEntries(Object.entries(palette).map(([key,color])=>
    [key,new THREE.MeshStandardMaterial({color,roughness:.85})]));
  for(const {id,x:unitX,z:unitZ,roomZ,ivory} of roofs) {
    const b=configs.find(b=>b.id===id),group=root.getObjectByName(id);
    if(!b||!group)continue;
    // Only retire the old plain equipment cubes, preserving all greenery.
    const oldUnits=[];
    group.traverse(child=>{if(child.name==='roof-unit')oldUnits.push(child);});
    oldUnits.forEach(child=>child.removeFromParent());
    const batches=new Map();
    function put(g,x,y,z,key,rotation=0){
      g.rotateX(rotation);g.translate(x,y,z);
      if(!batches.has(key))batches.set(key,[]);batches.get(key).push(g);
    }
    const box=(w,h,d,x,y,z,key)=>put(new THREE.BoxGeometry(w,h,d),x,y,z,key);
    const w=b.width,h=b.height,wall=ivory?'ivory':'white';
    // Roof access room, flush door, handle, and ventilation.
    if(roomZ!==undefined){
    box(.72,.78,.70,w/2-.60,h+.39,roomZ,wall);
    box(.34,.61,.025,w/2-.60,h+.32,roomZ+.36,'frame');
    box(.035,.09,.035,w/2-.49,h+.32,roomZ+.383,'metal');
    box(.80,.07,.78,w/2-.60,h+.815,roomZ,'white');
    }
    for(let unit=0;unit<2;unit++) {
      const x=unitX+unit*.80,z=unitZ;
      box(.66,.10,.64,x,h+.095,z,'metal');
      box(.58,.45,.50,x,h+.37,z,'white');
      put(new THREE.CylinderGeometry(.185,.185,.018,16),x,h+.37,z+.258,'dark',Math.PI/2);
      for(let i=0;i<7;i++)box(.29,.016,.021,x,h+.24+i*.041,z+.275,'metal');
      box(.43,.025,.34,x,h+.61,z,'roof');
    }
    const details=new THREE.Group();details.name='featured-building-details';group.add(details);
    for(const [key,geometries] of batches) {
      const geometry=mergeGeometries(geometries);
      geometries.forEach(g=>g.dispose());
      const mesh=new THREE.Mesh(geometry,materials[key]);mesh.name='featured-'+key;
      mesh.castShadow=true;mesh.receiveShadow=true;details.add(mesh);
    }
  }
}
