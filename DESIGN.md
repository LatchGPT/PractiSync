# PractiSync Design System

PractiSync is a login-first cooperative education and on-the-job training workspace for a university with multiple departments. Its interface helps students track training, coordinators manage classes and reviews, supervisors support interns, and administrators manage institutional structure.

This document describes the current visual system and gives conventions for extending it. Values marked as current come from the repository; review guidance describes expectations for future changes, not a claim that every existing screen already meets them.

## 1. Design direction

The visual identity is inspired by Rizal Technological University's blue and gold. The product is a fictional demonstration, and the visual inspiration does not imply institutional endorsement. Demo content currently uses Rizal Technological University and fictional people, companies, policies, and records.

The interface should feel orderly, reassuring, and focused on practical work:

- Use navy for hierarchy, blue for interaction, and gold for emphasis.
- Place white surfaces on a pale blue-gray background.
- Make progress, outstanding work, and the next useful action easy to find.
- Use compact tables and summaries while preserving readable labels and values.
- Explain statuses precisely. Reported hours, company-confirmed hours, document approval, and formal completion are separate concepts.
- Keep sample data and unavailable services visibly identified.

Gradients, gentle shadows, and small movement give the interface depth. Reserve stronger decoration for the sign-in identity panel, overview greeting, brand mark, and key actions.

## 2. Sources and CSS ownership

The application loads styles in this order through [app/layout.tsx](app/layout.tsx):

| Source | Responsibility |
| --- | --- |
| [app/globals.css](app/globals.css) | Font import, Tailwind token mapping, base styles, shared application classes, and reduced-motion rule |
| [app/dashboard.css](app/dashboard.css) | Role dashboards, overview greeting, milestone stepper, and document readiness styles |
| [app/rtu-theme.css](app/rtu-theme.css) | Brand tokens and theme overrides for shared surfaces, controls, navigation, and sign-in |
| [app/attendance-visuals.css](app/attendance-visuals.css) | Attendance charts and student goal summaries |

[components/ui](components/ui) contains reusable UI primitives. [app/practisync.tsx](app/practisync.tsx) assembles the application shell, navigation, module views, and shared form dialogs.

The effective appearance depends on selector specificity and `!important` as well as import order. Many theme rules override older colors in `globals.css`; use the active blue-and-gold tokens when adding UI. Check component-specific rules before changing a shared selector. Prefer a scoped component class and existing tokens over adding another broad override.

## 3. Color

### Brand and surface tokens

Current root values in `app/rtu-theme.css`:

| Token | Value | Purpose |
| --- | --- | --- |
| `--background` | `#f4f7fb` | Application canvas |
| `--foreground` | `#13335c` | Default text |
| `--card` | `#ffffff` | Cards, panels, and form surfaces |
| `--primary` / `--rtu-blue` | `#124c91` | Primary interaction and reported-hours chart series |
| `--primary-hover` | `#0e3f79` | Available hover token |
| `--primary-active` | `#092e59` | Available pressed token |
| `--rtu-navy` | `#0e2a57` | Strong headings and brand text |
| `--rtu-gold` | `#d7aa3e` | Brand accent, focus outlines, and confirmed-hours chart series |
| `--rtu-gold-hover` | `#c4992f` | Available gold hover token |
| `--rtu-gold-deep` | `#966916` | Dark gold emphasis |
| `--muted` | `#edf3fb` | Quiet backgrounds |
| `--muted-foreground` | `#5e7490` | Supporting text |
| `--border` | `#dbe5f2` | Surface and control boundaries |
| `--border-focus` | `#124c91` | Available focused-border token |
| `--rtu-ice` | `#edf4fd` | Soft blue accent surface |

Some controls use explicit gradients rather than the hover and active tokens. The current primary button gradient runs from `#13529d` to `#0d3c74`. Overview greetings use a navy-to-blue gradient from `#09274f` through `#0f3d79` to `#185399`, with restrained gold and white highlights.

### Status colors

Current `.chip` colors:

