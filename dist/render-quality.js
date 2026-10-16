import * as THREE from './vendor/three.module.min.js';

export function renderPixelRatio(mode,dpr,width,height,adaptive=1.5){
  const native=Math.max(1,Math.min(2,Number(dpr)||1)),desired=mode==='quality'?Math.max(1.25,native):mode==='performance'?1:Math.max(1,Math.min(native,adaptive));
  // Clarity never undersamples CSS pixels. Bound the total framebuffer on 4K displays.
  return Math.max(1,Math.min(desired,Math.sqrt(6_300_000/Math.max(1,width*height))));
}
export function distanceFade(distance,range,extent=0){
  const start=range*.76,end=range+extent*.5,t=THREE.MathUtils.clamp((distance-start)/(end-start),0,1);return 1-t*t*(3-2*t);
}
const prepared=new WeakSet();
export function enableInstanceFade(mesh){
  mesh.geometry=mesh.geometry.clone();const fade=new THREE.InstancedBufferAttribute(new Float32Array(mesh.instanceMatrix.count).fill(1),1);fade.setUsage(THREE.DynamicDrawUsage);mesh.geometry.setAttribute('instanceFade',fade);
  const material=mesh.material;
  if(!prepared.has(material)){
    prepared.add(material);const compile=material.onBeforeCompile,key=material.customProgramCacheKey.bind(material);
    material.onBeforeCompile=(shader,renderer)=>{
      compile.call(material,shader,renderer);
      shader.vertexShader='#ifdef USE_INSTANCING\nattribute float instanceFade;varying float vInstanceFade;\n#endif\n'+shader.vertexShader;
      shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\n#ifdef USE_INSTANCING\nvInstanceFade=instanceFade;\n#endif');
      shader.fragmentShader='#ifdef USE_INSTANCING\nvarying float vInstanceFade;\n#endif\n'+shader.fragmentShader;
      shader.fragmentShader=shader.fragmentShader.replace('#include <clipping_planes_fragment>','#include <clipping_planes_fragment>\n#ifdef USE_INSTANCING\nif(vInstanceFade < fract(52.9829189*fract(dot(floor(gl_FragCoord.xy),vec2(.06711056,.00583715)))))discard;\n#endif');
    };
    material.customProgramCacheKey=()=>key()+'-distance-fade-v1';material.needsUpdate=true;
  }
  return fade;
}
const sunOffset=new THREE.Vector3(-130,190,110),shadowRight=new THREE.Vector3(110,0,130).normalize(),shadowDirection=sunOffset.clone().normalize(),shadowUp=new THREE.Vector3().crossVectors(shadowDirection,shadowRight).normalize(),shadowAnchor=new THREE.Vector3();
export function stabilizeSun(light,target){
  const texel=130/light.shadow.mapSize.x,r=Math.round(target.dot(shadowRight)/texel)*texel,u=Math.round(target.dot(shadowUp)/texel)*texel,d=target.dot(shadowDirection);
  shadowAnchor.copy(shadowRight).multiplyScalar(r).addScaledVector(shadowUp,u).addScaledVector(shadowDirection,d);light.target.position.copy(shadowAnchor);light.position.copy(shadowAnchor).add(sunOffset);
}
