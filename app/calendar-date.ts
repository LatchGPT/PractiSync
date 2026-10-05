import {format} from 'date-fns';

export function parseCalendarDate(value:string|undefined){
 if(!value||!/^\d{4}-\d{2}-\d{2}$/.test(value))return undefined;
 const [year,month,day]=value.split('-').map(Number);
 const date=new Date(year,month-1,day,12);
 return date.getFullYear()===year&&date.getMonth()===month-1&&date.getDate()===day?date:undefined;
}

export function calendarDateValue(date:Date){return format(date,'yyyy-MM-dd');}
