import {finishPlayerWheels} from './wheel-finish.js?v=axle-steering-11';
import * as THREE from './vendor/three.module.min.js';
import {GLTFLoader} from './vendor/GLTFLoader.js';

// Ferrari 458 Italia by vicent091036 (CC BY 4.0), distributed with Three.js.
// Geometry is expanded ahead of time: no CDN, decoder worker or external files.
export function mountSportsCar(vehicle,gltf){
  const root=vehicle.car,model=gltf.scene,keep=new Set([vehicle.bodyMat,vehicle.tailMat]),geometries=new Set(),materials=new Set();
  for(const c of [...root.children]){c.traverse(o=>{if(o.geometry)geometries.add(o.geometry);if(o.material&&!keep.has(o.material))materials.add(o.material);});root.remove(c);}
  geometries.forEach(g=>g.dispose());materials.forEach(m=>{for(const value of Object.values(m))if(value?.isTexture)value.dispose();m.dispose();});
  model.updateMatrixWorld(true);
  const bounds=new THREE.Box3().setFromObject(model),center=bounds.getCenter(new THREE.Vector3());
  model.position.set(-center.x,-bounds.min.y-.55,-center.z);
  model.getObjectByName('body').material=vehicle.bodyMat;
  model.getObjectByName('lights_red').material=vehicle.tailMat;
  // Automotive clearcoat is a dielectric over paint, not polished red metal.
  Object.assign(vehicle.bodyMat,{metalness:.28,roughness:.25,clearcoat:1,clearcoatRoughness:.055,envMapIntensity:1.2});
  const glazing=new THREE.MeshPhysicalMaterial({color:0x334b59,metalness:.05,roughness:.06,transparent:true,opacity:.78,depthWrite:false,clearcoat:1,clearcoatRoughness:.04,envMapIntensity:.85});
  model.getObjectByName('glass').material=glazing;
  const led=new THREE.MeshStandardMaterial({color:0xedf4ff,emissive:0xb8d8ff,emissiveIntensity:2.2});
  for(const name of ['lights','leds'])model.getObjectByName(name).material=led;
  vehicle.wheels.length=0;vehicle.steerWheels.length=0;vehicle.wheelCenters.length=0;
  for(const name of ['wheel_fl','wheel_fr','wheel_rl','wheel_rr']){
    const wheel=model.getObjectByName(name),pivot=new THREE.Group();pivot.position.copy(wheel.position);wheel.parent.add(pivot);pivot.add(wheel);wheel.position.set(0,0,0);
    // The brake assembly follows steering but does not spin with the tire.
    model.updateMatrixWorld(true);for(const part of [...wheel.children])if(part.name.startsWith('brake'))pivot.attach(part);
    vehicle.wheels.push(wheel);vehicle.wheelCenters.push(pivot);if(name.startsWith('wheel_f'))vehicle.steerWheels.push(pivot);
  }
  model.traverse(o=>{if(o.isMesh){o.castShadow=o.material!==glazing;o.receiveShadow=true;if(o.material.roughness!==undefined&&o.material.name==='Tires')o.material.roughness=.94;}});
  const bodyPivot=new THREE.Group();model.children[0].add(bodyPivot);model.updateMatrixWorld(true);bodyPivot.attach(model.getObjectByName('main'));vehicle.bodyPivot=bodyPivot;
  const tread=document.createElement('canvas');tread.width=tread.height=256;const tx=tread.getContext('2d');tx.fillStyle='#b0b0b0';tx.fillRect(0,0,256,256);
  for(let y=0;y<256;y+=12)for(let x=0;x<256;x+=32){tx.fillStyle='#454545';tx.beginPath();tx.moveTo(x,y);tx.lineTo(x+13,y+5);tx.lineTo(x+13,y+8);tx.lineTo(x,y+3);tx.fill();}
  const treadMap=new THREE.CanvasTexture(tread);treadMap.wrapS=treadMap.wrapT=THREE.RepeatWrapping;treadMap.repeat.set(5,1);
  const rubber=new THREE.MeshStandardMaterial({color:0x202326,roughness:.94,bumpMap:treadMap,bumpScale:.008});
  rubber.name='Tires';
  const alloy=new THREE.MeshStandardMaterial({color:0xb2b7bb,metalness:.96,roughness:.28});
  for(const name of ['rim_fl','rim_fr','rim_rl','rim_rr'])model.getObjectByName(name).material=alloy;
  model.traverse(o=>{if(o.isMesh&&o.material?.name==='Tires')o.material=rubber;});
  root.add(model);
  // Close the open roof area with a lightweight painted coupe roof and glazing.
  const roofPositions=[],roofIndices=[],rows=10,columns=12;
  for(let row=0;row<=rows;row++){const t=row/rows,z=-.32+t*1.04,w=.67-t*.035;for(let col=0;col<=columns;col++){const u=col/columns*2-1;roofPositions.push(u*w,.675+Math.sin(t*Math.PI)*.035-.025*Math.abs(u)**4,z);}}
  for(let row=0;row<rows;row++)for(let col=0;col<columns;col++){const a=row*(columns+1)+col,b=a+columns+1;roofIndices.push(a,b,a+1,a+1,b,b+1);}
  const roofGeometry=new THREE.BufferGeometry();roofGeometry.setAttribute('position',new THREE.Float32BufferAttribute(roofPositions,3));roofGeometry.setIndex(roofIndices);roofGeometry.computeVertexNormals();
  const roof=new THREE.Mesh(roofGeometry,vehicle.bodyMat);roof.name='Coupe roof';roof.castShadow=true;roof.receiveShadow=true;root.add(roof);root.updateMatrixWorld(true);bodyPivot.attach(roof);
  const rearGeometry=new THREE.BufferGeometry();rearGeometry.setAttribute('position',new THREE.Float32BufferAttribute([-.635,.65,.72,.635,.65,.72,-.71,.42,1.3,.71,.42,1.3],3));rearGeometry.setIndex([0,2,1,1,2,3]);rearGeometry.computeVertexNormals();
  const rearGlass=new THREE.Mesh(rearGeometry,glazing);rearGlass.name='Coupe rear glazing';root.add(rearGlass);root.updateMatrixWorld(true);bodyPivot.attach(rearGlass);

  vehicle.flames.length=0;
  vehicle.assetReady=true;vehicle.assetName='Ferrari 458 Italia';model.updateMatrixWorld(true);
  finishPlayerWheels(vehicle);return vehicle;
}
export async function loadSportsCar(vehicle,onProgress){
  const gltf=await new GLTFLoader().loadAsync('./assets/cars/ferrari-458.glb',onProgress);
  return mountSportsCar(vehicle,gltf);
}
