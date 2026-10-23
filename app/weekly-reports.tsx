'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { ArrowLeft, ArrowRight, CheckCircle2, ImagePlus, Plus, Save, Trash2, FileText, RefreshCw } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { assessmentPeriod, manilaToday } from '@/packages/domain/assessment-period';
import { emptyWeeklyContent, ratingLabels, weeklyPrompts, type WeeklyContent, type WeeklyQuestion, type WeeklyReport, type WeeklyView, type WeeklyPlacement } from '@/packages/domain/weekly-report-contract';
import type { Identity } from '@/packages/validation/contracts';
import styles from './weekly-reports.module.css';
import Image from 'next/image';

const currentWeek = () => assessmentPeriod('WEEKLY', manilaToday()).start;
const dateLabel = (value:string) => new Date(value+'T00:00:00+08:00').toLocaleDateString('en-PH',{month:'short',day:'numeric',year:'numeric',timeZone:'Asia/Manila'});
async function request<T>(url:string,options?:RequestInit):Promise<T> {
  const response=await fetch(url,{...options,cache:'no-store'});
  const body=await response.json() as T & {error?:string};if(!response.ok)throw new Error(body.error||'Request failed. Please retry.');return body;
}
const post=<T,>(body:unknown)=>request<T>('/api/weekly-reports',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
function Message({children,error=false}:{children:React.ReactNode;error?:boolean}){return <p className={error?styles.error:styles.notice} role={error?'alert':'status'}>{children}</p>;}

export default function WeeklyReports({user}:{user:Identity}) {
  const [week,setWeek]=useState(currentWeek),[course,setCourse]=useState(''),[view,setView]=useState<WeeklyView|null>(null),[error,setError]=useState(''),[loading,setLoading]=useState(true),[revision,setRevision]=useState(0),[selected,setSelected]=useState('');
  const dirty=useRef(false);
  const reload=useCallback(()=>setRevision(v=>v+1),[]);
  useEffect(()=>{const controller=new AbortController();let live=true;
    request<WeeklyView>(`/api/weekly-reports?week=${week}&course=${encodeURIComponent(course)}`,{signal:controller.signal}).then(data=>{if(live){setView(data);setError('');setLoading(false);}}).catch(e=>{if(live&&e.name!=='AbortError'){setError(e.message);setLoading(false);}});
    return()=>{live=false;controller.abort();};
  },[week,course,revision]);
  useEffect(()=>{const listener=(e:BeforeUnloadEvent)=>{if(dirty.current){e.preventDefault();e.returnValue='';}};window.addEventListener('beforeunload',listener);return()=>window.removeEventListener('beforeunload',listener);},[]);
  const changeFilter=(work:()=>void)=>{if(dirty.current&&!window.confirm('Leave this report? Changes since the last save will be lost.'))return;dirty.current=false;setLoading(true);setSelected('');work();};
  const placement=view?.placements.find(p=>p.id===selected)||view?.placements[0];
  const report=view?.reports.find(r=>r.placementId===placement?.id);
  return <section className={styles.workspace} aria-label="Weekly reporting and competency">
    <header className={styles.header}><div><h1>{user.role==='SUPER_ADMIN'?'Weekly competency analytics':'Weekly reports'}</h1><p>{user.role==='STUDENT'?'Reflect on your work, record your learning, and complete your weekly competency check.':user.role==='COORDINATOR'?'Read your students’ weekly work and learning.':'Monitor weekly participation and self-reported competency across courses.'}</p></div><FileText aria-hidden="true" className={styles.headingIcon}/></header>
    <div className={styles.toolbar}><label>Reporting week<input type="date" value={week} max={manilaToday()} onChange={e=>{if(e.target.value)changeFilter(()=>setWeek(assessmentPeriod('WEEKLY',e.target.value).start));}}/></label>
      {user.role!=='STUDENT'&&<label>Course<select value={course} onChange={e=>changeFilter(()=>setCourse(e.target.value))}><option value="">All courses</option>{view?.courses.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}</select></label>}
      <button type="button" className={styles.quiet} onClick={()=>changeFilter(reload)}><RefreshCw size={16}/>Refresh</button></div>
    <p className={styles.period}>{dateLabel(week)} – {dateLabel(assessmentPeriod('WEEKLY',week).end)} · Due Sunday, 11:59 PM Philippine time</p>
    {error&&<Message error>{error} <button onClick={reload}>Retry</button></Message>}
    {loading?<div className={styles.skeleton} role="status">Loading weekly records…</div>:view&&<>
      {user.role==='SUPER_ADMIN'?<Analytics view={view}/>:view.placements.length===0?<div className={styles.empty}><FileText size={30}/><h2>No active placement for this week</h2><p>Reports are required for weeks covered by a training placement. Choose another reporting week to view past records.</p></div>:<div className={user.role==='COORDINATOR'?styles.reviewLayout:undefined}>
        {user.role==='COORDINATOR'&&<aside className={styles.roster} aria-label="Students this week">{view.placements.map(p=>{const r=view.reports.find(r=>r.placementId===p.id);return <button key={p.id} aria-pressed={p.id===placement?.id} onClick={()=>setSelected(p.id)}><strong>{p.studentName}</strong><span>{r?.status==='SUBMITTED'?'Submitted':r?.status==='EXCUSED'?'Approved break':r?.status==='DRAFT'?'Draft':'Not submitted'}{r?.late?' · Late':''}</span></button>;})}</aside>}
        {placement&&<ReportEditor key={`${week}:${placement.id}`} placement={placement} week={week} initial={report} questions={report?.questions.length?report.questions:view.previewQuestions[placement.courseId]||[]} readOnly={user.role!=='STUDENT'} onSaved={reload} onDirty={value=>{dirty.current=value;}}/>}
      </div>}
      {user.role!=='STUDENT'&&<details className={styles.management}><summary>Question sets and publishing</summary><QuestionPublisher view={view} user={user} onSaved={reload}/>{user.role==='SUPER_ADMIN'&&<AuthorGrants view={view} onSaved={reload}/>}</details>}
    </>}
  </section>;
}

function ReportEditor({placement,week,initial,questions:initialQuestions,readOnly,onSaved,onDirty}:{placement:WeeklyPlacement;week:string;initial?:WeeklyReport;questions:WeeklyQuestion[];readOnly:boolean;onSaved:()=>void;onDirty:(dirty:boolean)=>void}) {
  const [content,setContent]=useState<WeeklyContent>({...emptyWeeklyContent,...initial?.content}),[answers,setAnswers]=useState<Record<string,number>>(initial?.answers||{}),[report,setReport]=useState(initial),[questions,setQuestions]=useState(initialQuestions),[busy,setBusy]=useState(false),[error,setError]=useState(''),[message,setMessage]=useState(''),[step,setStep]=useState<number|null>(null),[reason,setReason]=useState('');
  const questionRef=useRef<HTMLHeadingElement>(null);
  const frozen=readOnly||report?.status==='SUBMITTED'||report?.status==='EXCUSED';
  useEffect(()=>{questionRef.current?.focus();},[step]);
  const change=(value:Partial<WeeklyContent>)=>{setContent(c=>({...c,...value}));onDirty(true);setMessage('');};
  async function persist(submit=false){
    setBusy(true);setError('');
    try{
      const result=await post<{id:string;version:number;message:string}>({action:'save',placementId:placement.id,week,version:report?.version||0,content,answers,submit});
      // Reload the pinned course/week questions, which may have been published while the draft was open.
      const data=await request<WeeklyView>(`/api/weekly-reports?week=${week}`),saved=data.reports.find(r=>r.id===result.id);
      if(saved){setReport(saved);setQuestions(saved.questions.length?saved.questions:data.previewQuestions[placement.courseId]||[]);setAnswers(saved.answers);}
      setMessage(result.message);onDirty(false);onSaved();if(submit)setStep(null);return saved;
    }catch(e){setError((e as Error).message);return null;}finally{setBusy(false);}
  }
  async function start(){
    if(!content.noActivity&&weeklyPrompts.some(([key])=>content[key].trim().length<5)){setError('Complete every report prompt with at least 5 characters before continuing.');return;}
    if(content.noActivity&&content.noActivityReason.trim().length<5){setError('Explain why there was no activity this week.');return;}
    const saved=await persist();if(saved){if(!saved.questions.length){setError('Your report is saved. Waiting for published general and course questions.');return;}setStep(0);}
  }
  async function upload(file:File){
    if(!['image/jpeg','image/png','image/webp'].includes(file.type)||file.size>5*1024*1024){setError('Choose a JPEG, PNG or WebP image up to 5 MB.');return;}
    const saved=await persist();if(!saved)return;setBusy(true);setError('');
    try{const image=await request<{id:string;name:string}>(`/api/weekly-reports/images?reportId=${saved.id}&name=${encodeURIComponent(file.name)}`,{method:'POST',headers:{'Content-Type':file.type},body:file});setReport({...saved,attachments:[...saved.attachments,image]});setMessage('Image uploaded.');onSaved();}catch(e){setError((e as Error).message);}finally{setBusy(false);}
  }
  async function removeImage(id:string){if(!window.confirm('Remove this image from the weekly report?'))return;setBusy(true);setError('');try{await request(`/api/weekly-reports/images/${id}`,{method:'DELETE'});setReport(r=>r?{...r,attachments:r.attachments.filter(i=>i.id!==id)}:r);onSaved();}catch(e){setError((e as Error).message);}finally{setBusy(false);}}
  async function excuse(){setBusy(true);setError('');try{await post({action:'excuse',placementId:placement.id,week,reason});setReport({id:initial?.id||'',placementId:placement.id,week,status:'EXCUSED',version:1,content,answers:{},questions:[],submittedAt:null,late:false,excuseReason:reason,attachments:report?.attachments||[]});setMessage('Approved break recorded.');onSaved();}catch(e){setError((e as Error).message);}finally{setBusy(false);}}
  const q=step!==null?questions[step]:null;
  return <article className={styles.report}>
    <div className={styles.reportHeading}><div><h2>{readOnly?placement.studentName:'Your week at work'}</h2><p>{placement.courseName}</p></div><span className={styles.status}>{report?.status==='SUBMITTED'?'Submitted':report?.status==='EXCUSED'?'Approved break':readOnly?'Not submitted':week<currentWeek()?'Overdue · Draft':'Draft'}</span></div>
    {message&&<Message>{message}</Message>}{error&&<Message error>{error}</Message>}
    {report?.status==='SUBMITTED'&&<Message><CheckCircle2 size={17}/>Submitted {new Date(report.submittedAt!).toLocaleString('en-PH',{timeZone:'Asia/Manila'})} Philippine time{report.late?' · Late submission':''}. Your report and competency answers are recorded together.</Message>}
    {report?.status==='EXCUSED'?<Message>Approved break: {report.excuseReason}</Message>:<>
      {!readOnly&&<label className={styles.check}><input type="checkbox" checked={content.noActivity} disabled={frozen||busy} onChange={e=>change({noActivity:e.target.checked})}/>I had no OJT activity this week</label>}
      {content.noActivity?<label className={styles.field}>Reason for no activity<textarea maxLength={2000} rows={4} value={content.noActivityReason} disabled={frozen||busy} onChange={e=>change({noActivityReason:e.target.value})}/><small>The weekly competency check is still required during an active placement.</small></label>:weeklyPrompts.map(([key,label])=><label className={styles.field} key={key}>{label}<textarea rows={key==='tasks'?4:3} maxLength={8000} value={content[key]} disabled={frozen||busy} onChange={e=>change({[key]:e.target.value})}/></label>)}
      <section className={styles.evidence}><h3>Image evidence <span>(optional)</span></h3><p>Up to 5 images · JPEG, PNG or WebP · 5 MB each. Visible to you and your assigned coordinator.</p><div className={styles.images}>{report?.attachments.map(i=><figure key={i.id}><a href={`/api/weekly-reports/images/${i.id}`} target="_blank" rel="noreferrer"><Image unoptimized src={`/api/weekly-reports/images/${i.id}`} alt={i.name} width={160} height={110}/><figcaption>{i.name}</figcaption></a>{!frozen&&<button type="button" className={styles.quiet} disabled={busy} onClick={()=>removeImage(i.id)}><Trash2 size={15}/>Remove</button>}</figure>)}</div>
      {!frozen&&<label className={styles.upload}><ImagePlus size={18}/>{busy?'Saving…':'Attach an image'}<input type="file" accept="image/jpeg,image/png,image/webp" disabled={busy||(report?.attachments.length||0)>=5} onChange={e=>{const file=e.target.files?.[0];if(file)void upload(file);e.target.value='';}}/></label>}</section>
      {frozen&&questions.length>0&&<section className={styles.answers}><h3>Competency self-ratings</h3>{questions.map(q=><div key={q.id}><span>{q.text}</span><strong>{answers[q.id]?`${answers[q.id]} / 5 · ${q.labels[answers[q.id]-1]}`:'Not answered'}</strong></div>)}</section>}
      {!frozen&&<div className={styles.actions}><button type="button" className={styles.secondary} disabled={busy} onClick={()=>persist()}><Save size={16}/>Save draft</button><button type="button" className={styles.primary} disabled={busy} onClick={start}>Continue to competency check<ArrowRight size={17}/></button></div>}
      {!frozen&&!questions.length&&<Message>Waiting for your general and course question sets to be published. You can save your report as a draft.</Message>}
    </>}
    {readOnly&&report?.status!=='SUBMITTED'&&report?.status!=='EXCUSED'&&<details className={styles.management}><summary>Record an approved break</summary><label className={styles.field}>Reason for excusing this week<textarea value={reason} maxLength={1000} onChange={e=>setReason(e.target.value)}/></label><button className={styles.secondary} disabled={busy||reason.trim().length<5} onClick={excuse}>Mark week excused</button></details>}
    <Dialog open={step!==null} onOpenChange={open=>{if(!open&&!busy)setStep(null);}}><DialogContent className={styles.quiz} onEscapeKeyDown={e=>{if(busy)e.preventDefault();}} onPointerDownOutside={e=>e.preventDefault()}>
      <DialogHeader><DialogTitle>Weekly competency check</DialogTitle><DialogDescription>Rate your current experience honestly. These are self-ratings, with no right or wrong answers.</DialogDescription></DialogHeader>
      {q?<><div className={styles.quizProgress}><span>Question {step!+1} of {questions.length}</span><span>{q.id.startsWith('general:')?'General competency':'Course competency'}</span></div><progress value={step!+1} max={questions.length} aria-label="Questionnaire progress"/><h3 tabIndex={-1} ref={questionRef} className={styles.question}>{q.text}</h3><fieldset className={styles.choices}><legend className={styles.srOnly}>Choose one rating</legend>{q.labels.map((label,index)=><label key={index} data-selected={answers[q.id]===index+1}><input type="radio" name={q.id} value={index+1} checked={answers[q.id]===index+1} disabled={busy} onChange={()=>{setAnswers(a=>({...a,[q.id]:index+1}));onDirty(true);}}/><span className={styles.rating}>{index+1}</span><span>{label}</span></label>)}</fieldset>{error&&<Message error>{error}</Message>}
        <div className={styles.quizActions}><button className={styles.quiet} disabled={busy} onClick={async()=>{if(await persist())setStep(null);}}>Save draft and close</button><div><button className={styles.secondary} disabled={busy||step===0} onClick={()=>setStep(n=>n!-1)}><ArrowLeft size={16}/>Back</button>{step===questions.length-1?<button className={styles.primary} disabled={busy||questions.some(q=>!answers[q.id])} onClick={()=>persist(true)}>{busy?'Submitting…':'Submit weekly report'}<CheckCircle2 size={16}/></button>:<button className={styles.primary} disabled={busy||!answers[q.id]} onClick={()=>setStep(n=>n!+1)}>Next<ArrowRight size={16}/></button>}</div></div></>:null}
    </DialogContent></Dialog>
  </article>;
}

function Analytics({view}:{view:WeeklyView}){
  return <div className={styles.analytics}><p className={styles.notice}>Student self-ratings use a 1–5 scale. Scores appear only for groups with at least 3 distinct students. Industry Partner evaluations retain their own scale and workflow.</p>
    {!view.aggregates.length?<div className={styles.empty}><h2>No placements for this week</h2><p>Choose a different week or course to view participation.</p></div>:view.aggregates.map(a=><section className={styles.aggregate} key={a.courseId}><h2>{a.courseName}</h2><dl className={styles.stats}><div><dt>Weekly submissions</dt><dd>{a.submitted} <span>/ {a.expected} expected</span></dd></div><div><dt>Completion</dt><dd>{a.expected?Math.round(a.submitted/a.expected*100):0}%</dd></div><div><dt>No-activity reports</dt><dd>{a.noActivity}</dd></div><div><dt>Approved breaks / late</dt><dd>{a.excused} / {a.late}</dd></div></dl>
      {a.suppressed?<Message>Competency scores are hidden until at least 3 distinct students submit. Participation counts remain available.</Message>:<div className={styles.dimensionList}>{a.dimensions.map(d=><div key={d.name}><span>{d.name}</span><meter min={1} max={5} value={d.average} aria-label={`${d.name}: ${d.average.toFixed(2)} out of 5`}/><strong>{d.average.toFixed(2)} / 5</strong><small>{d.count} responses</small></div>)}</div>}</section>)}
    <section className={styles.trends}><h2>Eight-week trend</h2><p>Course competency averages remain hidden for small groups. Each score shows the number of responses behind it.</p><div className={styles.tableScroll} role="region" aria-label="Eight-week competency trend table" tabIndex={0}><table><thead><tr><th>Week starting</th><th>Course</th><th>Submitted / expected</th><th>Competency self-ratings</th></tr></thead><tbody>{(view.trend||[]).map(a=><tr key={a.week+a.courseId}><td>{dateLabel(a.week)}</td><td>{a.courseName}</td><td>{a.submitted} / {a.expected}</td><td>{a.suppressed?'Insufficient sample':a.dimensions.map(d=><div key={d.name}>{d.name}: <strong>{d.average.toFixed(2)}</strong> ({d.count})</div>)}</td></tr>)}</tbody></table>{!view.trend?.length&&<p>No weekly data for this filter.</p>}</div></section>
  </div>;
}

const blankQuestion=():WeeklyQuestion=>({id:`q-${crypto.randomUUID().slice(0,8)}`,text:'',competency:'',kind:'RATING',labels:[...ratingLabels]});
function QuestionPublisher({view,user,onSaved}:{view:WeeklyView;user:Identity;onSaved:()=>void}){
  const [courseId,setCourseId]=useState(user.role==='SUPER_ADMIN'?'':view.authorableCourses[0]||''),[week,setWeek]=useState(currentWeek),[questions,setQuestions]=useState<WeeklyQuestion[]>([]),[busy,setBusy]=useState(false),[error,setError]=useState(''),[message,setMessage]=useState('');
  const allowed=user.role==='SUPER_ADMIN'||view.authorableCourses.length>0;
  const update=(index:number,change:Partial<WeeklyQuestion>)=>setQuestions(qs=>qs.map((q,i)=>i===index?{...q,...change}:q));
  async function publish(){setBusy(true);setError('');try{const r=await post<{message:string}>({action:'publish',courseId,week,questions});setMessage(r.message);onSaved();}catch(e){setError((e as Error).message);}finally{setBusy(false);}}
  return <section className={styles.publisher}><h2>Publish a questionnaire</h2><p>Publish a general set and a course set before students complete their competency checks. Existing published questions stay with their reporting week. Schedule revisions for a future Monday.</p>
    {!allowed?<Message>A Super Admin must grant you question-authoring access for a course where you have an assigned class.</Message>:<>
      <div className={styles.toolbar}><label>Question set<select value={courseId} onChange={e=>{setCourseId(e.target.value);setQuestions([]);setMessage('');}}>{user.role==='SUPER_ADMIN'&&<option value="">General · all courses</option>}{view.courses.filter(c=>view.authorableCourses.includes(c.id)).map(c=><option key={c.id} value={c.id}>{c.name}</option>)}</select></label><label>Effective Monday<input type="date" min={currentWeek()} value={week} onChange={e=>setWeek(e.target.value)}/></label><button className={styles.quiet} disabled={!view.questionSets.some(s=>s.courseId===courseId)} onClick={()=>{const latest=view.questionSets.find(s=>s.courseId===courseId);if(latest)setQuestions(latest.questions);}}>Copy latest set</button></div>
      {questions.map((q,i)=><fieldset className={styles.questionEditor} key={q.id}><legend>Question {i+1}</legend><label className={styles.field}>Question wording<textarea value={q.text} maxLength={500} onChange={e=>update(i,{text:e.target.value})}/></label><div className={styles.toolbar}><label>Competency topic<input value={q.competency} maxLength={100} onChange={e=>update(i,{competency:e.target.value})}/></label><label>Answer format<select value={q.kind} onChange={e=>update(i,{kind:e.target.value as WeeklyQuestion['kind']})}><option value="RATING">1–5 rating</option><option value="CHOICE">Prefilled answers mapped to 1–5</option></select></label></div><div className={styles.labelEditor}>{q.labels.map((label,n)=><label key={n}>Score {n+1}<input value={label} maxLength={160} onChange={e=>update(i,{labels:q.labels.map((old,j)=>j===n?e.target.value:old)})}/></label>)}</div><button className={styles.quiet} onClick={()=>setQuestions(qs=>qs.filter((_,n)=>n!==i))}><Trash2 size={15}/>Remove question</button></fieldset>)}
      {error&&<Message error>{error}</Message>}{message&&<Message>{message}</Message>}<div className={styles.actions}><button className={styles.secondary} disabled={questions.length>=30||busy} onClick={()=>setQuestions(qs=>[...qs,blankQuestion()])}><Plus size={16}/>Add question</button><button className={styles.primary} disabled={busy||!questions.length} onClick={publish}>{busy?'Publishing…':'Publish question set'}</button></div>
    </>}
    <h3>Published versions</h3><ul className={styles.setList}>{view.questionSets.filter(s=>user.role==='SUPER_ADMIN'||view.authorableCourses.includes(s.courseId)||s.courseId==='').map(s=><li key={s.id}><strong>{s.courseId?view.courses.find(c=>c.id===s.courseId)?.name||'Course set':'General · all courses'}</strong><span>From {dateLabel(s.effectiveWeek)} · {s.questions.length} questions</span></li>)}</ul>{!view.questionSets.length&&<p>No question sets published yet.</p>}
  </section>;
}

function AuthorGrants({view,onSaved}:{view:WeeklyView;onSaved:()=>void}){
  const [courseId,setCourseId]=useState(view.courses[0]?.id||''),[coordinatorId,setCoordinatorId]=useState(view.coordinators[0]?.id||''),[busy,setBusy]=useState(false),[error,setError]=useState('');
  async function grant(active:boolean,c=courseId,u=coordinatorId){setBusy(true);setError('');try{await post({action:'grant',courseId:c,coordinatorId:u,active});onSaved();}catch(e){setError((e as Error).message);}finally{setBusy(false);}}
  return <section className={styles.publisher}><h2>Course question authors</h2><p>Grant access to a coordinator with an assigned class in the selected course.</p><div className={styles.toolbar}><label>Course<select value={courseId} onChange={e=>setCourseId(e.target.value)}>{view.courses.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}</select></label><label>Coordinator<select value={coordinatorId} onChange={e=>setCoordinatorId(e.target.value)}>{view.coordinators.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}</select></label><button className={styles.secondary} disabled={busy||!courseId||!coordinatorId} onClick={()=>grant(true)}>Grant access</button></div>{error&&<Message error>{error}</Message>}<ul className={styles.setList}>{view.grants.filter(g=>g.active===1).map(g=><li key={g.courseId+g.coordinatorId}><span>{view.courses.find(c=>c.id===g.courseId)?.name} · {view.coordinators.find(c=>c.id===g.coordinatorId)?.name}</span><button className={styles.quiet} disabled={busy} onClick={()=>grant(false,g.courseId,g.coordinatorId)}>Revoke access</button></li>)}</ul></section>;
}
