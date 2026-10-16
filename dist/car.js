import * as THREE from './vendor/three.module.min.js';

// A locally generated model: continuous body panels, rounded shoulders and
// independently steered wheels, with no model download on the critical path.
export function createCar(scene) {
  const car=new THREE.Group(),wheels=[],steerWheels=[],flames=[];
  const paint=new THREE.MeshPhysicalMaterial({color:0xc8ff4a,metalness:.68,roughness:.25,clearcoat:1,clearcoatRoughness:.16,envMapIntensity:1.25});
  const carbon=new THREE.MeshStandardMaterial({color:0x10191d,metalness:.35,roughness:.46});
  const trim=new THREE.MeshStandardMaterial({color:0x202c30,metalness:.7,roughness:.32});
  const rubber=new THREE.MeshStandardMaterial({color:0x101315,roughness:.88});
  const alloy=new THREE.MeshStandardMaterial({color:0xaab7bd,metalness:.95,roughness:.24});
  const glass=new THREE.MeshPhysicalMaterial({color:0x142731,metalness:.35,roughness:.12,clearcoat:1,envMapIntensity:1.5});
  const tail=new THREE.MeshStandardMaterial({color:0xff2540,emissive:0xff1026,emissiveIntensity:2});
  const led=new THREE.MeshStandardMaterial({color:0xf3fcff,emissive:0xc5e8ff,emissiveIntensity:3.2});
  const mesh=(geometry,material,parent=car,x=0,y=0,z=0)=>{
    const m=new THREE.Mesh(geometry,material);m.position.set(x,y,z);m.castShadow=true;m.receiveShadow=true;parent.add(m);return m;
  };
  const cube=new THREE.BoxGeometry(1,1,1);
  const box=(w,h,d,material,x,y,z,parent=car)=>{const m=mesh(cube,material,parent,x,y,z);m.scale.set(w,h,d);return m;};
  const tube=(radius,length,material,x,y,z,parent=car)=>{
    const m=mesh(new THREE.CylinderGeometry(radius,radius,length,32),material,parent,x,y,z);m.rotation.x=Math.PI/2;return m;
  };
  function panel(sections,material) {
    const positions=[],indices=[];
    for(const {z,w,lo,hi} of sections) {
      const bevel=Math.min(.09,(hi-lo)*.3),crown=Math.min(.04,(hi-lo)*.15);
      const points=[[-.85,lo],[-1,lo+bevel],[-1,hi-bevel],[-.88,hi],[-.5,hi+crown*.6],[0,hi+crown],[.5,hi+crown*.6],[.88,hi],[1,hi-bevel],[1,lo+bevel],[.85,lo],[0,lo-.015]];
      for(const [x,y] of points)positions.push(x*w,y,z);
    }
    const ring=12;
    for(let s=0;s<sections.length-1;s++)for(let i=0;i<ring;i++) {
      const a=s*ring+i,b=s*ring+(i+1)%ring,c=a+ring,d=b+ring;
      indices.push(a,c,b,b,c,d);
    }
    for(let i=1;i<ring-1;i++)indices.push(0,i,i+1,(sections.length-1)*ring,(sections.length-1)*ring+i+1,(sections.length-1)*ring+i);
    const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));g.setIndex(indices);g.computeVertexNormals();
    return mesh(g,material);
  }
  panel([
    {z:-2.4,w:.83,lo:-.12,hi:.13},{z:-2.3,w:1.0,lo:-.17,hi:.22},
    {z:-2.02,w:1.08,lo:-.18,hi:.34},{z:-1.55,w:1.12,lo:-.15,hi:.43},
    {z:-1.15,w:1.1,lo:-.12,hi:.44},{z:-.75,w:1.04,lo:-.12,hi:.42},
    {z:0,w:1.03,lo:-.13,hi:.39},{z:.7,w:1.08,lo:-.13,hi:.43},
    {z:1.2,w:1.16,lo:-.13,hi:.48},{z:1.65,w:1.17,lo:-.15,hi:.46},
    {z:2.0,w:1.12,lo:-.15,hi:.4},{z:2.25,w:1.04,lo:-.12,hi:.34},
    {z:2.35,w:.94,lo:-.1,hi:.28}
  ],paint);
  panel([{z:-1.07,w:.8,lo:.36,hi:.45},{z:-.53,w:.75,lo:.39,hi:.91},
    {z:-.25,w:.73,lo:.4,hi:1.04},{z:.43,w:.72,lo:.41,hi:1.05},
    {z:.8,w:.76,lo:.42,hi:.91},{z:1.35,w:.89,lo:.44,hi:.51}],glass);
  panel([{z:-.31,w:.715,lo:1.015,hi:1.04},{z:-.16,w:.728,lo:1.045,hi:1.07},
    {z:.4,w:.715,lo:1.06,hi:1.08},{z:.63,w:.7,lo:1.01,hi:1.04}],paint);
  // Pillars follow the windscreen rake instead of intersecting it vertically.
  const strut=(from,to,radius,material)=>{
    const a=new THREE.Vector3(...from),b=new THREE.Vector3(...to),delta=b.clone().sub(a);
    const m=mesh(new THREE.CylinderGeometry(radius,radius,delta.length(),12),material);
    m.position.copy(a.add(b).multiplyScalar(.5));m.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),delta.normalize());
  };
  for(const side of[-1,1]) {
    strut([side*.82,.43,-1.04],[side*.72,1.055,-.27],.037,paint);
    strut([side*.73,1.07,.44],[side*.89,.49,1.32],.045,paint);
    strut([side*.77,.42,.35],[side*.72,1.07,.35],.022,carbon);
    box(.09,.14,3.9,carbon,side*1.075,-.12,.05);
    box(.045,.025,.29,trim,side*1.075,.42,.3);
    // Recessed side intake and mirror pod.
    const intake=box(.045,.22,.58,carbon,side*1.1,.19,.78);intake.rotation.y=side*.12;
    strut([side*.83,.55,-.67],[side*1.16,.62,-.64],.025,carbon);
    const mirror=mesh(new THREE.SphereGeometry(1,20,12),paint,car,side*1.2,.64,-.64);mirror.scale.set(.22,.105,.17);
    const mirrorGlass=box(.27,.11,.018,alloy,side*1.2,.65,-.485);mirrorGlass.rotation.y=side*.12;
    // Headlight housing, three LED elements and vertical running light.
    const housing=box(.62,.15,.07,carbon,side*.7,.17,-2.32);housing.rotation.y=side*.12;
    for(let i=0;i<3;i++)box(.145,.035,.025,led,side*(.49+i*.19),.19,-2.365);
    box(.035,.14,.035,led,side*.985,.105,-2.27);
    box(.54,.055,.035,tail,side*.7,.28,2.32);
    box(.5,.18,.06,carbon,side*.72,-.005,-2.34);
    for(let i=0;i<4;i++)box(.44,.012,.015,trim,side*.72,-.065+i*.038,-2.38);
    // Raised fender lips frame the tire sidewalls.
    for(const z of[-1.46,1.48]) {
      const arch=mesh(new THREE.TorusGeometry(.485,.055,8,32,Math.PI),paint,car,side*1.10,-.06,z);
      arch.rotation.set(0,Math.PI/2,0);
    }
  }
  box(2.13,.075,.23,carbon,0,-.19,-2.38);
  box(2.2,.14,.28,carbon,0,-.17,2.2);
  for(const x of[-.7,-.35,0,.35,.7])box(.035,.21,.45,carbon,x,-.12,2.2);
  for(const x of[-.46,.46]) {
    const vent=box(.32,.022,.54,carbon,x,.445,-1.4);vent.rotation.x=-.06;
    for(let i=0;i<4;i++)box(.28,.012,.025,trim,x,.46,-1.61+i*.12);
  }
  for(let i=0;i<7;i++)box(1.1,.015,.035,carbon,0,.46,1.42+i*.09);
  box(.055,.025,.64,carbon,0,.493,1.65);
  for(const x of[-.78,.78])strut([x,.39,1.88],[x,.84,2.04],.035,carbon);
  const wing=box(2.38,.065,.39,carbon,0,.88,2.03);wing.rotation.x=-.06;
  for(const x of[-1.18,1.18])box(.035,.2,.45,paint,x,.94,2.03);
  box(.64,.13,.025,trim,0,.045,2.355);
  const badgeCanvas=document.createElement('canvas');badgeCanvas.width=256;badgeCanvas.height=64;
  const ctx=badgeCanvas.getContext('2d');ctx.fillStyle='#dce5df';ctx.font='bold 28px sans-serif';ctx.textAlign='center';ctx.fillText('H O R I Z O N',128,42);
  const badgeTexture=new THREE.CanvasTexture(badgeCanvas);badgeTexture.colorSpace=THREE.SRGBColorSpace;
  const badge=mesh(new THREE.PlaneGeometry(.6,.15),new THREE.MeshBasicMaterial({map:badgeTexture,transparent:true}));badge.position.set(0,.19,2.37);
  const caliper=new THREE.MeshStandardMaterial({color:0xf45232,metalness:.35,roughness:.4});
  for(const side of[-1,1])for(const z of[-1.46,1.48]) {
    const pivot=new THREE.Group();pivot.position.set(side*1.065,-.075,z);car.add(pivot);
    if(z<0)steerWheels.push(pivot);
    const wheel=new THREE.Group();pivot.add(wheel);wheels.push(wheel);
    const tire=mesh(new THREE.TorusGeometry(.337,.112,12,48),rubber,wheel);tire.rotation.y=Math.PI/2;tire.scale.z=1.55;
    const barrel=mesh(new THREE.CylinderGeometry(.315,.315,.29,40),trim,wheel);barrel.rotation.z=Math.PI/2;
    const rotor=mesh(new THREE.CylinderGeometry(.255,.255,.025,40),alloy,wheel,side*.125,0,0);rotor.rotation.z=Math.PI/2;
    const rim=mesh(new THREE.TorusGeometry(.295,.023,8,40),alloy,wheel,side*.175,0,0);rim.rotation.y=Math.PI/2;
    for(let i=0;i<10;i++) {
      const angle=i*Math.PI/5;
      const spoke=box(.035,.035,.26,alloy,side*.18,Math.sin(angle)*.145,Math.cos(angle)*.145,wheel);spoke.rotation.x=-angle;
    }
    const hub=mesh(new THREE.CylinderGeometry(.075,.075,.055,20),carbon,wheel,side*.195,0,0);hub.rotation.z=Math.PI/2;
    for(let i=0;i<5;i++) {
      const angle=i*Math.PI*2/5;
      const lug=mesh(new THREE.SphereGeometry(.012,6,4),alloy,wheel,side*.228,Math.sin(angle)*.047,Math.cos(angle)*.047);
      lug.castShadow=false;
    }
    box(.08,.19,.105,caliper,side*.14,.035,.19,pivot);
    for(const edge of[-1,1]) {
      const line=mesh(new THREE.TorusGeometry(.383,.006,4,48),trim,wheel,edge*.13,0,0);line.rotation.y=Math.PI/2;
    }
  }
  for(const x of[-.75,.75]) {
    tube(.105,.25,alloy,x,-.07,2.32);tube(.077,.26,carbon,x,-.07,2.34);
    const flame=mesh(new THREE.ConeGeometry(.13,1.3,12),new THREE.MeshBasicMaterial({color:0x9ad6ff,transparent:true,opacity:.8}),car,x,-.07,2.98);
    flame.rotation.x=Math.PI/2;flame.visible=false;flames.push(flame);
  }
  const shadowCanvas=document.createElement('canvas');shadowCanvas.width=shadowCanvas.height=128;
  const shadowCtx=shadowCanvas.getContext('2d'),gradient=shadowCtx.createRadialGradient(64,64,10,64,64,64);
  gradient.addColorStop(0,'rgba(0,8,12,.5)');gradient.addColorStop(1,'rgba(0,8,12,0)');shadowCtx.fillStyle=gradient;shadowCtx.fillRect(0,0,128,128);
  const shadow=mesh(new THREE.PlaneGeometry(3.5,6),new THREE.MeshBasicMaterial({map:new THREE.CanvasTexture(shadowCanvas),transparent:true,depthWrite:false}),car,0,-.52,0);
  shadow.rotation.x=-Math.PI/2;shadow.castShadow=false;shadow.receiveShadow=false;
  // Batch fixed trim and wheel spokes while keeping each wheel animated.
  car.updateMatrixWorld(true);
  const parents=[];car.traverse(o=>{if(o.isGroup)parents.push(o);});
  for(const parent of parents){
    const groups=new Map();
    for(const child of parent.children)if(child.geometry===cube){
      if(!groups.has(child.material))groups.set(child.material,[]);
      groups.get(child.material).push(child);
    }
    for(const [material,objects] of groups){
      if(objects.length<3)continue;
      const batch=new THREE.InstancedMesh(cube,material,objects.length);
      objects.forEach((o,i)=>{batch.setMatrixAt(i,o.matrix);parent.remove(o);});
      batch.castShadow=true;batch.receiveShadow=true;batch.computeBoundingSphere();parent.add(batch);
    }
  }
  scene.add(car);
  return {car,bodyMat:paint,tailMat:tail,wheels,steerWheels,flames};
}

