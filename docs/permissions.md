# Permissions matrix

Every request obtains identity from the Auth.js encrypted JWT, reloads the current DB account, and fixes the tenant server-side. All SQL reads and writes filter the tenant and resolve resource scope. Client role/tenant/owner values are ignored.

| Resource/action | Student | Coordinator | Supervisor | Super Admin |
|---|---|---|---|---|
| DTR read | Own | Own class placements | Active assigned placements | Institution |
| DTR create/correct | Own placement | Denied | Denied | Denied |
| Optional confirmation | Denied | Denied | Active assigned placement | Denied |
| Classes/create | Join eligible own course | Own classes | Denied | Institution |
| Hours policy | Read target snapshot | Read | Granted course scope | Grant scope only |
| Documents/read | Own | Own class | Assigned metadata | Institution metadata |
| Documents/review | Denied | Own class | Denied | Denied |
| SOS/read/write | Own report | Assigned class cases | Denied | Denied unless explicit handler (not implemented) |
| Job publish/update | Denied | Denied | Verified own company + posting permission | Read |
| Application | Own eligible course | Read own class | Own company's postings | Read institution |
| Announcement publish | Denied | Own class | Denied | University |
| Period competency assessment | Submit/revise own weekly or monthly assessment according to course cadence | Configure cadence for own courses; approve or request revision for own class | Denied in hosted demo | Read |
| Review | Formally completed own placement | Moderate own class | Read approved | Read approved |
| Portfolio | Own | Own class | Assigned scope | Institution scope |
| Accounts/structure | Own profile | Own profile | Own profile | Provision and assign non-demo accounts |

Supervisor policy scope and assignment are separate. Removed assignments immediately deny access despite valid JWTs. SOS has independent authorization; counts and audit views omit narrative and sensitive case access. Privileged account fields are never autofilled. Rate limits apply to credentials and class code checks. Limits are bounded for this small demo; true 30,000-student capacity requires real PostgreSQL measured workloads.
