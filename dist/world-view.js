import * as THREE from './vendor/three.module.min.js';
import {terrainHeight,coast,seeded,BOUNDS,ROAD_SURFACE} from './world-data.js?v=axle-steering-11';
import {buildCity} from './city-view.js?v=axle-steering-11';
import {buildRegions} from './region-view.js?v=axle-steering-11';
import {streamStaticWorld} from './world-streaming.js?v=axle-steering-11';
import {surfaceDepthBias} from './render-quality.js?v=axle-steering-11';
import {buildPedestrians} from './pedestrians.js?v=axle-steering-11';
import {addGroundContact} from './lighting.js?v=axle-steering-11';

export function buildOpenWorld(scene,world,{reversedDepth=false}={}){
  const group=new THREE.Group();scene.add(group);
  const random=seeded(9103),cube=new THREE.BoxGeometry(1,1,1),batches=new Map();
  const material=(color,roughness=.8,metalness=0)=>new THREE.MeshStandardMaterial({color,roughness,metalness});
  const concrete=material(0xb9b8a9),curb=material(0xd8d3c0),dark=material(0x30383a,.65,.25),white=material(0xdeddd0),yellow=material(0xe2bd68),sand=material(0xc9b989),wood=material(0x806a48);
  for(const [surface,planks] of[[curb,false],[wood,true]]){
    const c=document.createElement('canvas');c.width=c.height=256;const ctx=c.getContext('2d');ctx.fillStyle=planks?'#6b5945':'#a9a79d';ctx.fillRect(0,0,256,256);
    for(let row=0;row<8;row++)for(let col=0;col<(planks?2:8);col++){const light=planks?42+random()*13:68+random()*12;ctx.fillStyle=planks?`hsl(32 21% ${light}%)`:`hsl(44 7% ${light}%)`;ctx.fillRect(col*(planks?128:32)+1,row*32+1,(planks?126:30),30);}
    ctx.fillStyle=planks?'#342c201a':'#33382d14';for(let n=0;n<2200;n++)ctx.fillRect(random()*256,random()*256,planks?4+random()*16:1,1);
    surface.map=new THREE.CanvasTexture(c);surface.map.wrapS=surface.map.wrapT=THREE.RepeatWrapping;surface.map.colorSpace=THREE.SRGBColorSpace;surface.map.anisotropy=4;surface.map.repeat.setScalar(planks?1:4);surface.color.set(0xffffff);
  }
  const addBox=(w,h,d,m,x,y,z,rotation=0)=>{
    if(!batches.has(m))batches.set(m,[]);
    const o=new THREE.Object3D();o.position.set(x,y,z);o.scale.set(w,h,d);o.rotation.y=rotation;o.updateMatrix();batches.get(m).push(o.matrix.clone());
  };
  const beamObject=new THREE.Object3D(),beamDirection=new THREE.Vector3(),beamAxis=new THREE.Vector3(0,0,1);
  function addBeam(a,b,material,size=.12){if(!batches.has(material))batches.set(material,[]);beamDirection.set(b.x-a.x,b.y-a.y,b.z-a.z);const length=beamDirection.length();beamObject.position.set((a.x+b.x)/2,(a.y+b.y)/2,(a.z+b.z)/2);beamObject.quaternion.setFromUnitVectors(beamAxis,beamDirection.normalize());beamObject.scale.set(size,size,length);beamObject.updateMatrix();batches.get(material).push(beamObject.matrix.clone());}
  // Detailed ground colour comes from elevation and position; the surface used
  // by the car samples the exact same height function as the terrain mesh.
  const sizeX=BOUNDS.maxX-BOUNDS.minX,sizeZ=BOUNDS.maxZ-BOUNDS.minZ;
  const groundGeo=new THREE.PlaneGeometry(sizeX,sizeZ,210,230);groundGeo.rotateX(-Math.PI/2);
  const positions=groundGeo.attributes.position,colors=[],color=new THREE.Color();
  for(let i=0;i<positions.count;i++){
    const x=positions.getX(i)+(BOUNDS.minX+BOUNDS.maxX)/2,z=positions.getZ(i)+(BOUNDS.minZ+BOUNDS.maxZ)/2,y=terrainHeight(x,z);
    positions.setXYZ(i,x,y,z);
    color.set(x<coast(z)+180?0xc8bd93:z<-700?0x8e9770:0x85916c);
    if(y>100)color.lerp(new THREE.Color(0xa59c80),Math.min(1,(y-100)/100));
    color.multiplyScalar(.92+Math.sin(x*.06)*Math.sin(z*.07)*.035+random()*.1);colors.push(color.r,color.g,color.b);
  }
  groundGeo.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));groundGeo.computeVertexNormals();
  const terrain=new THREE.Mesh(groundGeo,new THREE.MeshStandardMaterial({vertexColors:true,roughness:1}));terrain.userData.range=2600;terrain.receiveShadow=true;group.add(terrain);
  const waterMaterial=new THREE.ShaderMaterial({uniforms:{time:{value:0},sky:{value:new THREE.Color(0xc0d6df)}},vertexShader:`
    #include <common>
#include <logdepthbuf_pars_vertex>
varying vec3 p;varying vec3 view;uniform float time;
    void main(){vec3 v=position;vec4 w=modelMatrix*vec4(v,1.);p=w.xyz;view=cameraPosition-w.xyz;gl_Position=projectionMatrix*viewMatrix*w;
#include <logdepthbuf_vertex>
}`,
    fragmentShader:`#include <logdepthbuf_pars_fragment>
varying vec3 p;varying vec3 view;uniform float time;uniform vec3 sky;
    void main(){
#include <logdepthbuf_fragment>
float wave=sin(p.x*.13+p.z*.19+time)*sin(p.x*.024-p.z*.04+time*.4);float glint=pow(max(0.,wave),14.);float fres=pow(1.-max(0.,normalize(view).y),3.);vec3 c=mix(vec3(.075,.30,.34),vec3(.23,.53,.54),wave*.2+.3);c=mix(c,sky,fres*.65);c+=vec3(.6,.65,.54)*glint*.22*exp(-length(view)*.003);float fog=1.-exp(-length(view)*.00023);gl_FragColor=vec4(mix(c,sky,fog),1.);
#include <tonemapping_fragment>
#include <colorspace_fragment>
}`});
  const ocean=new THREE.Mesh(new THREE.PlaneGeometry(16000,16000,8,8),waterMaterial);ocean.userData.alwaysVisible=true;ocean.rotation.x=-Math.PI/2;ocean.position.y=.05;group.add(ocean);
  function asphaltTexture(){
    const c=document.createElement('canvas');c.width=c.height=256;const ctx=c.getContext('2d'),im=ctx.createImageData(256,256);
    for(let i=0;i<im.data.length;i+=4){const n=125+random()*38;im.data[i]=n;im.data[i+1]=n;im.data[i+2]=n;im.data[i+3]=255;}ctx.putImageData(im,0,0);
    ctx.strokeStyle='#858983';ctx.lineWidth=.5;for(let i=0;i<12;i++){ctx.beginPath();ctx.moveTo(random()*256,random()*256);ctx.lineTo(random()*256,random()*256);ctx.stroke();}
    const t=new THREE.CanvasTexture(c);t.wrapS=t.wrapT=THREE.RepeatWrapping;t.colorSpace=THREE.SRGBColorSpace;t.anisotropy=4;return t;
  }
  const asphalt=new THREE.MeshStandardMaterial({color:0x55585a,map:asphaltTexture(),roughness:.94,...surfaceDepthBias(reversedDepth)});
  const paintWhite=white.clone(),paintYellow=yellow.clone();for(const m of[paintWhite,paintYellow])Object.assign(m,surfaceDepthBias(reversedDepth,3),{depthWrite:false});
  const inJunction=(f,road)=>world.isJunction(f,road),beachfront=f=>f.x<-700&&f.z>-500&&f.z<1030;
  function strip(road,left,right,rise,m,skip){
    const ps=[],uv=[],indices=[];
    for(let i=0;i<road.samples.length;i++){
      const f=road.samples[i];for(const off of[left,right]){const x=f.x+f.nx*off,z=f.z+f.nz*off;ps.push(x,terrainHeight(x,z)+rise,z);uv.push(x/12,z/12);}
      if(i&&!(skip&&skip(f))){const a=(i-1)*2;if(left<right)indices.push(a,a+1,a+2,a+1,a+3,a+2);else indices.push(a,a+2,a+1,a+1,a+2,a+3);}
    }
    const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(ps,3));g.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));g.setIndex(indices);g.computeVertexNormals();
    const mesh=new THREE.Mesh(g,m);if(m===paintWhite||m===paintYellow)mesh.renderOrder=2;mesh.userData.range=1450;mesh.name=road.id+":"+left+":"+right;mesh.receiveShadow=true;group.add(mesh);
  }
  for(const road of world.roads){
    const half=road.width/2;
    strip(road,-half-2.5,half+2.5,.025,road.kind==='mountain'?sand:concrete);
    strip(road,-half,half,ROAD_SURFACE,asphalt);
    for(const side of[-1,1]){
      strip(road,side*(half-.3),side*(half-.12),.13,paintWhite,f=>inJunction(f,road));
      if(road.kind==='street')strip(road,side*(half+.1),side*(half+7),.16,curb,f=>inJunction(f,road));
      else if(road.kind==='highway'){strip(road,side*(half+1.6),side*(half+1.9),.75,dark,f=>beachfront(f)||inJunction(f,road));strip(road,side*(half+.1),side*(half+5),.16,curb,f=>!beachfront(f)||inJunction(f,road));}
    }
    strip(road,-.22,-.1,.135,paintYellow,f=>inJunction(f,road));strip(road,.1,.22,.135,paintYellow,f=>inJunction(f,road));
    if(road.width>26)for(const off of[-7,7])strip(road,off-.07,off+.07,.136,paintWhite,f=>Math.floor(f.s/6)%3===0||inJunction(f,road));
    for(let s=22;s<road.length;s+=68){
      const f=road.frame(s);if(inJunction(f,road))continue;
      if(road.kind==='mountain'||road.kind==='airfield')continue;
      for(const side of[-1,1]){
        const x=f.x+f.nx*(half+3.6)*side,z=f.z+f.nz*(half+3.6)*side,y=terrainHeight(x,z),rot=f.angle;
        addBox(.15,7,.15,dark,x,y+3.5,z,rot);addBox(2.2,.12,.14,dark,x-f.nx*side,y+7,z-f.nz*side,rot);
        addBox(1,.09,.4,white,x-f.nx*1.6*side,y+6.93,z-f.nz*1.6*side,rot);
      }
    }
  }
  // Road-level pedestrian crossings and visible stop lines at city intersections.
  for(const x of world.xs)for(const z of world.zs){
    for(const side of[-1,1])for(let i=-4;i<=4;i++){
      addBox(1.35,.025,3.2,white,x+i*2.1,terrainHeight(x,z)+.14,z+side*18);
      addBox(3.2,.025,1.35,white,x+side*20,terrainHeight(x,z)+.14,z+i*2.1);
    }
  }
  const city=buildCity(group,world),regions=buildRegions(group,world,city.leafMaterials);
  // Every parked vehicle has a marked bay beside its building.
  for(const p of world.parkedCars){const a=p.heading||0;addBox(3,.05,6.2,concrete,p.x,p.y+.03,p.z,a);for(const side of[-1,1])addBox(.09,.015,5.7,white,p.x+Math.cos(a)*side*1.4,p.y+.065,p.z-Math.sin(a)*side*1.4,a);addBox(2.8,.015,.09,white,p.x+Math.sin(a)*2.9,p.y+.065,p.z+Math.cos(a)*2.9,a);}

  // A beach boardwalk, long pier and a small marina give the coast a destination.
  for(const deck of world.life.decks){
    const positions=[],uv=[],indices=[],boardwalk=deck.kind==='boardwalk',minX=boardwalk?-deck.width/2:deck.minX,maxX=boardwalk?deck.width/2:deck.maxX,columns=boardwalk?2:Math.ceil((maxX-minX)/5),rows=Math.ceil((deck.maxZ-deck.minZ)/5);
    for(let row=0;row<=rows;row++)for(let col=0;col<=columns;col++){
      const z=THREE.MathUtils.lerp(deck.minZ,deck.maxZ,row/rows),x=THREE.MathUtils.lerp(minX,maxX,col/columns)+(boardwalk?coast(z)+deck.offset:0),y=Math.max(terrainHeight(x,z)+ROAD_SURFACE,deck.minimum);positions.push(x,y,z);uv.push(x/3,z/3);
      if(row<rows&&col<columns){const a=row*(columns+1)+col,b=a+columns+1;indices.push(a,b,a+1,a+1,b,b+1);}
    }
    const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));g.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));g.setIndex(indices);g.computeVertexNormals();const mesh=new THREE.Mesh(g,wood);mesh.name='Grounded '+deck.kind;mesh.receiveShadow=true;group.add(mesh);
  }
  for(const {a,b} of world.life.rails){addBeam({...a,y:a.y+.9},{...b,y:b.y+.9},white);addBox(.12,.9,.12,white,a.x,a.y+.45,a.z);const bottom=terrainHeight(a.x,a.z)-.4;addBox(.22,a.y-bottom,.22,wood,a.x,(a.y+bottom)/2,a.z);}
  // Airfield and hangars are reachable from East Gate.
  for(let z=-330;z<20;z+=22)addBox(1.2,.04,12,white,1080,terrainHeight(1080,z)+.18,z);
  // Instanced palms with curved fronds, plus rounded inland trees.
  const palmTrunk=new THREE.CylinderGeometry(.22,.4,1,9),leafMat=material(0x496747),trunkMat=material(0x7a7256);
  const lp=[],li=[];
  for(let i=0;i<=8;i++){const t=i/8,w=Math.sin(t*Math.PI)*.32,y=1.4*Math.sin(t*2.4)-t*.6;lp.push(-w,y,t*4,w,y,t*4);if(i){const a=(i-1)*2;li.push(a,a+2,a+1,a+1,a+2,a+3);}}
  const leafGeo=new THREE.BufferGeometry();leafGeo.setAttribute('position',new THREE.Float32BufferAttribute(lp,3));leafGeo.setIndex(li);leafGeo.computeVertexNormals();leafMat.side=THREE.DoubleSide;
  const palms=[];
  const coastRoad=world.roads.find(r=>r.id==='coast');for(let s=35;s<coastRoad.length;s+=34){const f=coastRoad.frame(s);if(!beachfront(f)||inJunction(f,coastRoad))continue;for(const side of[-1,1])palms.push({x:f.x+f.nx*(coastRoad.width/2+10)*side,z:f.z+f.nz*(coastRoad.width/2+10)*side,h:8+random()*3});}
  for(let z=-350;z<1050;z+=37)for(const x of[-1030,-955,-745,-695]){const r=world.nearestRoad(x,z);if(!r||r.distance>r.road.width/2+3)palms.push({x,z,h:8+random()*4});}
  for(let i=0;i<80;i++){const x=random()*1500-650,z=random()*1200-350,r=world.nearestRoad(x,z);if(!r||r.distance>25)palms.push({x,z,h:8+random()*3});}
  for(let i=palms.length-1;i>=0;i--){const p=palms[i];if(world.surface(p.x,p.z).road==='Waterfront promenade'||world.buildings.some(b=>Math.abs(b.x-p.x)<b.w/2+3&&Math.abs(b.z-p.z)<b.d/2+3)||world.regionItems.some(r=>r.site!=='landscape'&&Math.hypot(r.x-p.x,r.z-p.z)<r.r+3)||world.life.props.some(r=>Math.abs(r.x-p.x)<r.w/2+2&&Math.abs(r.z-p.z)<r.d/2+2))palms.splice(i,1);}
  const trunks=new THREE.InstancedMesh(palmTrunk,trunkMat,palms.length),leaves=new THREE.InstancedMesh(leafGeo,leafMat,palms.length*7),o=new THREE.Object3D();
  palms.forEach((p,i)=>{world.addSceneryCollider?.(p.x,p.z,.32,'palm');const y=terrainHeight(p.x,p.z);o.position.set(p.x,y+p.h/2,p.z);o.scale.set(1,p.h,1);o.rotation.set(0,0,.035*Math.sin(i));o.updateMatrix();trunks.setMatrixAt(i,o.matrix);
    for(let j=0;j<7;j++){o.position.set(p.x,y+p.h,p.z);o.scale.set(1,1,1);o.rotation.set(0,j*Math.PI*2/7+i,0);o.updateMatrix();leaves.setMatrixAt(i*7+j,o.matrix);}});
  trunks.userData.range=850;leaves.userData.range=850;trunks.castShadow=true;leaves.castShadow=true;group.add(trunks,leaves);
  const trees=[];for(let i=0;i<600;i++){const x=random()*2800-950,z=-500-random()*1500,r=world.nearestRoad(x,z);if((!r||r.distance>r.road.width/2+6)&&terrainHeight(x,z)>8&&!world.buildings.some(b=>Math.abs(b.x-x)<b.w/2+5&&Math.abs(b.z-z)<b.d/2+5)&&!world.regionItems.some(p=>p.site!=='landscape'&&Math.hypot(p.x-x,p.z-z)<p.r+8))trees.push({x,z,h:4+random()*9});}
  const crowns=new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1,1),city.leafMaterials[1],trees.length*2),stems=new THREE.InstancedMesh(palmTrunk,trunkMat,trees.length);
  trees.forEach((t,i)=>{world.addSceneryCollider?.(t.x,t.z,.25,'inland-tree');const y=terrainHeight(t.x,t.z);for(let j=0;j<2;j++){o.position.set(t.x+Math.sin(i*2.4+j*3)*t.h*.12,y+t.h*(.58+j*.17),t.z+Math.cos(i*2.4+j*3)*t.h*.12);o.scale.set(t.h*(.33-j*.05),t.h*.37,t.h*(.31-j*.03));o.rotation.set(0,i+j,0);o.updateMatrix();crowns.setMatrixAt(i*2+j,o.matrix);}o.position.set(t.x,y+t.h*.3,t.z);o.rotation.set(0,i,0);o.scale.set(.6,t.h*.6,.6);o.updateMatrix();stems.setMatrixAt(i,o.matrix);});crowns.userData.range=900;stems.userData.range=900;crowns.castShadow=true;group.add(crowns,stems);
  // Original roadside businesses and highway destination boards.
  function sign(text,w,h,x,z,angle=0,bg='#164f4d'){
    const c=document.createElement('canvas');c.width=512;c.height=128;const ctx=c.getContext('2d');ctx.fillStyle=bg;ctx.fillRect(0,0,512,128);ctx.strokeStyle='#d7dfca';ctx.lineWidth=5;ctx.strokeRect(8,8,496,112);ctx.fillStyle='#f2f2de';ctx.textAlign='center';ctx.font='bold 44px sans-serif';ctx.fillText(text,256,80);
    const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;const m=new THREE.Mesh(new THREE.PlaneGeometry(w,h),new THREE.MeshBasicMaterial({map:t,side:THREE.DoubleSide}));m.position.set(x,terrainHeight(x,z)+6,z);m.rotation.y=angle;group.add(m);addBox(.2,6,.2,dark,x,terrainHeight(x,z)+3,z);
  }
  sign('PACIFIC BEACH  ←',12,3,-685,230);sign('DOWNTOWN  ↑',12,3,35,620);sign('CRESTLINE PASS  ↑',13,3,-445,-450);sign('EAST GATE  →',11,3,750,120);sign('HORIZON AUTO',14,3,-55,620,0,'#a35c3d');
  for(const [m,matrices] of batches){const mesh=new THREE.InstancedMesh(cube,m,matrices.length);matrices.forEach((matrix,i)=>mesh.setMatrixAt(i,matrix));mesh.castShadow=![white,yellow,asphalt].includes(m);mesh.receiveShadow=true;mesh.computeBoundingSphere();group.add(mesh);}
  // Atmosphere uses a large gradient dome; distant terrain fades into the sky.
  const sky=new THREE.Mesh(new THREE.SphereGeometry(6000,32,20),new THREE.ShaderMaterial({side:THREE.BackSide,depthWrite:false,depthTest:false,uniforms:{top:{value:new THREE.Color(0x6da2c6)},bottom:{value:new THREE.Color(0xe1d9be)}},vertexShader:'varying float h;void main(){h=normalize(position).y;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',fragmentShader:'varying float h;uniform vec3 top;uniform vec3 bottom;void main(){gl_FragColor=vec4(mix(bottom,top,pow(max(0.,h),.65)),1.);\n#include <tonemapping_fragment>\n#include <colorspace_fragment>\n}'}));sky.renderOrder=-1000;sky.userData.alwaysVisible=true;group.add(sky);
  const sunDisk=new THREE.Mesh(new THREE.SphereGeometry(65,24,16),new THREE.MeshBasicMaterial({color:0xffe8b1}));sunDisk.userData.alwaysVisible=true;sunDisk.position.set(-1800,1600,-3500);group.add(sunDisk);
  const groundContact=addGroundContact(group,world,reversedDepth);
  const visibility=streamStaticWorld(group);
  const population=buildPedestrians(group,world,groundContact.material.map);
  return {group,visibility,population,city,regions,regionStats:regions.stats,cityStats:city.stats,surfaces:{asphalt,terrain:terrain.material,sizeX,sizeZ},setSky(top,bottom){sky.material.uniforms.top.value.set(top);sky.material.uniforms.bottom.value.set(bottom);waterMaterial.uniforms.sky.value.set(bottom);},update(time,camera){waterMaterial.uniforms.time.value=time;if(camera)sky.position.copy(camera.position);},stats:{buildings:world.buildings.length,roadKm:world.roads.reduce((s,r)=>s+r.length,0)/1000,palms:palms.length}};
}