| Class | Background | Text | Border | Meaning |
| --- | --- | --- | --- | --- |
| `.green` | `#edf8f3` | `#166b42` | `#c4ebd4` | Positive, active, submitted, approved, or confirmed status |
| `.orange` | `#fdf7ec` | `#966914` | `#f7e0b1` | Pending, planned, or open status |
| `.blue` | `#eff5ff` | `#164f91` | `#c9defc` | In progress or shortlisted |
| `.red` | `#fdf3f1` | `#ae3726` | `#f9d4ce` | Rejected, disabled, or disputed |
| `.purple` | `#f5f1fc` | `#644996` | `#dfd4f5` | Available supporting category accent |

Always include the actual status as text. Green styling does not make â€œSubmittedâ€ equivalent to â€œApproved.â€ Gold also serves as a brand accent and chart series, so its meaning must be clear from the label or legend.

## 4. Typography and icons

Use **Inter** with the existing system sans-serif fallback stack. The base body size is **15px**, with **1.6** line height. Common sizes vary by component rather than following a single enforced type scale:

| Element | Current convention |
| --- | --- |
| Sign-in headline | `clamp(30px, 2.7vw, 42px)`, weight 700, line height 1.2 |
| Module page heading | 29px, weight 700, slightly negative tracking |
| Overview greeting | 26px with strong weight |
| Metric value | About 29px; smaller on compact screens |
| Role card heading | 17px |
| Chart and compact panel heading | About 15px |
| Form label and button | About 14px, weight 600 |
| Supporting copy | Usually 12â€“14px |
| Badge, metadata, and eyebrow | Usually 10â€“12px |

Use sentence case for actions and descriptions. Uppercase eyebrows are short contextual labels with expanded tracking. Keep numeric summaries aligned with tabular numerals where supported.

Use `lucide-react` for application icons. Most control icons are 14â€“18px; brand icons are larger. Pair unfamiliar icons with visible labels. Give icon-only controls an accessible name. The brand uses a graduation-cap mark, a blue rounded tile with a gold lower accent, and the PractiSync wordmark with a gold period. The favicon is the blue-and-gold monogram in [public/favicon.svg](public/favicon.svg).

## 5. Layout, spacing, and surfaces

### Application shell

The signed-in workspace consists of a collapsible left sidebar, sticky topbar, demo notice, and centered content area. The content has a current maximum width of **1550px**, with desktop padding of **32px 35px 35px**. The themed topbar is **72px** high on desktop and **64px** at the 900px compact breakpoint.

Navigation groups the work by module. An active item needs a distinct background and stronger text treatment. Preserve access to navigation in the mobile sidebar sheet. The desktop circular collapse control is hidden at 768px and below.

### Dashboard hierarchy

Use this order where it fits the role's work:

1. Personalized greeting, context, status, and relevant actions.
2. Milestone or progress summary.
3. Metric cards with meaningful destinations.
4. Main work panels and supporting queues, announcements, or quick actions.

Role metric grids use four desktop columns. Main role content uses a roughly **1.55:1** two-column split. Shared content sections generally use **18â€“24px** gaps and cards use about **20â€“22px** internal padding. Reuse these proportions instead of adding isolated spacing values without a layout reason.

### Shape and elevation

| Element | Current radius |
| --- | --- |
| Shared card or panel | `--radius-card: 12px` |
| Button or field | `--radius-btn: 8px` |
| Overview greeting | 16px |
| Milestone container | 14px |
| Status chip | 6px |
| Avatar | Circular |

Theme shadows use navy-tinted low-opacity layers:

```css
--shadow-sm: 0 1px 2px rgba(14, 42, 87, 0.04);
--shadow-md: 0 3px 12px -2px rgba(14, 42, 87, 0.07),
             0 1px 3px rgba(14, 42, 87, 0.04);
--shadow-lg: 0 10px 25px -4px rgba(14, 42, 87, 0.09),
             0 2px 6px rgba(14, 42, 87, 0.04);
--shadow-hover: 0 12px 30px -4px rgba(18, 76, 145, 0.14),
                0 4px 10px rgba(18, 76, 145, 0.06);
```

