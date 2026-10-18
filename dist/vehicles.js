import {finishPlayerWheels} from './wheel-finish.js?v=launch-beta-13';
import * as THREE from './vendor/three.module.min.js';
import {GLTFLoader} from './vendor/GLTFLoader.js';
import {VEHICLES,vehicleSpec} from './vehicle-data.js?v=launch-beta-13';
import {fleetModel} from './traffic-models.js?v=launch-beta-13';
import {mountSportsCar} from './sports-car.js?v=launch-beta-13';
export {VEHICLES,vehicleSpec};
function disposeTree(root,keep=new Set()){
  const geometries=new Set(),materials=new Set(),textures=new Set();root.traverse(o=>{if(o.geometry)geometries.add(o.geometry);for(const m of Array.isArray(o.material)?o.material:[o.material])if(m&&!keep.has(m))materials.add(m);});
  geometries.forEach(g=>g.dispose());for(const m of materials){for(const value of Object.values(m))if(value?.isTexture)textures.add(value);m.dispose();}textures.forEach(t=>t.dispose());
}
function clearVehicle(vehicle){disposeTree(vehicle.car,new Set([vehicle.bodyMat,vehicle.tailMat]));vehicle.car.clear();vehicle.wheels.length=0;vehicle.steerWheels.length=0;vehicle.wheelCenters.length=0;vehicle.flames.length=0;vehicle.wheelBlur=[];vehicle.wheelRadii=[];vehicle.lampMaterials=[];for(const key of ['map','normalMap','roughnessMap','metalnessMap','aoMap']){vehicle.bodyMat[key]?.dispose();vehicle.bodyMat[key]=null;}vehicle.bodyMat.vertexColors=false;vehicle.bodyMat.needsUpdate=true;}
function addWheel(vehicle,group,position,index){const pivot=new THREE.Group();pivot.position.fromArray(position);pivot.name=['steer_fl','steer_fr','axle_rl','axle_rr'][index];pivot.add(group);group.position.set(0,0,0);vehicle.car.add(pivot);vehicle.wheels.push(group);vehicle.wheelCenters.push(pivot);if(index<2)vehicle.steerWheels.push(pivot);return pivot;}
export function mountTrafficVehicle(vehicle){
  clearVehicle(vehicle);const model=fleetModel(vehicle.spec.id),body=new THREE.Group();vehicle.car.add(body);vehicle.bodyPivot=body;
  vehicle.bodyMat.vertexColors=true;vehicle.bodyMat.needsUpdate=true;
  for(const part of model.parts){const material=part.paint?vehicle.bodyMat:part.tail?vehicle.tailMat:part.material.clone(),mesh=new THREE.Mesh(part.geometry.clone(),material);mesh.castShadow=true;mesh.receiveShadow=true;body.add(mesh);}
  model.wheels.forEach((position,index)=>{const group=new THREE.Group();for(const part of model.wheelParts){const mesh=new THREE.Mesh(part.geometry.clone(),part.material.clone());mesh.castShadow=true;mesh.receiveShadow=true;group.add(mesh);}addWheel(vehicle,group,position,index);});
  finishPlayerWheels(vehicle);vehicle.assetReady=false;vehicle.assetLevel='traffic';vehicle.assetName=vehicle.spec.name;return vehicle;
}
export function createVehicle(parent,id='clubsport'){
  const spec=vehicleSpec(id),car=new THREE.Group();car.name=spec.name;parent.add(car);
  const vehicle={car,spec,bodyMat:new THREE.MeshPhysicalMaterial({color:spec.color,metalness:.28,roughness:.26,clearcoat:1,clearcoatRoughness:.07,envMapIntensity:1.1}),tailMat:new THREE.MeshStandardMaterial({color:0xd92426,emissive:0xb40b0e,emissiveIntensity:.4,vertexColors:true}),wheels:[],steerWheels:[],wheelCenters:[],flames:[],assetStatus:'idle'};
  return mountTrafficVehicle(vehicle);
}
export function mountDetailedVehicle(vehicle,gltf){
  if(vehicle.spec.id==='clubsport'){vehicle.bodyMat.vertexColors=false;vehicle.bodyMat.needsUpdate=true;mountSportsCar(vehicle,gltf);vehicle.assetLevel='detailed';return vehicle;}
  clearVehicle(vehicle);const model=gltf.scene,body=new THREE.Group();vehicle.car.add(model,body);vehicle.bodyPivot=body;
  model.updateMatrixWorld(true);for(const child of [...model.getObjectByName('Car').children])if(!/^wheel_[fr][lr]$/.test(child.name))body.attach(child);
  const originalMaterials=new Set();
  model.traverse(o=>{if(!o.isMesh)return;const m=o.material,role=m.userData.horizonRole;o.castShadow=role!=='glass';o.receiveShadow=true;
    if(role==='wheel'){m.roughness=Math.max(.3,m.roughness);return;}
  });
  body.traverse(o=>{if(!o.isMesh)return;const m=o.material,role=m.userData.horizonRole;o.castShadow=role!=='glass';o.receiveShadow=true;
    if(role==='paint'){for(const key of ['map','normalMap','roughnessMap','metalnessMap','aoMap'])if(m[key])vehicle.bodyMat[key]=m[key];vehicle.bodyMat.vertexColors=false;vehicle.bodyMat.needsUpdate=true;o.material=vehicle.bodyMat;originalMaterials.add(m);}
    else if(role==='tail'){// Retain lamp textures and original red/white details.
      m.emissive.set(0xaa1010);m.emissiveIntensity=.2;vehicle.lampMaterials.push(m);
    }else if(role==='glass'){m.transparent=true;m.depthWrite=false;m.opacity=.76;m.roughness=.12;}
  });
  for(const m of originalMaterials)m.dispose();
  for(const [index,name] of ['wheel_fl','wheel_fr','wheel_rl','wheel_rr'].entries()){
    const wheel=model.getObjectByName(name),position=wheel.position.toArray();wheel.removeFromParent();const pivot=addWheel(vehicle,wheel,position,index);
    for(const part of [...wheel.children])if(/caliper|brake/i.test(part.name)){vehicle.car.updateMatrixWorld(true);pivot.attach(part);}
  }
  vehicle.assetReady=true;vehicle.assetLevel='detailed';vehicle.assetName=vehicle.spec.name;vehicle.car.updateMatrixWorld(true);finishPlayerWheels(vehicle);return vehicle;
}
// One download at a time. A selection change cancels the old fetch; at most
// three detailed cars are kept resident, with identical real-mesh fallbacks.
export function createGarageLoader(garage,{maxDetailed=3,loadTimeoutMs=15000}={}){
  let active,controller,clock=0;const lastUsed=new Map();
  function trim(){const ready=garage.filter(v=>v.assetReady);while(ready.length>maxDetailed){const stale=ready.filter(v=>v!==active).sort((a,b)=>(lastUsed.get(a)||0)-(lastUsed.get(b)||0))[0];mountTrafficVehicle(stale);stale.assetStatus='idle';ready.splice(ready.indexOf(stale),1);}}
  return {async select(vehicle,onProgress){
    active=vehicle;lastUsed.set(vehicle,++clock);controller?.abort();controller=null;if(vehicle.assetReady){trim();return vehicle;}
    const request=new AbortController();let timedOut=false;const timer=setTimeout(()=>{timedOut=true;request.abort();},loadTimeoutMs);controller=request;vehicle.pendingRequest=request;vehicle.assetStatus='loading';onProgress?.({loaded:0,total:0});
    try{
      const response=await fetch(vehicle.spec.file,{signal:request.signal});if(!response.ok)throw Error('Model download failed ('+response.status+')');const data=await response.arrayBuffer();if(request.signal.aborted)return vehicle;
      const gltf=await new GLTFLoader().parseAsync(data,'');if(request.signal.aborted||active!==vehicle){disposeTree(gltf.scene);return vehicle;}
      vehicle.lampMaterials=[];mountDetailedVehicle(vehicle,gltf);vehicle.assetStatus='ready';trim();return vehicle;
    }catch(error){if(timedOut){if(vehicle.pendingRequest===request)vehicle.assetStatus='error';throw Error('Model download timed out');}if(error.name!=='AbortError'){if(vehicle.pendingRequest===request)vehicle.assetStatus='error';throw error;}return vehicle;}
    finally{clearTimeout(timer);if(controller===request)controller=null;if(vehicle.pendingRequest===request){vehicle.pendingRequest=null;if(vehicle.assetStatus==='loading')vehicle.assetStatus='idle';}}
  },get resident(){return garage.filter(v=>v.assetReady).map(v=>v.spec.id);}};
}
