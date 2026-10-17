import {VEHICLES} from './vehicle-data.js?v=real-fleet-10';
// Everyday traffic uses the eight added real models; Ferrari stays in the garage.
export const FLEET_TYPES=VEHICLES.filter(v=>v.id!=='clubsport').map(v=>v.id);
export const FLEET_FOOTPRINTS=Object.fromEntries(VEHICLES.map(v=>[v.id,[v.length,v.width]]));
