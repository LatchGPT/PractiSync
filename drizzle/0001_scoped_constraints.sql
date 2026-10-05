CREATE TRIGGER scope_courses_department_id_insert BEFORE INSERT ON courses BEGIN SELECT RAISE(ABORT, 'Invalid scoped relationship') WHERE NEW.department_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM departments WHERE id=NEW.department_id AND tenant_id=NEW.tenant_id); END;
--> statement-breakpoint
CREATE TRIGGER scope_courses_department_id_update BEFORE UPDATE ON courses BEGIN SELECT RAISE(ABORT, 'Invalid scoped relationship') WHERE NEW.department_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM departments WHERE id=NEW.department_id AND tenant_id=NEW.tenant_id); END;
--> statement-breakpoint
CREATE TRIGGER scope_classes_course_id_insert BEFORE INSERT ON classes BEGIN SELECT RAISE(ABORT, 'Invalid scoped relationship') WHERE NEW.course_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM courses WHERE id=NEW.course_id AND tenant_id=NEW.tenant_id); END;
--> statement-breakpoint
CREATE TRIGGER scope_classes_course_id_update BEFORE UPDATE ON classes BEGIN SELECT RAISE(ABORT, 'Invalid scoped relationship') WHERE NEW.course_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM courses WHERE id=NEW.course_id AND tenant_id=NEW.tenant_id); END;
--> statement-breakpoint
CREATE TRIGGER scope_classes_coordinator_id_insert BEFORE INSERT ON classes BEGIN SELECT RAISE(ABORT, 'Invalid scoped relationship') WHERE NEW.coordinator_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM users WHERE id=NEW.coordinator_id AND tenant_id=NEW.tenant_id); END;
--> statement-breakpoint
CREATE TRIGGER scope_classes_coordinator_id_update BEFORE UPDATE ON classes BEGIN SELECT RAISE(ABORT, 'Invalid scoped relationship') WHERE NEW.coordinator_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM users WHERE id=NEW.coordinator_id AND tenant_id=NEW.tenant_id); END;
--> statement-breakpoint
CREATE TRIGGER scope_enrollments_class_id_insert BEFORE INSERT ON enrollments BEGIN SELECT RAISE(ABORT, 'Invalid scoped relationship') WHERE NEW.class_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM classes WHERE id=NEW.class_id AND tenant_id=NEW.tenant_id); END;
--> statement-breakpoint
CREATE TRIGGER scope_enrollments_class_id_update BEFORE UPDATE ON enrollments BEGIN SELECT RAISE(ABORT, 'Invalid scoped relationship') WHERE NEW.class_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM classes WHERE id=NEW.class_id AND tenant_id=NEW.tenant_id); END;
--> statement-breakpoint
CREATE TRIGGER scope_enrollments_student_id_insert BEFORE INSERT ON enrollments BEGIN SELECT RAISE(ABORT, 'Invalid scoped relationship') WHERE NEW.student_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM users WHERE id=NEW.student_id AND tenant_id=NEW.tenant_id); END;
--> statement-breakpoint
CREATE TRIGGER scope_enrollments_student_id_update BEFORE UPDATE ON enrollments BEGIN SELECT RAISE(ABORT, 'Invalid scoped relationship') WHERE NEW.student_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM users WHERE id=NEW.student_id AND tenant_id=NEW.tenant_id); END;
--> statement-breakpoint
CREATE TRIGGER scope_policies_course_id_insert BEFORE INSERT ON policies BEGIN SELECT RAISE(ABORT, 'Invalid scoped relationship') WHERE NEW.course_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM courses WHERE id=NEW.course_id AND tenant_id=NEW.tenant_id); END;
--> statement-breakpoint
CREATE TRIGGER scope_policies_course_id_update BEFORE UPDATE ON policies BEGIN SELECT RAISE(ABORT, 'Invalid scoped relationship') WHERE NEW.course_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM courses WHERE id=NEW.course_id AND tenant_id=NEW.tenant_id); END;
--> statement-breakpoint
CREATE TRIGGER scope_policies_author_id_insert BEFORE INSERT ON policies BEGIN SELECT RAISE(ABORT, 'Invalid scoped relationship') WHERE NEW.author_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM users WHERE id=NEW.author_id AND tenant_id=NEW.tenant_id); END;
--> statement-breakpoint
CREATE TRIGGER scope_policies_author_id_update BEFORE UPDATE ON policies BEGIN SELECT RAISE(ABORT, 'Invalid scoped relationship') WHERE NEW.author_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM users WHERE id=NEW.author_id AND tenant_id=NEW.tenant_id); END;
--> statement-breakpoint
CREATE TRIGGER scope_placements_student_id_insert BEFORE INSERT ON placements BEGIN SELECT RAISE(ABORT, 'Invalid scoped relationship') WHERE NEW.student_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM users WHERE id=NEW.student_id AND tenant_id=NEW.tenant_id); END;
--> statement-breakpoint
CREATE TRIGGER scope_placements_student_id_update BEFORE UPDATE ON placements BEGIN SELECT RAISE(ABORT, 'Invalid scoped relationship') WHERE NEW.student_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM users WHERE id=NEW.student_id AND tenant_id=NEW.tenant_id); END;
--> statement-breakpoint
CREATE TRIGGER scope_placements_company_id_insert BEFORE INSERT ON placements BEGIN SELECT RAISE(ABORT, 'Invalid scoped relationship') WHERE NEW.company_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM companies WHERE id=NEW.company_id AND tenant_id=NEW.tenant_id); END;
--> statement-breakpoint
CREATE TRIGGER scope_placements_company_id_update BEFORE UPDATE ON placements BEGIN SELECT RAISE(ABORT, 'Invalid scoped relationship') WHERE NEW.company_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM companies WHERE id=NEW.company_id AND tenant_id=NEW.tenant_id); END;
--> statement-breakpoint
CREATE TRIGGER scope_placements_class_id_insert BEFORE INSERT ON placements BEGIN SELECT RAISE(ABORT, 'Invalid scoped relationship') WHERE NEW.class_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM classes WHERE id=NEW.class_id AND tenant_id=NEW.tenant_id); END;
--> statement-breakpoint
CREATE TRIGGER scope_placements_class_id_update BEFORE UPDATE ON placements BEGIN SELECT RAISE(ABORT, 'Invalid scoped relationship') WHERE NEW.class_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM classes WHERE id=NEW.class_id AND tenant_id=NEW.tenant_id); END;
--> statement-breakpoint
CREATE TRIGGER scope_placements_course_id_insert BEFORE INSERT ON placements BEGIN SELECT RAISE(ABORT, 'Invalid scoped relationship') WHERE NEW.course_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM courses WHERE id=NEW.course_id AND tenant_id=NEW.tenant_id); END;
--> statement-breakpoint
CREATE TRIGGER scope_placements_course_id_update BEFORE UPDATE ON placements BEGIN SELECT RAISE(ABORT, 'Invalid scoped relationship') WHERE NEW.course_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM courses WHERE id=NEW.course_id AND tenant_id=NEW.tenant_id); END;
--> statement-breakpoint
CREATE TRIGGER scope_assignments_placement_id_insert BEFORE INSERT ON assignments BEGIN SELECT RAISE(ABORT, 'Invalid scoped relationship') WHERE NEW.placement_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM placements WHERE id=NEW.placement_id AND tenant_id=NEW.tenant_id); END;
--> statement-breakpoint
CREATE TRIGGER scope_assignments_placement_id_update BEFORE UPDATE ON assignments BEGIN SELECT RAISE(ABORT, 'Invalid scoped relationship') WHERE NEW.placement_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM placements WHERE id=NEW.placement_id AND tenant_id=NEW.tenant_id); END;
--> statement-breakpoint
CREATE TRIGGER scope_assignments_supervisor_id_insert BEFORE INSERT ON assignments BEGIN SELECT RAISE(ABORT, 'Invalid scoped relationship') WHERE NEW.supervisor_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM users WHERE id=NEW.supervisor_id AND tenant_id=NEW.tenant_id); END;
--> statement-breakpoint
CREATE TRIGGER scope_assignments_supervisor_id_update BEFORE UPDATE ON assignments BEGIN SELECT RAISE(ABORT, 'Invalid scoped relationship') WHERE NEW.supervisor_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM users WHERE id=NEW.supervisor_id AND tenant_id=NEW.tenant_id); END;
--> statement-breakpoint
CREATE TRIGGER scope_entries_placement_id_insert BEFORE INSERT ON entries BEGIN SELECT RAISE(ABORT, 'Invalid scoped relationship') WHERE NEW.placement_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM placements WHERE id=NEW.placement_id AND tenant_id=NEW.tenant_id); END;
--> statement-breakpoint
CREATE TRIGGER scope_entries_placement_id_update BEFORE UPDATE ON entries BEGIN SELECT RAISE(ABORT, 'Invalid scoped relationship') WHERE NEW.placement_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM placements WHERE id=NEW.placement_id AND tenant_id=NEW.tenant_id); END;
--> statement-breakpoint
CREATE TRIGGER scope_intervals_entry_id_insert BEFORE INSERT ON intervals BEGIN SELECT RAISE(ABORT, 'Invalid scoped relationship') WHERE NEW.entry_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM entries WHERE id=NEW.entry_id AND tenant_id=NEW.tenant_id); END;
--> statement-breakpoint
CREATE TRIGGER scope_intervals_entry_id_update BEFORE UPDATE ON intervals BEGIN SELECT RAISE(ABORT, 'Invalid scoped relationship') WHERE NEW.entry_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM entries WHERE id=NEW.entry_id AND tenant_id=NEW.tenant_id); END;
--> statement-breakpoint
CREATE TRIGGER scope_documents_placement_id_insert BEFORE INSERT ON documents BEGIN SELECT RAISE(ABORT, 'Invalid scoped relationship') WHERE NEW.placement_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM placements WHERE id=NEW.placement_id AND tenant_id=NEW.tenant_id); END;
--> statement-breakpoint
CREATE TRIGGER scope_documents_placement_id_update BEFORE UPDATE ON documents BEGIN SELECT RAISE(ABORT, 'Invalid scoped relationship') WHERE NEW.placement_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM placements WHERE id=NEW.placement_id AND tenant_id=NEW.tenant_id); END;
--> statement-breakpoint
CREATE TRIGGER scope_incidents_placement_id_insert BEFORE INSERT ON incidents BEGIN SELECT RAISE(ABORT, 'Invalid scoped relationship') WHERE NEW.placement_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM placements WHERE id=NEW.placement_id AND tenant_id=NEW.tenant_id); END;
--> statement-breakpoint
CREATE TRIGGER scope_incidents_placement_id_update BEFORE UPDATE ON incidents BEGIN SELECT RAISE(ABORT, 'Invalid scoped relationship') WHERE NEW.placement_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM placements WHERE id=NEW.placement_id AND tenant_id=NEW.tenant_id); END;
--> statement-breakpoint
CREATE TRIGGER scope_incidents_student_id_insert BEFORE INSERT ON incidents BEGIN SELECT RAISE(ABORT, 'Invalid scoped relationship') WHERE NEW.student_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM users WHERE id=NEW.student_id AND tenant_id=NEW.tenant_id); END;
--> statement-breakpoint
CREATE TRIGGER scope_incidents_student_id_update BEFORE UPDATE ON incidents BEGIN SELECT RAISE(ABORT, 'Invalid scoped relationship') WHERE NEW.student_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM users WHERE id=NEW.student_id AND tenant_id=NEW.tenant_id); END;
--> statement-breakpoint
CREATE TRIGGER scope_incidents_coordinator_id_insert BEFORE INSERT ON incidents BEGIN SELECT RAISE(ABORT, 'Invalid scoped relationship') WHERE NEW.coordinator_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM users WHERE id=NEW.coordinator_id AND tenant_id=NEW.tenant_id); END;
--> statement-breakpoint
CREATE TRIGGER scope_incidents_coordinator_id_update BEFORE UPDATE ON incidents BEGIN SELECT RAISE(ABORT, 'Invalid scoped relationship') WHERE NEW.coordinator_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM users WHERE id=NEW.coordinator_id AND tenant_id=NEW.tenant_id); END;
--> statement-breakpoint
CREATE TRIGGER scope_jobs_company_id_insert BEFORE INSERT ON jobs BEGIN SELECT RAISE(ABORT, 'Invalid scoped relationship') WHERE NEW.company_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM companies WHERE id=NEW.company_id AND tenant_id=NEW.tenant_id); END;
--> statement-breakpoint
CREATE TRIGGER scope_jobs_company_id_update BEFORE UPDATE ON jobs BEGIN SELECT RAISE(ABORT, 'Invalid scoped relationship') WHERE NEW.company_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM companies WHERE id=NEW.company_id AND tenant_id=NEW.tenant_id); END;
--> statement-breakpoint
CREATE TRIGGER scope_jobs_course_id_insert BEFORE INSERT ON jobs BEGIN SELECT RAISE(ABORT, 'Invalid scoped relationship') WHERE NEW.course_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM courses WHERE id=NEW.course_id AND tenant_id=NEW.tenant_id); END;
--> statement-breakpoint
CREATE TRIGGER scope_jobs_course_id_update BEFORE UPDATE ON jobs BEGIN SELECT RAISE(ABORT, 'Invalid scoped relationship') WHERE NEW.course_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM courses WHERE id=NEW.course_id AND tenant_id=NEW.tenant_id); END;
--> statement-breakpoint
CREATE TRIGGER scope_jobs_author_id_insert BEFORE INSERT ON jobs BEGIN SELECT RAISE(ABORT, 'Invalid scoped relationship') WHERE NEW.author_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM users WHERE id=NEW.author_id AND tenant_id=NEW.tenant_id); END;
--> statement-breakpoint
CREATE TRIGGER scope_jobs_author_id_update BEFORE UPDATE ON jobs BEGIN SELECT RAISE(ABORT, 'Invalid scoped relationship') WHERE NEW.author_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM users WHERE id=NEW.author_id AND tenant_id=NEW.tenant_id); END;
--> statement-breakpoint
CREATE TRIGGER scope_applications_job_id_insert BEFORE INSERT ON applications BEGIN SELECT RAISE(ABORT, 'Invalid scoped relationship') WHERE NEW.job_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM jobs WHERE id=NEW.job_id AND tenant_id=NEW.tenant_id); END;
--> statement-breakpoint
CREATE TRIGGER scope_applications_job_id_update BEFORE UPDATE ON applications BEGIN SELECT RAISE(ABORT, 'Invalid scoped relationship') WHERE NEW.job_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM jobs WHERE id=NEW.job_id AND tenant_id=NEW.tenant_id); END;
--> statement-breakpoint
CREATE TRIGGER scope_applications_student_id_insert BEFORE INSERT ON applications BEGIN SELECT RAISE(ABORT, 'Invalid scoped relationship') WHERE NEW.student_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM users WHERE id=NEW.student_id AND tenant_id=NEW.tenant_id); END;
--> statement-breakpoint
CREATE TRIGGER scope_applications_student_id_update BEFORE UPDATE ON applications BEGIN SELECT RAISE(ABORT, 'Invalid scoped relationship') WHERE NEW.student_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM users WHERE id=NEW.student_id AND tenant_id=NEW.tenant_id); END;
--> statement-breakpoint
CREATE TRIGGER scope_evaluations_placement_id_insert BEFORE INSERT ON evaluations BEGIN SELECT RAISE(ABORT, 'Invalid scoped relationship') WHERE NEW.placement_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM placements WHERE id=NEW.placement_id AND tenant_id=NEW.tenant_id); END;
--> statement-breakpoint
CREATE TRIGGER scope_evaluations_placement_id_update BEFORE UPDATE ON evaluations BEGIN SELECT RAISE(ABORT, 'Invalid scoped relationship') WHERE NEW.placement_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM placements WHERE id=NEW.placement_id AND tenant_id=NEW.tenant_id); END;
--> statement-breakpoint
CREATE TRIGGER scope_evaluations_evaluator_id_insert BEFORE INSERT ON evaluations BEGIN SELECT RAISE(ABORT, 'Invalid scoped relationship') WHERE NEW.evaluator_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM users WHERE id=NEW.evaluator_id AND tenant_id=NEW.tenant_id); END;
--> statement-breakpoint
CREATE TRIGGER scope_evaluations_evaluator_id_update BEFORE UPDATE ON evaluations BEGIN SELECT RAISE(ABORT, 'Invalid scoped relationship') WHERE NEW.evaluator_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM users WHERE id=NEW.evaluator_id AND tenant_id=NEW.tenant_id); END;
--> statement-breakpoint
CREATE TRIGGER scope_scores_evaluation_id_insert BEFORE INSERT ON scores BEGIN SELECT RAISE(ABORT, 'Invalid scoped relationship') WHERE NEW.evaluation_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM evaluations WHERE id=NEW.evaluation_id AND tenant_id=NEW.tenant_id); END;
--> statement-breakpoint
CREATE TRIGGER scope_scores_evaluation_id_update BEFORE UPDATE ON scores BEGIN SELECT RAISE(ABORT, 'Invalid scoped relationship') WHERE NEW.evaluation_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM evaluations WHERE id=NEW.evaluation_id AND tenant_id=NEW.tenant_id); END;
--> statement-breakpoint
CREATE TRIGGER scope_reviews_placement_id_insert BEFORE INSERT ON reviews BEGIN SELECT RAISE(ABORT, 'Invalid scoped relationship') WHERE NEW.placement_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM placements WHERE id=NEW.placement_id AND tenant_id=NEW.tenant_id); END;
--> statement-breakpoint
CREATE TRIGGER scope_reviews_placement_id_update BEFORE UPDATE ON reviews BEGIN SELECT RAISE(ABORT, 'Invalid scoped relationship') WHERE NEW.placement_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM placements WHERE id=NEW.placement_id AND tenant_id=NEW.tenant_id); END;
--> statement-breakpoint
CREATE TRIGGER scope_reviews_company_id_insert BEFORE INSERT ON reviews BEGIN SELECT RAISE(ABORT, 'Invalid scoped relationship') WHERE NEW.company_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM companies WHERE id=NEW.company_id AND tenant_id=NEW.tenant_id); END;
--> statement-breakpoint
CREATE TRIGGER scope_reviews_company_id_update BEFORE UPDATE ON reviews BEGIN SELECT RAISE(ABORT, 'Invalid scoped relationship') WHERE NEW.company_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM companies WHERE id=NEW.company_id AND tenant_id=NEW.tenant_id); END;
--> statement-breakpoint
CREATE TRIGGER scope_reviews_student_id_insert BEFORE INSERT ON reviews BEGIN SELECT RAISE(ABORT, 'Invalid scoped relationship') WHERE NEW.student_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM users WHERE id=NEW.student_id AND tenant_id=NEW.tenant_id); END;
--> statement-breakpoint
CREATE TRIGGER scope_reviews_student_id_update BEFORE UPDATE ON reviews BEGIN SELECT RAISE(ABORT, 'Invalid scoped relationship') WHERE NEW.student_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM users WHERE id=NEW.student_id AND tenant_id=NEW.tenant_id); END;
--> statement-breakpoint
CREATE TRIGGER scope_completion_placement_id_insert BEFORE INSERT ON completion BEGIN SELECT RAISE(ABORT, 'Invalid scoped relationship') WHERE NEW.placement_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM placements WHERE id=NEW.placement_id AND tenant_id=NEW.tenant_id); END;
--> statement-breakpoint
CREATE TRIGGER scope_completion_placement_id_update BEFORE UPDATE ON completion BEGIN SELECT RAISE(ABORT, 'Invalid scoped relationship') WHERE NEW.placement_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM placements WHERE id=NEW.placement_id AND tenant_id=NEW.tenant_id); END;
--> statement-breakpoint
CREATE TRIGGER scope_policy_scopes_supervisor_id_insert BEFORE INSERT ON policy_scopes BEGIN SELECT RAISE(ABORT, 'Invalid scoped relationship') WHERE NEW.supervisor_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM users WHERE id=NEW.supervisor_id AND tenant_id=NEW.tenant_id); END;
--> statement-breakpoint
CREATE TRIGGER scope_policy_scopes_supervisor_id_update BEFORE UPDATE ON policy_scopes BEGIN SELECT RAISE(ABORT, 'Invalid scoped relationship') WHERE NEW.supervisor_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM users WHERE id=NEW.supervisor_id AND tenant_id=NEW.tenant_id); END;
--> statement-breakpoint
CREATE TRIGGER scope_policy_scopes_course_id_insert BEFORE INSERT ON policy_scopes BEGIN SELECT RAISE(ABORT, 'Invalid scoped relationship') WHERE NEW.course_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM courses WHERE id=NEW.course_id AND tenant_id=NEW.tenant_id); END;
--> statement-breakpoint
CREATE TRIGGER scope_policy_scopes_course_id_update BEFORE UPDATE ON policy_scopes BEGIN SELECT RAISE(ABORT, 'Invalid scoped relationship') WHERE NEW.course_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM courses WHERE id=NEW.course_id AND tenant_id=NEW.tenant_id); END;
--> statement-breakpoint
CREATE TRIGGER intervals_overlap_insert BEFORE INSERT ON intervals BEGIN
 SELECT RAISE(ABORT, 'Attendance overlap') WHERE EXISTS (
 SELECT 1 FROM intervals i JOIN entries old ON old.id=i.entry_id AND old.tenant_id=i.tenant_id JOIN entries current ON current.id=NEW.entry_id AND current.tenant_id=NEW.tenant_id
 WHERE i.tenant_id=NEW.tenant_id AND old.placement_id=current.placement_id AND i.id<>NEW.id AND julianday(i.starts_at)<julianday(NEW.ends_at) AND julianday(i.ends_at)>julianday(NEW.starts_at)); END;
--> statement-breakpoint
CREATE TRIGGER intervals_overlap_update BEFORE UPDATE ON intervals BEGIN
 SELECT RAISE(ABORT, 'Attendance overlap') WHERE EXISTS (
 SELECT 1 FROM intervals i JOIN entries old ON old.id=i.entry_id AND old.tenant_id=i.tenant_id JOIN entries current ON current.id=NEW.entry_id AND current.tenant_id=NEW.tenant_id
 WHERE i.tenant_id=NEW.tenant_id AND old.placement_id=current.placement_id AND i.id<>NEW.id AND julianday(i.starts_at)<julianday(NEW.ends_at) AND julianday(i.ends_at)>julianday(NEW.starts_at)); END;
--> statement-breakpoint
CREATE UNIQUE INDEX single_primary_class ON enrollments(tenant_id,student_id) WHERE active=1;
