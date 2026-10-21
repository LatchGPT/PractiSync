'use client';

import { useMemo, useState } from 'react';
import { BookOpen, Building2, GraduationCap, Search, X } from 'lucide-react';
import type { Row, Snapshot } from '../packages/validation/contracts';
import styles from './university-structure-panel.module.css';

function value(row: Row, key: string) {
  return String(row[key] ?? '');
}

export function UniversityStructurePanel({ data }: { data: Snapshot }) {
  const [query, setQuery] = useState('');
  const normalizedQuery = query.trim().toLowerCase();

  const visibleUnits = useMemo(() => data.departments.flatMap((department) => {
    const departmentMatches = `${value(department, 'name')} ${value(department, 'code')}`
      .toLowerCase()
      .includes(normalizedQuery);
    const departmentCourses = data.courses.filter((course) => course.departmentId === department.id);
    const visibleCourses = normalizedQuery && !departmentMatches
      ? departmentCourses.filter((course) => `${value(course, 'name')} ${value(course, 'code')}`.toLowerCase().includes(normalizedQuery))
      : departmentCourses;

    return !normalizedQuery || departmentMatches || visibleCourses.length
      ? [{ department, courses: visibleCourses }]
      : [];
  }), [data.courses, data.departments, normalizedQuery]);

  const visibleCourseCount = visibleUnits.reduce((total, unit) => total + unit.courses.length, 0);

  return <div className={styles.structure}>
    <div className={`notice ${styles.notice}`}>
      <Building2 size={17} aria-hidden="true" />
      <p>Colleges and institutes are recorded as academic units. Each degree program appears under the unit that offers it.</p>
    </div>

    <div className={styles.toolbar}>
      <p className={styles.summary} aria-live="polite">
        {normalizedQuery
          ? `${visibleCourseCount} ${visibleCourseCount === 1 ? 'course' : 'courses'} in ${visibleUnits.length} ${visibleUnits.length === 1 ? 'unit' : 'units'} shown`
          : `${data.courses.length} courses across ${data.departments.length} academic units`}
      </p>
      <div role="search" className={styles.search}>
        <label className="sr-only" htmlFor="university-structure-search">Search courses, academic units, or codes</label>
        <Search size={16} className={styles.searchIcon} aria-hidden="true" />
        <input
          id="university-structure-search"
          className={styles.searchInput}
          type="search"
          placeholder="Search courses, units, or codes"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
        {query && <button type="button" className={styles.clearButton} onClick={() => setQuery('')} aria-label="Clear search">
          <X size={15} aria-hidden="true" />
        </button>}
      </div>
    </div>

    {!data.departments.length ? <div className={styles.empty}>
      <GraduationCap size={22} aria-hidden="true" />
      <h2>No academic units yet</h2>
      <p>Use “Add department or course” to create the first unit.</p>
    </div> : normalizedQuery && !visibleUnits.length ? <div className={styles.empty}>
      <Search size={22} aria-hidden="true" />
      <h2>No matching courses or units</h2>
      <p>Try a different name or code, or clear the search.</p>
    </div> : <div className={styles.grid}>
      {visibleUnits.map(({ department, courses }) => <article className={styles.unit} key={department.id}>
        <header className={styles.unitHeader}>
          <div className={styles.unitHeading}>
            <GraduationCap size={18} aria-hidden="true" />
            <h2>{value(department, 'name')}</h2>
          </div>
          <span className="chip">{value(department, 'code')}</span>
        </header>
        <p className={styles.unitCount}>{courses.length} {courses.length === 1 ? 'course' : 'courses'}</p>
        {courses.length ? <ul className={styles.courseList}>
          {courses.map((course) => <li className={styles.course} key={course.id}>
            <span className={styles.courseIcon}><BookOpen size={15} aria-hidden="true" /></span>
            <div className={styles.courseDetails}>
              <h3 className={styles.courseName}>{value(course, 'name')}</h3>
              <p className={styles.courseCode}>{value(course, 'code')}</p>
            </div>
          </li>)}
        </ul> : <p className={styles.noCourses}>No courses are listed for this unit yet.</p>}
      </article>)}
    </div>}
  </div>;
}
