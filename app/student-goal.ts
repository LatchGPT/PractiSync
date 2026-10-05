import type {Row} from '@/packages/validation/contracts';

export function studentGoal(entries:Row[],requiredMinutes:number){
 const reported=entries.reduce((sum,entry)=>sum+Math.max(0,Number(entry.minutes)||0),0);
 const confirmed=entries.reduce((sum,entry)=>sum+(entry.confirmedVersion===entry.version?Math.max(0,Number(entry.minutes)||0):0),0);
 const daysOnRecord=new Set(entries.map(entry=>String(entry.date??'')).filter(Boolean)).size;
 const target=Math.max(0,requiredMinutes);
 const remaining=Math.max(0,target-reported);
 const percent=target?Math.round(reported/target*100):0;
 const averagePerDay=daysOnRecord?reported/daysOnRecord:0;
 const predictedDays=target&&remaining&&daysOnRecord>=3&&averagePerDay>0?Math.ceil(remaining/averagePerDay):null;
 return {reported,confirmed:Math.min(confirmed,reported),daysOnRecord,target,remaining,percent,averagePerDay,predictedDays};
}
