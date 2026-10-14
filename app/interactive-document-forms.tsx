'use client';

import { useState, type FormEvent } from 'react';
import { Download, FileCheck2, FilePenLine, FileText, LoaderCircle, LockKeyhole, Printer, Send, ShieldCheck } from 'lucide-react';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { documentFormCatalog, documentFormTypes, type DocumentFormAnswer, type DocumentFormField, type DocumentFormType } from '@/packages/validation/document-forms';
import type { Row, Snapshot } from '@/packages/validation/contracts';
import CustomDocumentTemplates from './custom-document-templates';

const number = (row: Row | undefined, key: string) => Number(row?.[key] ?? 0);
const text = (row: Row | undefined, key: string) => String(row?.[key] ?? '');
const emptyResponses: Row[] = [];

function readAnswers(row: Row | undefined): Record<string, DocumentFormAnswer> {
  try {
    const value = JSON.parse(text(row, 'responseJson')) as unknown;
    return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, DocumentFormAnswer> : {};
  } catch {
    return {};
  }
}

function statusLabel(status: string) {
  return ({ DRAFT: 'Draft', SUBMITTED: 'Awaiting review', APPROVED: 'Approved', REVISION_REQUESTED: 'Changes requested' } as Record<string, string>)[status] ?? 'Not started';
}

function statusClass(status: string) {
  return status === 'APPROVED' ? 'green' : status === 'REVISION_REQUESTED' ? 'red' : status === 'SUBMITTED' ? 'blue' : 'orange';
}

