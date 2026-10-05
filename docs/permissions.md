# Permissions matrix

Every request obtains identity from the Auth.js encrypted JWT, reloads the current DB account, and fixes the tenant server-side. All SQL reads and writes filter the tenant and resolve resource scope. Client role/tenant/owner values are ignored.

| Resource/action | Student | Coordinator | Supervisor | Super Admin |
|---|---|---|---|---|
| DTR read | Own | Own class placements | Active assigned placements | Institution |
| DTR create/correct | Own placement | Denied | Denied | Denied |
| Optional confirmation | Denied | Denied | Active assigned placement | Denied |
| Classes/create | Join eligible own course | Own classes | Denied | Institution |
| Hours policy | Read target snapshot | Read | Granted course scope | Grant scope only |
| Documents/read | Own files | Own class files | Assigned metadata | Institution files |
| Documents/submit | Own placement | Denied | Denied | Denied |
| Documents/review | Denied | Own class | Denied | Institution |
| SOS/read/write | Own report | Assigned class cases and escalation | Denied | Escalated cases only |
| Job publish/update | Denied | Denied | Verified own company + posting permission | Read |
| Application | Own eligible course without a current placement | Read own class | Own company's postings | Read institution |
| Announcement publish | Denied | One owned class or all owned sections | Denied | University |
| Evaluation | Own baseline | Read own class | Assigned final | Read |
| Review | Formally completed own placement | Moderate own class | Read approved | Read approved |
| Portfolio | Own | Own class | Assigned scope | Institution scope |
| Accounts/structure | Own profile | Own profile | Own profile | Provision and assign non-demo accounts |

The Super Admin can configure module availability for Student, Coordinator, and Supervisor roles. Those settings filter snapshots and deny corresponding server actions and file routes; account and profile access remain available. Supervisor policy scope and assignment are separate. Removed assignments immediately deny access despite valid JWTs. SOS has independent authorization; the Super Admin receives only cases explicitly raised by a coordinator. Privileged account fields are never autofilled. Rate limits apply to credentials and class code checks. Limits are bounded for this small demo; true 30,000-student capacity requires real PostgreSQL measured workloads.
