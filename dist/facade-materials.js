import * as THREE from './vendor/three.module.min.js';
import {seeded} from './world-data.js?v=clarity-5';

// Four floors and bays per atlas break the one-identical-window repetition.
// Photos supply masonry grain; window masks keep glass smooth and reflective.
export function createFacadeLibrary(){
  const records=[],materials=[],families=['stucco','brick','stucco','glass','glass','stucco','deco','house'];let photos={};
  const colours=['#c4b49e','#a18169','#b3c1bc','#577586','#405a70','#b58e76','#b5ad98','#c4b490'];
  for(let family=0;family<8;family++)for(let variant=0;variant<3;variant++){
    const canvases=Array.from({length:4},(_,index)=>{const c=document.createElement('canvas');c.width=c.height=index===0?1024:512;return c;}),textures=canvases.map(c=>{const t=new THREE.CanvasTexture(c);t.wrapS=t.wrapT=THREE.RepeatWrapping;t.anisotropy=8;return t;});textures[0].colorSpace=THREE.SRGBColorSpace;
    const material=new THREE.MeshStandardMaterial({map:textures[0],roughnessMap:textures[1],bumpMap:textures[2],bumpScale:.035,roughness:.95,metalness:families[family]==='glass'?.32:.05,emissiveMap:textures[3],emissive:0xf6d4a0,emissiveIntensity:0});material.userData.facadeCell=[13.2,14];
    records.push({family,variant,canvases,textures,material});materials.push(material);
  }
  function paint(record){
    const {family,variant,canvases,textures}=record,kind=families[family],random=seeded(702+family*29+variant*107),[ctx,rough,bump,light]=canvases.map(c=>c.getContext('2d'));
    const scale=canvases[0].width/512;ctx.setTransform(scale,0,0,scale,0,0);
    ctx.fillStyle=colours[family];ctx.fillRect(0,0,512,512);rough.fillStyle='#eeeeee';rough.fillRect(0,0,512,512);bump.fillStyle='#888888';bump.fillRect(0,0,512,512);light.fillStyle='#000';light.fillRect(0,0,512,512);
    const photo=photos[kind==='brick'?'brick':kind==='deco'?'concrete':'plaster'];
    if(photo&&kind!=='glass'){
      ctx.globalAlpha=.82;for(let x=0;x<512;x+=128)for(let y=0;y<512;y+=128){ctx.drawImage(photo,x,y,128,128);bump.drawImage(photo,x,y,128,128);}ctx.globalAlpha=1;
      ctx.globalCompositeOperation='multiply';ctx.fillStyle=variant===0?colours[family]:variant===1?'#c9c1b4':'#a6b4b9';ctx.fillRect(0,0,512,512);ctx.globalCompositeOperation='source-over';
    }
    // Noise, faded panels, rain marks and a darker plinth are deliberately
    // irregular across an atlas, instead of repeated on every single window.
    for(let i=0;i<1100;i++){const x=random()*512,y=random()*512;ctx.fillStyle=random()>.5?'#10232a0d':'#fff5de14';ctx.fillRect(x,y,1+random()*4,1+random()*2);}
    for(let row=0;row<4;row++)for(let col=0;col<4;col++){
      const ox=col*128,oy=row*128,glass=kind==='glass',deco=kind==='deco';
      const w=glass?120:deco?30:kind==='house'?82:variant===2?58:75,h=glass?122:kind==='house'?62:84,x=ox+(128-w)/2,y=oy+(kind==='house'?30:19);
      const frame=variant===1?'#393b36':kind==='brick'?'#b7a991':'#d0cbbd';
      if(!glass){ctx.fillStyle='#21313b55';ctx.fillRect(x+2,y+4,w+4,h+3);ctx.fillStyle=frame;ctx.fillRect(x-3,y-3,w+6,h+6);ctx.fillStyle='#192d35';ctx.fillRect(x,y,w,h);}
      const gradient=ctx.createLinearGradient(x,y,x+w,y+h);gradient.addColorStop(0,glass?'#819ca9':'#4b6573');gradient.addColorStop(.45,glass?'#456273':'#2b3d47');gradient.addColorStop(1,glass?'#273e55':'#6b7b7e');ctx.fillStyle=gradient;ctx.fillRect(x,y,w,h);
      rough.fillStyle=glass?'#3e3e3e':'#555555';rough.fillRect(x,y,w,h);bump.fillStyle='#888888';bump.fillRect(x-3,y-3,w+6,h+6);
      if(random()>.45){ctx.fillStyle=random()>.5?'#b9b3a0ad':'#18252b99';const down=h*(.15+random()*.65);ctx.fillRect(x+2,y+1,w-4,down);for(let i=3;i<down;i+=5){ctx.fillStyle='#3a3d381c';ctx.fillRect(x+2,y+i,w-4,1);}}
      ctx.fillStyle=frame;ctx.fillRect(x+w/2-1,y,2,h);if(!deco)ctx.fillRect(x,y+h*.55,w,2);
      if(glass){ctx.fillStyle='#192b3655';ctx.fillRect(ox+125,oy,3,128);ctx.fillRect(ox,oy+125,128,3);}
      else{ctx.fillStyle=frame;ctx.fillRect(x-5,y+h+3,w+10,4);ctx.fillStyle='#26302b1c';ctx.fillRect(x-2,y+h+7,3,13+random()*17);ctx.fillRect(x+w-2,y+h+7,2,10+random()*20);}
      if(kind==='house'){ctx.fillStyle=['#465f52','#72766a','#6e5046'][variant];ctx.fillRect(x-12,y-3,7,h+6);ctx.fillRect(x+w+5,y-3,7,h+6);}
      if(random()>.66){light.fillStyle=random()>.5?'#c9975b':'#ebe0bd';light.fillRect(x+2,y+2,w-4,h-4);}
    }
    textures.forEach(t=>t.needsUpdate=true);
  }
  records.forEach(paint);
  return {materials,setDetail(mode,width=Infinity){const size=mode==='quality'&&width>=600?1024:512;if(records[0].canvases[0].width===size)return;records.forEach(r=>{r.canvases[0].width=r.canvases[0].height=size;paint(r);});},get(family,variant){return materials[family*3+(variant%3)];},applyPhotos(images){photos=images;records.forEach(paint);},setNight(on){records.forEach(r=>r.material.emissiveIntensity=on?.36:0);},count:materials.length};
}
