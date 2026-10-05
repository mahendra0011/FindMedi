/**
 * AUTHZ-M-03 (F7): client-side coordination for step-up prompts.
 *
 * When the server answers 403 `STEP_UP_REQUIRED`, the axios interceptor (in
 * ./axios) lands here to collect a fresh 2FA code. Two properties matter:
 *
 *  1. ONE dialog per scope even if three parallel requests 403 together -
 *     `requestStepUpCode` hands every waiter the same promise.
 *  2. The entered code stays cached briefly (TOTP codes are valid for their
 *     window and /auth/step-up verifies statelessly) so back-to-back actions
 *     do not re-prompt. A failed exchange invalidates it immediately, so a
 *     mistyped or expired code can never wedge the user: the next 403 re-opens
 *     the dialog.
 *
 * The dialog itself registers via setStepUpPrompt - axios must not import
 * React, so the component pushes itself in when it mounts.
 */
let promptFn = null;
const pending = new Map(); // scope -> Promise<string> (resolved with the code)

export function setStepUpPrompt(fn) {
  promptFn = fn;
}

export function requestStepUpCode(scope) {
  const cached = pending.get(scope);
  if (cached) return cached;

  if (!promptFn) {
    return Promise.reject(new Error('Verification prompt is not available'));
  }

  const p = Promise.resolve()
    .then(() => promptFn(scope))
    .then(
      (code) => {
        // Keep the fresh code around for ~25s: long enough for the next
        // parallel/sequential action of the same scope, short enough that a
        // much later prompt asks the user again instead of sending a stale
        // code the server will reject.
        setTimeout(() => {
          if (pending.get(scope) === p) pending.delete(scope);
        }, 25000);
        return code;
      },
      (err) => {
        // Cancelled or failed: the next 403 must be able to re-prompt.
        if (pending.get(scope) === p) pending.delete(scope);
        throw err;
      }
    );
  pending.set(scope, p);
  return p;
}

/** Called when the code exchange itself was rejected (bad/expired code). */
export function invalidateStepUpCode(scope) {
  pending.delete(scope);
}
