import { bootstrapInstitutionAdmin } from '../packages/auth/accounts';
import { prisma } from '../packages/db/client';
const argument=(name:string)=>{const index=process.argv.indexOf(name);return index>=0?process.argv[index+1]??'':'';};
try{
 const name=argument('--name'),email=argument('--email');
 if(!name||!email)throw new Error('Usage: pnpm accounts:bootstrap --name "Authorized staff name" --email authorized.staff@rtu.edu.ph');
 const result=await bootstrapInstitutionAdmin(name,email);console.log(result.message);
}catch(error){console.error(error instanceof Error?error.message:'Institutional bootstrap failed.');process.exitCode=1;}finally{await prisma.$disconnect();}
