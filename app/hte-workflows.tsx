import { useState, useMemo, type DragEvent, type FormEvent } from 'react';
import {
  AlertCircle,
  Award,
  Building2,
  Check,
  Download,
  FileCheck2,
  FileClock,
  FileText,
  LoaderCircle,
  LockKeyhole,
  Printer,
  RotateCcw,
  ShieldCheck,
  Sparkles,
  Upload,
  X,
} from 'lucide-react';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import type { Action, Row, Snapshot } from '@/packages/validation/contracts';
import type { EvaluationQuestion } from '@/packages/validation/hte';
import DtrPagination from './dtr-pagination';
import { recruitmentCourseIds } from '@/packages/validation/recruitment';

const text = (r: Row | undefined, k: string) => String(r?.[k] ?? '');
const num = (r: Row | undefined, k: string) => Number(r?.[k] ?? 0);
const hourCount = (minutes: number) => (minutes / 60).toLocaleString('en-PH', { maximumFractionDigits: 2 });
const hours = (n: number) => `${hourCount(n)} hours`;
const date = (s: string) => new Date(s).toLocaleString('en-PH', { timeZone: 'Asia/Manila', dateStyle: 'medium', timeStyle: 'short' });
const statusLabel = (s: string) => ({ SUBMITTED:'Awaiting review', VERIFIED:'Verified', REVISION_REQUESTED:'Corrections requested', PENDING:'Awaiting approval', APPROVED:'Approved', REJECTED:'Rejected', DRAFT:'Draft', PUBLISHED:'Published', ARCHIVED:'Previous version' }[s] ?? s);
export const HteStatus = ({ value }: { value: string }) => <span className={`chip ${['VERIFIED','APPROVED','PUBLISHED'].includes(value) ? 'green' : ['REJECTED','REVISION_REQUESTED'].includes(value) ? 'red' : 'orange'}`}>{statusLabel(value)}</span>;

export function useHteAction(refresh: () => Promise<void>) {
 const router = useRouter();
 const [busy, setBusy] = useState(false), [error, setError] = useState('');
 async function act(action: Action, values: Record<string, unknown>) {
  if (busy) return false;
  setBusy(true); setError('');
  try {
   const response = await fetch('/api/action', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ action, values }) });
   if (response.status === 401) { router.replace('/login'); return false; }
   const result = await response.json() as { message?: string; error?: string };
   if (!response.ok) throw new Error(result.error || 'Could not save. Your input is preserved; try again.');
   toast.success(result.message || 'Saved.'); await refresh(); return true;
  } catch(e) { setError(e instanceof Error ? e.message : 'Could not save. Your input is preserved; try again.'); return false; }
  finally { setBusy(false); }
 }
 return { busy, error, act };
}
const Failure = ({ error }: { error: string }) => error ? <p className="hte-error" role="alert">{error}</p> : null;

export function HteRequestQueue({ data, onRefresh }: { data: Snapshot; onRefresh: () => Promise<void> }) {
 const { busy, error, act } = useHteAction(onRefresh);
 const [filter, setFilter] = useState(data.user.role === 'SUPER_ADMIN' ? 'PENDING' : 'ALL'), [notes, setNotes] = useState<Record<string,string>>({});
 const admin = data.user.role === 'SUPER_ADMIN';
 const requests = (data.hteRequests ?? []).filter(r => filter === 'ALL' || r.status === filter);
 const names: Record<string,string> = { REGISTRATION:'Industry Partner registration', PROFILE:'Company profile changes', JOB_CREATE:'New internship post', JOB_EDIT:'Internship post changes', JOB_CLOSE:'Close internship post' };
 const fieldNames: Record<string,string> = { name:'Company name', industry:'Industry', location:'Location', description:'Description', contactName:'Contact person', email:'Contact email', contactEmail:'Contact email', contactPhone:'Contact phone', contactPosition:'Designation / position', website:'Company website', title:'Position title', courseId:'Primary program', courseIds:'Required programs / courses', skills:'Skills', openings:'Number of interns needed' };
 const requestValue = (key: string, value: unknown) => key === 'courseIds' && Array.isArray(value) ? value.map(id => text(data.courses.find(course => course.id === id),'name') || String(id)).join('\n') : key === 'courseId' ? text(data.courses.find(course => course.id === value),'name') || String(value) : String(value ?? '');
 return <section className="hte-card" id="hte-requests"><div className="hte-section-heading"><div><h2>{admin ? 'Industry Partner approval requests' : 'Your requests'}</h2></div><label className="hte-filter">Status<select value={filter} onChange={e => setFilter(e.target.value)}>{['PENDING','APPROVED','REJECTED','ALL'].map(s => <option key={s} value={s}>{s === 'ALL' ? 'All requests' : statusLabel(s)}</option>)}</select></label></div><Failure error={error}/>
 {requests.length ? <div className="hte-request-list">{requests.map(r => {
  const proposed = JSON.parse(text(r,'payloadJson')) as Record<string,unknown>;
  const current = r.kind === 'PROFILE' ? data.companies.find(c => c.id === r.resourceId) : ['JOB_EDIT','JOB_CLOSE'].includes(text(r,'kind')) ? data.jobs.find(j => j.id === r.resourceId) : undefined;
  return <article key={r.id} className="hte-request"><div className="hte-section-heading"><div><h3>{names[text(r,'kind')]}</h3><p>{text(r,'companyName')} · {text(r,'requesterName')} · {date(text(r,'createdAt'))}</p></div><HteStatus value={text(r,'status')}/></div>
   <details><summary>Review request details</summary>{r.kind === 'JOB_CLOSE' ? <p>Close “{text(current,'title')}” and hide it from the student OJT recruitment board. Existing applications and placements are retained.</p> : <div className="hte-table-scroll"><table className="hte-review-table"><thead><tr><th>Field</th>{current && <th>Current approved value</th>}<th>Requested value</th></tr></thead><tbody>{Object.entries(proposed).map(([k,v]) => <tr key={k}><th>{fieldNames[k] ?? k}</th>{current && <td>{requestValue(k,k === 'courseIds' && current ? recruitmentCourseIds(current) : current?.[k]) || '—'}</td>}<td>{requestValue(k,v)}</td></tr>)}</tbody></table></div>}</details>
   {text(r,'note') && <p className="hte-review-note"><strong>Super Admin note:</strong> {text(r,'note')}</p>}
   {admin && r.status === 'PENDING' && <div className="hte-request-decision"><label>Decision note <span className="muted">(required when rejecting)</span><textarea maxLength={2000} value={notes[r.id] ?? ''} onChange={e => setNotes({ ...notes,[r.id]:e.target.value })}/></label><div className="hte-actions"><button className="primary" disabled={busy} onClick={() => void act('hteRequestReview',{ requestId:r.id,version:num(r,'version'),decision:'APPROVE',note:notes[r.id] ?? '' })}><Check size={15}/>Approve request</button><button className="secondary" disabled={busy} onClick={() => void act('hteRequestReview',{ requestId:r.id,version:num(r,'version'),decision:'REJECT',note:notes[r.id] ?? '' })}>Reject with reason</button></div></div>}
  </article>;
 })}</div> : <p className="hte-empty">{!data.hteRequests?.length ? 'No approval requests yet. New requests and their decisions will appear here.' : filter === 'PENDING' ? 'No requests are waiting for approval.' : 'No requests match this status.'}</p>}
 </section>;
}

