import type {Row} from '@/packages/validation/contracts';

const STANDARD_DAILY_MINUTES = 8 * 60;
const MIN_VERIFIED_DAYS_FOR_AVERAGE = 3;

export interface StudentGoalForecast {
 status:'missing-target'|'projected'|'completed'|'unavailable';
 date:string|null;
 remainingMinutes:number;
 workingDays:number|null;
 dailyMinutes:number;
 velocitySource:'verified-average'|'standard';
}

export function manilaDate(now=new Date()):string{
 const parts=new Intl.DateTimeFormat('en-US',{
  timeZone:'Asia/Manila',year:'numeric',month:'2-digit',day:'2-digit',
 }).formatToParts(now);
 const values=Object.fromEntries(parts.map(part=>[part.type,part.value]));
 return `${values.year}-${values.month}-${values.day}`;
}

export function formatCompletionDate(value:string):string{
 const parsed=parseDate(value);
 return parsed
  ? new Intl.DateTimeFormat('en-US',{dateStyle:'full',timeZone:'UTC'}).format(parsed)
  : value;
}

export function studentForecastLabel(forecast:StudentGoalForecast):string{
 if(forecast.status==='completed'){
  return forecast.date?`Completed on ${formatCompletionDate(forecast.date)}`:'Required hours verified';
 }
 if(forecast.status==='projected'&&forecast.date){
  return `Expected Completion: ${formatCompletionDate(forecast.date)}`;
 }
 return forecast.status==='missing-target'
  ?'Set a required-hours target to see an estimate'
  :'Completion date unavailable';
}

export function studentForecastDetail(forecast:StudentGoalForecast):string{
 if(forecast.status==='completed'){
  return forecast.date
   ?'All required hours are coordinator-confirmed.'
   :'The verified hours meet the target, but no valid DTR date is available.';
 }
 if(forecast.status==='projected'&&forecast.workingDays!==null){
  const days=forecast.workingDays;
  const dayLabel=days===1?'working day':'working days';
  const dailyHours=Number((forecast.dailyMinutes/60).toFixed(1));
  const basis=forecast.velocitySource==='standard'
   ?'8 hrs/day'
   :`your verified average of ${dailyHours} hrs/day`;
  return `~${days} ${dayLabel} remaining based on ${basis}.`;
 }
 return forecast.status==='missing-target'
  ?'A required-hours target is needed before an estimate is available.'
  :'A valid current date is needed to calculate a completion estimate.';
}

export function studentGoal(
 entries:Row[],
 requiredMinutes:number,
 calendarEvents:Row[]=[],
 today=manilaDate(),
){
 const reported=entries.reduce((sum,entry)=>sum+Math.max(0,Number(entry.minutes)||0),0);
 const verifiedEntries=entries.filter(entry=>entry.confirmedVersion===entry.version);
 const confirmed=verifiedEntries.reduce((sum,entry)=>sum+Math.max(0,Number(entry.minutes)||0),0);
 const daysOnRecord=new Set(entries.map(entry=>String(entry.date??'').slice(0,10)).filter(Boolean)).size;
 const target=Math.max(0,requiredMinutes);
 const remaining=Math.max(0,target-reported);
 const verifiedRemaining=Math.max(0,target-confirmed);
 const percent=target?Math.round(reported/target*100):0;
 const averagePerDay=daysOnRecord?reported/daysOnRecord:0;
 const predictedDays=target&&remaining&&daysOnRecord>=3&&averagePerDay>0?Math.ceil(remaining/averagePerDay):null;

 const verifiedByDate=new Map<string,number>();
 for(const entry of verifiedEntries){
  const date=String(entry.date??'').slice(0,10);
  if(!parseDate(date))continue;
  verifiedByDate.set(date,(verifiedByDate.get(date)??0)+Math.max(0,Number(entry.minutes)||0));
 }
 const verifiedDays=verifiedByDate.size;
 const datedVerifiedMinutes=[...verifiedByDate.values()].reduce((sum,minutes)=>sum+minutes,0);
 const verifiedAverage=verifiedDays?datedVerifiedMinutes/verifiedDays:0;
 const velocitySource=verifiedDays>=MIN_VERIFIED_DAYS_FOR_AVERAGE&&verifiedAverage>0
  ?'verified-average' as const
  :'standard' as const;
 const dailyMinutes=velocitySource==='verified-average'?verifiedAverage:STANDARD_DAILY_MINUTES;
 const completedOnDate=findCompletionDate(verifiedByDate,target,confirmed);
 const validToday=parseDate(today);
 const holidays=calendarEvents
  .filter(event=>event.eventType==='HOLIDAY'&&event.audience==='UNIVERSITY'&&event.status!=='CANCELLED')
  .map(event=>({start:String(event.startDate??'').slice(0,10),end:String(event.endDate??event.startDate??'').slice(0,10)}))
  .filter(range=>parseDate(range.start)&&parseDate(range.end)&&range.end>=range.start);

 let forecast:StudentGoalForecast;
 if(!target){
  forecast={status:'missing-target',date:null,remainingMinutes:0,workingDays:null,dailyMinutes,velocitySource};
 }else if(verifiedRemaining===0){
  forecast={status:'completed',date:completedOnDate,remainingMinutes:0,workingDays:0,dailyMinutes,velocitySource};
 }else if(!validToday){
  forecast={status:'unavailable',date:null,remainingMinutes:verifiedRemaining,workingDays:null,dailyMinutes,velocitySource};
 }else{
  const workingDays=Math.ceil(verifiedRemaining/dailyMinutes);
  forecast={
   status:'projected',
   date:projectWorkingDays(today,workingDays,holidays),
   remainingMinutes:verifiedRemaining,
   workingDays,
   dailyMinutes,
   velocitySource,
  };
 }

 return {reported,confirmed:Math.min(confirmed,reported),daysOnRecord,target,remaining,verifiedRemaining,percent,averagePerDay,predictedDays,forecast};
}

function findCompletionDate(verifiedByDate:Map<string,number>,target:number,confirmed:number):string|null{
 if(!target||confirmed<target)return null;
 let total=0;
 for(const [date,minutes] of [...verifiedByDate.entries()].sort(([a],[b])=>a.localeCompare(b))){
  total+=minutes;
  if(total>=target)return date;
 }
 return null;
}

function projectWorkingDays(today:string,workingDays:number,holidays:{start:string;end:string}[]):string|null{
 let date=today;
 let remaining=workingDays;
 for(let attempts=0;remaining>0&&attempts<36600;attempts++){
  const parsed=parseDate(date);
  if(!parsed)return null;
  const weekday=parsed.getUTCDay();
  const isHoliday=holidays.some(range=>range.start<=date&&date<=range.end);
  if(weekday!==0&&weekday!==6&&!isHoliday)remaining--;
  if(remaining>0){
   parsed.setUTCDate(parsed.getUTCDate()+1);
   date=parsed.toISOString().slice(0,10);
  }
 }
 return remaining===0?date:null;
}

function parseDate(value:string):Date|null{
 if(!/^\d{4}-\d{2}-\d{2}$/.test(value))return null;
 const timestamp=Date.parse(`${value}T00:00:00.000Z`);
 if(!Number.isFinite(timestamp))return null;
 const parsed=new Date(timestamp);
 return parsed.toISOString().slice(0,10)===value?parsed:null;
}
