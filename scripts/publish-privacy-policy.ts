import { readFile } from 'node:fs/promises';
import { prisma } from '../packages/db/client';
import { publishPrivacyPolicy } from '../packages/privacy/publish';

const args=process.argv.slice(2).filter(arg=>arg!=='--');
try {
 if(args.length!==2||args[0]!=='--file')throw new Error('Usage: pnpm privacy:publish -- --file path/to/policy.json');
 const input:unknown=JSON.parse(await readFile(args[1]!,'utf8'));
 const version=await publishPrivacyPolicy(input);
 console.log(`Published privacy policy ${version}. All users must consent to this version before workspace access.`);
}catch(error){
 console.error(error instanceof Error?error.message:'Policy publication failed.');
 process.exitCode=1;
}finally{
 await prisma.$disconnect();
}
