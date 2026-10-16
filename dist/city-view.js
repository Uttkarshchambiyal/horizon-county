import * as THREE from './vendor/three.module.min.js';
import {terrainHeight,seeded} from './world-data.js?v=road-depth-7';
import {createFacadeLibrary} from './facade-materials.js?v=road-depth-7';

// Street-front architecture has separate silhouettes and human-scale floors.
// Static faces are merged by material; repeated trim and furniture is instanced.
export function buildCity(scene,world){
  const group=new THREE.Group();group.name='Horizon neighbourhoods';scene.add(group);
  const random=seeded(4518),cube=new THREE.BoxGeometry(1,1,1),cylinder=new THREE.CylinderGeometry(1,1,1,20),sphere=new THREE.IcosahedronGeometry(1,1),roof=new THREE.ConeGeometry(1,1,4),batches=new Map(),faces=new Map(),o=new THREE.Object3D();
  const mat=(color,roughness=.8,metalness=0)=>new THREE.MeshStandardMaterial({color,roughness,metalness});
  const stone=mat(0xc8c3b2),cream=mat(0xe2d5ba),white=mat(0xe1e2d7),concrete=mat(0xa7a9a1),asphalt=mat(0x4c5354),dark=mat(0x29383b,.6,.3),glass=mat(0x395663,.25,.35),wood=mat(0x795d43),tile=mat(0xa3664f),green=mat(0x55714b),grass=mat(0x687e55),water=mat(0x438a97,.22,.3),red=mat(0xb86850),teal=mat(0x487b7e),yellow=mat(0xd9ae64);
  const paints=[cream,white,stone,mat(0xbbc6bc),mat(0xd4b8a0),mat(0xb7c5ca),mat(0xbba792),mat(0xb2aaa3)];
  const leafCanvas=document.createElement('canvas');leafCanvas.width=leafCanvas.height=128;const leafCtx=leafCanvas.getContext('2d');leafCtx.fillStyle='#61784b';leafCtx.fillRect(0,0,128,128);
  for(let i=0;i<1400;i++){leafCtx.fillStyle=['#7b8d56','#4a633b','#91a267','#566d42'][i%4];leafCtx.beginPath();leafCtx.ellipse(random()*128,random()*128,1.4+random()*2,.7+random()*1.3,random()*Math.PI,0,Math.PI*2);leafCtx.fill();}
  const leafMap=new THREE.CanvasTexture(leafCanvas);leafMap.colorSpace=THREE.SRGBColorSpace;const leafMaterials=[0xc2c9a1,0xa6ba90,0xd4c997].map(color=>new THREE.MeshStandardMaterial({map:leafMap,color,roughness:1}));
  function put(geometry,material,x,y,z,sx,sy,sz,rotation=0){
    if(!batches.has(geometry))batches.set(geometry,new Map());const byMaterial=batches.get(geometry);if(!byMaterial.has(material))byMaterial.set(material,[]);
    o.position.set(x,y,z);o.rotation.set(0,rotation,0);o.scale.set(sx,sy,sz);o.updateMatrix();byMaterial.get(material).push(o.matrix.clone());
  }
  const box=(w,h,d,m,x,y,z,r=0)=>put(cube,m,x,y,z,w,h,d,r);
  const column=(r,h,m,x,y,z)=>put(cylinder,m,x,y,z,r,h,r);
  const crown=(r,h,m,x,y,z)=>put(sphere,m,x,y,z,r,h,r);
  function face(w,h,m,x,y,z,rotation=0){
    if(!faces.has(m))faces.set(m,{p:[],n:[],uv:[],i:[]});const f=faces.get(m),base=f.p.length/3,c=Math.cos(rotation),s=Math.sin(rotation);
    for(const [dx,dy] of[[-w/2,-h/2],[w/2,-h/2],[-w/2,h/2],[w/2,h/2]]){f.p.push(x+dx*c,y+dy,z-dx*s);f.n.push(s,0,c);}
    const [cellW,cellH]=m.userData?.facadeCell||[3.3,3.5];f.uv.push(0,0,w/cellW,0,0,h/cellH,w/cellW,h/cellH);f.i.push(base,base+1,base+2,base+1,base+3,base+2);
  }
  const facades=createFacadeLibrary();
  const shops=['PACIFIC COFFEE','HORIZON MARKET','COAST AUTO','SUNSET RECORDS','NORTH STAR HOTEL','MARINA SUPPLY','BOARDWALK SURF','CRESCENT CINEMA','CITY PHARMACY','WESTSIDE DINER','MONARCH STUDIOS','EVERGREEN BANK'];
  const signMaterials=shops.map((text,i)=>{
    const c=document.createElement('canvas');c.width=512;c.height=96;const ctx=c.getContext('2d');ctx.fillStyle=['#315557','#945b47','#293d4f','#55634c'][i%4];ctx.fillRect(0,0,512,96);ctx.strokeStyle='#d6d2b4';ctx.lineWidth=3;ctx.strokeRect(9,8,494,80);ctx.fillStyle='#eae5ce';ctx.font='600 34px sans-serif';ctx.textAlign='center';ctx.fillText(text,256,61);const texture=new THREE.CanvasTexture(c);texture.colorSpace=THREE.SRGBColorSpace;return new THREE.MeshStandardMaterial({map:texture,roughness:.75});
  });
  function sign(w,h,index,x,y,z,rotation){
    // Signs have a single complete UV rectangle rather than facade tiling.
    const m=signMaterials[index%signMaterials.length];face(w,h,m,x,y,z,rotation);const f=faces.get(m);f.uv.splice(-8,8,0,0,1,0,0,1,1,1);
  }
  let balconies=0;
  for(const b of world.buildings){
    const r=b.facing||0,swap=Math.abs(Math.sin(r))>.7,w=swap?b.d:b.w,d=swap?b.w:b.d,h=b.h,paint=paints[b.style],type=b.type;
    const pos=(x,z)=>[b.x+x*Math.cos(r)+z*Math.sin(r),b.z-x*Math.sin(r)+z*Math.cos(r)];
    const B=(bw,bh,bd,m,x,y,z)=>{const p=pos(x,z);box(bw,bh,bd,m,p[0],b.y+y,p[1],r);};
    const F=(fw,fh,m,x,y,z,rot=0)=>{const p=pos(x,z);face(fw,fh,m,p[0],b.y+y,p[1],r+rot);};
    const C=(rad,ch,m,x,y,z)=>{const p=pos(x,z);column(rad,ch,m,p[0],b.y+y,p[1]);};
    function skin(bw,bh,bd,y,material){for(const side of[-1,1]){F(bw,bh,material,0,y,side*(bd/2+.025),side>0?0:Math.PI);F(bd,bh,material,side*(bw/2+.025),y,0,side*Math.PI/2);}}
    const windowMat=facades.get(type==='glass'||type==='round'?3+b.style%2:type==='artdeco'||type==='civic'?6:type==='house'||type==='villa'?7:type==='loft'?1:b.style%3===0?5:b.style%3,b.id%3);
    B(w+4,.12,d+4,concrete,0,.09,0);
    const minY=Math.min(...[-1,1].flatMap(s=>[-1,1].map(t=>terrainHeight(b.x+s*b.w/2,b.z+t*b.d/2))));
    B(w,Math.max(.5,b.y-minY+1),d,stone,0,-Math.max(.5,b.y-minY+1)/2+.2,0);
    if(type==='round'){
      const curved=cylinder.clone(),uv=curved.attributes.uv;for(let i=0;i<uv.count;i++)uv.setXY(i,uv.getX(i)*Math.PI*w*.94/13.2,uv.getY(i)*h/14);put(curved,facades.get(3,b.id%3),b.x,b.y+h/2,b.z,w*.47,h,w*.47);for(let y=4;y<h;y+=7)C(w*.48,.25,white,0,y,0);C(w*.39,4,concrete,0,h+2,0);C(.7,14,dark,0,h+9,0);
    }else if(type==='setback'||type==='artdeco'){
      const tiers=type==='artdeco'?3:2;
      for(let i=0;i<tiers;i++){const bw=w*(1-i*.17),bd=d*(1-i*.17),bh=h/tiers,y=(i+.5)*bh;B(bw,bh,bd,type==='artdeco'?stone:paint,0,y,0);skin(bw,bh-.6,bd,y,windowMat);B(bw+1,.6,bd+1,white,0,(i+1)*bh,0);}
      if(type==='artdeco'){for(let x=-w*.35;x<=w*.36;x+=w*.175)B(.7,h*.8,1,cream,x,h*.4,d/2+.2);B(w*.22,6,d*.22,cream,0,h+3,0);C(.4,8,dark,0,h+9,0);}
    }else if(type==='house'||type==='villa'){
      B(w,h,d,paint,0,h/2,0);skin(w,h-.6,d,h/2,windowMat);
      if(type==='house'){const p=pos(0,0);put(roof,tile,p[0],b.y+h+2,p[1],w*.75,4,d*.75,r+Math.PI/4);B(w*.38,1,d*.65,tile,0,h+1,0);}
      else{B(w*.6,h*.55,d*.7,white,-w*.18,h*1.275,-d*.1);B(w*.65,.35,d*.75,stone,-w*.18,h*1.55,-d*.1);B(w*.6,.22,4,white,w*.2,h*.65,d*.48);C(.22,h*.65,stone,w*.45,h*.325,d*.48);}
      B(w*.85,.25,3.5,stone,0,.28,d/2+1);B(w*.3,.18,3,wood,0,2.8,d/2+.8);B(1.6,2.6,.15,dark,0,1.45,d/2+.1);
      for(const side of[-1,1]){B(.25,1.1,d+7,white,side*(w/2+1.7),.65,2);B(w*.3,.8,.7,green,side*w*.34,.5,d/2+3);}
    }else if(type==='warehouse'){
      B(w,h,d,paint,0,h/2,0);B(w+1,.5,d+1,dark,0,h,0);
      for(let x=-w/2+4;x<w/2;x+=7){B(.18,h,.18,concrete,x,h/2,d/2+.1);B(5.5,h*.6,.15,dark,x,h*.31,d/2+.2);for(let y=1;y<h*.6;y+=.65)B(5.5,.04,.17,concrete,x,y,d/2+.22);}
      for(let z=-d/2+3;z<d/2;z+=7)B(w+1,.35,.25,concrete,0,h+.3,z);
    }else if(type==='garage'){
      B(w,h,d,concrete,0,h/2,0);for(let y=3;y<h;y+=3.2){B(w+.5,.35,d+.5,white,0,y,0);for(const side of[-1,1])B(w*.93,1.4,.1,dark,0,y-1,side*(d/2+.06));}for(let x=-w*.4;x<=w*.4;x+=w*.2)B(.65,h,d+.5,stone,x,h/2,0);
    }else if(type==='civic'){
      B(w,h*.7,d,cream,0,h*.35,0);B(w+2,1,d+2,stone,0,h*.7,0);B(w*.65,h*.3,d*.7,cream,0,h*.85,0);B(w*.7,.8,d*.75,stone,0,h,0);
      for(let x=-w*.4;x<=w*.4;x+=w*.16)C(.7,h*.55,white,x,h*.275,d*.51);const p=pos(0,0);crown(w*.2,h*.23,stone,p[0],b.y+h,p[1]);C(.3,10,dark,0,h+8,0);
    }else{
      B(w,h,d,paint,0,h/2,0);skin(w,h-.6,d,h/2,windowMat);B(w+.6,.5,d+.6,stone,0,h+.1,0);
      if(type==='glass'){
        for(let x=-w/2;x<=w/2;x+=w/5)B(.4,h,d+.3,concrete,x,h/2,0);B(w*.65,4,d*.6,dark,0,h+2,0);
      }
      if(type==='loft'){
        B(w+1,1,d+1,stone,0,h-.3,0);for(let y=4;y<h;y+=3.5){B(4,.13,1.7,dark,w*.25,y,d/2+.8);for(const side of[-1,1])B(.07,1.1,1.8,dark,w*.25+side*2,y+.6,d/2+.8);B(4,.07,.07,dark,w*.25,y+1.1,d/2+1.6);B(.15,3.5,.15,dark,w*.25+1.7,y+1.75,d/2+1.2);}
      }
      if(type==='apartment'||type==='motel'){
        for(let y=3.6;y<h;y+=3.5)for(let x=-w*.33;x<=w*.34;x+=w*.33){B(w*.26,.2,2.4,stone,x,y,d/2+1);B(w*.26,.8,.1,type==='motel'?teal:glass,x,y+.55,d/2+2.15);for(const side of[-1,1])B(.1,.85,2.3,white,x+side*w*.13,y+.6,d/2+1);balconies++;}
        if(type==='motel')B(.35,h,.35,teal,w*.44,h/2,d/2+2);
      }
    }
    if(!['house','villa','warehouse','civic','round'].includes(type)){
      B(w*.86,2.7,.12,glass,0,1.6,d/2+.07);for(let x=-w*.42;x<w*.43;x+=4)B(.13,2.8,.3,stone,x,1.6,d/2+.2);
      B(w*.93,.18,2.5,type==='retail'?teal:stone,0,3.3,d/2+.9);B(1.6,2.6,.1,dark,0,1.5,d/2+.28);
      if(type==='retail'||type==='motel'||b.id%6===0){const p=pos(0,d/2+.24);sign(Math.min(w*.82,26),1.5,b.id,p[0],b.y+4.4,p[1],r);}
    }
    // A/C units, solar panels and varying roof plant replace identical tops.
    if(!['house','round','civic'].includes(type)){B(w*.17,1.1,d*.16,dark,-w*.22,h+.8,-d*.15);B(w*.2,.35,d*.18,concrete,w*.24,h+.4,-d*.23);}
  }
  let streetTrees=0,props=0;
  function tree(x,z,small=false){if(world.surface(x,z).onRoad)return;world.addSceneryCollider?.(x,z,.18,'street-tree');const y=terrainHeight(x,z),h=small?4.7+random()*1.8:6+random()*2;column(.17,h*.66,wood,x,y+h*.33,z);
    for(let i=0;i<4;i++){const angle=i*2.4+random(),radius=h*(.19+random()*.07),spread=i===0?0:h*.18;crown(radius,h*(.22+random()*.07),leafMaterials[(i+streetTrees)%3],x+Math.sin(angle)*spread,y+h*(i===0?.88:.70+random()*.10),z+Math.cos(angle)*spread);}
    box(2.3,.15,2.3,stone,x,y+.12,z);streetTrees++;}
  function bench(x,z,r=0){box(2.1,.12,.5,wood,x,terrainHeight(x,z)+.55,z,r);box(2.1,.55,.08,wood,x+Math.sin(r)*.22,terrainHeight(x,z)+.85,z+Math.cos(r)*.22,r);for(const side of[-1,1])box(.1,.5,.4,dark,x+Math.cos(r)*side*.8,terrainHeight(x,z)+.27,z-Math.sin(r)*side*.8,r);props++;}
  for(const block of world.blocks){
    const {x,z,w,d,y,use}=block;
    box(w,.12,d,use==='parking'||use==='service'?asphalt:use==='plaza'?concrete:grass,x,y+.13,z);
    for(const side of[-1,1]){box(w+4,.12,3,concrete,x,y+.17,z+side*(d/2+1));box(3,.12,d+4,concrete,x+side*(w/2+1),y+.17,z);}
    if(use==='parking'){
      for(let dx=-w/2+8;dx<w/2;dx+=5)for(const side of[-1,1])box(.1,.025,10,white,x+dx,y+.21,z+side*(d/2-8));box(w*.8,.03,.14,yellow,x,y+.22,z);for(let i=-1;i<=1;i++)tree(x+i*30,z+12,true);
    }else if(use==='park'||use==='plaza'){
      box(4,.06,d,stone,x,y+.23,z);box(w,.06,4,stone,x,y+.23,z);
      column(9,.6,stone,x,y+.5,z);column(7.9,.08,water,x,y+.82,z);column(1.4,2.4,stone,x,y+1.5,z);column(3.3,.12,water,x,y+2.75,z);
      for(const sx of[-1,1])for(const sz of[-1,1]){tree(x+sx*37,z+sz*32);bench(x+sx*22,z+sz*13,sz>0?0:Math.PI);box(7,.7,2,green,x+sx*24,y+.45,z+sz*33);}
    }else if(use==='service'){
      box(43,.9,27,white,x,y+6.1,z);box(44,.25,28,red,x,y+5.7,z);for(const sx of[-1,1])for(const sz of[-1,1])column(.27,5.7,white,x+sx*18,y+2.85,z+sz*10);
      for(const sx of[-1,1])for(const sz of[-1,1]){box(1.1,1.9,.7,red,x+sx*11,y+1,z+sz*6);box(.7,.4,.75,dark,x+sx*11,y+1.5,z+sz*6);}sign(25,1.8,2,x,y+6.2,z+14,0);
    }else{for(const side of[-1,1]){tree(x+side*40,z+25);bench(x+side*35,z+39);}box(w*.7,.08,2.5,stone,x,y+.23,z+40);}
  }
  for(const road of world.roads.filter(r=>r.kind==='street'))for(let s=32;s<road.length-30;s+=38){
    const f=road.frame(s);if(world.xs.some(x=>Math.abs(f.x-x)<25)&&world.zs.some(z=>Math.abs(f.z-z)<25))continue;
    for(const side of[-1,1]){const off=road.width/2+3.4,x=f.x+f.nx*off*side,z=f.z+f.nz*off*side;tree(x,z,true);
      if(Math.floor(s/38)%3===0){const y=terrainHeight(x,z);column(.32,1,teal,x+f.tx*3,y+.65,z+f.tz*3);bench(x+f.tx*7,z+f.tz*7,f.angle);}}
  }
  // Bus shelters, bollards and utility boxes make the curb read as a place.
  for(const [x,z] of[[22,450],[-742,430],[262,150],[-262,-30],[742,650]]){
    const y=terrainHeight(x,z);box(2.8,.15,7,teal,x,y+2.8,z);for(const side of[-1,1])box(.12,2.8,.12,dark,x,y+1.4,z+side*3);box(.08,2,6,glass,x+1.2,y+1.6,z);bench(x,z,Math.PI/2);box(.5,1.3,.6,dark,x,y+.7,z-4);props+=3;
  }
  // Shop terraces, garden pots and bicycle stands reuse the existing batches.
  for(const item of world.streetDetails){
    const {x,z,y,angle:a}=item,place=(lx,lz)=>[x+lx*Math.cos(a)+lz*Math.sin(a),z-lx*Math.sin(a)+lz*Math.cos(a)];
    const B=(w,h,d,m,lx,cy,lz,r=0)=>{const p=place(lx,lz);box(w,h,d,m,p[0],y+cy,p[1],a+r);};
    if(item.type==='planter'){column(.66,.75,stone,x,y+.38,z);column(.58,.05,dark,x,y+.79,z);for(const [lx,lz] of[[0,0],[-.26,.12],[.25,-.1]]){const p=place(lx,lz);crown(.42,.55,green,p[0],y+1.06,p[1]);}}
    if(item.type==='terrace'){
      column(.08,.9,dark,x,y+.45,z);column(.78,.09,wood,x,y+.94,z);column(.035,2.8,dark,x,y+1.4,z);put(roof,teal,x,y+2.9,z,1.9,.55,1.9,a+Math.PI/4);
      for(const side of[-1,1]){B(.55,.09,.55,wood,side*1.13,.47,0);B(.08,.8,.55,dark,side*1.34,.47,0);for(const end of[-1,1])B(.06,.45,.06,dark,side*1.13,.23,end*.2);}
    }
    if(item.type==='bike-rack'){for(const dx of[-.8,0,.8]){B(.055,.8,.055,dark,dx,.4,-.4);B(.055,.8,.055,dark,dx,.4,.4);B(.055,.055,.85,dark,dx,.8,0);}B(2,.1,.08,dark,0,.08,-.4);}
  }
  for(const [geometry,byMaterial] of batches)for(const [material,matrices] of byMaterial){const mesh=new THREE.InstancedMesh(geometry,material,matrices.length);matrices.forEach((m,i)=>mesh.setMatrixAt(i,m));mesh.castShadow=![glass,water,grass,asphalt].includes(material);mesh.receiveShadow=true;mesh.computeBoundingSphere();group.add(mesh);}
  for(const [material,f] of faces){const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(f.p,3));geometry.setAttribute('normal',new THREE.Float32BufferAttribute(f.n,3));geometry.setAttribute('uv',new THREE.Float32BufferAttribute(f.uv,2));geometry.setIndex(f.i);geometry.computeBoundingSphere();const mesh=new THREE.Mesh(geometry,material);mesh.receiveShadow=true;group.add(mesh);}
  return {group,facades,leafMaterials,stats:{buildings:world.buildings.length,types:new Set(world.buildings.map(b=>b.type)).size,balconies,streetTrees,props,blocks:world.blocks.length,facadeVariants:facades.count,streetDetails:world.streetDetails.length}};
}
