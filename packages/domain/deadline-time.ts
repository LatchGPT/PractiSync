export function deadlineTime(endDate:string,endTime?:string|null):Date {
 return new Date(`${endDate}T${endTime||'23:59'}:00+08:00`);
}
export function reminderTimes(endDate:string,endTime?:string|null):{leadDays:number;dueAt:string;deadlineAt:string}[] {
 const deadline=deadlineTime(endDate,endTime);
 if(!Number.isFinite(deadline.getTime()))throw new Error('Choose a valid deadline.');
 return [3,1].map(leadDays=>({leadDays,dueAt:new Date(Date.parse(`${endDate}T09:00:00+08:00`)-leadDays*86400000).toISOString(),deadlineAt:deadline.toISOString()}));
}
