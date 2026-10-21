# PractiSync product decisions

PractiSync coordinates university internships across all courses and programs. Existing domain context is in `docs/build-brief.md`; current HTE workflow decisions below supersede references to optional daily confirmation or the sample HTE final rubric.

- Student access is restricted to RTU accounts using the exact @rtu.edu.ph email domain. Super Admin can explicitly authorize an outside-domain email when manually provisioning a student account; the real email stays visible and the exception is audited. The five manually supplied @yopmail.com accounts are authorized demo exceptions.
- New student accounts complete the existing first-login form: full legal name, student number, year level and an active class code. The code identifies the course, section and coordinator. Submission atomically creates a fresh profile and enrolls the student, then opens the workspace immediately. No coordinator approval, rejection or correction queue is required. The server blocks student data until registration completes.
- New registrations never link to an existing student's history. Duplicate student numbers require correction or OJT office assistance; they never unlock the matching record. Existing previously linked accounts retain their recorded identity mapping.
- Class codes enroll eligible students immediately without a join-request approval step. Coordinators see all active class members, including students without placements, and can remove a student from their own class. Removal preserves the account and training records and prevents the same code from silently undoing that removal.
- The current runtime is a fictional, manually provisioned credential demo. It does not verify a Google identity. Real RTU Google sign-in remains disabled until a separate institutional adapter and OAuth/domain verification are configured.

- HTE supervisors self-register with company and contact details. Sign-in is allowed while pending, but business operations and assigned student records require Super Admin approval. Pending/rejected HTEs can track requests, correct rejected registration, and change their sign-in details.
- Super Admin approves HTE registrations, company-profile changes, internship posts, post edits and post closures. Proposed edits do not replace approved content until approval. Applicant selection remains with the HTE; coordinators confirm placements.
- Students log attendance daily without daily confirmation. At their snapshotted required hours target, they submit the complete system DTR once. A currently assigned, approved HTE supervisor verifies it or returns it with correction notes. HTE copies include time records, not daily narratives.
- Attendance is locked during final review and after verification. Students can request reopening of verified DTRs; the assigned class coordinator approves or declines with a reason. Reopening returns completion to pending and requires renewed DTR verification and evaluation review.
- The school HTE evaluation is university-wide, identical across every course and program. Super Admin uploads a PDF, checks/transcribes its answer fields and exact scale labels, then publishes it. Until then, show “Waiting for evaluation form”; do not invent questions, ratings or grades.
- All approved roles can see the published school document. Assigned HTEs answer it after final DTR verification; the class coordinator reviews and releases the response to the student. Templates and responses retain their original version. Existing student self-assessment and exit survey requirements remain separate.
- A coordinator approves formal completion only after final DTR verification, school HTE evaluation approval, and both student exit forms. Hours alone never establish completion.

The application remains confined to the configured fictional demo runtime. No hosting, notification email service, institutional activation or real school questionnaire is implied by these changes.

## Tasks 5–8 decisions

The approved scope, provenance, account lifecycle, reminder policy and verification boundaries are recorded in `docs/backlog-5-8-contract.md`. University tenancy is the institutional boundary; program/class scope remains explicit. Existing fictional feedback is not independent verified employer evidence.

The working implementation includes direct assigned-supervisor attribution and history, prepared account invitations/recovery, persistent in-app document reminder scheduling, and university ownership guards. Real RTU Google/email acceptance and the complete isolation gate after FEAT-01–04 remain outstanding. The October 21 evidence in `docs/backlog-5-8-evidence.md` defines what was actually demonstrated.
