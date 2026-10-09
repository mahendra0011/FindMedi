/**
 * File 13 §13.1: table-driven workflow runtime (doc's sanctioned simpler
 * alternative to xstate). Pure transition logic + graph validation; routes
 * own persistence, SLA timers and side-effect actions.
 */

/** Graph checks: single start, no orphan states, all paths reach an end. */
export function validateDefinition(def) {
  const errors = [];
  const states = def?.states || [];
  const transitions = def?.transitions || [];
  const ids = new Set(states.map((s) => s.id));
  const starts = states.filter((s) => s.type === 'start');
  if (starts.length !== 1) errors.push('exactly one start state required');
  for (const t of transitions) {
    if (!ids.has(t.from)) errors.push(`orphan transition from ${t.from}`);
    if (!ids.has(t.to)) errors.push(`orphan transition to ${t.to}`);
    if (!t.event) errors.push('transition without event');
  }
  // Reachability: every state reachable from start; every state can reach end.
  const ends = new Set(states.filter((s) => s.type === 'end').map((s) => s.id));
  if (starts.length === 1) {
    const seen = new Set([starts[0].id]);
    const queue = [starts[0].id];
    while (queue.length) {
      const cur = queue.pop();
      for (const t of transitions.filter((x) => x.from === cur)) {
        if (!seen.has(t.to)) { seen.add(t.to); queue.push(t.to); }
      }
    }
    for (const id of ids) {
      if (!seen.has(id)) errors.push(`unreachable state ${id}`);
    }
    const canReachEnd = new Set([...ends]);
    let grew = true;
    while (grew) {
      grew = false;
      for (const t of transitions) {
        if (canReachEnd.has(t.to) && !canReachEnd.has(t.from)) {
          canReachEnd.add(t.from);
          grew = true;
        }
      }
    }
    for (const id of ids) {
      if (!canReachEnd.has(id)) errors.push(`dead-end state ${id}`);
    }
  }
  return errors;
}

/** Guard check: role allowlist OR permission allowlist (either suffices). */
export function guardPasses(guard, user, hasPermission) {
  if (!guard) return true;
  if (Array.isArray(guard.roles) && guard.roles.length && guard.roles.includes(user?.role)) return true;
  if (Array.isArray(guard.permissions) && guard.permissions.length
    && guard.permissions.some((p) => hasPermission(p))) return true;
  if ((!guard.roles || !guard.roles.length) && (!guard.permissions || !guard.permissions.length)) return true;
  return false;
}

/**
 * Pure transition: returns { to, join } or throws with a code.
 * Parallel branches: instance.activeStates tracks open branches; a `join`
 * transition fires only when all listed branches are active.
 */
export function fireTransition(def, instance, event, user, hasPermission) {
  const candidates = (def.transitions || []).filter((t) => t.event === event
    && (instance.activeStates || [instance.state]).includes(t.from));
  if (!candidates.length) {
    const err = new Error(`No transition for event ${event} from current state`);
    err.code = 'NO_TRANSITION';
    throw err;
  }
  const t = candidates[0];
  if (!guardPasses(t.guard, user, hasPermission)) {
    const err = new Error('Guard denied');
    err.code = 'GUARD_DENIED';
    throw err;
  }
  const toState = (def.states || []).find((s) => s.id === t.to);
  let activeStates = instance.activeStates || [instance.state];
  if (toState?.type === 'join') {
    // Join consumes the branch that fired; completes when none remain open
    // besides the join target itself.
    activeStates = activeStates.filter((s) => s !== t.from);
    if (activeStates.length > 0) {
      return { to: instance.state, join: 'waiting', remaining: activeStates };
    }
  } else if (toState?.type === 'parallel') {
    activeStates = (def.transitions || []).filter((x) => x.from === t.to).map((x) => x.to);
    if (!activeStates.length) activeStates = [t.to];
  } else {
    activeStates = [t.to];
  }
  return { to: t.to, join: toState?.type === 'join' ? 'done' : undefined, remaining: activeStates, activeStates };
}
