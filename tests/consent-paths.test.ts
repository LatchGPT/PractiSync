import { describe, expect, it } from 'vitest';
import { consentPath, consentReturnPath } from '../packages/privacy/paths';

describe('privacy gate return paths',()=>{
 const fallback='/dashboard/student';
 it('preserves the original workspace query string',()=>{
  const target='/dashboard/student?view=attendance&date=2026-10-24';
  expect(consentReturnPath(target,fallback)).toBe(target);
  expect(new URL(consentPath(target),'https://app.invalid').searchParams.get('redirect')).toBe(target);
 });
 it.each(['https://untrusted.invalid/','//untrusted.invalid/','/\\untrusted.invalid/','/api/data','/consent'])('does not return to an unsafe or unusable target: %s',target=>{
  expect(consentReturnPath(target,fallback)).toBe(fallback);
 });
 it('restores the destination through sign-in and consent nesting',()=>{
  const target='/dashboard/student?view=documents';
  const nested='/login/complete?redirect='+encodeURIComponent(consentPath(target));
  expect(consentReturnPath(nested,fallback)).toBe(target);
 });
});
