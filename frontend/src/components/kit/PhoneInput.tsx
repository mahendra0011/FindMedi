/**
 * 11.md §7 shared kit: PhoneInput (+91, 10-digit).
 * Normalises to digits on every keystroke; reports validity up so callers
 * never submit a malformed number. Plain-language error, no jargon.
 */
import { useState } from 'react';

export function isValidIndianMobile(digits: string): boolean {
  return /^[6-9]\d{9}$/.test(digits);
}

export default function PhoneInput({
  value,
  onChange,
  label = 'Mobile number',
}: {
  value: string;
  onChange: (digits: string, valid: boolean) => void;
  label?: string;
}) {
  const [touched, setTouched] = useState(false);
  const digits = String(value || '').replace(/[^0-9]/g, '').slice(-10);
  const valid = isValidIndianMobile(digits);
  const showError = touched && !valid;

  return (
    <div data-testid="phone-input">
      <label className="block text-xs font-medium mb-1">{label}</label>
      <div className="flex items-stretch gap-2">
        <span className="inline-flex items-center px-2.5 rounded-lg border bg-muted text-xs font-semibold text-muted-foreground">+91</span>
        <input
          type="tel"
          inputMode="numeric"
          value={digits}
          placeholder="10-digit mobile number"
          onChange={(e) => {
            const d = e.target.value.replace(/[^0-9]/g, '').slice(-10);
            onChange(d, isValidIndianMobile(d));
          }}
          onBlur={() => setTouched(true)}
          className="flex-1 text-sm px-3 py-2 rounded-lg border bg-background focus:outline-none focus:ring-1 focus:ring-primary"
        />
      </div>
      {showError && <p className="text-[11px] text-destructive mt-1">Enter a 10-digit mobile number starting with 6–9.</p>}
    </div>
  );
}
