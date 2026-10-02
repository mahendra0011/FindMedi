// AUTH-030: mass-assignment allowlists. Handlers must never pass req.body
// straight into findByIdAndUpdate/Object.assign — pick() restricts writes to
// explicitly permitted fields (tenant/identity fields can never be set).
export function pickBody(body = {}, allowed = []) {
  const out = {};
  for (const key of allowed) {
    if (body[key] !== undefined) out[key] = body[key];
  }
  return out;
}
