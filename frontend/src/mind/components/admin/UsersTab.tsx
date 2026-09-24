import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/mind/components/ui/card";
import { Badge } from "@/mind/components/ui/badge";
import { Button } from "@/mind/components/ui/button";
import { Input } from "@/mind/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/mind/components/ui/select";
import { CheckCircle2, Mail, Plus, ShieldAlert, ShieldCheck, UserCog, Users } from "lucide-react";
import { Label } from "@/mind/components/ui/label";

export default function UsersTab({ users, newUser, setNewUser, createUser, updateUserStatus, updateUserDetails, deleteUser }) {
  return (
    <>
  {/* User Stats */}
  <div className="grid md:grid-cols-4 gap-4">
    <div className="relative overflow-hidden rounded-2xl border border-blue-500/20 bg-gradient-to-br from-blue-500/10 via-blue-500/5 to-background p-5 group hover:shadow-lg hover:shadow-blue-500/5 transition-all duration-300">
      <div className="absolute -top-6 -right-6 h-20 w-20 rounded-full bg-blue-500/10 blur-2xl group-hover:bg-blue-500/20 transition-all duration-500" />
      <div className="relative z-10">
        <div className="flex items-center justify-between mb-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500/30 to-blue-500/10 border border-blue-500/20">
            <Users className="h-5 w-5 text-blue-400" />
          </div>
          <span className="text-[10px] uppercase tracking-widest text-blue-400/60 font-medium">Total</span>
        </div>
        <div className="text-2xl font-bold text-blue-400">{users.length}</div>
        <div className="flex items-center gap-1.5 mt-1.5">
          <div className="h-1.5 w-1.5 rounded-full bg-blue-500 animate-pulse" />
          <span className="text-xs text-blue-400/60">Registered users</span>
        </div>
      </div>
    </div>

    <div className="relative overflow-hidden rounded-2xl border border-emerald-500/20 bg-gradient-to-br from-emerald-500/10 via-emerald-500/5 to-background p-5 group hover:shadow-lg hover:shadow-emerald-500/5 transition-all duration-300">
      <div className="absolute -top-6 -right-6 h-20 w-20 rounded-full bg-emerald-500/10 blur-2xl group-hover:bg-emerald-500/20 transition-all duration-500" />
      <div className="relative z-10">
        <div className="flex items-center justify-between mb-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500/30 to-emerald-500/10 border border-emerald-500/20">
            <CheckCircle2 className="h-5 w-5 text-emerald-400" />
          </div>
          <span className="text-[10px] uppercase tracking-widest text-emerald-400/60 font-medium">Active</span>
        </div>
        <div className="text-2xl font-bold text-emerald-400">{users.filter(u => u.status === "active" || !u.status).length}</div>
        <div className="flex items-center gap-1.5 mt-1.5">
          <div className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-xs text-emerald-400/60">Active accounts</span>
        </div>
      </div>
    </div>

    <div className="relative overflow-hidden rounded-2xl border border-amber-500/20 bg-gradient-to-br from-amber-500/10 via-amber-500/5 to-background p-5 group hover:shadow-lg hover:shadow-amber-500/5 transition-all duration-300">
      <div className="absolute -top-6 -right-6 h-20 w-20 rounded-full bg-amber-500/10 blur-2xl group-hover:bg-amber-500/20 transition-all duration-500" />
      <div className="relative z-10">
        <div className="flex items-center justify-between mb-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-amber-500/30 to-amber-500/10 border border-amber-500/20">
            <ShieldAlert className="h-5 w-5 text-amber-400" />
          </div>
          <span className="text-[10px] uppercase tracking-widest text-amber-400/60 font-medium">Suspended</span>
        </div>
        <div className="text-2xl font-bold text-amber-400">{users.filter(u => u.status === "suspended").length}</div>
        <div className="flex items-center gap-1.5 mt-1.5">
          <div className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-pulse" />
          <span className="text-xs text-amber-400/60">Suspended accounts</span>
        </div>
      </div>
    </div>

    <div className="relative overflow-hidden rounded-2xl border border-violet-500/20 bg-gradient-to-br from-violet-500/10 via-violet-500/5 to-background p-5 group hover:shadow-lg hover:shadow-violet-500/5 transition-all duration-300">
      <div className="absolute -top-6 -right-6 h-20 w-20 rounded-full bg-violet-500/10 blur-2xl group-hover:bg-violet-500/20 transition-all duration-500" />
      <div className="relative z-10">
        <div className="flex items-center justify-between mb-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500/30 to-violet-500/10 border border-violet-500/20">
            <ShieldCheck className="h-5 w-5 text-violet-400" />
          </div>
          <span className="text-[10px] uppercase tracking-widest text-violet-400/60 font-medium">Verified</span>
        </div>
        <div className="text-2xl font-bold text-violet-400">{users.filter(u => u.otpVerified).length}</div>
        <div className="flex items-center gap-1.5 mt-1.5">
          <div className="h-1.5 w-1.5 rounded-full bg-violet-500 animate-pulse" />
          <span className="text-xs text-violet-400/60">OTP verified</span>
        </div>
      </div>
    </div>
  </div>

  {/* Create User Form */}
  <Card className="glass-card overflow-hidden border-0 bg-gradient-to-br from-background via-background to-primary/5">
    <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-primary/40 via-primary/30 to-primary/40" />
    <CardHeader className="border-b border-glass-border/30">
      <CardTitle className="flex items-center gap-2">
        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-primary/30 to-primary/10">
          <UserCog className="h-4 w-4 text-primary" />
        </div>
        Create New Account
      </CardTitle>
      <CardDescription>Create a new user or counsellor account with default password</CardDescription>
    </CardHeader>
    <CardContent className="pt-6">
      <form onSubmit={createUser} className="grid lg:grid-cols-5 gap-4 items-end">
        <div className="space-y-2">
          <Label className="text-xs font-medium text-foreground/70">Full Name</Label>
          <div className="relative">
            <Users className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-foreground/40" />
            <Input value={newUser.name} onChange={(event) => setNewUser((prev) => ({ ...prev, name: event.target.value }))} className="pl-9" placeholder="John Doe" />
          </div>
        </div>
        <div className="space-y-2">
          <Label className="text-xs font-medium text-foreground/70">Email Address</Label>
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-foreground/40" />
            <Input type="email" value={newUser.email} onChange={(event) => setNewUser((prev) => ({ ...prev, email: event.target.value }))} className="pl-9" placeholder="john@example.com" />
          </div>
        </div>
        <div className="space-y-2">
          <Label className="text-xs font-medium text-foreground/70">Account Role</Label>
          <Select value={newUser.role} onValueChange={(value) => setNewUser((prev) => ({ ...prev, role: value }))}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="user">User</SelectItem>
              <SelectItem value="counsellor">Counsellor</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label className="text-xs font-medium text-foreground/70">Specialization</Label>
          <Input value={newUser.specialization} onChange={(event) => setNewUser((prev) => ({ ...prev, specialization: event.target.value }))} placeholder="e.g., Anxiety, Stress" />
        </div>
        <Button type="submit" className="bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 shadow-lg shadow-primary/25">
          <Plus className="h-4 w-4 mr-2" />
          Create Account
        </Button>
      </form>
    </CardContent>
  </Card>

  {/* Users List */}
  <Card className="glass-card overflow-hidden border-0 bg-gradient-to-br from-background via-background to-blue-500/5">
    <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-500/40 via-blue-400/30 to-blue-500/40" />
    <CardHeader className="border-b border-glass-border/30">
      <div className="flex items-center justify-between">
        <div>
          <CardTitle className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-blue-500/30 to-blue-500/10">
              <Users className="h-4 w-4 text-blue-500" />
            </div>
            All Accounts
          </CardTitle>
          <CardDescription>{users.length} total users on the platform</CardDescription>
        </div>
        <Badge className="bg-blue-500/15 text-blue-500 border-blue-500/20 text-[10px]">
          {users.filter(u => u.role === "user").length} Users · {users.filter(u => u.role === "counsellor").length} Counsellors
        </Badge>
      </div>
    </CardHeader>
    <CardContent className="pt-6">
      {users.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-14 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-foreground/5 mb-3">
            <Users className="h-7 w-7 text-foreground/25" />
          </div>
          <p className="font-semibold text-foreground/60">No users yet</p>
          <p className="text-sm text-foreground/50 mt-1">Users will appear here once they register on the platform.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {users.map((user) => {
            const isActive = user.status === "active" || !user.status;
            const isSuspended = user.status === "suspended";
            const isCounsellor = user.role === "counsellor";
            const isVerified = user.otpVerified;
          
            return (
              <div key={user.id} className="group relative overflow-hidden rounded-xl border border-glass-border/30 bg-gradient-to-br from-background/90 to-background/60 hover:shadow-md hover:shadow-primary/5 transition-all duration-200">
                <div className="p-4">
                  <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
                    <div className="flex items-center gap-3">
                      {/* Avatar */}
                      <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br ${
                        isCounsellor ? 'from-emerald-500/30 to-emerald-500/10 border-emerald-500/20' : 
                        'from-blue-500/30 to-blue-500/10 border-blue-500/20'
                      } border`}>
                        <span className="text-sm font-bold text-foreground/80">{user.name?.charAt(0)?.toUpperCase() || "U"}</span>
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-sm truncate">{user.name}</span>
                          {isVerified && (
                            <ShieldCheck className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                          )}
                        </div>
                        <div className="flex items-center gap-2 text-xs text-foreground/60">
                          <span className="truncate">{user.email}</span>
                          <span className="text-foreground/30">·</span>
                          <span className="capitalize">{user.role}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      {/* Status Badge */}
                      <Badge className={`text-[10px] capitalize border ${
                        isActive ? 'bg-emerald-500/15 text-emerald-600 border-emerald-500/20' :
                        isSuspended ? 'bg-rose-500/15 text-rose-600 border-rose-500/20' :
                        'bg-amber-500/15 text-amber-600 border-amber-500/20'
                      }`}>
                        {isActive ? 'Active' : isSuspended ? 'Suspended' : user.status}
                      </Badge>

                      {/* Role Badge */}
                      <Badge variant="secondary" className="text-[10px] capitalize">
                        {user.role}
                      </Badge>

                      {/* OTP Badge */}
                      {isVerified && (
                        <Badge className="bg-emerald-500/15 text-emerald-600 border-emerald-500/20 text-[10px]">
                          <ShieldCheck className="h-3 w-3 mr-1" />
                          Verified
                        </Badge>
                      )}

                      {/* Action Buttons */}
                      <div className="flex gap-1.5 ml-2">
                        {!isActive && (
                          <Button size="sm" variant="outline" onClick={() => updateUserStatus(user, "active")} className="h-7 text-[10px] gap-1 bg-emerald-500/10 text-emerald-600 border-emerald-500/30 hover:bg-emerald-500/20">
                            <CheckCircle2 className="h-3 w-3" /> Unblock
                          </Button>
                        )}
                        {!isVerified && (
                          <Button size="sm" variant="outline" onClick={() => updateUserDetails(user, { status: "active", otpVerified: true, verificationStatus: "approved" }, "Identity verified")} className="h-7 text-[10px] gap-1 border-blue-500/30 text-blue-600 hover:bg-blue-500/10">
                            <ShieldCheck className="h-3 w-3" /> Verify
                          </Button>
                        )}
                        {!isSuspended && (
                          <Button size="sm" variant="outline" onClick={() => updateUserStatus(user, "suspended")} className="h-7 text-[10px] gap-1 border-amber-500/30 text-amber-600 hover:bg-amber-500/10">
                            <ShieldAlert className="h-3 w-3" /> Block
                          </Button>
                        )}
                        <Button size="sm" variant="outline" onClick={() => deleteUser(user)} className="h-7 text-[10px] gap-1 border-rose-500/30 text-rose-600 hover:bg-rose-500/10">
                          <X className="h-3 w-3" /> Delete
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </CardContent>
  </Card>
    </>
  );
}
