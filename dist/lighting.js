import * as THREE from './vendor/three.module.min.js';
import {surfaceDepthBias} from './render-quality.js?v=axle-steering-11';

export const LIGHTING_MOODS=[
  {name:'GOLDEN HOUR',top:0x81a8c4,bottom:0xe3cdb0,sun:0xffc38c,power:3.2,ambient:1.05,sky:0xc2d8e7,ground:0x817052,exposure:1.04,environment:.62,fog:.00039},
  {name:'DAYLIGHT',top:0x6dacce,bottom:0xcbd9d8,sun:0xfff0dc,power:3.6,ambient:1.2,sky:0xbcd8ed,ground:0x78765d,exposure:1.0,environment:.65,fog:.00034},
  {name:'BLUE HOUR',top:0x182b49,bottom:0x718498,sun:0xa7c4fa,power:.5,ambient:.75,sky:0x92afd8,ground:0x343e48,exposure:1.06,environment:.26,fog:.00055}
];

// One instanced, distance-culled contact pass adds grounding in Smooth mode.
// It is a soft local occlusion decal, not an extra shadow-map render.
export function addGroundContact(parent,world,reversedDepth=false){
  const stamps=world.buildings.map(b=>({x:b.x,z:b.z,w:b.w+5,d:b.d+5}));
  for(const c of world.colliders)if(['street-tree','palm','inland-tree','pine','birch'].includes(c.type))stamps.push({x:c.cx,z:c.cz,w:4.8,d:4.8});
  const canvas=document.createElement('canvas');canvas.width=canvas.height=64;const ctx=canvas.getContext('2d'),gradient=ctx.createRadialGradient(32,32,6,32,32,32);gradient.addColorStop(0,'rgba(12,20,25,.38)');gradient.addColorStop(.55,'rgba(12,20,25,.18)');gradient.addColorStop(1,'rgba(12,20,25,0)');ctx.fillStyle=gradient;ctx.fillRect(0,0,64,64);
  const texture=new THREE.CanvasTexture(canvas),material=new THREE.MeshBasicMaterial({map:texture,transparent:true,depthWrite:false,...surfaceDepthBias(reversedDepth,1)}),mesh=new THREE.InstancedMesh(new THREE.PlaneGeometry(1,1).rotateX(-Math.PI/2),material,stamps.length),object=new THREE.Object3D();
  stamps.forEach((s,i)=>{const y=world.surface(s.x,s.z).height,dx=(world.terrainHeight(s.x+1,s.z)-world.terrainHeight(s.x-1,s.z))/2,dz=(world.terrainHeight(s.x,s.z+1)-world.terrainHeight(s.x,s.z-1))/2;object.position.set(s.x,y+.024,s.z);object.rotation.set(Math.atan(dz),0,-Math.atan(dx));object.scale.set(s.w,1,s.d);object.updateMatrix();mesh.setMatrixAt(i,object.matrix);});
  mesh.name='Soft building and tree contact';mesh.userData.range=260;mesh.computeBoundingSphere();parent.add(mesh);return mesh;
}
