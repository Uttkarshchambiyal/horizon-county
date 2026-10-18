import * as THREE from './vendor/three.module.min.js';
import {enableInstanceFade,distanceFade} from './render-quality.js?v=launch-beta-13';
import {createPedestrianMotion} from './pedestrian-motion.js?v=launch-beta-13';

export function buildPedestrians(parent,world,shadowMap){
  const group=new THREE.Group();group.name='Sidewalk and boardwalk life';parent.add(group);
  const motion=createPedestrianMotion(world),people=motion.people,capacity=people.length;
  const clothing=new THREE.MeshStandardMaterial({color:0xffffff,vertexColors:false,roughness:1}),skin=new THREE.MeshStandardMaterial({color:0xffffff,roughness:.95});
  function batch(geometry,material,count){const mesh=new THREE.InstancedMesh(geometry,material,count);mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);mesh.instanceColor=new THREE.InstancedBufferAttribute(new Float32Array(count*3).fill(1),3);mesh.frustumCulled=false;mesh.userData.alwaysVisible=true;const fade=enableInstanceFade(mesh);group.add(mesh);return {mesh,fade};}
  const bodies=batch(new THREE.BoxGeometry(1,1,1),clothing,capacity*11),heads=batch(new THREE.SphereGeometry(.14,6,4),skin,capacity),object=new THREE.Object3D(),part=new THREE.Object3D(),matrix=new THREE.Matrix4(),colour=new THREE.Color();
  const shadows=shadowMap?batch(new THREE.PlaneGeometry(1,1).rotateX(-Math.PI/2),new THREE.MeshBasicMaterial({map:shadowMap,transparent:true,opacity:.8,depthWrite:false}),capacity):null;
  const stats={total:capacity,visible:0,triangles:0,alert:0,crossing:0};
  function update(time,focus,context){
    if(!motion.update(time,focus,context))return;let bodyCount=0,headCount=0;
    for(const person of motion.nearby){
      const {x,z,stride}=person,distance=Math.hypot(x-focus.x,z-focus.z),y=world.surface(x,z).height,fade=distanceFade(distance,115);object.position.set(x,y,z);object.rotation.set(0,person.heading,0);object.updateMatrix();
      if(shadows){part.position.set(0,.025,0);part.rotation.set(0,0,0);part.scale.set(.8,1,.8);part.updateMatrix();matrix.multiplyMatrices(object.matrix,part.matrix);shadows.mesh.setMatrixAt(headCount,matrix);shadows.fade.array[headCount]=fade;}
      function box(w,h,d,lx,ly,lz,paint,rx=0,ry=0){part.position.set(lx,ly,lz);part.rotation.set(rx,ry,0);part.scale.set(w,h,d);part.updateMatrix();matrix.multiplyMatrices(object.matrix,part.matrix);bodies.mesh.setMatrixAt(bodyCount,matrix);bodies.mesh.setColorAt(bodyCount,colour.set(paint));bodies.fade.array[bodyCount++]=fade;}
      box(.4,.51,.23,0,1.13,0,person.colour);box(.32,.2,.23,0,.79,0,0x303c45);
      for(const side of[-1,1]){box(.13,.58,.15,side*.105,.43,Math.sin(stride*side)*.2,0x303c45,stride*side);box(.15,.1,.27,side*.105,.09,-.06+Math.sin(stride*side)*.3,0x283034);box(.12,.5,.14,side*.26,1.04,-Math.sin(stride*side)*.18-person.gesture*.12,person.colour,-stride*side-person.gesture);box(.1,.13,.12,side*.26,.78+person.gesture*.12,-Math.sin(stride*side)*.28-person.gesture*.3,person.skin);}
      // One small facial strip gives direction at driving distance.
      box(.17,.025,.02,-Math.sin(person.headTurn)*.125,1.58,-Math.cos(person.headTurn)*.125,0x3c3834,0,person.headTurn);
      part.position.set(0,1.56,0);part.rotation.set(0,0,0);part.scale.set(1,1.15,1);part.updateMatrix();matrix.multiplyMatrices(object.matrix,part.matrix);heads.mesh.setMatrixAt(headCount,matrix);heads.mesh.setColorAt(headCount,colour.set(person.skin));heads.fade.array[headCount++]=fade;
    }
    for(const [pool,count] of[[bodies,bodyCount],[heads,headCount]]){pool.mesh.count=count;pool.mesh.visible=count>0;if(count)for(const [attribute,size] of[[pool.mesh.instanceMatrix,16],[pool.mesh.instanceColor,3],[pool.fade,1]]){attribute.clearUpdateRanges();attribute.addUpdateRange(0,count*size);attribute.needsUpdate=true;}}
    if(shadows){shadows.mesh.count=headCount;shadows.mesh.visible=headCount>0;for(const [attribute,size] of[[shadows.mesh.instanceMatrix,16],[shadows.fade,1]]){attribute.clearUpdateRanges();attribute.addUpdateRange(0,headCount*size);attribute.needsUpdate=true;}}
    stats.visible=headCount;stats.triangles=bodyCount*12+headCount*(shadows?38:36);Object.assign(stats,motion.stats);
  }
  update(0,world.spawns[0]);return {group,update,stats,nearby:motion.nearby};
}
