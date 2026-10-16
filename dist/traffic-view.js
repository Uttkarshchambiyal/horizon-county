import * as THREE from './vendor/three.module.min.js';
import {fleetModel,FLEET_TYPES} from './traffic-models.js';
import {signalState} from './traffic.js';
import {terrainHeight} from './world-data.js';

export function buildTrafficView(scene,world,traffic){
  const group=new THREE.Group();group.name='Local animated traffic fleet';scene.add(group);
  const paints=[0xaeb4ae,0x5b7b8e,0x8c4c42,0x303c48,0x858d72,0xc6b599];
  const parked=world.parkedCars.map((p,i)=>({...p,y:p.y+.55,heading:0,type:FLEET_TYPES[i%FLEET_TYPES.length],paint:paints[p.color],parked:true}));
  const object=new THREE.Object3D(),wheel=new THREE.Object3D(),color=new THREE.Color(),wheelMatrix=new THREE.Matrix4(),pools=[];
  let night=false,lastSignal='',lastNight=false,focus={x:world.spawns[0].x,z:world.spawns[0].z};
  for(const type of FLEET_TYPES){
    const model=fleetModel(type),cars=[...traffic.cars.filter(c=>c.type===type),...parked.filter(c=>c.type===type)];
    const parts=[...model.parts,...model.wheelParts.map(p=>({...p,wheel:true}))].map(part=>{
      const mesh=new THREE.InstancedMesh(part.geometry,part.material,cars.length*(part.wheel?4:1));mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);mesh.castShadow=true;mesh.receiveShadow=true;mesh.frustumCulled=false;group.add(mesh);return {...part,mesh};
    });pools.push({cars,parts,model});
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
  const stats={moving:traffic.cars.length,parked:parked.length,models:FLEET_TYPES.length,visibleCars:0,drawCalls:pools.reduce((n,p)=>n+p.parts.length,0)};
  function update(alpha=1,player){
    if(player)focus=player;stats.visibleCars=0;
    for(const {cars,parts,model} of pools){
      let index=0;
      for(const c of cars){
        const distance=Math.hypot(c.x-focus.x,c.z-focus.z);
        if((!c.parked&&!traffic.enabled)||distance>(c.parked?300:420))continue;
        const prev=c.previous||c,t=c.parked?1:alpha;
        object.position.set(THREE.MathUtils.lerp(prev.x,c.x,t),THREE.MathUtils.lerp(prev.y,c.y,t),THREE.MathUtils.lerp(prev.z,c.z,t));
        const heading=prev.heading+Math.atan2(Math.sin(c.heading-prev.heading),Math.cos(c.heading-prev.heading))*t;
        // Cache slope at simulation resolution; parked transforms never sample terrain per frame.
        if(c.renderS!==c.s||c.pitch===undefined){const f=terrainHeight(c.x-Math.sin(heading)*1.4,c.z-Math.cos(heading)*1.4),b=terrainHeight(c.x+Math.sin(heading)*1.4,c.z+Math.cos(heading)*1.4);c.pitch=Math.atan2(f-b,2.8);c.renderS=c.s;}
        object.rotation.set(c.pitch,heading,0,'YXZ');object.updateMatrix();
        let steering=0;
        if(!c.parked){const route=traffic.routes[c.route],a=route.frame(c.s-1),b=route.frame(c.s+1);steering=Math.atan(model.spec.wheelbase*Math.atan2(Math.sin(b.heading-a.heading),Math.cos(b.heading-a.heading))/2);}
        for(const part of parts){
          part.mesh.castShadow=distance<110;
          if(!part.wheel)part.mesh.setMatrixAt(index,object.matrix);
          else model.wheels.forEach((p,i)=>{
            wheel.position.set(...p);wheel.rotation.set(-(c.parked?0:c.s)/model.spec.radius,i<2?steering:0,0,'YXZ');wheel.updateMatrix();wheelMatrix.multiplyMatrices(object.matrix,wheel.matrix);part.mesh.setMatrixAt(index*4+i,wheelMatrix);
          });
          if(part.paint)part.mesh.setColorAt(index,color.set(c.paint));
          if(part.tail)part.mesh.setColorAt(index,color.set(!c.parked&&c.braking?0xff4942:night?0xc92420:0x651b1b));
        }
        index++;
      }
      stats.visibleCars+=index;
      for(const part of parts){part.mesh.count=index*(part.wheel?4:1);part.mesh.instanceMatrix.needsUpdate=true;if(part.mesh.instanceColor)part.mesh.instanceColor.needsUpdate=true;}
    }
    const phase=signalState(traffic.time,'ns')+signalState(traffic.time,'ew');
    if(phase!==lastSignal||night!==lastNight){
      const colours={red:0xff382e,yellow:0xffc242,green:0x64eb9e};
      signals.forEach(({axis,name},i)=>bulbs.setColorAt(i,color.set(signalState(traffic.time,axis)===name?colours[name]:0x172022)));bulbs.instanceColor.needsUpdate=true;lastSignal=phase;lastNight=night;
    }
  }
  update();return {group,update,setNight(value){night=value;},stats};
}
