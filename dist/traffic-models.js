import * as THREE from './vendor/three.module.min.js';
import {mergeGeometries} from './vendor/BufferGeometryUtils.js';
import {REAL_CAR_MESHES} from './real-car-meshes.js?v=real-fleet-10';
import {vehicleSpec} from './vehicle-data.js?v=real-fleet-10';
export {FLEET_TYPES} from './fleet-data.js?v=real-fleet-10';
const cache=new Map();
function bytes(value){return Uint8Array.from(atob(value),c=>c.charCodeAt(0));}
function geometry(data){
  const g=new THREE.BufferGeometry(),p=new Int16Array(bytes(data.p).buffer);
  g.setAttribute('position',new THREE.BufferAttribute(Float32Array.from(p,v=>v/32767*10),3));g.setAttribute('normal',new THREE.BufferAttribute(new Int8Array(bytes(data.n).buffer),3,true));g.setAttribute('color',new THREE.BufferAttribute(bytes(data.c),3,true));g.setIndex(new THREE.BufferAttribute(new (data.j===32?Uint32Array:Uint16Array)(bytes(data.i).buffer),1));if(data.m)g.setAttribute('paintMask',new THREE.BufferAttribute(bytes(data.m),1,true));g.computeBoundingSphere();return g;
}
// All levels are derived from the credited real-car meshes. No substitute
// procedural body is used when a detailed download is still in flight.
export function fleetModel(type){
  const spec=vehicleSpec(type);if(cache.has(spec.id))return cache.get(spec.id);
  const source=REAL_CAR_MESHES[spec.id],parts=[];
  for(const role of ['paint','trim','glass','tail'])if(source[role]){
    const material=new THREE.MeshStandardMaterial({color:0xffffff,vertexColors:true,metalness:role==='paint'?.3:.15,roughness:role==='glass'?.18:role==='paint'?.3:.65});
    if(role==='tail'){material.emissive.set(0x3d0808);material.emissiveIntensity=.25;}
    parts.push({geometry:geometry(source[role]),material,paint:role==='paint',tail:role==='tail',role});
  }
  const model={spec,wheels:spec.wheels,parts,wheelParts:[{geometry:geometry(source.wheel),material:new THREE.MeshStandardMaterial({vertexColors:true,roughness:.65,metalness:.35})}],proxy:source.proxy?geometry(source.proxy):null};cache.set(spec.id,model);return model;
}
export function fleetProxy(model){if(model.proxy)return model.proxy;const entries=[];for(const part of model.parts){const g=part.geometry.toNonIndexed();g.setAttribute('paintMask',new THREE.Float32BufferAttribute(new Float32Array(g.attributes.position.count).fill(part.paint?1:0),1));entries.push(g);}for(const center of model.wheels){const g=model.wheelParts[0].geometry.toNonIndexed().translate(...center);g.setAttribute('paintMask',new THREE.Float32BufferAttribute(new Float32Array(g.attributes.position.count),1));entries.push(g);}model.proxy=mergeGeometries(entries);entries.forEach(g=>g.dispose());return model.proxy;}
// Instance paint must affect painted panels only, keeping glass, trim and
// rubber their source colours even in a one-draw distant silhouette.
export function enableFleetPaint(material){
  const compile=material.onBeforeCompile,key=material.customProgramCacheKey.bind(material);
  material.onBeforeCompile=(shader,renderer)=>{compile.call(material,shader,renderer);shader.vertexShader='attribute float paintMask;\n'+shader.vertexShader;shader.vertexShader=shader.vertexShader.replace('#include <color_vertex>',THREE.ShaderChunk.color_vertex.replace('vColor.xyz *= instanceColor.xyz;','vColor.xyz *= mix(vec3(1.),instanceColor.xyz,paintMask);'));};material.customProgramCacheKey=()=>key()+'-fleet-panel-paint-v1';return material;
}
