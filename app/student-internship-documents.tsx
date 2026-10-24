'use client';

import { useEffect, useRef, useState } from 'react';
import { AlertCircle, CheckCircle2, ChevronRight, Clock, FilePenLine, Files, FileText, Search } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import type { Row, Snapshot } from '@/packages/validation/contracts';
import NativeDocumentGenerator from './native-document-generator';
import PdfDocumentLibrary from './pdf-document-library';
import styles from './student-internship-documents.module.css';

const text = (row: Row, key: string) => String(row[key] ?? '');
const statusLabel = (status: string) => ({ APPROVED: 'Approved', PENDING: 'Under Review', REJECTED: 'Correction Needed' })[status] ?? 'Status Unavailable';
const rank = (status: string) => status === 'REJECTED' ? 0 : status === 'PENDING' ? 1 : 2;

function RecordStatus({ status }: { status: string }) {
  const Icon = status === 'APPROVED' ? CheckCircle2 : status === 'REJECTED' ? AlertCircle : Clock;
  return <span className={`${styles.status} ${status === 'APPROVED' ? styles.approved : status === 'REJECTED' ? styles.correction : styles.pending}`}>
    <Icon size={13} aria-hidden="true" />{statusLabel(status)}
  </span>;
}

export default function StudentInternshipDocuments({ data }: { data: Snapshot }) {
  const [workspaceTab, setWorkspaceTab] = useState('records');
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('ALL');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const detailHeading = useRef<HTMLHeadingElement>(null);
  const recordListRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const sync = () => {
      const tab = new URL(window.location.href).searchParams.get('documentTab');
      setWorkspaceTab(tab === 'prepare' || tab === 'pdf' ? tab : 'records');
    };
    const timer = window.setTimeout(sync, 0);
    window.addEventListener('popstate', sync);
    return () => { window.clearTimeout(timer); window.removeEventListener('popstate', sync); };
  }, []);

  function changeTab(value: string) {
    setWorkspaceTab(value);
    const url = new URL(window.location.href);
    url.searchParams.set('documentTab', value);
    window.history.replaceState(null, '', url.pathname + url.search + url.hash);
  }
  const records = [...data.documents].sort((a, b) => rank(text(a, 'status')) - rank(text(b, 'status')) || text(a, 'name').localeCompare(text(b, 'name')));
  const query = search.trim().toLocaleLowerCase();
  const visible = records.filter(record => (filter === 'ALL' || record.status === filter)
    && (!query || `${text(record, 'name')} ${text(record, 'filename')}`.toLocaleLowerCase().includes(query)));
  const selected = visible.find(record => record.id === selectedId) ?? visible[0];
  const approved = records.filter(record => record.status === 'APPROVED').length;
  const hasFilters = Boolean(query) || filter !== 'ALL';

  function select(record: Row) {
    setSelectedId(record.id);
    // The details follow the list on narrow screens; focus makes the change findable.
    requestAnimationFrame(() => detailHeading.current?.focus({ preventScroll: false }));
  }

  return <Tabs value={workspaceTab} onValueChange={changeTab} className={styles.workspace}>
    <TabsList className={styles.tabs} aria-label="Internship document workspace">
      <TabsTrigger value="records"><Files size={16} />Review Records</TabsTrigger>
      <TabsTrigger value="prepare"><FilePenLine size={16} />Prepare Documents</TabsTrigger>
      <TabsTrigger value="pdf"><FileText size={16} />PDF Templates</TabsTrigger>
    </TabsList>

    <TabsContent value="records" className={styles.tabContent}>
      <section className={styles.records} aria-labelledby="document-records-title">
        <header className={styles.header}>
          <div><h2 id="document-records-title">Document Records</h2><span className={styles.sampleLabel}>Sample records</span></div>
          <span className={styles.approvalCount}><CheckCircle2 size={15} aria-hidden="true" />{approved} of {records.length} Approved</span>
        </header>
        <div className={styles.toolbar}>
          <label className={styles.search}>
            <Search size={16} aria-hidden="true" /><span className={styles.srOnly}>Search document records</span>
            <input type="search" name="document-search" placeholder="Search documents…" value={search} onChange={event => setSearch(event.target.value)} />
          </label>
          <label className={styles.filter}>Status
            <select value={filter} onChange={event => setFilter(event.target.value)}>
              <option value="ALL">All Statuses</option><option value="REJECTED">Correction Needed</option>
              <option value="PENDING">Under Review</option><option value="APPROVED">Approved</option>
            </select>
          </label>
        </div>
        {visible.length ? <div className={styles.recordLayout}>
          <div className={styles.recordList} ref={recordListRef}>
            <p className={styles.resultCount} role="status">{visible.length} {visible.length === 1 ? 'Record' : 'Records'}{hasFilters ? ` of ${records.length}` : ''}</p>
            <ul>
              {visible.map(record => <li key={record.id}>
                <button type="button" className={styles.recordButton} aria-label={`View ${text(record, 'name') || 'document'} details, ${statusLabel(text(record, 'status'))}`} aria-pressed={selected?.id === record.id} aria-controls="document-review-details" onClick={() => select(record)}>
                  <span className={styles.fileIcon}><FileText size={19} aria-hidden="true" /></span>
                  <span className={styles.recordIdentity}><strong>{text(record, 'name') || 'Untitled Document'}</strong><RecordStatus status={text(record, 'status')} /></span>
                  <ChevronRight size={16} className={styles.chevron} aria-hidden="true" />
                </button>
              </li>)}
            </ul>
          </div>
          {selected && <section id="document-review-details" className={styles.details} aria-labelledby="document-detail-title">
            <div className={styles.detailTitle}><span className={styles.detailIcon}><FileText size={23} aria-hidden="true" /></span><RecordStatus status={text(selected, 'status')} /></div>
            <h3 id="document-detail-title" tabIndex={-1} ref={detailHeading}>{text(selected, 'name') || 'Untitled Document'}</h3>
            <dl className={styles.metadata}>
              <div><dt>Filename</dt><dd>{text(selected, 'filename') || 'Not provided'}</dd></div>
              <div><dt>Version</dt><dd>{text(selected, 'version') || 'Not provided'}</dd></div>
            </dl>
            <div className={`${styles.reviewNote} ${selected.status === 'REJECTED' ? styles.reviewCorrection : ''}`}>
              <h4>{selected.status === 'REJECTED' ? 'Coordinator Feedback' : 'Review Status'}</h4>
              <p>{text(selected, 'reason') || (selected.status === 'APPROVED' ? 'This document record is approved.' : selected.status === 'PENDING' ? 'Awaiting coordinator review.' : 'No review note is available.')}</p>
            </div>
            <p className={styles.sampleNotice}><AlertCircle size={14} aria-hidden="true" />Sample metadata only. No document file is attached to this record.</p>
            <button type="button" className={`secondary ${styles.backToList}`} onClick={() => recordListRef.current?.querySelector('button')?.focus()}>Back to Documents</button>
          </section>}
        </div> : <div className={styles.empty} role="status">
          <Files size={28} aria-hidden="true" /><h3>{records.length ? 'No Matching Documents' : 'No Document Records Yet'}</h3>
          {hasFilters ? <button type="button" className="secondary" onClick={() => { setSearch(''); setFilter('ALL'); }}>Clear Search & Filters</button> : <p>Available records will appear here when added by your coordinator.</p>}
        </div>}
      </section>
    </TabsContent>
    <TabsContent value="prepare" className={`${styles.tabContent} ${styles.tools}`}><NativeDocumentGenerator data={data} /></TabsContent>
    <TabsContent value="pdf" className={`${styles.tabContent} ${styles.tools}`}><PdfDocumentLibrary data={data} /></TabsContent>
  </Tabs>;
}