Keep borders visible even when a surface has a shadow. Use elevation to reinforce grouping or interactivity.

## 6. Components and interaction

- **Primary action:** blue gradient, white text, 8px radius, and subtle inset highlight. Keep one visually dominant next action in each action group.
- **Secondary action:** white surface, blue-gray border, and navy text. Use for supporting tasks, previews, and alternatives.
- **Text action:** blue text for compact panel navigation and low-emphasis actions.
- **Fields:** visible label, white surface, 1px border, 8px radius, and blue focus halo. Keep units and constraints near the field. Use the existing date picker for date input.
- **Dialogs:** use the shared dialog primitives with a title and description. Existing form dialogs cap height at 90vh and scroll internally; detail dialogs cap at 85vh. Keep validation and submission errors visible within the dialog.
- **Tables:** retain clear column labels, readable status badges, and horizontal overflow where needed. Place search and filtering near the list they affect.
- **Progress:** pair bars, rings, and milestones with numeric values, labels, and the applicable target. A full hours indicator does not establish formal completion.
- **Feedback:** use inline messages for persistent errors and Sonner toasts for brief action feedback. Show a pending state during submission and prevent duplicate submissions.
- **Demo samples:** keep â€œGenerate samplesâ€ separate from â€œAutofill form.â€ Preserve edited input unless the user explicitly replaces it, offer undo after replacement, and require manual submission.

Reuse primitives from `components/ui` and application patterns before introducing another interaction model. Existing application buttons also use `.primary`, `.secondary`, and `.textbutton`; check which styling contract the surrounding view uses.

## 7. Roles and information architecture

| Role | Primary design focus |
| --- | --- |
| Student | Placement context, daily attendance and narratives, target progress, document clearance, competency development, support, and portfolio |
| Coordinator | Class membership, student progress, document review, scoped announcements, and student support queues |
| Supervisor | Assigned interns, optional attendance confirmation, evaluations, authorized hour policies, and company internship postings |
| Super Admin | University office administration, account access, institution structure, and partner approvals |

Super Admin navigation focuses on overview, accounts and roles, university structure, the internship board, and university announcements. Coordinator-facing class management, attendance review, document review, competency workflows, student portfolios, and support queues stay out of the office menu. Institutional read access still follows the permissions matrix. Other roles see modules according to their permissions and scope.

Role-specific summaries may use different accents, but should preserve the same card, typography, status, and action conventions. UI visibility follows permissions; server checks remain authoritative. Follow [docs/permissions.md](docs/permissions.md) when exposing a new action or record.

## 8. Charts and academic status

Attendance charts use **blue for reported hours** and **gold for company-confirmed hours**, with light grid lines and a visible legend. Keep this mapping consistent across summaries and exports. Charts should include units, period labels, and a textual summary or accessible description.

Use actual scoped data. Fictional fixtures belong to the explicitly labeled demo. Explain missing data instead of manufacturing a chart or score. Competency comparisons require compatible frameworks and scales; disclose sample counts and missing assessments.

Show â€œNot configuredâ€ when a required policy or service is unavailable, with an actionable explanation. Do not infer required hours, clearance rules, or institutional approval from illustration content. A Record of Training export must retain reported-versus-confirmed labels and the fictional-demo notice where applicable. See [docs/assumptions.md](docs/assumptions.md) for domain defaults.

## 9. Responsive behavior

Current breakpoints are component-specific:

| Width | Existing adaptation |
| --- | --- |
| 1100px and below | Role metrics become two columns; role content and detailed attendance charts become one column |
| 1050px and below | Milestone track becomes two columns |
| 900px and below | Sign-in becomes one column; greeting actions stack; topbar and content padding shrink |
| Below 768px | Sidebar primitive uses its mobile sheet behavior |
| 700px and below | Student goal summary stacks, with a two-column detail grid |
| 600px and below | Milestones become one column; card spacing and metrics compact; attendance plots retain a scrollable minimum width |
| 520px and below | Demo role choices become one column |
| 420px and below | Student goal details become one column |

