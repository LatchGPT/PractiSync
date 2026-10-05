/** Build Philippine-time interval values from one entry date and two clock times. */
export function dtrTimestamps(date:string,timeIn:string,timeOut:string){
 if(!/^\d{4}-\d{2}-\d{2}$/.test(date)||!/^([01]\d|2[0-3]):[0-5]\d$/.test(timeIn)||!/^([01]\d|2[0-3]):[0-5]\d$/.test(timeOut))throw new Error('Choose an entry date and valid times.');
 if(timeIn===timeOut)throw new Error('Time out must differ from time in.');
 const nextDay=new Date(Date.parse(date+'T00:00:00Z')+86400000).toISOString().slice(0,10);
 return {startsAt:`${date}T${timeIn}`,endsAt:`${timeOut<timeIn?nextDay:date}T${timeOut}`};
}
