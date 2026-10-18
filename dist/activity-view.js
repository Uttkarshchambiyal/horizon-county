import * as THREE from './vendor/three.module.min.js';
import {surfaceDepthBias} from './render-quality.js?v=launch-beta-13';

export function buildActivityView(scene,world,reversedDepth=false){
  const group=new THREE.Group();group.name='Active job or checkpoint';scene.add(group);
  const material=new THREE.MeshBasicMaterial({color:0xc8ff4a,transparent:true,opacity:.85,depthWrite:false,...surfaceDepthBias(reversedDepth,2)});
  const ringGeometry=new THREE.RingGeometry(.88,1,48).rotateX(-Math.PI/2),ringCoordinates=ringGeometry.attributes.position.array.slice(),ring=new THREE.Mesh(ringGeometry,material);group.add(ring);let lastTarget='';
  const beam=new THREE.Mesh(new THREE.CylinderGeometry(.22,.22,8,6,1,true),new THREE.MeshBasicMaterial({color:0xc8ff4a,transparent:true,opacity:.24,depthWrite:false,side:THREE.DoubleSide}));group.add(beam);
  const arrow=new THREE.Mesh(new THREE.ConeGeometry(.75,1.3,4),new THREE.MeshBasicMaterial({color:0xc8ff4a}));arrow.rotation.z=Math.PI;group.add(arrow);
  function update(career,player,time){
    const target=career.target();group.visible=!!target&&Math.hypot(target.x-player.x,target.z-player.z)<650;if(!group.visible)return;
    const race=career.active.definition.kind==='race',radius=race?12:8,y=world.surface(target.x,target.z).height;
    const key=target.x+','+target.z+','+radius;
    if(key!==lastTarget){const positions=ringGeometry.attributes.position;for(let i=0;i<positions.count;i++){const x=target.x+ringCoordinates[i*3]*radius,z=target.z+ringCoordinates[i*3+2]*radius;positions.setXYZ(i,x,world.surface(x,z).height+.045,z);}positions.needsUpdate=true;ringGeometry.computeBoundingSphere();lastTarget=key;}
    material.opacity=.66+Math.sin(time*3)*.12;
    beam.position.set(target.x,y+4,target.z);arrow.position.set(target.x,y+5.8+Math.sin(time*2.8)*.25,target.z);arrow.rotation.y=time*.5;
    const color=race?0x76d8ff:0xc8ff4a;material.color.set(color);beam.material.color.set(color);arrow.material.color.set(color);
  }
  group.visible=false;return {group,update};
}
