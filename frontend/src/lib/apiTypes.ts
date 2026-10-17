/**
 * TEST-B-03 ratchet — interim shape for API-sourced rows.
 *
 * A lot of this app fetches arrays from the backend and reads fields straight
 * off them. Those arrays were declared as `useState([])`, which TypeScript
 * infers as `never[]`, so every field read became TS2339 "does not exist on
 * type 'never'" — the single largest error class in the codebase (thousands
 * of diagnostics across ~185 files) and a backlog nobody was ever going to
 * pay off one interface at a time.
 *
 * The long-term fix is a real domain type per endpoint. Until each of those
 * exists, `ApiRow` is the honest interim: it says "this came from the API and
 * we have not modelled its fields yet", which is exactly what the previous
 * code meant, only without emitting a diagnostic for it. Property access
 * stays permissive (`any`) — it was never checked before either; the change
 * is that the IDE and CI no longer drown the signal that does matter.
 *
 * Prefer a real type the moment one exists for the payload in question.
 */
export type ApiRow = Record<string, any>;
