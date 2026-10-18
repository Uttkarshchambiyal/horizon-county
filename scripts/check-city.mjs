import assert from 'node:assert/strict';
import fs from 'node:fs';
import * as THREE from '../dist/vendor/three.module.min.js';
import {makeOpenWorld} from '../dist/world-data.js';
import {buildCity} from '../dist/city-view.js';
import {createVehicle} from '../dist/vehicles.js';
import {GLTFLoader} from '../dist/vendor/GLTFLoader.js';
import {mountSportsCar} from '../dist/sports-car.js';
const world=makeOpenWorld(),types=new Set(world.buildings.map(b=>b.type));
assert.ok(world.buildings.length>=450);assert.ok(types.size>=12);assert.equal(world.blocks.length,30);
for(const block of world.blocks){
  const count=world.buildings.filter(b=>Math.abs(b.x-block.x)<120&&Math.abs(b.z-block.z)<120).length;
  assert.ok(count>=9,'Every city block needs continuous street frontage: '+block.id);
}
for(const type of ['house','villa','loft','glass','round','setback','artdeco','apartment','motel','garage','retail','warehouse','civic'])assert.ok(types.has(type),'Missing architecture '+type);
assert.ok(world.blocks.some(b=>b.use==='plaza'));assert.ok(world.blocks.some(b=>b.use==='service'));assert.ok(world.blocks.some(b=>b.use==='parking'));
const plaza=world.landmarks.find(l=>l.name==='Horizon Plaza');assert.equal(world.resolve(plaza.x,plaza.z,0).hit,true,'The fountain must be solid');
const context=new Proxy({createRadialGradient:()=>({addColorStop(){}}),createLinearGradient:()=>({addColorStop(){}})},{get:(o,k)=>o[k]||(()=>{})});globalThis.document={createElement:()=>({getContext:()=>context})};
const scene=new THREE.Scene(),city=buildCity(scene,world);assert.ok(city.stats.balconies>500);assert.ok(city.stats.streetTrees>800);assert.ok(city.stats.props>300);
console.log(`PASS Dense neighbourhoods: ${world.buildings.length} buildings, ${types.size} architectures, 30 populated blocks, ${city.stats.balconies} balconies, ${city.stats.streetTrees} street trees; solid fountain and service fixtures`);
const binary=fs.readFileSync(new URL('../dist/assets/cars/ferrari-458.glb',import.meta.url)),buffer=binary.buffer.slice(binary.byteOffset,binary.byteOffset+binary.byteLength),loader=new GLTFLoader(),gltf=await loader.parseAsync(buffer,'');
const vehicle=createVehicle(new THREE.Group(),'clubsport'),wheels=vehicle.wheels,steering=vehicle.steerWheels;
const json=JSON.parse(binary.subarray(20,20+binary.readUInt32LE(12)).toString());assert.ok(!json.extensionsRequired?.includes('KHR_draco_mesh_compression'));assert.equal(json.asset.extras.author,'vicent091036');assert.equal(json.asset.extras.license,'CC-BY-4.0');
mountSportsCar(vehicle,gltf);
{
  const g=gltf.scene.getObjectByName('body').geometry,p=g.attributes.position,n=g.attributes.normal,a=new THREE.Vector3(),b=new THREE.Vector3(),c=new THREE.Vector3(),normal=new THREE.Vector3(),temp=new THREE.Vector3();let reversed=0,total=0;
  for(let i=0;i<g.index.count;i+=3){const x=g.index.getX(i),y=g.index.getX(i+1),z=g.index.getX(i+2);a.fromBufferAttribute(p,x);b.fromBufferAttribute(p,y).sub(a);c.fromBufferAttribute(p,z).sub(a);b.cross(c);if(b.lengthSq()<1e-14)continue;normal.fromBufferAttribute(n,x).add(temp.fromBufferAttribute(n,y)).add(temp.fromBufferAttribute(n,z));if(b.normalize().dot(normal.normalize())<-.01)reversed++;total++;}
  assert.ok(reversed/total<.005,'Simplification must not turn painted body panels inside out');
}
assert.equal(vehicle.wheels,wheels,'Animation references must survive the asynchronous model replacement');assert.equal(vehicle.steerWheels,steering);assert.equal(wheels.length,4);assert.equal(steering.length,2);assert.equal(vehicle.flames.length,0);assert.equal(vehicle.assetReady,true);
const bounds=new THREE.Box3().setFromObject(vehicle.car),size=bounds.getSize(new THREE.Vector3());assert.ok(size.z>4.4&&size.z<4.7);assert.ok(size.y>1.1&&size.y<1.4);assert.ok(Math.abs(bounds.min.y+.55)<.001,'Tires must sit on the driving surface');
const roofRay=new THREE.Raycaster(new THREE.Vector3(0,5,0),new THREE.Vector3(0,-1,0));vehicle.car.updateMatrixWorld(true);assert.ok(roofRay.intersectObject(vehicle.car).some(h=>h.object.name==='Coupe roof'&&h.point.y>.65),'Closed coupe roof must cover the cockpit');assert.ok(world.streetDetails.length>400);
let triangles=0;vehicle.car.traverse(o=>{if(o.isMesh){triangles+=(o.geometry.index?.count||o.geometry.attributes.position.count)/3;for(const value of o.geometry.attributes.position.array)assert.ok(Number.isFinite(value));}});assert.ok(triangles>70000&&triangles<120000,'Player model must retain detail within the rendering budget');assert.equal(gltf.scene.getObjectByName('body').material,vehicle.bodyMat);assert.equal(gltf.scene.getObjectByName('lights_red').material,vehicle.tailMat);
for(const pivot of steering){assert.ok(pivot.children.length>=1);assert.ok(pivot.position.z<0);pivot.rotation.y=.2;}for(const wheel of wheels)wheel.rotation.x-=1;
console.log(`PASS Actual Ferrari GLB parses without a decoder: ${triangles.toLocaleString()} triangles, real-scale bounds, grounded tires, live steering/rolling pivots, shared paint/brake materials and attribution`);
