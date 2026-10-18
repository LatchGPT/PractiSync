const fs = require('fs');
const path = require('path');

const viewPath = path.resolve(__dirname, '../app/calendar-view.tsx');
let code = fs.readFileSync(viewPath, 'utf8');

// 1. Add upcomingEvents calculation if not present
const upcomingMemo = `  const upcomingEvents = useMemo(() => {
    return combinedEvents
      .filter((ev) => value(ev, 'endDate') >= today && value(ev, 'status') !== 'CANCELLED')
      .sort((a, b) => value(a, 'startDate').localeCompare(value(b, 'startDate')))
      .slice(0, 4);
  }, [combinedEvents, today]);
`;

if (!code.includes('const upcomingEvents = useMemo')) {
  const insertMarker = 'const totalHoursLabel =';
  const pos = code.indexOf(insertMarker);
  if (pos === -1) {
    console.error('insertMarker totalHoursLabel not found');
    process.exit(1);
  }
  code = code.slice(0, pos) + upcomingMemo + '\n  ' + code.slice(pos);
}

// 2. Enhance LeftRailContainer to include Month Summary & Upcoming Milestones
const oldLeftRailSearch = "            <button\n              type=\"button\"\n              className={`${styles.legendItem} ${categoryFilter === 'MISSING' ? styles.legendItemActive : ''}`}\n              onClick={() => toggleFilter('MISSING')}\n              aria-pressed={categoryFilter === 'MISSING'}\n            >\n              <span className={`${styles.legendDotWrap} ${styles.legendDotMissing}`}>\n                <AlertTriangle size={12} />\n              </span>\n              <div className={styles.legendItemText}>\n                <strong>Missing Log Alert</strong>\n                <span>Active placement weekday with no log</span>\n              </div>\n              {categoryFilter === 'MISSING' && <span className={styles.legendActiveDot} />}\n            </button>\n          )}\n        </div>\n      </div>\n    </aside>";

const oldLeftRailNormalized = oldLeftRailSearch.replace(/\n/g, '\r\n');