function FinalDtrCopy({ record }: { record: Row }) {
 const [page,setPage] = useState(1), [size,setSize] = useState(10);
 const entries = JSON.parse(text(record,'snapshotJson')) as Row[];
 const current = Math.min(page,Math.max(1,Math.ceil(entries.length / size)));
 return <details className="hte-dtr-copy"><summary>Review submitted DTR · {entries.length} logs · {hours(num(record,'totalMinutes'))}</summary><p className="small muted">Fixed submission version {record.version}. Times use Asia/Manila. Daily narratives are excluded from the Industry Partner copy.</p><div className="hte-table-scroll"><table className="hte-review-table"><thead><tr><th>Date</th><th>Time in</th><th>Time out</th><th>Break</th><th>Hours</th></tr></thead><tbody>{entries.slice((current-1)*size,current*size).map(e => <tr key={e.id}><th>{text(e,'date')}</th><td>{date(text(e,'startsAt'))}</td><td>{date(text(e,'endsAt'))}</td><td>{e.breakMinutes} min</td><td>{hours(num(e,'minutes'))}</td></tr>)}</tbody></table></div><DtrPagination page={current} pageSize={size} totalItems={entries.length} itemLabel="logs" onPageChange={setPage} onPageSizeChange={s => {setSize(s);setPage(1);}}/></details>;
}

