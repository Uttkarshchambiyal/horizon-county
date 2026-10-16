import * as THREE from './vendor/three.module.min.js';
import {GLTFLoader} from './vendor/GLTFLoader.js';

// Ferrari 458 Italia by vicent091036 (CC BY 4.0), distributed with Three.js.
// Geometry is expanded ahead of time: no CDN, decoder worker or external files.
export function mountSportsCar(vehicle,gltf){
  const root=vehicle.car,model=gltf.scene,keep=new Set([vehicle.bodyMat,vehicle.tailMat]),geometries=new Set(),materials=new Set();
  for(const c of [...root.children]){c.traverse(o=>{if(o.geometry)geometries.add(o.geometry);if(o.material&&!keep.has(o.material))materials.add(o.material);});root.remove(c);}
  geometries.forEach(g=>g.dispose());materials.forEach(m=>{m.map?.dispose();m.dispose();});
  model.updateMatrixWorld(true);
  const bounds=new THREE.Box3().setFromObject(model),center=bounds.getCenter(new THREE.Vector3());
  model.position.set(-center.x,-bounds.min.y-.55,-center.z);
  model.getObjectByName('body').material=vehicle.bodyMat;
  model.getObjectByName('lights_red').material=vehicle.tailMat;
  const glazing=new THREE.MeshPhysicalMaterial({color:0x728c97,metalness:.12,roughness:.045,transparent:true,opacity:.48,depthWrite:false,clearcoat:1,envMapIntensity:1.05});
  model.getObjectByName('glass').material=glazing;
  const led=new THREE.MeshStandardMaterial({color:0xedf4ff,emissive:0xb8d8ff,emissiveIntensity:2.2});
  for(const name of ['lights','leds'])model.getObjectByName(name).material=led;
  vehicle.wheels.length=0;vehicle.steerWheels.length=0;vehicle.wheelCenters.length=0;
  for(const name of ['wheel_fl','wheel_fr','wheel_rl','wheel_rr']){
    const wheel=model.getObjectByName(name),pivot=new THREE.Group();pivot.position.copy(wheel.position);wheel.parent.add(pivot);pivot.add(wheel);wheel.position.set(0,0,0);
    vehicle.wheels.push(wheel);vehicle.wheelCenters.push(pivot);if(name.startsWith('wheel_f'))vehicle.steerWheels.push(pivot);
  }
  model.traverse(o=>{if(o.isMesh){o.castShadow=o.material!==glazing;o.receiveShadow=true;if(o.material.roughness!==undefined&&o.material.name==='Tires')o.material.roughness=.94;}});
  root.add(model);
  vehicle.flames.length=0;
  vehicle.assetReady=true;vehicle.assetName='Ferrari 458 Italia';model.updateMatrixWorld(true);
  return vehicle;
}
export async function loadSportsCar(vehicle,onProgress){
  const gltf=await new GLTFLoader().loadAsync('./assets/cars/ferrari-458.glb',onProgress);
  return mountSportsCar(vehicle,gltf);
}
