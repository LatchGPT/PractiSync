# Student registration and RTU access

Student registration no longer requires coordinator approval. The legacy /student-verification URL and API names remain compatible with existing links; the interface calls the flow student registration.

## Account admission

Standard student accounts require the exact @rtu.edu.ph email domain. The current credential demo admits pre-provisioned accounts; it does not verify Google ownership. Both credential sign-in and each authenticated request check the stored account email policy. An unlisted outside-domain student cannot bypass this policy with an existing session or a registration payload.

Super Admin account provisioning defaults to RTU email only. Selecting Authorized manual email exception explicitly permits the supplied outside-domain email, records the exception on the account and audits the decision. Students cannot authorize their own exceptions. The October 20 migration marks only the five explicitly supplied yopmail accounts when their stored usernames and emails match. Other outside-domain accounts receive no blanket exception. Staff and HTE email policies are separate.

## First sign-in

Use Quick Demo Access → Try first-time student setup for the fictional demo. The form asks for legal name, student number, year level and an active coordinator-provided class code. The code resolves the program and section; the server rechecks it during submission. Successful submission creates a fresh profile on the requesting account and its class enrollment in one transaction. It does not require a notification, approval or record-linking decision from a coordinator. Retried successful submissions are idempotent.

Student data stays inaccessible through pages and APIs until setup is complete. Input remains available on failure. Duplicate student numbers produce an error without linking or revealing any existing student's records. Previously pending/correction/rejected registrations now reopen the details form with saved values; the student supplies a currently valid class code to finish. Previously approved identity mappings remain intact.

## Class management

Eligible class-code joins enroll immediately. The coordinator roster lists active enrollments, including members without a placement, with search, pagination and removal. Removal only affects the assigned class and clears any representative designation. It preserves the account, profile and training records. A removed student cannot restore that membership just by entering the same shared code. A disabled account remains disabled independently of registration or class membership.

The former student review endpoint returns HTTP 410 and the review workspace is removed. Old student-verification and join-request notifications no longer appear as active tasks.

## Rollout

SQLite applies the new student email-exception migration automatically. PostgreSQL demo installations must apply committed migrations with pnpm db:migrate. Existing user records are preserved.

Institutional Google sign-in remains disabled. Production activation still requires the institutional adapter/database, environment-managed OAuth credentials and callbacks, provider-issued email_verified, the exact Workspace domain and stable Google subject, tenant isolation and session revocation. A user-entered email suffix or a local credential account is not proof of Google ownership. No roster import or production activation is included.
