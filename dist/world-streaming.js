import * as THREE from './vendor/three.module.min.js';
import {mergeGeometries} from './vendor/BufferGeometryUtils.js';
import {enableInstanceFade,distanceFade} from './render-quality.js?v=clarity-5';

// Keep shared materials in large batches. A spatial index supplies only local
// instances to each GPU buffer; this avoids a draw call for every small sector.
export function streamStaticWorld(root){
  const sources=[],pools=[],sectors=new Map(),staticBatches=new Map(),matrix=new THREE.Matrix4(),position=new THREE.Vector3(),scale=new THREE.Vector3(),rotation=new THREE.Quaternion();
  root.traverse(o=>{if(o.isMesh&&!o.material.isShaderMaterial&&!o.userData.alwaysVisible)sources.push(o);});
  for(const mesh of sources){
    if(mesh.isInstancedMesh){
      mesh.geometry.computeBoundingBox();const size=mesh.geometry.boundingBox.getSize(new THREE.Vector3()),matrices=mesh.instanceMatrix.array.slice(),colours=mesh.instanceColor?.array.slice(),cells=new Map();let maxRange=0;
      for(let i=0;i<mesh.count;i++){
        matrix.fromArray(matrices,i*16).decompose(position,rotation,scale);
        const extent=Math.max(size.x*scale.x,size.y*scale.y,size.z*scale.z),range=mesh.userData.range||(extent>12?1900:550),cx=Math.floor(position.x/240),cz=Math.floor(position.z/240),key=cx+','+cz;
        if(!cells.has(key))cells.set(key,{x:(cx+.5)*240,z:(cz+.5)*240,entries:[]});
        cells.get(key).entries.push({index:i,x:position.x,z:position.z,range,extent});sectors.set(key,true);maxRange=Math.max(maxRange,range);
      }
      const fade=enableInstanceFade(mesh);mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);pools.push({mesh,matrices,colours,cells,maxRange,fade,shadow:mesh.castShadow});
    }else if(mesh.userData.range===2600){
      // Terrain gets coarse tiles; its local height/UV data remains unchanged.
      const geometry=mesh.geometry,p=geometry.attributes.position,parts=new Map();
      for(let i=0,n=geometry.index?geometry.index.count:p.count;i<n;i+=3){const ids=[0,1,2].map(j=>geometry.index?geometry.index.getX(i+j):i+j),x=ids.reduce((s,id)=>s+p.getX(id),0)/3,z=ids.reduce((s,id)=>s+p.getZ(id),0)/3,key=Math.floor(x/900)+','+Math.floor(z/900);if(!parts.has(key))parts.set(key,[]);parts.get(key).push(...ids);}
      for(const ids of parts.values()){
        const g=new THREE.BufferGeometry(),remap=new Map(),vertices=[];for(const id of ids)if(!remap.has(id)){remap.set(id,vertices.length);vertices.push(id);}
        for(const [name,a] of Object.entries(geometry.attributes)){const array=new a.array.constructor(vertices.length*a.itemSize);vertices.forEach((id,i)=>{for(let c=0;c<a.itemSize;c++)array[i*a.itemSize+c]=a.array[id*a.itemSize+c];});g.setAttribute(name,new THREE.BufferAttribute(array,a.itemSize,a.normalized));}
        g.setIndex(ids.map(id=>remap.get(id)));g.computeBoundingSphere();const tile=new THREE.Mesh(g,mesh.material);tile.receiveShadow=mesh.receiveShadow;tile.name='Terrain sector';root.add(tile);
      }
      mesh.removeFromParent();geometry.dispose();
    }else{
      // Cheap road/facade triangles can stay in one batch per material. Their
      // global bounding sphere no longer pulls the high-detail foliage along.
      const g=mesh.geometry;if((g.index?g.index.count:g.attributes.position.count)===0){mesh.removeFromParent();g.dispose();continue;}
      const key=mesh.material.id+':'+Object.keys(g.attributes).sort().join(',')+':'+mesh.castShadow;
      if(!staticBatches.has(key))staticBatches.set(key,[]);staticBatches.get(key).push(mesh);
    }
  }
  for(const meshes of staticBatches.values()){
    if(meshes.length===1)continue;
    const geometries=meshes.map(m=>{m.updateMatrix();return m.geometry.clone().applyMatrix4(m.matrix);}),first=meshes[0],g=mergeGeometries(geometries),mesh=new THREE.Mesh(g,first.material);
    mesh.name=first.name;mesh.renderOrder=first.renderOrder;mesh.castShadow=first.castShadow;mesh.receiveShadow=first.receiveShadow;g.computeBoundingSphere();root.add(mesh);
    geometries.forEach(g=>g.dispose());meshes.forEach(m=>{m.removeFromParent();m.geometry.dispose();});
  }
  let lastX=Infinity,lastZ=Infinity,lastQuality;const stats={sectors:sectors.size,visible:0,triangles:0};
  function update(x,z,quality='auto',force=false){
    if(!force&&Math.hypot(x-lastX,z-lastZ)<2&&quality===lastQuality)return;
    lastX=x;lastZ=z;lastQuality=quality;stats.visible=0;stats.triangles=0;const active=new Set(),qualityRange=quality==='performance'?.72:1;
    for(const {mesh,matrices,colours,cells,maxRange,fade,shadow} of pools){
      let count=0,nearest=Infinity;
      for(const [key,cell] of cells){
        if(Math.hypot(cell.x-x,cell.z-z)>maxRange*qualityRange+170)continue;
        for(const entry of cell.entries){
          const distance=Math.hypot(entry.x-x,entry.z-z);if(distance>entry.range*qualityRange+entry.extent/2)continue;
          fade.array[count]=distanceFade(distance,entry.range*qualityRange,entry.extent);mesh.instanceMatrix.array.set(matrices.subarray(entry.index*16,entry.index*16+16),count*16);
          if(colours)mesh.instanceColor.array.set(colours.subarray(entry.index*3,entry.index*3+3),count*3);count++;nearest=Math.min(nearest,distance);active.add(key);
        }
      }
      fade.needsUpdate=true;mesh.count=count;mesh.visible=count>0;mesh.castShadow=shadow&&nearest<250;mesh.instanceMatrix.needsUpdate=true;if(mesh.instanceColor)mesh.instanceColor.needsUpdate=true;if(count)mesh.computeBoundingSphere();
      stats.triangles+=(mesh.geometry.index?.count||mesh.geometry.attributes.position.count)/3*count;
    }
    stats.visible=active.size;
  }
  return {update,stats,sectors};
}
