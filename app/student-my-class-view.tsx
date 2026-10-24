'use client';

import React, { useMemo, useState } from 'react';
import {
  Building2,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Check,
  Clock,
  Copy,
  GraduationCap,
  Mail,
  Plus,
  Search,
  ShieldCheck,
  Star,
  Users,
} from 'lucide-react';
import type { Snapshot, Identity, Row } from '@/packages/validation/contracts';
import { toast } from 'sonner';
import styles from './student-my-class-view.module.css';

interface StudentMyClassViewProps {
  data: Snapshot;
  user: Identity;
  ownPlacement?: Row | null;
  openJoinModal: () => void;
  openExternalPlacement?: () => void;
  onViewStudent?: (studentId: string) => void;
  onReachOut?: () => void;
}

interface ClassMemberItem {
  studentId: string;
  studentName: string;
  studentEmail: string;
  yearLevel: number | null;
  classId?: string;
}

const yearLabel = (year: number | null) => year && Number.isInteger(year) && year >= 1 && year <= 6
  ? `${['1st', '2nd', '3rd', '4th', '5th', '6th'][year - 1]} Year`
  : 'Year Level Not Set';

const placementLabel = (status: string) => ({ ACTIVE: 'Active', PLANNED: 'Planned', COMPLETED: 'Completed', AWAITING: 'Awaiting Placement' })[status] ?? 'Status Unavailable';

