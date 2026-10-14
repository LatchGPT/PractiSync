# PractiSync code review

## High-level summary

PractiSync has a sound baseline for a demo application: API actions are origin-checked, inputs are validated with Zod, authentication is server-issued, and rendered text uses React's escaping. The focused review found one request-boundary issue and one misleading initial-load error state. Both have been fixed in this pass.

## Critical issues

No known critical issue remains from this review. The API body-size bypass was high priority and is now fixed: the mutation route counts streamed bytes, requires JSON, rejects non-object payloads, and validates action names as own properties. Page loading failures now show a retryable error state instead of looking like a signed-out session.

## Actionable feedback

### UI/UX and accessibility

- The shared CSS provides keyboard focus indicators, disabled states, responsive breakpoints, and reduced-motion support. Common form controls use labels and validation feedback.
- Initial server read failures were previously collapsed into `initial=null`, which rendered the sign-in screen even when the user might still have a valid session. This now renders a dedicated, announced error state with a retry action.
- Browser and assistive-technology checks were not available in this pass. Continue with keyboard-only and narrow viewport checks for dialogs, navigation, tables, and notification controls.

### Performance

- `app/practisync.tsx` is about 88 KB and owns authentication UI, navigation, filtering, dialogs, tables, dashboards, and PDF export. This makes routine updates expensive to parse and reason about. Split along existing page/workflow boundaries and lazy-load chart-heavy views if measured bundle or interaction costs warrant it.
- Derived datasets are repeatedly filtered during render, including progress calculations over entries and chart aggregates. Memoize only after profiling with larger snapshots; reads are currently bounded by the server.
- Google Fonts is referenced both from the root layout and the global stylesheet. Keep one loading path to avoid duplicate configuration and simplify font loading behavior.

### Architecture and best practices

- The `mutate` action switch centralizes authorization, validation dispatch, SQL writes, notifications, and audit behavior. As features grow, move each action family behind small handlers while keeping shared transaction and audit policy explicit.
- The React client and API already use a useful boundary: server-issued identity, typed snapshots, and Zod action contracts. Preserve server-side authorization when extracting UI modules.

### Readability and maintainability

- Several large UI and domain files use highly compressed one-line implementations. Format touched code and gradually split components/functions by responsibility; avoid a broad rewrite without behavior-focused coverage.
- Keep user-visible error messages distinct from authentication state so operational failures do not imply sign-out.

### Security

- `app/api/action/route.ts` previously relied on `Content-Length` before calling `request.json()`. Missing or inaccurate lengths could bypass the intended 20 KB limit. The route now uses bounded streaming and returns `413` when the actual body exceeds the limit.
- The action lookup now uses `Object.hasOwn`, preventing inherited object properties from being treated as registered actions.
- No `dangerouslySetInnerHTML`, direct `innerHTML`, or `eval` sinks were found in the searched application, packages, and non-primitive components. React text interpolation remains escaped; continue validating all values at server action boundaries.

## Changes and verification

- Added bounded JSON request parsing with content-type, byte-size, UTF-8, JSON-shape, and action-name checks.
- Added a workspace load failure state with a retry action.
- Added focused request-body tests. Typecheck passed, all 40 tests passed, and the production build completed. Lint passed with 43 warnings, chiefly unused imports/locals already present in the reviewed files. Visual browser QA remains outstanding.
