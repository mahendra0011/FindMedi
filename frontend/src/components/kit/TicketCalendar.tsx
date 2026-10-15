/**
 * 11.md §7 shared kit: TicketQR + CalendarGrid.
 * TicketQR renders a scannable entry pass (event tickets, camp check-ins,
 * OPD tokens). CalendarGrid is a thin month wrapper over react-day-picker
 * for provider availability / leave blocking.
 */
import { QRCodeSVG } from 'qrcode.react';
import { DayPicker } from 'react-day-picker';

export function TicketQR({ value, label }: { value: string; label?: string }) {
  return (
    <div data-testid="ticket-qr" className="flex flex-col items-center gap-2 rounded-xl border bg-background p-4">
      <QRCodeSVG value={value} size={140} level="M" />
      <p className="text-xs font-mono text-muted-foreground break-all text-center">{label || value}</p>
    </div>
  );
}

export function CalendarGrid({
  selected,
  onSelect,
  disabledDays,
}: {
  selected?: Date;
  onSelect: (day?: Date) => void;
  // DayPicker Matcher passthrough (kept loose: single day, ranges, ranges).
  disabledDays?: any;
}) {
  return (
    <div data-testid="calendar-grid" className="rounded-xl border bg-card p-2">
      <DayPicker mode="single" selected={selected} onSelect={onSelect} disabled={disabledDays} />
    </div>
  );
}