export default function StudentMyClassView({
  data,
  user,
  ownPlacement,
  openJoinModal,
  openExternalPlacement,
  onReachOut,
}: StudentMyClassViewProps) {
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [copiedCode, setCopiedCode] = useState(false);

  const myClass = data.classes.find(c => c.id === ownPlacement?.classId) ?? data.classes[0];
  const course = data.courses.find(item => item.id === myClass?.courseId);
  const courseName = course?.name ? String(course.name) : '';
  const department = data.departments.find(item => item.id === course?.departmentId);
  const coordinatorUser = data.users.find(item => item.id === myClass?.coordinatorId);
  const coordinatorName = String(coordinatorUser?.name ?? myClass?.coordinatorName ?? 'Assigned practicum coordinator');
  const coordinatorEmail = coordinatorUser?.email ? String(coordinatorUser.email) : '';

  const classmates = useMemo<ClassMemberItem[]>(() => {
    if (!myClass) return [];

    if (data.classMembers && data.classMembers.length > 0) {
      return data.classMembers
        .filter(member => !member.classId || String(member.classId) === String(myClass.id))
        .map(member => ({
          studentId: String(member.studentId ?? ''),
          studentName: String(member.studentName ?? 'Student'),
          studentEmail: member.studentEmail ? String(member.studentEmail) : '',
          yearLevel: member.yearLevel ? Number(member.yearLevel) : null,
          classId: String(myClass.id),
        }));
    }

    return data.placements
      .filter(placement => placement.classId === myClass.id)
      .map(placement => ({
        studentId: String(placement.studentId ?? ''),
        studentName: String(placement.studentName ?? 'Student'),
        studentEmail: placement.studentEmail ? String(placement.studentEmail) : '',
        yearLevel: placement.yearLevel ? Number(placement.yearLevel) : null,
        classId: String(myClass.id),
      }));
  }, [data.classMembers, data.placements, myClass]);

  const classRepId = myClass ? String(myClass.classRepId ?? '') : '';
  const viceClassRepId = myClass ? String(myClass.viceClassRepId ?? '') : '';
  const classRepPeer = classmates.find(member => member.studentId === classRepId);
  const viceRepPeer = classmates.find(member => member.studentId === viceClassRepId);
  const classRepName = classRepPeer?.studentName ?? (myClass?.classRepName ? String(myClass.classRepName) : 'Not assigned');
  const viceClassRepName = viceRepPeer?.studentName ?? (myClass?.viceClassRepName ? String(myClass.viceClassRepName) : 'Not assigned');

  const filteredClassmates = useMemo(() => {
    const query = search.trim().toLocaleLowerCase();

    return classmates.filter(member => !query || member.studentName.toLocaleLowerCase().includes(query));
  }, [classmates, search]);

  const pageSize = 5;
  const pageCount = Math.max(1, Math.ceil(filteredClassmates.length / pageSize));
  const currentPage = Math.min(page, pageCount);
  const pageStart = (currentPage - 1) * pageSize;
  const visibleClassmates = filteredClassmates.slice(pageStart, pageStart + pageSize);
  const pageNumbers = Array.from({ length: pageCount }, (_, index) => index + 1)
    .filter(number => pageCount <= 5 || number === 1 || number === pageCount || Math.abs(number - currentPage) <= 1);
  const hasSearch = Boolean(search.trim());
  const initials = (name?: string | null) => {
    if (!name) return 'PS';
    const parts = name.trim().split(/\s+/);
    if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
    return (parts[0]![0]! + parts[parts.length - 1]![0]!).toUpperCase();
  };

  const copyCode = async () => {
    if (!myClass?.codeLabel) return;

    try {
      await navigator.clipboard.writeText(String(myClass.codeLabel));
      setCopiedCode(true);
      toast.success('Enrollment code copied.');
      window.setTimeout(() => setCopiedCode(false), 2000);
    } catch {
      toast.error('Unable to copy the enrollment code.');
    }
  };

  if (!myClass) {
    return (
      <div className={styles.emptyClass}>
        <div className={styles.emptyIcon} aria-hidden="true"><GraduationCap size={23} /></div>
        <h2>Join Your Practicum Class</h2>
        <button type="button" className={`primary ${styles.primaryAction}`} onClick={openJoinModal}>
          <Plus size={15} aria-hidden="true" />
          Join a class
        </button>
      </div>
    );
  }

  const sectionName = String(myClass.section || 'Your Section');
  const isExternalPlacement = Number(ownPlacement?.isExternal || 0) === 1;
  const needsExternalPlacement = (!ownPlacement || ownPlacement.status !== 'ACTIVE') && openExternalPlacement;

  return (
    <div className={styles.view}>
      <section className={styles.overview} aria-labelledby="student-class-title">
        <div className={styles.overviewHeader}>
          <div className={styles.classIdentity}>
            <span className={styles.classIcon} aria-hidden="true"><GraduationCap size={22} /></span>
            <div className={styles.identityText}>
              <div className={styles.enrollmentState}>Enrolled Section</div>
              <h2 id="student-class-title">{sectionName}</h2>
              <p>{[courseName, String(myClass.name || 'Practicum')].filter(Boolean).join(' · ')}</p>
            </div>
          </div>

          {needsExternalPlacement && (
            <div className={styles.headerActions}>
              <button type="button" className={`primary ${styles.primaryAction}`} onClick={openExternalPlacement}>
                <Building2 size={15} aria-hidden="true" />
                Register External Company
              </button>
            </div>
          )}
        </div>

        <dl className={styles.classDetails}>
          <div className={styles.detailItem}>
            <dt><CalendarDays size={14} aria-hidden="true" /> Academic Period</dt>
            <dd>{String(myClass.period || 'Not set')}</dd>
          </div>
          {department?.name && (
            <div className={styles.detailItem}>
              <dt><Building2 size={14} aria-hidden="true" /> Department</dt>
              <dd>{String(department.name)}</dd>
            </div>
          )}
          {myClass.codeLabel && (
            <div className={styles.detailItem}>
              <dt><Copy size={14} aria-hidden="true" /> Enrollment Code</dt>
              <dd className={styles.codeValue}>
                <code>{String(myClass.codeLabel)}</code>
                <button type="button" className={styles.copyButton} onClick={copyCode} aria-label={copiedCode ? 'Enrollment code copied' : 'Copy enrollment code'}>
                  {copiedCode ? <Check size={14} aria-hidden="true" /> : <Copy size={14} aria-hidden="true" />}
                  <span>{copiedCode ? 'Copied' : 'Copy'}</span>
                </button>
              </dd>
            </div>
          )}
        </dl>
      </section>

      <section className={`${styles.placement} ${!ownPlacement || ownPlacement.status === 'PLANNED' ? styles.placementEmpty : ownPlacement.status !== 'ACTIVE' && ownPlacement.status !== 'COMPLETED' ? styles.placementNeutral : ''}`} aria-label="Training placement">
        <span className={styles.placementIcon} aria-hidden="true">
          {ownPlacement ? <Building2 size={18} /> : <Clock size={18} />}
        </span>
        {ownPlacement ? (
          <div className={styles.placementInfo}>
            <span className={styles.placementLabel}>
              {placementLabel(String(ownPlacement.status ?? ''))} Placement
              {isExternalPlacement && <span className={styles.externalTag}>External</span>}
            </span>
            <strong>{String(ownPlacement.companyName || 'Company not listed')}</strong>
            <span className={styles.placementMeta}>
              {[ownPlacement.externalCompanyLocation || ownPlacement.location, ownPlacement.externalSupervisorName && `Supervisor: ${ownPlacement.externalSupervisorName}`].filter(Boolean).map(String).join(' · ')}
            </span>
          </div>
        ) : (
          <div className={styles.placementInfo}>
            <span className={styles.placementLabel}>Training placement</span>
            <strong>No placement linked</strong>
          </div>
        )}
      </section>

      <div className={styles.classContent}>
        <section className={styles.roster} aria-labelledby="classmates-heading">
          <header className={styles.sectionHeader}>
            <h2 id="classmates-heading">Classmates</h2>
            <span className={styles.rosterCount} role="status">{hasSearch ? `${filteredClassmates.length} of ${classmates.length} Students` : `${classmates.length} Students`}</span>
          </header>

          <div className={styles.rosterToolbar}>
            <label className={styles.searchBox}>
              <Search size={16} aria-hidden="true" />
              <span className={styles.srOnly}>Search classmates by name</span>
              <input
                type="search"
                name="classmate-search"
                placeholder="Search classmates…"
                value={search}
                onChange={event => { setSearch(event.target.value); setPage(1); }}
              />
            </label>
          </div>

          {filteredClassmates.length > 0 ? (
            <ul id="classmates-list" className={styles.rosterList} aria-live="polite">
              {visibleClassmates.map(member => {
                const isRep = member.studentId === classRepId;
                const isVice = member.studentId === viceClassRepId;
                const isSelf = member.studentId === user.id;

                return (
                  <li className={styles.studentRow} key={member.studentId || member.studentName}>
                    <div className={styles.studentIdentity}>
                      <span className={styles.studentAvatar} aria-hidden="true">{initials(member.studentName)}</span>
                      <div className={styles.studentNameBlock}>
                        <div className={styles.nameLine}>
                          <strong>{member.studentName}</strong>
                          {isSelf && <span className={styles.youTag}>You</span>}
                        </div>
                        <span className={styles.studentYear}>{yearLabel(member.yearLevel)}</span>
                        <div className={styles.roles}>
                          {isRep && <span><Star size={12} aria-hidden="true" /> Class representative</span>}
                          {isVice && <span><ShieldCheck size={12} aria-hidden="true" /> Vice representative</span>}
                        </div>
                      </div>
                    </div>
                    {!isSelf && member.studentEmail && (
                      <a className={styles.emailAction} href={`mailto:${member.studentEmail}`} aria-label={`Email ${member.studentName}`}>
                        <Mail size={15} aria-hidden="true" /> Email
                      </a>
                    )}
                  </li>
                );
              })}
            </ul>
          ) : classmates.length === 0 ? (
            <div className={styles.rosterEmpty}>
              <Users size={20} aria-hidden="true" />
              <strong>No classmates listed yet</strong>
            </div>
          ) : (
            <div className={styles.rosterEmpty} role="status">
              <strong>No classmates match your search</strong>
              <button type="button" className={styles.clearSearch} onClick={() => { setSearch(''); setPage(1); }}>
                Clear search
              </button>
            </div>
          )}
          {filteredClassmates.length > 0 && (
            <footer className={styles.directoryFooter}>
              <span className={styles.pageSummary} role="status">
                {filteredClassmates.length === 1 ? '1 Student' : `${pageStart + 1}–${Math.min(pageStart + pageSize, filteredClassmates.length)} of ${filteredClassmates.length} Students`}
              </span>
              {pageCount > 1 && (
                <nav className={styles.pagination} aria-label="Classmates pages">
                  <button type="button" className={styles.pageButton} aria-label="Previous page" aria-controls="classmates-list" disabled={currentPage === 1} onClick={() => setPage(currentPage - 1)}>
                    <ChevronLeft size={16} aria-hidden="true" />
                  </button>
                  <span className={styles.pageNumbers}>
                  {pageNumbers.map((number, index) => (
                    <React.Fragment key={number}>
                      {index > 0 && number - pageNumbers[index - 1]! > 1 && <span className={styles.pageGap} aria-hidden="true">…</span>}
                      <button type="button" className={styles.pageButton} aria-label={`Page ${number}`} aria-current={number === currentPage ? 'page' : undefined} aria-controls="classmates-list" onClick={() => setPage(number)}>{number}</button>
                    </React.Fragment>
                  ))}
                  </span>
                  <span className={styles.mobilePageLabel}>Page {currentPage} of {pageCount}</span>
                  <button type="button" className={styles.pageButton} aria-label="Next page" aria-controls="classmates-list" disabled={currentPage === pageCount} onClick={() => setPage(currentPage + 1)}>
                    <ChevronRight size={16} aria-hidden="true" />
                  </button>
                </nav>
              )}
            </footer>
          )}
        </section>

        <aside className={styles.contacts} aria-labelledby="class-contacts-heading">
          <header className={styles.sectionHeader}>
            <h2 id="class-contacts-heading">Class Contacts</h2>
          </header>
          <ul className={styles.contactList}>
            <ContactRow
              label="Practicum coordinator"
              name={coordinatorName}
              email={coordinatorEmail}
              icon={<GraduationCap size={16} aria-hidden="true" />}
              onReachOut={onReachOut}
            />
            <ContactRow
              label="Class representative"
              name={classRepName}
              email={classRepPeer?.studentEmail}
              icon={<Star size={15} aria-hidden="true" />}
              isYou={Boolean(classRepId) && classRepId === user.id}
            />
            <ContactRow
              label="Vice representative"
              name={viceClassRepName}
              email={viceRepPeer?.studentEmail}
              icon={<ShieldCheck size={15} aria-hidden="true" />}
              isYou={Boolean(viceClassRepId) && viceClassRepId === user.id}
            />
          </ul>
        </aside>
      </div>
    </div>
  );
}

function ContactRow({
  label,
  name,
  email,
  icon,
  isYou = false,
  onReachOut,
}: {
  label: string;
  name: string;
  email?: string | null;
  icon: React.ReactNode;
  isYou?: boolean;
  onReachOut?: () => void;
}) {
  return (
    <li className={styles.contactRow}>
      <span className={styles.contactIcon} aria-hidden="true">{icon}</span>
      <div className={styles.contactIdentity}>
        <span>{label}</span>
        <strong>{name}</strong>
      </div>
      {isYou && <span className={styles.youTag}>You</span>}
      {!isYou && (email || onReachOut) && (
        onReachOut ? (
          <button type="button" className={styles.contactAction} aria-label={`Email ${label.toLowerCase()}`} onClick={onReachOut}>
            <Mail size={15} aria-hidden="true" />
          </button>
        ) : (
          <a className={styles.contactAction} href={`mailto:${email}`} aria-label={`Email ${label.toLowerCase()}`}>
            <Mail size={15} aria-hidden="true" />
          </a>
        )
      )}
    </li>
  );
}
