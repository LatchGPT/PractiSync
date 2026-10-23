import '../tests/e2e/environment';
import { database, insert, seed } from '../packages/db/demo';
import { prisma } from '../packages/db/client';
import { hashPassword } from '../packages/auth/password';
import { currentPrivacyPolicy } from '../packages/privacy/consent';
import { publishPrivacyPolicy } from '../packages/privacy/publish';

try{
 await seed();
 if(process.argv[2]==='publish'){
  const p=await currentPrivacyPolicy(),version='e2e-'+crypto.randomUUID();
  await publishPrivacyPolicy({version,titleEn:p.titleEn,bodyEn:p.bodyEn,titleFil:p.titleFil,bodyFil:p.bodyFil,effectiveAt:new Date(Date.now()-60_000).toISOString()});
  console.log(JSON.stringify({version}));
 }else if(process.argv[2]==='new-student'){
  const id=crypto.randomUUID(),username='privacy.new.'+id,password='PrivacyE2E-Only!2026';
  await database().batch([
   insert('users',{name:'Fictional privacy test student',username,email:`privacy.${id}@rtu.edu.ph`,role:'STUDENT',status:'ACTIVE',password_hash:await hashPassword(password),session_version:1,is_demo:0},id),
   insert('student_verifications',{requester_id:id,status:'DRAFT',updated_at:new Date().toISOString()},'verification-'+id),
  ]);
  console.log(JSON.stringify({username,password}));
 }else throw new Error('Choose publish or new-student for isolated privacy test data setup.');
}catch(error){console.error(error instanceof Error?error.message:'Privacy test data setup failed.');process.exitCode=1;}
finally{await prisma.$disconnect();}