export function PrefilledDtrModal({
  isOpen,
  onClose,
  studentName,
  companyName,
  courseName,
  section,
  requiredHours,
  reportedHours,
  entries,
  period,
}: {
  isOpen: boolean;
  onClose: () => void;
  studentName: string;
  studentId?: string;
  companyName: string;
  courseName: string;
  section?: string;
  requiredHours: string;
  reportedHours: string;
  entries: Row[];
  period?: string;
}) {
  if (!isOpen) return null;

  return (
    <div
      className="hte-prefilled-modal-backdrop"
      role="dialog"
      aria-modal="true"
      aria-labelledby="hte-prefilled-title"
      onClick={onClose}
    >
      <div className="hte-prefilled-modal-container" onClick={e => e.stopPropagation()}>
        {/* Modal Top Bar */}
        <div className="hte-prefilled-modal-header hte-no-print">
          <div className="hte-prefilled-modal-header-left">
            <div className="hte-prefilled-icon" style={{ background: '#eff6ff', color: '#124c91' }}>
              <Printer size={20} aria-hidden="true" />
            </div>
            <div>
              <h3 id="hte-prefilled-title">Pre-filled Daily Time Record (DTR)</h3>
              <p>Generated for Supervisor Wet-Ink or Digital Endorsement</p>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <button
              type="button"
              className="primary"
              onClick={() => window.print()}
              style={{ display: 'inline-flex', alignItems: 'center', gap: 7, padding: '8px 16px', fontSize: 13 }}
            >
              <Printer size={15} aria-hidden="true" /> Print / Save as PDF
            </button>
            <button
              type="button"
              className="secondary"
              onClick={onClose}
              style={{ padding: '8px 12px', fontSize: 13 }}
              aria-label="Close pre-filled DTR preview"
            >
              <X size={16} aria-hidden="true" />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="hte-prefilled-modal-body">
          {/* Printable Document Sheet */}
          <div className="hte-printable-dtr-sheet">
            {/* Document Header */}
            <div className="hte-doc-header">
              <h4>Rizal Technological University</h4>
              <h5>College of Engineering and Technology · Office of Student Internship &amp; Practicum</h5>
              <h3>Student Daily Time Record (DTR)</h3>
            </div>

            {/* Trainee & Establishment Metadata */}
            <div className="hte-doc-meta-grid">
              <div className="hte-doc-meta-item">
                <span className="hte-doc-meta-label">Student Trainee:</span>
                <span className="hte-doc-meta-val">{studentName}</span>
              </div>
              <div className="hte-doc-meta-item">
                <span className="hte-doc-meta-label">Degree Program:</span>
                <span className="hte-doc-meta-val">{courseName}</span>
              </div>
              <div className="hte-doc-meta-item">
                <span className="hte-doc-meta-label">Host Training Est. (HTE):</span>
                <span className="hte-doc-meta-val">{companyName}</span>
              </div>
              <div className="hte-doc-meta-item">
                <span className="hte-doc-meta-label">Section / Term:</span>
                <span className="hte-doc-meta-val">
                  {section ? `Sec. ${section}` : 'N/A'}{period ? ` (${period})` : ''}
                </span>
              </div>
              <div className="hte-doc-meta-item">
                <span className="hte-doc-meta-label">Required Target:</span>
                <span className="hte-doc-meta-val">{requiredHours}</span>
              </div>
              <div className="hte-doc-meta-item">
                <span className="hte-doc-meta-label">Total Logged Hours:</span>
                <span className="hte-doc-meta-val" style={{ color: '#124c91' }}>{reportedHours}</span>
              </div>
            </div>

            {/* Shift Entries Table */}
            <div className="hte-doc-table-wrap">
              <table className="hte-doc-table">
                <thead>
                  <tr>
                    <th style={{ width: 40, textAlign: 'center' }}>#</th>
                    <th>Date</th>
                    <th>Time In</th>
                    <th>Time Out</th>
                    <th style={{ textAlign: 'center' }}>Break</th>
                    <th style={{ textAlign: 'right' }}>Hours Rendered</th>
                    <th style={{ width: 140, textAlign: 'center' }}>Supervisor Initial</th>
                  </tr>
                </thead>
                <tbody>
                  {entries.length > 0 ? (
                    entries.map((entry, idx) => {
                      const mins = num(entry, 'minutes');
                      const inTime = text(entry, 'startsAt')
                        ? new Date(text(entry, 'startsAt')).toLocaleTimeString('en-PH', { hour: '2-digit', minute: '2-digit', hour12: true })
                        : '—';
                      const outTime = text(entry, 'endsAt')
                        ? new Date(text(entry, 'endsAt')).toLocaleTimeString('en-PH', { hour: '2-digit', minute: '2-digit', hour12: true })
                        : '—';
                      return (
                        <tr key={entry.id ? String(entry.id) : idx}>
                          <td style={{ textAlign: 'center', color: '#64748b' }}>{idx + 1}</td>
                          <td><strong>{text(entry, 'date')}</strong></td>
                          <td>{inTime}</td>
                          <td>{outTime}</td>
                          <td style={{ textAlign: 'center' }}>{entry.breakMinutes ? `${entry.breakMinutes}m` : '0m'}</td>
                          <td style={{ textAlign: 'right', fontWeight: 600 }}>{(mins / 60).toFixed(2)} hrs</td>
                          <td style={{ textAlign: 'center', color: '#94a3b8' }}>____________</td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan={7} style={{ textAlign: 'center', padding: '16px', color: '#64748b' }}>
                        No attendance logs recorded yet for this training placement.
                      </td>
                    </tr>
                  )}
                  <tr className="total-row">
                    <td colSpan={5} style={{ textAlign: 'right' }}>TOTAL CERTIFIED HOURS:</td>
                    <td style={{ textAlign: 'right' }}>{reportedHours}</td>
                    <td></td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Endorsement & Signatures */}
            <div className="hte-sig-grid">
              <div className="hte-sig-box">
                <div className="hte-sig-statement">
                  I hereby certify upon my honor that the above entries are true and correct logs of actual training hours rendered.
                </div>
                <div className="hte-sig-line">
                  <div className="hte-sig-name">{studentName}</div>
                  <div className="hte-sig-title">Student Trainee Signature</div>
                </div>
              </div>

              <div className="hte-sig-box">
                <div className="hte-sig-statement">
                  I hereby verify that the trainee has completed the above logged training hours under my direct supervision.
                </div>
                <div className="hte-sig-line">
                  <div className="hte-sig-name">____________________________</div>
                  <div className="hte-sig-title">Immediate Supervisor Signature</div>
                </div>
              </div>

              <div className="hte-sig-box">
                <div className="hte-sig-statement">
                  Audited and endorsed for Rizal Technological University OJT practicum course clearance.
                </div>
                <div className="hte-sig-line">
                  <div className="hte-sig-name">____________________________</div>
                  <div className="hte-sig-title">OJT Practicum Coordinator</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function FinalDtrCard({
  data,
  placement,
  onRefresh,
  isStudentView,
}: {
  data: Snapshot;
  placement: Row;
  onRefresh: () => Promise<void>;
  isStudentView?: boolean;
}) {
  const { busy, error, act } = useHteAction(onRefresh);
  const [note, setNote] = useState('');
  const [attachmentFilename, setAttachmentFilename] = useState('');
  const [attachmentBase64, setAttachmentBase64] = useState('');
  const [cocFilename, setCocFilename] = useState('');
  const [cocBase64, setCocBase64] = useState('');
  const [draggingDocument, setDraggingDocument] = useState<'coc' | 'signedDtr' | null>(null);
  const [showPrefilledModal, setShowPrefilledModal] = useState(false);
  const f = data.finalDtrs?.find(r => r.placementId === placement.id);
  const role = data.user.role;
  const reopening = data.finalDtrReopens?.find(r => r.placementId === placement.id && r.status === 'PENDING');
  const lastReopening = data.finalDtrReopens?.find(r => r.placementId === placement.id);
  const reported = placement.reportedMinutes === undefined
    ? data.entries.filter(e => e.placementId === placement.id).reduce((s, e) => s + num(e, 'minutes'), 0)
    : num(placement, 'reportedMinutes');
  const requiredMinutes = num(placement, 'requiredMinutes');
  const eligible = requiredMinutes > 0 && reported >= requiredMinutes;
  const canSubmit = role === 'STUDENT' && placement.status === 'ACTIVE' && (!f || f.status === 'REVISION_REQUESTED');
  const isExternal = num(placement, 'isExternal') === 1;
  const isStudent = isStudentView ?? (role === 'STUDENT');
  const submitGuidance = eligible && (!cocBase64 || !attachmentBase64)
    ? 'Upload both the Certificate of Completion and supervisor-signed DTR or Certificate of Hours to submit.'
    : '';

  const course = data.courses?.find(c => c.id === placement.courseId || c.code === placement.courseCode);
  const courseName = text(course, 'name') || text(placement, 'courseCode') || 'BS Information Technology';
  const studentName = text(placement, 'studentName') || data.user.name;

  const ownEntries = useMemo(() => {
    return (data.entries ?? [])
      .filter(e => e.placementId === placement.id)
      .sort((a, b) => new Date(text(a, 'startsAt')).getTime() - new Date(text(b, 'startsAt')).getTime());
  }, [data.entries, placement.id]);

  const handleFileUpload = (file: File, kind: 'coc' | 'signedDtr') => {
    const extension = file.name.split('.').pop()?.toLowerCase();
    if (!extension || !['pdf', 'png', 'jpg', 'jpeg'].includes(extension)) {
      toast.error('Choose a PDF, PNG, or JPG file.');
      return;
    }
    if (file.size > 4 * 1024 * 1024) {
      toast.error('Choose a file no larger than 4 MB.');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      if (kind === 'coc') {
        setCocFilename(file.name);
        setCocBase64(String(reader.result));
        toast.success(`Attached Certificate of Completion: ${file.name}`);
      } else {
        setAttachmentFilename(file.name);
        setAttachmentBase64(String(reader.result));
        toast.success(`Attached signed DTR: ${file.name}`);
      }
    };
    reader.readAsDataURL(file);
  };

  const submitDtr = () => {
    if (!cocBase64 || !attachmentBase64) {
      toast.error('Upload both required documents before submitting.');
      return;
    }
    void act('finalDtrSubmit', {
      placementId: placement.id,
      version: num(f, 'version'),
      attachmentFilename: attachmentFilename || undefined,
      attachmentBase64: attachmentBase64 || undefined,
      cocFilename: cocFilename || undefined,
      cocBase64: cocBase64 || undefined,
    });
  };

  const handleDragOver = (kind: 'coc' | 'signedDtr', e: DragEvent<HTMLLabelElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setDraggingDocument(kind);
  };

  const handleDragLeave = (e: DragEvent<HTMLLabelElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setDraggingDocument(null);
  };

  const handleDrop = (kind: 'coc' | 'signedDtr', e: DragEvent<HTMLLabelElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setDraggingDocument(null);
    const file = e.dataTransfer.files?.[0];
    if (file) handleFileUpload(file, kind);
  };

  const renderDocumentUpload = (kind: 'coc' | 'signedDtr', label: string) => {
    const isCoc = kind === 'coc';
    const filename = isCoc ? cocFilename : attachmentFilename;
    const base64 = isCoc ? cocBase64 : attachmentBase64;
    const setFile = isCoc
      ? (name: string, contents: string) => { setCocFilename(name); setCocBase64(contents); }
      : (name: string, contents: string) => { setAttachmentFilename(name); setAttachmentBase64(contents); };
    const input = (
      <input
        type="file"
        accept=".pdf,.png,.jpg,.jpeg,application/pdf,image/png,image/jpeg"
        aria-label={`Upload ${label}`}
        onChange={e => {
          const file = e.currentTarget.files?.[0];
          if (file) handleFileUpload(file, kind);
          e.currentTarget.value = '';
        }}
      />
    );

    if (base64) {
      return (
        <div className="hte-document-file" role="status">
          <FileCheck2 size={18} aria-hidden="true" />
          <strong title={filename}>{filename}</strong>
          <label className="hte-document-replace">
            Replace
            {input}
          </label>
          <button
            type="button"
            className="textbutton"
            onClick={() => setFile('', '')}
            aria-label={`Remove ${label}`}
          >
            Remove
          </button>
        </div>
      );
    }

    return (
      <label
        className={`hte-document-dropzone ${draggingDocument === kind ? 'dragging' : ''}`}
        onDragOver={e => handleDragOver(kind, e)}
        onDragLeave={handleDragLeave}
        onDrop={e => handleDrop(kind, e)}
      >
        {input}
        <Upload size={18} aria-hidden="true" />
        <span>Choose or drop {label}</span>
        <small>PDF, PNG, or JPG · Max 4 MB</small>
      </label>
    );
  };

  if (isStudent) {
    const fStatus = f ? text(f, 'status') : 'NOT_SUBMITTED';
    const hasAttachment = fStatus !== 'REVISION_REQUESTED' && Boolean(f?.attachmentFilename && f?.attachmentBase64);
    const hasCoc = fStatus !== 'REVISION_REQUESTED' && Boolean(f?.cocFilename && f?.cocBase64);
    return (
      <section className="hte-final-dtr" style={{ padding: 0 }}>
        {/* Card Header */}
        <div className="hte-student-card-header">
          <div>
            <h2 className="hte-student-card-title">
              <FileCheck2 size={20} aria-hidden="true" />
              Certificate of Completion &amp; Supervisor-Signed DTR
            </h2>
            <div className="hte-student-card-meta">
              <span className="hte-meta-badge">
                <Building2 size={13} aria-hidden="true" />
                {text(placement, 'companyName') || 'Host Training Establishment'}
              </span>
              {text(placement, 'section') && (
                <span className="chip" style={{ fontSize: 11, fontWeight: 600 }}>
                  Sec. {text(placement, 'section')}
                </span>
              )}
              {isExternal && (
                <span className="hte-meta-badge purple">
                  External / Offline Partner
                </span>
              )}
            </div>
          </div>
          <div>
            {f ? (
              <HteStatus value={fStatus} />
            ) : requiredMinutes <= 0 ? (
              <span className="chip orange">Target not set</span>
            ) : eligible ? (
              <span className="chip">Not submitted</span>
            ) : (
              <span className="chip blue">Hours in progress</span>
            )}
          </div>
        </div>

        <Failure error={error} />

        {canSubmit && (
          <div className="hte-document-grid" role="group" aria-label="Completion documents">
            <section className="hte-document-card" aria-labelledby="hte-coc-title">
              <div className="hte-document-card-heading">
                <span className="hte-document-icon"><FileCheck2 size={18} aria-hidden="true" /></span>
                <div>
                  <h3 id="hte-coc-title">Certificate of Completion</h3>
                  <p>Upload your completed certificate.</p>
                </div>
                <span className="chip orange">Required</span>
              </div>
              {eligible
                ? renderDocumentUpload('coc', 'Certificate of Completion')
                : (
                  <div className="hte-document-dropzone is-locked" aria-disabled="true">
                    <LockKeyhole size={18} aria-hidden="true" />
                    <span>{requiredMinutes > 0 ? 'Complete required hours to upload' : 'Upload unlocks after required hours are set'}</span>
                    <small>PDF, PNG, or JPG · Max 4 MB</small>
                  </div>
                )}
            </section>

            <section className="hte-document-card hte-document-card--signed-dtr" aria-labelledby="hte-signed-dtr-title">
              <div className="hte-document-card-heading">
                <span className="hte-document-icon"><Printer size={18} aria-hidden="true" /></span>
                <div>
                  <h3 id="hte-signed-dtr-title">Supervisor-Signed DTR</h3>
                  <p>Print, sign, and upload the completed DTR.</p>
                </div>
                <span className="chip orange">Required</span>
              </div>
              {eligible
                ? renderDocumentUpload('signedDtr', 'supervisor-signed DTR or Certificate of Hours')
                : (
                  <div className="hte-document-dropzone is-locked" aria-disabled="true">
                    <LockKeyhole size={18} aria-hidden="true" />
                    <span>{requiredMinutes > 0 ? 'Complete required hours to upload' : 'Upload unlocks after required hours are set'}</span>
                    <small>PDF, PNG, or JPG · Max 4 MB</small>
                  </div>
                )}
              <button
                type="button"
                className="secondary hte-document-print"
                onClick={() => setShowPrefilledModal(true)}
              >
                <Printer size={15} aria-hidden="true" /> Print / Export Pre-filled DTR
              </button>
            </section>
          </div>
        )}

        {/* Submission form; requirements determine when it is ready */}
        {canSubmit && (
          <div style={{ display: 'grid', gap: 18 }}>
            {f?.status === 'REVISION_REQUESTED' && (
              <div className="hte-student-banner revision" role="alert">
                <AlertCircle size={20} style={{ flexShrink: 0, marginTop: 2 }} aria-hidden="true" />
                <div>
                  <h4>Corrections Requested</h4>
                  {f.note && (
                    <div className="hte-review-note" style={{ marginTop: 6, background: '#fff', border: '1px solid #fde68a' }}>
                      <strong>Note:</strong> {text(f, 'note')}
                    </div>
                  )}
                </div>
              </div>
            )}

            {submitGuidance && (
              <p className="hte-submit-guidance" id="hte-final-dtr-submit-guidance" role="status">
                {submitGuidance}
              </p>
            )}
            <button
              type="button"
              className="primary"
              disabled={busy || !eligible || !cocBase64 || !attachmentBase64}
              aria-describedby={submitGuidance ? 'hte-final-dtr-submit-guidance' : undefined}
              onClick={submitDtr}
              style={{ minHeight: 44, width: 'fit-content' }}
            >
              {busy ? (
                <>
                  <LoaderCircle size={15} className="spin" aria-hidden="true" /> Submitting…
                </>
              ) : f ? (
                <>
                <FileClock size={15} aria-hidden="true" /> Resubmit Final DTR
                </>
              ) : (
                <>
                <Award size={15} aria-hidden="true" /> Submit Final DTR
                </>
              )}
            </button>
          </div>
        )}

        {/* Case 3: Submitted (Awaiting Verification) */}
        {f && f.status === 'SUBMITTED' && (
          <div style={{ display: 'grid', gap: 14 }}>
            <div className="hte-student-banner pending">
              <FileClock size={22} style={{ flexShrink: 0 }} aria-hidden="true" />
              <div>
                <h4>Final DTR Submitted (Version {f.version})</h4>
              </div>
            </div>

            {hasAttachment && (
              <div className="hte-attachment-card">
                <div className="hte-attachment-left">
                  <Award size={22} className="hte-attachment-icon" aria-hidden="true" style={{ color: '#124c91' }} />
                  <div className="hte-attachment-info">
                    <span className="small muted">Supervisor-signed DTR</span>
                    <strong>{text(f, 'attachmentFilename')}</strong>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                  <a
                    href={text(f, 'attachmentBase64')}
                    download={text(f, 'attachmentFilename')}
                    className="secondary hte-download-btn"
                    target="_blank"
                    rel="noreferrer"
                  >
                    <Download size={14} aria-hidden="true" /> Download
                  </a>
                  <button
                    type="button"
                    className="secondary"
                    onClick={() => setShowPrefilledModal(true)}
                    style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 13 }}
                  >
                    <Printer size={14} aria-hidden="true" /> View DTR
                  </button>
                </div>
              </div>
            )}

            {hasCoc && (
              <div className="hte-attachment-card">
                <div className="hte-attachment-left">
                  <FileCheck2 size={22} className="hte-attachment-icon" aria-hidden="true" />
                  <div className="hte-attachment-info">
                    <span className="small muted">Certificate of Completion</span>
                    <strong>{text(f, 'cocFilename')}</strong>
                  </div>
                </div>
                <a href={text(f, 'cocBase64')} download={text(f, 'cocFilename')} className="secondary hte-download-btn" target="_blank" rel="noreferrer">
                  <Download size={14} aria-hidden="true" /> Download
                </a>
              </div>
            )}

            <details className="hte-review-disclosure">
              <summary>Submitted snapshot logs ({hours(num(f, 'totalMinutes'))})</summary>
              <div style={{ marginTop: 10 }}>
                <FinalDtrCopy record={f} />
              </div>
            </details>
          </div>
        )}

        {/* Case 4: Verified (Gold RTU Completion Badge & Clearance Showcase) */}
        {f && f.status === 'VERIFIED' && (
          <div style={{ display: 'grid', gap: 16 }}>
            <div className="hte-cert-showcase">
              <div className="hte-cert-header-area">
                <div className="hte-cert-seal-badge">
                  <div className="hte-gold-seal">
                    <Award size={32} strokeWidth={2.2} aria-hidden="true" />
                  </div>
                  <div className="hte-cert-titles">
                    <span className="hte-cert-chip-gold">
                      <Sparkles size={12} aria-hidden="true" />
                      Certified Clearance
                    </span>
                    <h3>Practicum Completed &amp; Formally Endorsed</h3>
                  </div>
                </div>
              </div>

              {/* Certified Credential Grid */}
              <div className="hte-cert-grid">
                <div>
                  <span className="hte-cert-stat-label">Student Trainee</span>
                  <div className="hte-cert-stat-value">{studentName}</div>
                </div>
                <div>
                  <span className="hte-cert-stat-label">Degree Program</span>
                  <div className="hte-cert-stat-value">{courseName}</div>
                </div>
                <div>
                  <span className="hte-cert-stat-label">Host Training Establishment</span>
                  <div className="hte-cert-stat-value">{text(placement, 'companyName') || 'Host Company Partner'}</div>
                </div>
                <div>
                  <span className="hte-cert-stat-label">Formally Certified Hours</span>
                  <div className="hte-cert-stat-value" style={{ color: '#fde047' }}>
                    {hours(num(f, 'totalMinutes') || reported)}
                  </div>
                </div>
              </div>

              {f.note && (
                <div
                  style={{
                    background: 'rgba(255, 255, 255, 0.08)',
                    border: '1px solid rgba(255, 255, 255, 0.15)',
                    borderRadius: 8,
                    padding: '10px 14px',
                    fontSize: 13,
                    color: '#f1f5f9',
                    marginBottom: 16,
                  }}
                >
                  <strong style={{ color: '#fde047' }}>Reviewer remarks:</strong> {text(f, 'note')}
                </div>
              )}

              <div className="hte-cert-actions">
                <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                  {hasCoc && (
                    <a
                      href={text(f, 'cocBase64')}
                      download={text(f, 'cocFilename')}
                      className="hte-cert-download-btn"
                      target="_blank"
                      rel="noreferrer"
                    >
                      <Download size={16} aria-hidden="true" /> Download Certificate of Completion
                    </a>
                  )}
                  {hasAttachment && (
                    <a
                      href={text(f, 'attachmentBase64')}
                      download={text(f, 'attachmentFilename')}
                      className="hte-cert-download-btn"
                      target="_blank"
                      rel="noreferrer"
                    >
                      <Download size={16} aria-hidden="true" /> Download Signed DTR
                    </a>
                  )}
                  <button
                    type="button"
                    className="hte-prefilled-btn"
                    onClick={() => setShowPrefilledModal(true)}
                    style={{ background: 'rgba(255,255,255,0.12)', borderColor: 'rgba(255,255,255,0.3)', color: '#ffffff' }}
                  >
                    <Printer size={15} aria-hidden="true" /> View Printable DTR
                  </button>
                </div>
                <span className="small" style={{ color: '#cbd5e1' }}>
                  RTU-OJT-{String(placement.id).slice(0, 8).toUpperCase()}
                </span>
              </div>
            </div>

            <details className="hte-review-disclosure">
              <summary>Verified DTR log history ({hours(num(f, 'totalMinutes'))})</summary>
              <div style={{ marginTop: 10 }}>
                <FinalDtrCopy record={f} />
              </div>
            </details>

            {/* Reopening Request */}
            <details className="hte-reopen-details">
              <summary>
                <RotateCcw size={14} aria-hidden="true" /> Attendance correction request
              </summary>
              {reopening ? (
                <p className="hte-review-note" style={{ marginTop: 10 }}>
                  Awaiting coordinator approval: {text(reopening, 'reason')}
                </p>
              ) : (
                <div className="hte-reopen-form">
                  <label>
                    Correction details
                    <textarea
                      maxLength={2000}
                      value={note}
                      onChange={e => setNote(e.target.value)}
                      placeholder="Specify dates, hours, or records..."
                    />
                  </label>
                  <button
                    type="button"
                    className="secondary"
                    disabled={busy || !note.trim()}
                    onClick={() =>
                      void act('finalDtrReopen', {
                        placementId: placement.id,
                        version: num(f, 'version'),
                        reason: note,
                      })
                    }
                    style={{ justifySelf: 'start' }}
                  >
                    Request Reopening
                  </button>
                  {lastReopening?.note && (
                    <p className="hte-review-note">
                      Coordinator decision: {text(lastReopening, 'note')}
                    </p>
                  )}
                </div>
              )}
            </details>
          </div>
        )}

        {/* Pre-filled DTR Printable Modal */}
        <PrefilledDtrModal
          isOpen={showPrefilledModal}
          onClose={() => setShowPrefilledModal(false)}
          studentName={studentName}
          studentId={String(placement.studentId ?? data.user.id)}
          companyName={text(placement, 'companyName') || 'Host Training Establishment'}
          courseName={courseName}
          section={text(placement, 'section')}
          period={text(placement, 'period')}
          requiredHours={hours(requiredMinutes)}
          reportedHours={hours(reported)}
          entries={ownEntries}
        />
      </section>
    );
  }

  return <section className="hte-final-dtr">
   <div className="hte-section-heading">
    <div>
     <h3>
     <FileCheck2 size={18}/>Final DTR Verification
      {isExternal && <span className="chip purple" style={{fontSize:11,fontWeight:600}}>Offline / External Industry Partner</span>}
     </h3>
     <p>{hours(reported)} reported · {hours(num(placement,'requiredMinutes'))} required</p>
    </div>
    {f ? <HteStatus value={text(f,'status')}/> : <span className="chip">Not submitted</span>}
   </div>
   <Failure error={error}/>
   {f ? <>
    <FinalDtrCopy record={f}/>
    {f.cocFilename && f.cocBase64 && (
     <div className="hte-attachment-card">
      <div className="hte-attachment-left">
       <FileCheck2 size={22} className="hte-attachment-icon" aria-hidden="true" />
       <div className="hte-attachment-info">
        <span className="small muted">Certificate of Completion</span>
        <strong>{text(f,'cocFilename')}</strong>
       </div>
      </div>
      <a href={text(f,'cocBase64')} download={text(f,'cocFilename')} className="secondary hte-download-btn" target="_blank" rel="noreferrer">
       <Download size={14} aria-hidden="true" /> Download copy
      </a>
     </div>
    )}
    {f.attachmentFilename && f.attachmentBase64 && (
     <div className="hte-attachment-card">
      <div className="hte-attachment-left">
       <FileCheck2 size={22} className="hte-attachment-icon" />
       <div className="hte-attachment-info">
        <span className="small muted">Supervisor-signed DTR</span>
        <strong>{text(f,'attachmentFilename')}</strong>
        <span className="small muted">{f.verificationMethod === 'SIGNED_DOCUMENT' ? 'Company-signed physical verification' : 'Direct supervisor record'}</span>
       </div>
      </div>
      <a href={text(f,'attachmentBase64')} download={text(f,'attachmentFilename')} className="secondary hte-download-btn" target="_blank" rel="noreferrer">
       <Download size={14}/> Download copy
      </a>
     </div>
    )}
    {f.note && <p className="hte-review-note"><strong>Review note:</strong> {text(f,'note')}</p>}
    {f.reviewedAt && <p className="small muted">Reviewed {date(text(f,'reviewedAt'))}</p>}
   </> : <p className="muted">The student submits the complete DTR with a supervisor-signed document once the required hours are reached. {isExternal ? 'Your Class Coordinator verifies the DTR against the signed company timesheet.' : 'The Industry Partner reviews attendance once for the whole internship.'}</p>}

   {canSubmit && <>
    <p className="small muted">
     {eligible
      ? 'Required hours reached. Upload your supervisor-signed DTR or Certificate of Hours before final submission.'
      : 'Keep recording attendance. Final submission unlocks at the required hours target.'}
    </p>

    <div className="hte-upload-area">
     <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',flexWrap:'wrap',gap:8}}>
      <div>
       <strong style={{fontSize:13,color:'var(--rtu-navy)'}}>
        Supervisor-signed DTR or Certificate of Hours (Required)
       </strong>

      </div>
      {attachmentBase64 ? (
       <div className="hte-upload-meta">
        <span>{attachmentFilename}</span>
        <button type="button" className="textbutton" onClick={() => { setAttachmentFilename(''); setAttachmentBase64(''); }} title="Remove file">
         <X size={14}/>
        </button>
       </div>
      ) : (
       <label className="secondary hte-download-btn" style={{cursor:'pointer',margin:0}}>
        <Upload size={14}/> Choose signed file
        <input type="file" accept=".pdf,image/png,image/jpeg" style={{display:'none'}} onChange={e => { const file = e.target.files?.[0]; if (file) handleFileUpload(file, 'signedDtr'); }} />
       </label>
      )}
     </div>
    </div>

    <button className="primary" disabled={busy || !eligible || !attachmentBase64} onClick={submitDtr}>
     <FileClock size={15}/>{busy ? 'Submitting…' : f ? 'Resubmit complete DTR' : 'Submit complete DTR with signed copy'}
    </button>
   </>}

   {role === 'STUDENT' && f && ['SUBMITTED','VERIFIED'].includes(text(f,'status')) && (
    <p className="small muted">
     <LockKeyhole size={14}/> Attendance is locked. {f.status === 'VERIFIED' ? 'Request reopening below if a correction is needed.' : isExternal ? 'Your Class Coordinator is reviewing your submitted record and signed attachment.' : 'Your Industry Partner is reviewing your attendance and signed DTR.'}
    </p>
   )}

   {role === 'SUPERVISOR' && f?.status === 'SUBMITTED' && (
    <div className="hte-request-decision">
     <label>Review note <span className="muted">(identify incorrect dates or times when rejecting)</span>
      <textarea maxLength={2000} value={note} onChange={e => setNote(e.target.value)}/>
     </label>

     <div className="hte-actions">
      <button className="primary" disabled={busy} onClick={() => void act('finalDtrReview',{ placementId:placement.id,version:num(f,'version'),decision:'VERIFY',note })}>
       <Check size={15}/>Verify complete DTR
      </button>
      <button className="secondary" disabled={busy} onClick={() => void act('finalDtrReview',{ placementId:placement.id,version:num(f,'version'),decision:'REJECT',note })}>
       Return for correction
      </button>
     </div>
    </div>
   )}

   {role === 'COORDINATOR' && f?.status === 'SUBMITTED' && (
    <div className="hte-request-decision">
     <div className="hte-coordinator-notice">
      <ShieldCheck size={18} className="text-blue-700" style={{flexShrink:0,marginTop:2}} />
      <div>
       <strong>Coordinator Attendance Verification</strong>
       <p className="small muted">
        {isExternal
         ? 'The student is training at an offline / external host company and uploaded a signed document. Verify the logged attendance against the attached document.'
         : f.attachmentBase64
         ? 'The student uploaded a supervisor-signed DTR. Verify the logged attendance against the attached document.'
         : 'Direct coordinator override for final attendance verification.'}
       </p>
      </div>
     </div>
     <label>Coordinator review note <span className="muted">(optional for verification; required when returning for correction)</span>
      <textarea maxLength={2000} value={note} onChange={e => setNote(e.target.value)} placeholder="Add any verification remarks..." />
     </label>
     <div className="hte-actions">
      <button className="primary" disabled={busy} onClick={() => void act('finalDtrReview',{ placementId:placement.id,version:num(f,'version'),decision:'VERIFY',note })}>
       <Check size={15}/>Verify complete DTR (Coordinator)
      </button>
      <button className="secondary" disabled={busy} onClick={() => void act('finalDtrReview',{ placementId:placement.id,version:num(f,'version'),decision:'REJECT',note })}>
       Return for correction
      </button>
     </div>
    </div>
   )}

   {role === 'STUDENT' && f?.status === 'VERIFIED' && (
    <details><summary>Request a correction</summary>{reopening ? <p className="hte-review-note">Your reopening request is awaiting coordinator approval. Reason: {text(reopening,'reason')}</p> : <><label>What needs correcting?<textarea maxLength={2000} value={note} onChange={e => setNote(e.target.value)}/></label><p className="small muted">If approved, completion and evaluation review will reopen. Your {isExternal ? 'coordinator' : 'Industry Partner'} must verify the corrected DTR again.</p><button className="secondary" disabled={busy} onClick={() => void act('finalDtrReopen',{ placementId:placement.id,version:num(f,'version'),reason:note })}>Request reopening</button>{lastReopening?.note && <p className="hte-review-note">Previous coordinator decision: {text(lastReopening,'note')}</p>}</>}</details>
   )}

   {role === 'COORDINATOR' && reopening && (
    <div className="hte-request-decision"><h4>Student requested reopening</h4><p>{text(reopening,'reason')}</p><label>Coordinator decision reason<textarea maxLength={2000} value={note} onChange={e => setNote(e.target.value)}/></label><p className="small muted">Approving unlocks attendance, returns formal completion to pending, and requires renewed verification and evaluation review.</p><div className="hte-actions"><button className="primary" disabled={busy} onClick={() => void act('finalDtrReopenReview',{ requestId:reopening.id,version:num(reopening,'version'),decision:'APPROVE',note })}>Approve reopening</button><button className="secondary" disabled={busy} onClick={() => void act('finalDtrReopenReview',{ requestId:reopening.id,version:num(reopening,'version'),decision:'REJECT',note })}>Decline reopening</button></div></div>
   )}
  </section>;
}

export function FinalDtrWorkspace({ data, onRefresh }: { data: Snapshot; onRefresh: () => Promise<void> }) {
  if (data.user.role === 'STUDENT') {
    const studentPlacement = data.placements.find(p => p.studentId === data.user.id) ?? data.placements[0];
    if (!studentPlacement) {
      return (
        <section className="hte-student-final-card">
          <div className="hte-empty" style={{ textAlign: 'center', padding: '32px 16px' }}>
            <FileCheck2 size={36} style={{ color: 'var(--muted-foreground)', margin: '0 auto 12px' }} />
            <h3 style={{ margin: '0 0 6px', color: 'var(--rtu-navy)' }}>No Assigned Placement</h3>
            <p className="muted" style={{ margin: 0 }}>An assigned company placement is needed before a final DTR can be submitted.</p>
          </div>
        </section>
      );
    }
    return (
      <section className="hte-student-final-card">
        <FinalDtrCard data={data} placement={studentPlacement} onRefresh={onRefresh} isStudentView />
      </section>
    );
  }

  return (
    <section className="hte-card">
            <h2>Final Attendance Review</h2>
      {data.placements.length ? (
        data.placements.map(p => (
          <details
            className="hte-placement"
            key={p.id}
            open={Boolean(data.finalDtrReopens?.some(r => r.placementId === p.id && r.status === 'PENDING'))}
          >
            <summary>
              {text(p, 'studentName')} · {text(p, 'companyName')} {num(p, 'isExternal') === 1 ? '· (External Industry Partner)' : ''} · {statusLabel(text(data.finalDtrs?.find(f => f.placementId === p.id), 'status')) || 'Not submitted'}
            </summary>
            <FinalDtrCard data={data} placement={p} onRefresh={onRefresh} />
          </details>
        ))
      ) : (
        <p className="hte-empty">An assigned placement is needed before a final DTR can be submitted.</p>
      )}
    </section>
  );
}

function TemplateEditor({ template,onRefresh }: { template: Row; onRefresh: () => Promise<void> }) {
 const [title,setTitle] = useState(text(template,'title')), [questions,setQuestions] = useState<EvaluationQuestion[]>(() => JSON.parse(text(template,'questionsJson')));
 const { busy,error,act } = useHteAction(onRefresh);
 const setup = {templateId:template.id,version:num(template,'version'),title,questions:questions.map(q=>({...q,options:q.options.map(o=>o.trim()).filter(Boolean)}))};
 const update = (i: number, patch: Partial<EvaluationQuestion>) => setQuestions(questions.map((q,n) => n === i ? {...q,...patch} : q));
 return <form className="hte-template-editor" onSubmit={e => { e.preventDefault(); void act('hteEvaluationPublish',setup); }}><h3>Prepare the uploaded form</h3><label>Form title<input required maxLength={160} value={title} onChange={e => setTitle(e.target.value)}/></label><a className="textbutton" href={`/api/hte-evaluation-template/${template.id}/file`} target="_blank" rel="noreferrer">View original PDF</a>
  {questions.map((q,i) => <fieldset className="hte-question-editor" key={q.key}><legend>Question {i+1}</legend><label>Question wording<input required maxLength={500} value={q.label} onChange={e => update(i,{label:e.target.value})}/></label><label>Answer type<select value={q.type} onChange={e => update(i,{type:e.target.value as EvaluationQuestion['type']})}><option value="text">Written answer</option><option value="rating">Rating scale</option><option value="select">Single choice</option></select></label>{q.type !== 'text' && <label>Scale labels or choices, one per line<textarea required value={q.options.join('\n')} onChange={e => update(i,{options:e.target.value.split('\n')})}/><span className="small muted">Use the exact school scale; no automatic grade is calculated.</span></label>}<label className="hte-checkbox"><input type="checkbox" checked={q.required} onChange={e => update(i,{required:e.target.checked})}/>Required answer</label><button className="textbutton" type="button" onClick={() => setQuestions(questions.filter((_,n) => n !== i))}>Remove question {i+1}</button></fieldset>)}
  {!questions.length && <p className="hte-empty">No online answer fields yet.</p>}<Failure error={error}/><div className="hte-actions"><button type="button" className="secondary" disabled={busy || questions.length >= 60} onClick={() => setQuestions([...questions,{ key:'q'+crypto.randomUUID().replaceAll('-',''),label:'',type:'text',required:true,options:[] }])}>Add question</button><button type="button" className="secondary" disabled={busy} onClick={() => void act('hteEvaluationDraft',setup)}>Save form setup</button><button className="primary" disabled={busy}>{busy ? 'Saving…' : 'Publish for all courses'}</button></div></form>;
}

export function SchoolEvaluationLibrary({ data,onRefresh }: { data: Snapshot; onRefresh: () => Promise<void> }) {
 const [uploading,setUploading] = useState(false), [error,setError] = useState('');
 const published = data.hteEvaluationTemplates?.find(t => t.status === 'PUBLISHED'), drafts = data.hteEvaluationTemplates?.filter(t => t.status === 'DRAFT') ?? [];
 async function upload(file: File, input: HTMLInputElement) {
  setError(''); if (!file.name.toLowerCase().endsWith('.pdf') || file.size > 4 * 1024 * 1024) { setError('Choose a PDF file up to 4 MB.'); return; }
  setUploading(true);
  try { const r = await fetch('/api/hte-evaluation-template',{ method:'POST',headers:{ 'Content-Type':'application/pdf','X-File-Name':encodeURIComponent(file.name) },body:file }); const result = await r.json() as {error?:string;message?:string}; if (!r.ok) throw new Error(result.error || 'Could not save. Try again.'); await onRefresh(); input.value=''; toast.success(result.message || 'PDF uploaded.'); }
  catch(e) { setError(e instanceof Error ? e.message : 'Upload failed. Try again.'); }
  finally { setUploading(false); }
 }
 return <section className="hte-card school-evaluation"><div className="hte-section-heading"><div><h2><FileText size={19}/>School Evaluation Form</h2></div><span className="chip blue">All programs</span></div>
  {published ? <div className="hte-published-form"><HteStatus value="PUBLISHED"/><strong>{text(published,'title')}</strong><a className="textbutton" href={`/api/hte-evaluation-template/${published.id}/file`}>Download school form</a></div> : <div className="hte-form-placeholder"><FileClock size={28}/><div><h3>Waiting for Evaluation Form</h3></div><span className="chip orange">Awaiting document</span></div>}
  {data.user.role === 'SUPER_ADMIN' && <><label className="hte-upload secondary"><Upload size={15}/>{uploading ? 'Uploading PDF…' : 'Upload evaluation PDF'}<input type="file" accept=".pdf,application/pdf" disabled={uploading} onChange={e => {const file=e.target.files?.[0]; if(file)void upload(file,e.target);}}/></label><Failure error={error}/>{drafts.map(t => <TemplateEditor key={`${t.id}:${t.version}`} template={t} onRefresh={onRefresh}/>)}</>}
 </section>;
}

export function HteEvaluationForm({ data,placement,onRefresh }: { data: Snapshot; placement: Row; onRefresh: () => Promise<void> }) {
 const response = data.hteEvaluationResponses?.find(r => r.placementId === placement.id);
 const template = response ? data.hteEvaluationTemplates?.find(t => t.id === response.templateId) : data.hteEvaluationTemplates?.find(t => t.status === 'PUBLISHED');
 const final = data.finalDtrs?.find(r => r.placementId === placement.id);
 if (!template) return <div className="hte-form-placeholder"><FileClock size={23}/><div><h3>Waiting for Evaluation Form</h3></div></div>;
 if (!final || final.status !== 'VERIFIED') return <p className="hte-review-note"><LockKeyhole size={15}/> The school evaluation unlocks after the complete DTR is verified.</p>;
 return <EvaluationAnswers key={`${response?.id ?? template.id}:${response?.version ?? 0}:${final.version}`} data={data} placement={placement} template={template} response={response} final={final} onRefresh={onRefresh}/>;
}

function EvaluationAnswers({ data,placement,template,response,final,onRefresh }: { data: Snapshot; placement: Row; template: Row; response?: Row; final: Row; onRefresh: () => Promise<void> }) {
 const questions = JSON.parse(text(template,'questionsJson')) as EvaluationQuestion[];
 const [answers,setAnswers] = useState<Record<string,string>>(() => response ? JSON.parse(text(response,'answersJson')) : {});
 const [note,setNote] = useState('');
 const [evalFilename, setEvalFilename] = useState(text(response, 'attachmentFilename') || '');
 const [evalBase64, setEvalBase64] = useState(text(response, 'attachmentBase64') || '');
 const [scanningPdf, setScanningPdf] = useState(false);
 const [scanSuccess, setScanSuccess] = useState(false);
 const { busy,error,act } = useHteAction(onRefresh);

 const isExternal = num(placement, 'isExternal') === 1;
 const isStudent = data.user.role === 'STUDENT';
 const isCoordinator = data.user.role === 'COORDINATOR';
 const isSupervisor = data.user.role === 'SUPERVISOR';

 const canSupervisorAnswer = isSupervisor && (!response || ['DRAFT','REVISION_REQUESTED'].includes(text(response,'status')));
 const canStudentUpload = isStudent && isExternal && (!response || ['DRAFT','REVISION_REQUESTED'].includes(text(response,'status')));

 const save = (mode: 'DRAFT'|'SUBMIT') => void act('hteEvaluationSave',{ placementId:placement.id,templateId:template.id,finalDtrVersion:num(final,'version'),version:num(response,'version'),mode,answers });

 const handleExternalPdfSelect = async (file: File) => {
  if (!file.name.toLowerCase().endsWith('.pdf') || file.size > 4 * 1024 * 1024) {
   toast.error('Choose a valid evaluation PDF up to 4 MB.');
   return;
  }
  setScanningPdf(true);
  setScanSuccess(false);
  try {
   const base64 = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = reject;
    reader.readAsDataURL(file);
   });
   setEvalFilename(file.name);
   setEvalBase64(base64);

   const res = await fetch('/api/extract-evaluation-scores', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ pdfBase64: base64, questions })
   });
   if (!res.ok) {
    const err = await res.json() as { error?: string };
    throw new Error(err.error || 'Automated score detection could not parse this file.');
   }
   const extracted = await res.json() as { scores: Record<string, number>; narrativeRecommendation: string };
   const patched = { ...answers };
   for (const [k, score] of Object.entries(extracted.scores || {})) {
    patched[k] = String(score);
   }
   if (extracted.narrativeRecommendation) {
    const textQ = questions.find(q => q.type === 'text');
    if (textQ && !patched[textQ.key]) {
     patched[textQ.key] = extracted.narrativeRecommendation;
    }
   }
   setAnswers(patched);
   setScanSuccess(true);
   toast.success('Scores detected from PDF. Review and confirm answers below.');
  } catch (e) {
   toast.error(e instanceof Error ? e.message : 'Upload failed.');
  } finally {
   setScanningPdf(false);
  }
 };

 const submitExternalEvaluation = (e: FormEvent) => {
  e.preventDefault();
  if (!evalBase64) {
   toast.error('Please upload your signed evaluation PDF first.');
   return;
  }
  void act('externalEvaluationSubmit', {
   placementId: placement.id,
   templateId: template.id,
   finalDtrVersion: num(final, 'version'),
   version: num(response, 'version'),
   answers,
   attachmentFilename: evalFilename,
   attachmentBase64: evalBase64
  });
 };

 return <section className="hte-evaluation-form">
  <div className="hte-section-heading">
   <div>
    <h3>{text(template,'title')} {isExternal && <span className="chip purple" style={{fontSize:11,fontWeight:600}}>Offline / External Track</span>}</h3>
   </div>
   {response && <HteStatus value={text(response,'status')}/>}
  </div>

  <div style={{display:'flex',gap:12,alignItems:'center',flexWrap:'wrap',marginBottom:14}}>
   <a className="secondary hte-download-btn" href={`/api/hte-evaluation-template/${template.id}/file`} target="_blank" rel="noreferrer">
    <Download size={14}/> Download official school evaluation PDF
   </a>
  </div>

  {response?.note && <p className="hte-review-note"><strong>Coordinator note:</strong> {text(response,'note')}</p>}
  <Failure error={error}/>

  {(response?.attachmentFilename || (canStudentUpload && evalFilename)) && (
   <div className="hte-attachment-card">
    <div className="hte-attachment-left">
     <FileText size={22} className="hte-attachment-icon" />
     <div className="hte-attachment-info">
      <span className="small muted">{canStudentUpload ? 'Attached evaluation PDF' : 'Signed school evaluation document'}</span>
      <strong>{evalFilename || text(response, 'attachmentFilename')}</strong>
      <span className="small muted">Uploaded by {text(response, 'submissionChannel') === 'EXTERNAL_UPLOAD' || canStudentUpload ? 'Student (Signed Document)' : 'Direct supervisor submission'}</span>
     </div>
    </div>
    {(evalBase64 || response?.attachmentBase64) && (
     <a href={evalBase64 || text(response, 'attachmentBase64')} download={evalFilename || text(response, 'attachmentFilename')} className="secondary hte-download-btn" target="_blank" rel="noreferrer">
      <Download size={14}/> Download PDF
     </a>
    )}
   </div>
  )}

  {canSupervisorAnswer && (
   <form className="hte-answer-form" onSubmit={(e:FormEvent) => {e.preventDefault();save('SUBMIT');}}>
    {questions.map(q => <label key={q.key}>{q.label}{!q.required && <span className="muted"> (optional)</span>}{q.type === 'text' ? <textarea required={q.required} maxLength={5000} value={answers[q.key] ?? ''} onChange={e => setAnswers({...answers,[q.key]:e.target.value})}/> : <select required={q.required} value={answers[q.key] ?? ''} onChange={e => setAnswers({...answers,[q.key]:e.target.value})}><option value="">Choose an answer</option>{q.options.map(o => <option key={o} value={o}>{o}</option>)}</select>}</label>)}
    <div className="hte-actions">
     <button className="primary" disabled={busy}>{busy ? 'Saving…' : 'Submit evaluation for review'}</button>
     <button className="secondary" type="button" disabled={busy} onClick={() => save('DRAFT')}>Save draft</button>
    </div>
   </form>
  )}

  {canStudentUpload && (
   <form className="hte-answer-form" onSubmit={submitExternalEvaluation}>
    <div className="hte-flow-step">
     <div className="hte-flow-step-header">
      <span className="hte-step-badge">1</span>
      <span className="hte-flow-step-title">Upload Completed & Signed Evaluation Form</span>
     </div>

     <label className="secondary hte-download-btn" style={{cursor: scanningPdf ? 'wait' : 'pointer', width:'fit-content', marginTop:6}}>
      {scanningPdf ? <LoaderCircle size={15} className="spin" /> : <Upload size={15} />}
      {scanningPdf ? 'Scanning PDF & detecting scores…' : evalFilename ? 'Replace evaluation PDF' : 'Upload signed evaluation PDF'}
      <input type="file" accept=".pdf,application/pdf" disabled={scanningPdf} style={{display:'none'}} onChange={e => { const file = e.target.files?.[0]; if (file) void handleExternalPdfSelect(file); }} />
     </label>
    </div>

    {scanningPdf && (
     <div className="hte-scanning-banner">
      <LoaderCircle size={16} className="spin" />
      <span>Analyzing document text and AcroForm fields to detect 1–5 ratings...</span>
     </div>
    )}

    {scanSuccess && (
     <div className="hte-extraction-banner">
      <Sparkles size={16} />
      <span>Ratings automatically detected from your PDF. Review and confirm each score below before submitting.</span>
     </div>
    )}

    <div className="hte-flow-step">
     <div className="hte-flow-step-header">
      <span className="hte-step-badge">2</span>
      <span className="hte-flow-step-title">Review & Confirm Evaluation Ratings</span>
     </div>


     {questions.map(q => (
      <label key={q.key} style={{marginBottom:10}}>
       {q.label}{!q.required && <span className="muted"> (optional)</span>}
       {q.type === 'text' ? (
        <textarea required={q.required} maxLength={5000} value={answers[q.key] ?? ''} onChange={e => setAnswers({...answers,[q.key]:e.target.value})} placeholder="Supervisor recommendations or comments..." />
       ) : (
        <select required={q.required} value={answers[q.key] ?? ''} onChange={e => setAnswers({...answers,[q.key]:e.target.value})}>
         <option value="">Select rating / answer</option>
         {q.options.map(o => <option key={o} value={o}>{o}</option>)}
        </select>
       )}
      </label>
     ))}
    </div>

    <div className="hte-actions">
     <button className="primary" disabled={busy || scanningPdf || !evalBase64}>
      {busy ? 'Submitting…' : 'Submit signed evaluation for coordinator review'}
     </button>
    </div>
   </form>
  )}

  {!canSupervisorAnswer && !canStudentUpload && response && (
   <dl className="hte-answer-receipt">
    {questions.map(q => <div key={q.key}><dt>{q.label}</dt><dd>{answers[q.key] || 'No answer'}</dd></div>)}
   </dl>
  )}

  {!canSupervisorAnswer && !canStudentUpload && !response && (
   <p className="muted">{isExternal ? 'Download the official form above, have your supervisor complete and sign it, then upload the PDF here.' : 'The assigned Industry Partner has not submitted this evaluation.'}</p>
  )}

  {isCoordinator && response?.status === 'SUBMITTED' && (
   <div className="hte-request-decision">
    <div className="hte-coordinator-notice">
     <ShieldCheck size={18} className="text-blue-700" style={{flexShrink:0,marginTop:2}} />
     <div>
      <strong>Coordinator Evaluation Review</strong>
      <p className="small muted">
       {response.attachmentBase64
        ? 'The student submitted a signed physical evaluation from their external host company. Check the ratings against the attached PDF.'
        : 'Review the online evaluation submitted by the supervisor.'}
      </p>
     </div>
    </div>
    <label>Coordinator review note <span className="muted">(optional for approval; required when requesting revision)</span>
     <textarea value={note} onChange={e => setNote(e.target.value)} maxLength={2000} placeholder="Add coordinator comments or approval notes..." />
    </label>
    <div className="hte-actions">
     <button className="primary" disabled={busy} onClick={() => void act('hteEvaluationReview',{ responseId:response.id,version:num(response,'version'),decision:'APPROVED',note })}>
      <Check size={15}/>Approve and release
     </button>
     <button className="secondary" disabled={busy} onClick={() => void act('hteEvaluationReview',{ responseId:response.id,version:num(response,'version'),decision:'REVISION_REQUESTED',note })}>
      Request revision
     </button>
    </div>
   </div>
  )}
 </section>;
}

export function SchoolEvaluationReviews({ data,onRefresh }: { data: Snapshot; onRefresh: () => Promise<void> }) {
 const ownPlacement = data.user.role === 'STUDENT' ? data.placements.find(p => p.studentId === data.user.id) : null;
 const placements = data.user.role === 'STUDENT'
   ? (ownPlacement ? [ownPlacement] : [])
   : data.placements.filter(p => data.hteEvaluationResponses?.some(r => r.placementId === p.id));
return <section className="hte-card"><h2>School Evaluation Responses</h2>{placements.length ? placements.map(p => <details className="hte-placement" key={p.id} open={data.user.role === 'STUDENT'}><summary>{text(p,'studentName')} · {text(p,'companyName')} {num(p,'isExternal') === 1 ? '· (External Industry Partner)' : ''}</summary><HteEvaluationForm data={data} placement={p} onRefresh={onRefresh}/></details>) : <p className="hte-empty">{data.user.role === 'STUDENT' ? 'Your school evaluation will appear here once ready.' : 'No school evaluations have been submitted yet.'}</p>}</section>;
}
