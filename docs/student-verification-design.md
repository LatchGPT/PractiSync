# Student registration design contract

- Product and user: a first-time student registers their school details and joins their practicum section without coordinator approval. Coordinators manage class membership afterward.
- Surface: Operate. Primary action is Complete registration. Recover from failed submissions with retained input; log out is secondary. No student approval queue or waiting state.
- Content: student number, legal name, provisioned sign-in email, year level and active class code. The active code resolves the course, section and coordinator. No roster-wide class or course choices or record data appear behind the gate.
- Reuse: Inter, RTU navy/blue/gold tokens, 8px fields and buttons, 12px surfaces, Lucide icons and the shared Radix dialog. Use a single column on phones, spacious field groups on desktop, no decorative animation.
- Required states: initial form, inline validation, class-code lookup, submitting, redirect on success, unavailable coordinator/service and sign-out failure. Preserve typed input on failure; focus the first invalid field. Registration is required before student records can load.
- Security: standard student access requires an RTU email; outside-domain accounts require an explicit Super Admin provisioning exception. Each registration creates its own fresh profile and never links to someone else's history. Coordinator removal is scoped to their class and preserves the account and records.
- Delivery: fictional demo workflow first. Real RTU Google sign-in remains gated on the institutional adapter and OAuth configuration. A manually provisioned credential account is not presented as a verified Google identity.
