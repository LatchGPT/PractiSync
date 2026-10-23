import { z } from 'zod';

export const consentLanguage=z.enum(['en','fil']);
export const consentStatus=z.enum(['ACCEPTED','DECLINED','WITHDRAWN']);
export const consentInput=z.object({
 action:z.enum(['ACCEPT','DECLINE','WITHDRAW']),
 language:consentLanguage,
}).strict();

export type ConsentLanguage=z.infer<typeof consentLanguage>;
export type ConsentStatus=z.infer<typeof consentStatus>;
export type ConsentInput=z.infer<typeof consentInput>;
