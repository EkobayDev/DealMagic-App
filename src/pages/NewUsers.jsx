import React, { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { UserPlus, UserX, UserCog, Loader2, ShieldCheck, Clock, X } from "lucide-react";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";

export default function NewUsers() {
  const queryClient = useQueryClient();
  const [currentUser, setCurrentUser] = useState(null);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("user");

  useEffect(() => {
    base44.auth.me().then(setCurrentUser).catch(() => {});
  }, []);

  const { data: users = [], isLoading } = useQuery({
    queryKey: ["users"],
    queryFn: () => base44.entities.User.list(),
    refetchInterval: 15000,
    refetchIntervalInBackground: false,
  });

  const { data: pendingInvites = [] } = useQuery({
    queryKey: ["pendingInvites"],
    queryFn: () => base44.entities.PendingInvite.list("-created_date", 100),
    enabled: !!currentUser,
  });

  const activeUserEmails = new Set(users.map(u => u.email?.toLowerCase()));
  const filteredPending = pendingInvites.filter(
    inv => !activeUserEmails.has(inv.email?.toLowerCase())
  );

  const inviteMutation = useMutation({
    mutationFn: async ({ email, role }) => {
      await base44.users.inviteUser(email, role);
      await base44.entities.PendingInvite.create({
        email,
        role,
        invited_by: currentUser.email,
      });
    },
    onSuccess: (_, { email }) => {
      setInviteEmail("");
      setInviteRole("user");
      queryClient.invalidateQueries({ queryKey: ["users"] });
      queryClient.invalidateQueries({ queryKey: ["pendingInvites"] });
      toast.success(`Invitation sent to ${email}`);
    },
    onError: (error) => {
      toast.error(error?.message || "Invitation failed. Please try again.");
    },
  });

  const cancelInviteMutation = useMutation({
    mutationFn: (id) => base44.entities.PendingInvite.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["pendingInvites"] }),
  });

  const updateRoleMutation = useMutation({
    mutationFn: ({ id, role }) => base44.entities.User.update(id, { role }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["users"] }),
  });

  const removeMutation = useMutation({
    mutationFn: (id) => base44.entities.User.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["users"] }),
  });

  if (!currentUser) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
      </div>
    );
  }

  if (currentUser.role !== "admin") {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-slate-400 gap-3">
        <ShieldCheck className="w-12 h-12" />
        <p className="text-lg font-semibold">Admin access only</p>
        <p className="text-sm">You don't have permission to manage users.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">User Management</h1>
          <p className="text-sm text-slate-500 mt-1">Invite, authorize, and remove DealMagic users.</p>
        </div>
        <img
          src="https://media.base44.com/images/public/69b41e51440bd7785a5b082e/850b0b8d7_ChatGPTImageMar16202609_26_07AM.png"
          alt="DealMagic"
          className="h-24 w-auto object-contain"
          style={{ mixBlendMode: "multiply" }}
        />
      </div>

      {/* Invite Card */}
      <div className="bg-white rounded-2xl border border-slate-100 p-5 space-y-4">
        <h2 className="text-base font-bold text-slate-800 flex items-center gap-2">
          <UserPlus className="w-4 h-4 text-[#FFFF00] bg-slate-800 rounded-full p-0.5 box-content" />
          Invite New User
        </h2>
        <p className="text-xs text-slate-400">The invited user will receive an email to set up their account.</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <Label className="text-xs text-slate-500 mb-1 block">Email Address</Label>
            <Input
              type="email"
              placeholder="user@example.com"
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && inviteEmail && inviteMutation.mutate({ email: inviteEmail, role: inviteRole })}
            />
          </div>
          <div>
            <Label className="text-xs text-slate-500 mb-1 block">Role</Label>
            <Select value={inviteRole} onValueChange={setInviteRole}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="user">User</SelectItem>
                <SelectItem value="admin">Admin</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="flex justify-end">
          <Button
            onClick={() => inviteMutation.mutate({ email: inviteEmail, role: inviteRole })}
            disabled={!inviteEmail || inviteMutation.isPending}
            className="bg-[#FFFF00] text-slate-900 hover:bg-[#e6e600] gap-2"
          >
            {inviteMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserPlus className="w-4 h-4" />}
            Send Invite
          </Button>
        </div>
      </div>

      {/* Pending Invites */}
      {filteredPending.length > 0 && (
        <div className="bg-white rounded-2xl border border-amber-100 overflow-hidden">
          <div className="px-5 py-3 border-b border-amber-100 flex items-center gap-2 bg-amber-50/50">
            <Clock className="w-4 h-4 text-amber-500" />
            <h2 className="text-base font-bold text-slate-800">Pending Invitations</h2>
            <span className="ml-auto text-xs text-amber-500">{filteredPending.length} awaiting signup</span>
          </div>
          <div className="divide-y divide-slate-50">
            {filteredPending.map((inv) => (
              <div key={inv.id} className="flex items-center gap-4 px-5 py-3 hover:bg-slate-50 transition-colors">
                <div className="w-9 h-9 rounded-full flex items-center justify-center bg-amber-100 text-amber-600 text-sm font-bold shrink-0">
                  {inv.email?.[0]?.toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-700 truncate">{inv.email}</p>
                  <p className="text-xs text-slate-400">
                    Invited {formatDistanceToNow(new Date(inv.created_date), { addSuffix: true })} · {inv.role}
                  </p>
                </div>
                <span className="text-[10px] font-semibold uppercase px-2 py-1 rounded-full bg-amber-50 text-amber-600 border border-amber-200">
                  Pending
                </span>
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-slate-300 hover:text-red-500 hover:bg-red-50 shrink-0"
                  onClick={() => cancelInviteMutation.mutate(inv.id)}
                  title="Remove pending invite"
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Active Users Table */}
      <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
        <div className="px-5 py-3 border-b border-slate-100 flex items-center gap-2">
          <UserCog className="w-4 h-4 text-slate-500" />
          <h2 className="text-base font-bold text-slate-800">Current Users</h2>
          <span className="ml-auto text-xs text-slate-400">{users.length} total</span>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-slate-300" />
          </div>
        ) : users.length === 0 ? (
          <p className="text-center text-sm text-slate-400 py-12">No users found.</p>
        ) : (
          <div className="divide-y divide-slate-50">
            {users.map((u) => {
              const isSelf = u.id === currentUser.id;
              return (
                <div key={u.id} className="flex items-center gap-4 px-5 py-4 hover:bg-slate-50 transition-colors">
                  <div className="w-9 h-9 rounded-full flex items-center justify-center text-white text-sm font-bold shrink-0" style={{ backgroundColor: "#1e3a5f" }}>
                    {(u.full_name || u.email)?.[0]?.toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-slate-800 truncate">{u.full_name || "—"}</p>
                    <p className="text-xs text-slate-400 truncate">{u.email}</p>
                  </div>
                  <div className="w-32 shrink-0">
                    <Select
                      value={u.role || "user"}
                      onValueChange={(role) => updateRoleMutation.mutate({ id: u.id, role })}
                      disabled={isSelf || updateRoleMutation.isPending}
                    >
                      <SelectTrigger className="h-8 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="user">User</SelectItem>
                        <SelectItem value="admin">Admin</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  {isSelf ? (
                    <span className="text-[10px] text-slate-300 px-2">You</span>
                  ) : (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-slate-300 hover:text-red-500 hover:bg-red-50 shrink-0"
                      onClick={() => {
                        if (confirm(`Remove ${u.full_name || u.email}?`)) removeMutation.mutate(u.id);
                      }}
                      disabled={removeMutation.isPending}
                    >
                      <UserX className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}