import type {Snapshot} from '../packages/validation/contracts';

const cell=(value:unknown)=>{let text=String(value??'');if(/^[\s]*[=+@-]/.test(text))text="'"+text;return '"'+text.replaceAll('"','""')+'"';};
export function dtrCsv(data:Snapshot,placementId:string){
 const header=['Record','Entry ID','Date','Version','Time in','Time out','Break minutes','Reported minutes','Confirmed','Narrative','Correction reason'];
 const entries=data.entries.filter(entry=>entry.placementId===placementId);
 const rows=entries.flatMap(entry=>[
  ['Current',entry.id,entry.date,entry.version,entry.startsAt,entry.endsAt,entry.breakMinutes,entry.minutes,entry.confirmedVersion===entry.version?'Yes':'No',entry.narrative,''],
  ...data.revisions.filter(revision=>revision.entryId===entry.id).map(revision=>['Previous version',entry.id,entry.date,revision.previousVersion,revision.startsAt,revision.endsAt,revision.breakMinutes,'','Invalidated on correction',revision.narrative,revision.reason])
 ]);
 return '\uFEFF'+[header,...rows].map(row=>row.map(cell).join(',')).join('\r\n');
}
export function downloadDtr(data:Snapshot,placementId:string){
 const blob=new Blob([dtrCsv(data,placementId)],{type:'text/csv;charset=utf-8'});const url=URL.createObjectURL(blob);const link=document.createElement('a');link.href=url;link.download='practisync-dtr-and-edit-log.csv';document.body.appendChild(link);link.click();link.remove();URL.revokeObjectURL(url);
}