function answerText(value: DocumentFormAnswer | undefined, kind?: DocumentFormField['kind']) {
  if (typeof value === 'boolean') return value ? 'Acknowledged' : 'Not acknowledged';
  if (typeof value === 'number') return kind === 'rating' ? `${value} / 5` : String(value);
  if (kind === 'date' && value && /^\d{4}-\d{2}-\d{2}$/.test(value)) return new Intl.DateTimeFormat('en-PH', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' }).format(new Date(`${value}T00:00:00Z`));
  return value?.trim() || '—';
}

function periodText(start: string, end: string) {
  if (!start || !end) return '';
  const format = (value: string) => new Intl.DateTimeFormat('en-PH', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' }).format(new Date(`${value}T00:00:00Z`));
  return `${format(start)} to ${format(end)}`;
}

function placementDetails(data: Snapshot, placement: Row | undefined) {
  return [
    ['Student', text(placement, 'studentName') || data.user.name],
    ['University email', text(placement, 'studentEmail') || data.user.email],
    ['Program', text(placement, 'courseCode') || 'Not recorded'],
    ['Section', text(placement, 'section') || 'Not recorded'],
    ['Training host', text(placement, 'companyName') || 'Not recorded'],
    ['Training dates', [text(placement, 'startsAt'), text(placement, 'endsAt')].filter(Boolean).join(' to ') || 'Not recorded'],
  ];
}

async function downloadFormPdf(type: DocumentFormType, answers: Record<string, DocumentFormAnswer>, data: Snapshot, placement: Row | undefined, version: number) {
  const { pdf, Document, Page, Text, View, StyleSheet } = await import('@react-pdf/renderer');
  const title = documentFormCatalog[type].title;
  const styles = StyleSheet.create({
    page: { padding: 42, fontFamily: 'Helvetica', fontSize: 10, color: '#17375e' },
    accent: { height: 5, backgroundColor: '#d7aa3e', marginBottom: 22 },
    title: { fontSize: 22, fontWeight: 700, marginBottom: 6 },
    subtitle: { color: '#637c99', fontSize: 9, marginBottom: 18 },
    section: { fontSize: 12, fontWeight: 700, marginTop: 14, marginBottom: 8 },
    row: { paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#dbe5f2' },
    label: { fontSize: 8, color: '#617895', marginBottom: 3 },
    value: { lineHeight: 1.45 },
    text: { lineHeight: 1.5, marginBottom: 5 },
    footer: { fontSize: 8, color: '#637c99', marginTop: 18 },
    notice: { marginTop: 22, padding: 10, backgroundColor: '#fff8e7', color: '#76540e', lineHeight: 1.4 },
  });
  if (type === 'COE_RECOMMENDATION') {
    const pronoun = String(answers.studentPronoun ?? 'they');
    const possessive = pronoun === 'he' ? 'his' : pronoun === 'she' ? 'her' : 'their';
    const student = String(answers.studentName ?? '________________');
    const recipient = String(answers.recipientName ?? '________________');
    const course = String(answers.course ?? '________________');
    const major = String(answers.major ?? '________________');
    const schoolYear = String(answers.studyYear ?? '________');
    const hours = String(answers.requiredHours ?? '_____');
    const letter = <Document title="RTU CoE Recommendation Letter"><Page size="A4" style={styles.page}>
      <View style={styles.accent}/><Text style={{fontSize: 9, textAlign: 'center'}}>Republic of the Philippines</Text><Text style={{fontSize: 16, fontWeight: 700, textAlign: 'center', marginTop: 4}}>RIZAL TECHNOLOGICAL UNIVERSITY</Text><Text style={{fontSize: 10, textAlign: 'center', marginTop: 3}}>COOPERATIVE EDUCATION OFFICE (CoE)</Text><Text style={{fontSize: 9, textAlign: 'center', marginTop: 3}}>Mandaluyong City</Text>
      <Text style={{fontSize: 9, textAlign: 'right', marginTop: 23}}>{String(answers.letterDate ?? '')}</Text>
      <Text style={{fontSize: 10, lineHeight: 1.5, marginTop: 12}}>{recipient}{answers.recipientPosition ? `, ${answers.recipientPosition}` : ''}{answers.recipientCompany ? `, ${answers.recipientCompany}` : ''}{answers.recipientAddress ? `\n${answers.recipientAddress}` : ''}</Text>
      <Text style={{fontSize: 10, marginTop: 22}}>Dear {recipient},</Text>
      <Text style={{fontSize: 10, lineHeight: 1.7, marginTop: 13}}>This is to introduce to you, {student}, now on {possessive} {schoolYear}, {course} Major in {major}, who is qualified to undertake {hours} hours of Cooperative Education (COE) Training in industry/office to complete the needed requirements for the program.</Text>
      <Text style={{fontSize: 10, lineHeight: 1.7, marginTop: 13}}>In this regard, may we request your office to allow {student} to undergo Cooperative Education Training (COE) in your prestigious office{answers.trainingCompany ? `, ${answers.trainingCompany}` : ''}{answers.trainingPeriod ? `, during ${answers.trainingPeriod}` : ''}. Upon approval, our Cooperative Education Coordinator may discuss the objectives, nature, and mechanics of the program at any time most convenient to you.</Text>
      <Text style={{fontSize: 10, marginTop: 25}}>Very truly yours,</Text><View style={{height: 46}}/><Text style={{fontSize: 10, fontWeight: 700}}>ENGR. ARMANDO P. MATIAS</Text><Text style={{fontSize: 9}}>Director</Text>
      <Text style={{fontSize: 8, lineHeight: 1.45, marginTop: 20}}>Note: Please do not honor any documents pertaining to CoEO Program of Trainees without the official seal of the Office.</Text><Text style={styles.footer}>RTU-OVPASA-CoEO-003 - Tel. no. 8534-8267 / Local 1234 - E-mail: cec@rtu.edu.ph</Text>
      <Text style={styles.notice}>Draft generated from the supplied template. Obtain the official office seal and authorization before using as an official letter.</Text>
    </Page></Document>;
    const blob = await pdf(letter).toBlob();
    const url = URL.createObjectURL(blob);
    const link = window.document.createElement('a');
    link.href = url;
    link.download = 'RTU-CoE-Recommendation-Letter-draft.pdf';
    link.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 30_000);
    return;
  }
  if (type === 'COE_PLACEMENT_DATA') {
    const placementPdf = <Document title="RTU COE Student Placement Data"><Page size="A4" style={styles.page}>
      <View style={styles.accent}/><Text style={{fontSize: 8, textAlign: 'right'}}>RTU-OVPASA-CoEO-0004 · Control no. ______________</Text><Text style={{fontSize: 16, fontWeight: 700, textAlign: 'center', marginTop: 8}}>RIZAL TECHNOLOGICAL UNIVERSITY</Text><Text style={{fontSize: 10, textAlign: 'center', marginTop: 3}}>COOPERATIVE EDUCATION OFFICE (CoE) · Mandaluyong City</Text><Text style={{fontSize: 14, fontWeight: 700, textAlign: 'center', marginTop: 18, marginBottom: 8}}>COE STUDENT PLACEMENT DATA</Text>
      <Text style={styles.subtitle}>{String(answers.academicTerm ?? '')} · Academic year {String(answers.academicYear ?? '')} · Student No. {String(answers.studentNumber ?? '')}</Text>
      <Text style={styles.section}>Student and training placement</Text>
      {documentFormCatalog[type].fields.map(field => <View key={field.key} style={styles.row}><Text style={styles.label}>{field.label}</Text><Text style={styles.value}>{answerText(answers[field.key], field.kind)}</Text></View>)}
      <View style={{flexDirection: 'row', marginTop: 30}}><View style={{flex: 1, borderTopWidth: 1, borderTopColor: '#789', paddingTop: 5, marginRight: 12}}><Text style={styles.label}>Student signature</Text></View><View style={{flex: 1, borderTopWidth: 1, borderTopColor: '#789', paddingTop: 5, marginLeft: 12}}><Text style={styles.label}>Coordinator signature</Text></View></View>
      <Text style={styles.text}>For COE 2 students, indicate COE 1 training station / company grade.</Text><Text style={styles.section}>For coordinators - purpose only</Text><Text style={styles.text}>Sketch location of the training station / company vicinity map indicating landmarks:</Text><View style={{height: 76, borderWidth: 1, borderColor: '#aab7c8', marginBottom: 8}}/><Text style={styles.text}>Checklist: [ ] Cert. of Orientation (COE 1)  [ ] Health Record  [ ] Parent Consent  [ ] ID Picture / Bus. Card  [ ] Activity Report  [ ] Time Card  [ ] Supervisor's Evaluation  [ ] Cert. of Training  [ ] Project (Optional)</Text><Text style={styles.text}>Consultation remarks: _________________________________________________________________</Text><Text style={styles.text}>Schedule of classes: Subjects __________________ Days __________ Time __________ Room __________</Text>
      <Text style={styles.notice}>Draft generated from the supplied form. Coordinator sections, signatures, and official decisions are left blank.</Text><Text style={styles.footer}>Tel. no. 8534-8267 / Local 1234 · E-mail: cec@rtu.edu.ph · Revision effectivity: August 1, 2024</Text>
    </Page></Document>;
    const blob = await pdf(placementPdf).toBlob();
    const url = URL.createObjectURL(blob);
    const link = window.document.createElement('a');
    link.href = url;
    link.download = 'RTU-CoE-Student-Placement-Data-draft.pdf';
    link.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 30_000);
    return;
  }
  const file = (
    <Document title={`PractiSync - ${title}`}>
      <Page size="A4" style={styles.page}>
        <View style={styles.accent} />
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.subtitle}>PractiSync · Version {version || 1} · {text(placement, 'period') || 'Fictional academic period'}</Text>
        <Text style={styles.section}>Placement details</Text>
        {placementDetails(data, placement).map(([label, value]) => <View key={label} style={styles.row}><Text style={styles.label}>{label}</Text><Text style={styles.value}>{value}</Text></View>)}
        <Text style={styles.section}>Form responses</Text>
        {documentFormCatalog[type].fields.map(field => <View key={field.key} style={styles.row}><Text style={styles.label}>{field.label}</Text><Text style={styles.value}>{answerText(answers[field.key], field.kind)}</Text></View>)}
        <Text style={styles.notice}>Fictional demonstration document. This sample is not an official university clearance, legal agreement, consent, or academic certification. No signature or approval is generated.</Text>
      </Page>
    </Document>
  );
  const blob = await pdf(file).toBlob();
  const url = URL.createObjectURL(blob);
  const link = window.document.createElement('a');
  link.href = url;
  link.download = `PractiSync-${type.toLowerCase().replaceAll('_', '-')}-demo.pdf`;
  link.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 30_000);
}

