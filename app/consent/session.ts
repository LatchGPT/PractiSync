'use client';

export async function refreshConsentSession() {
 const csrfResponse=await fetch('/api/auth/csrf',{cache:'no-store'});
 const csrf=await csrfResponse.json() as {csrfToken?:string};
 if(!csrfResponse.ok||!csrf.csrfToken)throw new Error('Your choice is saved. Your session could not refresh. Try continuing again.');
 const response=await fetch('/api/auth/session',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({csrfToken:csrf.csrfToken,data:{}})});
 const session=await response.json() as {user?:{id?:string};consentVersion?:string|null};
 if(!response.ok||!session.user?.id)throw new Error('Your choice is saved. Sign in again to continue.');
 return session;
}
