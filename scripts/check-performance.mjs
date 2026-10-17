import assert from 'node:assert/strict';
import * as THREE from '../dist/vendor/three.module.min.js';
import {makeOpenWorld} from '../dist/world-data.js';
import {buildOpenWorld} from '../dist/world-view.js';
import {makeTraffic} from '../dist/traffic.js';
import {buildTrafficView} from '../dist/traffic-view.js';
import {fleetModel,FLEET_TYPES} from '../dist/traffic-models.js';
const ctx=new Proxy({createImageData:(w,h)=>({data:new Uint8ClampedArray(w*h*4)}),createLinearGradient:()=>({addColorStop(){}})},{get:(o,k)=>o[k]||(()=>{})});globalThis.document={createElement:()=>({getContext:()=>ctx})};
const scene=new THREE.Scene(),world=makeOpenWorld(),view=buildOpenWorld(scene,world),traffic=makeTraffic(world),fleet=buildTrafficView(scene,world,traffic);
const shapes=new Set();
for(const type of FLEET_TYPES){const model=fleetModel(type);shapes.add([model.spec.length,model.spec.height,model.spec.wheelbase].join(','));assert.equal(model.wheels.length,4);let triangles=0;for(const part of[...model.parts,...model.wheelParts]){for(const v of part.geometry.attributes.position.array)assert.ok(Number.isFinite(v),type+' geometry must be finite');triangles+=(part.geometry.index?.count||part.geometry.attributes.position.count)/3*(model.wheelParts.includes(part)?4:1);}assert.ok(triangles<2600,'Each traffic vehicle must stay within its geometry budget');}assert.equal(shapes.size,6);
for(const spawn of world.spawns){
  fleet.update(.5,spawn);view.population.update(1,spawn);
  const camera=new THREE.PerspectiveCamera(57,1.6,.18,10000),y=world.surface(spawn.x,spawn.z).height;
  camera.position.set(spawn.x+Math.sin(spawn.heading)*10.5,y+5,spawn.z+Math.cos(spawn.heading)*10.5);camera.lookAt(spawn.x-Math.sin(spawn.heading)*10,y+.8,spawn.z-Math.cos(spawn.heading)*10);camera.updateMatrixWorld();view.visibility.update(spawn.x,spawn.z,'auto',true,camera);scene.updateMatrixWorld(true);
  const frustum=new THREE.Frustum().setFromProjectionMatrix(new THREE.Matrix4().multiplyMatrices(camera.projectionMatrix,camera.matrixWorldInverse));let triangles=0,calls=0;
  scene.traverseVisible(mesh=>{if(!mesh.isMesh)return;const geometry=mesh.geometry;for(const v of geometry.attributes.position.array)assert.ok(Number.isFinite(v),'Scenery must contain no invalid vertices');if(mesh.isInstancedMesh){for(const v of mesh.instanceMatrix.array)assert.ok(Number.isFinite(v),'Fleet transforms must be finite');if(mesh.count===0)return;}if(mesh.frustumCulled&&!frustum.intersectsObject(mesh))return;triangles+=(geometry.index?.count||geometry.attributes.position.count)/3*(mesh.isInstancedMesh?mesh.count:1);calls++;});
  assert.ok(triangles<320000,'World camera triangle budget exceeded: '+triangles);assert.ok(calls<165,'World camera draw budget exceeded: '+calls);assert.ok(fleet.stats.visibleCars<40,'Distant fleet instances must be omitted');console.log(`PASS ${spawn.name} scenery submission budget: ${Math.round(triangles).toLocaleString()} triangles / ${calls} calls (GPU FPS is not measured)`);
}
traffic.enabled=false;fleet.update(1,world.spawns[0]);assert.ok(fleet.stats.visibleCars>0,'Parked cars must remain when moving traffic is disabled');const cached=fleet.group.children.filter(m=>m.isInstancedMesh).map(m=>[m,m.instanceMatrix.version]);fleet.update(1,world.spawns[0]);for(const [mesh,version] of cached)assert.equal(mesh.instanceMatrix.version,version,'An unchanged parked fleet must not upload transforms again');traffic.enabled=true;
fleet.update(1,{x:100000,z:100000});assert.equal(fleet.stats.visibleCars,0);for(const mesh of fleet.group.children)if(mesh.isInstancedMesh&&mesh.instanceMatrix.usage===THREE.DynamicDrawUsage)assert.equal(mesh.count,0,'Distant traffic must submit no instances');
for(const i of world.regionItems){if(i.type==='rock')for(const road of world.roads)for(const p of road.samples)assert.ok(Math.hypot(p.x-i.x,p.z-i.z)>=road.width/2+i.r+27.9,'Boulders must stay beyond shoulders');if(i.site.startsWith('beach-')&&['lounger','towel'].includes(i.type))assert.ok(world.regionItems.some(p=>p.type==='umbrella'&&p.site===i.site&&Math.hypot(p.x-i.x,p.z-i.z)<4),'Beach furniture must belong to a seating group');}
for(const type of['palm','street-tree','inland-tree']){const tree=world.colliders.find(c=>c.type===type);assert.ok(tree,type+' must have a collision shape');assert.equal(world.resolve(tree.cx,tree.cz,0).hit,true);}
assert.ok(world.streetDetails.length>=500);
const fountain=world.blocks.find(b=>b.use==='plaza');assert.equal(world.resolve(fountain.x+8.6,fountain.z+8.6,0).hit,false,'Rounded fountain corners must not create square ghost obstacles');
console.log('PASS Six lightweight vehicle silhouettes, finite scenery/instances, distant fleet culling, grouped beach furniture, road shoulder clearance and circular fountain collision');
