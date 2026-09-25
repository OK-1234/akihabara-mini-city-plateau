import * as THREE from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';

// Original primitive-built details; no model, texture or image assets.
export const ENTRANCE_DESIGNS=[
  ['general-east-west','A','両開き'],
  ['general-east-east','B','奥まった入口'],
  ['general-east-rear','C','ガラスの風除室'],
  ['general-west-south','D','木枠のショップ'],
  ['general-west-north','E','角の入口'],
  ['outer-east-north','F','小さなオフィス'],
];

export function decorateEntrances(root,configs){
  const colors={wall:0xefefeb,frame:0x677e8d,glass:0x709bb3,wood:0xc5a477,
    sage:0x9bb18a,metal:0xc3ccce,floor:0xd4d5ce,light:0xffedbb};
  const mats=Object.fromEntries(Object.entries(colors).map(([k,color])=>[k,
    new THREE.MeshStandardMaterial({color,roughness:k==='glass'?.45:.85,
      ...(k==='light'?{emissive:color,emissiveIntensity:.35}:{})})]));
  mats.clear=new THREE.MeshStandardMaterial({color:0x8bb7ca,roughness:.4,transparent:true,opacity:.56,depthWrite:false});
  for(const [id,style] of ENTRANCE_DESIGNS){
    const b=configs.find(b=>b.id===id),group=root.getObjectByName(id);
    if(!b||!group)continue;
    const body=group.getObjectByName(id+':body'),old=group.getObjectByName('clean-building-details');
    // Ground-floor details only: retain upper windows, roof, gardens and units.
    for(const m of [...old.children])if(m.position.y<2.1)m.removeFromParent();
    const details=new THREE.Group();details.name='entrance-design';details.userData.style=style;
    group.add(details);
    const batches=new Map(),w=b.width,d=b.depth,f=d/2;
    function add(g,x,y,z,key,angle=0){if(style==='C'&&key==='glass')key='clear';g.rotateY(angle);g.translate(x,y,z);
      if(!batches.has(key))batches.set(key,[]);batches.get(key).push(g);}
    const box=(bw,h,bd,x,y,z,key,angle=0)=>add(new THREE.BoxGeometry(bw,h,bd),x,y,z,key,angle);
    function door(cx,z,width=1.12,double=true,angle=0,frame='frame'){
      // Generate each doorway in its own local frame, including real handles.
      const parts=[];
      function p(bw,h,bd,x,y,dz,key){const g=new THREE.BoxGeometry(bw,h,bd);
        g.translate(x,y,dz);g.rotateY(angle);g.translate(cx,0,z);parts.push([g,key]);}
      p(width,1.64,.045,0,.86,0,'glass');
      for(const x of [-width/2,width/2])p(.065,1.76,.08,x,.88,.02,frame);
      for(const y of [.04,1.72])p(width+.06,.065,.08,0,y,.02,frame);
      if(double)p(.038,1.65,.07,0,.86,.028,frame);
      for(const x of double?[-.085,.085]:[-width/2+.13]){
        p(.035,.30,.035,x,.88,.095,'metal');
        for(const y of [.75,1.01])p(.035,.025,.055,x,y,.06,'metal');
      }
      for(const [g,key] of parts)add(g,0,0,0,key);
    }
    // Physically form the recessed lower wall or clipped corner. Body object,
    // total dimensions and all upper floors remain in place.
    if(['B','C','E'].includes(style)){
      const upper=new THREE.BoxGeometry(w,b.height-2.05,d);
      upper.translate(0,2.05+(b.height-2.05)/2-b.height/2,0);
      let points;
      if(style==='E')points=[[-w/2,-f],[w/2,-f],[w/2,f],[-w/2+.85,f],[-w/2,f-.85]];
      else {const half=style==='C'?.95:.72,depth=style==='C'?.42:.32;
        points=[[-w/2,-f],[w/2,-f],[w/2,f],[half,f],[half,f-depth],[-half,f-depth],[-half,f],[-w/2,f]];}
      const shape=new THREE.Shape();points.forEach(([x,z],i)=>i?shape.lineTo(x,-z):shape.moveTo(x,-z));shape.closePath();
      const lower=new THREE.ExtrudeGeometry(shape,{depth:2.05,bevelEnabled:false});
      lower.rotateX(-Math.PI/2);lower.translate(0,-b.height/2,0);
      const upperFlat=upper.toNonIndexed(),geometry=mergeGeometries([upperFlat,lower]);
      body.geometry.dispose();body.geometry=geometry;upper.dispose();upperFlat.dispose();lower.dispose();
    }
    if(style==='A'){
      box(1.94,1.75,.04,0,.88,f+.025,'glass');door(0,f+.065,1.05);
      for(const x of [-.97,.97])box(.08,1.8,.12,x,.9,f+.07,'wall');
      box(2.12,.15,.32,0,1.88,f+.10,'wall');
    }else if(style==='B'){
      door(0,f-.28,1.29);
      for(const x of [-.79,.79])box(.14,1.9,.38,x,.95,f-.10,'wall');
      box(1.72,.16,.42,0,1.98,f-.08,'wall');
      box(1.4,.02,.31,0,.012,f-.15,'floor');
      box(.20,.025,.10,0,1.90,f-.17,'light');
    }else if(style==='C'){
      // Vestibule fits within the old awning projection, not the walking lane.
      box(1.72,1.65,.025,0,.86,f-.38,'frame');
      door(0,f+.22,1.72);
      for(const x of [-.89,.89]){
        box(.035,1.66,.57,x,.87,f-.065,'glass');
        for(const z of [f-.36,f+.22])box(.055,1.78,.055,x,.89,z,'frame');
      }
      box(1.92,.14,.70,0,1.88,f-.05,'wall');
      box(1.8,.02,.60,0,.012,f-.07,'floor');
    }else if(style==='D'){
      door(.61,f+.055,.65,false,0,'wood');
      box(1.12,1.3,.055,-.40,1.03,f+.055,'glass');
      for(const x of [-1,.2])box(.07,1.62,.09,x,.87,f+.07,'wood');
      for(const y of [.25,1.69])box(1.22,.07,.10,-.4,y,f+.075,'wood');
      box(2.15,.18,.34,0,1.9,f+.10,'sage');
    }else if(style==='E'){
      const angle=-Math.PI/4;
      door(-w/2+.425-.015,f-.425+.015,1.10,false,angle);
      box(1.12,.15,.12,-w/2+.425,1.88,f-.425,'wall',angle);
      box(.65,1.55,.035,-w/2+1.22,.87,f+.025,'glass');
      box(.035,1.55,.65,-w/2-.025,.87,f-1.22,'glass');
    }else{
      door(.17,f+.055,.7,false);
      box(.42,1.68,.035,-.49,.87,f+.025,'glass');
      box(1.35,.14,.28,-.08,1.9,f+.08,'wall');
      box(.15,.25,.11,.79,1.38,f+.065,'frame');
      box(.105,.19,.02,.79,1.38,f+.13,'light');
      box(.23,.1,.035,.79,1.02,f+.025,'metal');
    }
    if(style!=='E'){
      const side=b.roadSide??1;
      box(.035,1.42,Math.min(d-.4,.85),side*(w/2+.02),.88,0,'glass');
    }
    for(const [key,geometries] of batches){
      const geometry=mergeGeometries(geometries);geometries.forEach(g=>g.dispose());
      const mesh=new THREE.Mesh(geometry,mats[key]);mesh.name='entrance-'+key;
      mesh.castShadow=true;mesh.receiveShadow=true;details.add(mesh);
    }
  }
}
