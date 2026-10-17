import * as THREE from './vendor/three.module.min.js';
import {mergeGeometries} from './vendor/BufferGeometryUtils.js';
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
function tireGeometry(segments){
  const profile=[[.70,-.36],[.84,-.49],[.94,-.48],[1,-.30],[1,.30],[.94,.48],[.84,.49],[.70,.36],[.70,-.36]].map(([r,x])=>new THREE.Vector2(r,x));
  return new THREE.LatheGeometry(profile,segments).rotateZ(Math.PI/2);
}
let tread;
function treadTexture(){
  if(!tread){const canvas=document.createElement('canvas');canvas.width=256;canvas.height=128;const ctx=canvas.getContext('2d');ctx.fillStyle='#999';ctx.fillRect(0,0,256,128);ctx.fillStyle='#363636';
    for(const y of [45,56,72,83])ctx.fillRect(0,y,256,2);
    ctx.strokeStyle='#505050';ctx.lineWidth=2;for(let x=-16;x<272;x+=24){ctx.beginPath();ctx.moveTo(x,43);ctx.lineTo(x+12,62);ctx.lineTo(x,85);ctx.stroke();}
    tread=new THREE.CanvasTexture(canvas);tread.wrapS=THREE.RepeatWrapping;tread.repeat.set(5,1);
  }const map=tread.clone();map.needsUpdate=true;return map;
}
function alloyColour(id){return ['touring','skyline','urus','trail'].includes(id)?0x525963:0xb1b6bd;}
// Keep authored rims, replace the fragile outer rubber with a round annular
// shell, and keep a separate radial blur on the outward rim face at road speed.
export function finishPlayerWheels(vehicle){
  const shell=tireGeometry(48),rubber=new THREE.MeshStandardMaterial({color:0x141719,roughness:.91,metalness:.015,bumpMap:treadTexture(),bumpScale:.0025,envMapIntensity:.45});
  const rootInverse=new THREE.Matrix4();vehicle.car.updateMatrixWorld(true);rootInverse.copy(vehicle.car.matrixWorld).invert();vehicle.wheelRadii=[];vehicle.wheelBlur=[];
  for(let i=0;i<vehicle.wheels.length;i++){
    const group=vehicle.wheels[i],pivot=vehicle.wheelCenters[i],wheelInverse=group.matrixWorld.clone().invert(),center=new THREE.Vector3().setFromMatrixPosition(new THREE.Matrix4().multiplyMatrices(rootInverse,pivot.matrixWorld));
    const radius=clamp(center.y+.55,.22,.55),bounds=new THREE.Box3(),tireBounds=new THREE.Box3(),meshes=[];
    group.traverse(o=>{if(!o.isMesh)return;meshes.push(o);const matrix=new THREE.Matrix4().multiplyMatrices(wheelInverse,o.matrixWorld);o.geometry.computeBoundingBox();const box=o.geometry.boundingBox.clone().applyMatrix4(matrix);bounds.union(box);if(/tire|tyre|rubber/i.test(o.material.name))tireBounds.union(box);});
    const width=clamp((tireBounds.isEmpty()?bounds:tireBounds).getSize(new THREE.Vector3()).x,.18,.34);
    for(const mesh of meshes){
      if(/tire|tyre|rubber/i.test(mesh.material.name)){mesh.visible=false;mesh.userData.replacedRubber=true;continue;}
      const g=mesh.geometry,p=g.attributes.position,matrix=new THREE.Matrix4().multiplyMatrices(wheelInverse,mesh.matrixWorld),radial=new Float32Array(p.count),point=new THREE.Vector3();
      for(let n=0;n<p.count;n++){point.fromBufferAttribute(p,n).applyMatrix4(matrix);radial[n]=Math.hypot(point.y,point.z);}
      const ids=g.index?.array||Uint32Array.from({length:p.count},(_,n)=>n),keep=[];for(let n=0;n<ids.length;n+=3){if([ids[n],ids[n+1],ids[n+2]].every(id=>radial[id]>radius*.82))continue;keep.push(ids[n],ids[n+1],ids[n+2]);}
      if(keep.length!==ids.length){const trimmed=g.clone();trimmed.setIndex(keep);mesh.geometry=trimmed;g.dispose();}
      mesh.material.roughness=clamp(mesh.material.roughness??.4,.25,.65);
    }
    const tire=new THREE.Mesh(shell,rubber);tire.name='Continuous rubber tire';tire.scale.set(width,radius,radius);tire.castShadow=true;tire.receiveShadow=true;group.add(tire);
    const blur=new THREE.Mesh(new THREE.RingGeometry(radius*.14,radius*.70,48),new THREE.MeshStandardMaterial({color:alloyColour(vehicle.spec.id),metalness:.65,roughness:.42,transparent:true,opacity:0,depthWrite:false}));
    blur.name='Speed blended rim';blur.rotation.y=Math.sign(center.x)*Math.PI/2;blur.position.x=Math.sign(center.x)*(width*.5+.003);blur.visible=false;group.add(blur);vehicle.wheelRadii.push(radius);vehicle.wheelBlur.push(blur);
  }
}
// Compact, concentric traffic wheels avoid the collapsed discs and jagged
// spokes in the aggressively simplified imported wheel meshes. One batch.
export function trafficWheelGeometry(spec){
  const r=spec.radius,w=clamp(r*.76,.18,.32),entries=[],silver=new THREE.Color(alloyColour(spec.id)),black=new THREE.Color(0x181b1e);
  function add(g,c){const q=g.index?g.toNonIndexed():g; q.deleteAttribute('uv');const colors=new Float32Array(q.attributes.position.count*3);for(let i=0;i<colors.length;i+=3)colors.set([c.r,c.g,c.b],i);q.setAttribute('color',new THREE.BufferAttribute(colors,3));entries.push(q);}
  const profile=[[.70,-.36],[.93,-.49],[1,-.27],[1,.27],[.93,.49],[.70,.36],[.70,-.36]].map(([a,b])=>new THREE.Vector2(a*r,b*w));
  add(new THREE.LatheGeometry(profile,16).rotateZ(Math.PI/2),black);
  const count={touring:8,trail:10,porsche:5,skyline:6,ae86:8,aventador:5,corolla:6,urus:10}[spec.id]||5;
  for(const side of [-1,1]){
    add(new THREE.RingGeometry(r*.63,r*.73,16).rotateY(side*Math.PI/2).translate(side*w*.48,0,0),silver);
    const points=[],indices=[];for(let n=0;n<count;n++){const a=n*Math.PI*2/count,c=Math.cos(a),s=Math.sin(a),j=points.length/3;for(const [along,across] of [[.12,-.07],[.66,-.035],[.66,.035],[.12,.07]])points.push(side*w*.49,r*(along*c-across*s),r*(along*s+across*c));if(side>0)indices.push(j,j+1,j+2,j,j+2,j+3);else indices.push(j,j+2,j+1,j,j+3,j+2);}
    const spokes=new THREE.BufferGeometry();spokes.setAttribute('position',new THREE.Float32BufferAttribute(points,3));spokes.setIndex(indices);spokes.computeVertexNormals();add(spokes,silver);
  }
  add(new THREE.CylinderGeometry(r*.14,r*.14,w,6).rotateZ(Math.PI/2),silver);const result=mergeGeometries(entries);entries.forEach(g=>g.dispose());return result;
}
