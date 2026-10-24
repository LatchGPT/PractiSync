'use client';

import { useMemo, useState } from 'react';
import { BookOpen, Building2, Pencil, Plus, Search, X } from 'lucide-react';
import type { Row, Snapshot } from '../packages/validation/contracts';
import styles from './university-structure-panel.module.css';

type UniversityStructurePanelProps = {
  data: Snapshot;
  canManage: boolean;
  onCreateDepartment: () => void;
  onCreateCourse: (departmentId?: string) => void;
  onEditDepartment: (department: Row) => void;
  onEditCourse: (course: Row) => void;
};

function value(row: Row, key: string) {
  return String(row[key] ?? '');
}

function courseCount(count: number) {
  return count + ' ' + (count === 1 ? 'course' : 'courses');
}

export function UniversityStructurePanel({
  data,
  canManage,
  onCreateDepartment,
  onCreateCourse,
  onEditDepartment,
  onEditCourse,
}: UniversityStructurePanelProps) {
  const [query, setQuery] = useState('');
  const [selectedUnit, setSelectedUnit] = useState('ALL');
  const normalizedQuery = query.trim().toLowerCase();

  const visibleUnits = useMemo(() => data.departments
    .filter((department) => selectedUnit === 'ALL' || department.id === selectedUnit)
    .map((department) => {
      const unitCourses = data.courses.filter((course) => course.departmentId === department.id);
      const departmentMatches = (value(department, 'name') + ' ' + value(department, 'code'))
        .toLowerCase()
        .includes(normalizedQuery);
      const visibleCourses = normalizedQuery && !departmentMatches
        ? unitCourses.filter((course) => (value(course, 'name') + ' ' + value(course, 'code')).toLowerCase().includes(normalizedQuery))
        : unitCourses;

      return { department, courses: visibleCourses, departmentMatches };
    })
    .filter(({ courses, departmentMatches }) => !normalizedQuery || departmentMatches || courses.length > 0),
  [data.courses, data.departments, normalizedQuery, selectedUnit]);

  const visibleCourseCount = visibleUnits.reduce((total, unit) => total + unit.courses.length, 0);
  const selectedDepartment = data.departments.find((department) => department.id === selectedUnit);
  const summary = normalizedQuery
    ? visibleCourseCount + ' ' + (visibleCourseCount === 1 ? 'course' : 'courses') + ' shown in ' + visibleUnits.length + ' ' + (visibleUnits.length === 1 ? 'unit' : 'units')
    : selectedDepartment
      ? courseCount(data.courses.filter((course) => course.departmentId === selectedDepartment.id).length) + ' in ' + value(selectedDepartment, 'name')
      : data.courses.length + ' courses across ' + data.departments.length + ' academic units';

  return (
    <div className={styles.structure}>
      <aside className={styles.unitIndex} aria-labelledby="university-unit-index-title">
        <header className={styles.unitIndexHeader}>
          <div>
            <h2 id="university-unit-index-title">Academic units</h2>
            <p>{data.departments.length} colleges and institutes</p>
          </div>
          {canManage && (
            <button type="button" className={styles.addUnitButton} onClick={onCreateDepartment}>
              <Plus size={15} aria-hidden="true" />
              <span>Add unit</span>
            </button>
          )}
        </header>

        <nav className={styles.unitNavigation} aria-label="Filter courses by academic unit">
          <ul className={styles.unitList}>
            <li>
              <button
                type="button"
                className={styles.unitButton}
                aria-pressed={selectedUnit === 'ALL'}
                onClick={() => setSelectedUnit('ALL')}
              >
                <span className={styles.unitButtonMain}>
                  <span className={styles.unitName}>All units</span>
                  <span className={styles.unitCode}>RTU</span>
                </span>
                <span className={styles.unitCount}>{data.departments.length}</span>
              </button>
            </li>
            {data.departments.map((department) => {
              const count = data.courses.filter((course) => course.departmentId === department.id).length;
              return (
                <li key={department.id}>
                  <button
                    type="button"
                    className={styles.unitButton}
                    aria-pressed={selectedUnit === department.id}
                    onClick={() => setSelectedUnit(department.id)}
                  >
                    <span className={styles.unitButtonMain}>
                      <span className={styles.unitName}>{value(department, 'name')}</span>
                      <span className={styles.unitCode}>{value(department, 'code')}</span>
                    </span>
                    <span className={styles.unitCount}>{count}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        </nav>


      </aside>

      <section className={styles.catalog} aria-labelledby="university-catalog-title">
        <header className={styles.catalogHeader}>
          <div className={styles.catalogHeading}>
            <div className={styles.catalogTitleLockup}>
              <span className={styles.catalogMark} aria-hidden="true"><BookOpen size={17} /></span>
              <h2 id="university-catalog-title">{selectedDepartment ? value(selectedDepartment, 'name') : 'Course register'}</h2>
            </div>
            <p aria-live="polite">{summary}</p>
          </div>

          <div className={styles.catalogTools}>
            <label className={styles.mobileUnitFilter}>
              <span>Academic unit</span>
              <select value={selectedUnit} onChange={(event) => setSelectedUnit(event.target.value)}>
                <option value="ALL">All units</option>
                {data.departments.map((department) => (
                  <option key={department.id} value={department.id}>
                    {value(department, 'name')}
                  </option>
                ))}
              </select>
            </label>

            <div className={styles.searchGroup}>
              <label htmlFor="university-structure-search">Search courses</label>
              <div className={styles.searchField}>
                <Search size={16} className={styles.searchIcon} aria-hidden="true" />
                <input
                  id="university-structure-search"
                  className={styles.searchInput}
                  type="search"
                  placeholder="Course, unit, or code"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                />
                {query && (
                  <button type="button" className={styles.clearButton} onClick={() => setQuery('')} aria-label="Clear course search">
                    <X size={15} aria-hidden="true" />
                  </button>
                )}
              </div>
            </div>

            {canManage && data.departments.length > 0 && (
              <button
                type="button"
                className={'primary ' + styles.addCourseButton}
                onClick={() => onCreateCourse(selectedUnit === 'ALL' ? undefined : selectedUnit)}
              >
                <Plus size={15} aria-hidden="true" />
                <span>Add course</span>
              </button>
            )}
          </div>
        </header>

        {!data.departments.length ? (
          <div className={styles.emptyState}>
            <Building2 size={22} aria-hidden="true" />
            <h3>No academic units yet</h3>

            {canManage && (
              <button type="button" className="primary" onClick={onCreateDepartment}>
                <Plus size={15} aria-hidden="true" />
                Add academic unit
              </button>
            )}
          </div>
        ) : normalizedQuery && !visibleUnits.length ? (
          <div className={styles.emptyState}>
            <Search size={22} aria-hidden="true" />
            <h3>No matching courses or units</h3>

            <button
              type="button"
              className={styles.clearFilters}
              onClick={() => {
                setQuery('');
                setSelectedUnit('ALL');
              }}
            >
              Clear search and unit filter
            </button>
          </div>
        ) : (
          <div className={styles.groups}>
            {visibleUnits.map(({ department, courses }) => (
              <section className={styles.unitGroup} key={department.id} aria-labelledby={'unit-' + department.id}>
                <header className={styles.groupHeader}>
                  <div className={styles.groupHeading}>
                    <div className={styles.groupNameLine}>
                      <h3 id={'unit-' + department.id}>{value(department, 'name')}</h3>
                      <span className={styles.groupCode}>{value(department, 'code')}</span>
                    </div>
                    <p>{courseCount(courses.length)}</p>
                  </div>
                  {canManage && (
                    <button type="button" className={styles.editButton} onClick={() => onEditDepartment(department)}>
                      <Pencil size={14} aria-hidden="true" />
                      <span>Edit unit</span>
                    </button>
                  )}
                </header>

                {courses.length ? (
                  <ul className={styles.courseList}>
                    {courses.map((course) => (
                      <li className={styles.courseRow} key={course.id}>
                        <div className={styles.courseDetails}>
                          <h4>{value(course, 'name')}</h4>
                          <span>Degree program</span>
                        </div>
                        <code className={styles.courseCode}>{value(course, 'code')}</code>
                        {canManage && (
                          <button
                            type="button"
                            className={styles.editButton}
                            onClick={() => onEditCourse(course)}
                            aria-label={'Edit ' + value(course, 'name')}
                          >
                            <Pencil size={14} aria-hidden="true" />
                            <span>Edit</span>
                          </button>
                        )}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <div className={styles.emptyUnit}>
                    <p>No courses are listed for this unit yet.</p>
                    {canManage && (
                      <button type="button" className={styles.addFirstCourse} onClick={() => onCreateCourse(department.id)}>
                        <Plus size={14} aria-hidden="true" />
                        Add the first course
                      </button>
                    )}
                  </div>
                )}
              </section>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
