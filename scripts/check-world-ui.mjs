// Integration test for the real game entrypoint and input handlers. Rendering
// and canvas pixels are stubbed; this does not replace visual browser QA.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import * as THREE from '../dist/vendor/three.module.min.js';
import {createCar} from '../dist/car.js';
import {createDrivingControls} from '../dist/controls.js';
import {makeOpenWorld,terrainHeight,coast,clamp} from '../dist/world-data.js';
import {buildOpenWorld} from '../dist/world-view.js';
import {newDriveState,stepDrive,recoverCar} from '../dist/driving.js';
const html=fs.readFileSync(new URL('../dist/index.html',import.meta.url),'utf8'),elements=[],ids=new Map(),listeners=new Map();
const context=new Proxy({createImageData:(w,h)=>({data:new Uint8ClampedArray(w*h*4)}),createRadialGradient:()=>({addColorStop(){}}),createLinearGradient:()=>({addColorStop(){}})},{get:(o,k)=>k in o?o[k]:(()=>{})});
class Element{
  constructor(attributes=''){this.attributes=attributes;this.dataset={};this.style={};this.listeners={};this.child=new Map();this.classes=new Set();this.classList={add:(...c)=>c.forEach(x=>this.classes.add(x)),remove:(...c)=>c.forEach(x=>this.classes.delete(x)),contains:c=>this.classes.has(c),toggle:(c,on)=>{if(on===undefined)on=!this.classes.has(c);on?this.classes.add(c):this.classes.delete(c);return on;}};
    for(const [,name,value] of attributes.matchAll(/([\w-]+)="([^"]*)"/g)){if(name==='id'){this.id=value;ids.set(value,this);}if(name==='class')value.split(' ').forEach(c=>this.classes.add(c));if(name.startsWith('data-'))this.dataset[name.slice(5).replace(/-([a-z])/g,(_,c)=>c.toUpperCase())]=value;}
    elements.push(this);
  }
  set innerHTML(value){for(const [,attrs] of value.matchAll(/<button\b([^>]*)>/g))new Element(attrs);}
  addEventListener(name,fn){this.listeners[name]=fn;}
  setAttribute(){}focus(){globalThis.document.activeElement=this;}getContext(){return context;}appendChild(){}getBoundingClientRect(){return {left:0,top:0,width:900,height:900};}
  querySelector(q){if(!this.child.has(q))this.child.set(q,new Element());return this.child.get(q);}
}
for(const [,attrs] of html.matchAll(/<[a-z]+\b([^>]*)>/g))new Element(attrs);
globalThis.document={body:new Element(),activeElement:null,createElement:()=>new Element(),getElementById:id=>{assert.ok(ids.has(id),'Missing UI element '+id);return ids.get(id);},querySelector:()=>new Element(),querySelectorAll:selector=>{const m=selector.match(/^\[data-([\w-]+)(?:="([^"]*)")?\]$/);if(!m)return [];const key=m[1].replace(/-([a-z])/g,(_,c)=>c.toUpperCase());return elements.filter(e=>e.dataset[key]!==undefined&&(m[2]===undefined||e.dataset[key]===m[2]));},addEventListener(){}};
globalThis.window={addEventListener:(name,fn)=>{if(!listeners.has(name))listeners.set(name,[]);listeners.get(name).push(fn);}};
globalThis.localStorage={getItem:()=>null,setItem(){}};globalThis.devicePixelRatio=1;globalThis.innerWidth=1440;globalThis.innerHeight=900;
let callback;globalThis.requestAnimationFrame=fn=>callback=fn;
class Renderer{constructor(){this.shadowMap={};this.info={render:{}};}setPixelRatio(){}setSize(){}render(){}}
const source=fs.readFileSync(new URL('../dist/game.js',import.meta.url),'utf8').replace(/^import .*;\n/gm,'');
new Function('THREE','createCar','addReflections','createDrivingControls','makeOpenWorld','terrainHeight','coast','clamp','buildOpenWorld','newDriveState','stepDrive','recoverCar',source)(
  {...THREE,WebGLRenderer:Renderer},createCar,()=>{},createDrivingControls,makeOpenWorld,terrainHeight,coast,clamp,buildOpenWorld,newDriveState,stepDrive,recoverCar);
const key=(code,key,up=false)=>{for(const fn of listeners.get(up?'keyup':'keydown')||[])fn({code,key,preventDefault(){}});};
let timestamp=1000;function frames(n){for(let i=0;i<n;i++){timestamp+=1000/60;callback(timestamp);}}
assert.equal(window.horizon.getState().mode,'menu');
for(const [letter,sign] of [['a',-1],['d',1]]){
  ids.get('play-button').listeners.click();assert.equal(document.activeElement,ids.get('world'));
  const x=window.horizon.getState().x;key('KeyW','w');key('Key'+letter.toUpperCase(),letter);frames(60);
  assert.ok((window.horizon.getState().x-x)*sign>1,'Entrypoint W + '+letter+' must steer');
  assert.equal(window.horizon.getInput().steer,sign);assert.ok(ids.get('steering-label').textContent.includes(sign<0?'LEFT':'RIGHT'));
  key('KeyW','w',true);key('Key'+letter.toUpperCase(),letter,true);
}
key('KeyM','m');assert.equal(window.horizon.getState().mode,'map');assert.equal(ids.get('map-overlay').classList.contains('hidden'),false);
ids.get('full-map').listeners.pointerdown({currentTarget:ids.get('full-map'),clientX:450,clientY:550});
key('Escape','Escape');assert.equal(window.horizon.getState().mode,'playing');
const travel=document.querySelectorAll('[data-travel]')[2];travel.listeners.click();assert.equal(window.horizon.getState().district,'CRESTLINE HILLS');
ids.get('help-button').listeners.click();assert.equal(window.horizon.getState().mode,'help');ids.get('close-help-button').listeners.click();assert.equal(window.horizon.getState().mode,'playing');
key('Escape','Escape');assert.equal(window.horizon.getState().mode,'paused');ids.get('resume-button').listeners.click();assert.equal(window.horizon.getState().mode,'playing');
ids.get('lighting-button').listeners.click();ids.get('lighting-button').listeners.click();frames(3);
console.log('PASS Real entrypoint: canvas focus, simultaneous W+A/W+D, steering HUD, map, waypoint, district travel, help, pause/resume and lighting');
