// Offline only: normalize licensed source meshes, rig wheels, preserve detailed
// textures, and derive compact traffic geometry from those same authored cars.
// Usage: node scripts/prepare-real-cars.mjs <source-dir> <decoder.mjs> <simplifier.mjs>
import fs from 'node:fs';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {execFileSync} from 'node:child_process';
import * as THREE from '../dist/vendor/three.module.min.js';
import {mergeGeometries,mergeVertices} from '../dist/vendor/BufferGeometryUtils.js';
import {readCarAsset,writeCarGLB} from './car-asset.mjs';
const sourceDir=process.argv[2],{MeshoptDecoder:D}=await import(pathToFileURL(process.argv[3])),{MeshoptSimplifier:S}=await import(pathToFileURL(process.argv[4]));await Promise.all([D.ready,S.ready]);
const output=path.resolve(import.meta.dirname,'../dist/assets/cars'),work='/private/tmp/horizon-car-textures';fs.mkdirSync(work,{recursive:true});
const inputs=[
  {id:'clubsport',source:'ferrari-458',length:4.53,rotation:0,paint:['Body_Color'],glass:['Glass_Gray'],tail:['Taillight_Glass'],wheel:p=>p.names.some(n=>/^wheel_[fr][lr]$/.test(n.name))},
  {id:'touring',source:'bmw-e36-m3',length:4.44,rotation:Math.PI,paint:['CarPaint'],glass:['Windows'],tail:['RearLights'],wheel:p=>['Tire.001','SeconadryColor.001','Textures.001','MainColor.001'].includes(p.materialName),drop:p=>p.materialName==='Scene'},
  {id:'trail',source:'bmw-x6',length:4.948,rotation:-Math.PI/2,paint:['Material'],glass:['Material.002'],tail:['Material.004'],wheel:p=>p.names.some(n=>/^Cube\.00[2-5]$/.test(n.name))},
  {id:'porsche',source:'porsche-911',length:4.29,rotation:Math.PI,paint:['Material.001'],glass:['Material.014'],tail:['Material.006'],wheel:p=>p.names.some(n=>[27,31,35,41].includes(n.id))},
  {id:'skyline',source:'nissan-gt-r',length:4.60,rotation:Math.PI,paint:['Material.001'],glass:['Material.006'],tail:['Material.008'],wheel:p=>['Material.010','Material.012'].includes(p.materialName)},
  {id:'ae86',source:'toyota-ae86',length:4.215,rotation:Math.PI,paint:['Material.001'],glass:['Material.011'],tail:['Material.006'],wheel:p=>p.names.some(n=>[13,17,21,25].includes(n.id)),drop:p=>p.materialName==='tofu_shop.002'},
  {id:'aventador',source:'lamborghini-aventador-lp700-4',length:4.78,rotation:Math.PI,paint:['body'],glass:['glass','glass1'],tail:[],wheel:p=>p.names.some(n=>n.name==='rims_2'),drop:p=>p.names.some(n=>[19,21].includes(n.id))},
  {id:'corolla',source:'toyota-corolla',length:4.16,rotation:Math.PI,paint:['body'],glass:['glass'],tail:['stoplamp'],wheel:p=>p.names.some(n=>n.name.startsWith('corolla-wheel.'))},
  {id:'urus',source:'lamborghini-urus',length:5.112,rotation:0,paint:[],glass:['glass'],tail:[],wheel:p=>p.names.some(n=>[11,18,20,23].includes(n.id))}
];
function splitGeometry(g,test){
  const source=g.index?g.index.array:Uint32Array.from({length:g.attributes.position.count},(_,i)=>i),selected=[];
  for(let i=0;i<source.length;i+=3){const ids=[source[i],source[i+1],source[i+2]],p=ids.map(id=>new THREE.Vector3().fromBufferAttribute(g.attributes.position,id)),center=p.reduce((a,b)=>a.add(b),new THREE.Vector3()).multiplyScalar(1/3);if(test(center))selected.push(...ids);}
  if(!selected.length)return null;const result=g.clone();result.setIndex(selected);return compact(result);
}
function compact(g){
  const ids=[...new Set(g.index.array)],remap=new Map(ids.map((id,i)=>[id,i])),result=new THREE.BufferGeometry();
  for(const [name,a] of Object.entries(g.attributes)){const data=new Float32Array(ids.length*a.itemSize);ids.forEach((id,i)=>{for(let j=0;j<a.itemSize;j++)data[i*a.itemSize+j]=a.array[id*a.itemSize+j];});result.setAttribute(name,new THREE.BufferAttribute(data,a.itemSize));}
  result.setIndex(Array.from(g.index.array,id=>remap.get(id)));return result;
}
function weldTraffic(source){
  const p=source.attributes.position,c=source.attributes.color,m=source.attributes.paintMask,vertices=[],colours=[],masks=[],counts=[],lookup=new Map(),remap=[];
  for(let i=0;i<p.count;i++){
    const xyz=[p.getX(i),p.getY(i),p.getZ(i)],key=xyz.map(v=>Math.round(v*10000)).join(',')+':'+(m?.getX(i)||0);let id=lookup.get(key);
    if(id===undefined){id=vertices.length/3;lookup.set(key,id);vertices.push(...xyz);colours.push(0,0,0);masks.push(m?.getX(i)||0);counts.push(0);}
    remap.push(id);counts[id]++;for(let j=0;j<3;j++)colours[id*3+j]+=c.array[i*3+j];
  }
  for(let i=0;i<counts.length;i++)for(let j=0;j<3;j++)colours[i*3+j]/=counts[i];
  const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));g.setAttribute('color',new THREE.Float32BufferAttribute(colours,3));if(m)g.setAttribute('paintMask',new THREE.Float32BufferAttribute(masks,1));g.setIndex(Array.from(source.index?.array||remap.keys(),i=>remap[i]));g.computeVertexNormals();return g;
}
function simplified(geometry,target,error=.02,prune=false){

  // Weld positional seams while averaging colour at coincident vertices.
  // Preserve the paint-mask boundary; never use destructive sloppy clustering.
  const g=error>=.02?weldTraffic(geometry):mergeVertices(geometry,1e-5);
  const p=g.attributes.position,n=g.attributes.normal,indices=Uint32Array.from(g.index.array);if(indices.length<=target*3)return g;
  const uv=g.attributes.uv,stride=uv?8:6,attributes=new Float32Array(p.count*stride),colour=g.attributes.color;for(let i=0;i<p.count;i++){const row=[n.getX(i),n.getY(i),n.getZ(i),colour?.getX(i)||0,colour?.getY(i)||0,colour?.getZ(i)||0];if(uv)row.push(uv.getX(i),uv.getY(i));attributes.set(row,i*stride);}
  const [reduced]=S.simplifyWithAttributes(indices,p.array,3,attributes,stride,uv?[.05,.05,.05,.015,.015,.015,.02,.02]:[.1,.1,.1,.05,.05,.05],null,Math.max(12,target*3),error,prune?['Permissive','Prune']:['Permissive']);
  g.setIndex(Array.from(reduced));if(error>=.02)g.computeVertexNormals();return compact(g);
}
function merged(geometries){const entries=geometries.filter(Boolean).map(g=>g.index?g.toNonIndexed():g.clone());if(!entries.length)return null;const result=mergeGeometries(entries);entries.forEach(g=>g.dispose());return result;}
const srgb=v=>v<=.04045?v/12.92:((v+.055)/1.055)**2.4;
function packed(g){
  const positions=Int16Array.from(g.attributes.position.array,v=>Math.round(v/10*32767)),normals=Int8Array.from(g.attributes.normal.array,v=>Math.round(Math.max(-1,Math.min(1,v))*127)),colours=Uint8Array.from(g.attributes.color.array,v=>Math.round(Math.max(0,Math.min(1,v))*255));
  const encode=a=>Buffer.from(a.buffer,a.byteOffset,a.byteLength).toString('base64');const result={p:encode(positions),n:encode(normals),c:encode(colours),i:encode((g.attributes.position.count>65535?Uint32Array:Uint16Array).from(g.index.array)),j:g.attributes.position.count>65535?32:16};if(g.attributes.paintMask)result.m=encode(Uint8Array.from(g.attributes.paintMask.array,v=>v*255));return result;
}
const filter=process.env.CAR_FILTER;
const fleet=filter?JSON.parse(fs.readFileSync(path.resolve(output,'../../real-car-meshes.js'),'utf8').split('export const REAL_CAR_MESHES=')[1].trim().replace(/;$/,'')):{},specs=filter?JSON.parse(fs.readFileSync(path.resolve(output,'../../real-car-specs.js'),'utf8').split('export const REAL_CAR_SPECS=')[1].trim().replace(/;$/,'')):{},report=filter?JSON.parse(fs.readFileSync(path.join(output,'preparation.json'))).filter(r=>r.id!==filter):[];
for(const definition of inputs){
  if(filter&&definition.id!==filter)continue;
  const file=definition.id==='clubsport'?path.join(output,'ferrari-458.glb'):path.join(sourceDir,definition.source+'.glb'),asset=await readCarAsset(file,D);
  let parts=asset.parts.map(p=>({...p,materialName:asset.json.materials[p.material].name})).filter(p=>!definition.drop?.(p));
  const rotation=new THREE.Matrix4().makeRotationY(definition.rotation);parts.forEach(p=>p.geometry.applyMatrix4(rotation));
  const bounds=new THREE.Box3();for(const p of parts){p.geometry.computeBoundingBox();bounds.union(p.geometry.boundingBox);}const size=bounds.getSize(new THREE.Vector3()),center=bounds.getCenter(new THREE.Vector3()),scale=definition.length/size.z;
  const transform=new THREE.Matrix4().makeScale(scale,scale,scale).multiply(new THREE.Matrix4().makeTranslation(-center.x,-bounds.min.y,-center.z));
  parts.forEach(p=>{p.geometry.applyMatrix4(transform);p.geometry.computeBoundingBox();});
  // Decode original base-colour maps for colour-aware traffic LODs. Detailed
  // player models keep the original embedded images and UVs.
  const textureFiles=[];asset.images.forEach((image,i)=>{const file=path.join(work,definition.id+'-'+i);fs.writeFileSync(file,image.data);textureFiles.push(file);});
  if(textureFiles.length)execFileSync('python3',['-c',`from PIL import Image\nimport sys,struct\nfor name in sys.argv[1:]:\n im=Image.open(name).convert('RGBA');im.thumbnail((512,512));open(name+'.rgba','wb').write(struct.pack('<II',*im.size)+im.tobytes())`,...textureFiles]);
  const imageData=textureFiles.map(file=>{const bytes=fs.readFileSync(file+'.rgba');return {w:bytes.readUInt32LE(0),h:bytes.readUInt32LE(4),data:bytes.subarray(8)};});
  function sample(material,uv){const factor=material.pbrMetallicRoughness?.baseColorFactor||[1,1,1,1],index=material.pbrMetallicRoughness?.baseColorTexture?.index,image=index===undefined?null:imageData[asset.json.textures[index].source];if(!image||!uv)return factor.slice(0,3);const x=Math.min(image.w-1,Math.floor(((uv[0]%1+1)%1)*image.w)),y=Math.min(image.h-1,Math.floor(((uv[1]%1+1)%1)*image.h)),i=(y*image.w+x)*4;return [0,1,2].map(c=>srgb(image.data[i+c]/255)*factor[c]);}
  if(definition.id==='urus'){let sum=0,count=0;for(const p of parts.filter(p=>p.node===8)){const pos=p.geometry.attributes.position,uv=p.geometry.attributes.uv;for(let i=0;i<pos.count;i++){const c=sample(asset.json.materials[p.material],[uv.getX(i),uv.getY(i)]);if(c[0]>.2&&c[0]>c[1]*2&&c[0]>c[2]*2){sum+=pos.getZ(i);count++;}}}if(count&&sum/count<0)for(const p of parts){p.geometry.applyMatrix4(new THREE.Matrix4().makeRotationY(Math.PI));p.geometry.computeBoundingBox();}}
  function role(p){if(definition.paint.includes(p.materialName))return 'paint';if(definition.glass.includes(p.materialName))return 'glass';if(definition.tail.includes(p.materialName))return 'tail';return 'trim';}
  const wheelParts=parts.filter(definition.wheel),fixed=parts.filter(p=>!definition.wheel(p)),wheelBounds=new THREE.Box3();wheelParts.forEach(p=>wheelBounds.union(p.geometry.boundingBox));
  const mid=wheelBounds.getCenter(new THREE.Vector3()),wheelGroups=[[],[],[],[]];
  for(const p of wheelParts)for(let index=0;index<4;index++){const left=index%2===0,front=index<2,g=splitGeometry(p.geometry,c=>(c.x<mid.x)===left&&(c.z<mid.z)===front);if(g)wheelGroups[index].push({...p,geometry:g});}
  const centers=[],radii=[];wheelGroups.forEach(group=>{const box=new THREE.Box3();group.forEach(p=>{p.geometry.computeBoundingBox();box.union(p.geometry.boundingBox);});const c=box.getCenter(new THREE.Vector3());centers.push(c.toArray());radii.push((box.max.y-box.min.y)/2);});
  if(centers.some(c=>c.some(v=>!Number.isFinite(v))))throw Error('Missing wheel geometry: '+definition.id);
  const radius=radii.reduce((a,b)=>a+b,0)/4,wheelbase=(centers[2][2]+centers[3][2]-centers[0][2]-centers[1][2])/2,height=size.y*scale,width=size.x*scale;
  specs[definition.id]={length:definition.length,width:+width.toFixed(3),height:+height.toFixed(3),radius:+radius.toFixed(4),wheelbase:+wheelbase.toFixed(4),wheels:centers.map(c=>c.map((v,i)=>+(v-(i===1?.55:0)).toFixed(5)))};
  // Split the Aventador's shared front/rear lamp mesh into a brake-light part.
  if(['aventador','urus'].includes(definition.id)){for(let i=fixed.length-1;i>=0;i--)if(definition.id==='aventador'?fixed[i].materialName==='lights':fixed[i].node===8){const p=fixed.splice(i,1)[0],tail=splitGeometry(p.geometry,c=>c.z>definition.length*.3),front=splitGeometry(p.geometry,c=>c.z<=definition.length*.3);if(tail)fixed.push({...p,geometry:tail,forceRole:'tail'});if(front)fixed.push({...p,geometry:front});}}
  const detailed=[],materials=[],materialIds=new Map();
  function materialIndex(p,type){const key=p.material+':'+type;if(materialIds.has(key))return materialIds.get(key);const m=structuredClone(asset.json.materials[p.material]);m.name=p.materialName+'__'+type;m.extras={...m.extras,horizonRole:type};m.extensions=m.extensions||{};delete m.extensions.KHR_materials_transmission;delete m.extensions.KHR_materials_volume;delete m.extensions.KHR_materials_ior;m.alphaMode=type==='glass'?'BLEND':'OPAQUE';m.doubleSided=false;if(type==='glass'){m.pbrMetallicRoughness={...m.pbrMetallicRoughness,baseColorFactor:[.12,.19,.24,.76],roughnessFactor:.11,metallicFactor:.04};}const id=materials.length;materials.push(m);materialIds.set(key,id);return id;}
  const total=parts.reduce((sum,p)=>sum+(p.geometry.index?.count||p.geometry.attributes.position.count)/3,0),detailRatio=Math.min(1,32000/total);
  for(const p of fixed){const type=p.forceRole||role(p),g=simplified(p.geometry,Math.max(12,Math.round(p.geometry.index.count/3*detailRatio)),.003);g.translate(0,-.55,0);detailed.push({geometry:g,group:'body',name:p.names.at(-1).name,material:materialIndex(p,type)});}
  wheelGroups.forEach((group,index)=>{for(const p of group){const g=simplified(p.geometry,Math.max(12,Math.round(p.geometry.index.count/3*detailRatio)),.003),c=centers[index];g.translate(-c[0],-c[1],-c[2]);detailed.push({geometry:g,group:['wheel_fl','wheel_fr','wheel_rl','wheel_rr'][index],center:specs[definition.id].wheels[index],name:'wheel_'+index+'_'+p.materialName,material:materialIndex(p,'wheel')});}});
  const lowPools={paint:[],trim:[],glass:[],tail:[],wheel:[]};
  function bake(p,type,geometry=p.geometry){const g=geometry.clone();for(const name of Object.keys(g.attributes))if(!['position','normal','uv'].includes(name))g.deleteAttribute(name);const positions=g.attributes.position,uv=g.attributes.uv,colours=new Float32Array(positions.count*3);for(let i=0;i<positions.count;i++){let colour=type==='paint'||type==='tail'?[1,1,1]:type==='glass'?[.035,.06,.085]:sample(asset.json.materials[p.material],uv?[uv.getX(i),uv.getY(i)]:null);if(type==='wheel'){const light=colour.reduce((a,b)=>a+b,0)/3;colour=/tire|tyre/i.test(p.materialName)||light<.1?[.018,.022,.025]:[.42,.44,.46];}if(definition.id==='skyline'&&type==='wheel')colour=p.materialName==='Material.010'?[.02,.023,.026]:[.34,.36,.38];colours.set(colour,i*3);}g.setAttribute('color',new THREE.BufferAttribute(colours,3));g.deleteAttribute('uv');return g;}
  for(const p of fixed){if(definition.id==='clubsport'&&!['body','glass','lights_red','lights','leds','grills','plastic_gray','chrome','metal','wipers'].includes(p.names.at(-1).name))continue;const type=p.forceRole||role(p),g=bake(p,type);g.translate(0,-.55,0);lowPools[type].push(g);}
  // The two outside half-wheels form a symmetric, authentic canonical wheel.
  for(const index of[0,1])for(const p of wheelGroups[index]){if(definition.id==='clubsport'&&!/^(tire|rim_|centre)/.test(p.names.at(-1).name))continue;const c=centers[index],g=bake(p,'wheel');g.translate(-c[0],-c[1],-c[2]);const half=splitGeometry(g,p=>index===0?p.x<=0:p.x>0);if(half)lowPools.wheel.push(half);}
  // Keep the Ferrari exterior intact for the player's loading fallback.
  // The eight added cars populate NPC traffic; the detailed Ferrari remains
  // drivable without multiplying its heavier geometry across the map.
  const budgets={paint:definition.id==='clubsport'?2000:750,trim:definition.id==='clubsport'?850:600,glass:definition.id==='clubsport'?160:100,tail:50,wheel:240},low={};
  for(const [type,geometries] of Object.entries(lowPools)){const joined=merged(geometries);if(joined){low[type]=definition.id==='clubsport'?mergeVertices(joined,1e-5):simplified(joined,budgets[type],type==='wheel'?.08:.028,type==='wheel');
      // Disconnected brake-disc holes in the BMW cannot collapse topologically.
      // Cluster only the wheel, with a strict geometric extent guard.
      if(definition.id!=='clubsport'&&type==='wheel'&&low[type].index.count>300*3){const g=low[type],p=g.attributes.position,[indices]=S.simplifySloppy(Uint32Array.from(g.index.array),p.array,3,null,240*3,.12),q=g.clone();q.setIndex(Array.from(indices));const candidate=compact(q);g.computeBoundingBox();candidate.computeBoundingBox();const a=g.boundingBox.getSize(new THREE.Vector3()),b=candidate.boundingBox.getSize(new THREE.Vector3());if(indices.length>=150*3&&['x','y','z'].every(k=>b[k]>=a[k]*.9)){candidate.computeVertexNormals();low[type]=candidate;}else throw Error('Wheel LOD extent guard failed: '+definition.id);}
    }}
  const proxyParts=[];for(const [type,g] of Object.entries(low)){if(type==='wheel')continue;const q=g.clone();q.setAttribute('paintMask',new THREE.BufferAttribute(new Float32Array(q.attributes.position.count).fill(type==='paint'?1:0),1));proxyParts.push(q);}for(const c of specs[definition.id].wheels){const g=low.wheel.clone().translate(...c);g.setAttribute('paintMask',new THREE.BufferAttribute(new Float32Array(g.attributes.position.count),1));proxyParts.push(g);}
  const proxy=['clubsport','touring'].includes(definition.id)?mergeVertices(merged(proxyParts),1e-5):simplified(merged(proxyParts),650,.06);fleet[definition.id]={};for(const [type,g] of Object.entries(low))fleet[definition.id][type]=packed(g);if(definition.id!=='clubsport')fleet[definition.id].proxy=packed(proxy);
  let bytes=0;if(definition.id!=='clubsport')bytes=writeCarGLB(path.join(output,definition.source+'-drive.glb'),{parts:detailed,materials,images:asset.images,textures:asset.json.textures,samplers:asset.json.samplers,extras:{vehicle:definition.source,license:'CC BY 4.0',attribution:'See ATTRIBUTION.md',modifications:'Normalized scale/orientation; floor/detached panels removed; four independent wheel pivots; attribute-aware LOD; no transmission render pass.'}});
  report.push({id:definition.id,usage:definition.id==='clubsport'?'player-fallback':'traffic-and-player-fallback',source:definition.source,sourceTriangles:total,playerTriangles:definition.id==='clubsport'?100441:detailed.reduce((n,p)=>n+p.geometry.index.count/3,0),trafficTriangles:Object.entries(low).reduce((n,[type,g])=>n+g.index.count/3*(type==='wheel'?4:1),0),proxyTriangles:proxy.index.count/3,bytes,...specs[definition.id]});
}
fs.writeFileSync(path.join(output,'preparation.json'),JSON.stringify(report,null,2));fs.writeFileSync(path.resolve(output,'../../real-car-specs.js'),'// Generated from normalized imported geometry. See assets/cars/ATTRIBUTION.md.\nexport const REAL_CAR_SPECS='+JSON.stringify(specs)+';\n');fs.writeFileSync(path.resolve(output,'../../real-car-meshes.js'),'// Derived real-car traffic meshes, CC BY 4.0. Authors and modifications: assets/cars/ATTRIBUTION.md.\nexport const REAL_CAR_MESHES='+JSON.stringify(fleet)+';\n');console.log(JSON.stringify(report.map(({id,sourceTriangles,playerTriangles,trafficTriangles,proxyTriangles,bytes,width,height,radius,wheelbase})=>({id,sourceTriangles,playerTriangles,trafficTriangles,proxyTriangles,bytes,width,height,radius,wheelbase})),null,2));
