'use client';

import { useRef, useState, useSyncExternalStore } from 'react';
import { ArrowLeft, ArrowRight, BriefcaseBusiness, Building2, Check, GraduationCap, MapPin, Search, ShieldCheck, Users, X } from 'lucide-react';
import type { Row, Snapshot } from '@/packages/validation/contracts';
import { recruitmentCourseIds } from '@/packages/validation/recruitment';

const text = (row: Row | undefined, key: string) => String(row?.[key] ?? '');
const subscribe = (listener: () => void) => { window.addEventListener('popstate', listener); return () => window.removeEventListener('popstate', listener); };
const currentQuery = () => window.location.search;
const serverQuery = () => '';
const postedDate = (job: Row) => {
 const date = new Date(text(job,'createdAt'));
 return Number.isNaN(date.getTime()) ? '' : date.toLocaleDateString('en-PH',{month:'short',day:'numeric',year:'numeric',timeZone:'Asia/Manila'});
};

function InternshipSearch({search,location,locations,onSearch}:{search:string;location:string;locations:string[];onSearch:(search:string,location:string)=>void}) {
 const [keyword,setKeyword] = useState(search);
 const [place,setPlace] = useState(location);
 return <form className="internship-search-form" onSubmit={event=>{event.preventDefault();onSearch(keyword.trim(),place);}}>
  <label><span>What</span><div><Search size={18} aria-hidden="true"/><input type="search" name="internship-keyword" value={keyword} onChange={event=>setKeyword(event.target.value)} placeholder="Position, company, or skill"/></div></label>
  <label><span>Where</span><div><MapPin size={18} aria-hidden="true"/><select name="internship-location" value={place} onChange={event=>setPlace(event.target.value)}><option value="">All Locations</option>{locations.map(item=><option key={item}>{item}</option>)}</select></div></label>
  <button type="submit" className="primary"><Search size={17}/>Find Internships</button>
 </form>;
}

