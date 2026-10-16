import assert from 'node:assert/strict';
import * as THREE from '../dist/vendor/three.module.min.js';
import {createFrameBudget,renderPixelRatio} from '../dist/render-quality.js';
import {streamStaticWorld} from '../dist/world-streaming.js';

// Synthetic frame timings test the controller; they are not a GPU benchmark.
const budget=createFrameBudget();
function frames(count,ms){let result;for(let i=0;i<count;i++)result=budget.sample(ms/1000)||result;return result;}
assert.equal(frames(120,1000/60).fps,60);assert.equal(budget.status.scale,1);assert.equal(budget.status.tier,0);
const slow=frames(31,1000/30);assert.equal(slow.fps,30);assert.equal(slow.tier,1);assert.equal(slow.scale,.9);
frames(30,1000/30);assert.equal(budget.status.tier,1,'One slow window must not repeatedly reallocate buffers');
frames(100,1000/30);assert.equal(budget.status.tier,2);assert.equal(budget.status.scale,.8);
frames(600,1000/60);assert.equal(budget.status.tier,2,'Recovery must wait for sustained stable delivery');
frames(1500,1000/60);assert.equal(budget.status.tier,0);assert.ok(budget.status.scale<=1);
budget.reset();assert.equal(budget.sample(NaN),null);assert.equal(budget.sample(0),null);
frames(60,1000/120);assert.equal(budget.sample(.6).fps,55,'A long foreground stall must count against measured FPS');
for(const mode of['auto','performance','quality'])for(const [w,h] of[[1440,900],[1920,1080],[3840,2160]]){
  const ratio=renderPixelRatio(mode,2,w,h),pixels=ratio*ratio*w*h;
  assert.ok(pixels<=(mode==='quality'?4_200_001:mode==='performance'?1_400_001:2_100_001));
}

const scene=new THREE.Scene(),source=new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1,1),new THREE.MeshStandardMaterial(),3),matrix=new THREE.Matrix4();
for(const [i,z] of[-20,-300,300].entries())source.setMatrixAt(i,matrix.makeTranslation(0,0,z));scene.add(source);
const stream=streamStaticWorld(scene),camera=new THREE.PerspectiveCamera(57,1.6,.3,2000);camera.position.set(0,4,0);camera.lookAt(0,4,-1);camera.updateMatrixWorld();
stream.update(0,0,'auto',true,camera);
const low=scene.children.find(m=>m!==source);assert.ok(low);assert.equal(source.count,1,'Nearby foliage must retain its full geometry');assert.equal(low.count,1,'Distant foliage should use a cheaper model; objects behind the camera should be culled');
assert.equal(low.geometry.index?.count||low.geometry.attributes.position.count,60);
assert.equal(source.geometry.index?.count||source.geometry.attributes.position.count,240);
const version=source.instanceMatrix.version;stream.update(4,0,'auto',false,camera);assert.equal(source.instanceMatrix.version,version,'Small movements must reuse uploaded buffers');
camera.lookAt(0,4,1);stream.update(4,0,'auto',false,camera);assert.ok(source.instanceMatrix.version>version||source.count===0);assert.equal(low.count,1,'Turning in place must refresh visible scenery');
camera._reversedDepth=true;camera.updateProjectionMatrix();stream.update(4,0,'auto',true,camera);assert.equal(low.count,1,'Reverse-depth projection must use its correct culling planes');
assert.ok(source.instanceMatrix.updateRanges.every(r=>r.count<=source.instanceMatrix.array.length));
console.log('PASS Frame-budget response/recovery, truthful synthetic FPS and stall accounting, pixel caps, full nearby geometry, cheaper distant foliage, camera-turn/reverse-depth culling and reused buffers');
