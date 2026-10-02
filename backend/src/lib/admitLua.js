/**
 * ADM-M-06: the sliding-window admission script, shared by the GRL rate
 * limiters (middleware/rateLimit.js) and the per-tenant quota guard
 * (services/tenantQuotaService.js).
 *
 * It lives in lib/ (not in either consumer) so the two counters can never
 * drift: the same prune -> count -> conditional-add sequence has to hold for
 * a per-user limiter and a per-hospital quota, because both rely on the
 * Lua contract documented in AUTH-B-04 / RL-01 - at/over the cap the script
 * returns the PRE-add count (exactly `maxn`), under the cap the POST-add
 * count, so callers must compare with `>=`.
 */
export const ADMIT_LUA = `
local key = KEYS[1]
local now = tonumber(ARGV[1])
local win = tonumber(ARGV[2])
local maxn = tonumber(ARGV[3])
local member = ARGV[4]
redis.call('ZREMRANGEBYSCORE', key, '-inf', now - win)
local count = redis.call('ZCARD', key)
if count >= maxn then return count end
redis.call('ZADD', key, now, member)
redis.call('PEXPIRE', key, win)
return count + 1
`;