const newLeftRailAdditions = `          {user.role === 'STUDENT' && (
            <button
              type="button"
              className={\`\${styles.legendItem} \${categoryFilter === 'MISSING' ? styles.legendItemActive : ''}\`}
              onClick={() => toggleFilter('MISSING')}
              aria-pressed={categoryFilter === 'MISSING'}
            >
              <span className={\`\${styles.legendDotWrap} \${styles.legendDotMissing}\`}>
                <AlertTriangle size={12} />
              </span>
              <div className={styles.legendItemText}>
                <strong>Missing Log Alert</strong>
                <span>Active placement weekday with no log</span>
              </div>
              {categoryFilter === 'MISSING' && <span className={styles.legendActiveDot} />}
            </button>
          )}
        </div>
      </div>

      {/* 2. Month Summary & Pacing Card */}
      <div className={styles.monthStatsCard}>
        <div className={styles.legendCardHeader}>
          <h3>
            <Clock3 size={15} color="var(--rtu-blue)" />
            {format(cursor, 'MMMM')} Pacing
          </h3>
          <span className="chip" style={{ fontSize: 10.5, padding: '2px 6px' }}>
            {currentMonthStats.activeDaysCount} {currentMonthStats.activeDaysCount === 1 ? 'shift' : 'shifts'}
          </span>
        </div>

        <div className={styles.monthStatsGrid}>
          <div className={styles.monthStatItem}>
            <span className={styles.monthStatLabel}>Rendered Hours</span>
            <strong className={styles.monthStatValue}>{currentMonthStats.totalHours} hrs</strong>
            <div
              className={styles.miniPacingTrack}
              title={\`\${currentMonthStats.totalHours} hrs rendered in \${format(cursor, 'MMMM')}\`}
            >
              <div
                className={styles.miniPacingFill}
                style={{
                  width: \`\${Math.min(100, Math.max(3, Math.round((Number(currentMonthStats.totalHours) / 100) * 100))) }%\`,
                }}
              />
            </div>
          </div>

          <div className={styles.monthStatItem}>
            <span className={styles.monthStatLabel}>Verified by Coord.</span>
            <strong className={styles.monthStatValue} style={{ color: '#166b42' }}>
              {currentMonthStats.confirmedHours} hrs
            </strong>
            <span className="chip green" style={{ fontSize: 10, padding: '1px 5px', marginTop: 3 }}>
              {currentMonthStats.confirmationRate}% verified
            </span>
          </div>
        </div>

        {user.role === 'STUDENT' && currentMonthStats.missedWeekdaysCount > 0 && (
          <div className={styles.monthMissedAlert}>
            <AlertTriangle size={13} style={{ flexShrink: 0 }} />
            <span>
              {currentMonthStats.missedWeekdaysCount} missed placement{' '}
              {currentMonthStats.missedWeekdaysCount === 1 ? 'day' : 'days'}
            </span>
          </div>
        )}
      </div>

      {/* 3. Upcoming Milestones & Deadlines Card */}
      <div className={styles.upcomingCard}>
        <div className={styles.legendCardHeader}>
          <h3>
            <CalendarRange size={15} color="var(--rtu-blue)" />
            Upcoming Milestones
          </h3>
          <span className="chip blue" style={{ fontSize: 10.5, padding: '2px 6px' }}>
            {upcomingEvents.length}
          </span>
        </div>

        {upcomingEvents.length ? (
          <div className={styles.upcomingList}>
            {upcomingEvents.map((ev) => {
              const evType = value(ev, 'eventType');
              const startDate = parseCalendarDate(value(ev, 'startDate')) ?? new Date();
              const isSelected = value(ev, 'startDate') === selectedKey;
              return (
                <button
                  key={ev.id}
                  type="button"
                  className={\`\${styles.upcomingItem} \${isSelected ? styles.upcomingItemActive : ''}\`}
                  onClick={() => chooseDay(startDate)}
                  title={\`View \${value(ev, 'title')} on \${dateLabel(value(ev, 'startDate'))}\`}
                >
                  <div className={styles.upcomingDateBadge}>
                    <span className={styles.upcomingDateMonth}>{format(startDate, 'MMM')}</span>
                    <span className={styles.upcomingDateDay}>{format(startDate, 'd')}</span>
                  </div>
                  <div className={styles.upcomingInfo}>
                    <strong className={styles.upcomingTitle}>{value(ev, 'title')}</strong>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 2 }}>
                      <span className={\`chip \${eventColors[evType] ?? 'blue'}\`} style={{ fontSize: 9.5, padding: '1px 5px' }}>
                        {eventLabels[evType] ?? evType}
                      </span>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        ) : (
          <p className={styles.upcomingEmpty}>No upcoming milestones or deadlines recorded.</p>
        )}
      </div>
    </aside>`;

if (code.includes(oldLeftRailSearch)) {
  code = code.replace(oldLeftRailSearch, newLeftRailAdditions);
} else if (code.includes(oldLeftRailNormalized)) {
  code = code.replace(oldLeftRailNormalized, newLeftRailAdditions);
} else {
  console.error('oldLeftRail not matched');
  process.exit(1);
}

// 3. Remove detached top KPI Ribbon
const kpiRibbonRegex = /\s*{\/\* Monthly KPI Ribbon \*\/}[\s\S]*?<\/div>\s*<\/div>\s*(?={\/\* Main Layout)/;
if (!kpiRibbonRegex.test(code)) {
  console.error('kpiRibbonRegex not matched');
  process.exit(1);
}
code = code.replace(kpiRibbonRegex, '\n\n      ');

// 4. Adaptive Day Overview columns
const eventsColStart = code.indexOf('{/* 2. Scheduled Events Column */}');
const overviewEndMatch = code.match(/<\/div>\s*<\/div>\s*\)\s*:\s*\(\s*<div className=\{styles\.dayOverviewGrid\}>[\s\S]*?{\/\* 2\. Scheduled Events Column \*\/}[\s\S]*?(<\/div>\s*<\/div>\s*\}\)\s*<\/section>)/);

