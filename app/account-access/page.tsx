import AccountAccess from './view';
import { googleConfigured } from '@/packages/auth/runtime';
import { mailConfigured } from '@/packages/auth/mail';
export const dynamic='force-dynamic';
export const metadata={title:'Account access · RTU PractiSync',referrer:'no-referrer'};
export default function Page(){return <AccountAccess google={googleConfigured()} mail={mailConfigured()}/>;}