Preserve meaning when stacking: heading, value, explanation, then action. Keep horizontal scrolling inside tables or plots instead of allowing the page to overflow. Ensure controls remain easy to tap and avoid shrinking essential text to make a layout fit.

The default UI is light. Dark variants exist in some shared primitives, but the application theme does not define a complete dark palette. A future dark mode needs deliberate surface, text, status, and chart treatment.

## 10. Motion and accessibility

Current controls generally use **200ms** transitions with `cubic-bezier(0.16, 1, 0.3, 1)`. Sidebar width transitions use about **300ms**. Buttons lift slightly on hover and compress on press; interactive cards lift about 2â€“2.5px.

For new motion, transition the specific properties required. Keep movement subtle, restrict hover effects appropriately for touch devices, and make state changes understandable without animation. `globals.css` includes a global rule to disable animations and transitions under `prefers-reduced-motion: reduce`. Preserve this intent and verify that later theme overrides do not re-enable transitions.

The theme provides a **2px gold focus outline with a 2px offset** on buttons, links, inputs, selects, and textareas, plus a blue halo on focused fields. Preserve visible keyboard focus.

Review UI changes for:

- Logical headings, explicit form labels, meaningful accessible names, and keyboard access.
- Dialog focus management and a usable close path.
- Text and control contrast, including muted copy and colored badges.
- Status distinctions communicated with text as well as color.
- Progress values and chart meaning available beyond visual shape.
- Readable content under zoom, narrow viewports, and longer names or labels.
- Loading, empty, unavailable, and error states that explain the next step.

These are review expectations; this document does not certify an accessibility audit.

## 11. Checklist for UI changes

- Reuse the active theme tokens, spacing patterns, icons, and shared controls.
- Keep the role's immediate task and next action clear.
- Show accurate status, policy context, and data provenance.
- Cover populated, empty, loading, error, and unavailable-service states.
- Check a wide desktop, a tablet, and a narrow phone layout.
- Check keyboard focus, dialog behavior, text wrapping, and reduced motion.
- Preserve manual sample submission, replacement, and undo behavior.
- Update this document when changing shared tokens or interaction conventions.

For code changes, run the repository checks relevant to the change and visually inspect affected screens. A successful build alone does not verify layout or usability.

## 12. Original Word document generator

The generator is an Operate surface for students completing documents and administrators configuring DOCX templates. Preserve the existing Inter, navy, blue, gold, white, and pale blue-gray tokens; component styles live in `app/native-document-generator.css` and are scoped to `.native-generator-dialog`.

- Use a bounded desktop dialog capped at 1440px wide and 900px tall, with 24px viewport margins, a stable title and close control, independently scrolling work areas, and a full-width footer. Keep save status on the left and the next action on the right.
- Student actions progress from **Review document** to **Download PDF** or **Download Word**. Saving drafts and editing details are secondary. Show named steps, inline field errors, and clearly selected download formats.
- Administrators use a quiet preview-mode switch, field search, optional field-management help, collapsible settings, and labeled icon controls for removal. Field row headers show the title beside the drag handle; omit location counts and input-type badges. Keep **Save settings** secondary and **Publish template** primary. The field-selection action takes priority while text is being marked; finish or cancel selection before publishing.
- At 850px and below, switch between details/settings and document preview instead of stacking a long form beneath the document. Keep both mounted to preserve answers and preview state. The footer remains visible; controls use at least 44px touch targets and phone inputs use 16px text.
- Fit the document preview to its available width initially. Preserve manual zoom, and provide a labeled fit-to-width control.
- Keep field help beside its input, retain input after failures, and show persistent action errors inside the modal. Confirm saves in the footer and downloads inside the dialog so floating notifications cannot cover its actions. Explicitly save drafts/settings; warn before closing with unsaved changes and prevent accidental backdrop dismissal. Retain Radix focus trapping and Escape handling.
- Use a restrained 200ms modal entrance and honor the application's reduced-motion setting. Reuse existing field drag and keyboard reordering, server actions, document rendering, and permission rules.
