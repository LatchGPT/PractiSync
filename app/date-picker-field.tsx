'use client';

import {useState} from 'react';
import {format} from 'date-fns';
import {CalendarDays} from 'lucide-react';
import {Button} from '@/components/ui/button';
import {Calendar} from '@/components/ui/calendar';
import {Popover,PopoverContent,PopoverTrigger} from '@/components/ui/popover';
import {calendarDateValue,parseCalendarDate} from './calendar-date';

export default function DatePickerField({id,value,onChange,onBlur,invalid=false}:{id:string;value?:string;onChange:(value:string)=>void;onBlur?:()=>void;invalid?:boolean}){
 const [open,setOpen]=useState(false);
 const selected=parseCalendarDate(value);
 return <Popover open={open} onOpenChange={setOpen}>
  <PopoverTrigger asChild><Button id={id} type="button" variant="outline" data-empty={!selected} aria-invalid={invalid} onBlur={onBlur} className="date-picker-trigger"><CalendarDays size={16}/><span>{selected?format(selected,'PPP'):'Pick a date'}</span></Button></PopoverTrigger>
  <PopoverContent className="w-auto p-0" align="start" collisionPadding={12}>
   <Calendar mode="single" selected={selected} defaultMonth={selected} onSelect={date=>{if(date){onChange(calendarDateValue(date));setOpen(false);}}} autoFocus/>
  </PopoverContent>
 </Popover>;
}
