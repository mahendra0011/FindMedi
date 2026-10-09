import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

/**
 * File 14 §14.1 — form renderer: template JSON → inputs. showIf/requiredIf
 * evaluated by a tiny local JSON-logic subset (==, !=, >, <, >=, <=, in,
 * and, or, not, var) — no eval, mirrors server json-logic-js for the
 * operators used in builders. Dense, keyboard-first, no decorative motion.
 */

const getVar = (values: any, path: string) => {
  if (path === '') return values;
  return String(path).split('.').reduce((o: any, k) => (o == null ? undefined : o[k]), values);
};

export function evalRule(rule: any, values: any): boolean {
  if (rule === null || rule === undefined) return true;
  if (typeof rule === 'boolean') return rule;
  if (typeof rule !== 'object') return Boolean(rule);
  const ops: Record<string, (a: any) => boolean> = {
    '==': ([a, b]) => a === b,
    '===': ([a, b]) => a === b,
    '!=': ([a, b]) => a !== b,
    '!==': ([a, b]) => a !== b,
    '>': ([a, b]) => a > b,
    '<': ([a, b]) => a < b,
    '>=': ([a, b]) => a >= b,
    '<=': ([a, b]) => a <= b,
    '!': ([a]) => !a,
    '!!': ([a]) => !!a,
    or: (args) => args.some(Boolean),
    and: (args) => args.every(Boolean),
    in: ([a, b]) => Array.isArray(b) ? b.includes(a) : String(b).includes(String(a)),
  };
  const keys = Object.keys(rule);
  if (keys.length === 1 && keys[0] === 'var') {
    const v = rule.var;
    return getVar(values, Array.isArray(v) ? String(v[0]) : String(v));
  }
  if (keys.length === 1 && ops[keys[0]]) {
    const raw = (rule as any)[keys[0]];
    const args = (Array.isArray(raw) ? raw : [raw]).map((x) => resolveVal(x, values));
    return ops[keys[0]](args);
  }
  return false;
}

const resolveVal = (x: any, values: any) => {
  if (x && typeof x === 'object' && Object.keys(x).length === 1 && 'var' in x) {
    const v = (x as any).var;
    return getVar(values, Array.isArray(v) ? String(v[0]) : String(v));
  }
  if (x && typeof x === 'object') return evalRule(x, values);
  return x;
};

export interface FormField {
  id: string;
  type: string;
  label?: string;
  required?: boolean;
  options?: string[];
  showIf?: any;
  requiredIf?: any;
}

export default function FormRenderer({
  template, values, onChange, onSubmit, submitLabel,
}: {
  template: any;
  values: Record<string, any>;
  onChange: (values: Record<string, any>) => void;
  onSubmit: () => void;
  submitLabel?: string;
}) {
  const set = (id: string, v: any) => onChange({ ...values, [id]: v });
  const sections = template?.definition?.sections || [];

  return (
    <div className="space-y-5">
      {sections.map((sec: any) => (
        <div key={sec.id} className="space-y-3">
          {sec.title && <h3 className="font-bold text-sm">{sec.title}</h3>}
          {(sec.fields || []).map((f: FormField) => {
            if (!evalRule(f.showIf ?? null, values)) return null;
            const required = f.required || evalRule(f.requiredIf ?? null, values);
            const common = 'w-full';
            switch (f.type) {
              case 'textarea':
                return (
                  <label key={f.id} className="block text-sm">
                    <span className="font-medium">{f.label}{required ? ' *' : ''}</span>
                    <textarea className={`${common} mt-1 rounded-md border border-input bg-background p-2 min-h-20`} value={values[f.id] ?? ''} onChange={(e) => set(f.id, e.target.value)} />
                  </label>
                );
              case 'number':
              case 'scale':
                return (
                  <label key={f.id} className="block text-sm">
                    <span className="font-medium">{f.label}{required ? ' *' : ''}</span>
                    <Input className="mt-1" type="number" inputMode="numeric" value={values[f.id] ?? ''} onChange={(e) => set(f.id, e.target.value === '' ? '' : Number(e.target.value))} />
                  </label>
                );
              case 'select':
              case 'radio':
                return (
                  <label key={f.id} className="block text-sm">
                    <span className="font-medium">{f.label}{required ? ' *' : ''}</span>
                    <select className="mt-1 h-10 w-full rounded-md border border-input bg-background px-3" value={values[f.id] ?? ''} onChange={(e) => set(f.id, e.target.value)}>
                      <option value="">Select</option>
                      {(f.options || []).map((o) => <option key={o} value={o}>{o}</option>)}
                    </select>
                  </label>
                );
              case 'checkbox':
              case 'multiselect': {
                const cur: string[] = Array.isArray(values[f.id]) ? values[f.id] : [];
                return (
                  <fieldset key={f.id} className="text-sm">
                    <legend className="font-medium">{f.label}{required ? ' *' : ''}</legend>
                    {(f.options || []).map((o) => (
                      <label key={o} className="flex items-center gap-2 py-1">
                        <input type="checkbox" checked={cur.includes(o)} onChange={() => set(f.id, cur.includes(o) ? cur.filter((x) => x !== o) : [...cur, o])} />
                        {o}
                      </label>
                    ))}
                  </fieldset>
                );
              }
              case 'yesno':
                return (
                  <div key={f.id} className="flex items-center gap-2 text-sm">
                    <span className="font-medium">{f.label}{required ? ' *' : ''}</span>
                    {['yes', 'no', 'na'].map((o) => (
                      <Button key={o} size="sm" variant={values[f.id] === o ? 'default' : 'outline'} onClick={() => set(f.id, o)}>{o}</Button>
                    ))}
                  </div>
                );
              case 'section':
              case 'info':
                return <p key={f.id} className="text-sm text-muted-foreground">{f.label}</p>;
              case 'signature':
                return (
                  <label key={f.id} className="block text-sm">
                    <span className="font-medium">{f.label}{required ? ' *' : ''}</span>
                    <Input className="mt-1 font-mono" placeholder="Type full name to sign" value={values[f.id] ?? ''} onChange={(e) => set(f.id, e.target.value)} />
                  </label>
                );
              case 'calculated':
              case 'score':
                return (
                  <p key={f.id} className="text-sm"><span className="font-medium">{f.label}: </span><b>{values[f.id] ?? '—'}</b></p>
                );
              case 'text':
              case 'date':
              case 'time':
              default:
                return (
                  <label key={f.id} className="block text-sm">
                    <span className="font-medium">{f.label}{required ? ' *' : ''}</span>
                    <Input className="mt-1" type={f.type === 'text' ? 'text' : f.type} value={values[f.id] ?? ''} onChange={(e) => set(f.id, e.target.value)} />
                  </label>
                );
            }
          })}
        </div>
      ))}
      <Button onClick={onSubmit}>{submitLabel || 'Submit'}</Button>
    </div>
  );
}