function FormField({ field, value, disabled, onChange }: { field: DocumentFormField; value: DocumentFormAnswer | undefined; disabled?: boolean; onChange: (value: DocumentFormAnswer) => void }) {
  const required = !disabled && field.required !== false;
  if (field.kind === 'checkbox') return <label className="interactive-form-checkbox"><input type="checkbox" checked={value === true} disabled={disabled} required={required} onChange={event => onChange(event.target.checked)} /><span>{field.label}</span></label>;
  if (field.kind === 'rating' || field.kind === 'select') return <label className="interactive-form-field">{field.label}<select required={required} disabled={disabled} value={String(value ?? '')} onChange={event => onChange(field.kind === 'rating' ? Number(event.target.value) : event.target.value)}><option value="" disabled>{field.kind === 'rating' ? 'Choose a rating' : 'Choose an option'}</option>{field.kind === 'rating' ? [1, 2, 3, 4, 5].map(score => <option value={score} key={score}>{score} / 5</option>) : field.options?.map(option => <option value={option.value} key={option.value}>{option.label}</option>)}</select>{field.hint && <small>{field.hint}</small>}{field.kind === 'rating' && <small>1 = lowest, 5 = highest</small>}</label>;
  if (field.kind === 'textarea') return <label className="interactive-form-field">{field.label}<textarea required={required} disabled={disabled} maxLength={field.maxLength ?? 2000} value={String(value ?? '')} onChange={event => onChange(event.target.value)} />{field.hint && <small>{field.hint}</small>}</label>;
  return <label className="interactive-form-field">{field.label}<input required={required} disabled={disabled} type={field.kind === 'tel' || field.kind === 'email' || field.kind === 'date' || field.kind === 'number' ? field.kind : 'text'} min={field.kind === 'number' ? 1 : undefined} max={field.kind === 'number' ? 10000 : undefined} maxLength={field.kind === 'number' || field.kind === 'date' ? undefined : field.maxLength ?? 240} value={String(value ?? '')} onChange={event => onChange(field.kind === 'number' && event.target.value ? Number(event.target.value) : event.target.value)} />{field.hint && <small>{field.hint}</small>}</label>;
}

