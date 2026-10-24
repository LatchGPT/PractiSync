'use client';

import { useEffect, useState, type FormEvent } from 'react';
import { LogOut, LoaderCircle, AlertCircle, ArrowRight, FilePenLine, RefreshCw } from 'lucide-react';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { RtuSeal } from '@/components/rtu-seal';
import { authSubmit } from './login-client';
import { studentDetailsInput, type StudentVerificationContext } from '@/packages/validation/student-verification';

type Details = { studentNumber: string; legalName: string; classCode: string; yearLevel: string };
type ClassMatch = { courseCode: string; courseName: string; section: string; coordinatorName: string };
const valuesFor = (context: StudentVerificationContext): Details => ({ studentNumber: String(context.request.studentNumber ?? ''), legalName: String(context.request.legalName || context.name), classCode: '', yearLevel: String(context.request.yearLevel ?? '') });

export default function StudentVerificationGate({ initial }: { initial: StudentVerificationContext }) {
 const [context, setContext] = useState(initial);
 const [values, setValues] = useState<Details>(() => valuesFor(initial));
 const [classMatch, setClassMatch] = useState<ClassMatch | null>(null);
 const [checkedCode, setCheckedCode] = useState('');
 const [errors, setErrors] = useState<Partial<Record<keyof Details, string>>>({});
 const [error, setError] = useState('');
 const [busy, setBusy] = useState(false);
 const [checkingCode, setCheckingCode] = useState(false);
 const [retrying, setRetrying] = useState(false);
 const [signingOut, setSigningOut] = useState(false);
 const unavailable = context.request.status === 'UNAVAILABLE';
 const forbidden = context.request.status === 'FORBIDDEN';
 const statusScreen = unavailable || forbidden;

 async function retry() {
  setRetrying(true); setError('');
  try {
   const response = await fetch('/api/student-verification', { cache: 'no-store' });
   if (response.status === 401) { location.replace('/login'); return; }
   if (response.status === 403) { setContext(current => ({ ...current, request: { ...current.request, status: 'FORBIDDEN' } })); return; }
   if (!response.ok) throw new Error('We couldn’t load your registration. Check your connection and try again.');
   const next = await response.json() as StudentVerificationContext;
   if (next.request.status === 'APPROVED') { location.replace('/dashboard/student'); return; }
   setContext(next); setValues(valuesFor(next));
  } catch (cause) { setError(cause instanceof Error ? cause.message : 'We couldn’t load your registration. Try again.'); }
  finally { setRetrying(false); }
 }

 useEffect(() => {
  if (context.request.status === 'APPROVED') location.replace('/dashboard/student');
 }, [context.request.status]);

 function validate(next: Details, field?: keyof Details) {
  const result = studentDetailsInput.safeParse({ ...next, version: Number(context.request.version) });
  const nextErrors: Partial<Record<keyof Details, string>> = {};
  if (!result.success) for (const issue of result.error.issues) {
   const key = issue.path[0] as keyof Details;
   if (!nextErrors[key]) nextErrors[key] = issue.message;
  }
  if (field) setErrors(current => ({ ...current, [field]: nextErrors[field] }));
  else {
   setErrors(nextErrors);
   const first = (['legalName', 'studentNumber', 'yearLevel', 'classCode'] as const).find(key => nextErrors[key]);
   if (first) requestAnimationFrame(() => document.getElementById('student-' + first)?.focus());
  }
  return result.success;
 }

 function change(field: keyof Details, value: string) {
  const next = { ...values, [field]: value };
  setValues(next);
  if (field === 'classCode') { setClassMatch(null); setCheckedCode(''); }
  if (errors[field]) validate(next, field);
 }

 async function checkClassCode() {
  const classCode = values.classCode.trim().toUpperCase();
  if (busy || checkingCode || signingOut) return;
  if (!classCode) { setErrors(current => ({ ...current, classCode: 'Enter the class code from your coordinator.' })); return; }
  setCheckingCode(true); setError('');
  try {
   const response = await fetch('/api/student-verification/class-code', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ classCode }) });
   const result = await response.json() as { class?: ClassMatch; error?: string };
   if (!response.ok || !result.class) throw new Error(result.error ?? 'We couldn’t check that class code. Try again.');
   setClassMatch(result.class); setCheckedCode(classCode); setErrors(current => ({ ...current, classCode: undefined }));
  } catch (cause) {
   setClassMatch(null); setCheckedCode('');
   setErrors(current => ({ ...current, classCode: cause instanceof Error ? cause.message : 'We couldn’t check that class code. Try again.' }));
  } finally { setCheckingCode(false); }
 }

 async function submit(event: FormEvent) {
  event.preventDefault();
  if (busy || checkingCode || !validate(values)) return;
  if (!classMatch || checkedCode !== values.classCode.trim().toUpperCase()) {
   setErrors(current => ({ ...current, classCode: 'Check the class code to confirm your course and section.' }));
   document.getElementById('student-classCode')?.focus(); return;
  }
  setBusy(true); setError('');
  try {
   const response = await fetch('/api/student-verification', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...values, version: Number(context.request.version) }) });
   const result = await response.json() as { error?: string; fieldErrors?: Record<string, string[]> };
   if (!response.ok) {
    if (result.fieldErrors) {
     setErrors(Object.fromEntries(Object.entries(result.fieldErrors).map(([key, messages]) => [key, messages[0]])));
     const first = Object.keys(result.fieldErrors)[0];
     if (first) requestAnimationFrame(() => document.getElementById('student-' + first)?.focus());
    }
    throw new Error(result.error ?? 'Your registration could not be saved. Your input is preserved; please try again.');
   }
   location.replace('/dashboard/student');
  } catch (cause) {
   setError(cause instanceof Error ? cause.message : 'Your registration could not be saved. Your input is preserved; please try again.');
   setBusy(false);
  }
 }

 async function logOut() {
  setSigningOut(true); setError('');
  try { await authSubmit('signout', {}, '/'); location.replace('/login'); }
  catch { setError('Log out could not be completed. Check your connection and try again.'); setSigningOut(false); }
 }

 const fieldProps = (name: keyof Details) => ({ id: 'student-' + name, name, value: values[name], disabled: busy || signingOut, onChange: (event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => change(name, event.target.value), onBlur: () => validate(values, name), 'aria-invalid': Boolean(errors[name]), 'aria-describedby': errors[name] ? 'student-' + name + '-error' : undefined });
 const fieldError = (name: keyof Details) => errors[name] ? <p className="verification-field-error" id={'student-' + name + '-error'}>{errors[name]}</p> : null;

 return <main className="verification-canvas">
  <div className="verification-brand"><RtuSeal size={32}/><span>RTU PractiSync<span className="verification-brand-dot">.</span></span></div>
  <Dialog open onOpenChange={() => {}}>
   <DialogContent aria-describedby={(forbidden || unavailable) ? 'student-verification-description' : undefined} showCloseButton={false} className={'verification-dialog ' + (statusScreen ? 'verification-dialog-status' : 'verification-dialog-form')} onEscapeKeyDown={event => event.preventDefault()} onPointerDownOutside={event => event.preventDefault()} onInteractOutside={event => event.preventDefault()}>
    <div className="verification-symbol">{statusScreen ? <AlertCircle size={26}/> : <FilePenLine size={26}/>}</div>
    <div className="verification-heading">
     <DialogTitle>{forbidden ? 'RTU student account required' : unavailable ? 'Registration is unavailable' : 'Let’s set up your student account'}</DialogTitle>
     {(forbidden || unavailable) && <DialogDescription id="student-verification-description">{forbidden ? 'Sign in with an @rtu.edu.ph account. Outside-domain accounts must be authorized by the university office during manual account setup.' : 'We couldn’t load your registration right now. Check your connection and try again.'}</DialogDescription>}
    </div>
    {context.demo && <p className="verification-demo"><span/>Fictional demo · no Google account is connected</p>}
    {error && <div className="verification-error" role="alert"><AlertCircle size={17}/><span>{error}</span></div>}
    {forbidden ? <button type="button" className="primary verification-only-action" onClick={() => void logOut()} disabled={signingOut}><LogOut size={16}/>{signingOut ? 'Logging out…' : 'Log out'}</button> : unavailable ? <div className="verification-form-footer">
     <button type="button" className="verification-logout" onClick={() => void logOut()} disabled={signingOut || retrying}><LogOut size={16}/>{signingOut ? 'Logging out…' : 'Log out'}</button>
     <button type="button" className="primary" onClick={() => void retry()} disabled={retrying || signingOut}>{retrying ? <LoaderCircle size={16} className="spin"/> : <RefreshCw size={16}/>} {retrying ? 'Loading registration…' : 'Try again'}</button>
    </div> : <form className="verification-form" onSubmit={submit} noValidate aria-busy={busy}>
     <div className="verification-field"><label htmlFor="student-legalName">Full legal name</label><input {...fieldProps('legalName')} autoComplete="name" maxLength={120} required/>{fieldError('legalName')}</div>
     <div className="verification-field"><label htmlFor="student-email">Sign-in email</label><input id="student-email" type="email" value={context.email} readOnly/></div>
     <div className="verification-field-pair">
      <div className="verification-field"><label htmlFor="student-studentNumber">Student number</label><input {...fieldProps('studentNumber')} maxLength={40} autoCapitalize="characters" spellCheck={false} required placeholder="Student number"/>{fieldError('studentNumber')}</div>
      <div className="verification-field"><label htmlFor="student-yearLevel">Year level</label><select {...fieldProps('yearLevel')} required><option value="">Choose</option>{[1,2,3,4,5,6].map(year => <option key={year} value={year}>Year {year}</option>)}</select>{fieldError('yearLevel')}</div>
     </div>
     <div className="verification-field">
      <label htmlFor="student-classCode">Class code</label>
      <div className="verification-code-row"><input {...fieldProps('classCode')} disabled={busy || checkingCode || signingOut} autoCapitalize="characters" spellCheck={false} maxLength={16} placeholder="Enter your class code"/><button type="button" className="secondary" onClick={() => void checkClassCode()} disabled={busy || checkingCode || signingOut}>{checkingCode && <LoaderCircle size={15} className="spin"/>}{checkingCode ? 'Checking…' : 'Check code'}</button></div>
      {fieldError('classCode')}
      {classMatch && <div className="verification-class-match" role="status" aria-live="polite"><div><span>Course / program</span><strong>{classMatch.courseCode} · {classMatch.courseName}</strong></div><div><span>Practicum section</span><strong>{classMatch.section}</strong></div><div><span>Class coordinator</span><strong>{classMatch.coordinatorName}</strong></div></div>}
     </div>
     <div className="verification-form-footer"><button type="button" className="verification-logout" onClick={() => void logOut()} disabled={signingOut || busy || checkingCode}><LogOut size={16}/>{signingOut ? 'Logging out…' : 'Log out'}</button><button className="primary" disabled={busy || signingOut || checkingCode}>{busy ? <LoaderCircle size={16} className="spin"/> : <ArrowRight size={16}/>} {busy ? 'Opening your workspace…' : 'Complete registration'}</button></div>
    </form>}
   </DialogContent>
  </Dialog>
 </main>;
}
