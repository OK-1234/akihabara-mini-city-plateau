import * as THREE from 'three';
import { WIDTH, Z_EDGES } from './world.js';
import { WASH, shoreOffset, washEdge, washFootprint } from './coast-dynamics.js';

// All patterns and the paw mask are generated here; no external artwork or shaders.
export function createCoast(root, world) {
  const time={value:0}, shore=x=>Z_EDGES[1]+shoreOffset(x);
  // Three independent, seeded pigment masks. Soft overlapping dabs are baked
  // once, so multiple moving colour layers need texture samples, not particles.
  const glazeCanvas=document.createElement('canvas');glazeCanvas.width=glazeCanvas.height=512;
  const paint=glazeCanvas.getContext('2d');paint.fillStyle='#000';paint.fillRect(0,0,512,512);
  let randomState=7319;
  const random=()=>{randomState=(Math.imul(randomState,1664525)+1013904223)>>>0;return randomState/4294967296;};
  paint.globalCompositeOperation='lighter';
  for(let channel=0;channel<3;channel++)for(let i=0;i<(channel===0?230:900);i++){
    const x=random()*512,y=random()*512,r=channel===0?5+random()*18:1.2+random()**2*6;
    const rgb=['210,0,0','0,190,0','0,0,180'][channel],alpha=.12+random()*.5;
    // Wrap every dab, avoiding seams at texture boundaries.
    for(const ox of [-512,0,512])for(const oy of [-512,0,512]){
      if(x+ox+r<0||x+ox-r>512||y+oy+r<0||y+oy-r>512)continue;
      const g=paint.createRadialGradient(x+ox,y+oy,0,x+ox,y+oy,r);
      g.addColorStop(0,`rgba(${rgb},${alpha})`);g.addColorStop(.45,`rgba(${rgb},${alpha*.7})`);g.addColorStop(1,`rgba(${rgb},0)`);
      paint.fillStyle=g;paint.fillRect(x+ox-r,y+oy-r,r*2,r*2);
    }
  }
  const glazeTexture=new THREE.CanvasTexture(glazeCanvas);glazeTexture.wrapS=glazeTexture.wrapT=THREE.RepeatWrapping;
  // Project-authored lookup replacement for the unverified sine/dot hash.
  // Reuse the existing seeded generator after painting so pigment dabs stay
  // identical. Two independent bytes per cell provide repeatable [0,1) values;
  // nearest sampling preserves discrete cells and works at negative coordinates.
  const seedBytes=new Uint8Array(256*256*4);
  for(let i=0;i<seedBytes.length;i+=4){
    seedBytes[i]=Math.floor(random()*256);
    seedBytes[i+1]=Math.floor(random()*256);
    seedBytes[i+3]=255;
  }
  const seedTexture=new THREE.DataTexture(seedBytes,256,256,THREE.RGBAFormat);
  seedTexture.wrapS=seedTexture.wrapT=THREE.RepeatWrapping;
  seedTexture.magFilter=seedTexture.minFilter=THREE.NearestFilter;
  seedTexture.generateMipmaps=false;seedTexture.needsUpdate=true;
  const coastUniforms={coastTime:time,glazeTex:{value:glazeTexture},seedTex:{value:seedTexture}};
  const common=`
    uniform float coastTime;
    uniform sampler2D glazeTex;
    uniform sampler2D seedTex;
    float coastLine(float x){return ${Z_EDGES[1].toFixed(6)}+.9+.95*exp(-pow(x+8.,2.)/30.)-.7*exp(-pow(x-2.,2.)/22.)+.55*exp(-pow(x-12.,2.)/16.);}
    float edgeAt(float x){return ${WASH.mean}+${WASH.amplitude}*sin(coastTime*${WASH.speed}+x*${WASH.along})+.13*sin(x*2.4+coastTime*.24)+.065*sin(x*5.7-coastTime*.18);}
    vec2 seed(vec2 p){return texture2D(seedTex,(mod(floor(p),256.)+.5)/256.).rg*(255./256.);}
    float pigment(vec2 p){vec2 b=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(seed(b).x,seed(b+vec2(1,0)).x,f.x),mix(seed(b+vec2(0,1)).x,seed(b+1.).x,f.x),f.y);}
    vec2 cellInfo(vec2 p){
      vec2 b=floor(p),f=fract(p);float a=8.,c=8.;
      for(int y=-1;y<=1;y++)for(int x=-1;x<=1;x++){
        vec2 o=vec2(float(x),float(y)),h=seed(b+o);
        vec2 v=o+.5+.36*sin(6.283*h+coastTime*.32)-f;
        float r=dot(v,v);if(r<a){c=a;a=r;}else c=min(c,r);
      }return vec2(sqrt(c)-sqrt(a),sqrt(a));
    }
    float crest(float d,float x){float p=d*2.0-coastTime*.85+.55*sin(x*.63)+.17*sin(x*2.3);return pow(.5+.5*sin(p),5.);}
    // Restore the photographed foam rhythm independently of the water colours.
    float foamCrest(float d,float x){float p=d*2.5-coastTime*1.1+.28*sin(x*.9)+.09*sin(x*4.1);return pow(.5+.5*sin(p),9.);}
  `;
  function waterColor(){return `
    float d=p.y-coastLine(p.x),edge=edgeAt(p.x);
    vec2 flow=p+vec2(.22*sin(p.y*3.1+coastTime*.55)+.065*sin(p.x*7.+p.y*5.),.20*sin(p.x*3.4-coastTime*.4)+.06*cos(p.y*8.+p.x*4.));
    float brush=pigment(flow*vec2(1.3,2.8)),bloom=pigment(flow*.55);
    vec2 drift=vec2(sin(coastTime*.17),cos(coastTime*.13))*.10;
    vec3 glaze=texture2D(glazeTex,flow/19.+drift*.08).rgb;
    vec3 flecks=texture2D(glazeTex,mat2(.8,-.6,.6,.8)*(p+drift)/11.7-drift*.06+vec2(.31,.67)).rgb;
    vec3 distant=texture2D(glazeTex,flow/27.3+vec2(.61,.19)+drift*.04).rgb;
    float wave=crest(d,p.x);
    vec3 deep=vec3(.003,.12,.44),turquoise=vec3(.006,.49,.64),shallows=vec3(.12,.73,.58);
    vec3 c=mix(deep,turquoise,exp(min(d,0.)*.22));
    c=mix(c,shallows,smoothstep(-5.,.8,d)*.66);
    c*=.88+.14*sin(d*2.5-coastTime*1.1+.24*sin(p.x*.9));
    c=mix(c,c*vec3(.78,1.12,1.09),brush*.55);
    c+=vec3(.07,.19,.16)*(brush*.55+bloom*.3);
    c=mix(c,vec3(.018,.34,.64),glaze.r*.45);
    c=mix(c,vec3(.15,.76,.59),distant.r*.55);
    float clusters=smoothstep(.32,.76,bloom);
    float softLight=(glaze.g*.6+flecks.b*.5+distant.g*.3)*clusters;
    c+=vec3(.19,.35,.26)*softLight;
    c=mix(c,vec3(.44,.81,.73),flecks.g*.40*clusters);
    c+=vec3(.08,.16,.13)*smoothstep(.06,.42,flecks.b)*clusters;
    // Broad, broken refracted strokes under the surface, rather than a lattice.
    float strokes=1.-smoothstep(.035,.25,abs(sin(flow.x*2.8+sin(flow.y*2.1))*sin(flow.y*3.2+sin(flow.x*1.7))));
    c+=vec3(.028,.065,.052)*strokes*smoothstep(.3,.75,brush)*smoothstep(-12.,-1.,d);
    // Rare pale dabs shimmer gently; no uniform white sparkle lattice.
    float sparkle=smoothstep(.22,.62,glaze.b+flecks.g*.28)*(.55+.45*sin(coastTime*.55+p.y*.8));
    c+=vec3(.35,.40,.36)*sparkle*(.14+.35*wave)*clusters;
    vec3 rippleNormal=normalize(vec3(.15*cos(p.x*6.+p.y*3.+coastTime),1.,.24*cos(d*2.5-coastTime*1.1)+.10*cos(p.y*11.-coastTime)));
    float sheen=pow(max(0.,dot(rippleNormal,normalize(vec3(-.18,1.,.26)))),65.);
    c+=vec3(.08,.13,.14)*sheen;
  `;}
  const waterMaterial=new THREE.ShaderMaterial({uniforms:coastUniforms,
    vertexShader:`varying vec2 coastP;void main(){vec4 w=modelMatrix*vec4(position,1.);coastP=w.xz;gl_Position=projectionMatrix*viewMatrix*w;}`,
    fragmentShader:common+`varying vec2 coastP;void main(){vec2 p=coastP;${waterColor()}gl_FragColor=vec4(c,1.);#include <colorspace_fragment>\n}`.replace(';#include',';\n#include'),
    toneMapped:false});
  for(const m of world.children){
    if(m.name.endsWith(':beach'))m.visible=false;
    if(m.name.includes(':sea')||m.name.startsWith('sea:'))m.material=waterMaterial;
  }
  const under=new THREE.Mesh(new THREE.PlaneGeometry(WIDTH,6),waterMaterial);
  under.rotation.x=-Math.PI/2;under.position.set(0,.007,(Z_EDGES[1]+Z_EDGES[2])/2);under.name='shore-water-underlay';root.add(under);

  const shape=new THREE.Shape();shape.moveTo(-WIDTH/2,-Z_EDGES[2]);shape.lineTo(WIDTH/2,-Z_EDGES[2]);
  // Sand continues beneath the entire retreat zone; otherwise a retreating foam
  // edge exposes the blue underlay on its landward side.
  for(let i=160;i>=0;i--){const x=-WIDTH/2+WIDTH*i/160;shape.lineTo(x,-(shore(x)-1.05));}shape.closePath();
  const sandGeometry=new THREE.ShapeGeometry(shape);sandGeometry.rotateX(-Math.PI/2);
  const sandMaterial=new THREE.MeshStandardMaterial({color:0xf3cd89,roughness:.94});
  sandMaterial.onBeforeCompile=shader=>{
    shader.uniforms.coastTime=time;
    shader.uniforms.seedTex=coastUniforms.seedTex;
    shader.vertexShader='varying vec2 coastP;\n'+shader.vertexShader;
    shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\ncoastP=(modelMatrix*vec4(position,1.)).xz;');
    shader.fragmentShader=common+'varying vec2 coastP;\n'+shader.fragmentShader;
    shader.fragmentShader=shader.fragmentShader.replace('#include <color_fragment>',`#include <color_fragment>
      float d=coastP.y-coastLine(coastP.x);
      float grain=seed(floor(coastP*165.)).x;
      float mottle=sin(coastP.x*3.3+sin(coastP.y*2.))*sin(coastP.y*4.7);
      diffuseColor.rgb*=.94+.075*mottle+.13*grain;
      float wet=1.-smoothstep(max(.9,edgeAt(coastP.x)),1.75,d);
      diffuseColor.rgb*=mix(vec3(1.),vec3(.79,.63,.51),wet);
      diffuseColor.rgb+=vec3(.07,.055,.04)*wet*(.5+.5*sin(coastP.y*3.+coastP.x*.7));
    `);
    shader.fragmentShader=shader.fragmentShader.replace('#include <roughnessmap_fragment>',
      '#include <roughnessmap_fragment>\nroughnessFactor=mix(roughnessFactor,.38,wet);');
  };
  sandMaterial.customProgramCacheKey=()=> 'coast-wet-sand-v2';
  const sand=new THREE.Mesh(sandGeometry,sandMaterial);sand.position.y=.025;sand.receiveShadow=true;sand.name='curved-ivory-beach';root.add(sand);

  // A continuous subdivided ribbon: actual raised breakers plus a thin run-up film.
  const positions=[],indices=[],nx=192,nz=48;
  for(let i=0;i<=nx;i++)for(let j=0;j<=nz;j++){
    const x=-WIDTH/2+WIDTH*i/nx,d=-7+9*j/nz;positions.push(x,.045,shore(x)+d);
    if(i<nx&&j<nz){const n=i*(nz+1)+j;indices.push(n,n+1,n+nz+1,n+1,n+nz+2,n+nz+1);}
  }
  const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));geometry.setIndex(indices);
  geometry.computeBoundingSphere();geometry.boundingSphere.radius+=.4;
  const washMaterial=new THREE.ShaderMaterial({uniforms:coastUniforms,transparent:true,depthWrite:false,side:THREE.DoubleSide,toneMapped:false,
    vertexShader:common+`varying vec2 coastP;varying float lift;void main(){
      vec3 pos=position;coastP=pos.xz;float d=pos.z-coastLine(pos.x);
      lift=foamCrest(d,pos.x)*.18*(1.-smoothstep(-.5,.4,d));
      pos.y+=lift;gl_Position=projectionMatrix*modelViewMatrix*vec4(pos,1.);
    }`,
    fragmentShader:common+`varying vec2 coastP;varying float lift;void main(){vec2 p=coastP;${waterColor()}
      float behind=edge-d;
      float film=smoothstep(0.,.07,behind);
      vec2 bubbles=cellInfo(flow*4.8);
      float lace=1.-smoothstep(.04,.18,abs(bubbles.y-(.18+.11*brush)));
      float puff=1.-smoothstep(.12,.42,bubbles.y);
      float cloud=pigment(flow*vec2(6.,9.));
      float rim=(1.-smoothstep(.18,.42+.5*cloud,behind))*(.9+.1*cloud);
      float broken=smoothstep(.60,.94,foamCrest(d,p.x))*(1.-smoothstep(-.35,.1,d));
      float patches=.5+.5*sin(p.x*8.+sin(d*13.))*sin(d*11.-coastTime*.7);
      float froth=max(rim*(.84+.16*max(lace,puff)),broken*(.4+.6*max(cloud,puff))*(.65+.35*patches));
      froth=max(froth,lace*.48*patches*smoothstep(.18,.4,behind)*(1.-smoothstep(.7,1.7,behind)));
      // Both colour and opacity follow the moving front, never a fixed world band.
      vec3 filmColor=vec3(.63,.48,.30)+vec3(.055,.07,.06)*brush;
      float shallow=1.-smoothstep(.25,1.3,behind);
      c=mix(c,vec3(.19,.69,.52), (1.-smoothstep(.7,2.2,behind))*.65);
      c=mix(c,filmColor,shallow);
      vec3 foamLight=mix(vec3(.66,.82,.83),vec3(1.),.65+.35*patches);
      c=mix(c,foamLight,smoothstep(.08,.85,froth));
      c+=lift*.22;
      float fade=smoothstep(-7.,-5.,d);
      float alpha=fade*film*mix(1.,.30,shallow);
      alpha=max(alpha,froth*fade*.98*film);
      if(alpha<.01)discard;
      gl_FragColor=vec4(c,alpha);
      #include <colorspace_fragment>
    }`});
  const wash=new THREE.Mesh(geometry,washMaterial);wash.name='shore-foam';wash.renderOrder=3;root.add(wash);

  const canvas=document.createElement('canvas');canvas.width=canvas.height=64;
  const ctx=canvas.getContext('2d');
  for(const [x,y,rx,ry] of [[32,39,13,15],[16,20,6,7],[30,14,6,7],[44,19,6,7]]){
    const g=ctx.createRadialGradient(x,y,0,x,y,Math.max(rx,ry));g.addColorStop(0,'rgba(92,65,35,.8)');g.addColorStop(.7,'rgba(105,75,42,.65)');g.addColorStop(1,'rgba(105,75,42,0)');
    ctx.fillStyle=g;ctx.beginPath();ctx.ellipse(x,y,rx,ry,0,0,Math.PI*2);ctx.fill();
  }
  const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;
  const pawGeometry=new THREE.PlaneGeometry(.28,.34);pawGeometry.rotateX(-Math.PI/2);
  const count=96, strength=new THREE.InstancedBufferAttribute(new Float32Array(count),1);strength.setUsage(THREE.DynamicDrawUsage);pawGeometry.setAttribute('pawStrength',strength);
  const pawMaterial=new THREE.MeshBasicMaterial({map:texture,transparent:true,depthWrite:false,toneMapped:false});
  pawMaterial.onBeforeCompile=shader=>{
    shader.vertexShader='attribute float pawStrength;varying float vPaw;\n'+shader.vertexShader;
    shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nvPaw=pawStrength;');
    shader.fragmentShader='varying float vPaw;\n'+shader.fragmentShader;
    shader.fragmentShader=shader.fragmentShader.replace('#include <color_fragment>','#include <color_fragment>\ndiffuseColor.a*=vPaw;');
  };
  const paws=new THREE.InstancedMesh(pawGeometry,pawMaterial,count);paws.name='sand-footprints';paws.frustumCulled=false;paws.renderOrder=2;root.add(paws);
  const marks=Array.from({length:count},()=>({strength:0,distance:0,x:0,age:0}));
  const matrix=new THREE.Object3D(),last=new THREE.Vector3();let clock=0,index=0,hasLast=false,stride=0;
  function update(dt,player,walking=true){
    dt=Math.max(0,Math.min(dt,.05));clock+=dt;time.value=clock;
    const p=player?.position,eligible=p&&walking&&Math.abs(player.groundHeight??0)<.05&&p.x>-WIDTH/2+.2&&p.x<WIDTH/2-.2&&p.z>shore(p.x)+.02&&p.z<Z_EDGES[2]-.12;
    if(eligible){
      if(hasLast){
        const dx=p.x-last.x,dz=p.z-last.z,travel=Math.hypot(dx,dz);stride+=travel;
        if(travel>1){stride=0;} // Teleports must never draw a trail across the map.
        else if(stride>=.34){
          const angle=Math.atan2(dx,dz),side=index%2?1:-1;
          const x=p.x+Math.cos(angle)*.13*side,z=p.z-Math.sin(angle)*.13*side;
          const distance=z-shore(x);
          if(distance>0&&z<Z_EDGES[2]&&distance>washEdge(x,clock)){
            const slot=index%count;marks[slot]={x,distance,strength:1,age:0};
            // Canvas toes face -Z after rotating the plane onto the ground.
            matrix.position.set(x,.034,z);matrix.rotation.set(0,angle+Math.PI,0);matrix.updateMatrix();paws.setMatrixAt(slot,matrix.matrix);paws.instanceMatrix.needsUpdate=true;index++;
          }stride=0;
        }
      }last.copy(p);hasLast=true;
    }else{hasLast=false;stride=0;}
    for(let i=0;i<count;i++){
      const mark=marks[i];if(mark.strength<=0)continue;
      mark.age+=dt;washFootprint(mark,washEdge(mark.x,clock),dt);
      // Untouched prints persist for two minutes, then weather independently.
      if(mark.age>120)mark.strength=Math.max(0,mark.strength-dt*.035);
      strength.setX(i,mark.strength);
    }strength.needsUpdate=true;
  }
  return {update,shore,marks,get time(){return clock;}};
}
