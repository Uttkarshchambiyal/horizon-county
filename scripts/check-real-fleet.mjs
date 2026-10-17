import assert from 'node:assert/strict';
import fs from 'node:fs';
import * as THREE from '../dist/vendor/three.module.min.js';
import {GLTFLoader} from '../dist/vendor/GLTFLoader.js';
import {VEHICLES,createVehicle,mountDetailedVehicle,mountTrafficVehicle,createGarageLoader} from '../dist/vehicles.js';
import {fleetModel,fleetProxy,enableFleetPaint} from '../dist/traffic-models.js';
import {animateVehicle} from '../dist/vehicle-motion.js';
import {createCareer} from '../dist/career.js';
const ctx=new Proxy({},{get:()=>()=>{}});globalThis.document={createElement:()=>({getContext:()=>ctx})};
// Decode all genuine geometry and rigs through the shipping GLTFLoader.
// Texture image upload needs a browser; verify embedded image bytes separately.
function geometryOnlyGLB(data){
  const length=data.readUInt32LE(12),json=JSON.parse(data.subarray(20,20+length)),bin=data.subarray(28+length);
  for(const image of json.images||[]){assert.ok(image.bufferView!==undefined,'Every image must be local');assert.ok(json.bufferViews[image.bufferView].byteLength>100,'Embedded texture must contain data');}
  function strip(o){for(const k of Object.keys(o)){if(/texture$/i.test(k))delete o[k];else if(o[k]&&typeof o[k]==='object')strip(o[k]);}}for(const m of json.materials||[])strip(m);delete json.images;delete json.textures;delete json.samplers;
  const text=Buffer.from(JSON.stringify(json)),padded=Buffer.alloc((text.length+3)&~3,32);text.copy(padded);const out=Buffer.alloc(28+padded.length+bin.length);out.writeUInt32LE(0x46546c67,0);out.writeUInt32LE(2,4);out.writeUInt32LE(out.length,8);out.writeUInt32LE(padded.length,12);out.writeUInt32LE(0x4e4f534a,16);padded.copy(out,20);out.writeUInt32LE(bin.length,20+padded.length);out.writeUInt32LE(0x004e4942,24+padded.length);bin.copy(out,28+padded.length);return out.buffer;
}
const files=new Map(),fingerprints=new Set();
assert.equal(VEHICLES.length,9);
for(const spec of VEHICLES){
  const buffer=fs.readFileSync(new URL('../dist/'+spec.file.slice(2),import.meta.url)),data=geometryOnlyGLB(buffer);files.set(spec.file,data);
  const gltf=await new GLTFLoader().parseAsync(data,''),v=createVehicle(new THREE.Group(),spec.id),shared=fleetModel(spec.id);let disposedShared=0;for(const p of [...shared.parts,...shared.wheelParts])p.geometry.addEventListener('dispose',()=>disposedShared++);
  v.lampMaterials=[];mountDetailedVehicle(v,gltf);assert.equal(v.assetReady,true);assert.equal(v.wheels.length,4);assert.equal(v.steerWheels.length,2);
  const size=new THREE.Box3().setFromObject(v.car).getSize(new THREE.Vector3());assert.ok(Math.abs(size.z-spec.length)<.08,spec.name+' must retain real proportions');assert.ok(size.x>1.7&&size.y>1);v.car.traverse(o=>{if(o.isMesh)for(const n of o.geometry.attributes.position.array)assert.ok(Number.isFinite(n));});
  animateVehicle(v,{steerAngle:.45,wheelTravel:0});assert.ok(v.steerWheels.every(p=>p.rotation.y>0));assert.ok(v.wheelCenters.slice(2).every(p=>p.rotation.y===0));assert.equal(v.bodyPivot.rotation.y,0,'Body must not rotate when wheels steer at rest');const before=v.wheels.map(w=>w.rotation.x);animateVehicle(v,{steerAngle:.45,wheelTravel:12});assert.ok(v.wheels.every((w,i)=>Math.abs(w.rotation.x-before[i])>10));
  mountTrafficVehicle(v);assert.equal(disposedShared,0,'Player switches must not dispose shared traffic meshes');assert.equal(v.wheels.length,4);
  const wheel=shared.wheelParts[0].geometry;wheel.computeBoundingBox();const extent=wheel.boundingBox.getSize(new THREE.Vector3());assert.ok(extent.y>spec.radius*1.8&&extent.z>spec.radius*1.8,spec.name+' tire must not collapse');assert.ok(extent.x>.12&&wheel.attributes.position.count>=24,'Wheel must have width and a round silhouette');
  fingerprints.add(shared.parts.find(p=>p.paint)?.geometry.attributes.position.count+':'+shared.spec.length);const proxy=fleetProxy(shared);assert.ok(proxy.attributes.paintMask);if(spec.id!=='clubsport')assert.ok(proxy.index.count/3<3500); assert.ok(proxy.attributes.color.count===proxy.attributes.position.count);
  console.log('PASS '+spec.name+': local detailed geometry, four rolling wheels, two steering pivots, preserved proportions and real-mesh fallback');
}
assert.equal(fingerprints.size,9,'Every model must have distinct authored geometry');
const shader={vertexShader:'#include <color_vertex>',fragmentShader:''},material=enableFleetPaint(new THREE.MeshStandardMaterial());material.onBeforeCompile(shader,{});assert.ok(shader.vertexShader.includes('mix(vec3(1.),instanceColor.xyz,paintMask)'),'Distant paint must preserve rubber and glass colours');
// Exercise the actual asynchronous loader with shipping geometry: cancellation,
// failed downloads, cache eviction and recovery must keep a real model visible.
const nativeFetch=globalThis.fetch,garage=VEHICLES.map(s=>createVehicle(new THREE.Group(),s.id)),loader=createGarageLoader(garage);let delay=false;
globalThis.fetch=async (file,{signal})=>{if(file===VEHICLES[8].file)return {ok:false,status:404};if(delay)await new Promise((resolve,reject)=>{const timer=setTimeout(resolve,10);signal.addEventListener('abort',()=>{clearTimeout(timer);reject(new DOMException('Aborted','AbortError'));},{once:true});});return {ok:true,arrayBuffer:async()=>files.get(file)};};
try{
  for(const v of garage.slice(0,5))await loader.select(v);assert.equal(loader.resident.length,3);assert.equal(garage[0].assetLevel,'traffic');assert.equal(garage[4].assetReady,true);
  delay=true;const old=loader.select(garage[5]),latest=loader.select(garage[6]);await Promise.all([old,latest]);assert.equal(garage[5].assetReady,false);assert.equal(garage[6].assetReady,true);assert.ok(loader.resident.length<=3);
  await assert.rejects(loader.select(garage[8]),/404/);assert.equal(garage[8].assetLevel,'traffic');assert.equal(garage[8].assetStatus,'error');assert.ok(garage[8].car.children.length>0);
}finally{globalThis.fetch=nativeFetch;}
const storage={getItem:()=>JSON.stringify({version:1,credits:10000,upgrades:{touring:{engine:2},trail:{tires:1}}}),setItem(){}};const career=createCareer([],storage);assert.equal(career.levels('touring').engine,2);for(const spec of VEHICLES){career.profile.credits=10000;assert.equal(career.purchase(spec.id,'brakes').ok,true,'Every real car must support upgrades');}
console.log('PASS Nine-car loading: bounded detailed residency, rapid-switch cancellation, failed-download fallback, paint-mask shader and saved legacy/new-car upgrades (geometry tests; GPU image decoding not measured)');
