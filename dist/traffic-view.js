import * as THREE from './vendor/three.module.min.js';
import {createVehicle} from './vehicles.js';
import {signalState} from './traffic.js';
import {terrainHeight} from './world-data.js';

// Bake each low-detail model into one geometry per material, then instance the
// result. Adding a traffic car does not add a draw call for every model part.
function bakeVehicle(type){
  const template=createVehicle(new THREE.Group(),type,{detail:false}),parts=new Map(),instance=new THREE.Matrix4();
  template.car.updateMatrixWorld(true);
  template.car.traverse(o=>{
    if(!o.isMesh)return;
    const append=matrix=>{
      const g=o.geometry.clone().applyMatrix4(matrix),flat=g.index?g.toNonIndexed():g;
      if(!parts.has(o.material))parts.set(o.material,[]);parts.get(o.material).push(flat);if(g!==flat)g.dispose();
    };
    if(o.isInstancedMesh)for(let i=0;i<o.count;i++){o.getMatrixAt(i,instance);append(new THREE.Matrix4().multiplyMatrices(o.matrixWorld,instance));}
    else append(o.matrixWorld);
  });
  return [...parts].map(([material,geometries])=>{
    const positions=[],normals=[];
    for(const g of geometries){positions.push(...g.attributes.position.array);normals.push(...g.attributes.normal.array);g.dispose();}
    const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));geometry.setAttribute('normal',new THREE.Float32BufferAttribute(normals,3));geometry.computeBoundingSphere();
    const paint=material===template.bodyMat,tail=material===template.tailMat;
    if(paint)material.color.set(0xffffff);
    return {geometry,material,paint,tail};
  });
}
export function buildTrafficView(scene,world,traffic){
  const group=new THREE.Group();group.name='Instanced road vehicles';scene.add(group);
  const parked=world.parkedCars.map((p,i)=>({...p,y:p.y+.55,heading:0,type:['touring','trail','clubsport'][i%3],paint:[0xaeb4ae,0x5b7b8e,0x8c4c42,0x303c48,0x858d72][p.color]}));
  const object=new THREE.Object3D(),color=new THREE.Color(),pools=[];let night=false,initialized=false;
  for(const type of['clubsport','touring','trail']){
    const moving=traffic.cars.filter(c=>c.type===type),fixed=parked.filter(c=>c.type===type),cars=[...moving,...fixed];
    const parts=bakeVehicle(type).map(part=>{
      const mesh=new THREE.InstancedMesh(part.geometry,part.tail?new THREE.MeshBasicMaterial({color:0xffffff,toneMapped:false}):part.material,cars.length);mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);mesh.castShadow=true;mesh.receiveShadow=true;mesh.frustumCulled=false;
      if(part.paint)cars.forEach((c,i)=>mesh.setColorAt(i,color.set(c.paint)));
      group.add(mesh);return {...part,mesh};
    });pools.push({cars,moving: moving.length,parts});
  }
  const signals=[],posts=[],heads=[];
  for(const x of world.xs)for(const z of world.zs)for(const axis of['ns','ew'])for(const side of[-1,1]){
    const px=x+(axis==='ns'?side*20:side*21),pz=z+(axis==='ns'?side*21:-side*20),y=terrainHeight(x,z);
    object.position.set(px,y+2.5,pz);object.rotation.set(0,0,0);object.scale.set(.18,5,.18);object.updateMatrix();posts.push(object.matrix.clone());
    const rotation=axis==='ns'?(side>0?0:Math.PI):(side>0?Math.PI/2:-Math.PI/2);
    object.position.set(px,y+4.9,pz);object.rotation.y=rotation;object.scale.set(.52,1.35,.38);object.updateMatrix();heads.push(object.matrix.clone());
    for(let j=0;j<3;j++){
      object.position.set(px+Math.sin(rotation)*.22,y+5.3-j*.4,pz+Math.cos(rotation)*.22);object.rotation.set(0,0,0);object.scale.setScalar(1);object.updateMatrix();
      signals.push({matrix:object.matrix.clone(),axis,name:['red','yellow','green'][j]});
    }
  }
  const hardware=new THREE.InstancedMesh(new THREE.BoxGeometry(1,1,1),new THREE.MeshStandardMaterial({color:0x20282a,roughness:.7}),posts.length+heads.length);
  [...posts,...heads].forEach((m,i)=>hardware.setMatrixAt(i,m));hardware.computeBoundingSphere();group.add(hardware);
  const bulbs=new THREE.InstancedMesh(new THREE.SphereGeometry(.13,8,6),new THREE.MeshBasicMaterial({color:0xffffff,toneMapped:false}),signals.length);
  signals.forEach((s,i)=>bulbs.setMatrixAt(i,s.matrix));bulbs.computeBoundingSphere();group.add(bulbs);
  function update(alpha=1){
    for(const {cars,moving,parts} of pools){
      cars.forEach((c,i)=>{
        for(const part of parts)if(part.tail)part.mesh.setColorAt(i,color.set(i<moving&&c.braking?0xff4942:night?0xc92420:0x651b1b));
        if(i>=moving&&initialized)return;
        const visible=i>=moving||traffic.enabled,prev=c.previous||c,t=i<moving?alpha:1;
        object.position.set(THREE.MathUtils.lerp(prev.x,c.x,t),THREE.MathUtils.lerp(prev.y,c.y,t),THREE.MathUtils.lerp(prev.z,c.z,t));
        const heading=prev.heading+Math.atan2(Math.sin(c.heading-prev.heading),Math.cos(c.heading-prev.heading))*t;
        const f=world.surface(c.x-Math.sin(heading)*1.5,c.z-Math.cos(heading)*1.5).height,b=world.surface(c.x+Math.sin(heading)*1.5,c.z+Math.cos(heading)*1.5).height;
        object.rotation.set(Math.atan2(f-b,3),heading,0,'YXZ');object.scale.setScalar(visible?1:0);object.updateMatrix();
        for(const part of parts)part.mesh.setMatrixAt(i,object.matrix);
      });for(const part of parts){part.mesh.instanceMatrix.needsUpdate=true;if(part.tail)part.mesh.instanceColor.needsUpdate=true;}
    }
    const colours={red:0xff382e,yellow:0xffc242,green:0x64eb9e};
    signals.forEach(({axis,name},i)=>bulbs.setColorAt(i,color.set(signalState(traffic.time,axis)===name?colours[name]:0x172022)));bulbs.instanceColor.needsUpdate=true;
    initialized=true;
  }
  update();return {group,update,setNight(value){night=value;},stats:{moving:traffic.cars.length,parked:parked.length,drawCalls:pools.reduce((n,p)=>n+p.parts.length,0)}};
}
