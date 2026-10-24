# Student Internship Documents

Product and user: students finding school forms and checking their document records on desktop or phone.
Surface: Operate. Primary job: find the relevant document and understand its next available action.
Hierarchy: Review Records, Prepare Documents, PDF Templates. Review records use a selectable list and a focused details panel; correction notes are visible in context.
Content: existing scoped document metadata, coordinator decisions, native templates/drafts/history, and published PDF templates. Seeded records remain explicitly identified as sample metadata; there is no fabricated upload or file preview.
Reuse: RTU navy/blue, gold focus rings, Inter, existing radii and borders, Lucide icons, shared accessible tabs, existing native editor and PDF download endpoints.
Spacing: 16px between groups, 20px panel padding, 12px inside controls; phone controls at least 44px. Wrap filenames and document titles.
States: all/needs correction/under review/approved filters, name search, first-use empty, no results with reset, no selected record, template loading/error/retry/empty, existing form save/generate errors and confirmations.
Responsive: desktop list/detail columns; phone list followed by details with an explicit View Details action that moves focus to the details heading. Tabs wrap rather than hide their labels.
Out of scope: coordinator/admin redesign, document policies, actual submission/upload capabilities for sample records, file conversion and storage changes.
Validation: TypeScript, scoped lint, rendered desktop and phone where available, filters/search/detail navigation, templates and existing editor entry point. Do not delete or submit demo data during visual checks.
