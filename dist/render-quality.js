import * as THREE from './vendor/three.module.min.js';

export function renderPixelRatio(mode,dpr,width,height,adaptive=1){
  const native=Math.max(1,Math.min(2,Number(dpr)||1)),desired=mode==='quality'?Math.max(1.25,native):mode==='performance'?1:Math.max(.8,Math.min(native,1.35,adaptive));
  const budget=mode==='quality'?4_200_000:mode==='performance'?1_400_000:2_100_000;
  return Math.min(desired,Math.sqrt(budget/Math.max(1,width*height)));
}
// Measure delivered frames, including stalls. Hysteresis prevents quality from
// oscillating when a laptop sits near the 16.7 ms frame budget.
export function createFrameBudget(){
  let elapsed=0,frames=[],cooldown=0,stable=0;
  const status={fps:0,frameMs:0,p95:0,scale:1,tier:0,changed:false};
  return {status,reset(){elapsed=0;frames=[];stable=0;},sample(seconds){
    if(!Number.isFinite(seconds)||seconds<=0)return null;
    elapsed+=seconds;frames.push(seconds*1000);if(elapsed<1)return null;
    const sorted=frames.slice().sort((a,b)=>a-b),ms=elapsed*1000/frames.length;
    Object.assign(status,{fps:Math.round(frames.length/elapsed),frameMs:ms,p95:sorted[Math.floor((sorted.length-1)*.95)],changed:false});
    cooldown=Math.max(0,cooldown-elapsed);
    if(ms>18.2){stable=0;if(!cooldown){
      if(status.tier<2){status.tier++;status.changed=true;}
      if(status.scale>.8){status.scale=Math.max(.8,Math.round((status.scale-.1)*10)/10);status.changed=true;}
      cooldown=3;
    }}else if(ms<17.2&&status.p95<20){stable+=elapsed;if(stable>15&&!cooldown){
      if(status.tier>0){status.tier--;status.changed=true;}else if(status.scale<1){status.scale=Math.min(1,status.scale+.05);status.changed=true;}
      stable=0;cooldown=5;
    }}else stable=0;
    elapsed=0;frames=[];return {...status};
  }};
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
      shader.fragmentShader=shader.fragmentShader.replace('#include <clipping_planes_fragment>','#include <clipping_planes_fragment>\n#ifdef USE_INSTANCING\nfloat fadeNoise=fract(52.9829189*fract(dot(floor(gl_FragCoord.xy),vec2(.06711056,.00583715))));\nif(abs(vInstanceFade) < (vInstanceFade<0.?1.-fadeNoise:fadeNoise))discard;\n#endif');
    };
    material.customProgramCacheKey=()=>key()+'-distance-fade-v2';material.needsUpdate=true;
  }
  return fade;
}
const sunOffset=new THREE.Vector3(-130,190,110),shadowRight=new THREE.Vector3(110,0,130).normalize(),shadowDirection=sunOffset.clone().normalize(),shadowUp=new THREE.Vector3().crossVectors(shadowDirection,shadowRight).normalize(),shadowAnchor=new THREE.Vector3();
export function stabilizeSun(light,target){
  const texel=130/light.shadow.mapSize.x,r=Math.round(target.dot(shadowRight)/texel)*texel,u=Math.round(target.dot(shadowUp)/texel)*texel,d=target.dot(shadowDirection);
  shadowAnchor.copy(shadowRight).multiplyScalar(r).addScaledVector(shadowUp,u).addScaledVector(shadowDirection,d);light.target.position.copy(shadowAnchor);light.position.copy(shadowAnchor).add(sunOffset);
}
