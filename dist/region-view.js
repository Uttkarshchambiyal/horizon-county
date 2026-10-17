import * as THREE from './vendor/three.module.min.js';
import {terrainHeight} from './world-data.js?v=high-speed-steering-12';
export function buildRegions(scene,world,foliage=[]){
  const group=new THREE.Group();group.name='Pacific shore and Crestline destinations';scene.add(group);
  const geometries={box:new THREE.BoxGeometry(1,1,1),pole:new THREE.CylinderGeometry(1,1,1,10),cone:new THREE.ConeGeometry(1,1,10),umbrella:new THREE.ConeGeometry(1,1,12),rock:new THREE.IcosahedronGeometry(1,1),board:new THREE.CapsuleGeometry(.25,2,4,8)},batches=new Map(),o=new THREE.Object3D();
  const m=(color,roughness=.85,metalness=0)=>new THREE.MeshStandardMaterial({color,roughness,metalness});
  const wood=m(0x867052),dark=m(0x303d40,.6,.4),white=m(0xdedac7),red=m(0xb75a45),blue=m(0x478395),sand=m(0xb4a47d),rock=m(0x9a998c),greens=[m(0x354e3c),m(0x476047),m(0x58704f)],colours=[blue,red,m(0xd2b165),m(0x6b8a6f)];
  function put(kind,material,item,x,y,z,sx,sy,sz,rx=0,ry=0,rz=0){
    const geometry=geometries[kind];if(!batches.has(geometry))batches.set(geometry,new Map());const by=batches.get(geometry);if(!by.has(material))by.set(material,[]);
    const a=item.angle||0,c=Math.cos(a),s=Math.sin(a);o.position.set(item.x+x*c+z*s,item.y+y,item.z-x*s+z*c);o.rotation.set(rx,ry+a,rz,'YXZ');o.scale.set(sx,sy,sz);o.updateMatrix();by.get(material).push(o.matrix.clone());
  }
  const box=(i,w,h,d,mat,x,y,z)=>put('box',mat,i,x,y,z,w,h,d);
  const pole=(i,r,h,mat,x,y,z)=>put('pole',mat,i,x,y,z,r,h,r);
  function table(i){box(i,3,.18,1.2,wood,0,1,0);for(const side of[-1,1]){box(i,3,.14,.4,wood,0,.55,side*1);box(i,.15,.95,1.6,dark,side, .5,0);}}
  function rail(i,w,d,h){for(const side of[-1,1]){box(i,w,.12,.12,white,0,h,side*d/2);box(i,.12,.12,d,white,side*w/2,h,0);}for(const sx of[-1,1])for(const sz of[-1,1])pole(i,.07,h,white,sx*w/2,h/2,sz*d/2);}
  function groundPatch(item,w,d){
    const g=new THREE.PlaneGeometry(w,d,4,4);g.rotateX(-Math.PI/2);const p=g.attributes.position,a=item.angle||0,uv=g.attributes.uv;
    for(let n=0;n<p.count;n++){const lx=p.getX(n),lz=p.getZ(n),x=item.x+lx*Math.cos(a)+lz*Math.sin(a),z=item.z-lx*Math.sin(a)+lz*Math.cos(a);p.setXYZ(n,x,terrainHeight(x,z)+.045,z);uv.setXY(n,x*.2,z*.2);}g.computeVertexNormals();const mesh=new THREE.Mesh(g,sand);mesh.receiveShadow=true;group.add(mesh);
  }
  const labels=new Map();
  function label(item,text,y,z,w=3){
    if(!labels.has(text)){const c=document.createElement('canvas');c.width=512;c.height=128;const ctx=c.getContext('2d');ctx.fillStyle='#244a49';ctx.fillRect(0,0,512,128);ctx.strokeStyle='#dce1c9';ctx.lineWidth=5;ctx.strokeRect(6,6,500,116);ctx.fillStyle='#f3f1dc';ctx.textAlign='center';ctx.font='bold 40px sans-serif';ctx.fillText(text,256,80);const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;labels.set(text,new THREE.MeshBasicMaterial({map:t}));}
    const mesh=new THREE.Mesh(new THREE.PlaneGeometry(w,w/4),labels.get(text)),a=item.angle||0;mesh.position.set(item.x+z*Math.sin(a),item.y+y,item.z+z*Math.cos(a));mesh.rotation.y=a;group.add(mesh);
  }
  let beach=0,mountain=0;
  for(const i of world.regionItems){
    const colour=colours[i.seed%colours.length];
    if(['cabin','kiosk','tent','lookout'].includes(i.type)){const w=i.type==='lookout'?12:8,d=i.type==='lookout'?9:6;let bottom=i.y;for(const sx of[-1,1])for(const sz of[-1,1]){const a=i.angle||0,x=i.x+sx*w/2*Math.cos(a)+sz*d/2*Math.sin(a),z=i.z-sx*w/2*Math.sin(a)+sz*d/2*Math.cos(a);bottom=Math.min(bottom,terrainHeight(x,z));}box(i,w,i.y-bottom+.3,d,sand,0,-(i.y-bottom)/2,0);}
    if(['umbrella','lounger','towel','surfboards','lifeguard','kiosk','volleyball','shower'].includes(i.type))beach++;else mountain++;
    if(i.type==='umbrella'){pole(i,.045,2.4,white,0,1.2,0);put('umbrella',colour,i,0,2.4,0,2.3,.7,2.3);box(i,1.8,.04,1,white,0,.04,.9);}
    if(i.type==='lounger'){box(i,.8,.12,1.9,white,0,.38,0);put('box',colour,i,0,.62,-.7,.8,.65,.1,-.4);for(const side of[-1,1])box(i,.09,.35,1.5,dark,side*.32,.18,0);}
    if(i.type==='towel')box(i,1,.025,2,colour,0,.04,0);
    if(i.type==='surfboards')for(const side of[-1,0,1])put('board',colours[(i.seed+side+4)%4],i,side*.6,1.5,0,.6,.9,.16,0,0,side*.08);
    if(i.type==='lifeguard'){
      for(const sx of[-1,1])for(const sz of[-1,1])pole(i,.16,2.5,wood,sx*2,1.25,sz*1.5);
      box(i,5,.3,4,wood,0,2.5,0);box(i,3.4,2.3,2.6,white,0,3.8,-.2);box(i,5.2,.25,4.2,red,0,5.05,0);box(i,3,.8,.08,blue,0,4.1,1.16);rail(i,5,4,3.3);
      for(let step=0;step<6;step++)box(i,1.5,.16,.45,wood,0,.2+step*.4,3.4-step*.35);box(i,.12,1.6,.12,red,1.8,5.8,0);
    }
    if(i.type==='kiosk'||i.type==='cabin'){
      const cabin=i.type==='cabin';label(i,cabin?'CRESTLINE CAMP':'PACIFIC SURF CLUB',3.1,2.57,5);box(i,7,3.4,5,cabin?wood:colour,0,1.8,0);put('cone',cabin?dark:red,i,0,4,0,5,1.5,3.8,0,Math.PI/4);box(i,5.3,1.25,.1,blue,0,2,2.55);box(i,7,.18,1.6,white,0,1.1,3);box(i,1.3,2.8,.12,dark,-2.5,1.5,2.56);
    }
    if(i.type==='volleyball'){
      for(const side of[-1,1])pole(i,.06,2.7,white,side*7,1.35,0);
      for(let y=1.5;y<2.6;y+=.18)box(i,14,.014,.014,white,0,y,0);for(let x=-7;x<=7;x+=.32)box(i,.014,1.1,.014,white,x,2,0);
      for(const side of[-1,1]){box(i,15,.025,.035,white,0,.05,side*5);box(i,.035,.025,10,white,side*7.5,.05,0);}
    }
    if(i.type==='shower'){pole(i,.05,2.5,dark,0,1.25,0);box(i,.6,.05,.08,dark,.25,2.5,0);box(i,.35,.04,.3,white,.5,2.45,0);box(i,1.4,.12,1.4,white,0,.08,0);}
    if(i.type==='picnic')table(i);
    if(i.type==='turnout')groundPatch(i,14,12);
    if(i.type==='path')groundPatch(i,2.8,3.3);
    if(i.type==='lookout'){box(i,12,.4,9,wood,0,.5,0);rail(i,12,9,1.5);for(const sx of[-1,1])for(const sz of[-1,1])pole(i,.2,3,wood,sx*5, -1,sz*3.5);pole(i,.11,1.2,dark,3,1.3,0);put('pole',dark,i,3,1.95,0,.16,.7,.16,Math.PI/3);box(i,4,.25,1,white,-2,1.2,2);}
    if(i.type==='tent'){put('cone',colour,i,0,1.5,0,3.6,3,3.2,0,Math.PI/4);box(i,1.4,1.6,.04,dark,0,.85,2.24);}
    if(i.type==='campfire'){for(let n=0;n<8;n++)put('rock',rock,i,Math.sin(n*.785)*1.4,.15,Math.cos(n*.785)*1.4,.35,.25,.35);box(i,1.8,.2,.2,wood,0,.2,0);box(i,.2,.25,1.8,wood,0,.2,0);}
    if(i.type==='trail-sign'){label(i,'VIEWPOINT →',2.2,.075,2.1);pole(i,.1,2.4,wood,0,1.2,0);box(i,2.1,.55,.12,blue,0,2.2,0);box(i,1.7,.45,.12,wood,.2,1.6,0);}
    if(i.type==='pine'){
      const h=7+i.seed%8;pole(i,.22,h*.7,wood,0,h*.35,0);for(let n=0;n<3;n++)put('cone',greens[(n+i.seed)%3],i,0,h*(.4+n*.2),0,h*(.23-n*.035),h*.55,h*(.23-n*.035),0,n*.8);
    }
    if(i.type==='birch'){const h=7+i.seed%7;pole(i,.17,h*.72,white,0,h*.36,0);for(let n=0;n<2;n++)put('rock',foliage[(i.seed+n)%foliage.length]||greens[n],i,Math.sin(i.seed+n)*1.1,h*(.62+n*.18),Math.cos(i.seed+n)*.8,2.5-n*.4,h*.25,2.6-n*.35,0,i.seed);}
    if(i.type==='rock')put('rock',rock,i,0,i.r*.48,0,i.r,i.r*.7,i.r*.85,.15,i.seed,.1);
  }
  for(const [geometry,by] of batches)for(const [material,matrices] of by){const mesh=new THREE.InstancedMesh(geometry,material,matrices.length);matrices.forEach((m,index)=>mesh.setMatrixAt(index,m));mesh.userData.range=850;mesh.castShadow=true;mesh.receiveShadow=true;mesh.computeBoundingSphere();group.add(mesh);}
  return {group,rockMaterial:rock,groundMaterial:sand,stats:{beach,mountain,total:world.regionItems.length}};
}
