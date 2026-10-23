import { beforeEach, describe, expect, it, vi } from 'vitest';
const fixture=vi.hoisted(()=>({consent:vi.fn(),version:vi.fn(),source:vi.fn(),convert:vi.fn(),write:vi.fn()}));
vi.mock('../packages/privacy/worker-consent',()=>({workerHasConsent:fixture.consent}));
vi.mock('../packages/documents/native-repository',()=>({nativeVersion:fixture.version,sourceBytes:fixture.source}));
vi.mock('../packages/documents/native-infrastructure',()=>({convertDocx:fixture.convert}));
vi.mock('../packages/db/demo',()=>({statement:()=>({run:fixture.write})}));
import { processNativeRender } from '../packages/documents/native-render-job';
import type { RenderTaskData } from '../packages/documents/native-queue';
const data:RenderTaskData={userId:'student',tenantId:'university',versionId:'version',revision:1,values:{},mode:'raw',hash:'hash'};
beforeEach(()=>{
 vi.resetAllMocks();fixture.consent.mockResolvedValue(true);fixture.version.mockResolvedValue({revision:1,sourceId:'source',fields:[]});
 fixture.source.mockResolvedValue(Buffer.from('docx'));fixture.convert.mockResolvedValue({bytes:Buffer.from('%PDF'),pageCount:1});
});
describe('BullMQ native document consent enforcement',()=>{
 it('skips unconsented work before reading the source document',async()=>{
  fixture.consent.mockResolvedValue(false);
  expect(await processNativeRender(data)).toMatchObject({skipped:true,reason:'CONSENT_REQUIRED'});
  expect(fixture.version).not.toHaveBeenCalled();expect(fixture.source).not.toHaveBeenCalled();expect(fixture.convert).not.toHaveBeenCalled();
 });
 it('does not publish a result after consent is withdrawn during conversion',async()=>{
  fixture.consent.mockResolvedValueOnce(true).mockResolvedValueOnce(false);
  expect(await processNativeRender(data)).toMatchObject({skipped:true});expect(fixture.convert).toHaveBeenCalledOnce();expect(fixture.write).not.toHaveBeenCalled();
 });
 it('rechecks consent and saves an authorized conversion result',async()=>{
  expect(await processNativeRender(data)).toEqual({hash:'hash',pageCount:1});
  expect(fixture.consent).toHaveBeenNthCalledWith(1,'student','university');expect(fixture.consent).toHaveBeenCalledTimes(2);expect(fixture.write).toHaveBeenCalledTimes(2);
 });
});
