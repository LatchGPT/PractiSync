import type { DemoDatabase } from './demo';
import { TENANT } from '../domain/policies';

const names = [
  'Alessandra Dizon', 'Andre Castillo', 'Angela Soriano', 'Anton Mercado',
  'Beatriz Santiago', 'Carlo Villareal', 'Celine Manalo', 'Daniel Pascual',
  'Elise Domingo', 'Enzo Valdez', 'Isabel Tolentino', 'Jared Salazar',
  'Jasmine Pineda', 'Joshua Alonzo', 'Katrina Estrella', 'Lorenzo Fuentes',
  'Marielle Ocampo', 'Paolo Serrano', 'Rhea Gonzales', 'Tristan Aguilar',
] as const;

/** Adds fictional directory members without inventing internships or sign-in credentials. */
export async function seedDemoClassmates(db: DemoDatabase) {
  const statements = names.flatMap((name, index) => {
    const id = `demo-classmate-${String(index + 1).padStart(2, '0')}`;
    return [
      db.prepare('INSERT OR IGNORE INTO users (id,tenant_id,created_at,name,username,email,role,course_id,is_demo) VALUES (?,?,?,?,?,?,?,?,?)')
        .bind(id, TENANT, '2026-10-01T00:00:00Z', name, id, `${id}@example.invalid`, 'STUDENT', 'course-it', 0),
      db.prepare('INSERT OR IGNORE INTO enrollments (id,tenant_id,created_at,class_id,student_id,active) VALUES (?,?,?,?,?,?)')
        .bind(`enroll-${id}`, TENANT, '2026-10-01T00:00:00Z', 'class-it', id, 1),
    ];
  });
  await db.batch(statements);
  const directoryStudents = [
    'demo-student', 'demo-student-06', 'demo-student-07', 'student-5', 'student-completed',
    ...names.map((_, index) => `demo-classmate-${String(index + 1).padStart(2, '0')}`),
  ];
  // Fictional fourth-year demo profiles; existing student-entered profiles take precedence.
  await db.batch(directoryStudents.map(id =>
    db.prepare('INSERT OR IGNORE INTO student_profiles (id,tenant_id,created_at,user_id,student_number,year_level) VALUES (?,?,?,?,?,?)')
      .bind(`profile-${id}`, TENANT, '2026-10-01T00:00:00Z', id, `DEMO-${id}`, 4),
  ));
}
