import fs from 'node:fs';
import * as THREE from '../dist/vendor/three.module.min.js';
const widths={SCALAR:1,VEC2:2,VEC3:3,VEC4:4,MAT4:16};
const formats={5120:['getInt8',1,127],5121:['getUint8',1,255],5122:['getInt16',2,32767],5123:['getUint16',2,65535],5125:['getUint32',4,4294967295],5126:['getFloat32',4,1]};
export async function readCarAsset(file,decoder){
  const bytes=fs.readFileSync(file),jsonLength=bytes.readUInt32LE(12),json=JSON.parse(bytes.subarray(20,20+jsonLength)),binary=bytes.subarray(28+jsonLength),views=[];
  for(const view of json.bufferViews){
    const ext=view.extensions?.EXT_meshopt_compression;
    if(ext){const data=new Uint8Array(ext.count*ext.byteStride);decoder.decodeGltfBuffer(data,ext.count,ext.byteStride,binary.subarray(ext.byteOffset||0,(ext.byteOffset||0)+ext.byteLength),ext.mode,ext.filter||'NONE');views.push(data);}
    else views.push(binary.subarray(view.byteOffset||0,(view.byteOffset||0)+view.byteLength));
  }
  function accessor(id){
    const a=json.accessors[id],data=views[a.bufferView],view=new DataView(data.buffer,data.byteOffset,data.byteLength),[method,bytes,max]=formats[a.componentType],size=widths[a.type],stride=json.bufferViews[a.bufferView].byteStride||size*bytes,values=new Float32Array(a.count*size);
    for(let i=0;i<a.count;i++)for(let c=0;c<size;c++){let value=view[method]((a.byteOffset||0)+i*stride+c*bytes,true);if(a.normalized)value=Math.max(-1,value/max);values[i*size+c]=value;}return values;
  }
  const parts=[];
  function visit(id,parent,ancestors){
    const node=json.nodes[id],local=new THREE.Matrix4();if(node.matrix)local.fromArray(node.matrix);else local.compose(new THREE.Vector3(...(node.translation||[0,0,0])),new THREE.Quaternion(...(node.rotation||[0,0,0,1])),new THREE.Vector3(...(node.scale||[1,1,1])));
    const matrix=new THREE.Matrix4().multiplyMatrices(parent,local),names=[...ancestors,{id,name:node.name||''}];
    if(node.mesh!==undefined)for(const primitive of json.meshes[node.mesh].primitives){
      const geometry=new THREE.BufferGeometry();for(const [semantic,id] of Object.entries(primitive.attributes)){const name={POSITION:'position',NORMAL:'normal',TEXCOORD_0:'uv',COLOR_0:'color'}[semantic];if(name)geometry.setAttribute(name,new THREE.BufferAttribute(accessor(id),widths[json.accessors[id].type]));}
      if(primitive.indices!==undefined)geometry.setIndex(new THREE.BufferAttribute(Uint32Array.from(accessor(primitive.indices)),1));if(!geometry.attributes.normal)geometry.computeVertexNormals();geometry.applyMatrix4(matrix);
      // Baking a reflected glTF node removes the renderer's negative-determinant
      // front-face correction. Reverse winding so mirrored body panels stay out.
      if(matrix.determinant()<0){const indices=geometry.index?Array.from(geometry.index.array):Array.from({length:geometry.attributes.position.count},(_,i)=>i);for(let i=0;i<indices.length;i+=3)[indices[i+1],indices[i+2]]=[indices[i+2],indices[i+1]];geometry.setIndex(indices);}
      geometry.computeBoundingBox();parts.push({geometry,material:primitive.material||0,names,node:id});
    }
    for(const child of node.children||[])visit(child,matrix,names);
  }
  for(const root of json.scenes[json.scene||0].nodes)visit(root,new THREE.Matrix4(),[]);
  return {json,parts,images:(json.images||[]).map(image=>({mimeType:image.mimeType,data:Buffer.from(views[image.bufferView])}))};
}
export function writeCarGLB(file,{parts,materials,images=[],textures=[],samplers=[],extras={}}){
  const json={asset:{version:'2.0',generator:'Horizon real-car preparation',extras},scene:0,scenes:[{nodes:[0]}],nodes:[{name:'Car',children:[]}],meshes:[],materials:structuredClone(materials),accessors:[],bufferViews:[],buffers:[],images:[],textures:structuredClone(textures),samplers:structuredClone(samplers)},chunks=[];let offset=0;
  function view(data){const bytes=Buffer.from(data.buffer,data.byteOffset,data.byteLength),padded=Buffer.alloc((bytes.length+3)&~3);bytes.copy(padded);const id=json.bufferViews.length;json.bufferViews.push({buffer:0,byteOffset:offset,byteLength:bytes.length});chunks.push(padded);offset+=padded.length;return id;}
  function attribute(data,type){const id=json.accessors.length,entry={bufferView:view(data),componentType:data instanceof Float32Array?5126:data instanceof Uint16Array?5123:5125,count:data.length/widths[type],type};if(type==='VEC3'){entry.min=[Infinity,Infinity,Infinity];entry.max=[-Infinity,-Infinity,-Infinity];for(let i=0;i<data.length;i++){entry.min[i%3]=Math.min(entry.min[i%3],data[i]);entry.max[i%3]=Math.max(entry.max[i%3],data[i]);}}json.accessors.push(entry);return id;}
  const parents=new Map([['body',0]]);
  for(const part of parts){
    let parent=parents.get(part.group);if(parent===undefined){parent=json.nodes.length;parents.set(part.group,parent);json.nodes.push({name:part.group,translation:part.center||[0,0,0],children:[]});json.nodes[0].children.push(parent);}
    const g=part.geometry,attributes={};for(const [name,semantic] of[['position','POSITION'],['normal','NORMAL'],['uv','TEXCOORD_0'],['color','COLOR_0']])if(g.attributes[name])attributes[semantic]=attribute(g.attributes[name].array,name==='uv'?'VEC2':g.attributes[name].itemSize===4?'VEC4':'VEC3');
    const mesh=json.meshes.length;json.meshes.push({name:part.name,primitives:[{attributes,indices:attribute(g.index?Uint32Array.from(g.index.array):Uint32Array.from({length:g.attributes.position.count},(_,i)=>i),'SCALAR'),material:part.material}]});const node=json.nodes.length;json.nodes.push({name:part.name,mesh});json.nodes[parent].children.push(node);
  }
  for(const image of images)json.images.push({mimeType:image.mimeType,bufferView:view(image.data)});
  json.extensionsUsed=[...new Set(json.materials.flatMap(m=>Object.keys(m.extensions||{})))];if(!json.extensionsUsed.length)delete json.extensionsUsed;
  json.buffers=[{byteLength:offset}];const data=Buffer.from(JSON.stringify(json)),text=Buffer.alloc((data.length+3)&~3,0x20);data.copy(text);const bytes=Buffer.alloc(28+text.length+offset);bytes.writeUInt32LE(0x46546c67,0);bytes.writeUInt32LE(2,4);bytes.writeUInt32LE(bytes.length,8);bytes.writeUInt32LE(text.length,12);bytes.writeUInt32LE(0x4e4f534a,16);text.copy(bytes,20);bytes.writeUInt32LE(offset,20+text.length);bytes.writeUInt32LE(0x004e4942,24+text.length);Buffer.concat(chunks).copy(bytes,28+text.length);fs.writeFileSync(file,bytes);return bytes.length;
}
