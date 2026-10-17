import * as THREE from './vendor/three.module.min.js';
import {enableInstanceFade,distanceFade} from './render-quality.js?v=populated-8';

export function buildPedestrians(parent,world){
  const group=new THREE.Group();group.name='Sidewalk and boardwalk life';parent.add(group);
  const people=world.life.walkers.map((p,i)=>({...p,heading:0,colour:[0x416778,0xb66b48,0x79836b,0xc6bfa5,0x4e5761,0x8e6470][i%6],skin:[0xe0b997,0xb8845f,0x865c43,0xd2a17d][i%4]})),capacity=people.length;
  const clothing=new THREE.MeshStandardMaterial({color:0xffffff,vertexColors:false,roughness:1}),skin=new THREE.MeshStandardMaterial({color:0xffffff,roughness:.95});
  function batch(geometry,material,count){const mesh=new THREE.InstancedMesh(geometry,material,count);mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);mesh.instanceColor=new THREE.InstancedBufferAttribute(new Float32Array(count*3).fill(1),3);mesh.frustumCulled=false;mesh.userData.alwaysVisible=true;const fade=enableInstanceFade(mesh);group.add(mesh);return {mesh,fade};}
  const bodies=batch(new THREE.BoxGeometry(1,1,1),clothing,capacity*11),heads=batch(new THREE.SphereGeometry(.14,6,4),skin,capacity),object=new THREE.Object3D(),part=new THREE.Object3D(),matrix=new THREE.Matrix4(),colour=new THREE.Color();
  const stats={total:capacity,visible:0,triangles:0};let lastTime=-1,lastX=Infinity,lastZ=Infinity;
  function update(time,focus){
    if(time===lastTime&&focus.x===lastX&&focus.z===lastZ)return;
    const dt=lastTime<0?1:Math.min(.1,Math.max(0,time-lastTime));lastTime=time;lastX=focus.x;lastZ=focus.z;let bodyCount=0,headCount=0;
    for(const person of people){
      const dx=person.x2-person.x1,dz=person.z2-person.z1,length=Math.hypot(dx,dz),phase=time*person.speed*2/length+person.seed,t=.5-.5*Math.cos(phase),x=THREE.MathUtils.lerp(person.x1,person.x2,t),z=THREE.MathUtils.lerp(person.z1,person.z2,t),distance=Math.hypot(x-focus.x,z-focus.z);if(distance>115)continue;
      const direction=Math.sin(phase)>=0?1:-1,target=Math.atan2(-dx*direction,-dz*direction);person.heading+=Math.atan2(Math.sin(target-person.heading),Math.cos(target-person.heading))*(1-Math.exp(-9*dt));
      const y=world.surface(x,z).height,fade=distanceFade(distance,115),stride=Math.sin(time*person.speed*7+person.seed)*.32*Math.abs(Math.sin(phase));object.position.set(x,y,z);object.rotation.set(0,person.heading,0);object.updateMatrix();
      function box(w,h,d,lx,ly,lz,paint,rx=0){part.position.set(lx,ly,lz);part.rotation.set(rx,0,0);part.scale.set(w,h,d);part.updateMatrix();matrix.multiplyMatrices(object.matrix,part.matrix);bodies.mesh.setMatrixAt(bodyCount,matrix);bodies.mesh.setColorAt(bodyCount,colour.set(paint));bodies.fade.array[bodyCount++]=fade;}
      box(.4,.51,.23,0,1.13,0,person.colour);box(.32,.2,.23,0,.79,0,0x303c45);
      for(const side of[-1,1]){box(.13,.58,.15,side*.105,.43,Math.sin(stride*side)*.2,0x303c45,stride*side);box(.15,.1,.27,side*.105,.09,-.06+Math.sin(stride*side)*.3,0x283034);box(.12,.5,.14,side*.26,1.04,-Math.sin(stride*side)*.18,person.colour,-stride*side);box(.1,.13,.12,side*.26,.78,-Math.sin(stride*side)*.28,person.skin);}
      // One small facial strip gives direction at driving distance.
      box(.17,.025,.02,0,1.58,-.125,0x3c3834);
      part.position.set(0,1.56,0);part.rotation.set(0,0,0);part.scale.set(1,1.15,1);part.updateMatrix();matrix.multiplyMatrices(object.matrix,part.matrix);heads.mesh.setMatrixAt(headCount,matrix);heads.mesh.setColorAt(headCount,colour.set(person.skin));heads.fade.array[headCount++]=fade;
    }
    for(const [pool,count] of[[bodies,bodyCount],[heads,headCount]]){pool.mesh.count=count;pool.mesh.visible=count>0;if(count)for(const [attribute,size] of[[pool.mesh.instanceMatrix,16],[pool.mesh.instanceColor,3],[pool.fade,1]]){attribute.clearUpdateRanges();attribute.addUpdateRange(0,count*size);attribute.needsUpdate=true;}}
    stats.visible=headCount;stats.triangles=bodyCount*12+headCount*36;
  }
  update(0,world.spawns[0]);return {group,update,stats};
}