function DocumentPreview({ type, fields, answers, data, placement }: { type: DocumentFormType; fields: DocumentFormField[]; answers: Record<string, DocumentFormAnswer>; data: Snapshot; placement: Row | undefined }) {
  return <aside className="interactive-paper-preview" aria-label="Live document preview" aria-live="polite">
    <div className="interactive-paper-sheet">
      <div className="interactive-paper-brand"><span>PS</span><strong>PractiSync</strong><small>TRAINING RECORD · SAMPLE</small></div>
      <p className="interactive-paper-eyebrow">{documentFormCatalog[type].group === 'CLEARANCE' ? 'CLEARANCE PAPER' : 'OJT PAPER'}</p>
      <h3>{documentFormCatalog[type].title}</h3>
      <p className="interactive-paper-copy">{documentFormCatalog[type].description}</p>
      <div className="interactive-paper-section"><strong>Placement details</strong>{placementDetails(data, placement).map(([label, value]) => <div className="interactive-paper-row" key={label}><span>{label}</span><b>{value}</b></div>)}</div>
      <div className="interactive-paper-section"><strong>Form responses</strong>{fields.map(field => <div className="interactive-paper-answer" key={field.key}><span>{field.label}</span><p className={answers[field.key] === undefined || answers[field.key] === '' ? 'is-empty' : ''}>{answerText(answers[field.key], field.kind)}</p></div>)}</div>
      <div className="interactive-paper-stamp">SAMPLE PREVIEW · NOT AN OFFICIAL UNIVERSITY DOCUMENT</div>
      <p className="interactive-paper-footnote">This preview updates as you type. It does not create a signature, legal consent, or an official clearance decision.</p>
    </div>
  </aside>;
}

