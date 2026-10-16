// Offline asset preparation. Pass the official meshopt_simplifier.js module path.
import fs from 'node:fs';
import {pathToFileURL} from 'node:url';
const {MeshoptSimplifier:S}=await import(pathToFileURL(process.argv[2]));await S.ready;
const file=new URL('../dist/assets/cars/ferrari-458.glb',import.meta.url),original=fs.readFileSync(file),jsonLength=original.readUInt32LE(12),json=JSON.parse(original.subarray(20,20+jsonLength).toString()),bin=original.subarray(28+jsonLength);
const types={SCALAR:1,VEC2:2,VEC3:3,VEC4:4},constructors={5126:Float32Array,5125:Uint32Array,5123:Uint16Array,5121:Uint8Array};
function read(id){const a=json.accessors[id],v=json.bufferViews[a.bufferView],T=constructors[a.componentType],offset=(v.byteOffset||0)+(a.byteOffset||0),length=a.count*types[a.type];return new T(bin.buffer.slice(bin.byteOffset+offset,bin.byteOffset+offset+length*T.BYTES_PER_ELEMENT));}
const accessors=[],views=[],buffers=[];let length=0,before=0,after=0,error=0;
function write(array,template){const bytes=Buffer.from(array.buffer,array.byteOffset,array.byteLength),padded=Buffer.alloc((bytes.length+3)&~3);bytes.copy(padded);const view=views.length;views.push({buffer:0,byteOffset:length,byteLength:bytes.length});buffers.push(padded);length+=padded.length;const id=accessors.length;accessors.push({...template,bufferView:view,byteOffset:0,count:array.length/types[template.type]});return id;}
for(const mesh of json.meshes)for(const p of mesh.primitives){
  const positions=read(p.attributes.POSITION),normals=read(p.attributes.NORMAL),indices=new Uint32Array(read(p.indices));before+=indices.length/3;
  const [reduced,e]=S.simplifyWithAttributes(indices,positions,3,normals,3,[.08,.08,.08],null,Math.min(indices.length,Math.max(72,Math.floor(indices.length*.24/3)*3)),.006,['Permissive']);after+=reduced.length/3;error=Math.max(error,e);
  const remap=new Map(),ids=[];for(const index of reduced)if(!remap.has(index)){remap.set(index,ids.length);ids.push(index);}
  const attributes={};for(const [name,id] of Object.entries(p.attributes)){const a=json.accessors[id],data=read(id),n=types[a.type],array=new data.constructor(ids.length*n);ids.forEach((index,i)=>array.set(data.subarray(index*n,index*n+n),i*n));const template={...a};delete template.min;delete template.max;if(name==='POSITION'){template.min=[Infinity,Infinity,Infinity];template.max=[-Infinity,-Infinity,-Infinity];for(let i=0;i<array.length;i++) {const c=i%3;template.min[c]=Math.min(template.min[c],array[i]);template.max[c]=Math.max(template.max[c],array[i]);}}
    attributes[name]=write(array,template);
  }
  p.attributes=attributes;p.indices=write(Uint32Array.from(reduced,index=>remap.get(index)),{componentType:5125,type:'SCALAR'});
}
json.accessors=accessors;json.bufferViews=views;json.buffers=[{byteLength:length}];json.asset.extras={...json.asset.extras,optimization:'Meshoptimizer v1.0 attribute-aware simplification; preserved nodes, materials, UVs, normals and wheel assemblies.'};
const text=Buffer.from(JSON.stringify(json)),jsonBuffer=Buffer.alloc((text.length+3)&~3,0x20);text.copy(jsonBuffer);const output=Buffer.alloc(28+jsonBuffer.length+length);output.writeUInt32LE(0x46546c67,0);output.writeUInt32LE(2,4);output.writeUInt32LE(output.length,8);output.writeUInt32LE(jsonBuffer.length,12);output.writeUInt32LE(0x4e4f534a,16);jsonBuffer.copy(output,20);output.writeUInt32LE(length,20+jsonBuffer.length);output.writeUInt32LE(0x004e4942,24+jsonBuffer.length);Buffer.concat(buffers).copy(output,28+jsonBuffer.length);fs.writeFileSync(file,output);
console.log({before,after,error,bytesBefore:original.length,bytesAfter:output.length});
