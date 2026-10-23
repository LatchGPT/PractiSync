# Privacy consent gate

Product and user: RTU students, coordinators, external Industry Partner supervisors, and school staff reviewing their privacy choice on desktop or phone.

Surface: Operate, with a Read panel. Primary action: Agree and continue; recovery keeps the notice and unchecked acknowledgement available. Reuse RTU navy/blue, gold keyboard focus, Inter, Lucide, shadcn Button/Checkbox/Label, and react-hook-form with Zod.

Hierarchy: notice title and short summary, English/Filipino choice, full readable notice with version/date and public-policy link, acknowledgement, then Accept and Decline. There is no workspace navigation. Declining replaces the form with a clear explanation, Review and give consent, and Sign out. Already accepted users refresh their session without being asked to accept again.

Required states: unchecked/disabled, checked, submitting, declined, reconsidering, accepted/session refresh, stale policy, offline/server error, signed out, unavailable policy. Phone layout stacks actions and keeps the entire form reachable through page scrolling. The full notice has its own keyboard-scrollable region. Focus moves to decline feedback, the acknowledgement on reconsidering, and errors when a submission fails. No decorative animation is needed.

Content: the stored bilingual policy, all existing bracketed placeholders, role-independent summary, actual version and Philippine effective date. Out of scope: notice content changes and institutional branding changes.

## Settings → Privacy (Phase 6)

Operate surface for every role, reusing the RTU colors, typography, shadcn buttons and AlertDialog. The same panel appears in the shared Settings Privacy tab and the protected `/settings/privacy` page; external supervisors reach that page from their portal. Rank current status, policy version and acceptance date first, then the immutable history. Group the withdrawal action separately with its access consequence and a confirmation focused on Cancel by default. A successful withdrawal refreshes the session and returns to the gate even if session refresh fails, because the database withdrawal already blocks access.

History is paginated and scoped to the authenticating account and tenant, including mapped students. Required states: loading, no history, loaded, load more, retained history after a pagination error, request failure/retry, confirmation/cancel, submitting, withdrawal failure, and redirect after a concurrent policy change or withdrawal. Dates use Philippine time and entries show the notice version, choice and language. IP addresses and user agents are not included. Phone layouts stack the status details and action, preserve keyboard focus, and keep dialog controls visible.
