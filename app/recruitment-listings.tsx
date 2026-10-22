'use client';

import { useRef, useSyncExternalStore } from 'react';
import { ArrowLeft, BriefcaseBusiness, Building2, Check, GraduationCap, MapPin, Search, ShieldCheck, Users, X } from 'lucide-react';
import type { Row, Snapshot } from '@/packages/validation/contracts';
import { recruitmentCourseIds } from '@/packages/validation/recruitment';

const text = (row: Row | undefined, key: string) => String(row?.[key] ?? '');
const subscribe = (listener: () => void) => { window.addEventListener('popstate', listener); return () => window.removeEventListener('popstate', listener); };
const currentQuery = () => window.location.search;
const serverQuery = () => '';

export default function RecruitmentListings({ data, onApply, onViewApplication }: { data: Snapshot; onApply: (job: Row) => void; onViewApplication: (application: Row) => void }) {
 const query = useSyncExternalStore(subscribe, currentQuery, serverQuery);
 const params = new URLSearchParams(query);
 const program = params.get('program') ?? '', industry = params.get('industry') ?? '', locationFilter = params.get('location') ?? '', search = params.get('q') ?? '';
 const detail = useRef<HTMLElement>(null);
 const published = data.jobs.filter(job => job.status === 'PUBLISHED' && data.companies.some(company => company.id === job.companyId && company.status === 'APPROVED'));
 const industries = [...new Set(published.map(job => text(job,'industry')).filter(Boolean))].sort();
 const locations = [...new Set(published.map(job => text(job,'location')).filter(Boolean))].sort();
 const matches = published.filter(job => (!program || recruitmentCourseIds(job).includes(program)) && (!industry || text(job,'industry') === industry) && (!locationFilter || text(job,'location') === locationFilter) && (!search || [text(job,'title'),text(job,'companyName'),text(job,'skills'),text(job,'description')].some(value => value.toLowerCase().includes(search.toLowerCase()))));
 const pages = Math.max(1, Math.ceil(matches.length / 20));
 const page = Math.max(1, Math.min(pages, Number.parseInt(params.get('page') ?? '1',10) || 1));
 const visibleMatches = matches.slice((page - 1) * 20, page * 20);
 const selected = visibleMatches.find(job => job.id === params.get('job')) ?? visibleMatches[0];
 const application = selected && data.applications.find(item => item.jobId === selected.id && item.studentId === data.user.id);
 const eligible = selected && recruitmentCourseIds(selected).includes(data.user.courseId ?? '');
 const company = selected && data.companies.find(item => item.id === selected.companyId);
 const filtered = !!(program || industry || locationFilter || search);
 function update(values: Record<string, string | null>, replace = false) {
  const next = new URL(window.location.href);
  Object.entries(values).forEach(([key,value]) => { if (value) next.searchParams.set(key,value); else next.searchParams.delete(key); });
  if (!Object.hasOwn(values,'job')) next.searchParams.delete('job');
  if (!Object.hasOwn(values,'page') && !Object.hasOwn(values,'job')) next.searchParams.delete('page');
  window.history[replace ? 'replaceState' : 'pushState'](null,'',next.pathname + next.search);
  window.dispatchEvent(new PopStateEvent('popstate'));
 }
 function programNames(job: Row) { return recruitmentCourseIds(job).map(id => data.courses.find(course => course.id === id)).filter((course): course is Row => !!course); }
 return <section className="recruitment" aria-label="OJT opportunities">
  <div className="recruitment-intro"><div><h2>Find your next training opportunity</h2><p>Explore approved Industry Partners and opportunities for your program.</p></div><span><ShieldCheck size={16}/>University-approved posts</span></div>
  <nav className="recruitment-categories" aria-label="Browse by program"><button type="button" className={!program ? 'active' : ''} aria-pressed={!program} onClick={() => update({ program:null })}>All programs <span>{published.length}</span></button>{data.courses.filter(course => published.some(job => recruitmentCourseIds(job).includes(course.id))).map(course => <button type="button" key={course.id} className={program === course.id ? 'active' : ''} aria-pressed={program === course.id} title={text(course,'name')} onClick={() => update({ program:course.id })}>{text(course,'code')}<span>{published.filter(job => recruitmentCourseIds(job).includes(course.id)).length}</span></button>)}</nav>
  <div className="recruitment-filters"><label className="recruitment-search">Search opportunities<span><Search size={16}/><input type="search" value={search} placeholder="Position, partner, or skill…" onChange={event => update({ q:event.target.value },true)}/></span></label><label>Industry<select value={industry} onChange={event => update({ industry:event.target.value })}><option value="">All industries</option>{industries.map(value => <option key={value}>{value}</option>)}</select></label><label>Location / arrangement<select value={locationFilter} onChange={event => update({ location:event.target.value })}><option value="">All locations</option>{locations.map(value => <option key={value}>{value}</option>)}</select></label>{filtered && <button type="button" className="textbutton" onClick={() => update({ program:null, industry:null, location:null, q:null })}><X size={14}/>Clear filters</button>}</div>
  <p className="recruitment-count" aria-live="polite">{matches.length} {matches.length === 1 ? 'opportunity' : 'opportunities'}{filtered ? ' matching your filters' : ' open for applications'}</p>
  {matches.length ? <div className="recruitment-layout"><div className="recruitment-results-column"><div className="recruitment-results" aria-label="Available opportunities">{visibleMatches.map(job => {
   const applied = data.applications.some(item => item.jobId === job.id && item.studentId === data.user.id);
   return <button type="button" key={job.id} className={`recruitment-result ${selected?.id === job.id ? 'selected' : ''}`} aria-pressed={selected?.id === job.id} aria-controls="recruitment-details" onClick={() => { update({ job:job.id }); if (window.matchMedia('(max-width: 1050px)').matches) detail.current?.focus(); }}><span className="recruitment-result-company"><Building2 size={15}/>{text(job,'companyName')}</span><strong>{text(job,'title')}</strong><span className="recruitment-result-location"><MapPin size={14}/>{text(job,'location')}</span><span className="recruitment-result-programs">{programNames(job).map(course => text(course,'code')).join(' · ')}</span><span className="recruitment-result-bottom"><span>{job.openings} {Number(job.openings) === 1 ? 'intern needed' : 'interns needed'}</span>{applied && <span><Check size={13}/>Applied</span>}</span></button>;
  })}</div>{pages > 1 && <nav className="recruitment-pagination" aria-label="Opportunity pages"><button type="button" className="secondary" disabled={page === 1} onClick={() => update({page:String(page - 1)})}>Previous</button><span>Page {page} of {pages}</span><button type="button" className="secondary" disabled={page === pages} onClick={() => update({page:String(page + 1)})}>Next</button></nav>}</div>{selected && <article className="recruitment-details" id="recruitment-details" ref={detail} tabIndex={-1} aria-label={text(selected,'title')}>
   <button type="button" className="textbutton recruitment-back" onClick={() => document.querySelector<HTMLButtonElement>('.recruitment-result.selected')?.focus()}><ArrowLeft size={15}/>Back to opportunities</button>
   <div className="recruitment-company"><span className="recruitment-company-mark"><Building2 size={25}/></span><div><strong>{text(selected,'companyName')}</strong><span>{text(selected,'industry')}</span></div></div>
   <h2>{text(selected,'title')}</h2><div className="recruitment-facts"><span><MapPin size={16}/>{text(selected,'location')}</span><span><Users size={16}/>{selected.openings} {Number(selected.openings) === 1 ? 'intern needed' : 'interns needed'}</span><span><ShieldCheck size={16}/>Approved Industry Partner</span></div>
   {data.user.role === 'STUDENT' && <div className="recruitment-apply">{application ? <><span className="chip green"><Check size={13}/>Application {text(application,'status').toLowerCase().replaceAll('_',' ')}</span><button type="button" className="secondary" onClick={() => onViewApplication(application)}>View your application</button></> : <><button type="button" className="primary" disabled={!eligible} onClick={() => onApply(selected)}>Apply for this opportunity</button>{!eligible && <p className="small muted">This opportunity accepts the programs listed below. Browse your program to find eligible posts.</p>}</>}</div>}
   <section><h3><GraduationCap size={18}/>Required programs / courses</h3><ul>{programNames(selected).map(course => <li key={course.id}>{text(course,'code')} · {text(course,'name')}</li>)}</ul></section>
   <section><h3>Responsibilities and requirements</h3><p className="recruitment-description">{text(selected,'description')}</p></section>
   <section><h3>Required skills</h3><div className="recruitment-skills">{text(selected,'skills').split(',').filter(value => value.trim()).map((skill,index) => <span key={`${index}:${skill}`}>{skill.trim()}</span>)}</div></section>
   <section><h3>About {text(selected,'companyName')}</h3><p className="recruitment-description">{text(company,'description') || 'Company information has not been provided.'}</p></section>
  </article>}</div> : <div className="recruitment-empty"><BriefcaseBusiness size={32}/><h3>{published.length ? 'No opportunities match these filters' : 'No approved opportunities yet'}</h3><p>{published.length ? 'Try another program, industry, or location to see more opportunities.' : 'New opportunities appear here after company and posting approval.'}</p>{filtered && <button type="button" className="secondary" onClick={() => update({ program:null, industry:null, location:null, q:null })}>Show all opportunities</button>}</div>}
 </section>;
}
