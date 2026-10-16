const DRIVE_CODES=new Set(['KeyW','KeyA','KeyS','KeyD','ArrowUp','ArrowLeft','ArrowDown','ArrowRight','ShiftLeft','ShiftRight','Space']);
const KEY_CODES={w:'KeyW',a:'KeyA',s:'KeyS',d:'KeyD',arrowup:'ArrowUp',arrowleft:'ArrowLeft',arrowdown:'ArrowDown',arrowright:'ArrowRight',shift:'ShiftLeft',' ':'Space',spacebar:'Space'};

export function driveCode(event){
  return DRIVE_CODES.has(event.code)?event.code:KEY_CODES[String(event.key||'').toLowerCase()];
}

export function createDrivingControls(){
  const held=new Set();
  return {
    // Process held/repeated driving keys too: focus can change while a key is
    // down, so the next repeat must be able to restore the driver's input.
    keydown(event,active=true){
      const code=driveCode(event);
      if(!active||!code||event.metaKey||event.ctrlKey||event.altKey||event.isComposing)return false;
      event.preventDefault();held.add(code);return true;
    },
    keyup(event){
      const code=driveCode(event);if(code)held.delete(code);
    },
    clear(){held.clear();},
    read(touch={}){
      const down=(...codes)=>codes.some(code=>held.has(code));
      const left=down('KeyA','ArrowLeft')||!!touch.left,right=down('KeyD','ArrowRight')||!!touch.right;
      return {throttle:down('KeyW','ArrowUp')||touch.throttle?1:0,
        brake:down('KeyS','ArrowDown')||!!touch.brake,steer:Number(right)-Number(left),
        boost:down('ShiftLeft','ShiftRight')||!!touch.boost,drift:down('Space'),left,right};
    }
  };
}
