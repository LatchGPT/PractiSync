import { readdirSync, readFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import { describe, expect, it } from 'vitest';

const publicRoots=new Set(['auth','consent','config','account-access','hte-register','industry-partner-register']);
function routes(directory:string):string[]{return readdirSync(directory,{withFileTypes:true}).flatMap(entry=>entry.isDirectory()?routes(join(directory,entry.name)):entry.name==='route.ts'?[join(directory,entry.name)]:[]);}
describe('privacy Route Handler coverage',()=>{
 for(const path of routes('app/api')){
  const name=relative('app/api',path),root=name.split(/[\\/]/)[0];
  if(publicRoots.has(root))continue;
  it(`protects ${name}`,()=>{
   const source=readFileSync(path,'utf8');
   expect(source).not.toMatch(/export (?:async )?function (?:GET|POST|PUT|PATCH|DELETE|HEAD|OPTIONS)\(/);
   const methods=[...source.matchAll(/export const (GET|POST|PUT|PATCH|DELETE|HEAD|OPTIONS)\s*=\s*([^;\n]+)/g)];
   expect(methods.length).toBeGreaterThan(0);
   for(const method of methods)expect(method[2]).toMatch(/^withConsent\(/);
  });
 }
});
