'use client';

import { useState } from 'react';
import { Search, ChevronLeft, ChevronRight } from 'lucide-react';
import { Table, TableHeader, TableHead, TableBody, TableRow, TableCell } from '@/components/ui/table';
import type { Row, Snapshot } from '@/packages/validation/contracts';

export default function ClassRoster({ data, classId, onViewPlacement, onRemove }: { data: Snapshot; classId: string; onViewPlacement: (placement: Row) => void; onRemove: (member: Row) => void }) {
 const [search, setSearch] = useState('');
 const [page, setPage] = useState(1);
 const members = (data.classMembers ?? []).filter(member => member.classId === classId);
 const term = search.trim().toLowerCase();
 const matches = members.filter(member => [member.studentName, member.studentNumber, member.studentEmail].some(value => String(value ?? '').toLowerCase().includes(term)));
 const pages = Math.max(1, Math.ceil(matches.length / 20));
 const current = Math.min(page, pages);
 const visible = matches.slice((current - 1) * 20, current * 20);
 return <div className="class-roster">
  <div className="class-roster-toolbar"><label className="class-roster-search"><Search size={16}/><input aria-label="Search class members" placeholder="Search name or student number…" value={search} onChange={event => { setSearch(event.target.value); setPage(1); }}/></label><span>{members.length} {members.length === 1 ? 'student' : 'students'} enrolled</span></div>
  <div className="class-roster-table"><Table>
   <TableHeader><TableRow><TableHead>Student</TableHead><TableHead>Placement</TableHead><TableHead>Reported hours</TableHead><TableHead><span className="sr-only">Actions</span></TableHead></TableRow></TableHeader>
   <TableBody>{visible.map(member => {
    const placement = data.placements.find(item => item.id === member.placementId);
    return <TableRow key={member.id}>
     <TableCell><div className="class-roster-student"><strong>{String(member.studentName)}</strong><span>{member.studentNumber ? String(member.studentNumber) : String(member.studentEmail)}{member.yearLevel ? ' · Year ' + member.yearLevel : ''}</span><small className="class-roster-mobile-placement">{member.companyName ? String(member.companyName) : 'No placement yet'}</small></div></TableCell>
     <TableCell>{member.companyName ? <><span>{String(member.companyName)}</span><small className="class-roster-meta">{String(member.placementStatus ?? '').toLowerCase().replaceAll('_', ' ')}</small></> : <span className="class-roster-meta">No placement yet</span>}</TableCell>
     <TableCell>{placement ? (Number(placement.reportedMinutes ?? 0) / 60).toLocaleString(undefined, { maximumFractionDigits: 1 }) : '—'}</TableCell>
     <TableCell><div className="class-roster-actions">{placement && <button type="button" className="textbutton" onClick={() => onViewPlacement(placement)}>View profile</button>}<button type="button" className="textbutton class-roster-remove" aria-label={'Remove ' + member.studentName + ' from class'} onClick={() => onRemove(member)}>Remove</button></div></TableCell>
    </TableRow>;
   })}{!visible.length && <TableRow><TableCell colSpan={4}><div className="class-roster-empty">{term ? <><strong>No students match your search</strong><button type="button" className="textbutton" onClick={() => { setSearch(''); setPage(1); }}>Clear search</button></> : <><strong>No students have joined yet</strong><p>Share this class’s enrollment code so students can join during registration.</p></>}</div></TableCell></TableRow>}</TableBody>
  </Table></div>
  {pages > 1 && <div className="class-roster-pagination"><span>Page {current} of {pages}</span><button type="button" className="secondary" aria-label="Previous roster page" disabled={current === 1} onClick={() => setPage(current - 1)}><ChevronLeft size={16}/></button><button type="button" className="secondary" aria-label="Next roster page" disabled={current === pages} onClick={() => setPage(current + 1)}><ChevronRight size={16}/></button></div>}
 </div>;
}
