import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/mind/components/ui/card";
import { Input } from "@/mind/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/mind/components/ui/select";
import { ShieldCheck, Wallet } from "lucide-react";

export const defaultProviderSettings = {
  crisisStandby: false,
  refundPolicy: "full_24h",
  decompressionGapMin: 15,
  rciNumber: "",
  nmcRegNumber: "",
  notesLock: false,
  sealUrl: "",
  scheduleXRestricted: true,
  intakeFee: 0,
  rxReviewFee: 0,
  emergencyTriageFee: 0,
  payoutBank: { accountHolder: "", accountNumber: "", ifsc: "", upiId: "", verified: false },
};

function Toggle({ title, text, checked, onToggle }: { title: string; text: string; checked: boolean; onToggle: () => void }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-xl border border-glass-border/30 bg-background/60 p-3">
      <div>
        <p className="text-sm font-medium">{title}</p>
        <p className="text-xs text-foreground/55">{text}</p>
      </div>
      <input type="checkbox" checked={checked} onChange={onToggle} className="h-5 w-5 rounded accent-primary" />
    </div>
  );
}

export default function ProviderSettingsMaster({
  value,
  onChange,
  mode,
}: {
  value: typeof defaultProviderSettings;
  onChange: (next: typeof defaultProviderSettings) => void;
  mode: "counsellor" | "psychiatrist";
}) {
  const set = (patch: Partial<typeof defaultProviderSettings>) => onChange({ ...value, ...patch });
  const setBank = (patch: Partial<typeof defaultProviderSettings.payoutBank>) =>
    onChange({ ...value, payoutBank: { ...value.payoutBank, ...patch } });

  return (
    <Card className="glass-card overflow-hidden">
      <CardHeader className="border-b border-glass-border/40 bg-gradient-to-br from-primary/10 via-secondary/5 to-transparent">
        <CardTitle className="flex items-center gap-2">
          <ShieldCheck className="h-5 w-5 text-primary" />
          {mode === "psychiatrist" ? "Clinical Practice Settings" : "Therapy Practice Settings"}
        </CardTitle>
        <CardDescription>
          {mode === "psychiatrist"
            ? "Crisis cover, cancellation rules, Rx fees, statutory credentials, safety gate and payouts."
            : "Crisis cover, cancellation rules, session pacing, accreditation and payouts."}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3 pt-5">
        <Toggle
          title={mode === "psychiatrist" ? "Emergency psych SOS & acute mania standby" : "24/7 suicide & acute crisis standby"}
          text="Distressed users in acute crisis can reach you on standby."
          checked={value.crisisStandby}
          onToggle={() => set({ crisisStandby: !value.crisisStandby })}
        />

        <div className="space-y-1.5">
          <label className="text-sm font-medium">Cancellation & refund policy</label>
          <Select value={value.refundPolicy} onValueChange={(v) => set({ refundPolicy: v })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="full_24h">100% refund if cancelled &gt;24h before</SelectItem>
              <SelectItem value="half_4_24h">50% refund if cancelled 4–24h before</SelectItem>
              <SelectItem value="none_4h">No refund if cancelled &lt;4h before</SelectItem>
              <SelectItem value="full_12h">100% refund if cancelled &gt;12h before</SelectItem>
              <SelectItem value="none_2h">No refund if cancelled &lt;2h before</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {mode === "counsellor" ? (
          <>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Post-session decompression gap (minutes)</label>
              <Select value={String(value.decompressionGapMin)} onValueChange={(v) => set({ decompressionGapMin: Number(v) })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {[0, 10, 15, 20, 30].map((m) => (
                    <SelectItem key={m} value={String(m)}>{m} min</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">RCI registration (clinical psychologists)</label>
              <Input value={value.rciNumber} onChange={(e) => set({ rciNumber: e.target.value })} placeholder="CRR number + validity" />
            </div>
            <Toggle
              title="Encrypted session-notes lock"
              text="Require confirmation before opening confidential notes on shared devices."
              checked={value.notesLock}
              onToggle={() => set({ notesLock: !value.notesLock })}
            />
          </>
        ) : (
          <>
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="space-y-1.5">
                <label className="text-sm font-medium">60m intake fee (₹)</label>
                <Input type="number" min={0} value={value.intakeFee} onChange={(e) => set({ intakeFee: Number(e.target.value) })} />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium">20m Rx review fee (₹)</label>
                <Input type="number" min={0} value={value.rxReviewFee} onChange={(e) => set({ rxReviewFee: Number(e.target.value) })} />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Emergency triage fee (₹)</label>
                <Input type="number" min={0} value={value.emergencyTriageFee} onChange={(e) => set({ emergencyTriageFee: Number(e.target.value) })} />
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">NMC / State Medical Council reg. no.</label>
              <Input value={value.nmcRegNumber} onChange={(e) => set({ nmcRegNumber: e.target.value })} placeholder="Registration number + year" />
            </div>
            <Toggle
              title="Schedule-X & NDPS safety gate"
              text="Restrict habit-forming prescriptions per telemedicine guidelines."
              checked={value.scheduleXRestricted}
              onToggle={() => set({ scheduleXRestricted: !value.scheduleXRestricted })}
            />
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Digital RMP seal URL (PNG/SVG)</label>
              <Input value={value.sealUrl} onChange={(e) => set({ sealUrl: e.target.value })} placeholder="https://…/seal.png" />
            </div>
          </>
        )}

        <div className="space-y-2 rounded-xl border border-glass-border/30 p-3">
          <p className="text-sm font-medium flex items-center gap-2"><Wallet className="h-4 w-4 text-primary" /> Direct payout bank / UPI</p>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <label className="text-xs font-medium">Account holder</label>
              <Input value={value.payoutBank.accountHolder} onChange={(e) => setBank({ accountHolder: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium">Account number</label>
              <Input value={value.payoutBank.accountNumber} onChange={(e) => setBank({ accountNumber: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium">IFSC</label>
              <Input value={value.payoutBank.ifsc} onChange={(e) => setBank({ ifsc: e.target.value.toUpperCase() })} />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium">UPI ID</label>
              <Input value={value.payoutBank.upiId} onChange={(e) => setBank({ upiId: e.target.value })} />
            </div>
          </div>
          {value.payoutBank.verified && <p className="text-xs font-bold text-emerald-600">✓ Payout account verified by admin</p>}
        </div>
      </CardContent>
    </Card>
  );
}