function CoEDocumentPreview({ type, fields, answers, data, placement }: { type: DocumentFormType; fields: DocumentFormField[]; answers: Record<string, DocumentFormAnswer>; data: Snapshot; placement: Row | undefined }) {
  if (type !== 'COE_PLACEMENT_DATA' && type !== 'COE_RECOMMENDATION') return <DocumentPreview type={type} fields={fields} answers={answers} data={data} placement={placement} />;
  const value = (key: string) => String(answers[key] ?? '________________');
  const pronoun = value('studentPronoun');
  const possessive = pronoun === 'he' ? 'his' : pronoun === 'she' ? 'her' : 'their';
  if (type === 'COE_RECOMMENDATION') return <aside className="interactive-paper-preview" aria-label="Live recommendation letter preview"><article className="interactive-paper-sheet coe-recommendation-paper">
    <header className="coe-letterhead"><strong>REPUBLIC OF THE PHILIPPINES</strong><b>RIZAL TECHNOLOGICAL UNIVERSITY</b><span>COOPERATIVE EDUCATION OFFICE (CoE)</span><small>Mandaluyong City</small></header>
    <p className="coe-letter-reference">RTU-OVPASA-CoEO-003</p><p className="coe-letter-date">{value('letterDate')}</p>
    <address className="coe-recipient">{value('recipientName')}<br />{value('recipientPosition')}<br />{value('recipientCompany')}<br />{value('recipientAddress')}</address>
    <p>Dear {value('recipientName')},</p>
    <p>This is to introduce to you, <b>{value('studentName')}</b>, now on {possessive} {value('studyYear')}, {value('course')} Major in {value('major')}, who is qualified to undertake <b>{value('requiredHours')}</b> hours of Cooperative Education (COE) Training in industry/office to complete the needed requirements for the program.</p>
    <p>In this regard, may we request your office to allow <b>{value('studentName')}</b> to undergo Cooperative Education Training (COE) in your prestigious office{answers.trainingCompany ? `, ${answers.trainingCompany}` : ''}{answers.trainingPeriod ? `, during ${answers.trainingPeriod}` : ''}. Upon approval, our Cooperative Education Coordinator may discuss the objectives, nature, and mechanics of the program at any time most convenient to you.</p>
    <p>Very truly yours,</p><div className="coe-letter-signature"/><b>ENGR. ARMANDO P. MATIAS</b><span>Director</span>
    <p className="coe-letter-notice">Note: Please do not honor any documents pertaining to CoEO Program of Trainees without the official seal of the Office.</p>
    <p className="coe-letter-contact">Tel. no. 8534-8267 / Local 1234 - E-mail: cec@rtu.edu.ph - Revised August 1, 2024</p>
    <div className="interactive-paper-stamp">DRAFT PREVIEW - OFFICIAL SEAL AND SIGNATURE REQUIRED</div>
  </article></aside>;
  return <aside className="interactive-paper-preview" aria-label="Live placement data form preview"><article className="interactive-paper-sheet coe-placement-paper">
    <header className="coe-placement-heading"><span>RTU-OVPASA-CoEO-0004</span><b>RIZAL TECHNOLOGICAL UNIVERSITY</b><strong>COOPERATIVE EDUCATION OFFICE (CoE)</strong><h3>COE STUDENT PLACEMENT DATA</h3></header>
    <div className="coe-placement-meta"><span>Control no. ____________________</span><span>Student No. {value('studentNumber')}</span><span>{value('academicTerm')} · {value('academicYear')}</span></div>
    <div className="coe-placement-fields">{fields.map(field => <div className="coe-placement-field" key={field.key}><span>{field.label}</span><b>{answerText(answers[field.key], field.kind)}</b></div>)}</div>
    <div className="interactive-paper-signatures"><span>Student signature</span><span>Coordinator signature</span></div>
    <p className="interactive-paper-copy">For COE 2 students, indicate COE 1 training station / company grade.</p>
    <section className="interactive-paper-coordinator"><strong>FOR COORDINATORS - PURPOSE ONLY</strong><p>Sketch location of the training station / company vicinity map indicating landmarks.</p><div className="interactive-paper-map"/><b>Checklist of requirements</b><p>☐ Cert. of Orientation (COE 1)　 ☐ Health Record　 ☐ Parent Consent　 ☐ ID Picture / Bus. Card　 ☐ Activity Report　 ☐ Time Card　 ☐ Supervisor's Evaluation　 ☐ Cert. of Training　 ☐ Project (Optional)</p><p>Consultation remarks: _________________________________</p><p>Schedule of classes: Subjects / Days / Time / Room</p></section>
    <div className="interactive-paper-stamp">DRAFT PREVIEW - COORDINATOR SECTIONS AND SIGNATURES LEFT BLANK</div>
  </article></aside>;
}

