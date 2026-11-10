import { useState } from 'react';
import type { ChangeEvent } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';

type PolicyStatement = { sid?: string; effect?: 'Allow' | 'Deny'; actions: string[]; resources: string[] };
type PolicyDraft = { name: string; statements: PolicyStatement[] };
type PolicyRecord = PolicyDraft & { _id: string };
type ApiError = { response?: { data?: { message?: string } }; message?: string };
const errorMessage = (error: unknown, fallback: string) => {
  if (!error || typeof error !== 'object') return fallback;
  return (error as ApiError).response?.data?.message || (error as ApiError).message || fallback;
};

export default function IamBuilderPage() {
  const qc = useQueryClient();
  const [json, setJson] = useState(JSON.stringify({
    name: 'New policy',
    statements: [{ sid: 'AllowRead', effect: 'Allow', actions: ['records:read'], resources: ['tenant/self/*'] }],
  }, null, 2));
  const [simAction, setSimAction] = useState('records:read');
  const [simResource, setSimResource] = useState('tenant/self/*');
  const [simResult, setSimResult] = useState<unknown>(null);
  const [error, setError] = useState<string | null>(null);

  const { data: policies } = useQuery({
    queryKey: ['iam-policies'],
    queryFn: async (): Promise<PolicyRecord[]> => (await api.get('/iam/policies')).data,
  });

  const { data: analysis } = useQuery({
    queryKey: ['iam-analyze'],
    queryFn: async (): Promise<unknown> => (await api.get('/iam/analyze')).data,
  });

  const create = useMutation({
    mutationFn: async (body: PolicyDraft) => (await api.post('/iam/policies', body)).data,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['iam-policies'] }); setError(null); },
    onError: (e: unknown) => setError(errorMessage(e, 'Create failed')),
  });

  const simulate = useMutation({
    mutationFn: async () => (await api.post('/iam/simulate', { action: simAction, resource: simResource })).data,
    onSuccess: (d) => setSimResult(d),
    onError: (e: unknown) => setError(errorMessage(e, 'Simulate failed')),
  });

  const validatePolicy = (obj: unknown): string | null => {
    if (!obj || typeof obj !== 'object' || Array.isArray(obj)) return 'Policy must be an object';
    const policy = obj as Record<string, unknown>;
    if (typeof policy.name !== 'string' || !policy.name.trim()) return 'name (string) required';
    if (!Array.isArray(policy.statements)) return 'statements (array) required';
    for (const statement of policy.statements) {
      if (!statement || typeof statement !== 'object' || Array.isArray(statement)) return 'statement must be an object';
      const row = statement as Record<string, unknown>;
      if (!Array.isArray(row.actions) || !row.actions.every((value) => typeof value === 'string' && value.trim())) return 'statement.actions (string array) required';
      if (!Array.isArray(row.resources) || !row.resources.every((value) => typeof value === 'string' && value.trim())) return 'statement.resources (string array) required';
      if (row.effect !== undefined && !['Allow', 'Deny'].includes(String(row.effect))) return 'statement.effect must be Allow|Deny';
    }
    return null;
  };

  const handleCreate = () => {
    let parsed: unknown;
    try { parsed = JSON.parse(json); } catch { setError('Invalid JSON'); return; }
    const verr = validatePolicy(parsed);
    if (verr) { setError(verr); return; }
    create.mutate(parsed as PolicyDraft);
  };

  // version diff: compare current json to a selected previous policy
  const [diffTarget, setDiffTarget] = useState<string>('');
  const diffPolicy = (policies || []).find((policy) => String(policy._id) === diffTarget);
  const computeDiff = () => {
    if (!diffPolicy) return null;
    try {
      const a = JSON.stringify(JSON.parse(json), null, 2).split('\n');
      const b = JSON.stringify(diffPolicy, null, 2).split('\n');
      const lines: string[] = [];
      const max = Math.max(a.length, b.length);
      for (let i = 0; i < max; i++) {
        if (a[i] === b[i]) lines.push('  ' + (a[i] || ''));
        else { if (a[i]) lines.push('- ' + a[i]); if (b[i]) lines.push('+ ' + b[i]); }
      }
      return lines.join('\\n');
    } catch { return 'diff error'; }
  };

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold">IAM Policy Builder</h1>
      {error ? <div className="rounded border border-red-300 bg-red-50 p-2 text-sm text-red-900">{error}</div> : null}

      <section className="space-y-2">
        <h2 className="text-lg font-semibold">Existing policies</h2>
        <pre className="max-h-48 overflow-auto rounded border bg-muted/30 p-2 text-xs">
          {JSON.stringify(policies, null, 2)}
        </pre>
      </section>

      <section className="space-y-2">
        <h2 className="text-lg font-semibold">New policy (JSON)</h2>
        <textarea
          className="h-48 w-full rounded border p-2 font-mono text-xs"
          value={json}
          onChange={(e) => setJson(e.target.value)}
        />
        <button
          type="button"
          className="rounded bg-primary px-3 py-1.5 text-sm font-semibold text-primary-foreground disabled:opacity-60"
          disabled={create.isPending}
          onClick={handleCreate}
        >
          {create.isPending ? 'Creating...' : 'Create policy'}
        </button>
      </section>

      <section className="space-y-2">
        <h2 className="text-lg font-semibold">Simulator</h2>
        <div className="flex gap-2">
          <input className="rounded border px-2 py-1 text-sm" value={simAction} onChange={(e) => setSimAction(e.target.value)} placeholder="action" />
          <input className="rounded border px-2 py-1 text-sm" value={simResource} onChange={(e) => setSimResource(e.target.value)} placeholder="resource" />
          <button
            type="button"
            className="rounded bg-primary px-3 py-1.5 text-sm font-semibold text-primary-foreground disabled:opacity-60"
            disabled={simulate.isPending}
            onClick={() => simulate.mutate()}
          >
            {simulate.isPending ? 'Simulating...' : 'Simulate'}
          </button>
        </div>
        {simResult ? (
          <pre className="max-h-48 overflow-auto rounded border bg-muted/30 p-2 text-xs">{JSON.stringify(simResult, null, 2)}</pre>
        ) : null}
      </section>
    <section className="space-y-2">
      <h2 className="text-lg font-semibold">Analyzer (risk + coverage)</h2>
      <pre className="max-h-48 overflow-auto rounded border bg-muted/30 p-2 text-xs">
        {JSON.stringify(analysis, null, 2)}
      </pre>
    </section>

    <section className="space-y-2">
      <h2 className="text-lg font-semibold">Version diff</h2>
      <select className="rounded border px-2 py-1 text-sm" value={diffTarget} onChange={(e) => setDiffTarget(e.target.value)}>
        <option value="">Select a policy to diff against</option>
        {(policies || []).map((policy) => <option key={policy._id} value={policy._id}>{policy.name}</option>)}
      </select>
      {diffTarget ? (
        <pre className="max-h-64 overflow-auto rounded border bg-muted/30 p-2 text-xs font-mono">{computeDiff()}</pre>
      ) : null}
    </section>
    </div>
  );
}
