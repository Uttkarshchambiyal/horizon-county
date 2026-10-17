import assert from 'node:assert/strict';
import * as THREE from '../dist/vendor/three.module.min.js';
import {surfaceDepthBias} from '../dist/render-quality.js';
import {makeOpenWorld} from '../dist/world-data.js';
import {buildOpenWorld} from '../dist/world-view.js';

const ctx=new Proxy({createImageData:(w,h)=>({data:new Uint8ClampedArray(w*h*4)}),createRadialGradient:()=>({addColorStop(){}}),createLinearGradient:()=>({addColorStop(){}})},{get:(o,k)=>o[k]||(()=>{})});
globalThis.document={createElement:()=>({getContext:()=>ctx})};
const world=makeOpenWorld(),width=1028,height=615,ground=world.surface(6,485).height-.095,ray=new THREE.Raycaster(),up=new THREE.Vector3(0,1,0);
let reproduced=false;
for(const reversed of[false,true]){
  const scene=new THREE.Scene(),view=buildOpenWorld(scene,world,{reversedDepth:reversed}),camera=new THREE.PerspectiveCamera(57,width/height,.3,8500);
  camera.position.set(6,ground+.55+.095+4.3,495.5);camera.lookAt(6,ground+.55+.095+.65,475);camera._reversedDepth=reversed;camera.updateProjectionMatrix();camera.updateMatrixWorld();
  const depth=p=>{const z=p.clone().project(camera).z;return reversed?z:z*.5+.5;},visible=(a,b)=>reversed?a>b:a<b;
  // Compare layers at the same screen pixel, including the actual one-pixel
  // slope term used by gl.polygonOffset at this grazing camera angle.
  function checkLayer(y,underY,bias,distance){
    const p=new THREE.Vector3(6,y,495.5-distance),screen=p.clone().project(camera),below=new THREE.Vector3(),neighbour=new THREE.Vector3();
    ray.setFromCamera(new THREE.Vector2(screen.x,screen.y),camera);ray.ray.intersectPlane(new THREE.Plane(up,-underY),below);
    ray.setFromCamera(new THREE.Vector2(screen.x,screen.y+2/height),camera);ray.ray.intersectPlane(new THREE.Plane(up,-y),neighbour);
    const slope=Math.abs(depth(neighbour)-depth(p)),raw=depth(p),under=depth(below),unit=1/2**24,corrected=raw+bias.polygonOffsetFactor*slope+bias.polygonOffsetUnits*unit;
    assert.ok(visible(corrected,under),`${reversed?'reversed':'forward'} depth: surface hidden at ${distance} m`);
    if(reversed&&y===ground+.095&&distance===80)reproduced=!visible(raw-slope-unit,under);
  }
  const asphalt=view.surfaces.asphalt;
  for(const distance of[8,20,40,80,200,800]){
    checkLayer(ground+.095,ground+.025,asphalt,distance);
    checkLayer(ground+.135,ground+.095,surfaceDepthBias(reversed,3),distance);
    checkLayer(ground+.117,ground+.095,surfaceDepthBias(reversed,2),distance);
  }
  let markings=0;scene.traverse(mesh=>{const material=mesh.material;if(mesh.isMesh&&mesh.renderOrder===2){markings++;assert.equal(material.polygonOffsetFactor,reversed?3:-3);assert.equal(material.polygonOffsetUnits,reversed?3:-3);assert.equal(material.depthWrite,false);}});assert.ok(markings>0);
}
assert.equal(reproduced,true,'The previous negative offset must reproduce the road being hidden in reversed depth');
console.log('PASS Reproduced old distant-road cutoff; asphalt, lane paint and contact shadows remain above their underlays at 8–800 m in both depth modes (projection/depth regression, not GPU visual QA)');