export default function InteractiveDocumentForms({ data, onRefresh }: { data: Snapshot; onRefresh: () => Promise<void> }) {
  const [activeType, setActiveType] = useState<DocumentFormType | null>(null);
  const [answers, setAnswers] = useState<Record<string, DocumentFormAnswer>>({});
  const [readOnly, setReadOnly] = useState(false);
  const [busy, setBusy] = useState(false);
  const [reviewNotes, setReviewNotes] = useState<Record<string, string>>({});
  const placement = data.placements.find(item => item.studentId === data.user.id);
  const responses = data.completionResponses ?? emptyResponses;
  const ownResponses = responses.filter(item => item.placementId === placement?.id);
  const reportedMinutes = placement ? data.entries.filter(entry => entry.placementId === placement.id).reduce((sum, entry) => sum + number(entry, 'minutes'), 0) : 0;
  const targetMinutes = number(placement, 'requiredMinutes');
  const ojtUnlocked = targetMinutes > 0 && reportedMinutes >= targetMinutes;
  const isStudent = data.user.role === 'STUDENT';
  const isCoordinator = data.user.role === 'COORDINATOR';
  const customPlacementPdf=(data.customDocumentTemplates??[]).some(row=>text(row,'originalFilename').toLowerCase().includes('placement data')&&text(row,'fieldsJson')!=='[]');
  const customRecommendationPdf=(data.customDocumentTemplates??[]).some(row=>text(row,'originalFilename').toLowerCase().includes('recommendation form')&&text(row,'fieldsJson')!=='[]');
  const canReview = isCoordinator;
  const currentSubmission = activeType ? ownResponses.find(item => item.formType === activeType) : undefined;
  const activeDefinition = activeType ? documentFormCatalog[activeType] : undefined;
  const pendingReviews = responses.filter(item => item.status === 'SUBMITTED');

  function startForm(type: DocumentFormType) {
    const saved = ownResponses.find(item => item.formType === type);
    const status = text(saved, 'status');
    const studentName = text(placement, 'studentName') || data.user.name;
    const startDate = text(placement, 'startsAt').slice(0, 10);
    const endDate = text(placement, 'endsAt').slice(0, 10);
    const prefilled: Record<string, DocumentFormAnswer> = type === 'COE_PLACEMENT_DATA' ? {
      studentName,
      courseMajor: text(placement, 'courseCode'),
      companyName: text(placement, 'companyName'),
      trainingFrom: startDate,
      trainingTo: endDate,
    } : type === 'COE_RECOMMENDATION' ? {
      studentName,
      course: text(placement, 'courseCode'),
      trainingCompany: text(placement, 'companyName'),
      trainingPeriod: periodText(startDate, endDate),
      requiredHours: Math.ceil(number(placement, 'requiredMinutes') / 60),
    } : {};
    setAnswers(saved ? readAnswers(saved) : prefilled);
    setReadOnly(Boolean(saved && !['DRAFT', 'REVISION_REQUESTED'].includes(status)));
    setActiveType(type);
  }

  async function saveOrSubmit(mode: 'SAVE_DRAFT' | 'SUBMIT', event?: FormEvent<HTMLFormElement>) {
    event?.preventDefault();
    if (!activeType || !placement) return;
    setBusy(true);
    try {
      const response = await fetch('/api/action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'completionForm', values: { placementId: placement.id, formType: activeType, mode, answers, version: number(currentSubmission, 'version') } }),
      });
      const result = await response.json() as { error?: string; message?: string };
      if (!response.ok) throw new Error(result.error ?? 'The form could not be saved.');
      toast.success(result.message ?? 'Form saved.');
      setActiveType(null);
      await onRefresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'The form could not be saved.');
    } finally {
      setBusy(false);
    }
  }

  async function review(response: Row, decision: 'APPROVED' | 'REVISION_REQUESTED') {
    const note = reviewNotes[response.id] ?? '';
    if (decision === 'REVISION_REQUESTED' && !note.trim()) {
      toast.error('Add a note explaining the requested changes.');
      return;
    }
    setBusy(true);
    try {
      const result = await fetch('/api/action', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'completionFormReview', values: { responseId: response.id, decision, note } }) });
      const body = await result.json() as { error?: string; message?: string };
      if (!result.ok) throw new Error(body.error ?? 'The review could not be saved.');
      toast.success(body.message ?? 'Review saved.');
      await onRefresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'The review could not be saved.');
    } finally {
      setBusy(false);
    }
  }

  async function download(type: DocumentFormType, submission: Row, rowPlacement: Row | undefined) {
    setBusy(true);
    try {
      await downloadFormPdf(type, readAnswers(submission), data, rowPlacement, number(submission, 'formVersion'));
    } catch {
      toast.error('PDF generation failed.');
    } finally {
      setBusy(false);
    }
  }

  async function downloadCurrentForm() {
    if (!activeType) return;
    setBusy(true);
    try {
      await downloadFormPdf(activeType, answers, data, placement, number(currentSubmission, 'formVersion') || 1);
    } catch {
      toast.error('PDF generation failed.');
    } finally {
      setBusy(false);
    }
  }

  function printCurrentForm() {
    window.print();
  }

  if (isStudent) {
    if (!placement) return <section className="panel completion-forms-card"><div className="panel-body"><p className="muted">A placement is required before OJT forms can be filled.</p></div></section>;
    const groups = [
      { id: 'CLEARANCE', title: 'Clearance papers', note: 'The two RTU COE templates appear first, followed by the sample clearance forms.' },
      { id: 'OJT', title: 'End-of-OJT papers', note: 'These forms open after reported DTR reaches the placement target.' },
    ] as const;
    return <>
      <CustomDocumentTemplates data={data} onRefresh={onRefresh} />
      <section className="panel completion-forms-card interactive-document-forms">
        <header className="panel-head"><div><span className="chip blue">Interactive forms · demo</span><h2>Clearance and OJT papers</h2><p>Save drafts, submit forms for coordinator review, and download a PDF copy.</p></div><FilePenLine size={22} /></header>
        <div className="panel-body">
          <div className="interactive-form-notice"><ShieldCheck size={17} /><p>The supplied RTU templates request personal contact and placement details. This local demo stores form drafts and submissions for coordinator review; use fictional details here. Enable real student records only after RTU approves data access and retention. Printed drafts have no official seal, signature, or clearance approval.</p></div>
          {groups.map(group => <section className="interactive-form-group" key={group.id}>
            <div className="interactive-form-group-heading"><div><h3>{group.title}</h3><p>{group.note}</p></div>{group.id === 'OJT' && <span className={`chip ${ojtUnlocked ? 'green' : 'orange'}`}>{ojtUnlocked ? 'Available' : targetMinutes ? `${Math.floor(reportedMinutes / 60)} / ${Math.floor(targetMinutes / 60)} hrs` : 'Target not configured'}</span>}</div>
            <div className="interactive-form-grid">
              {documentFormTypes.filter(type => documentFormCatalog[type].group === group.id && !(type==='COE_PLACEMENT_DATA'&&customPlacementPdf) && !(type==='COE_RECOMMENDATION'&&customRecommendationPdf)).map(type => {
                const submission = ownResponses.find(item => item.formType === type);
                const status = text(submission, 'status');
                const canEdit = !submission || ['DRAFT', 'REVISION_REQUESTED'].includes(status);
                const locked = group.id === 'OJT' && !ojtUnlocked;
                return <article className="interactive-form-card" key={type}>
                  <div className="interactive-form-card-icon"><FileText size={18} /></div>
                  <div className="interactive-form-card-copy"><div className="interactive-form-card-title"><h4>{documentFormCatalog[type].title}</h4><span className={`chip ${statusClass(status)}`}>{statusLabel(status)}</span></div><p>{documentFormCatalog[type].description}</p>{text(submission, 'reviewNote') && <small className="interactive-form-review-note">Coordinator note: {text(submission, 'reviewNote')}</small>}</div>
                  <div className="interactive-form-card-actions">{!locked && <button type="button" className={canEdit ? 'primary' : 'secondary'} onClick={() => startForm(type)}>{canEdit ? status === 'REVISION_REQUESTED' ? 'Revise form' : status === 'DRAFT' ? 'Continue draft' : 'Fill in browser' : 'View form'}</button>}{(type==='COE_PLACEMENT_DATA'||type==='COE_RECOMMENDATION')&&<a className="textbutton" href={type==='COE_PLACEMENT_DATA'?'/document-templates/RTU-OVPASA-CoEO-0004-Placement-Data.pdf':'/document-templates/RTU-CoE-Recommendation-Form.pdf'} target="_blank" rel="noreferrer">Original PDF</a>}{submission && <button type="button" className="textbutton" disabled={busy} onClick={() => void download(type, submission, placement)}><Download size={14} />PDF copy</button>}{locked && <span className="small muted"><LockKeyhole size={13} />Complete the reported-hours target</span>}</div>
                </article>;
              })}
            </div>
          </section>)}
          <p className="interactive-form-scale">OJT rating scale: 1 = lowest, 5 = highest. Submitted answers are visible to authorized university coordinators.</p>
        </div>
      </section>
      <Dialog open={activeType !== null} onOpenChange={open => { if (!open && !busy) setActiveType(null); }}>
        <DialogContent className="interactive-form-dialog max-h-[90vh] overflow-y-auto sm:max-w-[1240px]">
          {activeDefinition && activeType && <>
            <DialogHeader><DialogTitle>{activeDefinition.title}</DialogTitle><DialogDescription>{activeDefinition.description}</DialogDescription></DialogHeader>
            {text(currentSubmission, 'reviewNote') && <div className="interactive-form-notice revision"><FileCheck2 size={16} /><p>Coordinator feedback: {text(currentSubmission, 'reviewNote')}</p></div>}
            <form className="interactive-form-workspace" onSubmit={event => void saveOrSubmit('SUBMIT', event)}>
              <div className="interactive-form-input-panel">
                <h3>Enter your details</h3>
                <div className="interactive-form-editor-grid">{activeDefinition.fields.map(field => <FormField key={field.key} field={field} value={answers[field.key]} disabled={readOnly} onChange={value => setAnswers(current => ({ ...current, [field.key]: value }))} />)}</div>
                <small className="interactive-form-demo-label">Fictional sample. Do not enter real medical or other sensitive details. This form does not collect a signature or issue an official clearance.</small>
                <div className="interactive-form-actions">
                  {!readOnly && <button type="button" className="secondary" disabled={busy} onClick={() => void saveOrSubmit('SAVE_DRAFT')}>{busy ? <LoaderCircle size={14} className="spin" /> : <FilePenLine size={14} />}Save draft</button>}
                  <button type="button" className="secondary" disabled={busy} onClick={printCurrentForm}><Printer size={14} />Print current form</button>
                  <button type="button" className="secondary" disabled={busy} onClick={() => void downloadCurrentForm()}><Download size={14} />Download PDF</button>
                  {!readOnly && <button type="submit" className="primary" disabled={busy}>{busy ? <LoaderCircle size={14} className="spin" /> : <Send size={14} />}Submit for review</button>}
                </div>
              </div>
              <CoEDocumentPreview type={activeType} fields={activeDefinition.fields} answers={answers} data={data} placement={placement} />
            </form>
          </>}
        </DialogContent>
      </Dialog>
    </>;
  }

  if (!isCoordinator && data.user.role !== 'SUPER_ADMIN') return null;
  const sortedResponses = [...responses].sort((a, b) => text(b, 'updatedAt').localeCompare(text(a, 'updatedAt')));
  return <>
    <CustomDocumentTemplates data={data} onRefresh={onRefresh} />
    <section className="panel completion-forms-card interactive-document-forms">
    <header className="panel-head"><div><span className="chip blue">Student paperwork</span><h2>Interactive form submissions</h2><p>Review submitted clearance and OJT papers for your scoped placements.</p></div><span className="chip orange">{pendingReviews.length} awaiting review</span></header>
    <div className="panel-body">
      <div className="interactive-form-notice"><ShieldCheck size={17} /><p>These are fictional demonstration forms. The review records do not create official university clearance, legal consent, or signatures.</p></div>
      {sortedResponses.length ? <div className="interactive-review-list">{sortedResponses.map(response => {
        const type = text(response, 'formType') as DocumentFormType;
        const definition = documentFormCatalog[type];
        if (!definition) return null;
        const rowPlacement = data.placements.find(item => item.id === response.placementId);
        const values = readAnswers(response);
        return <article className="interactive-review-card" key={response.id}>
          <div className="interactive-review-heading"><div><strong>{text(rowPlacement, 'studentName') || 'Student'} · {definition.title}</strong><p>{text(rowPlacement, 'section')} · {text(rowPlacement, 'companyName')} · Updated {text(response, 'updatedAt') ? new Date(text(response, 'updatedAt')).toLocaleDateString() : '—'}</p></div><span className={`chip ${statusClass(text(response, 'status'))}`}>{statusLabel(text(response, 'status'))}</span></div>
          <details className="interactive-review-details"><summary>View completed answers</summary><dl>{definition.fields.map(field => <div key={field.key}><dt>{field.label}</dt><dd>{answerText(values[field.key], field.kind)}</dd></div>)}</dl></details>
          {text(response, 'reviewNote') && <p className="interactive-form-review-note">Previous note: {text(response, 'reviewNote')}</p>}
          <div className="interactive-review-actions"><button type="button" className="secondary" disabled={busy} onClick={() => void download(type, response, rowPlacement)}><Download size={14} />PDF copy</button>{canReview && response.status === 'SUBMITTED' && <><label className="interactive-review-note-field"><span>Note for revision requests</span><input value={reviewNotes[response.id] ?? ''} maxLength={1000} onChange={event => setReviewNotes(current => ({ ...current, [response.id]: event.target.value }))} /></label><button type="button" className="secondary" disabled={busy} onClick={() => void review(response, 'REVISION_REQUESTED')}>Request changes</button><button type="button" className="primary" disabled={busy} onClick={() => void review(response, 'APPROVED')}><FileCheck2 size={14} />Approve form</button></>}</div>
        </article>;
      })}</div> : <div className="empty"><FileText size={28} />No student forms have been submitted for review.</div>}
    </div>
    </section>
  </>;
}
