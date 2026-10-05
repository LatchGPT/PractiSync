import {pbkdf2Sync} from 'node:crypto';
function hex(bytes:Uint8Array){return Array.from(bytes,b=>b.toString(16).padStart(2,'0')).join('');}
function unhex(value:string){return new Uint8Array(value.match(/.{2}/g)?.map(x=>parseInt(x,16))??[]);}
export async function hashPassword(password:string,salt=crypto.getRandomValues(new Uint8Array(16))){const bytes=pbkdf2Sync(password,salt,600000,32,'sha256');return `pbkdf2:600000:${hex(salt)}:${hex(bytes)}`;}
export async function verifyPassword(password:string,stored:string|null){if(!stored)return false;const parts=stored.split(':');if(parts.length!==4||parts[0]!=='pbkdf2'||parts[1]!=='600000')return false;const generated=await hashPassword(password,unhex(parts[2]));let diff=0;for(let i=0;i<generated.length;i++)diff|=generated.charCodeAt(i)^stored.charCodeAt(i);return generated.length===stored.length&&diff===0;}
