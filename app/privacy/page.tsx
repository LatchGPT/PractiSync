import { currentPrivacyPolicy } from '@/packages/privacy/consent';
import PrivacyNotice from '@/app/consent/notice';
import '@/app/consent/privacy.css';

export const dynamic='force-dynamic';
export const metadata={title:'Privacy Notice · PractiSync'};
export default async function PrivacyPolicyPage({searchParams}:{searchParams:Promise<{language?:string}>}) {
 const query=await searchParams,language=query.language==='fil'?'fil':'en',policy=await currentPrivacyPolicy();
 return <main className="privacy-page privacy-document" lang={language}><article className="privacy-gate">
  <header className="privacy-heading"><h1>{language==='fil'?policy.titleFil:policy.titleEn}</h1><p>Rizal Technological University · PractiSync</p></header>
  <nav className="privacy-language" aria-label="Language / Wika"><a href="/privacy?language=en" aria-current={language==='en'?'page':undefined}>English</a><a href="/privacy?language=fil" aria-current={language==='fil'?'page':undefined}>Filipino</a></nav>
  <p className="privacy-policy-meta">{language==='fil'?'Bersiyon':'Version'} {policy.version} · {new Date(policy.effectiveAt).toLocaleDateString(language==='fil'?'fil-PH':'en-PH',{dateStyle:'long',timeZone:'Asia/Manila'})}</p>
  <PrivacyNotice body={language==='fil'?policy.bodyFil:policy.bodyEn}/>
 </article></main>;
}
