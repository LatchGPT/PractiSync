import { isIP } from 'node:net';
import { ZodError } from 'zod';
import { DomainError } from '../domain/policies';
import { RequestBodyError } from '../validation/request-body';
import { ConsentPolicyChanged, ConsentRequired, PrivacyPolicyUnavailable, type ConsentMetadata } from './consent';

export const consentHeaders={'Cache-Control':'private, no-store','Vary':'Cookie'};

/** Follow the app's forwarding-header convention; never accept request-body metadata. */
export function consentMetadata(request:Request):ConsentMetadata {
 const candidates=[request.headers.get('x-real-ip'),request.headers.get('x-forwarded-for')?.split(',')[0]];
 const ipAddress=candidates.map(value=>value?.trim()).find((value):value is string=>!!value&&isIP(value)!==0)??null;
 return {ipAddress,userAgent:request.headers.get('user-agent')};
}

/** Shared by the consent endpoints and, in the enforcement phase, protected API adapters. */
export function consentError(error:unknown) {
 if(error instanceof ConsentRequired)return Response.json({error:error.message,code:error.code,policyVersion:error.policyVersion,consentUrl:'/consent'},
  {status:403,headers:consentHeaders});
 if(error instanceof PrivacyPolicyUnavailable||error instanceof ConsentPolicyChanged)return Response.json({error:error.message,code:error.code},
  {status:error.status,headers:consentHeaders});
 if(error instanceof RequestBodyError)return Response.json({error:error.message,code:'INVALID_REQUEST'}, {status:error.status,headers:consentHeaders});
 if(error instanceof ZodError)return Response.json({error:'Choose ACCEPT, DECLINE or WITHDRAW and a supported language (en or fil). Do not include other fields.',code:'INVALID_CONSENT_INPUT'},
  {status:400,headers:consentHeaders});
 if(error instanceof DomainError)return Response.json({error:error.message,code:error.status===401?'AUTH_REQUIRED':error.status===403?'FORBIDDEN':'CONSENT_UNAVAILABLE'},
  {status:error.status,headers:consentHeaders});
 console.error('Consent request failed:',error instanceof Error?error.name:'UnknownError');
 return Response.json({error:'Privacy choices are temporarily unavailable. Try again shortly.',code:'CONSENT_UNAVAILABLE'}, {status:503,headers:consentHeaders});
}
