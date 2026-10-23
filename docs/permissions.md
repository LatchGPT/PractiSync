# Permissions matrix

Every request obtains identity from the Auth.js encrypted JWT, reloads the current DB account, and fixes the tenant server-side. All SQL reads and writes filter the tenant and resolve resource scope. Client role/tenant/owner values are ignored.

| Resource/action | Student | Coordinator | Supervisor | Super Admin |
|---|---|---|---|---|
| DTR read | Own records and narratives | Own class placements | Assigned active placements; time intervals only | Institution |
| DTR create/correct | Own placement | Denied | Denied | Denied |
| Daily confirmation | Removed | Removed | Removed | Removed |
| Final DTR submission | Own active placement at required hours target | Read own class | Read assigned placements, time only | Read institution |
| Final DTR verification | Denied | Denied | Verify or return submitted complete DTR for active assigned placement | Denied |
| Verified DTR reopening | Request with reason | Approve/decline own class with reason | Denied | Read institution |
| Classes/create | Join eligible own course by active code, without approval | Own classes; remove enrolled students | Denied | Institution |
| Student registration | Complete own details; fresh profile only | No approval/rejection permission | Denied | Provision accounts and explicit email exceptions |
| Hours policy | Read target snapshot | Read | Granted course scope | Grant scope only |
| Documents/read | Own seeded metadata and Word templates | Own class metadata | Denied | Institution metadata and Word templates |
| SOS/read/write | Own report | Assigned class cases | Denied | Denied unless explicit handler (not implemented) |
| Company profile | Denied | Read approved directory | Create own; blocked pending verification | Verify or decline |
| Internship post | Denied | Create drafts for assigned courses; cannot approve | Request creation, edits or closure for own approved company | Approve/reject before changes apply |
| Application | Apply to eligible published post | Read scoped applications; confirm HTE-selected placement | Read applicants to own published posts; shortlist or decline only | Read institution |
| Placement activation | Denied | Activate own-class planned placement on/after start date | Denied | Denied |
| Announcement publish | Denied | Own class | Denied | University |
| Student competency assessment | Submit/revise own weekly or monthly assessment according to course cadence | Configure cadence for own courses; approve or request revision for own class | Denied | Read |
| School HTE evaluation | Read published template; own response after release | Review and release for own class | Answer published school form after final DTR verification; own receipt/drafts/revisions only | Upload PDF, configure exact questions, publish university-wide; read institution responses |
| Guest HTE evaluation | Read after coordinator approval | Issue/revoke one-use link and review response | No account or dashboard access | Read institution |
| End-of-OJT completion surveys | Save drafts and submit the two surveys after reported hours reach target | Review submitted surveys and make formal completion decision for own class | Denied | Read submitted institution surveys |
| Company review | Submit after formal placement completion; other authors are anonymous | Identify and moderate in university scope | Anonymous approved feedback only after five distinct placements in the same period | Identify and moderate |
| Accounts/structure | Own profile | Own profile | Own profile | Provision and assign non-demo accounts |

Supervisor company verification and placement assignment are separate. A verified account can post only for its own company, and every post remains invisible to students until university approval. HTE evaluation link access requires a separate eight-digit access code; links expire, can be revoked, and work once. No identity or student details appear before the code is accepted. Removed assignments immediately remove placement/evaluation access despite a valid JWT. Supervisors never read student DTR narratives, documents, SOS/support records, coordinator dashboards, or analytics. SOS has independent authorization; counts and audit views omit narrative and sensitive case access. Privileged account fields are never autofilled. Rate limits apply to credentials, class code checks, and guest evaluation submission. Limits are bounded for this small demo; true 30,000-student capacity requires real PostgreSQL measured workloads.
