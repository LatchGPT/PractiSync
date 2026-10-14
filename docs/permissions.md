# Permissions matrix

Every request obtains identity from the Auth.js encrypted JWT, reloads the current DB account, and fixes the tenant server-side. All SQL reads and writes filter the tenant and resolve resource scope. Client role/tenant/owner values are ignored.

| Resource/action | Student | Coordinator | Supervisor | Super Admin |
|---|---|---|---|---|
| DTR read | Own records and narratives | Own class placements | Assigned active placements; time intervals only | Institution |
| DTR create/correct | Own placement | Denied | Denied | Denied |
| Optional confirmation | Denied | Denied | Active assigned placement; time only | Denied |
| Classes/create | Join eligible own course | Own classes | Denied | Institution |
| Hours policy | Read target snapshot | Read | Granted course scope | Grant scope only |
| Documents/read | Own metadata and form submissions | Own class metadata and submitted forms | Denied | Institution metadata and submitted forms |
| PDF template upload/map/publish | Denied | Denied | Denied | Own tenant: upload PDF, draw and label fillable areas, publish or remap |
| Interactive form draft/submit | Own clearance papers; two OJT forms after reported-hour target | Denied | Denied | Denied |
| Interactive form review | Denied | Own-class submissions; approve or request revision | Denied | Denied |
| SOS/read/write | Own report | Assigned class cases | Denied | Denied unless explicit handler (not implemented) |
| Company profile | Denied | Read approved directory | Create own; blocked pending verification | Verify or decline |
| Internship post | Denied | Review posts in assigned course | Submit for own verified company; cannot publish | Read/manage institution |
| Application | Apply to eligible published post | Read scoped applications; confirm HTE-selected placement | Read applicants to own published posts; shortlist or decline only | Read institution |
| Placement activation | Denied | Activate own-class planned placement on/after start date | Denied | Denied |
| Announcement publish | Denied | Own class | Denied | University |
| Student competency assessment | Submit/revise own weekly or monthly assessment according to course cadence | Configure cadence for own courses; approve or request revision for own class | Denied | Read |
| HTE final evaluation | Read after coordinator approval | Review and release for own class | Submit rubric only for own assigned active placement; own receipt/revisions only | Read institution |
| Guest HTE evaluation | Read after coordinator approval | Issue/revoke one-use link and review response | No account or dashboard access | Read institution |
| Completion forms | Save drafts and submit the two required OJT forms after reported hours reach target | Review forms and make formal completion decision for own class | Denied | Read submitted institution forms |
| Company review | Submit after formal placement completion; other authors are anonymous | Identify and moderate in university scope | Anonymous approved feedback only after five distinct placements in the same period | Identify and moderate |
| Portfolio | Own | Own class | Assigned scope | Institution scope |
| Accounts/structure | Own profile | Own profile | Own profile | Provision and assign non-demo accounts |

Supervisor company verification and placement assignment are separate. A verified account can post only for its own company, and every post remains invisible to students until university approval. HTE evaluation link access requires a separate eight-digit access code; links expire, can be revoked, and work once. No identity or student details appear before the code is accepted. Removed assignments immediately remove placement/evaluation access despite a valid JWT. Supervisors never read student DTR narratives, documents, SOS/support records, coordinator dashboards, or analytics. SOS has independent authorization; counts and audit views omit narrative and sensitive case access. Privileged account fields are never autofilled. Rate limits apply to credentials, class code checks, and guest evaluation submission. Limits are bounded for this small demo; true 30,000-student capacity requires real PostgreSQL measured workloads.
