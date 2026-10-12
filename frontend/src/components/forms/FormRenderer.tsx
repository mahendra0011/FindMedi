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
  /** Hindi (Devanagari) label — optional; rendered as secondary text when present or primary when locale === 'hi'. */
  labelHi?: string;
  placeholder?: string;
  placeholderHi?: string;
  help?: string;
  helpHi?: string;
  required?: boolean;
  options?: string[];
  optionsHi?: string[];
  showIf?: any;
  requiredIf?: any;
}

export default function FormRenderer({
  template, values, onChange, onSubmit, submitLabel, locale = 'en',
}: {
  template: any;
  values: Record<string, any>;
  onChange: (values: Record<string, any>) => void;
  onSubmit: () => void;
  submitLabel?: string;
  locale?: 'en' | 'hi' | string;
}) {
  const set = (id: string, v: any) => onChange({ ...values, [id]: v });
  const isHi = locale === 'hi';
  const sections = template?.definition?.sections || [];
  // Hindi label: show Devanagari under the primary label when the template
  // provides one (checklist item 12 — Hindi labels). When locale === 'hi',
  // prioritize Hindi with English fallback.
  const labelWithHi = (f: FormField, required: boolean) => {
    if (isHi) {
      const primary = f.labelHi || f.label;
      return (
        <span className="font-medium" lang="hi">
          {primary}{required ? ' *' : ''}
          {f.labelHi && f.label && f.labelHi !== f.label && (
            <span lang="en" className="block text-xs font-normal text-muted-foreground">{f.label}</span>
          )}
        </span>
      );
    }
    return (
      <span className="font-medium">
        {f.label}{required ? ' *' : ''}
        {f.labelHi && <span lang="hi" className="block text-xs font-normal text-muted-foreground">{f.labelHi}</span>}
      </span>
    );
  };

  const getPlaceholder = (f: FormField) => (isHi ? (f.placeholderHi || f.placeholder) : f.placeholder);
  const getOptions = (f: FormField) => (isHi && f.optionsHi?.length ? f.optionsHi : (f.options || []));
  const getHelp = (f: FormField) => (isHi ? (f.helpHi || f.help) : f.help);

  return (
    <div className="space-y-5">
      {sections.map((sec: any) => (
        <div key={sec.id} className="space-y-3">
          {(isHi ? (sec.titleHi || sec.title) : sec.title) && (
            <h3 className="font-bold text-sm" lang={isHi && sec.titleHi ? 'hi' : undefined}>
              {isHi ? (sec.titleHi || sec.title) : sec.title}
            </h3>
          )}
          {(sec.fields || []).map((f: FormField) => {
            if (!evalRule(f.showIf ?? null, values)) return null;
            const required = f.required || evalRule(f.requiredIf ?? null, values);
            const common = 'w-full';
            const placeholder = getPlaceholder(f);
            const options = getOptions(f);
            const help = getHelp(f);

            switch (f.type) {
              case 'textarea':
                return (
                  <label key={f.id} className="block text-sm">
                    {labelWithHi(f, required)}
                    <textarea
                      className={`${common} mt-1 rounded-md border border-input bg-background p-2 min-h-20`}
                      placeholder={placeholder}
                      value={values[f.id] ?? ''}
                      onChange={(e) => set(f.id, e.target.value)}
                    />
                    {help && <p className="text-xs text-muted-foreground mt-1">{help}</p>}
                  </label>
                );
              case 'number':
              case 'scale':
                return (
                  <label key={f.id} className="block text-sm">
                    {labelWithHi(f, required)}
                    <Input
                      className="mt-1"
                      type="number"
                      inputMode="numeric"
                      placeholder={placeholder}
                      value={values[f.id] ?? ''}
                      onChange={(e) => set(f.id, e.target.value === '' ? '' : Number(e.target.value))}
                    />
                    {help && <p className="text-xs text-muted-foreground mt-1">{help}</p>}
                  </label>
                );
              case 'select':
              case 'radio':
                return (
                  <label key={f.id} className="block text-sm">
                    {labelWithHi(f, required)}
                    <select
                      className="mt-1 h-10 w-full rounded-md border border-input bg-background px-3"
                      value={values[f.id] ?? ''}
                      onChange={(e) => set(f.id, e.target.value)}
                    >
                      <option value="">{isHi ? 'चयन करें' : 'Select'}</option>
                      {options.map((o: string) => <option key={o} value={o}>{o}</option>)}
                    </select>
                    {help && <p className="text-xs text-muted-foreground mt-1">{help}</p>}
                  </label>
                );
              case 'checkbox':
              case 'multiselect': {
                const cur: string[] = Array.isArray(values[f.id]) ? values[f.id] : [];
                return (
                  <fieldset key={f.id} className="text-sm">
                    <legend className="font-medium">{labelWithHi(f, required)}</legend>
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
                    {labelWithHi(f, required)}
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
                    {labelWithHi(f, required)}
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
                    {labelWithHi(f, required)}
                    <Input
                      className="mt-1"
                      type={f.type === 'text' ? 'text' : f.type}
                      placeholder={placeholder}
                      value={values[f.id] ?? ''}
                      onChange={(e) => set(f.id, e.target.value)}
                    />
                    {help && <p className="text-xs text-muted-foreground mt-1">{help}</p>}
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