export function addReflections(scene,renderer) {
  const c=document.createElement('canvas');c.width=1024;c.height=512;
  const ctx=c.getContext('2d'),sky=ctx.createLinearGradient(0,0,0,512);
  sky.addColorStop(0,'#eff6fc');sky.addColorStop(.42,'#8cabc0');sky.addColorStop(.5,'#d6e3dd');sky.addColorStop(.54,'#3e5155');sky.addColorStop(1,'#142228');ctx.fillStyle=sky;ctx.fillRect(0,0,1024,512);
  const glow=ctx.createLinearGradient(0,80,0,200);glow.addColorStop(0,'rgba(255,255,255,0)');glow.addColorStop(.5,'rgba(255,255,255,1)');glow.addColorStop(1,'rgba(255,255,255,0)');
  ctx.fillStyle=glow;ctx.fillRect(80,80,430,120);ctx.fillRect(780,100,180,90);
  const texture=new THREE.CanvasTexture(c);texture.mapping=THREE.EquirectangularReflectionMapping;texture.colorSpace=THREE.SRGBColorSpace;
  const generator=new THREE.PMREMGenerator(renderer),environment=generator.fromEquirectangular(texture);
  scene.environment=environment.texture;scene.environmentIntensity=.7;texture.dispose();generator.dispose();
}
