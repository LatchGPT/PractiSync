import {identity} from '../../../packages/auth/auth';
import {requireFeature} from '../../../packages/domain/features';
import {DomainError} from '../../../packages/domain/policies';

export const dynamic='force-dynamic';
const forms={agreement:{title:'Training agreement',fields:['Student name','Course and section','Company name','Training period','Student signature','Company representative signature','Coordinator signature']},consent:{title:'Parent / guardian consent',fields:['Student name','Parent or guardian name','Contact number','Training company','Parent or guardian signature','Date']},information:{title:'Student information sheet',fields:['Student name','Student number','Course and section','Contact number','Emergency contact','Company and supervisor','Training dates']}} as const;
export async function GET(request:Request){try{
 const user=await identity(request);await requireFeature(user,'documents');
 const type=new URL(request.url).searchParams.get('type');if(!type||!(type in forms))throw new DomainError('Choose a form template.');
 const form=forms[type as keyof typeof forms];
 const fields=form.fields.map(field=>`<label>${field}<span></span></label>`).join('');
 const html=`<!doctype html><html lang="en"><meta charset="utf-8"><title>${form.title} | PractiSync sample</title><style>body{font:16px Arial,sans-serif;max-width:760px;margin:50px auto;color:#153456}h1{color:#124c91}p{line-height:1.5}label{display:block;margin:26px 0;font-weight:bold}label span{display:block;height:28px;border-bottom:1px solid #52657c}footer{margin-top:50px;font-size:12px;color:#63768b}@media print{body{margin:25mm auto}}</style><h1>${form.title}</h1><p>PractiSync practice template. Confirm the required official form with your university coordinator.</p>${fields}<footer>Fictional demo template · Not an official RTU document</footer></html>`;
 return new Response(html,{headers:{'Content-Type':'text/html; charset=utf-8','Content-Disposition':`attachment; filename="practisync-${type}-template.html"`,'Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff'}});
}catch(error){return Response.json({error:error instanceof DomainError?error.message:'Form unavailable.'},{status:error instanceof DomainError?error.status:400});}}