const targetReplaceChunkEnd = code.indexOf('</div>\n              )}\n            </section>', eventsColStart);
const targetReplaceChunkEndCRLF = code.indexOf('</div>\r\n              )}\r\n            </section>', eventsColStart);
const chosenEnd = targetReplaceChunkEnd !== -1 ? targetReplaceChunkEnd : targetReplaceChunkEndCRLF;

if (eventsColStart === -1 || chosenEnd === -1) {
  console.error('eventsColStart or chosenEnd not found', { eventsColStart, chosenEnd });
  process.exit(1);
}

const adaptiveEventsAndDtr = `{/* 2. Scheduled Events Column (Adaptive) */}
                  {selectedEvents.length > 0 && (
                    <div className={styles.overviewSectionCol}>
                      <div className={styles.overviewSectionColHeader}>
                        <h4>
                          <CalendarDays size={14} color="var(--rtu-blue)" />
                          Scheduled Events
                        </h4>
                        <span className={styles.detailBadgeCount}>{selectedEvents.length}</span>
                      </div>
                      {selectedEvents.map(renderEvent)}
                    </div>
                  )}

                  {/* 3. DTR Entries Column (Adaptive) */}
                  {selectedTotals.entries.length > 0 && (
                    <div className={styles.overviewSectionCol}>
                      <div className={styles.overviewSectionColHeader}>
                        <h4>
                          <Clock3 size={14} color="var(--rtu-blue)" />
                          Daily Training Records
                        </h4>
                        <span className={styles.detailBadgeCount}>{selectedTotals.entries.length}</span>
                      </div>
                      {selectedTotals.entries.map((entry, index) => {
                        const placement = placements.find((item) => item.id === entry.placementId);
                        const confirmed = String(entry.confirmedVersion) === String(entry.version);
                        const start = timeLabel(value(entry, 'startsAt'));
                        const end = timeLabel(value(entry, 'endsAt'));

                        return (
                          <article key={\`\${entry.id}-\${index}\`} className={styles.entryCard}>
                            <div className={styles.entryHeading}>
                              <strong>{hours(Number(entry.minutes) || 0)}</strong>
                              <span className={\`chip \${confirmed ? 'green' : 'orange'}\`}>
                                {confirmed ? 'Coordinator confirmed' : 'Pending review'}
                              </span>
                            </div>

                            {user.role !== 'STUDENT' && placement && (
                              <span className={styles.studentName}>
                                <Users size={12} style={{ display: 'inline', marginRight: 4 }} />
                                {value(placement, 'studentName')} · {value(placement, 'section')}
                              </span>
                            )}

                            {(start || end) && (
                              <span className={styles.entryTime}>
                                <Clock3 size={12} />
                                {start}
                                {start && end ? ' – ' : ''}
                                {end}
                                {entry.breakMinutes ? \` (\${entry.breakMinutes}m break)\` : ''}
                              </span>
                            )}

                            <p>{value(entry, 'narrative') || 'No daily narrative note recorded.'}</p>

                            <div className={styles.entryActions}>
                              {onViewEntry && (
                                <button
                                  type="button"
                                  className={styles.entryActionBtn}
                                  onClick={() => onViewEntry(entry)}
                                >
                                  View details
                                </button>
                              )}
                              {user.role === 'STUDENT' && onCorrectEntry && (
                                <button
                                  type="button"
                                  className={styles.entryActionBtn}
                                  onClick={() => onCorrectEntry(entry)}
                                >
                                  Correct log
                                </button>
                              )}
                              {(user.role === 'COORDINATOR' || user.role === 'SUPER_ADMIN') &&
                                !confirmed &&
                                onConfirmEntry && (
                                  <button
                                    type="button"
                                    className={styles.entryActionBtn}
                                    style={{ color: '#166b42' }}
                                    onClick={() => onConfirmEntry(entry.id, Number(entry.version))}
                                  >
                                    Confirm accuracy
                                  </button>
                                )}
                            </div>
                          </article>
                        );
                      })}
                    </div>
                  )}
                `;

code = code.slice(0, eventsColStart) + adaptiveEventsAndDtr + code.slice(chosenEnd);
fs.writeFileSync(viewPath, code, 'utf8');
console.log('Successfully updated calendar-view.tsx!');
