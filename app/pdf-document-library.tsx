'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Download, FileText, LoaderCircle, Upload } from 'lucide-react';
import { toast } from 'sonner';
import type { Snapshot } from '@/packages/validation/contracts';
import styles from './pdf-document-library.module.css';

type PdfTemplate = {
  id: string;
  title: string;
  filename: string;
  category: string;
  status: string;
  createdAt: string;
};

const endpoint = '/api/pdf-templates';
const maxSize = 4 * 1024 * 1024;

async function fetchTemplates(signal?: AbortSignal): Promise<PdfTemplate[]> {
  const response = await fetch(endpoint, { cache: 'no-store', signal });
  const result = await response.json() as { templates?: PdfTemplate[]; error?: string };
  if (!response.ok) throw new Error(result.error || 'Could not load PDF templates.');
  return result.templates ?? [];
}

export default function PdfDocumentLibrary({ data }: { data: Snapshot }) {
  const admin = data.user.role === 'SUPER_ADMIN';
  const [templates, setTemplates] = useState<PdfTemplate[] | null>(null);
  const [error, setError] = useState('');
  const [uploading, setUploading] = useState(false);
  const input = useRef<HTMLInputElement>(null);

  const load = useCallback(async (signal?: AbortSignal) => {
    setTemplates(await fetchTemplates(signal));
    setError('');
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    void fetchTemplates(controller.signal)
      .then(rows => { if (!controller.signal.aborted) { setTemplates(rows); setError(''); } })
      .catch(cause => { if (!controller.signal.aborted) setError(cause instanceof Error ? cause.message : 'Could not load PDF templates.'); });
    return () => controller.abort();
  }, [data.user.id]);

  async function upload(file?: File) {
    if (!file) return;
    if (!/\.pdf$/i.test(file.name) || file.size < 8 || file.size > maxSize) {
      toast.error('Choose a PDF file up to 4 MB.');
      return;
    }
    setUploading(true);
    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/pdf', 'X-File-Name': encodeURIComponent(file.name) },
        body: file,
      });
      const result = await response.json() as { title?: string; error?: string };
      if (!response.ok) throw new Error(result.error || 'PDF upload failed.');
      await load();
      toast.success(`${result.title || file.name} uploaded.`);
    } catch (cause) {
      toast.error(cause instanceof Error ? cause.message : 'PDF upload failed.');
    } finally {
      setUploading(false);
      if (input.current) input.current.value = '';
    }
  }

  if (!['SUPER_ADMIN', 'COORDINATOR', 'STUDENT'].includes(data.user.role)) return null;

  return <section className="panel completion-forms-card">
    <header className="panel-head">
      <div>
        <span className="chip blue">Original PDF documents</span>
        <h2>PDF templates</h2>
      </div>
      <FileText size={22}/>
    </header>
    <div className="panel-body">
      {admin && <div className={styles.uploadRow}>
        <label className={`secondary ${styles.uploadButton}`}>
          {uploading ? <LoaderCircle size={15} className="spin"/> : <Upload size={15}/>}
          {uploading ? 'Uploading PDF…' : 'Upload PDF'}
          <input ref={input} type="file" accept=".pdf,application/pdf" disabled={uploading} onChange={event => void upload(event.target.files?.[0])}/>
        </label>
        <span className="small muted">PDF, up to 4 MB. Available to students after upload.</span>
      </div>}
      {error && <div role="alert" className={styles.error}>{error} <button type="button" className="textbutton" onClick={() => void load().catch(cause => setError(cause instanceof Error ? cause.message : 'Could not load PDF templates.'))}>Retry</button></div>}
      {!error && templates === null && <p className="small muted">Loading PDF templates…</p>}
      {!error && templates?.length === 0 && <p className="small muted">No PDF templates have been uploaded yet.</p>}
      {!error && templates && templates.length > 0 && <div className={styles.list}>
        {templates.map(template => <article className={styles.item} key={template.id}>
          <FileText size={19} aria-hidden="true"/>
          <div className={styles.details}>
            <strong>{template.title}</strong>
            <span>{template.filename} · {new Date(template.createdAt).toLocaleDateString('en-PH', { timeZone: 'Asia/Manila' })}{admin && template.status !== 'PUBLISHED' ? ` · ${template.status}` : ''}</span>
          </div>
          <a className="secondary" href={`${endpoint}/${encodeURIComponent(template.id)}/file`} download><Download size={15}/>Download</a>
        </article>)}
      </div>}
    </div>
  </section>;
}