export default function RecruitmentListings({ data, onApply, onViewApplication }: { data: Snapshot; onApply: (job: Row) => void; onViewApplication: (application: Row) => void }) {
 const query = useSyncExternalStore(subscribe, currentQuery, serverQuery);
 const params = new URLSearchParams(query);
 const program = params.get('program') ?? '', industry = params.get('industry') ?? '', locationFilter = params.get('location') ?? '', search = params.get('q') ?? '';
 const student = data.user.role === 'STUDENT';
 const courseOnly = params.get('matched') === '1';
 const sort = params.get('sort') === 'oldest' ? 'oldest' : 'newest';
 const detail = useRef<HTMLElement>(null);
 const published = data.jobs.filter(job => job.status === 'PUBLISHED' && data.companies.some(company => company.id === job.companyId && company.status === 'APPROVED'));
 const industries = [...new Set(published.map(job => text(job,'industry')).filter(Boolean))].sort();
 const locations = [...new Set(published.map(job => text(job,'location')).filter(Boolean))].sort();
 const matches = published.filter(job => (!courseOnly || recruitmentCourseIds(job).includes(data.user.courseId ?? '')) && (!program || recruitmentCourseIds(job).includes(program)) && (!industry || text(job,'industry') === industry) && (!locationFilter || text(job,'location') === locationFilter) && (!search || [text(job,'title'),text(job,'companyName'),text(job,'skills'),text(job,'description')].some(value => value.toLowerCase().includes(search.trim().toLowerCase())))).sort((a,b)=>{const comparison = text(b,'createdAt').localeCompare(text(a,'createdAt'));return sort === 'oldest' ? -comparison : comparison;});
 const pages = Math.max(1, Math.ceil(matches.length / 20));
 const page = Math.max(1, Math.min(pages, Number.parseInt(params.get('page') ?? '1',10) || 1));
 const visibleMatches = matches.slice((page - 1) * 20, page * 20);
 const selected = visibleMatches.find(job => job.id === params.get('job')) ?? visibleMatches[0];
 const application = selected && data.applications.find(item => item.jobId === selected.id && item.studentId === data.user.id);
 const eligible = selected && recruitmentCourseIds(selected).includes(data.user.courseId ?? '');
 const company = selected && data.companies.find(item => item.id === selected.companyId);
 const filtered = !!(program || industry || locationFilter || search || courseOnly);
 function update(values: Record<string, string | null>, replace = false) {
  const next = new URL(window.location.href);
  Object.entries(values).forEach(([key,value]) => { if (value) next.searchParams.set(key,value); else next.searchParams.delete(key); });
  if (!Object.hasOwn(values,'job')) next.searchParams.delete('job');
  if (!Object.hasOwn(values,'page') && !Object.hasOwn(values,'job')) next.searchParams.delete('page');
  window.history[replace ? 'replaceState' : 'pushState'](null,'',next.pathname + next.search);
  window.dispatchEvent(new PopStateEvent('popstate'));
 }
 function programNames(job: Row) { return recruitmentCourseIds(job).map(id => data.courses.find(course => course.id === id)).filter((course): course is Row => !!course); }
 return <section className={`recruitment ${student ? 'student-internship-board' : ''} ${params.get('job') ? 'internship-detail-open' : ''}`} aria-label="Internship Opportunities">
  {student ? <>
   <header className="internship-search-banner">
    <div className="internship-search-heading"><div><h2>Your Next Step Starts Here</h2><p>Find an internship that fits your course.</p></div><span><ShieldCheck size={16}/>Approved Industry Partners</span></div>
    <InternshipSearch key={`${search}:${locationFilter}`} search={search} location={locationFilter} locations={locations} onSearch={(keyword,place)=>update({q:keyword,location:place})}/>
   </header>
   <div className="internship-filter-row">
    <label>Program<select value={program} onChange={event=>update({program:event.target.value})}><option value="">All Programs</option>{data.courses.filter(course=>published.some(job=>recruitmentCourseIds(job).includes(course.id))).map(course=><option key={course.id} value={course.id}>{text(course,'code')} — {text(course,'name')}</option>)}</select></label>
    <label>Industry<select value={industry} onChange={event=>update({industry:event.target.value})}><option value="">All Industries</option>{industries.map(value=><option key={value}>{value}</option>)}</select></label>
    <label className="internship-course-toggle"><input type="checkbox" checked={courseOnly} disabled={!data.user.courseId} onChange={event=>update({matched:event.target.checked?'1':null})}/>Accepts My Course</label>
    {filtered && <button type="button" className="textbutton" onClick={()=>update({program:null,industry:null,location:null,q:null,matched:null})}><X size={14}/>Reset Filters</button>}
   </div>
  </> : <>  <div className="recruitment-intro"><div><h2>Find Your Next Training Opportunity</h2></div><span><ShieldCheck size={16}/>University-approved posts</span></div>
  <nav className="recruitment-categories" aria-label="Browse by program"><button type="button" className={!program ? 'active' : ''} aria-pressed={!program} onClick={() => update({ program:null })}>All programs <span>{published.length}</span></button>{data.courses.filter(course => published.some(job => recruitmentCourseIds(job).includes(course.id))).map(course => <button type="button" key={course.id} className={program === course.id ? 'active' : ''} aria-pressed={program === course.id} title={text(course,'name')} onClick={() => update({ program:course.id })}>{text(course,'code')}<span>{published.filter(job => recruitmentCourseIds(job).includes(course.id)).length}</span></button>)}</nav>
  <div className="recruitment-filters"><label className="recruitment-search">Search opportunities<span><Search size={16}/><input type="search" value={search} placeholder="Position, partner, or skill…" onChange={event => update({ q:event.target.value },true)}/></span></label><label>Industry<select value={industry} onChange={event => update({ industry:event.target.value })}><option value="">All industries</option>{industries.map(value => <option key={value}>{value}</option>)}</select></label><label>Location / arrangement<select value={locationFilter} onChange={event => update({ location:event.target.value })}><option value="">All locations</option>{locations.map(value => <option key={value}>{value}</option>)}</select></label>{filtered && <button type="button" className="textbutton" onClick={() => update({ program:null, industry:null, location:null, q:null })}><X size={14}/>Clear filters</button>}</div>
</>}
  <div className="internship-results-heading">
  <p className="recruitment-count" aria-live="polite">{matches.length} {matches.length === 1 ? 'opportunity' : 'opportunities'}{filtered ? ' matching your filters' : ' open for applications'}</p>
  {student && <label className="internship-sort">Sort By<select value={sort} onChange={event=>update({sort:event.target.value})}><option value="newest">Newest First</option><option value="oldest">Oldest First</option></select></label>}</div>
  {matches.length ? <div className="recruitment-layout"><div className="recruitment-results-column"><div className="recruitment-results" aria-label="Available opportunities">{visibleMatches.map(job => {
   const applied = data.applications.some(item => item.jobId === job.id && item.studentId === data.user.id);
   return <button type="button" key={job.id} className={`recruitment-result ${selected?.id === job.id ? 'selected' : ''}`} aria-pressed={selected?.id === job.id} aria-controls="recruitment-details" onClick={() => { update({ job:job.id }); requestAnimationFrame(()=>{if (window.matchMedia('(max-width: 1050px)').matches) {detail.current?.focus({preventScroll:true});detail.current?.scrollIntoView({block:'start',behavior:'auto'});}}); }}><span className="recruitment-result-company"><span className="internship-company-avatar"><Building2 size={18}/></span>{text(job,'companyName')}</span><strong>{text(job,'title')}</strong><span className="recruitment-result-location"><MapPin size={14}/>{text(job,'location')}</span><span className="recruitment-result-programs">{programNames(job).map(course => text(course,'code')).join(' · ')}</span>{student && <span className="internship-result-excerpt">{text(job,'description')}</span>}<span className="recruitment-result-bottom"><span>{job.openings} {Number(job.openings) === 1 ? 'intern needed' : 'interns needed'}</span>{applied ? <span><Check size={13}/>Applied</span> : student && recruitmentCourseIds(job).includes(data.user.courseId ?? '') ? <span className="internship-course-match"><GraduationCap size={13}/>Accepts Your Course</span> : null}</span>{student && postedDate(job) && <span className="internship-posted-date">Posted {postedDate(job)}</span>}</button>;
  })}</div>{pages > 1 && <nav className="recruitment-pagination" aria-label="Opportunity pages"><button type="button" className="secondary" disabled={page === 1} onClick={() => update({page:String(page - 1)})}>Previous</button><span>Page {page} of {pages}</span><button type="button" className="secondary" disabled={page === pages} onClick={() => update({page:String(page + 1)})}>Next</button></nav>}</div>{selected && <article className="recruitment-details" id="recruitment-details" ref={detail} tabIndex={-1} aria-label={text(selected,'title')}>
   <button type="button" className="textbutton recruitment-back" onClick={() => {update({job:null,page:String(page)},true);requestAnimationFrame(()=>document.querySelector<HTMLButtonElement>('.recruitment-result.selected')?.focus());}}><ArrowLeft size={15}/>Back to Results</button>
   <div className="recruitment-company"><span className="recruitment-company-mark"><Building2 size={25}/></span><div><strong>{text(selected,'companyName')}</strong><span>{text(selected,'industry')}</span></div></div>
   <h2>{text(selected,'title')}</h2><div className="recruitment-facts"><span><MapPin size={16}/>{text(selected,'location')}</span><span><Users size={16}/>{selected.openings} {Number(selected.openings) === 1 ? 'intern needed' : 'interns needed'}</span><span><ShieldCheck size={16}/>Approved Industry Partner</span></div>
   {data.user.role === 'STUDENT' && <div className="recruitment-apply">{application ? <><span className="chip green"><Check size={13}/>Application {text(application,'status').toLowerCase().replaceAll('_',' ')}</span><button type="button" className="secondary" onClick={() => onViewApplication(application)}>View your application</button></> : <><button type="button" className="primary" disabled={!eligible} onClick={() => onApply(selected)}>Apply for Internship<ArrowRight size={16}/></button>{!eligible && <p className="internship-ineligible">This opportunity accepts the programs listed below. Your current course is not included.</p>}</>}</div>}
   <section><h3><GraduationCap size={18}/>Required Programs / Courses</h3><ul>{programNames(selected).map(course => <li key={course.id}>{text(course,'code')} · {text(course,'name')}</li>)}</ul></section>
   <section><h3>Responsibilities and Requirements</h3><p className="recruitment-description">{text(selected,'description')}</p></section>
   <section><h3>Required Skills</h3><div className="recruitment-skills">{text(selected,'skills').split(',').filter(value => value.trim()).map((skill,index) => <span key={`${index}:${skill}`}>{skill.trim()}</span>)}</div></section>
   <section><h3>About {text(selected,'companyName')}</h3><p className="recruitment-description">{text(company,'description') || 'Company information has not been provided.'}</p></section>
  </article>}</div> : <div className="recruitment-empty"><BriefcaseBusiness size={32}/><h3>{published.length ? 'No Opportunities Match These Filters' : 'No Approved Opportunities Yet'}</h3>{filtered && <button type="button" className="secondary" onClick={() => update({ program:null, industry:null, location:null, q:null, matched:null })}>Show all opportunities</button>}</div>}
 </section>;
}
