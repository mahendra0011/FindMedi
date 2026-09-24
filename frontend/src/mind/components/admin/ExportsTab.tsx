import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/mind/components/ui/card";
import { Button } from "@/mind/components/ui/button";
import { BarChart3, CalendarDays, CreditCard, Download, FileText, UserCog, Users } from "lucide-react";

export default function ExportsTab({ data, users, totals, exportCSV }) {
  return (
    <>
  <div className="grid lg:grid-cols-2 gap-6">
    <Card className="glass-card overflow-hidden border-0 bg-gradient-to-br from-background via-background to-indigo-500/5">
      <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-indigo-500/40 via-indigo-400/30 to-indigo-500/40" />
      <CardHeader className="border-b border-glass-border/30">
        <CardTitle className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-500/30 to-indigo-500/10">
            <Download className="h-4 w-4 text-indigo-500" />
          </div>
          Reports & Export
        </CardTitle>
        <CardDescription>Download platform reports, user data, revenue reports, session analytics, and counsellor performance.</CardDescription>
      </CardHeader>
      <CardContent className="pt-6">
        <div className="grid gap-3">
          <div className="group rounded-xl border border-glass-border/30 bg-background/60 p-4 hover:bg-indigo-500/5 hover:border-indigo-500/20 transition-all duration-200 cursor-pointer" onClick={() => exportCSV("users")}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-blue-500/30 to-blue-500/10 border border-blue-500/20">
                  <Users className="h-5 w-5 text-blue-400" />
                </div>
                <div>
                  <p className="font-medium">User Report</p>
                  <p className="text-xs text-foreground/50">Export all registered users data</p>
                </div>
              </div>
              <Button variant="outline" size="sm" className="shrink-0 gap-2">
                <Download className="h-3.5 w-3.5" />
                Export
              </Button>
            </div>
          </div>

          <div className="group rounded-xl border border-glass-border/30 bg-background/60 p-4 hover:bg-emerald-500/5 hover:border-emerald-500/20 transition-all duration-200 cursor-pointer" onClick={() => exportCSV("revenue")}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-emerald-500/30 to-emerald-500/10 border border-emerald-500/20">
                  <CreditCard className="h-5 w-5 text-emerald-400" />
                </div>
                <div>
                  <p className="font-medium">Revenue Report</p>
                  <p className="text-xs text-foreground/50">Platform revenue, counsellor payouts, and plan revenue</p>
                </div>
              </div>
              <Button variant="outline" size="sm" className="shrink-0 gap-2">
                <Download className="h-3.5 w-3.5" />
                Export
              </Button>
            </div>
          </div>

          <div className="group rounded-xl border border-glass-border/30 bg-background/60 p-4 hover:bg-violet-500/5 hover:border-violet-500/20 transition-all duration-200 cursor-pointer" onClick={() => exportCSV("sessions")}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-violet-500/30 to-violet-500/10 border border-violet-500/20">
                  <CalendarDays className="h-5 w-5 text-violet-400" />
                </div>
                <div>
                  <p className="font-medium">Session Report</p>
                  <p className="text-xs text-foreground/50">All counselling sessions with details</p>
                </div>
              </div>
              <Button variant="outline" size="sm" className="shrink-0 gap-2">
                <Download className="h-3.5 w-3.5" />
                Export
              </Button>
            </div>
          </div>

          <div className="group rounded-xl border border-glass-border/30 bg-background/60 p-4 hover:bg-amber-500/5 hover:border-amber-500/20 transition-all duration-200 cursor-pointer" onClick={() => exportCSV("counsellors")}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-amber-500/30 to-amber-500/10 border border-amber-500/20">
                  <UserCog className="h-5 w-5 text-amber-400" />
                </div>
                <div>
                  <p className="font-medium">Counsellor Performance</p>
                  <p className="text-xs text-foreground/50">Ratings, reviews, availability, and verification status</p>
                </div>
              </div>
              <Button variant="outline" size="sm" className="shrink-0 gap-2">
                <Download className="h-3.5 w-3.5" />
                Export
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>

    <Card className="glass-card overflow-hidden border-0 bg-gradient-to-br from-background via-background to-emerald-500/5">
      <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-500/40 via-emerald-400/30 to-emerald-500/40" />
      <CardHeader className="border-b border-glass-border/30">
        <CardTitle className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-emerald-500/30 to-emerald-500/10">
            <BarChart3 className="h-4 w-4 text-emerald-500" />
          </div>
          Platform Summary
        </CardTitle>
        <CardDescription>Quick overview of platform statistics</CardDescription>
      </CardHeader>
      <CardContent className="pt-6 space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-xl border border-glass-border/30 bg-gradient-to-br from-blue-500/5 to-background p-3.5 text-center">
            <Users className="mx-auto h-5 w-5 text-blue-400" />
            <p className="text-lg font-bold mt-1">{totals.userCount}</p>
            <p className="text-xs text-foreground/50">Total Users</p>
          </div>
          <div className="rounded-xl border border-glass-border/30 bg-gradient-to-br from-emerald-500/5 to-background p-3.5 text-center">
            <UserCog className="mx-auto h-5 w-5 text-emerald-400" />
            <p className="text-lg font-bold mt-1">{data.stats.activeCounsellors}</p>
            <p className="text-xs text-foreground/50">Counsellors</p>
          </div>
          <div className="rounded-xl border border-glass-border/30 bg-gradient-to-br from-violet-500/5 to-background p-3.5 text-center">
            <CalendarDays className="mx-auto h-5 w-5 text-violet-400" />
            <p className="text-lg font-bold mt-1">{totals.appointmentCount}</p>
            <p className="text-xs text-foreground/50">Sessions</p>
          </div>
          <div className="rounded-xl border border-glass-border/30 bg-gradient-to-br from-amber-500/5 to-background p-3.5 text-center">
            <CreditCard className="mx-auto h-5 w-5 text-amber-400" />
            <p className="text-lg font-bold mt-1">Rs. {data.stats.revenue}</p>
            <p className="text-xs text-foreground/50">Revenue</p>
          </div>
        </div>

        <div className="rounded-xl border border-glass-border/30 bg-background/60 p-4">
          <div className="flex items-center gap-2 mb-3">
            <Download className="h-4 w-4 text-foreground/50" />
            <span className="text-sm font-medium">Last Export</span>
          </div>
          <p className="text-xs text-foreground/50">No exports have been made yet. Click any export button above to generate a CSV report.</p>
        </div>

        <div className="rounded-xl bg-gradient-to-br from-indigo-500/10 to-transparent border border-indigo-500/20 p-4">
          <div className="flex items-center gap-2 mb-2">
            <FileText className="h-4 w-4 text-indigo-400" />
            <span className="text-sm font-medium text-indigo-400">Pro Tip</span>
          </div>
          <p className="text-xs text-foreground/60 leading-relaxed">
            Export reports are generated in CSV format and can be opened in Excel, Google Sheets, or any spreadsheet application. 
            Data is filtered based on the current date.
          </p>
        </div>
      </CardContent>
    </Card>
  </div>
    </>
  );
}
