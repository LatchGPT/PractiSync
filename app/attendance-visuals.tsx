'use client';

import type {Row} from '@/packages/validation/contracts';
import {attendanceSeries,type AttendanceDay} from './attendance-series';

const blue='#124c91';
const gold='#d7aa3e';
const label=(date:string)=>new Date(date+'T00:00:00Z').toLocaleDateString('en-US',{month:'short',day:'numeric',timeZone:'UTC'});
const hours=(minutes:number)=>`${Number((minutes/60).toFixed(1))} hrs`;
const plot={left:48,right:696,top:18,bottom:148};

function DailyBars({days}:{days:AttendanceDay[]}){
 const max=Math.max(60,...days.map(day=>day.reported));
 const step=(plot.right-plot.left)/days.length;
 const bar=Math.min(15,step*.28);
 return <svg className="attendance-plot" viewBox="0 0 720 184" role="img" aria-label="Daily reported and coordinator-confirmed training hours">
  <line x1={plot.left} x2={plot.right} y1={plot.bottom} y2={plot.bottom} className="chart-axis"/>
  {[0,.5,1].map(part=><g key={part}><line x1={plot.left} x2={plot.right} y1={plot.bottom-(plot.bottom-plot.top)*part} y2={plot.bottom-(plot.bottom-plot.top)*part} className="chart-grid"/><text x="40" y={plot.bottom-(plot.bottom-plot.top)*part+4} textAnchor="end" className="chart-label">{Number((max*part/60).toFixed(1))}</text></g>)}
  {days.map((day,index)=>{const x=plot.left+step*(index+.5);const reported=(day.reported/max)*(plot.bottom-plot.top);const confirmed=(day.confirmed/max)*(plot.bottom-plot.top);return <g key={day.date}>
   <rect x={x-bar-2} y={plot.bottom-reported} width={bar} height={reported} rx="2" fill={blue}><title>{`${label(day.date)}: ${hours(day.reported)} reported`}</title></rect>
   <rect x={x+2} y={plot.bottom-confirmed} width={bar} height={confirmed} rx="2" fill={gold}><title>{`${label(day.date)}: ${hours(day.confirmed)} confirmed`}</title></rect>
   {(days.length<=7||index%2===0)&&<text x={x} y="169" textAnchor="middle" className="chart-label">{label(day.date)}</text>}
  </g>;})}
 </svg>;
}

function CumulativeLines({days}:{days:AttendanceDay[]}){
 const cumulative=days.reduce<{date:string;reported:number;confirmed:number}[]>((points,day)=>{
  const previous=points.at(-1);
  return [...points,{date:day.date,reported:(previous?.reported??0)+day.reported,confirmed:(previous?.confirmed??0)+day.confirmed}];
 },[]);
 const max=Math.max(60,cumulative.at(-1)?.reported??0);
 const point=(key:'reported'|'confirmed')=>cumulative.map((day,index)=>{
  const x=plot.left+(plot.right-plot.left)*(days.length===1?0:index/(days.length-1));
  const y=plot.bottom-day[key]/max*(plot.bottom-plot.top);
  return `${x},${y}`;
 }).join(' ');
 return <svg className="attendance-plot" viewBox="0 0 720 184" role="img" aria-label="Cumulative reported and coordinator-confirmed training hours">
  {[0,.5,1].map(part=><g key={part}><line x1={plot.left} x2={plot.right} y1={plot.bottom-(plot.bottom-plot.top)*part} y2={plot.bottom-(plot.bottom-plot.top)*part} className="chart-grid"/><text x="40" y={plot.bottom-(plot.bottom-plot.top)*part+4} textAnchor="end" className="chart-label">{Number((max*part/60).toFixed(1))}</text></g>)}
  <polyline points={point('reported')} fill="none" stroke={blue} strokeWidth="3" strokeLinejoin="round" strokeLinecap="round"/>
  <polyline points={point('confirmed')} fill="none" stroke={gold} strokeWidth="3" strokeLinejoin="round" strokeLinecap="round"/>
  {cumulative.map((day,index)=>index===0||index===days.length-1||index%3===0?<text key={day.date} x={plot.left+(plot.right-plot.left)*(days.length===1?0:index/(days.length-1))} y="169" textAnchor="middle" className="chart-label">{label(day.date)}</text>:null)}
 </svg>;
}

export default function AttendanceVisuals({entries,detail=false}:{entries:Row[];detail?:boolean}){
 const days=attendanceSeries(entries,detail?14:7);
 const reported=days.reduce((sum,day)=>sum+day.reported,0);
 const confirmed=days.reduce((sum,day)=>sum+day.confirmed,0);
 const range=days.length?`${label(days[0].date)}–${label(days.at(-1)!.date)}`:'';
 return <div className={`attendance-visuals${detail?' attendance-visuals-detail':''}`}>
  <section className="attendance-chart-card"><div className="attendance-chart-head"><div><h2>Daily training hours</h2><p>{days.length?`${range} · Based on visible DTR records`:'Submit a DTR to see your daily hours.'}</p></div>{detail&&days.length>0&&<strong>{hours(reported)}</strong>}</div>
   {days.length?<><div className="attendance-plot-scroll"><DailyBars days={days}/></div><div className="attendance-chart-legend"><span><i className="reported"/>Reported</span><span><i className="confirmed"/>Coordinator confirmed</span></div></>:<p className="attendance-chart-empty">No attendance records to chart yet.</p>}
  </section>
  {detail&&<section className="attendance-chart-card"><div className="attendance-chart-head"><div><h2>Hours over time</h2><p>{days.length?`${range} · Cumulative within this window`:'A trend appears after the first DTR.'}</p></div>{days.length>0&&<strong>{hours(confirmed)} confirmed</strong>}</div>
   {days.length?<><div className="attendance-plot-scroll"><CumulativeLines days={days}/></div><div className="attendance-chart-legend"><span><i className="reported"/>Reported</span><span><i className="confirmed"/>Coordinator confirmed</span></div></>:<p className="attendance-chart-empty">No attendance records to chart yet.</p>}
  </section>}
 </div>;
}
