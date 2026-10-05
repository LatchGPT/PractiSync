'use client';

import {useState,type FormEvent} from 'react';
import {toast} from 'sonner';
import {Download,Upload} from 'lucide-react';
import {Button} from '@/components/ui/button';
import {Card,CardContent,CardDescription,CardHeader,CardTitle} from '@/components/ui/card';
import {Input} from '@/components/ui/input';
import {Label} from '@/components/ui/label';
import {Select,SelectContent,SelectItem,SelectTrigger,SelectValue} from '@/components/ui/select';

const templates=[{type:'agreement',name:'Training agreement'},{type:'consent',name:'Parent / guardian consent'},{type:'information',name:'Student information sheet'}] as const;
export default function DocumentTools({placementId,onSaved}:{placementId:string;onSaved:()=>Promise<void>}){
 const [name,setName]=useState<string>(templates[0].name),[file,setFile]=useState<File|null>(null),[busy,setBusy]=useState(false);
 async function submit(event:FormEvent<HTMLFormElement>){event.preventDefault();if(!file)return;const form=event.currentTarget;setBusy(true);try{const body=new FormData();body.set('placementId',placementId);body.set('name',name);body.set('file',file);const response=await fetch('/api/documents',{method:'POST',body});const result=await response.json() as {error?:string;message?:string};if(!response.ok)throw new Error(result.error??'Upload failed.');await onSaved();setFile(null);form.reset();toast.success(result.message??'Document submitted.');}catch(error){toast.error(error instanceof Error?error.message:'Upload failed.');}finally{setBusy(false);}}
 return <div className="document-tools"><Card><CardHeader><CardTitle>Submit a required document</CardTitle><CardDescription>PDF, PNG, or JPEG · 1 MB maximum. Your coordinator reviews the submission.</CardDescription></CardHeader><CardContent><form onSubmit={submit} className="document-submit"><Label htmlFor="document-type">Document type</Label><Select value={name} onValueChange={setName}><SelectTrigger id="document-type"><SelectValue/></SelectTrigger><SelectContent>{templates.map(template=><SelectItem key={template.type} value={template.name}>{template.name}</SelectItem>)}</SelectContent></Select><Label htmlFor="document-file">File</Label><Input id="document-file" type="file" accept=".pdf,.png,.jpg,.jpeg,application/pdf,image/png,image/jpeg" required onChange={event=>setFile(event.target.files?.[0]??null)}/><Button disabled={busy||!file} type="submit"><Upload size={16}/>{busy?'Submitting…':'Submit for review'}</Button></form></CardContent></Card><Card><CardHeader><CardTitle>Download practice forms</CardTitle><CardDescription>Printable HTML templates. Confirm official requirements with your coordinator.</CardDescription></CardHeader><CardContent><div className="document-templates">{templates.map(template=><a key={template.type} href={`/api/forms?type=${template.type}`} download><Download size={16}/>{template.name}</a>)}</div></CardContent></Card></div>;
}
