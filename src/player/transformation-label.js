import * as THREE from 'three';

export function createTransformationLabel(scene,text,thought=false) {
    const canvas=document.createElement('canvas');canvas.width=512;canvas.height=256;
    const ctx=canvas.getContext('2d');ctx.fillStyle='rgba(255,255,255,.96)';
    if(thought) {
      for(const [x,y,r] of [[130,109,52],[204,70,55],[290,65,55],[368,108,54],[255,125,86],[159,203,15],[139,231,8]]) {ctx.beginPath();ctx.arc(x,y,r,0,Math.PI*2);ctx.fill();}
      ctx.textAlign='center';ctx.fillStyle='#bd3c39';ctx.font='bold 76px sans-serif';ctx.fillText('!',256,108);
    } else {ctx.beginPath();ctx.roundRect(85,88,342,85,35);ctx.fill();}
    ctx.fillStyle='#344047';ctx.textAlign='center';ctx.font='bold 33px sans-serif';ctx.fillText(text,256,thought?157:142);
    const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;
    const sprite=new THREE.Sprite(new THREE.SpriteMaterial({map:texture,depthTest:false,depthWrite:false}));
    sprite.scale.set(2.25,1.125,1);sprite.renderOrder=20;scene.add(sprite);sprite.visible=false;return sprite;
  }
