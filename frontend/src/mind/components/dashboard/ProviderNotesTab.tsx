import { NotebookPen } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/mind/components/ui/card";
import { Badge } from "@/mind/components/ui/badge";
import { Button } from "@/mind/components/ui/button";
import { Textarea } from "@/mind/components/ui/textarea";

export function ProviderNotesTab({
  noteTemplates,
  activeSessions,
  appointments,
  notes,
  setNotes,
  updateAppointment,
  toast,
  statusTone,
  subtitle = "Tap a template to fill it into every active session below, then edit per session. Add diagnosis in the note for medical records.",
}) {
  return (
    <Card className="glass-card">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <NotebookPen className="h-5 w-5 text-primary" />
          Confidential Session Notes
        </CardTitle>
        <CardDescription>Save recommendations, treatment plans, and post-session notes.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-xs text-foreground/50">{subtitle}</p>
        <div className="grid gap-2 md:grid-cols-4">
          {noteTemplates.map((template) => (
            <button
              type="button"
              key={template}
              title="Fill into all active sessions"
              onClick={() => {
                const targets = activeSessions.length ? activeSessions : appointments.slice(0, 3);
                if (!targets.length) return;
                setNotes((current) => {
                  const next = { ...current };
                  targets.forEach((t) => { if (!next[t.id]) next[t.id] = template; });
                  return next;
                });
                toast({ title: `Template added to ${targets.length} session(s)` });
              }}
              className="rounded-xl border border-glass-border/40 bg-background/60 p-3 text-left text-xs text-foreground/70 transition hover:border-primary/40 hover:bg-primary/5"
            >
              {template}
            </button>
          ))}
        </div>
        <div className="space-y-4">
          {(activeSessions.length ? activeSessions : appointments).map((appointment) => (
            <div key={appointment.id} className="rounded-xl border border-glass-border/40 bg-background/60 p-4">
              <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                <div>
                  <div className="font-semibold">{appointment.studentName || appointment.studentEmail}</div>
                  <div className="text-sm text-foreground/60">{appointment.date} at {appointment.time}</div>
                </div>
                <Badge className={statusTone[appointment.status] || "bg-foreground/10 text-foreground"}>{appointment.status}</Badge>
              </div>
              <Textarea
                rows={4}
                className="mt-3"
                value={notes[appointment.id] ?? appointment.notes ?? ""}
                onChange={(event) => setNotes((current) => ({ ...current, [appointment.id]: event.target.value }))}
                placeholder="Write confidential notes, recommendations, and treatment plan..."
              />
              <div className="mt-3 flex flex-wrap gap-2">
                <Button onClick={() => updateAppointment(appointment.id, { notes: notes[appointment.id] || "" }, "Notes saved")}>
                  Save notes
                </Button>
                <Button
                  variant="outline"
                  onClick={() =>
                    updateAppointment(
                      appointment.id,
                      { status: "completed", notes: notes[appointment.id] || appointment.notes || "" },
                      "Session completed"
                    )
                  }
                >
                  Mark completed
                </Button>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
