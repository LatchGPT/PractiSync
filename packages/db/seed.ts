// Hosted demo seed: this entrypoint exposes the same guarded idempotent fixtures
// used by Auth.js sign-in. It must execute inside the demo Worker with DB binding.
// The institutional PostgreSQL runtime is not yet integrated; see runbook.md.
export {seed} from './demo';
