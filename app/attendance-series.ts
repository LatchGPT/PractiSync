import type {Row} from '@/packages/validation/contracts';

export type AttendanceDay={date:string;reported:number;confirmed:number};

/** Calendar days through the newest scoped DTR; minutes remain separate until display. */
export function attendanceSeries(entries:Row[],days:number):AttendanceDay[]{
 const valid=entries.filter(entry=>/^\d{4}-\d{2}-\d{2}$/.test(String(entry.date??'')));
 if(!valid.length||days<1)return [];
 const latest=valid.reduce((max,entry)=>String(entry.date)>max?String(entry.date):max,'');
 const end=Date.parse(latest+'T00:00:00Z');
 const totals=new Map<string,{reported:number;confirmed:number}>();
 for(const entry of valid){
  const key=String(entry.date);
  const minutes=Math.max(0,Number(entry.minutes)||0);
  const day=totals.get(key)??{reported:0,confirmed:0};
  day.reported+=minutes;
  if(entry.confirmedVersion===entry.version)day.confirmed+=minutes;
  totals.set(key,day);
 }
 return Array.from({length:days},(_,index)=>{
  const date=new Date(end-(days-1-index)*86400000).toISOString().slice(0,10);
  return {date,...(totals.get(date)??{reported:0,confirmed:0})};
 });
}
