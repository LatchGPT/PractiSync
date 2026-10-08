import {describe,expect,it} from 'vitest';
import {readJsonObject,RequestBodyError} from '../packages/validation/request-body';

function request(body:string,headers:Record<string,string>={}){
  return new Request('https://example.test/api/action',{method:'POST',headers:{'content-type':'application/json',...headers},body});
}

describe('readJsonObject',()=>{
  it('reads a JSON object when Content-Length is absent',async()=>{
    await expect(readJsonObject(request('{"action":"profile"}'),100)).resolves.toEqual({action:'profile'});
  });

  it('rejects a body over the byte limit even when Content-Length is absent',async()=>{
    await expect(readJsonObject(request('{"action":"profile"}'),8)).rejects.toMatchObject({
      name:'RequestBodyError',status:413
    });
  });

  it('rejects non-JSON content types',async()=>{
    await expect(readJsonObject(request('{}',{'content-type':'text/plain'}),100)).rejects.toBeInstanceOf(RequestBodyError);
  });

  it('rejects malformed JSON and non-object JSON values',async()=>{
    await expect(readJsonObject(request('{'),100)).rejects.toMatchObject({status:400});
    await expect(readJsonObject(request('[]'),100)).rejects.toMatchObject({status:400});
  });
});
